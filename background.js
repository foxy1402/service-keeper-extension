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
    if (service.enabled) {
      await scheduleService(service);
    }
  }
}

// Schedule a service visit
async function scheduleService(service) {
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
    if (!service || !service.enabled) {
      console.log('[Visit] Service not found or disabled:', serviceId);
      return;
    }
    
    console.log(`[Visit] Opening ${service.name}: ${service.url}`);
    
    // Open the URL in a new tab
    const tab = await chrome.tabs.create({
      url: service.url,
      active: false // Don't switch to the tab
    });
    
    console.log(`[Visit] Tab created: ${tab.id}`);
    
    // Update last visit time
    service.lastVisit = Date.now();
    service.visitCount = (service.visitCount || 0) + 1;
    
    // Calculate next run time
    const intervalMs = service.intervalHours * 60 * 60 * 1000;
    service.nextRun = Date.now() + intervalMs;
    
    await SecureStorage.saveSecure('services', data);
    console.log(`[Visit] Service updated. Visit count: ${service.visitCount}, Next run: ${new Date(service.nextRun).toLocaleString()}`);
    
    // Close the tab after a delay (give it time to load) - only if autoClose is enabled
    if (service.autoClose !== false) {
      const keepOpenMs = (service.keepOpenSeconds || 10) * 1000;
      console.log(`[Visit] Will auto-close tab in ${service.keepOpenSeconds || 10} seconds`);
      setTimeout(async () => {
        try {
          await chrome.tabs.remove(tab.id);
          console.log(`[Visit] Tab ${tab.id} closed`);
        } catch (error) {
          console.log(`[Visit] Tab ${tab.id} already closed`);
        }
      }, keepOpenMs);
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

// Check for missed schedules on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('ServiceKeeper started - checking for missed schedules');
  await initializeSchedules();
});
