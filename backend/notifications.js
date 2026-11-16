const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const DATA_DIR = path.join(__dirname, 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const SEND_LOG_FILE = path.join(DATA_DIR, 'notification-sends.json');
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');

const MORNING = {
  key: 'morning',
  time: '06:40',
  title: 'TUZA BIBLE+HYMNAL',
  body: 'NICE MORNING, YOU MAY START YOUR DAY WITH HOLYSPIRIT. HAVE A NICE DAY'
};
const EVENING = {
  key: 'evening',
  time: '21:50',
  title: 'TUZA BIBLE+HYMNAL',
  body: 'HELLO, YOU CAN END YOUR DAY WELL WITH A VERSE. GOOD NIGHT'
};
const TARGETS = [MORNING, EVENING];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('Could not read', file, err.message);
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function getVapidKeys() {
  const envPublic = process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;
  if (envPublic && envPrivate) {
    return { publicKey: envPublic, privateKey: envPrivate };
  }

  ensureDataDir();
  const stored = readJson(VAPID_FILE, null);
  if (stored && stored.publicKey && stored.privateKey) {
    return stored;
  }

  const generated = webpush.generateVAPIDKeys();
  writeJson(VAPID_FILE, generated);
  console.log('Generated VAPID keys. Add these to Render Environment Variables:');
  console.log(`VAPID_PUBLIC_KEY=${generated.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${generated.privateKey}`);
  return generated;
}

const vapidKeys = getVapidKeys();
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:tuza@example.com';
webpush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey);

function loadSubscriptions() {
  const value = readJson(SUBSCRIPTIONS_FILE, []);
  return Array.isArray(value) ? value : [];
}

function saveSubscriptions(value) {
  writeJson(SUBSCRIPTIONS_FILE, value);
}

function loadSendLog() {
  const value = readJson(SEND_LOG_FILE, {});
  return value && typeof value === 'object' ? value : {};
}

function saveSendLog(value) {
  writeJson(SEND_LOG_FILE, value);
}

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function localParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  const dateKey = `${get('year')}-${get('month')}-${get('day')}`;
  const hhmm = `${get('hour')}:${get('minute')}`;
  return { dateKey, hhmm };
}

let schedulerStarted = false;

async function runSchedulerTick() {
  const subscriptions = loadSubscriptions();
  if (!subscriptions.length) return;

  const sendLog = loadSendLog();
  const nextSubscriptions = [];
  let changed = false;

  for (const record of subscriptions) {
    const subscription = record?.subscription;
    const endpoint = subscription?.endpoint;
    if (!endpoint) continue;

    const timezone = isValidTimezone(record?.timezone) ? record.timezone : 'Africa/Kigali';
    const { dateKey, hhmm } = localParts(new Date(), timezone);

    nextSubscriptions.push(record);

    for (const target of TARGETS) {
      if (hhmm !== target.time) continue;

      const endpointLog = sendLog[endpoint] || {};
      if (endpointLog[target.key] === dateKey) continue;

      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: target.title,
            body: target.body,
            url: '/bible',
            tag: `tuza-${target.key}`
          })
        );
        sendLog[endpoint] = { ...endpointLog, [target.key]: dateKey };
        saveSendLog(sendLog);
      } catch (err) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          const index = nextSubscriptions.indexOf(record);
          if (index !== -1) nextSubscriptions.splice(index, 1);
          delete sendLog[endpoint];
          saveSendLog(sendLog);
          changed = true;
          console.log('Removed expired push subscription:', endpoint);
          break;
        }
        console.error('Web Push send failed:', err?.statusCode || err?.message);
      }
    }
  }

  if (changed || nextSubscriptions.length !== subscriptions.length) {
    saveSubscriptions(nextSubscriptions);
  }
}

function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  runSchedulerTick().catch((err) => console.error('Notification scheduler tick failed:', err));
  setInterval(() => {
    runSchedulerTick().catch((err) => console.error('Notification scheduler tick failed:', err));
  }, 30000);
}

function mountNotifications(app) {
  app.get('/api/notifications/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/notifications/subscribe', (req, res) => {
    const { subscription, timezone } = req.body || {};
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const tz = isValidTimezone(timezone) ? timezone : 'Africa/Kigali';
    const subscriptions = loadSubscriptions().filter(
      (record) => record?.subscription?.endpoint !== subscription.endpoint
    );
    subscriptions.push({
      subscription,
      timezone: tz,
      updatedAt: new Date().toISOString()
    });
    saveSubscriptions(subscriptions);
    res.json({ ok: true });
  });

  startScheduler();
  return app;
}

module.exports = mountNotifications;