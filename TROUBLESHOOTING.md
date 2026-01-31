# ServiceKeeper Troubleshooting Guide

## Common Issues and Solutions

### 🚫 Installation Issues

#### Extension won't load
**Problem**: Chrome says "Failed to load extension"

**Solutions**:
1. Make sure all files are in the same folder
2. Check that `manifest.json` exists and is valid
3. Verify you have the icons folder with all 4 icon files
4. Try reloading: Remove extension and load unpacked again
5. Check Chrome console (F12) for specific errors

#### Extension loads but icon doesn't appear
**Problem**: Extension installed but no toolbar icon

**Solutions**:
1. Click puzzle piece icon in Chrome toolbar
2. Find ServiceKeeper and click pin icon
3. Refresh Chrome if needed
4. Check if extension is enabled in `chrome://extensions/`

---

### ⚙️ Service Visit Issues

#### Service isn't being visited
**Problem**: Scheduled time passes but no visit occurs

**Solutions**:
1. **Check Chrome is running**: Extension only works when Chrome is open
2. **Verify service is enabled**: Look for green "Active" badge
3. **Check the schedule**: View "Next Run" time in service card
4. **Test manually**: Click the arrow button to test visit
5. **Check URL format**: Must start with `https://` or `http://`
6. **Review permissions**: Ensure extension has `<all_urls>` permission

#### Tab opens but immediately closes
**Problem**: Tab flashes and closes too fast

**Solutions**:
1. Increase "Keep Tab Open" duration (try 20-30 seconds)
2. Slow internet? Service might need more time to load
3. Check if website has anti-automation measures
4. Disable "Auto-close tabs" in Settings temporarily

#### Wrong website opens
**Problem**: Extension opens unexpected URL

**Solutions**:
1. Check URL for typos in service configuration
2. Delete and recreate the service
3. Export data, check the JSON for corruption
4. Clear all data and import clean backup

#### Catch-up not working after PC restart
**Problem**: Missed schedules aren't rescheduled

**Solutions**:
1. Wait 1-2 minutes after Chrome opens
2. Check background service worker: `chrome://extensions/` → ServiceKeeper → "Inspect views: service worker"
3. Manually trigger: Click "Test Now" to reset schedule
4. Reinstall extension if persistent

---

### 🔐 2FA Token Issues

#### QR code won't scan
**Problem**: Upload QR image but nothing happens

**Solutions**:
1. **Download jsQR.js**: The placeholder file doesn't work!
   - Get from: https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js
   - Replace the existing jsQR.js file
2. **Check image quality**: Use clear, high-resolution QR code image
3. **Try manual entry**: Extract secret from QR and paste directly
4. **Supported formats**: PNG, JPG, WEBP
5. **Check browser console**: F12 → Console tab for errors

#### Token shows "------"
**Problem**: 2FA code displays dashes instead of numbers

**Solutions**:
1. **Invalid secret**: Check the secret key is correct base32
2. **Format**: Secret should be UPPERCASE letters A-Z and numbers 2-7
3. **Test the secret**: Delete and re-add with correct format
4. **No spaces**: Remove any spaces from secret key

#### Wrong 2FA code generated
**Problem**: Code doesn't work on target website

**Solutions**:
1. **Time sync**: Ensure your computer clock is accurate
2. **Check issuer**: Different services might use different settings
3. **Algorithm**: Extension uses SHA-1 (standard), some services use SHA-256
4. **Test secret**: Verify secret key from original source
5. **Period**: Extension uses 30-second period (standard)

#### Can't copy code
**Problem**: Click on code but nothing happens

**Solutions**:
1. Grant clipboard permissions to Chrome
2. Check browser console for errors
3. Try right-click → Copy instead
4. Manually type the 6-digit code

---

### 💾 Data Management Issues

#### Export fails or downloads corrupt file
**Problem**: Export button doesn't work or file is invalid

**Solutions**:
1. Check browser download permissions
2. Try export again (might be temporary glitch)
3. Check available disk space
4. Manually copy data from Chrome DevTools storage
5. Use "Save As" if browser blocks download

#### Import doesn't restore data
**Problem**: Import file but no data appears

**Solutions**:
1. **Verify file format**: Must be valid JSON
2. **Check version**: Extension expects v1.0.0 format
3. **File corruption**: Try re-exporting from source
4. **Confirm import**: Check that you clicked through confirmation dialogs
5. **Reload extension**: Remove and re-add extension, then import

#### Data disappears after browser restart
**Problem**: Configured services vanish

**Solutions**:
1. **Storage permission**: Check `chrome://extensions/` permissions
2. **Encryption failure**: Master key might have changed
3. **Chrome sync**: Disable Chrome sync for extension data
4. **Regular backups**: Export data frequently
5. **Check Chrome storage**: `chrome://extensions/` → ServiceKeeper → Storage

#### Clear All Data button doesn't work
**Problem**: Click clear but data remains

**Solutions**:
1. Confirm both confirmation dialogs
2. Manually clear: Chrome DevTools → Application → Storage
3. Remove and reinstall extension (nuclear option)
4. Check browser console for JavaScript errors

---

### 🔒 Security & Privacy Issues

#### Concerned about data security
**Problem**: Want to verify encryption

**Solutions**:
1. **Review code**: All source code is available
2. **Check encryption**: Data in `chrome.storage.local` is encrypted
3. **No network calls**: Extension never contacts external servers
4. **Audit yourself**: Use browser DevTools to monitor network
5. **Open source**: Verify the crypto.js implementation

#### Sharing computer concerns
**Problem**: Others can access your Chrome profile

**Solutions**:
1. **Use Chrome profiles**: Create separate profile with password
2. **Regular exports**: Keep encrypted backups elsewhere
3. **Lock Chrome**: Use Chrome profile lock feature
4. **Consider 2FA risk**: Anyone with profile access can see codes
5. **Clear on exit**: Use "Clear All Data" before sharing PC

---

### ⚡ Performance Issues

#### Extension using too much memory
**Problem**: High RAM usage in Task Manager

**Solutions**:
1. **Normal behavior**: Each tab briefly uses memory
2. **Reduce services**: Fewer services = less memory
3. **Shorter keep-open**: Reduce seconds tabs stay open
4. **Check intervals**: Very frequent visits increase usage
5. **Close other extensions**: Might be combined effect

#### Chrome becomes slow
**Problem**: Browser lags when extension is active

**Solutions**:
1. Increase visit intervals (less frequent = less impact)
2. Reduce "Keep Tab Open" duration
3. Check if specific websites are slow to load
4. Monitor with Chrome Task Manager (Shift+Esc)
5. Update Chrome to latest version

#### Battery draining faster on laptop
**Problem**: Laptop battery depletes quickly

**Solutions**:
1. Reduce visit frequency for non-critical services
2. Pause services when on battery power
3. Enable Chrome battery saver mode
4. Only run extension when plugged in
5. Consider longer intervals (48h vs 24h)

---

### 🌐 Compatibility Issues

#### Service redirects to login page
**Problem**: Visit opens but shows login instead of dashboard

**Solutions**:
1. **Stay logged in**: Enable "Remember me" on service
2. **Cookie settings**: Allow cookies for that domain
3. **Session duration**: Some services logout after time
4. **Manual login**: Login manually, then test visit
5. **Authentication token**: Might need to refresh login

#### Cloudflare/CAPTCHA blocks visits
**Problem**: Website shows security check

**Solutions**:
1. **Expected behavior**: Some sites detect automation
2. **Manual solve**: Solve CAPTCHA once manually
3. **Increase intervals**: Less frequent visits less suspicious
4. **Different approach**: Contact service about keepalive endpoints
5. **Terms of service**: Verify automated access is allowed

#### Website doesn't load properly
**Problem**: Page loads but looks broken

**Solutions**:
1. **JavaScript issues**: Page might need more time
2. **Increase keep-open time**: Try 30-60 seconds
3. **Check network**: Slow connection might timeout
4. **Service down**: Website itself might be having issues
5. **Browser compatibility**: Site might require specific settings

---

### 📱 Browser-Specific Issues

#### Works on desktop but not laptop
**Problem**: Different behavior on different computers

**Solutions**:
1. Check Chrome versions match
2. Export/import to sync configuration
3. Verify same Chrome flags/settings
4. Check firewall/antivirus settings
5. Ensure both have proper permissions

#### Different behavior on Mac/Windows/Linux
**Problem**: Extension acts differently on OS

**Solutions**:
1. **Expected**: Chrome is cross-platform but OS differs
2. **File paths**: Icons might have different behavior
3. **Timekeeping**: System clock accuracy matters for 2FA
4. **Permissions**: Some OS have stricter security
5. **Test thoroughly**: Verify on your specific OS

---

## 🆘 Emergency Procedures

### Complete Reset (Nuclear Option)

If nothing else works:

1. **Export data** (if possible)
2. Go to `chrome://extensions/`
3. Remove ServiceKeeper
4. Clear Chrome cache: `chrome://settings/clearBrowserData`
5. Restart Chrome completely
6. Reinstall extension
7. Import your backup data

### Manual Data Recovery

If extension fails but data exists:

1. Open Chrome DevTools (F12)
2. Go to Application → Storage → Local Storage
3. Find extension data (encrypted)
4. Note: Data is encrypted, but you can see structure
5. Contact support with specific error messages

### Reporting Bugs

When asking for help, include:

1. Chrome version: `chrome://version/`
2. Extension version: Check manifest.json
3. Operating system and version
4. Steps to reproduce the issue
5. Browser console errors (F12 → Console)
6. Screenshots if relevant

---

## 📊 Debugging Tips

### Enable Verbose Logging

1. Open extension service worker: `chrome://extensions/` → ServiceKeeper → "service worker"
2. Check console for detailed logs
3. Every action is logged for debugging
4. Note timestamps and error messages

### Check Storage Directly

1. Open DevTools (F12)
2. Application → Storage → Local Storage
3. Find extension ID
4. View stored data (encrypted but visible)
5. Check for corruption or missing keys

### Test in Incognito Mode

1. Allow extension in incognito: `chrome://extensions/` → ServiceKeeper → Details → "Allow in incognito"
2. Test if issue persists
3. Helps isolate extension conflicts
4. Fresh environment for testing

### Monitor Network Activity

1. Open DevTools (F12)
2. Network tab
3. Watch for requests when visiting services
4. Check for failed requests or errors
5. Verify no unexpected external calls

---

## 💡 Pro Tips

1. **Regular exports**: Export data weekly as backup
2. **Test after updates**: Verify services work after Chrome updates
3. **Monitor visit counts**: Check stats to ensure working
4. **Use notifications**: Enable to know when visits happen
5. **Gradual rollout**: Add services one at a time to test
6. **Document issues**: Keep log of any problems encountered
7. **Update Chrome**: Keep browser updated for best compatibility

---

## 🔗 Additional Resources

- **Chrome Extension Documentation**: https://developer.chrome.com/docs/extensions/
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- **TOTP Standard (RFC 6238)**: https://tools.ietf.org/html/rfc6238

---

## Still Having Issues?

If this guide didn't solve your problem:

1. Check the main README.md for additional information
2. Review example-backup.json for proper data format
3. Verify all installation steps in INSTALL.md
4. Check browser console for specific error messages
5. Try the complete reset procedure above

**Remember**: This extension is open source - you can always review the code to understand exactly what's happening!
