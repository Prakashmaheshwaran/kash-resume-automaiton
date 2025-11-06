document.addEventListener('DOMContentLoaded', async function() {
  const generateBtn = document.getElementById('generateBtn');
  const coverLetterBtn = document.getElementById('coverLetterBtn');
  const quickModeToggle = document.getElementById('quickModeToggle');
  const statusDiv = document.getElementById('status');

  let config = null;
  let coverLetterCooldownTimer = null;

  // Initially disable cover letter button
  coverLetterBtn.disabled = true;

  // Load config.json
  try {
    const configResponse = await fetch(chrome.runtime.getURL('config.json'));
    config = await configResponse.json();
    console.log('Config loaded:', config);
  } catch (error) {
    console.error('Error loading config:', error);
    showStatus('Error loading config', 'error');
  }

  // Load quick mode state
  const { quickModeEnabled = false } = await chrome.storage.local.get(['quickModeEnabled']);
  quickModeToggle.classList.toggle('active', quickModeEnabled);

  // Quick mode toggle handler
  quickModeToggle.addEventListener('click', async function() {
    const newState = !quickModeToggle.classList.contains('active');
    quickModeToggle.classList.toggle('active', newState);
    await chrome.storage.local.set({ quickModeEnabled: newState });
    
    // Notify all tabs to update floating buttons
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleQuickMode', enabled: newState }).catch(() => {
        // Tab might not have content script loaded yet, ignore
      });
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
  }

  function hideStatus() {
    statusDiv.style.display = 'none';
  }

  function enableCoverLetterButton() {
    coverLetterBtn.disabled = false;
    coverLetterBtn.classList.remove('dull');
    coverLetterBtn.classList.add('active');
  }

  function disableCoverLetterButton() {
    coverLetterBtn.disabled = true;
    coverLetterBtn.classList.remove('active');
    coverLetterBtn.classList.add('dull');
    if (coverLetterCooldownTimer) {
      clearTimeout(coverLetterCooldownTimer);
      coverLetterCooldownTimer = null;
    }
  }

  // Resume button handler
  generateBtn.addEventListener('click', async function() {
    if (!config || !config.resumeWebhook) {
      showStatus('Resume webhook not configured', 'error');
      return;
    }

    console.log('Resume button clicked!');
    try {
      generateBtn.disabled = true;
      coverLetterBtn.disabled = true;
      hideStatus();
      showStatus('Extracting content...', 'loading');
      console.log('Starting extraction process...');

      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab);
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      // Get the current page URL
      const currentUrl = tab.url;
      console.log('Current URL:', currentUrl);
      
      // Send message to content script to extract text
      console.log('Sending message to content script...');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractText' });
      console.log('Content script response:', response);
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to extract page text');
      }

      const pageText = response.text;
      console.log('Extracted text length:', pageText.length);
      
      if (!pageText || pageText.trim().length === 0) {
        throw new Error('No text content found on this page');
      }

      showStatus('Generating resume...', 'loading');

      // Send data to background script for processing
      console.log('Sending data to background script...');
      console.log('Data being sent:', { url: currentUrl, textLength: pageText.length });
      
      const backgroundResponse = await chrome.runtime.sendMessage({
        action: 'downloadPDF',
        data: {
          url: currentUrl,
          text: pageText,
          webhook: config.resumeWebhook
        }
      });

      console.log('Background script response:', backgroundResponse);

      if (!backgroundResponse || !backgroundResponse.success) {
        throw new Error(backgroundResponse?.error || 'Failed to process download');
      }

      showStatus('Done!', 'success');
      
      // Start 5-second cooldown for cover letter button
      disableCoverLetterButton();
      coverLetterCooldownTimer = setTimeout(() => {
        enableCoverLetterButton();
        showStatus('Cover letter ready!', 'success');
        setTimeout(() => hideStatus(), 2000);
      }, 5000);

    } catch (error) {
      console.error('Error:', error);
      showStatus(`Error: ${error.message}`, 'error');
      generateBtn.disabled = false;
      coverLetterBtn.disabled = false;
    } finally {
      generateBtn.disabled = false;
    }
  });

  // Cover letter button handler
  coverLetterBtn.addEventListener('click', async function() {
    if (!config || !config.coverLetterWebhook) {
      showStatus('Cover letter webhook not configured', 'error');
      return;
    }

    if (coverLetterBtn.disabled || coverLetterBtn.classList.contains('dull')) {
      return;
    }

    console.log('Cover letter button clicked!');
    try {
      coverLetterBtn.disabled = true;
      hideStatus();
      showStatus('Generating cover letter...', 'loading');

      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab);
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      const currentUrl = tab.url;
      console.log('Current URL:', currentUrl);

      // Send only URL to background script
      const backgroundResponse = await chrome.runtime.sendMessage({
        action: 'downloadCoverLetter',
        data: {
          url: currentUrl,
          webhook: config.coverLetterWebhook
        }
      });

      console.log('Background script response:', backgroundResponse);

      if (!backgroundResponse || !backgroundResponse.success) {
        throw new Error(backgroundResponse?.error || 'Failed to process download');
      }

      showStatus('Done!', 'success');

    } catch (error) {
      console.error('Error:', error);
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      coverLetterBtn.disabled = false;
    }
  });
});
