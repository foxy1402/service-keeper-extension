// ServiceKeeper Popup Script

let services = [];
let totpTokens = [];
let serviceCountdownIntervalId = null;
let totpRefreshIntervalId = null;
let totpVaultState = {
  encrypted: false,
  passphrase: null
};
let settings = {
  notificationsEnabled: true,
  autoCloseTab: true,
  defaultKeepOpen: 10
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initializeTabs();
  initializeEventListeners();
  renderServices();
  renderTOTPs();
  updateActiveCount();
  startServiceCountdownRefresh();
  startTOTPRefresh();
});

// Load data from encrypted storage
async function loadData() {
  try {
    let shouldResaveServices = false;
    let shouldResaveTotp = false;
    let shouldResaveSettings = false;

    const servicesData = await SecureStorage.loadSecure('services');
    if (servicesData) {
      services = normalizeServices(servicesData.services);
      shouldResaveServices = JSON.stringify(servicesData.services || []) !== JSON.stringify(services);
    }
    
    const vaultState = await chrome.storage.local.get(['totpVault']);
    if (vaultState.totpVault && vaultState.totpVault.encrypted) {
      totpVaultState.encrypted = true;
      const decryptedVault = await unlockTotpVault(vaultState.totpVault);
      totpTokens = normalizeTotpTokens(decryptedVault?.tokens);
      shouldResaveTotp = decryptedVault
        ? JSON.stringify(decryptedVault.tokens || []) !== JSON.stringify(totpTokens)
        : false;
    } else {
      totpVaultState.encrypted = false;
      totpVaultState.passphrase = null;

      const totpData = await SecureStorage.loadSecure('totp');
      if (totpData) {
        totpTokens = normalizeTotpTokens(totpData.tokens);
        shouldResaveTotp = JSON.stringify(totpData.tokens || []) !== JSON.stringify(totpTokens);
      }
    }
    
    const settingsData = await chrome.storage.local.get(['settings']);
    if (settingsData.settings) {
      const sanitizedSettings = normalizeSettings(settingsData.settings);
      shouldResaveSettings = JSON.stringify(settingsData.settings) !== JSON.stringify(sanitizedSettings);
      settings = { ...settings, ...sanitizedSettings };
    }
    
    applySettingsToUI();
    updateTotpVaultButtons();

    if (shouldResaveServices) await saveServices();
    if (shouldResaveTotp) await saveTOTPs();
    if (shouldResaveSettings) await saveSettings();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to encrypted storage
async function saveServices() {
  await SecureStorage.saveSecure('services', { services });
}

async function saveTOTPs() {
  const normalizedTokens = normalizeTotpTokens(totpTokens);

  if (totpVaultState.encrypted) {
    const passphrase = await ensureTotpVaultPassphrase();
    if (!passphrase) {
      throw new Error('2FA vault is locked');
    }

    const encryptedVault = await BackupCrypto.encryptBackup({
      kind: 'totp-vault',
      tokens: normalizedTokens
    }, passphrase);

    await chrome.storage.local.set({ totpVault: encryptedVault });
    await chrome.storage.local.remove('totp');
  } else {
    await SecureStorage.saveSecure('totp', { tokens: normalizedTokens });
    await chrome.storage.local.remove('totpVault');
  }
}

async function saveSettings() {
  await chrome.storage.local.set({ settings });
}

// Tab switching
function initializeTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// Event listeners
function initializeEventListeners() {
  // Service management
  document.getElementById('addServiceBtn').addEventListener('click', openAddServiceModal);
  document.getElementById('closeServiceModal').addEventListener('click', closeAddServiceModal);
  document.getElementById('cancelServiceBtn').addEventListener('click', closeAddServiceModal);
  document.getElementById('saveServiceBtn').addEventListener('click', saveService);
  
  // 2FA management
  document.getElementById('add2FABtn').addEventListener('click', openAdd2FAModal);
  document.getElementById('close2FAModal').addEventListener('click', closeAdd2FAModal);
  document.getElementById('cancel2FABtn').addEventListener('click', closeAdd2FAModal);
  document.getElementById('save2FABtn').addEventListener('click', save2FA);
  document.getElementById('scanQRBtn').addEventListener('click', () => {
    document.getElementById('qrImageInput').click();
  });
  document.getElementById('qrImageInput').addEventListener('change', handleQRUpload);
  
  // Settings
  document.getElementById('notificationsEnabled').addEventListener('change', (e) => {
    settings.notificationsEnabled = e.target.checked;
    saveSettings();
  });
  
  document.getElementById('autoCloseTab').addEventListener('change', (e) => {
    settings.autoCloseTab = e.target.checked;
    saveSettings();
  });
  
  document.getElementById('defaultKeepOpen').addEventListener('change', (e) => {
    settings.defaultKeepOpen = parseInt(e.target.value);
    saveSettings();
  });
  
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
  document.getElementById('enableTotpVaultBtn').addEventListener('click', enableTotpVaultProtection);
  document.getElementById('disableTotpVaultBtn').addEventListener('click', disableTotpVaultProtection);
  
  // Auto-close toggle
  document.getElementById('serviceAutoClose').addEventListener('change', toggleKeepOpenField);
  
  // Close modal on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

function toggleKeepOpenField() {
  const autoClose = document.getElementById('serviceAutoClose').checked;
  const keepOpenGroup = document.getElementById('keepOpenGroup');
  keepOpenGroup.style.display = autoClose ? 'block' : 'none';
}

// Service management
function openAddServiceModal() {
  document.getElementById('addServiceModal').classList.add('active');
  document.getElementById('serviceName').value = '';
  document.getElementById('serviceUrl').value = '';
  document.getElementById('serviceInterval').value = '24';
  document.getElementById('serviceIntervalUnit').value = 'hours';
  document.getElementById('serviceAutoClose').checked = true;
  document.getElementById('serviceKeepOpen').value = settings.defaultKeepOpen;
  document.getElementById('serviceEnabled').checked = true;
  document.getElementById('serviceNotifications').checked = true;
  toggleKeepOpenField();
  document.getElementById('serviceName').focus();
}

function closeAddServiceModal() {
  document.getElementById('addServiceModal').classList.remove('active');
}

async function saveService() {
  try {
    console.log('saveService called');
    const name = document.getElementById('serviceName').value.trim();
    const url = document.getElementById('serviceUrl').value.trim();
    const intervalValue = parseInt(document.getElementById('serviceInterval').value, 10);
    const intervalUnit = document.getElementById('serviceIntervalUnit').value;
    const autoClose = document.getElementById('serviceAutoClose').checked;
    const keepOpenSeconds = autoClose ? parseInt(document.getElementById('serviceKeepOpen').value, 10) : null;
    const enabled = document.getElementById('serviceEnabled').checked;
    const notifications = document.getElementById('serviceNotifications').checked;
    
    console.log('Form values:', { name, url, intervalValue, intervalUnit, autoClose, keepOpenSeconds });
    
    if (!name || !url) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('URL must start with http:// or https://');
      return;
    }

    if (!Number.isFinite(intervalValue) || intervalValue < 1 || intervalValue > 9999) {
      alert('Visit interval must be between 1 and 9999');
      return;
    }

    if (autoClose && (!Number.isFinite(keepOpenSeconds) || keepOpenSeconds < 5 || keepOpenSeconds > 300)) {
      alert('Keep-open duration must be between 5 and 300 seconds');
      return;
    }
    
    // Convert interval to hours
    let intervalHours = intervalValue;
    if (intervalUnit === 'days') {
      intervalHours = intervalValue * 24;
    } else if (intervalUnit === 'weeks') {
      intervalHours = intervalValue * 24 * 7;
    }
    
    const service = {
      id: Date.now().toString(),
      name,
      url,
      intervalHours,
      intervalValue,
      intervalUnit,
      autoClose,
      keepOpenSeconds,
      enabled,
      notifications,
      nextRun: Date.now() + (intervalHours * 60 * 60 * 1000),
      lastVisit: null,
      lastAttempt: null,
      lastError: null,
      visitCount: 0,
      createdAt: Date.now()
    };

    if (!isValidService(service)) {
      alert('Invalid service data. Please check your values.');
      return;
    }
    
    console.log('Service object created:', service);
    services.push(service);
    await saveServices();
    
    if (enabled) {
      const response = await chrome.runtime.sendMessage({
        action: 'scheduleService',
        service: service
      });
      
      if (!response || !response.success) {
        console.error('Failed to schedule service:', response?.error);
        alert('Warning: Service saved but scheduling may have failed. Check the console.');
      }
    }
    
    renderServices();
    updateActiveCount();
    closeAddServiceModal();
    console.log('Service saved successfully');
  } catch (error) {
    console.error('Error saving service:', error);
    alert('Error saving service: ' + error.message);
  }
}

async function toggleService(id) {
  console.log('Toggling service:', id);
  const service = services.find(s => s.id === id);
  if (!service) return;
  
  service.enabled = !service.enabled;
  await saveServices();
  
  if (service.enabled) {
    service.nextRun = Date.now() + (service.intervalHours * 60 * 60 * 1000);
    const response = await chrome.runtime.sendMessage({
      action: 'scheduleService',
      service: service
    });
    console.log('Schedule response:', response);
  } else {
    const response = await chrome.runtime.sendMessage({
      action: 'unscheduleService',
      serviceId: id
    });
    console.log('Unschedule response:', response);
  }
  
  renderServices();
  updateActiveCount();
}

async function testService(id) {
  console.log('Testing service:', id);
  const response = await chrome.runtime.sendMessage({
    action: 'testVisit',
    serviceId: id
  });
  
  console.log('Test visit response:', response);
  
  if (response && response.success) {
    showNotification('Test visit initiated');
    // Wait a moment for background to update storage
    setTimeout(async () => {
      await loadData();
      renderServices();
    }, 500);
  } else {
    showNotification('Test visit failed: ' + (response?.error || 'Unknown error'));
  }
}

async function deleteService(id) {
  console.log('Deleting service:', id);
  if (!confirm('Are you sure you want to delete this service?')) return;
  
  const response = await chrome.runtime.sendMessage({
    action: 'unscheduleService',
    serviceId: id
  });
  console.log('Unschedule before delete response:', response);
  
  services = services.filter(s => s.id !== id);
  await saveServices();
  renderServices();
  updateActiveCount();
  showNotification('Service deleted');
}

function renderServices() {
  const container = document.getElementById('serviceList');
  
  if (services.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7V12C2 16.97 5.77 21.47 12 23C18.23 21.47 22 16.97 22 12V7L12 2Z" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8V16M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h3>No Services Yet</h3>
        <p>Add a service to keep it alive automatically</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = services.map(service => {
    const nextRun = service.nextRun ? new Date(service.nextRun).toLocaleString() : 'Not scheduled';
    const countdown = getServiceCountdownText(service);
    
    // Format interval display
    let interval;
    if (service.intervalUnit) {
      const unitLabel = service.intervalUnit === 'hours' ? 'h' : service.intervalUnit === 'days' ? 'd' : 'w';
      interval = `${service.intervalValue}${unitLabel}`;
    } else {
      interval = `${service.intervalHours}h`;
    }
    
    return `
      <div class="service-card" data-service-id="${service.id}">
        <div class="service-header">
          <div class="service-info">
            <div class="service-name">${escapeHtml(service.name)}</div>
            <div class="service-url">${escapeHtml(service.url)}</div>
          </div>
          <div class="service-actions">
            <button class="icon-btn btn-toggle-service" data-service-id="${service.id}" title="${service.enabled ? 'Pause' : 'Resume'}">
              <svg viewBox="0 0 24 24" fill="none">
                ${service.enabled 
                  ? '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>'
                  : '<path d="M8 5v14l11-7z" fill="currentColor"/>'}
              </svg>
            </button>
            <button class="icon-btn btn-test-service" data-service-id="${service.id}" title="Test Now">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="icon-btn danger btn-delete-service" data-service-id="${service.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="service-schedule">
          <div class="schedule-line">
            <span class="schedule-label">Next:</span>
            <span class="schedule-value">${nextRun}</span>
          </div>
          <div class="schedule-line">
            <span class="schedule-label">Countdown:</span>
            <span class="schedule-value schedule-countdown"
              data-service-id="${service.id}"
              data-next-run="${service.nextRun || ''}"
              data-enabled="${service.enabled}">
              ${countdown}
            </span>
          </div>
        </div>
        <div class="service-stats">
          <div class="stat-item">
            <div class="stat-label">Interval</div>
            <div class="stat-value">${interval}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Visits</div>
            <div class="stat-value">${service.visitCount || 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Status</div>
            <div class="stat-value">
              <span class="status-badge ${service.enabled ? 'active' : 'paused'}">
                ${service.enabled ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners using event delegation
  container.querySelectorAll('.btn-toggle-service').forEach(btn => {
    btn.addEventListener('click', () => toggleService(btn.dataset.serviceId));
  });
  container.querySelectorAll('.btn-test-service').forEach(btn => {
    btn.addEventListener('click', () => testService(btn.dataset.serviceId));
  });
  container.querySelectorAll('.btn-delete-service').forEach(btn => {
    btn.addEventListener('click', () => deleteService(btn.dataset.serviceId));
  });
}

function getServiceCountdownText(service, now = Date.now()) {
  if (!service.enabled) return 'Paused';
  if (!service.nextRun) return 'Not scheduled';

  const remainingMs = service.nextRun - now;
  if (remainingMs <= 0) return 'Due now';

  return formatDuration(remainingMs);
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function refreshServiceCountdowns() {
  const now = Date.now();
  document.querySelectorAll('.schedule-countdown').forEach(el => {
    const enabled = el.dataset.enabled === 'true';
    const nextRun = Number(el.dataset.nextRun);

    if (!enabled) {
      el.textContent = 'Paused';
      return;
    }

    if (!nextRun || Number.isNaN(nextRun)) {
      el.textContent = 'Not scheduled';
      return;
    }

    const remainingMs = nextRun - now;
    el.textContent = remainingMs <= 0 ? 'Due now' : formatDuration(remainingMs);
  });
}

function startServiceCountdownRefresh() {
  refreshServiceCountdowns();

  if (serviceCountdownIntervalId) {
    clearInterval(serviceCountdownIntervalId);
  }

  serviceCountdownIntervalId = setInterval(refreshServiceCountdowns, 1000);
}

// 2FA management
function openAdd2FAModal() {
  document.getElementById('add2FAModal').classList.add('active');
  document.getElementById('totpName').value = '';
  document.getElementById('totpSecret').value = '';
  document.getElementById('totpName').focus();
}

function closeAdd2FAModal() {
  document.getElementById('add2FAModal').classList.remove('active');
}

async function save2FA() {
  const name = document.getElementById('totpName').value.trim();
  let secret = document.getElementById('totpSecret').value.trim();
  
  if (!name || !secret) {
    alert('Please fill in all fields');
    return;
  }
  
  // Parse if it's an otpauth URI
  const parsed = TOTPGenerator.parseQRCode(secret);
  if (parsed) {
    secret = parsed.secret;
  }
  
  // Test if the secret works
  const test = await TOTPGenerator.generateTOTP(secret);
  if (!test) {
    alert('Invalid secret key. Please check and try again.');
    return;
  }
  
  const token = {
    id: Date.now().toString(),
    name,
    secret,
    createdAt: Date.now()
  };
  
  totpTokens.push(token);
  await saveTOTPs();
  renderTOTPs();
  closeAdd2FAModal();
}

async function delete2FA(id) {
  console.log('Deleting 2FA token:', id);
  if (!confirm('Are you sure you want to delete this 2FA token?')) return;
  
  totpTokens = totpTokens.filter(t => t.id !== id);
  await saveTOTPs();
  renderTOTPs();
  showNotification('2FA token deleted');
}

async function copyTOTP(code) {
  try {
    await navigator.clipboard.writeText(code);
    showNotification('Code copied to clipboard');
  } catch (error) {
    console.error('Copy failed:', error);
  }
}

function renderTOTPs() {
  const container = document.getElementById('totpList');
  
  if (totpTokens.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h3>No 2FA Tokens</h3>
        <p>Add your 2FA codes for easy access</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = totpTokens.map(token => `
    <div class="totp-card" data-token-id="${token.id}">
      <div class="totp-header">
        <div class="totp-info">
          <div class="totp-name">${escapeHtml(token.name)}</div>
        </div>
        <div class="totp-actions">
          <button class="icon-btn danger btn-delete-2fa" data-token-id="${token.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="totp-code-display">
        <div class="totp-code" data-code="">------</div>
        <div class="totp-timer">
          <div class="timer-circle">
            <svg class="timer-svg" width="36" height="36">
              <circle class="timer-bg" cx="18" cy="18" r="16"/>
              <circle class="timer-progress" cx="18" cy="18" r="16" 
                stroke-dasharray="100.53" stroke-dashoffset="0"/>
            </svg>
            <div class="timer-text">30</div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  // Attach event listeners for delete buttons
  container.querySelectorAll('.btn-delete-2fa').forEach(btn => {
    btn.addEventListener('click', () => delete2FA(btn.dataset.tokenId));
  });
  
  // Make code clickable
  container.querySelectorAll('.totp-code-display').forEach(display => {
    display.style.cursor = 'pointer';
    display.addEventListener('click', async (e) => {
      const codeEl = display.querySelector('.totp-code');
      const code = codeEl.textContent;
      if (code && code !== '------') {
        await copyTOTP(code);
      }
    });
  });
}

// Update TOTP codes
async function updateTOTPCodes() {
  const tokenResults = await Promise.all(
    totpTokens.map(async token => ({
      token,
      result: await TOTPGenerator.generateTOTP(token.secret)
    }))
  );

  tokenResults.forEach(({ token, result }) => {
    if (result) {
      const card = document.querySelector(`[data-token-id="${token.id}"]`);
      if (card) {
        const codeEl = card.querySelector('.totp-code');
        const timerText = card.querySelector('.timer-text');
        const timerProgress = card.querySelector('.timer-progress');
        
        if (codeEl) {
          codeEl.textContent = result.code;
        }
        
        if (timerText) {
          timerText.textContent = result.remainingSeconds;
        }
        
        if (timerProgress) {
          const circumference = 100.53;
          const offset = circumference * (1 - result.remainingSeconds / 30);
          timerProgress.style.strokeDashoffset = offset;
        }
      }
    }
  });
}

function startTOTPRefresh() {
  updateTOTPCodes();
  if (totpRefreshIntervalId) {
    clearInterval(totpRefreshIntervalId);
  }
  totpRefreshIntervalId = setInterval(updateTOTPCodes, 1000);
}

// QR Code handling
async function handleQRUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    // Check if jsQR is available
    if (typeof jsQR === 'undefined') {
      alert('QR code scanner library not loaded. Please check your internet connection or use manual entry.');
      e.target.value = '';
      return;
    }
    
    const imageData = await readImageFile(file);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code && code.data) {
      const parsed = TOTPGenerator.parseQRCode(code.data);
      if (parsed) {
        document.getElementById('totpSecret').value = code.data;
        if (parsed.issuer && !document.getElementById('totpName').value) {
          document.getElementById('totpName').value = parsed.issuer;
        }
        showNotification('QR code scanned successfully');
      } else {
        alert('Could not parse QR code data');
      }
    } else {
      alert('No QR code found in image');
    }
  } catch (error) {
    console.error('QR scan error:', error);
    alert('Error scanning QR code: ' + error.message);
  }
  
  e.target.value = '';
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Data management
async function exportData() {
  const plainData = {
    format: 'servicekeeper-backup',
    version: '1.1.0',
    exportDate: new Date().toISOString(),
    encrypted: false,
    services: normalizeServices(services),
    totpTokens: normalizeTotpTokens(totpTokens),
    settings: normalizeSettings(settings)
  };

  const passphrase = prompt('Optional: enter a passphrase to encrypt this backup. Leave empty for plain JSON backup.', '');
  if (passphrase === null) return;

  let exportPayload = plainData;
  if (passphrase.trim()) {
    try {
      exportPayload = await BackupCrypto.encryptBackup(plainData, passphrase);
    } catch (error) {
      console.error('Backup encryption error:', error);
      alert('Failed to encrypt backup: ' + error.message);
      return;
    }
  }

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `servicekeeper-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification(passphrase.trim() ? 'Encrypted backup exported successfully' : 'Data exported successfully');
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const rawData = JSON.parse(text);
    const data = await resolveImportedBackup(rawData);

    if (!data) {
      e.target.value = '';
      return;
    }

    const normalizedServices = normalizeServices(data.services);
    const normalizedTotpTokens = normalizeTotpTokens(data.totpTokens);
    const normalizedSettings = normalizeSettings(data.settings);
    
    if (!confirm('This will replace all current data. Continue?')) {
      e.target.value = '';
      return;
    }
    
    services = normalizedServices;
    totpTokens = normalizedTotpTokens;
    settings = { ...settings, ...normalizedSettings };
    applySettingsToUI();
    
    await saveServices();
    await saveTOTPs();
    await saveSettings();
    
    renderServices();
    renderTOTPs();
    updateActiveCount();
    
    showNotification('Data imported successfully');
  } catch (error) {
    console.error('Import error:', error);
    alert('Error importing data: ' + error.message);
  }
  
  e.target.value = '';
}

async function clearAllData() {
  if (!confirm('This will delete ALL data including services and 2FA tokens. This cannot be undone!')) return;
  if (!confirm('Are you absolutely sure? This action is permanent!')) return;
  
  services = [];
  totpTokens = [];
  totpVaultState.encrypted = false;
  totpVaultState.passphrase = null;
  
  await saveServices();
  await saveTOTPs();
  await chrome.storage.local.remove('totpVault');
  
  renderServices();
  renderTOTPs();
  updateActiveCount();
  updateTotpVaultButtons();
  
  showNotification('All data cleared');
}

async function unlockTotpVault(vaultPayload, suppressError = false) {
  const passphrase = prompt('Enter your 2FA vault passphrase:', '');
  if (passphrase === null) return null;

  try {
    const decrypted = await BackupCrypto.decryptBackup(vaultPayload, passphrase);
    totpVaultState.passphrase = passphrase;
    return decrypted;
  } catch (error) {
    if (!suppressError) {
      alert('Unable to unlock 2FA vault. Check your passphrase.');
    }
    return null;
  }
}

async function ensureTotpVaultPassphrase() {
  if (!totpVaultState.encrypted) return null;
  if (totpVaultState.passphrase) return totpVaultState.passphrase;

  const storedVault = await chrome.storage.local.get(['totpVault']);
  if (!storedVault.totpVault) return null;

  const decrypted = await unlockTotpVault(storedVault.totpVault, true);
  return decrypted ? totpVaultState.passphrase : null;
}

async function enableTotpVaultProtection() {
  if (totpVaultState.encrypted) {
    showNotification('2FA vault protection is already enabled');
    return;
  }

  const passphrase = prompt('Set a passphrase to encrypt your 2FA vault:', '');
  if (passphrase === null) return;
  if (!passphrase.trim()) {
    alert('Passphrase cannot be empty.');
    return;
  }

  const confirmPassphrase = prompt('Confirm your 2FA vault passphrase:', '');
  if (confirmPassphrase === null) return;
  if (passphrase !== confirmPassphrase) {
    alert('Passphrases do not match.');
    return;
  }

  totpVaultState.encrypted = true;
  totpVaultState.passphrase = passphrase;

  try {
    await saveTOTPs();
    updateTotpVaultButtons();
    showNotification('2FA vault passphrase enabled');
  } catch (error) {
    totpVaultState.encrypted = false;
    totpVaultState.passphrase = null;
    alert('Failed to enable 2FA vault protection: ' + error.message);
  }
}

async function disableTotpVaultProtection() {
  if (!totpVaultState.encrypted) {
    showNotification('2FA vault protection is already disabled');
    return;
  }

  const passphrase = await ensureTotpVaultPassphrase();
  if (!passphrase) {
    alert('Could not verify vault passphrase.');
    return;
  }

  if (!confirm('Disable 2FA vault passphrase protection?')) return;

  totpVaultState.encrypted = false;

  try {
    await saveTOTPs();
    totpVaultState.passphrase = null;
    updateTotpVaultButtons();
    showNotification('2FA vault passphrase disabled');
  } catch (error) {
    totpVaultState.encrypted = true;
    alert('Failed to disable 2FA vault protection: ' + error.message);
  }
}

function updateTotpVaultButtons() {
  const enableBtn = document.getElementById('enableTotpVaultBtn');
  const disableBtn = document.getElementById('disableTotpVaultBtn');

  if (!enableBtn || !disableBtn) return;

  enableBtn.disabled = totpVaultState.encrypted;
  disableBtn.disabled = !totpVaultState.encrypted;
}

async function resolveImportedBackup(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Backup file must contain a valid JSON object');
  }

  let data = rawData;

  if (rawData.encrypted) {
    const passphrase = prompt('This backup is encrypted. Enter passphrase to decrypt:', '');
    if (passphrase === null) return null;

    try {
      data = await BackupCrypto.decryptBackup(rawData, passphrase);
    } catch (error) {
      throw new Error('Could not decrypt backup. Check your passphrase.');
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Backup content is invalid');
  }

  const hasRecognizedPayload =
    Array.isArray(data.services) ||
    Array.isArray(data.totpTokens) ||
    (data.settings && typeof data.settings === 'object');

  if (!hasRecognizedPayload) {
    throw new Error('Backup file is missing expected ServiceKeeper data');
  }

  return data;
}

function normalizeServices(rawServices) {
  if (!Array.isArray(rawServices)) return [];

  return rawServices
    .map(normalizeService)
    .filter(service => service !== null);
}

function normalizeService(rawService) {
  if (!rawService || typeof rawService !== 'object') return null;

  const id = String(rawService.id || Date.now()).trim();
  const name = String(rawService.name || '').trim();
  const url = String(rawService.url || '').trim();
  const intervalHours = Number(rawService.intervalHours);

  if (!id || !name || !url || !Number.isFinite(intervalHours) || intervalHours <= 0) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  } catch (error) {
    return null;
  }

  const unit = ['hours', 'days', 'weeks'].includes(rawService.intervalUnit) ? rawService.intervalUnit : 'hours';
  const unitDivisor = unit === 'weeks' ? 24 * 7 : unit === 'days' ? 24 : 1;
  const computedIntervalValue = Math.max(1, Math.round(intervalHours / unitDivisor));
  const intervalValue = Number.isInteger(rawService.intervalValue) ? rawService.intervalValue : computedIntervalValue;

  const keepOpenSeconds = rawService.autoClose === false
    ? null
    : clampInteger(rawService.keepOpenSeconds, 5, 300, settings.defaultKeepOpen);

  return {
    id,
    name: name.slice(0, 120),
    url,
    intervalHours,
    intervalValue: clampInteger(intervalValue, 1, 9999, computedIntervalValue),
    intervalUnit: unit,
    autoClose: rawService.autoClose !== false,
    keepOpenSeconds,
    enabled: Boolean(rawService.enabled),
    notifications: rawService.notifications !== false,
    nextRun: sanitizeTimestamp(rawService.nextRun),
    lastVisit: sanitizeTimestamp(rawService.lastVisit),
    lastAttempt: sanitizeTimestamp(rawService.lastAttempt),
    lastError: rawService.lastError ? String(rawService.lastError).slice(0, 250) : null,
    visitCount: clampInteger(rawService.visitCount, 0, 1000000000, 0),
    createdAt: sanitizeTimestamp(rawService.createdAt) || Date.now()
  };
}

function isValidService(service) {
  return normalizeService(service) !== null;
}

function normalizeTotpTokens(rawTokens) {
  if (!Array.isArray(rawTokens)) return [];

  return rawTokens
    .map(normalizeTotpToken)
    .filter(token => token !== null);
}

function normalizeTotpToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'object') return null;

  const id = String(rawToken.id || Date.now()).trim();
  const name = String(rawToken.name || '').trim();
  const secret = String(rawToken.secret || '').replace(/\s/g, '').toUpperCase();

  if (!id || !name || !secret || !/^[A-Z2-7]+=*$/.test(secret)) {
    return null;
  }

  return {
    id,
    name: name.slice(0, 120),
    secret,
    createdAt: sanitizeTimestamp(rawToken.createdAt) || Date.now()
  };
}

function normalizeSettings(rawSettings) {
  const safeSettings = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};

  return {
    notificationsEnabled: safeSettings.notificationsEnabled !== false,
    autoCloseTab: safeSettings.autoCloseTab !== false,
    defaultKeepOpen: clampInteger(safeSettings.defaultKeepOpen, 5, 60, 10)
  };
}

function applySettingsToUI() {
  document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled;
  document.getElementById('autoCloseTab').checked = settings.autoCloseTab;
  document.getElementById('defaultKeepOpen').value = settings.defaultKeepOpen;
}

function sanitizeTimestamp(value) {
  const asNumber = Number(value);
  return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : null;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

// Utility functions
function updateActiveCount() {
  const activeCount = services.filter(s => s.enabled).length;
  document.getElementById('activeCount').textContent = `${activeCount} active`;
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
