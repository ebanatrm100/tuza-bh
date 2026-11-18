import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BIBLE_DIR = join(ROOT, 'public', 'data', 'bibles');
const EN_PATH = join(BIBLE_DIR, 'en.json');

const DEUT_IDS = [70, 67, 68, 69, 71, 72, 73]; // Sirach first
const DEUT_SET = new Set(DEUT_IDS);

const NAMES = {
  rw: { 67:'Tobi', 68:'Yudita', 69:'Ubuhanga', 70:'Mwene Siraki', 71:'Baruki', 72:"Icya mbere cy'Abamakabe", 73:"Icya kabiri cy'Abamakabe" },
  sw: { 67:'Tobiti', 68:'Yudithi', 69:'Hekima', 70:'Yoshua Mwana wa Sira', 71:'Baruku', 72:'Wamakabayo 1', 73:'Wamakabayo 2' },
  fr: { 67:'Tobie', 68:'Judith', 69:'Sagesse', 70:'Siracide', 71:'Baruch', 72:'1 Maccabées', 73:'2 Maccabées' }
};
const EN_NAMES = { 67:'Tobit', 68:'Judith', 69:'Wisdom', 70:'Sirach', 71:'Baruch', 72:'1 Maccabees', 73:'2 Maccabees' };

const CONCURRENCY = 3;
const DELAY_MS = 150;
const MAX_RETRIES = 12;

// A single shared cooldown: when one request is rate limited, every worker
// waits before retrying so the whole batch backs off instead of hammering.
let cooldownUntil = 0;

function jitter(ms) {
  return ms + Math.floor(Math.random() * 250);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function readJson(p) { return JSON.parse(readFileSync(p, 'utf8')); }

function writeJson(p, data) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
}

const ENDPOINT = 'https://clients5.google.com/translate_a/t';
const MAX_URL = 3800;

// Translates a batch of strings in one request. Google's dictionary endpoint
// accepts repeated `q` parameters and answers with an array in the same order,
// which keeps the batch small enough to finish quickly without rate limiting.
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
      const out = rows.map((row) => (typeof row === 'string' ? row : '').trim());
      if (out.some((t) => !t)) throw new Error('empty translation in batch');
      return out;
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
  let current = [];
  let size = 0;
  for (const v of verses) {
    const len = encodeURIComponent(v.text).length + 3;
    if (current.length && size + len > MAX_URL) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(v);
    size += len;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function translateChapter(verses, tl) {
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
  return verses.map((v) => ({ verse: v.verse, text: translated.get(v.verse) }));
}

function chapterComplete(existingBook, chapter, enVerses) {
  const ch = existingBook?.chapters_data?.find((c) => c.chapter === chapter);
  if (!ch || ch.verses.length !== enVerses.length) return false;
  return ch.verses.every((v, i) => v.verse === enVerses[i].verse && v.text && v.text.trim());
}

async function processLang(lang) {
  const tl = lang;
  const outPath = join(BIBLE_DIR, `${lang}.json`);
  const existing = readJson(outPath);
  const enBundle = readJson(EN_PATH);

  const enBooksById = new Map(enBundle.books.map((b) => [b.id, b]));
  const nonDeut = (existing.books || []).filter((b) => !DEUT_SET.has(b.id));

  // working map of deuterocanonical books
  const working = new Map();
  for (const b of (existing.books || []).filter((x) => DEUT_SET.has(x.id))) {
    working.set(b.id, JSON.parse(JSON.stringify(b)));
  }

  for (const bookId of DEUT_IDS) {
    if (args.book && Number(args.book) !== bookId) continue;
    const enBook = enBooksById.get(bookId);
    if (!enBook) { console.warn(`No English book ${bookId}`); continue; }
    if (!working.has(bookId)) {
      working.set(bookId, {
        id: bookId,
        name: NAMES[lang][bookId],
        englishName: EN_NAMES[bookId],
        abbreviation: '',
        testament: 'old',
        chapters: 0,
        chapters_data: []
      });
    }
    const book = working.get(bookId);
    book.name = NAMES[lang][bookId];
    book.englishName = EN_NAMES[bookId];

    const enChapters = [...(enBook.chapters_data || [])].sort((a, b) => a.chapter - b.chapter);
    for (const enCh of enChapters) {
      const enVerses = [...(enCh.verses || [])].sort((a, b) => a.verse - b.verse);
      if (enVerses.length === 0) continue;
      if (chapterComplete(book, enCh.chapter, enVerses)) {
        console.log(`[${lang}] ${EN_NAMES[bookId]} ${enCh.chapter}: already complete, skip`);
        continue;
      }
      console.log(`[${lang}] Translating ${EN_NAMES[bookId]} chapter ${enCh.chapter} (${enVerses.length} verses)...`);
      const translated = await translateChapter(enVerses, tl);
      // replace chapter in book
      const idx = book.chapters_data.findIndex((c) => c.chapter === enCh.chapter);
      const chObj = { chapter: enCh.chapter, verses: translated };
      if (idx >= 0) book.chapters_data[idx] = chObj; else book.chapters_data.push(chObj);
      book.chapters_data.sort((a, b) => a.chapter - b.chapter);
      book.chapters = book.chapters_data.length;

      // save progress
      const mergedBooks = [...nonDeut, ...[...working.values()]].sort((a, b) => a.id - b.id);
      const baseSource = String(existing.source || lang).replace(/( \+ translated from en)+$/, '');
      const out = {
        ...existing,
        source: `${baseSource} + translated from en`,
        bookCount: mergedBooks.length,
        books: mergedBooks
      };
      writeJson(outPath, out);
      // keep existing reference updated
      existing.books = mergedBooks;
    }
    console.log(`[${lang}] Finished ${EN_NAMES[bookId]}`);
  }

  // bump version
  const finalBundle = readJson(outPath);
  finalBundle.version = (Number(finalBundle.version) || 1) + 1;
  writeJson(outPath, finalBundle);
  console.log(`[${lang}] Version bumped to ${finalBundle.version}`);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const langs = args.lang ? [args.lang] : args.all ? ['rw', 'sw', 'fr'] : [];
if (langs.length === 0) {
  console.error('Usage: node translate-deuterocanonical.mjs --lang=rw|sw|fr | --all');
  process.exit(1);
}

for (const lang of langs) {
  if (!['rw', 'sw', 'fr'].includes(lang)) {
    console.error(`Unsupported lang: ${lang}`);
    process.exit(1);
  }
  await processLang(lang);
}
console.log('Done.');
