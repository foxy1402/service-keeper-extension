// ServiceKeeper Popup Script

let services = [];
let totpTokens = [];
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
  startTOTPRefresh();
});

// Load data from encrypted storage
async function loadData() {
  try {
    const servicesData = await SecureStorage.loadSecure('services');
    if (servicesData) {
      services = servicesData.services || [];
    }
    
    const totpData = await SecureStorage.loadSecure('totp');
    if (totpData) {
      totpTokens = totpData.tokens || [];
    }
    
    const settingsData = await chrome.storage.local.get(['settings']);
    if (settingsData.settings) {
      settings = { ...settings, ...settingsData.settings };
    }
    
    // Apply settings to UI
    document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled;
    document.getElementById('autoCloseTab').checked = settings.autoCloseTab;
    document.getElementById('defaultKeepOpen').value = settings.defaultKeepOpen;
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to encrypted storage
async function saveServices() {
  await SecureStorage.saveSecure('services', { services });
}

async function saveTOTPs() {
  await SecureStorage.saveSecure('totp', { tokens: totpTokens });
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
    const intervalValue = parseInt(document.getElementById('serviceInterval').value);
    const intervalUnit = document.getElementById('serviceIntervalUnit').value;
    const autoClose = document.getElementById('serviceAutoClose').checked;
    const keepOpenSeconds = autoClose ? parseInt(document.getElementById('serviceKeepOpen').value) : null;
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
      visitCount: 0,
      createdAt: Date.now()
    };
    
    console.log('Service object created:', service);
    services.push(service);
    await saveServices();
    
    if (enabled) {
      chrome.runtime.sendMessage({
        action: 'scheduleService',
        service: service
      });
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
  
  if (response.success) {
    showNotification('Test visit initiated');
    await loadData();
    renderServices();
  } else {
    showNotification('Test visit failed: ' + (response.error || 'Unknown error'));
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
    const lastVisit = service.lastVisit ? new Date(service.lastVisit).toLocaleString() : 'Never';
    
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
  for (const token of totpTokens) {
    const result = await TOTPGenerator.generateTOTP(token.secret);
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
  }
}

function startTOTPRefresh() {
  updateTOTPCodes();
  setInterval(updateTOTPCodes, 1000);
}

// QR Code handling
async function handleQRUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
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
    alert('Error scanning QR code');
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
  const data = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    services: services,
    totpTokens: totpTokens,
    settings: settings
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `servicekeeper-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Data exported successfully');
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!confirm('This will replace all current data. Continue?')) {
      e.target.value = '';
      return;
    }
    
    if (data.services) services = data.services;
    if (data.totpTokens) totpTokens = data.totpTokens;
    if (data.settings) settings = { ...settings, ...data.settings };
    
    await saveServices();
    await saveTOTPs();
    await saveSettings();
    
    renderServices();
    renderTOTPs();
    updateActiveCount();
    
    showNotification('Data imported successfully');
  } catch (error) {
    console.error('Import error:', error);
    alert('Error importing data. Please check the file format.');
  }
  
  e.target.value = '';
}

async function clearAllData() {
  if (!confirm('This will delete ALL data including services and 2FA tokens. This cannot be undone!')) return;
  if (!confirm('Are you absolutely sure? This action is permanent!')) return;
  
  services = [];
  totpTokens = [];
  
  await saveServices();
  await saveTOTPs();
  
  renderServices();
  renderTOTPs();
  updateActiveCount();
  
  showNotification('All data cleared');
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
