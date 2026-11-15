import Dexie, { type Table } from 'dexie';
import { BOOKS } from './data/books';
import type { Lang } from './i18n';

export interface BibleBook {
  id: number;
  name: string;
  englishName: string;
  abbreviation: string;
  chapters: number;
  testament: 'old' | 'new';
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
}

export interface LibraryMeta {
  key: string;
  value: string;
}

interface BibleBundle {
  version?: number;
  language: Lang;
  books: { id: number; name: string; englishName: string; abbreviation: string; testament: 'old' | 'new'; chapters: number; chapters_data: { chapter: number; verses: { verse: number; text: string }[] }[] }[];
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
      rows.push({
        lang,
        number: h.number,
        title: h.title,
        lyrics,
        chorus: h.chorus,
        collection: collection as HymnCollection,
        stanzas,
        translated: h.translated
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

let seedPromise: Promise<void> | null = null;

async function runSeed() {
  if ((await db.bibleBooks.count()) === 0) {
    await db.bibleBooks.bulkPut(
      BOOKS.map((b, i) => ({
        id: i + 1,
        name: b.name,
        englishName: b.englishName,
        abbreviation: b.abbreviation,
        chapters: b.chapters,
        testament: b.testament
      }))
    );
  }
  await Promise.all(LANGS.map((lang) => Promise.all([syncBible(lang), syncHymnal(lang)])));
  await db.meta.put({ key: 'seededAt', value: new Date().toISOString() });
}

export function seedOfflineData(): Promise<void> {
  seedPromise ??= runSeed();
  return seedPromise;
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
