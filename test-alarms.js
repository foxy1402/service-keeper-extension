// Quick test script - paste this into the background service worker console
// Go to chrome://extensions/ -> ServiceKeeper -> "service worker" link

async function testAlarms() {
  console.log('=== ALARM TEST ===');
  
  // Get all alarms
  const alarms = await chrome.alarms.getAll();
  console.log(`Total alarms: ${alarms.length}`);
  
  alarms.forEach(alarm => {
    const scheduledTime = new Date(alarm.scheduledTime);
    const now = Date.now();
    const minutesUntil = Math.round((alarm.scheduledTime - now) / 60000);
    
    console.log(`
Alarm: ${alarm.name}
  Scheduled: ${scheduledTime.toLocaleString()}
  In ${minutesUntil} minutes
  Period: ${alarm.periodInMinutes} minutes
    `);
  });
  
  // Get services
  const data = await SecureStorage.loadSecure('services');
  if (data && data.services) {
    console.log(`\nTotal services: ${data.services.length}`);
    data.services.forEach(service => {
      console.log(`
Service: ${service.name}
  Enabled: ${service.enabled}
  Interval: ${service.intervalHours}h
  Next run: ${service.nextRun ? new Date(service.nextRun).toLocaleString() : 'Not set'}
  Visit count: ${service.visitCount || 0}
      `);
    });
  }
}

testAlarms();
