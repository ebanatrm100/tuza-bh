import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BIBLE_DIR = join(ROOT, 'public', 'data', 'bibles');
const EN_PATH = join(BIBLE_DIR, 'en.json');
const RW_PATH = join(BIBLE_DIR, 'rw.json');

const BOOK_ID = 70; // Sirach / Mwene Siraki
const BOOK_NAME_RW = 'Mwene Siraki';
const BOOK_NAME_EN = 'Sirach';

const CONCURRENCY = 3;
const DELAY_MS = 200;
const MAX_RETRIES = 12;
const MAX_URL = 3800;

let cooldownUntil = 0;
function jitter(ms) { return ms + Math.floor(Math.random() * 250); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function readJson(p) { return JSON.parse(readFileSync(p, 'utf8')); }
function writeJson(p, data) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(data)); }

// Free Google Translate endpoint (clients5.google.com, part of googleapis.com infra).
const ENDPOINT = 'https://clients5.google.com/translate_a/t';

function isPunctOnly(s) { return /^[^A-Za-zÀ-ÿ0-9]+$/.test(String(s).trim()); }
function isValidTranslation(src, tr) {
  const t = String(tr || '').trim();
  if (!t) return false;
  if (t === String(src).trim()) return isPunctOnly(src);
  return true;
}

async function translateBatch(texts, tl) {
  const params = texts.map((t) => `q=${encodeURIComponent(t)}`).join('&');
  const url = `${ENDPOINT}?client=dict-chrome-ex&sl=en&tl=${tl}&${params}`;
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length !== texts.length) throw new Error(`expected ${texts.length} rows, got ${rows.length}`);
      return rows.map((row) => (typeof row === 'string' ? row : '').trim());
    } catch (e) {
      attempt++;
      if (attempt > MAX_RETRIES) throw e;
      const wait = Math.min(60000, 1000 * 2 ** attempt);
      cooldownUntil = Math.max(cooldownUntil, Date.now() + wait);
      console.warn(`retry ${attempt}/${MAX_RETRIES} (${e.message}), waiting ${Math.round(wait / 1000)}s`);
      await sleep(jitter(wait));
    }
  }
}

function chunkVerses(verses) {
  const chunks = [];
  let current = [], size = 0;
  for (const v of verses) {
    const len = encodeURIComponent(v.text).length + 3;
    if (current.length && size + len > MAX_URL) { chunks.push(current); current = []; size = 0; }
    current.push(v); size += len;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function translateOne(text, tl) {
  const out = await translateBatch([text], tl);
  return out[0];
}

// Translate a chapter, retrying individual verses that fail the strict check.
async function translateChapter(verses, tl, existingMap) {
  const chunks = chunkVerses(verses);
  const translated = new Map();
  let cursor = 0;
  async function worker() {
    while (cursor < chunks.length) {
      const chunk = chunks[cursor++];
      const gate = cooldownUntil - Date.now();
      if (gate > 0) await sleep(jitter(gate));
      const out = await translateBatch(chunk.map((v) => v.text), tl);
      chunk.forEach((v, i) => translated.set(v.verse, out[i]));
      await sleep(DELAY_MS);
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, () => worker());
  await Promise.all(workers);

  // strict per-verse verification + individual retries
  for (const v of verses) {
    let tr = translated.get(v.verse);
    if (!isValidTranslation(v.text, tr)) {
      let ok = false;
      for (let r = 0; r < 5; r++) {
        try {
          const gate = cooldownUntil - Date.now();
          if (gate > 0) await sleep(jitter(gate));
          tr = await translateOne(v.text, tl);
          if (isValidTranslation(v.text, tr)) { ok = true; break; }
        } catch (e) { console.warn(`verse ${v.verse} retry failed: ${e.message}`); }
        await sleep(jitter(500));
      }
      if (!ok) {
        // fall back to existing rw translation if it is valid, else punctuation
        const ex = existingMap.get(v.verse);
        if (ex && isValidTranslation(v.text, ex)) tr = ex;
        else if (isPunctOnly(v.text)) tr = v.text.trim();
        else tr = ''; // will be dropped below
      }
      translated.set(v.verse, tr);
    }
    if (!translated.get(v.verse)) {
      // never save empty; keep existing valid or punctuation
      const ex = existingMap.get(v.verse);
      if (ex && isValidTranslation(v.text, ex)) translated.set(v.verse, ex);
      else if (isPunctOnly(v.text)) translated.set(v.verse, v.text.trim());
    }
  }

  return verses
    .map((v) => ({ verse: v.verse, text: translated.get(v.verse) }))
    .filter((v) => v.text && v.text.trim());
}

function chapterComplete(existingBook, chapter, enVerses, existingMap) {
  const ch = existingBook?.chapters_data?.find((c) => c.chapter === chapter);
  if (!ch || ch.verses.length !== enVerses.length) return false;
  return ch.verses.every((v, i) => {
    if (v.verse !== enVerses[i].verse) return false;
    if (!v.text || !v.text.trim()) return false;
    // reject verses that are still identical to English prose
    if (v.text.trim() === String(enVerses[i].text).trim() && !isPunctOnly(enVerses[i].text)) return false;
    return true;
  });
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
  );
  const lang = args.lang || 'rw';
  if (lang !== 'rw') {
    console.error('This script targets Kinyarwanda (rw) only.');
    process.exit(1);
  }

  const enBundle = readJson(EN_PATH);
  const enBook = enBundle.books.find((b) => b.id === BOOK_ID);
  if (!enBook) { console.error('Sirach not found in en.json'); process.exit(1); }

  const rwBundle = readJson(RW_PATH);
  let book = rwBundle.books.find((b) => b.id === BOOK_ID);
  if (!book) {
    book = { id: BOOK_ID, name: BOOK_NAME_RW, englishName: BOOK_NAME_EN, abbreviation: '', testament: 'old', chapters: 0, chapters_data: [] };
    rwBundle.books.push(book);
  }
  book.name = BOOK_NAME_RW;
  book.englishName = BOOK_NAME_EN;

  const enChapters = [...(enBook.chapters_data || [])].sort((a, b) => a.chapter - b.chapter);

  for (const enCh of enChapters) {
    const enVerses = [...(enCh.verses || [])].sort((a, b) => a.verse - b.verse);
    if (enVerses.length === 0) continue;

    const existingMap = new Map((book.chapters_data.find((c) => c.chapter === enCh.chapter)?.verses || []).map((v) => [v.verse, v.text]));

    if (chapterComplete(book, enCh.chapter, enVerses, existingMap)) {
      console.log(`[rw] ${BOOK_NAME_EN} ${enCh.chapter}: already complete, skip`);
      continue;
    }
    console.log(`[rw] Translating ${BOOK_NAME_EN} chapter ${enCh.chapter} (${enVerses.length} verses)...`);
    const translated = await translateChapter(enVerses, 'rw', existingMap);

    const idx = book.chapters_data.findIndex((c) => c.chapter === enCh.chapter);
    const chObj = { chapter: enCh.chapter, verses: translated };
    if (idx >= 0) book.chapters_data[idx] = chObj; else book.chapters_data.push(chObj);
    book.chapters_data.sort((a, b) => a.chapter - b.chapter);
    book.chapters = book.chapters_data.length;

    // save progress after every chapter
    const bi = rwBundle.books.findIndex((b) => b.id === BOOK_ID);
    if (bi >= 0) rwBundle.books[bi] = book; else rwBundle.books.push(book);
    rwBundle.bookCount = rwBundle.books.length;
    writeJson(RW_PATH, rwBundle);
    console.log(`[rw] Saved ${BOOK_NAME_EN} chapter ${enCh.chapter} (${translated.length} verses)`);
  }

  // verify no English-prose verse remains
  let bad = 0;
  const enVersesAll = enChapters.flatMap((c) => c.verses);
  const rwBook = rwBundle.books.find((b) => b.id === BOOK_ID);
  for (const c of enChapters) {
    const oc = rwBook.chapters_data.find((x) => x.chapter === c.chapter);
    const es = new Map(c.verses.map((v) => [v.verse, v.text]));
    for (const v of (oc?.verses || [])) {
      const src = es.get(v.verse);
      if (src && v.text.trim() === String(src).trim() && !isPunctOnly(src)) bad++;
    }
  }
  console.log(`[rw] Verses still identical to English prose: ${bad}`);

  // bump version
  const finalBundle = readJson(RW_PATH);
  finalBundle.version = (Number(finalBundle.version) || 1) + 1;
  writeJson(RW_PATH, finalBundle);
  console.log(`[rw] Version bumped to ${finalBundle.version}`);

  const c10 = finalBundle.books.find((b) => b.id === BOOK_ID).chapters_data.find((c) => c.chapter === 10);
  console.log('Mwene Siraki 10:1 =>', c10?.verses.find((v) => v.verse === 1)?.text);
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
