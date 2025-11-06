// Floating buttons script for Quick Mode
// This script creates draggable floating buttons on web pages

let floatingContainer = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Initialize floating buttons
async function initFloatingButtons() {
  // Check if quick mode is enabled
  const { quickModeEnabled = false } = await chrome.storage.local.get(['quickModeEnabled']);
  
  if (quickModeEnabled && !floatingContainer) {
    createFloatingButtons();
    loadPosition();
  } else if (!quickModeEnabled && floatingContainer) {
    removeFloatingButtons();
  }
}

function createFloatingButtons() {
  // Remove existing container if any
  if (floatingContainer) {
    floatingContainer.remove();
  }

  floatingContainer = document.createElement('div');
  floatingContainer.id = 'resume-ext-floating-container';
  floatingContainer.style.cssText = `
    position: fixed;
    z-index: 99999;
    background: white;
    border-radius: 16px 0 0 16px;
    padding: 8px 0 8px 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    user-select: none;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  // RS Button (Resume)
  const rsButton = createFloatingButton('RS', '#007bff');
  rsButton.setAttribute('data-type', 'RS');
  rsButton.setAttribute('title', 'Generate Resume');
  rsButton.addEventListener('click', async () => {
    if (rsButton.disabled) return;
    rsButton.disabled = true;
    
    try {
      // Get current URL
      const currentUrl = window.location.href;
      
      // Extract text from page
      const text = extractPageText();
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text content found on this page');
      }

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        action: 'downloadPDF',
        data: {
          url: currentUrl,
          text: text
        }
      });

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
      // Get current URL
      const currentUrl = window.location.href;
      
      // Send only URL to background script
      const response = await chrome.runtime.sendMessage({
        action: 'downloadCoverLetter',
        data: {
          url: currentUrl
        }
      });

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

  document.body.appendChild(floatingContainer);
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

    // Keep within viewport bounds
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;

    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

    element.style.left = `${constrainedX}px`;
    element.style.top = `${constrainedY}px`;
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

function loadPosition() {
  chrome.storage.local.get(['floatingButtonPosition'], (result) => {
    if (result.floatingButtonPosition && floatingContainer) {
      const { x, y } = result.floatingButtonPosition;
      floatingContainer.style.left = `${x}px`;
      floatingContainer.style.top = `${y}px`;
    } else {
      // Default position: right side, middle
      if (floatingContainer) {
        const defaultX = window.innerWidth - floatingContainer.offsetWidth - 20;
        const defaultY = window.innerHeight / 2 - floatingContainer.offsetHeight / 2;
        floatingContainer.style.left = `${defaultX}px`;
        floatingContainer.style.top = `${defaultY}px`;
        savePosition(defaultX, defaultY);
      }
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
      createFloatingButtons();
      loadPosition();
    } else {
      removeFloatingButtons();
    }
  }
});

// Listen for storage changes (in case quick mode is toggled in another tab)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.quickModeEnabled) {
    if (changes.quickModeEnabled.newValue) {
      createFloatingButtons();
      loadPosition();
    } else {
      removeFloatingButtons();
    }
  }
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingButtons);
} else {
  initFloatingButtons();
}

// Also initialize when page visibility changes (for SPA navigation)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setTimeout(initFloatingButtons, 100);
  }
});

