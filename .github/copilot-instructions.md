# ServiceKeeper – Copilot Instructions

## Project Overview

ServiceKeeper is a **Chrome Extension (Manifest V3)** that automatically visits URLs on a schedule (via Chrome Alarms API) to keep free-tier services alive, and stores TOTP 2FA secrets. There is no build system, bundler, or package manager — all files are plain JavaScript loaded directly by the browser.

## Testing & Debugging

There is no automated test suite. To debug scheduling:

1. Load the extension unpacked from `chrome://extensions/`
2. Click the **"service worker"** link on the ServiceKeeper card to open the background context DevTools
3. Paste the contents of `test-alarms.js` into the console to inspect live alarm state and service schedules

To test the popup UI: click the extension icon to open `popup.html` and use its DevTools normally.

## Architecture

```
background.js     ← Service Worker: scheduling, alarm handling, tab lifecycle
crypto.js         ← Shared utility classes (imported by both background and popup)
popup.js          ← All UI logic: rendering, modals, data load/save
popup.html        ← UI shell with three tabs: Services, 2FA, Settings
popup.css         ← Styles
jsQR.js           ← Vendored QR scanning library (no CDN at runtime)
manifest.json     ← MV3 config, permissions: storage, alarms, tabs, notifications
```

`crypto.js` is the only file shared between the two execution contexts:
- **Background**: loaded via `importScripts('crypto.js')` at the top of `background.js`
- **Popup**: loaded as a `<script>` tag before `popup.js` in `popup.html`

Any change to `crypto.js` affects both contexts.

## Key Conventions

### Storage pattern
All persistent user data (services, TOTP tokens) is encrypted at rest using `SecureStorage`:
```js
await SecureStorage.saveSecure('services', { services });
const data = await SecureStorage.loadSecure('services');
```
The key is derived from the extension's runtime ID + a random salt (PBKDF2/AES-256-GCM). Settings are the only data stored **unencrypted** via `chrome.storage.local`.

The TOTP vault has an optional secondary passphrase layer using `BackupCrypto`. When active, tokens are stored under the `totpVault` key (encrypted) instead of the `totp` key.

### Alarm naming
- Service visit alarms: `service_${service.id}`
- Auto-close tab alarms: `close_tab_${tabId}`

Chrome's Alarms API enforces a **minimum 1-minute delay**. `scheduleService()` always enforces `Math.max(1, delayInMinutes)` and adjusts `nextRun` accordingly.

### Popup ↔ Background messaging
Communication uses `chrome.runtime.sendMessage` with an `action` string. Background returns `true` to signal async response. Defined actions:
- `scheduleService` — schedule or reschedule a service
- `unscheduleService` — clear an alarm by service ID
- `testVisit` — trigger an immediate visit
- `generate2FA` — generate a TOTP code from a secret

### Service ID format
Service IDs are `Date.now().toString()` (millisecond timestamps as strings).

### Data normalization
On every load, `normalizeServices()`, `normalizeTotpTokens()`, and `normalizeSettings()` sanitize incoming data and back-save if anything changed. Always run data through these when loading from storage.

### Validation guard
Use `isSchedulableService(service)` (defined in `background.js`) before any scheduling call. It validates `id`, `url` (must be http/https), and `intervalHours`.

### Catch-up scheduling
If a service's `nextRun` is in the past when the extension starts, `calculateCatchUpTime()` determines whether to run ASAP (missed < 1 interval) or skip to the next interval boundary.
