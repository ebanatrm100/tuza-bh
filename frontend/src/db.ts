import Dexie, { type Table } from 'dexie';
import { BOOKS, isDeuterocanonical, DEUTEROCANONICAL_ENGLISH_BOOK_IDS } from './data/books';
import type { Lang } from './i18n';

export interface BibleBook {
  id: number;
  name: string;
  englishName: string;
  abbreviation: string;
  chapters: number;
  testament: 'old' | 'new';
  deuterocanonical?: boolean;
}

export interface BibleVerse {
  id?: number;
  lang: Lang;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
}

export type HymnCollection = 'praise' | 'salvation';
export type HymnEdition = 'protestant' | 'sda';

export interface HymnAltVersion {
  bookName?: string;
  chorus?: string;
  stanzas?: string[];
  lyrics?: string;
}

export interface Hymn {
  id?: number;
  lang: Lang;
  number: number;
  title: string;
  lyrics: string;
  chorus?: string;
  collection: HymnCollection;
  category?: string;
  stanzas?: string[];
  translated?: boolean;
  edition?: HymnEdition;
  bookName?: string;
  altVersion?: HymnAltVersion;
}

export interface LibraryMeta {
  key: string;
  value: string;
}

interface BibleBundle {
  version?: number;
  language: Lang;
  books: { id: number; name: string; englishName: string; abbreviation: string; testament: 'old' | 'new'; chapters: number; deuterocanonical?: boolean; chapters_data: { chapter: number; verses: { verse: number; text: string }[] }[] }[];
}

interface HymnalBundle {
  version?: number;
  language: Lang;
  collections: { praise: any[]; salvation: any[] };
}

class TuzaDB extends Dexie {
  bibleBooks!: Table<BibleBook, number>;
  bibleVerses!: Table<BibleVerse, number>;
  hymns!: Table<Hymn, number>;
  meta!: Table<LibraryMeta, string>;

  constructor() {
    super('TuzaBibleHymnalDB');
    this.version(1).stores({
      bibleBooks: 'id, name, englishName, testament',
      bibleVerses: '++id, bookId, chapter, [bookId+chapter]',
      hymns: 'number, title',
      meta: 'key'
    });
    this.version(2).stores({
      bibleBooks: 'id, name, englishName, testament',
      bibleVerses: '++id, lang, bookId, chapter, [lang+bookId+chapter]',
      hymns: '++id, lang, number, [lang+number]',
      meta: 'key'
    }).upgrade(async (tx) => {
      await tx.table('bibleVerses').clear();
      await tx.table('hymns').clear();
    });
    this.version(3).stores({
      bibleBooks: 'id, name, englishName, testament',
      bibleVerses: '++id, lang, bookId, chapter, [lang+bookId+chapter]',
      hymns: '++id, lang, number, [lang+number]',
      meta: 'key'
    }).upgrade(async (tx) => {
      await tx.table('bibleVerses').clear();
      await tx.table('hymns').clear();
      await tx.table('meta').clear();
    });
    this.version(4).stores({
      bibleBooks: 'id, name, englishName, testament',
      bibleVerses: '++id, lang, bookId, chapter, [lang+bookId+chapter]',
      hymns: '++id, lang, number, [lang+number]',
      meta: 'key'
    }).upgrade(async (tx) => {
      await tx.table('hymns').clear();
      await tx.table('meta').clear();
    });
    this.version(5).stores({
      bibleBooks: 'id, name, englishName, testament',
      bibleVerses: '++id, lang, bookId, chapter, [lang+bookId+chapter]',
      hymns: '++id, lang, number, [lang+number]',
      meta: 'key'
    }).upgrade(async (tx) => {
      // A new canon, new edition metadata, and bumped JSON versions must all
      // reseed installed PWAs instead of trusting the old seededAt marker.
      await tx.table('bibleBooks').clear();
      await tx.table('bibleVerses').clear();
      await tx.table('hymns').clear();
      await tx.table('meta').clear();
    });
    this.version(6).stores({
      bibleBooks: 'id, name, englishName, testament',
      bibleVerses: '++id, lang, bookId, chapter, [lang+bookId+chapter]',
      hymns: '++id, lang, number, [lang+number]',
      meta: 'key'
    }).upgrade(async (tx) => {
      // Bumped JSON versions and Deuterocanonical English fallback require a
      // full reseed of installed PWAs.
      await tx.table('bibleBooks').clear();
      await tx.table('bibleVerses').clear();
      await tx.table('hymns').clear();
      await tx.table('meta').clear();
    });
    this.version(7).stores({
      bibleBooks: 'id, name, englishName, testament',
      bibleVerses: '++id, lang, bookId, chapter, [lang+bookId+chapter]',
      hymns: '++id, lang, number, [lang+number]',
      meta: 'key'
    }).upgrade(async (tx) => {
      // Force a complete reseed so every language gets the current canon and
      // English Deuterocanonical rows are guaranteed to exist for fallback.
      await tx.table('bibleBooks').clear();
      await tx.table('bibleVerses').clear();
      await tx.table('hymns').clear();
      await tx.table('meta').clear();
    });
  }
}

export const db = new TuzaDB();

const LANGS: Lang[] = ['rw', 'en', 'sw', 'fr'];

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export async function syncBible(lang: Lang, force = false): Promise<boolean> {
  const key = `bibleVersion:${lang}`;
  let bundle: BibleBundle;
  try {
    bundle = await fetchJson(`${import.meta.env.BASE_URL}data/bibles/${lang}.json`);
  } catch {
    try {
      bundle = await fetchJson(`/api/bibles/${lang}.json`);
    } catch {
      return false;
    }
  }
  const incoming = String(bundle.version ?? 1);
  const stored = await db.meta.get(key);
  const hasContent = (await db.bibleVerses.where('lang').equals(lang).count()) > 0;
  if (!force && stored?.value === incoming && hasContent) return true;

  const rows: BibleVerse[] = [];
  for (const book of bundle.books ?? []) {
    for (const ch of book.chapters_data ?? []) {
      for (const v of ch.verses ?? []) {
        rows.push({ lang, bookId: book.id, chapter: ch.chapter, verse: v.verse, text: v.text });
      }
    }
  }

  await db.transaction('rw', db.bibleVerses, db.meta, async () => {
    await db.bibleVerses.where('lang').equals(lang).delete();
    if (rows.length) await db.bibleVerses.bulkAdd(rows);
    await db.meta.put({ key, value: incoming });
  });
  return true;
}

export async function syncHymnal(lang: Lang, force = false): Promise<boolean> {
  const key = `hymnalVersion:${lang}`;
  let bundle: HymnalBundle;
  try {
    bundle = await fetchJson(`${import.meta.env.BASE_URL}data/hymnals/${lang}.json`);
  } catch {
    try {
      bundle = await fetchJson(`/api/hymnals/${lang}.json`);
    } catch {
      return false;
    }
  }
  const incoming = String(bundle.version ?? 1);
  const stored = await db.meta.get(key);
  const hasContent = (await db.hymns.where('lang').equals(lang).count()) > 0;
  if (!force && stored?.value === incoming && hasContent) return true;

  const rows: Hymn[] = [];
  for (const collection of ['praise', 'salvation'] as HymnCollection[]) {
    for (const h of bundle.collections?.[collection] ?? []) {
      const stanzas = Array.isArray(h.stanzas) && h.stanzas.length ? h.stanzas : (h.lyrics ? h.lyrics.split(/\n{2,}/).map((s: string) => s.trim()).filter(Boolean) : []);
      const lyrics = stanzas.join('\n\n') || h.lyrics || '';
      const altStanzas = Array.isArray(h.altVersion?.stanzas) && h.altVersion.stanzas.length
        ? h.altVersion.stanzas
        : (h.altVersion?.lyrics ? h.altVersion.lyrics.split(/\n{2,}/).map((s: string) => s.trim()).filter(Boolean) : []);
      rows.push({
        lang,
        number: h.number,
        title: h.title,
        lyrics,
        chorus: h.chorus,
        collection: collection as HymnCollection,
        stanzas,
        translated: h.translated,
        edition: h.edition,
        bookName: h.bookName,
        altVersion: h.altVersion
          ? {
              bookName: h.altVersion.bookName,
              chorus: h.altVersion.chorus,
              stanzas: altStanzas.length ? altStanzas : h.altVersion.stanzas,
              lyrics: altStanzas.length ? altStanzas.join('\n\n') : h.altVersion.lyrics
            }
          : undefined
      });
    }
  }

  await db.transaction('rw', db.hymns, db.meta, async () => {
    await db.hymns.where('lang').equals(lang).delete();
    if (rows.length) await db.hymns.bulkAdd(rows);
    await db.meta.put({ key, value: incoming });
  });
  return true;
}

export interface SeedProgress {
  progress: number;
  done: boolean;
}

let seedProgress: SeedProgress = { progress: 0, done: false };
const seedListeners = new Set<(p: SeedProgress) => void>();

export function getSeedProgress(): SeedProgress {
  return seedProgress;
}

export function subscribeSeedProgress(cb: (p: SeedProgress) => void): () => void {
  seedListeners.add(cb);
  cb(seedProgress);
  return () => seedListeners.delete(cb);
}

function emitSeedProgress(p: SeedProgress) {
  seedProgress = p;
  seedListeners.forEach((cb) => cb(seedProgress));
}

let seedPromise: Promise<void> | null = null;

async function runSeed() {
  await db.bibleBooks.bulkPut(
    BOOKS.map((b, i) => ({
      id: i + 1,
      name: b.name,
      englishName: b.englishName,
      abbreviation: b.abbreviation,
      chapters: b.chapters,
      testament: b.testament,
      deuterocanonical: b.deuterocanonical
    }))
  );

  emitSeedProgress({ progress: 0, done: false });
  let completed = 0;
  const total = LANGS.length * 2;
  const bump = () => {
    completed += 1;
    emitSeedProgress({ progress: Math.round((completed / total) * 100), done: false });
  };

  const tasks = LANGS.flatMap((lang) => [
    (async () => {
      await syncBible(lang);
      bump();
    })(),
    (async () => {
      await syncHymnal(lang);
      bump();
    })()
  ]);
  await Promise.all(tasks);
  await db.meta.put({ key: 'seededAt', value: new Date().toISOString() });
  emitSeedProgress({ progress: 100, done: true });
}

export function seedOfflineData(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const seeded = await db.meta.get('seededAt');
      if (seeded) {
        emitSeedProgress({ progress: 100, done: true });
        return;
      }
      await runSeed();
    })();
  }
  return seedPromise;
}

export async function getBibleChapterVerses(
  lang: Lang,
  bookId: number,
  chapter: number
): Promise<{ verses: BibleVerse[]; fallback: boolean }> {
  const rows = await db.bibleVerses
    .where('[lang+bookId+chapter]')
    .equals([lang, bookId, chapter])
    .sortBy('verse');
  if (rows.length > 0) return { verses: rows, fallback: false };

  // Automatic English fallback for Deuterocanonical books that are not yet
  // available in the requested (non-English) language. Resolve the English
  // book through the canonical Deuterocanonical id map instead of relying on
  // name-string matching.
  if (lang !== 'en' && isDeuterocanonical(bookId)) {
    const englishBookId = DEUTEROCANONICAL_ENGLISH_BOOK_IDS[bookId] ?? bookId;
    const englishRows = await db.bibleVerses
      .where('[lang+bookId+chapter]')
      .equals(['en', englishBookId, chapter])
      .sortBy('verse');
    if (englishRows.length > 0) {
      return {
        verses: englishRows.map((row) => ({ ...row, lang })),
        fallback: true
      };
    }
  }
  return { verses: rows, fallback: false };
}

export async function searchBible(lang: Lang, query: string, limit = 24): Promise<BibleVerse[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return db.bibleVerses.where('lang').equals(lang).filter((v) => v.text.toLowerCase().includes(q)).limit(limit).toArray();
}

export async function searchHymns(lang: Lang, query: string, limit = 24): Promise<Hymn[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return db.hymns.where('lang').equals(lang).filter((h) => h.title.toLowerCase().includes(q) || h.lyrics.toLowerCase().includes(q) || (h.chorus ?? '').toLowerCase().includes(q)).limit(limit).toArray();
}
