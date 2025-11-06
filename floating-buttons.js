// Floating buttons script for Quick Mode
// This script creates draggable floating buttons on web pages

let floatingContainer = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let config = null;

// Load config.json
async function loadConfig() {
  try {
    const configResponse = await fetch(chrome.runtime.getURL('config.json'));
    config = await configResponse.json();
    console.log('Config loaded in floating buttons:', config);
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Initialize floating buttons
async function initFloatingButtons() {
  // Load config if not already loaded
  if (!config) {
    await loadConfig();
  }
  
  // Check if quick mode is enabled
  const { quickModeEnabled = false } = await chrome.storage.local.get(['quickModeEnabled']);
  
  if (quickModeEnabled && !floatingContainer) {
    createFloatingButtons();
    // Wait for next frame to ensure container is rendered before loading position
    requestAnimationFrame(() => {
      setTimeout(() => {
        loadPosition();
      }, 0);
    });
  } else if (!quickModeEnabled && floatingContainer) {
    removeFloatingButtons();
  }
}

function createFloatingButtons() {
  // Ensure document.body exists before proceeding
  if (!document.body) {
    console.warn('Cannot create floating buttons: document.body does not exist');
    return;
  }
  
  // Remove existing container if any (check both variable and DOM)
  if (floatingContainer) {
    floatingContainer.remove();
    floatingContainer = null;
  }
  
  // Also check DOM directly in case variable was lost
  const existingContainer = document.getElementById('resume-ext-floating-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  floatingContainer = document.createElement('div');
  floatingContainer.id = 'resume-ext-floating-container';
  floatingContainer.style.cssText = `
    position: fixed !important;
    z-index: 9999999 !important;
    background: white !important;
    border-radius: 16px 0 0 16px !important;
    padding: 8px 0 8px 8px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
    user-select: none !important;
    pointer-events: auto !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
    visibility: visible !important;
    opacity: 1 !important;
  `;

  // RS Button (Resume)
  const rsButton = createFloatingButton('RS', '#007bff');
  rsButton.setAttribute('data-type', 'RS');
  rsButton.setAttribute('title', 'Generate Resume');
  rsButton.addEventListener('click', async () => {
    if (rsButton.disabled) return;
    
    rsButton.disabled = true;
    
    try {
      // Ensure config is loaded before proceeding
      if (!config || !config.resumeWebhook) {
        console.log('Config not loaded, loading now...');
        await loadConfig();
      }
      
      // Check if config and webhook are available after loading
      if (!config || !config.resumeWebhook) {
        console.error('Resume webhook not configured. Config:', config);
        throw new Error('Resume webhook not configured');
      }
      
      console.log('Floating button: Starting resume generation...');
      console.log('Floating button: Config loaded:', config);
      console.log('Floating button: Webhook URL:', config.resumeWebhook);
      
      // Get current URL
      const currentUrl = window.location.href;
      console.log('Floating button: Current URL:', currentUrl);
      
      // Extract text from page (same extraction logic as popup/content script)
      const pageText = extractPageText();
      console.log('Floating button: Extracted text length:', pageText?.length || 0);
      
      if (!pageText || pageText.trim().length === 0) {
        throw new Error('No text content found on this page');
      }

      // Send to background script with webhook (same pattern as popup)
      console.log('Floating button: Sending message to background script...');
      console.log('Floating button: Message data:', {
        action: 'downloadPDF',
        data: {
          url: currentUrl,
          textLength: pageText.length,
          webhook: config.resumeWebhook
        }
      });
      
      let response;
      try {
        response = await chrome.runtime.sendMessage({
          action: 'downloadPDF',
          data: {
            url: currentUrl,
            text: pageText,
            webhook: config.resumeWebhook
          }
        });
      } catch (sendError) {
        console.error('Floating button: Error sending message to background:', sendError);
        throw new Error(`Failed to communicate with background script: ${sendError.message}`);
      }

      console.log('Floating button: Background script response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to generate resume');
      }

      // Enable CL button after 5 seconds
      const clButton = floatingContainer.querySelector('button[data-type="CL"]');
      if (clButton) {
        clButton.disabled = true;
        clButton.style.opacity = '0.5';
        clButton.style.cursor = 'not-allowed';
        clButton.classList.add('dull');
        setTimeout(() => {
          clButton.disabled = false;
          clButton.style.opacity = '1';
          clButton.style.cursor = 'pointer';
          clButton.classList.remove('dull');
          // Update button style to active state
          clButton.style.background = 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)';
          clButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        }, 5000);
      }

    } catch (error) {
      console.error('Error generating resume:', error);
    } finally {
      rsButton.disabled = false;
    }
  });

  // CL Button (Cover Letter) - Initially disabled/dull
  const clButton = createFloatingButton('CL', '#28a745', true);
  clButton.setAttribute('data-type', 'CL');
  clButton.setAttribute('title', 'Generate Cover Letter');
  clButton.disabled = true;
  clButton.addEventListener('click', async () => {
    if (clButton.disabled || clButton.classList.contains('dull')) return;
    
    clButton.disabled = true;
    
    try {
      // Ensure config is loaded before proceeding
      if (!config || !config.coverLetterWebhook) {
        console.log('Config not loaded, loading now...');
        await loadConfig();
      }
      
      // Check if config and webhook are available after loading
      if (!config || !config.coverLetterWebhook) {
        console.error('Cover letter webhook not configured. Config:', config);
        throw new Error('Cover letter webhook not configured');
      }
      
      console.log('Floating button: Starting cover letter generation...');
      console.log('Floating button: Webhook URL:', config.coverLetterWebhook);
      
      // Get current URL
      const currentUrl = window.location.href;
      console.log('Floating button: Current URL:', currentUrl);
      
      // Send only URL to background script with webhook (same pattern as popup)
      console.log('Floating button: Sending message to background script...');
      let response;
      try {
        response = await chrome.runtime.sendMessage({
          action: 'downloadCoverLetter',
          data: {
            url: currentUrl,
            webhook: config.coverLetterWebhook
          }
        });
      } catch (sendError) {
        console.error('Floating button: Error sending message to background:', sendError);
        throw new Error(`Failed to communicate with background script: ${sendError.message}`);
      }

      console.log('Floating button: Background script response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to generate cover letter');
      }

    } catch (error) {
      console.error('Error generating cover letter:', error);
    } finally {
      clButton.disabled = false;
    }
  });

  floatingContainer.appendChild(rsButton);
  floatingContainer.appendChild(clButton);

  // Make container draggable
  makeDraggable(floatingContainer);

  // Ensure body exists before appending
  if (!document.body) {
    console.error('Cannot append floating buttons: document.body does not exist');
    return;
  }
  
  // Use a more robust append method
  try {
    document.body.appendChild(floatingContainer);
    
    // Verify it was added successfully
    if (!document.body.contains(floatingContainer)) {
      console.error('Failed to append floating container to body');
      floatingContainer = null;
      return;
    }
    
    console.log('Floating buttons container successfully added to page');
  } catch (error) {
    console.error('Error appending floating buttons:', error);
    floatingContainer = null;
  }
}

function createFloatingButton(type, color, isDull = false) {
  const button = document.createElement('button');
  
  // Set styles based on dull state
  if (isDull) {
    button.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #d0d0d0;
      color: #888;
      border: none;
      cursor: not-allowed;
      box-shadow: none;
      transition: all 0.2s;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
      opacity: 0.6;
    `;
    button.classList.add('dull');
  } else {
    button.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${color} 0%, ${darkenColor(color, 20)} 100%);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.2s;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
    `;
  }

  // Add SVG icon based on type
  const iconSvg = type === 'RS' 
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>`;
  
  button.innerHTML = iconSvg;

  button.addEventListener('mouseenter', () => {
    if (!button.disabled) {
      button.style.transform = 'scale(1.15)';
      button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    }
  });

  button.addEventListener('mouseleave', () => {
    if (!button.disabled) {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    }
  });

  button.addEventListener('mousedown', (e) => {
    e.stopPropagation(); // Prevent dragging when clicking button
  });

  return button;
}

function darkenColor(color, percent) {
  // Simple color darkening for gradient
  if (color === '#007bff') return '#0056b3';
  if (color === '#28a745') return '#1e7e34';
  return color;
}

function makeDraggable(element) {
  let startX, startY, initialX, initialY;

  const handleMouseDown = (e) => {
    // Don't start dragging if clicking on a button
    if (e.target.tagName === 'BUTTON') {
      return;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = element.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    dragOffset.x = startX - initialX;
    dragOffset.y = startY - initialY;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    element.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Constrain to viewport with padding
    const constrained = constrainToViewport(newX, newY);

    element.style.left = `${constrained.x}px`;
    element.style.top = `${constrained.y}px`;
  };

  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      element.style.cursor = 'grab';
      
      // Save position
      const rect = element.getBoundingClientRect();
      savePosition(rect.left, rect.top);
    }
  };

  element.style.cursor = 'grab';
  element.addEventListener('mousedown', handleMouseDown);
}

function extractPageText() {
  try {
    // Create a temporary copy of the document to avoid modifying the original
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = document.body.innerHTML;
    
    // Remove unwanted elements from the copy
    const unwantedElements = tempDiv.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar, .menu, .navigation');
    unwantedElements.forEach(el => el.remove());
    
    // Get all text content
    const textContent = tempDiv.innerText || tempDiv.textContent || '';
    
    // Clean up the text
    const cleanedText = textContent
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n')  // Remove empty lines
      .trim();
    
    return cleanedText;
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
}

// Function to constrain position within viewport bounds
function constrainToViewport(x, y) {
  if (!floatingContainer) return { x: 0, y: 0 };
  
  // Force a reflow to get accurate dimensions
  void floatingContainer.offsetWidth;
  
  const containerWidth = floatingContainer.offsetWidth || 64;
  const containerHeight = floatingContainer.offsetHeight || 120;
  const padding = 10; // Padding from edges
  
  const maxX = window.innerWidth - containerWidth - padding;
  const maxY = window.innerHeight - containerHeight - padding;
  
  return {
    x: Math.max(padding, Math.min(x, maxX)),
    y: Math.max(padding, Math.min(y, maxY))
  };
}

function loadPosition() {
  chrome.storage.local.get(['floatingButtonPosition'], (result) => {
    if (!floatingContainer) return;
    
    // Ensure container is rendered and has dimensions
    void floatingContainer.offsetWidth; // Force reflow
    
    if (result.floatingButtonPosition) {
      const { x, y } = result.floatingButtonPosition;
      // Validate and constrain saved position to current viewport
      const constrained = constrainToViewport(x, y);
      floatingContainer.style.left = `${constrained.x}px`;
      floatingContainer.style.top = `${constrained.y}px`;
      
      // Update saved position if it was constrained
      if (constrained.x !== x || constrained.y !== y) {
        savePosition(constrained.x, constrained.y);
      }
    } else {
      // Default position: right side, middle (within viewport)
      // Wait for next frame to ensure dimensions are available
      requestAnimationFrame(() => {
        if (!floatingContainer) return;
        
        const containerWidth = floatingContainer.offsetWidth || 64;
        const containerHeight = floatingContainer.offsetHeight || 120;
        const padding = 10;
        
        const defaultX = window.innerWidth - containerWidth - padding;
        const defaultY = Math.max(
          padding,
          Math.min(
            window.innerHeight / 2 - containerHeight / 2,
            window.innerHeight - containerHeight - padding
          )
        );
        
        floatingContainer.style.left = `${defaultX}px`;
        floatingContainer.style.top = `${defaultY}px`;
        savePosition(defaultX, defaultY);
      });
    }
  });
}

function savePosition(x, y) {
  chrome.storage.local.set({
    floatingButtonPosition: { x, y }
  });
}

function removeFloatingButtons() {
  if (floatingContainer) {
    floatingContainer.remove();
    floatingContainer = null;
  }
}

// Listen for quick mode toggle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleQuickMode') {
    if (request.enabled) {
      ensureBodyAndInit();
    } else {
      removeFloatingButtons();
    }
  }
});

// Listen for storage changes (in case quick mode is toggled in another tab)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.quickModeEnabled) {
    if (changes.quickModeEnabled.newValue) {
      ensureBodyAndInit();
    } else {
      removeFloatingButtons();
    }
  }
});

// Robust initialization function that ensures body exists
async function ensureBodyAndInit() {
  // Wait for document.body to exist (critical for SPAs)
  if (!document.body) {
    // Use MutationObserver to wait for body
    await new Promise((resolve) => {
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          obs.disconnect();
          resolve();
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      // Fallback timeout
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 5000);
    });
  }
  
  // Additional small delay to ensure page is interactive
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Only initialize if body exists
  if (document.body) {
    await initFloatingButtons();
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureBodyAndInit);
} else {
  ensureBodyAndInit();
}

// Also initialize when page visibility changes (for SPA navigation)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setTimeout(ensureBodyAndInit, 300);
  }
});

// Use MutationObserver to detect SPA navigation changes
let pageChangeObserver = null;

function setupPageChangeObserver() {
  // Disconnect existing observer if any
  if (pageChangeObserver) {
    pageChangeObserver.disconnect();
  }
  
  // Only observe if body exists
  if (!document.body) {
    return;
  }
  
  pageChangeObserver = new MutationObserver((mutations) => {
    // Check if floating buttons need to be re-initialized
    // This happens when SPA navigates and potentially removes our container
    const existingContainer = document.getElementById('resume-ext-floating-container');
    
    // If quick mode is enabled but container doesn't exist, re-initialize
    chrome.storage.local.get(['quickModeEnabled'], async (result) => {
      if (result.quickModeEnabled && !existingContainer && document.body) {
        // Small debounce to avoid multiple rapid calls
        clearTimeout(pageChangeObserver.debounceTimer);
        pageChangeObserver.debounceTimer = setTimeout(async () => {
          await ensureBodyAndInit();
        }, 500);
      }
    });
  });
  
  // Observe body and document changes
  pageChangeObserver.observe(document.body, {
    childList: true,
    subtree: false  // Only watch direct children to avoid performance issues
  });
  
  // Also observe document head for title changes (common SPA navigation indicator)
  if (document.head) {
    pageChangeObserver.observe(document.head, {
      childList: true,
      subtree: true
    });
  }
}

// Setup observer after initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupPageChangeObserver, 500);
  });
} else {
  setTimeout(setupPageChangeObserver, 500);
}

// Handle popstate events (back/forward navigation in SPAs)
window.addEventListener('popstate', () => {
  setTimeout(ensureBodyAndInit, 300);
});

// Handle pushstate/replacestate (programmatic navigation in SPAs)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  setTimeout(ensureBodyAndInit, 300);
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  setTimeout(ensureBodyAndInit, 300);
};

// Handle window resize to keep button within viewport
let resizeTimeout;
window.addEventListener('resize', () => {
  if (!floatingContainer) return;
  
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Get current position
    const rect = floatingContainer.getBoundingClientRect();
    const currentX = rect.left;
    const currentY = rect.top;
    
    // Constrain to new viewport size
    const constrained = constrainToViewport(currentX, currentY);
    
    // Only update if position changed
    if (constrained.x !== currentX || constrained.y !== currentY) {
      floatingContainer.style.left = `${constrained.x}px`;
      floatingContainer.style.top = `${constrained.y}px`;
      savePosition(constrained.x, constrained.y);
    }
  }, 150);
});

