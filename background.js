// ServiceKeeper Background Service Worker
importScripts('crypto.js');

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('ServiceKeeper installed');
  await initializeSchedules();
});

// Initialize all schedules
async function initializeSchedules() {
  const data = await SecureStorage.loadSecure('services');
  if (!data || !data.services) return;
  
  for (const service of data.services) {
    if (isSchedulableService(service) && service.enabled) {
      await scheduleService(service);
    }
  }
}

// Schedule a service visit
async function scheduleService(service) {
  if (!isSchedulableService(service)) {
    console.warn('[Schedule] Skipping invalid service payload:', service);
    return;
  }

  const alarmName = `service_${service.id}`;
  
  console.log(`[Schedule] Scheduling ${service.name} (ID: ${service.id})`);
  
  // Clear existing alarm
  await chrome.alarms.clear(alarmName);
  
  // Calculate next run time
  const now = Date.now();
  let nextRun = service.nextRun || now;
  
  // If we missed the scheduled time, calculate catch-up
  if (nextRun < now) {
    nextRun = calculateCatchUpTime(service, now);
    
    // Update the service with new next run time
    await updateServiceNextRun(service.id, nextRun);
  }
  
  // Ensure minimum 1 minute delay for Chrome alarms
  const minimumDelay = now + 60000; // 1 minute from now
  if (nextRun < minimumDelay) {
    console.log(`[Schedule] Adjusting next run to meet 1-minute minimum`);
    nextRun = minimumDelay;
    await updateServiceNextRun(service.id, nextRun);
  }
  
  // Create alarm
  const delayInMinutes = Math.max(1, (nextRun - now) / 60000);
  await chrome.alarms.create(alarmName, {
    when: nextRun,
    periodInMinutes: service.intervalHours * 60
  });
  
  console.log(`[Schedule] ✓ ${service.name} scheduled for ${new Date(nextRun).toLocaleString()} (in ${Math.round(delayInMinutes)} minutes)`);
  console.log(`[Schedule] Will repeat every ${service.intervalHours} hours`);
}

// Calculate catch-up time for missed schedules
function calculateCatchUpTime(service, now) {
  const intervalMs = service.intervalHours * 60 * 60 * 1000;
  const missedTime = now - service.nextRun;
  
  // If we missed it by less than the interval, run ASAP
  if (missedTime < intervalMs) {
    return now + 60000; // Run in 1 minute
  }
  
  // If we missed multiple intervals, schedule for next interval from now
  const missedIntervals = Math.floor(missedTime / intervalMs);
  return service.nextRun + (missedIntervals + 1) * intervalMs;
}

// Update service next run time
async function updateServiceNextRun(serviceId, nextRun) {
  const data = await SecureStorage.loadSecure('services');
  if (!data || !data.services) return;
  
  const service = data.services.find(s => s.id === serviceId);
  if (service) {
    service.nextRun = nextRun;
    service.lastAttempt = Date.now();
    await SecureStorage.saveSecure('services', data);
  }
}

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[Alarm] Triggered:', alarm.name);
  
  // Handle tab close alarms
  if (alarm.name.startsWith('close_tab_')) {
    const stored = await chrome.storage.local.get([alarm.name]);
    const tabId = stored[alarm.name];
    if (tabId) {
      try {
        await chrome.tabs.remove(tabId);
        console.log(`[Visit] Tab ${tabId} closed by alarm`);
      } catch (error) {
        console.log(`[Visit] Tab ${tabId} already closed`);
      }
      await chrome.storage.local.remove(alarm.name);
    }
    return;
  }
  
  // Handle service visit alarms
  if (!alarm.name.startsWith('service_')) return;
  
  const serviceId = alarm.name.replace('service_', '');
  await visitService(serviceId);
});

// Visit a service
async function visitService(serviceId) {
  try {
    console.log('[Visit] Starting visit for service ID:', serviceId);
    const data = await SecureStorage.loadSecure('services');
    if (!data || !data.services) {
      console.log('[Visit] No services data found');
      return;
    }
    
    const service = data.services.find(s => s.id === serviceId);
    if (!service || !service.enabled || !isSchedulableService(service)) {
      console.log('[Visit] Service not found or disabled:', serviceId);
      return;
    }
    
    console.log(`[Visit] Opening ${service.name}: ${service.url}`);
    
    // Validate URL before opening
    try {
      new URL(service.url);
    } catch (urlError) {
      console.error(`[Visit] Invalid URL for service ${service.name}:`, urlError);
      service.lastAttempt = Date.now();
      service.lastError = 'Invalid URL';
      await SecureStorage.saveSecure('services', data);
      return;
    }
    
    // Open the URL in a new tab
    let tab;
    try {
      tab = await chrome.tabs.create({
        url: service.url,
        active: false // Don't switch to the tab
      });
    } catch (tabError) {
      console.error(`[Visit] Failed to create tab:`, tabError);
      service.lastAttempt = Date.now();
      service.lastError = tabError.message;
      await SecureStorage.saveSecure('services', data);
      return;
    }
    
    console.log(`[Visit] Tab created: ${tab.id}`);
    
    // Update last visit time
    service.lastVisit = Date.now();
    service.lastAttempt = Date.now();
    service.lastError = null;
    service.visitCount = (service.visitCount || 0) + 1;
    
    // Calculate next run time
    const intervalMs = service.intervalHours * 60 * 60 * 1000;
    service.nextRun = Date.now() + intervalMs;
    
    await SecureStorage.saveSecure('services', data);
    console.log(`[Visit] Service updated. Visit count: ${service.visitCount}, Next run: ${new Date(service.nextRun).toLocaleString()}`);
    
    // Close the tab after a delay - use alarm for reliability
    if (service.autoClose !== false) {
      const keepOpenMs = (service.keepOpenSeconds || 10) * 1000;
      console.log(`[Visit] Will auto-close tab in ${service.keepOpenSeconds || 10} seconds`);
      
      const closeAlarmName = `close_tab_${tab.id}`;
      await chrome.alarms.create(closeAlarmName, {
        when: Date.now() + keepOpenMs
      });
      
      // Store tab ID for later
      await chrome.storage.local.set({ [closeAlarmName]: tab.id });
    } else {
      console.log('[Visit] Auto-close disabled, tab will stay open');
    }
    
    // Show notification
    if (service.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'ServiceKeeper',
        message: `Visited ${service.name}`,
        priority: 0
      });
    }
    
  } catch (error) {
    console.error(`[Visit] Error visiting service ${serviceId}:`, error);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Message] Received:', request.action);

  if (request.action === 'scheduleService') {
    if (!isSchedulableService(request.service)) {
      sendResponse({ success: false, error: 'Invalid service payload' });
      return false;
    }

    scheduleService(request.service).then(() => {
      console.log('[Message] Schedule completed successfully');
      sendResponse({ success: true });
    }).catch(error => {
      console.error('[Message] Schedule failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'unscheduleService') {
    const alarmName = `service_${request.serviceId}`;
    console.log('[Message] Unscheduling alarm:', alarmName);
    chrome.alarms.clear(alarmName).then(() => {
      console.log('[Message] Alarm cleared');
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'testVisit') {
    console.log('[Message] Test visit requested for:', request.serviceId);
    visitService(request.serviceId).then(() => {
      console.log('[Message] Test visit completed');
      sendResponse({ success: true });
    }).catch(error => {
      console.error('[Message] Test visit failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'generate2FA') {
    TOTPGenerator.generateTOTP(request.secret).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    return true;
  }
});

function isSchedulableService(service) {
  if (!service || typeof service !== 'object') return false;
  if (!service.id || typeof service.id !== 'string') return false;
  if (typeof service.url !== 'string') return false;
  if (!Number.isFinite(service.intervalHours) || service.intervalHours <= 0) return false;

  try {
    const parsed = new URL(service.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  } catch (error) {
    return false;
  }

  return true;
}

// Check for missed schedules on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('ServiceKeeper started - checking for missed schedules');
  await initializeSchedules();
});
