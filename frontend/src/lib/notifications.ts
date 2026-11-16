const LAST_MORNING_KEY = 'lastMorningNotifDate';
const LAST_EVENING_KEY = 'lastEveningNotifDate';
const NOTIF_DB_NAME = 'tuza-notifications';
const NOTIF_DB_VERSION = 1;

const MORNING_TITLE = 'TUZA BIBLE+HYMNAL';
const MORNING_BODY = 'NICE MORNING, YOU MAY START YOUR DAY WITH HOLYSPIRIT. HAVE A NICE DAY';
const EVENING_TITLE = 'TUZA BIBLE+HYMNAL';
const EVENING_BODY = 'HELLO, YOU CAN END YOUR DAY WELL WITH A VERSE. GOOD NIGHT';

let fallbackTimer: number | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function openSettingsDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(NOTIF_DB_NAME, NOTIF_DB_VERSION);
    request.onupgradeneeded = () => {
      try {
        request.result.createObjectStore('settings');
      } catch {
        // Store already exists.
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = await openSettingsDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
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

async function getVapidPublicKey(): Promise<string> {
  const response = await fetch('/api/notifications/vapid-public-key');
  const data = await response.json();
  return data.publicKey as string;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const publicKey = await getVapidPublicKey();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource
    });

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Kigali';
    await setSetting('timezone', timezone);

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        timezone,
        updatedAt: new Date().toISOString()
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return false;
  }
}

export async function requestDailyNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') return false;

  const subscribed = await subscribeToPush();
  await setupLocalFallback();
  return subscribed;
}

export async function setupLocalFallback(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    if ('periodicSync' in registration) {
      try {
        await (registration as any).periodicSync.register('tuza-daily-reminder', {
          minInterval: 12 * 60 * 60 * 1000
        });
      } catch {
        // Periodic Background Sync is optional and may be unavailable.
      }
    }
  } catch {
    // Ignore service worker readiness errors.
  }

  startForegroundFallbackTimer();
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

async function showLocalNotification(type: 'morning' | 'evening'): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const title = type === 'morning' ? MORNING_TITLE : EVENING_TITLE;
    const body = type === 'morning' ? MORNING_BODY : EVENING_BODY;
    await registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `tuza-${type}`,
      data: { url: '/bible' }
    });
  } catch (error) {
    console.error('Local notification failed:', error);
  }
}

function checkForegroundReminder(): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const time = localTime(now);
  const dateKey = localDateKey(now);

  if (time === '06:40' && localStorage.getItem(LAST_MORNING_KEY) !== dateKey) {
    localStorage.setItem(LAST_MORNING_KEY, dateKey);
    void showLocalNotification('morning');
  }

  if (time === '21:50' && localStorage.getItem(LAST_EVENING_KEY) !== dateKey) {
    localStorage.setItem(LAST_EVENING_KEY, dateKey);
    void showLocalNotification('evening');
  }
}

function startForegroundFallbackTimer(): void {
  if (fallbackTimer !== null) return;
  fallbackTimer = window.setInterval(checkForegroundReminder, 60 * 1000);
  checkForegroundReminder();
}

export async function initDailyNotifications(): Promise<void> {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    await subscribeToPush();
  }

  await setupLocalFallback();
}