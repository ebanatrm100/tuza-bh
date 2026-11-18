import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data', 'bibles');
const DEUT_IDS = new Set([67, 68, 69, 70, 71, 72, 73]);

const CANONICAL_NAMES = {
  rw: {
    67: 'Tobi', 68: 'Yudita', 69: 'Ubuhanga', 70: 'Mwene Siraki',
    71: 'Baruki', 72: "Icya mbere cy'Abamakabe", 73: "Icya kabiri cy'Abamakabe"
  },
  sw: {
    67: 'Tobiti', 68: 'Yudithi', 69: 'Hekima', 70: 'Yoshua Mwana wa Sira',
    71: 'Baruku', 72: 'Wamakabayo 1', 73: 'Wamakabayo 2'
  },
  en: {
    67: 'Tobit', 68: 'Judith', 69: 'Wisdom', 70: 'Sirach',
    71: 'Baruch', 72: '1 Maccabees', 73: '2 Maccabees'
  },
  fr: {
    67: 'Tobie', 68: 'Judith', 69: 'Sagesse', 70: 'Siracide',
    71: 'Baruch', 72: '1 Maccabées', 73: '2 Maccabées'
  }
};

const ENGLISH_NAMES = {
  67: 'Tobit', 68: 'Judith', 69: 'Wisdom', 70: 'Sirach',
  71: 'Baruch', 72: '1 Maccabees', 73: '2 Maccabees'
};

const ALIASES = {
  rw: {
    tobi: 67, tobit: 67, tobias: 67,
    yudita: 68, judith: 68,
    ubuhanga: 69, wisdom: 69, sagesse: 69,
    'mwene siraki': 70, 'mwene sirak': 70, sirach: 70, siracide: 70, ecclesiasticus: 70, sira: 70,
    baruki: 71, baruch: 71,
    "icya mbere cy'abamakabe": 72, '1 maccabees': 72, '1 maccabee': 72, '1 mac': 72, '1 abamakabe': 72,
    "icya kabiri cy'abamakabe": 73, '2 maccabees': 73, '2 maccabee': 73, '2 mac': 73, '2 abamakabe': 73
  },
  sw: {
    tobiti: 67, tobit: 67,
    yudithi: 68, judith: 68,
    hekima: 69, wisdom: 69, sagesse: 69,
    'yoshua mwana wa sira': 70, 'mwana wa sira': 70, sira: 70, sirach: 70, siracide: 70, ecclesiasticus: 70,
    baruku: 71, baruch: 71,
    'wamakabayo 1': 72, '1 wamakabayo': 72, '1 maccabees': 72, '1 maccabee': 72, '1 mac': 72,
    'wamakabayo 2': 73, '2 wamakabayo': 73, '2 maccabees': 73, '2 maccabee': 73, '2 mac': 73
  }
};

function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[.,;:!?]+$/g, '');
}

function resolveBookId(lang, name) {
  const key = normalizeName(name);
  if (ALIASES[lang]?.[key] != null) return ALIASES[lang][key];
  // try without leading article/number spacing variants
  const compact = key.replace(/\s+/g, '');
  for (const [alias, id] of Object.entries(ALIASES[lang] || {})) {
    if (alias.replace(/\s+/g, '') === compact) return id;
  }
  return null;
}

function normalizeVerseRows(rows) {
  // rows: [{book/bookId/name, chapter, verse/number, text}]
  const byBook = new Map();
  for (const r of rows) {
    const bookName = r.book ?? r.bookName ?? r.name ?? r.title;
    let id = Number(r.bookId ?? r.book_id ?? r.id);
    if (!DEUT_IDS.has(id)) {
      const resolved = resolveBookId(r.lang || null, bookName);
      if (resolved) id = resolved;
    }
    if (!DEUT_IDS.has(id)) continue;
    const chapter = Number(r.chapter);
    const verse = Number(r.verse ?? r.number ?? r.v);
    const text = String(r.text ?? r.content ?? '').trim();
    if (!Number.isFinite(chapter) || !Number.isFinite(verse) || !text) continue;
    if (!byBook.has(id)) byBook.set(id, new Map());
    const chMap = byBook.get(id);
    if (!chMap.has(chapter)) chMap.set(chapter, new Map());
    chMap.get(chapter).set(verse, text);
  }
  return byBook;
}

function normalizeBook(lang, book) {
  let id = Number(book.id ?? book.bookId ?? book.book_id);
  if (!DEUT_IDS.has(id)) {
    const resolved = resolveBookId(lang, book.name ?? book.englishName ?? book.frenchName ?? book.swahiliName ?? book.title);
    if (resolved) id = resolved;
  }
  if (!DEUT_IDS.has(id)) return null;

  let chaptersData = null;
  if (Array.isArray(book.chapters_data)) {
    chaptersData = book.chapters_data.map((c) => ({
      chapter: Number(c.chapter),
      verses: (c.verses || []).map((v) => ({ verse: Number(v.verse ?? v.number), text: String(v.text ?? v.content ?? '').trim() }))
        .filter((v) => Number.isFinite(v.verse) && v.text)
    }));
  } else if (Array.isArray(book.chapters)) {
    if (Array.isArray(book.chapters[0])) {
      chaptersData = book.chapters.map((verses, ci) => ({
        chapter: ci + 1,
        verses: (verses || []).map((text, vi) => ({ verse: vi + 1, text: String(text).trim() })).filter((v) => v.text)
      }));
    } else if (book.chapters[0] && Array.isArray(book.chapters[0].verses)) {
      chaptersData = book.chapters.map((c) => ({
        chapter: Number(c.chapter),
        verses: (c.verses || []).map((v) => ({ verse: Number(v.number ?? v.verse), text: String(v.text ?? v.content ?? '').trim() }))
          .filter((v) => Number.isFinite(v.verse) && v.text)
      }));
    }
  }
  if (!chaptersData) return null;

  const name = CANONICAL_NAMES[lang]?.[id] ?? book.name ?? ENGLISH_NAMES[id];
  return {
    id,
    name,
    englishName: ENGLISH_NAMES[id],
    abbreviation: book.abbreviation ?? book.abbrev ?? '',
    testament: 'old',
    chapters: chaptersData.length,
    chapters_data: chaptersData.filter((c) => c.verses.length > 0)
  };
}

function versesToBooks(lang, byBook) {
  const books = [];
  for (const [id, chMap] of byBook.entries()) {
    const chapters = [...chMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([chapter, vMap]) => ({
        chapter,
        verses: [...vMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([verse, text]) => ({ verse, text }))
      }))
      .filter((c) => c.verses.length > 0);
    books.push({
      id,
      name: CANONICAL_NAMES[lang]?.[id] ?? ENGLISH_NAMES[id],
      englishName: ENGLISH_NAMES[id],
      abbreviation: '',
      testament: 'old',
      chapters: chapters.length,
      chapters_data: chapters
    });
  }
  return books;
}

async function readInputFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await readInputFiles(full)));
    } else {
      files.push(full);
    }
  }
  return files.sort();
}

function parsePlainText(text, lang) {
  const rows = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    let m = line.match(/^(.+?)\s+(\d+):(\d+)\s*[-–—:]?\s*(.+)$/);
    if (m) {
      rows.push({ book: m[1].trim(), chapter: m[2], verse: m[3], text: m[4].trim(), lang });
      continue;
    }
    m = line.match(/^(.+?)\s+(\d+)\s+(\d+)\s+(.+)$/);
    if (m) {
      rows.push({ book: m[1].trim(), chapter: m[2], verse: m[3], text: m[4].trim(), lang });
    }
  }
  return rows;
}

function collectFromJson(lang, data, accBooks, accRows) {
  if (Array.isArray(data)) {
    // array of verse rows?
    if (data.length && data[0] && (data[0].text != null || data[0].content != null) && (data[0].chapter != null)) {
      for (const r of data) accRows.push({ ...r, lang });
      return;
    }
    // array of books
    for (const b of data) {
      const nb = normalizeBook(lang, b);
      if (nb) accBooks.push(nb);
      else collectFromJson(lang, b, accBooks, accRows);
    }
    return;
  }
  if (data && typeof data === 'object') {
    if (Array.isArray(data.books)) {
      for (const b of data.books) {
        const nb = normalizeBook(lang, b);
        if (nb) accBooks.push(nb);
      }
      return;
    }
    if (Array.isArray(data.verses)) {
      for (const r of data.verses) accRows.push({ ...r, lang });
      return;
    }
    if (Array.isArray(data.chapters) || Array.isArray(data.chapters_data)) {
      const nb = normalizeBook(lang, data);
      if (nb) accBooks.push(nb);
      return;
    }
    // object keyed by book name
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object') {
        const nb = normalizeBook(lang, { name: key, ...val });
        if (nb) { accBooks.push(nb); continue; }
        collectFromJson(lang, val, accBooks, accRows);
      }
    }
  }
}

async function importLang(lang) {
  const candidates = [
    join(ROOT, 'raw-bibles', `${lang}-catholic`),
    join(ROOT, '..', 'raw-bibles', `${lang}-catholic`)
  ];
  const dir = candidates.find((p) => existsSync(p));
  if (!dir) {
    console.error(`Missing raw-bibles/${lang}-catholic/ directory (checked frontend and project root).`);
    process.exit(1);
  }
  const files = await readInputFiles(dir);
  if (files.length === 0) {
    console.error(`No input files found in ${dir}`);
    process.exit(1);
  }

  const accBooks = [];
  const accRows = [];
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const content = await readFile(file, 'utf8');
    if (ext === '.json') {
      let data;
      try { data = JSON.parse(content); } catch (e) {
        console.warn(`Skipping invalid JSON ${file}: ${e.message}`);
        continue;
      }
      collectFromJson(lang, data, accBooks, accRows);
    } else {
      accRows.push(...parsePlainText(content, lang));
    }
  }

  // Merge JSON books and plain-text rows (rows win on conflicts? collect both)
  const byBook = normalizeVerseRows(accRows);
  const rowBooks = versesToBooks(lang, byBook);

  // Combine: rowBooks fill gaps; accBooks preferred if present
  const mergedByBook = new Map();
  for (const b of rowBooks) mergedByBook.set(b.id, b);
  for (const b of accBooks) mergedByBook.set(b.id, b);

  const newDeutBooks = [...mergedByBook.values()]
    .filter((b) => DEUT_IDS.has(b.id))
    .sort((a, b) => a.id - b.id);

  if (newDeutBooks.length === 0) {
    console.error(`No Deuterocanonical books parsed for ${lang}.`);
    process.exit(1);
  }

  const outPath = join(OUT_DIR, `${lang}.json`);
  if (!existsSync(outPath)) {
    console.error(`Missing existing ${outPath}.`);
    process.exit(1);
  }
  const existing = JSON.parse(readFileSync(outPath, 'utf8'));
  const nonDeut = (existing.books || []).filter((b) => !DEUT_IDS.has(b.id));
  const mergedBooks = [...nonDeut, ...newDeutBooks].sort((a, b) => a.id - b.id);

  const nextVersion = (Number(existing.version) || 1) + 1;
  const merged = {
    ...existing,
    version: nextVersion,
    source: `${existing.source || lang} + raw-bibles/${lang}-catholic`,
    bookCount: mergedBooks.length,
    books: mergedBooks
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(outPath, JSON.stringify(merged));
  console.log(`Imported ${newDeutBooks.length} Deuterocanonical books into ${outPath}`);
  console.log(`Total books: ${merged.bookCount}, version bumped to ${merged.version}`);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const langs = args.lang ? [args.lang] : args.all ? ['rw', 'sw'] : [];
if (langs.length === 0) {
  console.error('Usage: node import-deuterocanonical.mjs --lang=rw | --lang=sw | --all');
  process.exit(1);
}

for (const lang of langs) {
  if (!['rw', 'sw'].includes(lang)) {
    console.error(`Unsupported lang: ${lang}`);
    process.exit(1);
  }
  await importLang(lang);
}
console.log('Done.');