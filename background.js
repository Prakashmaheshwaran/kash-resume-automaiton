// Background script for Auto Resume Generator
// This script runs persistently and handles downloads

console.log('Background script loaded and ready!');

let config = null;

// Load config.json at startup
async function loadConfig() {
  try {
    const response = await fetch(chrome.runtime.getURL('config.json'));
    config = await response.json();
    console.log('Config loaded in background:', config);
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

loadConfig();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadPDF') {
    handlePDFDownload(request.data, sendResponse);
    return true; // Keep message channel open for async response
  }
  if (request.action === 'downloadCoverLetter') {
    handleCoverLetterDownload(request.data, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handlePDFDownload(data, sendResponse) {
  try {
    const webhook = data.webhook || config?.resumeWebhook;
    if (!webhook) {
      throw new Error('Resume webhook not configured');
    }

    console.log('Background script: Starting PDF download...');
    console.log('Background script: URL:', data.url);
    console.log('Background script: Text length:', data.text.length);

    // Send data to webhook
    const apiResponse = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        link: data.url,
        text: data.text
      })
    });

    if (!apiResponse.ok) {
      throw new Error(`Server error: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    // Get the PDF blob
    console.log('Background script: Getting PDF blob from response...');
    const pdfBlob = await apiResponse.blob();
    console.log('Background script: PDF blob size:', pdfBlob.size, 'bytes');
    console.log('Background script: PDF blob type:', pdfBlob.type);
    
    // Convert blob to data URL for persistent download
    console.log('Background script: Converting blob to data URL...');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
    
    console.log('Background script: Data URL created, length:', dataUrl.length);
    console.log('Background script: Starting download...');
    
    try {
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: `resume_${Date.now()}.pdf`,
        saveAs: false  // Auto-download without asking
      });
      console.log('Background script: Download started with ID:', downloadId);

      // Listen for download completion
      const downloadListener = (downloadDelta) => {
        if (downloadDelta.id === downloadId) {
          console.log('Background script: Download state changed:', downloadDelta.state);
          if (downloadDelta.state && downloadDelta.state.current === 'complete') {
            console.log('Background script: Download completed successfully!');
            chrome.downloads.onChanged.removeListener(downloadListener);
          } else if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
            console.log('Background script: Download failed:', downloadDelta.error);
            chrome.downloads.onChanged.removeListener(downloadListener);
          }
        }
      };
      
      chrome.downloads.onChanged.addListener(downloadListener);

      sendResponse({ success: true, message: 'Download started successfully' });

    } catch (downloadError) {
      console.error('Background script: Download failed:', downloadError);
      sendResponse({ success: false, error: downloadError.message });
    }

  } catch (error) {
    console.error('Background script: Error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCoverLetterDownload(data, sendResponse) {
  try {
    const webhook = data.webhook || config?.coverLetterWebhook;
    if (!webhook) {
      throw new Error('Cover letter webhook not configured');
    }

    console.log('Background script: Starting cover letter download...');
    console.log('Background script: URL:', data.url);

    // Send only URL to webhook
    const apiResponse = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        link: data.url
      })
    });

    if (!apiResponse.ok) {
      throw new Error(`Server error: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    // Get the PDF blob
    console.log('Background script: Getting PDF blob from response...');
    const pdfBlob = await apiResponse.blob();
    console.log('Background script: PDF blob size:', pdfBlob.size, 'bytes');
    console.log('Background script: PDF blob type:', pdfBlob.type);
    
    // Convert blob to data URL for persistent download
    console.log('Background script: Converting blob to data URL...');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
    
    console.log('Background script: Data URL created, length:', dataUrl.length);
    console.log('Background script: Starting download...');
    
    try {
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: `cover_letter_${Date.now()}.pdf`,
        saveAs: false  // Auto-download without asking
      });
      console.log('Background script: Download started with ID:', downloadId);

      // Listen for download completion
      const downloadListener = (downloadDelta) => {
        if (downloadDelta.id === downloadId) {
          console.log('Background script: Download state changed:', downloadDelta.state);
          if (downloadDelta.state && downloadDelta.state.current === 'complete') {
            console.log('Background script: Download completed successfully!');
            chrome.downloads.onChanged.removeListener(downloadListener);
          } else if (downloadDelta.state && downloadDelta.state.current === 'interrupted') {
            console.log('Background script: Download failed:', downloadDelta.error);
            chrome.downloads.onChanged.removeListener(downloadListener);
          }
        }
      };
      
      chrome.downloads.onChanged.addListener(downloadListener);

      sendResponse({ success: true, message: 'Download started successfully' });

    } catch (downloadError) {
      console.error('Background script: Download failed:', downloadError);
      sendResponse({ success: false, error: downloadError.message });
    }

  } catch (error) {
    console.error('Background script: Error:', error);
    sendResponse({ success: false, error: error.message });
  }
}
