# Auto Resume Generator Chrome Extension

A Chrome extension that extracts text from the current webpage and generates a PDF resume via webhook.

## Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select this folder
4. The extension will appear in your extensions bar

## Usage

1. **Setup Configuration**: Ensure `config.json` has the correct webhook URLs for resume and cover letter generation.

2. **Basic Usage**:
   - Navigate to any webpage
   - Click the extension icon
   - Click "Generate Resume" button
   - The PDF will be downloaded automatically
   - Cover Letter button becomes available 5 seconds after successful resume generation

3. **Quick Mode**:
   - Toggle "Quick Mode" in the extension popup to enable floating buttons
   - Floating buttons (RS for Resume, CL for Cover Letter) appear on all web pages
   - Drag the button panel to reposition it
   - Cover Letter button starts disabled and becomes available after resume generation

4. **Developer Support**: Developer support is needed to use this plugin. Contact: pmaheshwaran@binghamton.edu


## Developer Support

Developer support is needed to use this plugin. Contact: pmaheshwaran@binghamton.edu