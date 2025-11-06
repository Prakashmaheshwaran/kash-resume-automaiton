// Content script for Auto Resume Generator
// This script runs in the context of web pages

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  if (request.action === 'extractText') {
    try {
      console.log('Document ready state:', document.readyState);
      // Wait for page to be ready if needed
      if (document.readyState !== 'complete') {
        console.log('Page not ready, waiting...');
        // If page is still loading, wait a bit
        setTimeout(() => {
          extractAndSendText(sendResponse);
        }, 1000);
        return true; // Keep message channel open
      } else {
        console.log('Page ready, extracting text...');
        extractAndSendText(sendResponse);
      }
    } catch (error) {
      console.error('Error in content script:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep the message channel open for async response
});

function extractAndSendText(sendResponse) {
  try {
    console.log('Extracting text from page...');
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
    
    console.log('Text extracted, length:', cleanedText.length);
    sendResponse({ success: true, text: cleanedText });
  } catch (error) {
    console.error('Error extracting text:', error);
    sendResponse({ success: false, error: error.message });
  }
}
