# 🛡️ ServiceKeeper - Complete Setup Instructions

## What You've Got

You now have **ServiceKeeper** - a professional Chrome extension that will:
- ✅ Automatically visit your service dashboards to keep them active
- ✅ Handle 2FA codes securely with local encryption
- ✅ Smart scheduling with missed-visit recovery
- ✅ Beautiful, modern interface
- ✅ Complete privacy - all data stays local

## 📦 Package Contents

- `servicekeeper-extension/` - Complete extension folder
- `servicekeeper-extension.zip` - Packaged version for easy sharing

## 🚀 Installation (5 minutes)

### Step 1: Prepare the Extension

1. **Extract the folder**
   - Unzip `servicekeeper-extension.zip` if needed
   - Or use the `servicekeeper-extension` folder directly

2. **Download jsQR library** (required for QR code scanning)
   - **Important**: The included jsQR.js is a placeholder!
   - Download the real library from: https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js
   - Replace the `jsQR.js` file in the extension folder
   - Alternatively, if you don't need QR scanning, you can skip this

### Step 2: Install in Chrome

1. Open Chrome browser
2. Navigate to: `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"** button
5. Select the `servicekeeper-extension` folder
6. Extension is now installed! ✨

### Step 3: Pin to Toolbar (Recommended)

1. Click the puzzle piece icon (🧩) in Chrome toolbar
2. Find "ServiceKeeper" in the list
3. Click the pin icon next to it
4. The shield icon will now appear in your toolbar

## 🎯 Quick Start Guide

### Adding Your First Service

Let's keep a Heroku app alive as an example:

1. **Click the ServiceKeeper icon** in your toolbar
2. Click **"Add Service"**
3. Fill in the details:
   ```
   Service Name: Heroku Dashboard
   Dashboard URL: https://dashboard.heroku.com/apps/your-app-name
   Visit Interval: 24 (hours)
   Keep Tab Open: 10 (seconds)
   ✓ Enable immediately
   ✓ Show notifications
   ```
4. Click **"Save Service"**
5. Done! ServiceKeeper will visit this URL every 24 hours

### Adding 2FA Tokens

If your service requires 2FA:

1. Go to the **"2FA"** tab
2. Click **"Add 2FA"**
3. **Option A - QR Code**:
   - Click "Upload QR Code Image"
   - Select the QR code image
   - Account name is auto-filled
4. **Option B - Manual**:
   - Enter Account Name (e.g., "GitHub")
   - Paste the secret key (base32 string)
5. Click **"Save Token"**
6. Your 6-digit code appears with countdown timer
7. Click the code to copy it instantly!

## 🎨 What Makes ServiceKeeper Special

### Smart Catch-Up System
- Computer was off during a scheduled visit? No problem!
- ServiceKeeper detects missed schedules when Chrome reopens
- Automatically reschedules for the next available time
- Example: Scheduled for 2 AM, PC was off → Runs at 10 AM when you open Chrome

### Military-Grade Security
- **AES-256-GCM encryption** for all sensitive data
- **PBKDF2 with 100,000 iterations** for key derivation
- All data stored **locally only** - never leaves your device
- No tracking, no analytics, no external connections

### Beautiful Design
- Clean, modern interface with smooth animations
- Real-time status indicators
- Intuitive tab navigation
- Dark-mode friendly color scheme
- Professional gradient design

## 📋 Common Use Cases

### Free Hosting Services
```
Service: Heroku Free Dyno
Interval: 24 hours
URL: https://dashboard.heroku.com/apps/my-app

Service: Render Free Tier
Interval: 12 hours  
URL: https://dashboard.render.com/

Service: Railway Free Plan
Interval: 24 hours
URL: https://railway.app/project/my-project
```

### Database Services
```
Service: MongoDB Atlas
Interval: 48 hours
URL: https://cloud.mongodb.com/v2/project-id

Service: PlanetScale
Interval: 72 hours
URL: https://app.planetscale.com/your-org
```

### Development Tools
```
Service: Vercel Projects
Interval: 168 hours (1 week)
URL: https://vercel.com/dashboard

Service: Netlify Sites  
Interval: 168 hours (1 week)
URL: https://app.netlify.com/teams/your-team
```

## ⚙️ Recommended Settings

### For Most Services
- **Interval**: 24-48 hours (safe margin)
- **Keep Open**: 10-15 seconds
- **Notifications**: Enable (to monitor activity)
- **Auto-close**: Enable (cleaner workflow)

### For Critical Services
- **Interval**: 12-24 hours (more frequent)
- **Keep Open**: 20-30 seconds (ensure full load)
- **Notifications**: Enable (stay informed)

### For Less Important Services  
- **Interval**: 72-168 hours (weekly)
- **Keep Open**: 10 seconds (sufficient)
- **Notifications**: Disable (reduce noise)

## 🔐 Security Best Practices

1. **Export Regularly**: Backup your data weekly
2. **Secure Chrome Profile**: Use Chrome profile password
3. **Review Services**: Periodically check what's configured
4. **Clear on Sharing**: Use "Clear All Data" before lending PC
5. **Check URLs**: Verify service URLs are correct

## 🛠️ Troubleshooting Quick Fixes

### Extension Not Working?
1. Check Chrome is running (extension needs Chrome open)
2. Verify service is enabled (green "Active" badge)
3. Click "Test Now" to manually trigger a visit
4. Check `chrome://extensions/` for any errors

### QR Code Won't Scan?
1. Download real jsQR.js library (see Step 1)
2. Use high-quality QR code image
3. Try manual secret entry instead

### Data Not Saving?
1. Export your data as backup
2. Check Chrome storage permissions
3. Try import/export cycle to verify

### Service Not Visiting?
1. Check URL starts with `https://`
2. Increase "Keep Open" duration
3. Verify you're logged into the service
4. Test with "Test Now" button

**See TROUBLESHOOTING.md for detailed solutions**

## 📚 Documentation Files

- **README.md** - Complete feature documentation
- **INSTALL.md** - Detailed installation guide  
- **TROUBLESHOOTING.md** - Comprehensive problem solving
- **example-backup.json** - Sample data format

## 💡 Pro Tips

1. **Start Small**: Add one service, verify it works, then add more
2. **Test First**: Always use "Test Now" before relying on schedules
3. **Monitor Stats**: Check visit counts to ensure everything's working
4. **Batch Similar Services**: Group by provider for easier management
5. **Use Notifications**: Enable to stay aware of activity
6. **Export Monthly**: Keep backups outside Chrome
7. **Read Terms**: Make sure automated visits are allowed
8. **Adjust Intervals**: Find the sweet spot for each service

## 🎯 Next Steps

1. ✅ Install extension (follow Step 1-3 above)
2. ✅ Add your first service
3. ✅ Test with "Test Now" button
4. ✅ Add 2FA tokens if needed
5. ✅ Configure settings to your preference
6. ✅ Export a backup for safety
7. ✅ Let it run and enjoy your free services!

## 🆘 Need Help?

- **Quick issues**: Check TROUBLESHOOTING.md
- **Installation problems**: See INSTALL.md
- **Feature questions**: Read README.md
- **Bugs**: Check browser console (F12)

## 🚀 You're All Set!

ServiceKeeper is now protecting your free services. The extension will:
- Run silently in the background
- Visit services at scheduled times
- Handle missed schedules automatically  
- Keep your data encrypted and secure
- Show notifications (if enabled)

**Just keep Chrome running and let ServiceKeeper do its job!**

---

## 📊 Feature Summary

| Feature | Description | Status |
|---------|-------------|--------|
| Auto Scheduling | Visit services automatically | ✅ Working |
| Smart Catch-Up | Recover missed schedules | ✅ Working |
| 2FA Generator | TOTP codes with timer | ✅ Working |
| QR Scanning | Extract secrets from QR | ⚠️ Needs jsQR.js |
| AES Encryption | Secure data storage | ✅ Working |
| Export/Import | Backup and restore | ✅ Working |
| Notifications | Visit alerts | ✅ Working |
| Multiple Services | Unlimited services | ✅ Working |
| Custom Intervals | 1-720 hours | ✅ Working |

## 🎉 Enjoy!

You now have a professional-grade service keeper that will save you from losing your free tiers due to inactivity!

**Made with ❤️ for developers who love free services**

*Keep your services alive, keep coding!* 🚀
