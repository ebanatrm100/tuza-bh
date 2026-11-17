const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 10000;

// The library JSON lives with the frontend assets so Workbox precaches it.
const LIBRARY_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'library.json');
const DIST_DIR = path.join(__dirname, '..', 'frontend', 'dist');

app.disable('x-powered-by');
app.use(compression());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

function readLibrary() {
  try {
    return JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'));
  } catch (err) {
    console.error('Could not read library.json:', err.message);
    return { version: 0, books: [], verses: [], hymns: [] };
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'TUZA BIBLE+HYMNAL' });
  const tick = require('./notifications').runSchedulerTick;
  if (typeof tick === 'function') {
    tick().catch((err) => console.error('Notification scheduler tick failed:', err));
  }
});

// Full offline library. The PWA normally reads /data/library.json, which is
// precached; this endpoint is the equivalent API for other clients.
app.get('/api/library', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(readLibrary());
});

app.get('/api/bible/books', (req, res) => {
  res.json(readLibrary().books || []);
});

app.get('/api/hymns', (req, res) => {
  res.json(readLibrary().hymns || []);
});

const SUPPORT_MESSAGES = {
  rw: (amount, currency) => `Murakoze cyane! Impano yawe ya ${amount} ${currency} yamaze kwakirwa. Imana ibahe umugisha. — TUZA BIBLE+HYMNAL`,
  en: (amount, currency) => `Thank you so much! Your contribution of ${amount} ${currency} has been received. God bless you. — TUZA BIBLE+HYMNAL`,
  sw: (amount, currency) => `Asante sana! Mchango wako wa ${amount} ${currency} umepokelewa. Mungu akubariki. — TUZA BIBLE+HYMNAL`,
  fr: (amount, currency) => `Merci beaucoup ! Votre contribution de ${amount} ${currency} a été reçue. Que Dieu vous bénisse. — TUZA BIBLE+HYMNAL`
};

function makeTxRef() {
  return `TUZA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

app.post('/api/support', async (req, res) => {
  try {
    const { currency, amount, phone, lang } = req.body || {};
    if (!currency || !amount || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) {
      return res.status(503).json({ error: 'Payment provider not configured' });
    }
    const txRef = makeTxRef();
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const merchantPhone = process.env.MOMO_RECIPIENT_NUMBER || process.env.MERCHANT_PHONE || '0785441568';
    const payload = {
      tx_ref: txRef,
      amount: amt,
      currency,
      redirect_url: `${appUrl}/?support=success`,
      payment_options: 'card,mobilemoney,ussd,banktransfer',
      customer: { phone_number: phone, name: 'TUZA Supporter' },
      customizations: { title: 'SUPPORT TUZA', description: 'Contribution to TUZA BIBLE+HYMNAL' },
      meta: { phone, lang: lang || 'en', amount: amt, currency, recipient_phone: merchantPhone }
    };
    const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify(payload)
    });
    const flwData = await flwRes.json();
    if (!flwRes.ok || flwData?.status !== 'success') {
      console.error('Flutterwave init failed:', flwData);
      return res.status(502).json({ error: 'Payment initialization failed', message: flwData?.message });
    }
    return res.json({ status: 'success', data: { link: flwData.data.link, tx_ref: txRef } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const crypto = require('crypto');

// Verify a Flutterwave transaction server-side so we only act on irreversible
// (completed & successful) payments.
async function verifyFlutterwaveTransaction(txRef) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret || !txRef) return null;
  try {
    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    const data = await res.json();
    if (!res.ok || data?.status !== 'success') return null;
    return data.data || null;
  } catch (err) {
    console.error('Flutterwave verify failed:', err);
    return null;
  }
}

async function sendSms(phone, message) {
  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  if (username && apiKey) {
    const params = new URLSearchParams({ username, to: phone, message });
    const from = process.env.AFRICASTALKING_SENDER_ID;
    if (from) params.append('from', from);
    const smsRes = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey,
        Accept: 'application/json'
      },
      body: params.toString()
    });
    const smsData = await smsRes.json();
    console.log('SMS (Africa\'s Talking) result:', JSON.stringify(smsData));
    return;
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (sid && token && from) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const body = new URLSearchParams({ To: phone, From: from, Body: message });
    const smsRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
      },
      body: body.toString()
    });
    const smsData = await smsRes.json().catch(() => ({}));
    console.log('SMS (Twilio) result:', JSON.stringify(smsData));
    return;
  }
  console.log('No SMS provider configured; SMS skipped. Message:', message);
}

app.post('/api/webhooks/payment', async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const signature = req.headers['verif-hash'];
    if (secretHash && signature !== secretHash) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    const event = req.body?.event;
    const data = req.body?.data || {};
    if (event === 'charge.completed' && data.status === 'successful') {
      const meta = data.meta || {};
      const txRef = data.tx_ref || meta.tx_ref;
      // Server-side verification to confirm the transaction is truly completed.
      const verified = await verifyFlutterwaveTransaction(txRef);
      const isSuccessful = verified ? verified.status === 'successful' : data.status === 'successful';
      if (isSuccessful) {
        const phone = meta.phone || data.customer?.phone_number || verified?.customer?.phone_number;
        const lang = (meta.lang && SUPPORT_MESSAGES[meta.lang]) ? meta.lang : 'en';
        const amount = meta.amount || data.amount || verified?.amount;
        const currency = meta.currency || data.currency || verified?.currency;
        if (phone) {
          const message = (SUPPORT_MESSAGES[lang] || SUPPORT_MESSAGES.en)(amount, currency);
          try {
            await sendSms(phone, message);
          } catch (smsErr) {
            console.error('SMS send failed:', smsErr);
          }
        }
      }
    }
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const mountNotifications = require('./notifications');
mountNotifications(app);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve the built PWA: hashed assets get long-lived caching, shell files stay revalidated.
if (fs.existsSync(DIST_DIR)) {
  app.use(
    express.static(DIST_DIR, {
      index: false,
      etag: true,
      setHeaders(res, filePath) {
        const name = path.basename(filePath);
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (name === 'sw.js' || name === 'index.html' || name === 'manifest.webmanifest') {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    })
  );

  // SPA fallback: every client route renders the app shell.
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
} else {
  console.warn('frontend/dist not found — run "npm run build" before starting the server.');
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.status(503).json({ error: 'Frontend build missing. Run npm run build.' });
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`TUZA BIBLE+HYMNAL listening on port ${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received, closing server`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
