const MORNING_TITLE = 'TUZA BIBLE+HYMNAL';
const MORNING_BODY = 'NICE MORNING, YOU MAY START YOUR DAY WITH HOLYSPIRIT. HAVE A NICE DAY';
const EVENING_TITLE = 'TUZA BIBLE+HYMNAL';
const EVENING_BODY = 'HELLO, YOU CAN END YOUR DAY WELL WITH A VERSE. GOOD NIGHT';

function openSettingsDb() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('tuza-notifications', 1);
      request.onupgradeneeded = () => {
        try {
          request.result.createObjectStore('settings');
        } catch {
          // Store already exists.
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getSetting(key) {
  const db = await openSettingsDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setSetting(key, value) {
  const db = await openSettingsDb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function localParts(timezone) {
  const tz = timezone || 'Africa/Kigali';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type) => (parts.find((part) => part.type === type) || {}).value || '';
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    hhmm: `${get('hour')}:${get('minute')}`
  };
}

async function showDailyReminder(type) {
  const title = type === 'morning' ? MORNING_TITLE : EVENING_TITLE;
  const body = type === 'morning' ? MORNING_BODY : EVENING_BODY;
  await self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `tuza-${type}`,
    data: { url: '/bible' }
  });
}

async function checkDailyReminder() {
  const timezone = (await getSetting('timezone')) || 'Africa/Kigali';
  const { dateKey, hhmm } = localParts(timezone);

  if (hhmm === '06:40') {
    const last = await getSetting('lastMorningNotifDate');
    if (last !== dateKey) {
      await showDailyReminder('morning');
      await setSetting('lastMorningNotifDate', dateKey);
    }
  }

  if (hhmm === '21:50') {
    const last = await getSetting('lastEveningNotifDate');
    if (last !== dateKey) {
      await showDailyReminder('evening');
      await setSetting('lastEveningNotifDate', dateKey);
    }
  }
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: MORNING_TITLE, body: event.data ? event.data.text() : '' };
  }

  data.title = data.title || MORNING_TITLE;
  data.body = data.body || '';
  data.tag = data.tag || 'tuza-daily-reminder';

  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag,
    renotify: true,
    requireInteraction: true,
    data: { url: '/' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) {
          try {
            await client.navigate(targetUrl);
          } catch {
            // Navigation can fail in some browsers; the focused app is still usable.
          }
        }
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'tuza-daily-reminder') {
    event.waitUntil(checkDailyReminder());
  }
});