# 🛡️ ServiceKeeper - Chrome Extension

**Keep your free services alive automatically** - Never lose your free tier services due to inactivity again!

ServiceKeeper is a secure, privacy-focused Chrome extension that automatically visits your service dashboards at scheduled intervals to prevent idle termination. Perfect for keeping free hosting services, databases, and other free-tier platforms active.

## ✨ Features

### 🔄 Automatic Service Visits
- **Scheduled visits** to any website URL at customizable intervals (1-720 hours)
- **Smart catch-up** - If your PC was off during a scheduled visit, the extension will reschedule for the next available time
- **Background operation** - Tabs open and close automatically without interrupting your work
- **Customizable timing** - Each service can have its own visit interval based on its specific requirements

### 🔐 2FA Token Generator (TOTP)
- **Secure 2FA storage** - Store your 2FA secrets encrypted locally
- **QR code scanning** - Upload QR code images to automatically extract secrets
- **Live token generation** - Real-time TOTP codes with countdown timer
- **Click to copy** - Instantly copy codes to clipboard

### 🔒 Security & Privacy
- **End-to-end encryption** - All sensitive data encrypted using AES-256-GCM
- **Local storage only** - No data leaves your device, ever
- **No tracking** - Zero analytics, telemetry, or external connections
- **Secure key derivation** - PBKDF2 with 100,000 iterations

### 💾 Data Management
- **Export/Import** - Backup and restore your entire configuration
- **Clear data** - Complete data wipeout when needed
- **Persistent storage** - Settings and schedules survive browser restarts

### 🎨 Beautiful Interface
- Modern, clean design with smooth animations
- Intuitive tab-based navigation
- Real-time status indicators
- Dark-mode friendly color scheme

## 📦 Installation

### Method 1: From Source (Recommended)

1. **Download the extension files**
   - Clone this repository or download as ZIP

2. **Install jsQR library** (for QR code scanning)
   - Download `jsQR.js` from: https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js
   - Save it to the extension folder, replacing the placeholder file

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `servicekeeper-extension` folder

4. **Pin the extension**
   - Click the puzzle icon in Chrome toolbar
   - Find ServiceKeeper and click the pin icon

### Method 2: Chrome Web Store
*Coming soon - pending review*

## 🚀 Quick Start

### Adding a Service

1. Click the ServiceKeeper icon in your toolbar
2. Navigate to the "Services" tab
3. Click "Add Service"
4. Fill in:
   - **Service Name**: e.g., "Heroku Dashboard"
   - **Dashboard URL**: Full URL including https://
   - **Visit Interval**: How often to visit (in hours)
   - **Keep Tab Open**: How long to keep the tab open (5-60 seconds)
   - Enable notifications if desired
5. Click "Save Service"

The extension will now automatically visit this URL at your specified interval!

### Managing Services

- **Pause/Resume**: Click the pause/play button on any service
- **Test Now**: Click the arrow button to test visit immediately
- **Delete**: Click the trash button to remove a service
- **View Stats**: See interval, visit count, and status at a glance

### Adding 2FA Tokens

1. Go to the "2FA" tab
2. Click "Add 2FA"
3. Enter:
   - **Account Name**: e.g., "GitHub", "Google"
   - **Secret Key**: Either paste the base32 secret or otpauth:// URI
   - Or click "Upload QR Code Image" to scan a QR code
4. Click "Save Token"

Your 2FA code will now be displayed with a countdown timer. Click the code to copy it!

## 🎯 Use Cases

### Free Hosting Services
- **Heroku**: Keep dyno awake (requires visit every 30 minutes)
- **Render**: Prevent free tier spin-down
- **Railway**: Maintain active status
- **Fly.io**: Keep apps from sleeping

### Database Services
- **MongoDB Atlas**: Prevent idle cluster pause
- **PlanetScale**: Keep database active
- **Supabase**: Maintain free tier access

### CI/CD & Dev Tools
- **GitHub Actions**: Keep workflows active
- **Vercel**: Maintain deployment status
- **Netlify**: Keep projects active

### Any Service With Inactivity Rules
Set custom intervals based on each provider's specific requirements!

## 🔐 Security Details

### Encryption
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with SHA-256, 100,000 iterations
- **IV**: Randomly generated for each encryption operation
- **Salt**: Unique per extension installation

### Data Storage
- Services configuration: Encrypted in `chrome.storage.local`
- 2FA secrets: Encrypted in `chrome.storage.local`
- Master key material: Derived from extension ID + random salt
- No data ever sent to external servers

### 2FA Security
- Secrets never leave your device
- TOTP generation happens locally in browser
- Compatible with RFC 6238 standard
- Supports SHA-1 HMAC (industry standard)

## ⚙️ Settings

### General Settings
- **Show notifications**: Get notified when services are visited
- **Auto-close tabs**: Automatically close tabs after visiting
- **Default keep-open duration**: Set default seconds for new services

### Data Management
- **Export Data**: Download JSON backup (optionally encrypted with a passphrase)
- **Import Data**: Restore from backup file
- **Clear All Data**: Complete reset (requires confirmation)

## 🤔 FAQ

### How does catch-up work?
If your computer was off during a scheduled visit, ServiceKeeper will:
1. Calculate how many intervals were missed
2. Schedule the next visit ASAP (within 1 minute of Chrome opening)
3. Resume normal schedule from there

### Does this use a lot of resources?
No! The extension:
- Uses Chrome's built-in alarm API (very lightweight)
- Only opens tabs when needed
- Closes tabs automatically
- Has minimal memory footprint

### Is my data safe?
Yes! All data is:
- Encrypted with military-grade encryption (AES-256)
- Stored only on your device
- Never transmitted anywhere
- Protected even if your Chrome profile is accessed

### Can I use this on multiple computers?
Yes, but you'll need to:
1. Export data from first computer
2. Import on second computer
3. Note: Chrome Sync doesn't sync extension data for security

### What if a service requires login?
ServiceKeeper just opens the URL. If you're logged into the service in Chrome, it will work. You may need to:
- Keep cookies enabled
- Stay logged in
- Use "Remember me" on login pages

### Why do I need 2FA in ServiceKeeper?
Many free services require 2FA. Having codes readily available makes quick logins easier when checking on your services manually.

## 🛠️ Technical Details

### Files Structure
```
servicekeeper-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (scheduling logic)
├── popup.html            # User interface
├── popup.js              # UI logic
├── popup.css             # Styles
├── crypto.js             # Encryption & TOTP
├── jsQR.js              # QR code scanner library
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

### Technologies Used
- **Manifest V3**: Latest Chrome extension standard
- **Chrome Alarms API**: Persistent scheduling
- **Web Crypto API**: Secure encryption
- **TOTP (RFC 6238)**: Industry-standard 2FA
- **jsQR**: QR code scanning

### Permissions Required
- `storage`: Save encrypted configuration
- `alarms`: Schedule service visits
- `tabs`: Open URLs in background
- `unlimitedStorage`: No storage limits
- `<all_urls>`: Visit any URL you configure

## 📝 Version History

### v1.0.0 (Current)
- Initial release
- Automatic service scheduling
- Smart catch-up for missed schedules
- 2FA token management
- QR code scanning
- Full encryption
- Export/import functionality

## 🤝 Contributing

Found a bug? Have a feature request? 

1. Check existing issues on GitHub
2. Create a new issue with details
3. Or submit a pull request!

## 📄 License

MIT License - Feel free to use, modify, and distribute!

## 🙏 Acknowledgments

- jsQR library for QR code scanning
- Chrome Extensions team for excellent APIs
- All users keeping their free services alive!

## ⚠️ Disclaimer

This extension is provided as-is. Always:
- Review service provider terms of service
- Ensure your automated visits comply with their policies
- Use responsibly and ethically
- Keep backups of important data

## 💡 Tips & Best Practices

1. **Set appropriate intervals**: Don't visit more than necessary
2. **Use notifications**: Stay informed of visit activity
3. **Regular backups**: Export your data occasionally
4. **Test first**: Use "Test Now" before relying on schedules
5. **Monitor stats**: Check visit counts to ensure it's working
6. **Keep Chrome running**: Extension only works when Chrome is open
7. **Battery saver**: On laptops, ensure Chrome can run in background

---

**Made with ❤️ for developers who love free tiers**

*Keep your services alive, keep coding!* 🚀
