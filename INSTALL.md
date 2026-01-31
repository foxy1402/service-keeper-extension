# Quick Installation Guide

## Step 1: Download jsQR Library

The extension requires the jsQR library for QR code scanning. Download it:

**Option A: Direct Download**
1. Visit: https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js
2. Save the file as `jsQR.js` in the extension folder (replace existing placeholder)

**Option B: Using curl (if you have internet)**
```bash
cd servicekeeper-extension
curl -o jsQR.js https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js
```

**Option C: Using npm**
```bash
npm install jsqr
cp node_modules/jsqr/dist/jsQR.js ./jsQR.js
```

## Step 2: Load Extension in Chrome

1. Open Chrome browser
2. Go to: `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right corner)
4. Click "Load unpacked" button
5. Navigate to and select the `servicekeeper-extension` folder
6. The extension will now be installed!

## Step 3: Pin Extension (Optional but Recommended)

1. Click the puzzle piece icon in Chrome toolbar (next to your profile)
2. Find "ServiceKeeper" in the list
3. Click the pin icon next to it
4. The extension icon will now appear in your toolbar

## Step 4: Start Using

1. Click the ServiceKeeper icon in toolbar
2. Click "Add Service" 
3. Enter your service details
4. Save and let it work automatically!

## Troubleshooting

### QR Code Scanning Not Working?
- Make sure you downloaded the jsQR.js file (Step 1)
- Check browser console for errors
- Try manual secret entry instead

### Extension Not Appearing?
- Refresh the extensions page
- Check for errors in Chrome
- Make sure all files are in the correct folder

### Service Not Visiting?
- Check that the service is enabled (green status)
- Verify the URL is correct (must start with https://)
- Chrome must be running for scheduled visits
- Check Chrome notifications permission

### Data Not Saving?
- Check Chrome storage permissions
- Try exporting/importing as backup test
- Clear browser cache if issues persist

## Need Help?

Check the full README.md for:
- Detailed feature documentation
- Security information
- FAQ and common issues
- Usage examples
