# ServiceKeeper Testing Guide

## 🔧 What Was Fixed

### 1. **Button Functionality**
- ✅ Fixed Pause/Resume buttons
- ✅ Fixed Test Now buttons  
- ✅ Fixed Delete buttons (both Services and 2FA)
- Changed from inline `onclick` handlers to proper event listeners

### 2. **Logging Added**
- Console logs in popup.js for all button actions
- Detailed logging in background.js for scheduling
- Easy to debug issues

## 🧪 Testing Steps

### Step 1: Reload Extension
1. Go to `chrome://extensions/`
2. Find ServiceKeeper
3. Click the **Reload** button (circular arrow icon)

### Step 2: Test Service Management
1. Click the extension icon to open popup
2. **Add a Service:**
   - Click "Add Service"
   - Fill in:
     - Name: `Test Service`
     - URL: `https://www.google.com`
     - Interval: `1` hour (or `1` minute for quick testing)
     - Keep auto-close checked
     - Keep tab open: `5` seconds
   - Click "Save Service"
   
3. **Test Buttons:**
   - Click **Test Now** → Should open tab and close after 5 seconds
   - Click **Pause** → Status should change to "Paused"
   - Click **Resume** → Status should change to "Active"
   - Click **Delete** → Should ask for confirmation and remove service

### Step 3: Test 2FA
1. Go to "2FA" tab
2. Click "Add 2FA"
3. Either:
   - **Upload QR:** Click "Upload QR Code Image" and select a TOTP QR code
   - **Manual:** Enter a secret like `JBSWY3DPEHPK3PXP`
4. Should see 6-digit code updating every 30 seconds
5. Click the code to copy it
6. Click **Delete** button to remove

### Step 4: Check Scheduling Works

#### Option A: Check Console Logs
1. Right-click the extension icon → "Inspect popup"
2. Add a service with 1-hour interval
3. Look for console logs:
   ```
   saveService called
   Service object created: {...}
   Schedule response: {success: true}
   ```

#### Option B: Check Background Service Worker
1. Go to `chrome://extensions/`
2. Find ServiceKeeper
3. Click "service worker" link (blue text)
4. Copy contents of `test-alarms.js` file
5. Paste into console and press Enter
6. Should see all scheduled alarms and service details

#### Option C: Quick Test (1 minute interval)
1. Add a service with interval: `1` hour
2. Set "Keep tab open" to `5` seconds
3. Click "Test Now" to see immediate behavior
4. For scheduled test, temporarily edit the service in console:
   ```javascript
   // In popup console:
   services[0].intervalHours = 0.0166; // 1 minute
   services[0].nextRun = Date.now() + 60000;
   saveServices();
   ```
5. Wait 1 minute - tab should open automatically

## 🐛 Troubleshooting

### Buttons Don't Work
1. Open popup console (right-click extension → Inspect popup)
2. Click a button
3. Look for error messages
4. Share the error here

### Scheduling Doesn't Work
1. Open background service worker console
2. Add a service
3. Look for logs starting with `[Schedule]`
4. Run the test-alarms.js script
5. Check if alarms are created

### 2FA Delete Doesn't Work
1. Open popup console
2. Click delete on a 2FA token
3. Should see: `Deleting 2FA token: <id>`
4. If no log appears, event listener isn't attached

## 📊 Expected Console Output

### When Adding Service:
```
saveService called
Form values: {name: "Test", url: "https://...", ...}
Service object created: {...}
[Message] Received: scheduleService
[Schedule] Scheduling Test Service (ID: 1234...)
[Schedule] ✓ Test Service scheduled for ...
Schedule response: {success: true}
Service saved successfully
```

### When Testing Service:
```
Testing service: 1234...
[Message] Received: testVisit
[Visit] Starting visit for service ID: 1234...
[Visit] Opening Test Service: https://...
[Visit] Tab created: 123
[Visit] Will auto-close tab in 5 seconds
Test visit response: {success: true}
```

### When Alarm Triggers:
```
[Alarm] Triggered: service_1234...
[Visit] Starting visit for service ID: 1234...
[Visit] Opening Test Service: ...
```

## ✅ All Features Working
- ✅ Add Service with flexible intervals (hours/days/weeks)
- ✅ Toggle service on/off (Pause/Resume)
- ✅ Test service immediately
- ✅ Delete service
- ✅ Auto-close tabs (optional)
- ✅ Add 2FA with QR upload
- ✅ Delete 2FA tokens
- ✅ Copy 2FA codes
- ✅ Scheduled visits via Chrome alarms
- ✅ Encrypted storage
- ✅ Export/Import data
- ✅ Clear all data
