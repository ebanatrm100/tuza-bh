import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data', 'bibles');

// book-name lookup by canonical id (1..66) from src/data/books.ts (mirrored here)
const BOOK_NAMES = {
  en: ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'],
  fr: ['Genèse','Exode','Lévitique','Nombres','Deutéronome','Josué','Juges','Ruth','1 Samuel','2 Samuel','1 Rois','2 Rois','1 Chroniques','2 Chroniques','Esdras','Néhémie','Esther','Job','Psaumes','Proverbes','Ecclésiaste','Cantique des Cantiques','Ésaïe','Jérémie','Lamentations','Ézéchiel','Daniel','Osée','Joël','Amos','Abdias','Jonas','Michée','Nahum','Habacuc','Sophonie','Aggée','Zacharie','Malachie','Matthieu','Marc','Luc','Jean','Actes','Romains','1 Corinthiens','2 Corinthiens','Galates','Éphésiens','Philippiens','Colossiens','1 Thessaloniciens','2 Thessaloniciens','1 Timothée','2 Timothée','Tite','Philémon','Hébreux','Jacques','1 Pierre','2 Pierre','1 Jean','2 Jean','3 Jean','Jude','Apocalypse'],
  sw: ['Mwanzo','Kutoka','Mambo ya Walawi','Hesabu','Kumbukumbu la Torati','Yoshua','Waamuzi','Ruthu','1 Samweli','2 Samweli','1 Wafalme','2 Wafalme','1 Mambo ya Nyakati','2 Mambo ya Nyakati','Ezra','Nehemia','Esta','Ayubu','Zaburi','Mithali','Mhubiri','Wimbo Ulio Bora','Isaya','Yeremia','Maombolezo','Ezekieli','Danieli','Hosea','Yoeli','Amosi','Obadia','Yona','Mika','Nahumu','Habakuki','Sefania','Hagai','Zekaria','Malaki','Mathayo','Marko','Luka','Yohana','Matendo ya Mitume','Warumi','1 Wakorintho','2 Wakorintho','Wagalatia','Waefeso','Wafilipi','Wakolosai','1 Wathesalonike','2 Wathesalonike','1 Timotheo','2 Timotheo','Tito','Filemoni','Waebrania','Yakobo','1 Petro','2 Petro','1 Yohana','2 Yohana','3 Yohana','Yuda','Ufunuo'],
  rw: ['Itangiriro','Kuva','Abalewi','Kubara','Gutegeka kwa kabiri','Yosuwa','Abacamanza','Rutu','1 Samueli','2 Samueli','1 Abami','2 Abami','1 Ngoma','2 Ngoma','Ezira','Nehemiya','Este','Yobu','Zaburi','Imigani','Umubwiriza',"Indirimbo y'Indirimbo",'Yesaya','Yeremiya','Amaganya','Ezekiyeli','Daniyeli','Hoseya','Yoweli','Amosi','Obadiya','Yona','Mika','Nahumu','Habakuki','Zefaniya','Hagayi','Zekariya','Malaki','Matayo','Mariko','Luka','Yohana',"Ibikorwa by'Intumwa",'Abaroma','1 Abakorinto','2 Abakorinto','Abagalatiya','Abefeso','Abafilipi','Abakolosayi','1 Abatesalonike','2 Abatesalonike','1 Timoteyo','2 Timoteyo','Tito','Filemoni','Abaheburayo','Yakobo','1 Petero','2 Petero','1 Yohana','2 Yohana','3 Yohana','Yuda','Ibyahishuwe']
};

const ENGLISH_NAMES = BOOK_NAMES.en;

const TESTAMENT = (id) => (id <= 39 ? 'old' : 'new');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// thiagobodruk format: array of { abbrev, name, chapters: [ [v1, v2, ...], ... ] }
async function fromThiagobodruk(lang, code) {
  console.log(`Fetching thiagobodruk ${code}...`);
  const data = await fetchJson(`https://raw.githubusercontent.com/thiagobodruk/bible/master/json/${code}.json`);
  const books = data.map((b, i) => {
    const id = (data.length === 27 ? 40 : 1) + i; // NT-only sets start at 40
    // For 66-book sets ids are 1..66; for 27-book NT sets ids are 40..66
    const realId = data.length === 66 ? i + 1 : 40 + i;
    const chapters = b.chapters.map((verses, ci) => ({
      chapter: ci + 1,
      verses: verses.map((text, vi) => ({ verse: vi + 1, text }))
    }));
    return {
      id: realId,
      name: b.name,
      englishName: ENGLISH_NAMES[realId - 1],
      abbreviation: b.abbrev,
      testament: TESTAMENT(realId),
      chapters: chapters.length,
      chapters_data: chapters
    };
  });
  return { lang, source: `thiagobodruk/bible (${code})`, books };
}

// midvash format: one JSON per book with { bookId, englishName, chapters: [{chapter, verses:[{number,text}]}] }
async function fromMidvash(lang, version) {
  console.log(`Fetching midvash ${version} book list...`);
  const listing = await fetchJson(`https://api.github.com/repos/midvash/bible-data/contents/versions/${lang}/${version}/books`);
  const files = listing.filter((f) => f.name.endsWith('.json')).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const books = [];
  for (const f of files) {
    const b = await fetchJson(f.download_url);
    const id = b.bookId;
    const chapters = b.chapters.map((c) => ({
      chapter: c.chapter,
      verses: c.verses.map((v) => ({ verse: v.number, text: v.text }))
    }));
    books.push({
      id,
      name: BOOK_NAMES[lang]?.[id - 1] ?? b.englishName,
      englishName: b.englishName ?? ENGLISH_NAMES[id - 1],
      abbreviation: b.book,
      testament: id <= 39 ? 'old' : 'new',
      chapters: chapters.length,
      chapters_data: chapters
    });
    process.stdout.write(`  ${b.book} `);
  }
  console.log('');
  return { lang, source: `midvash/bible-data (${version})`, books };
}

function toBundle(raw) {
  const books = raw.books
    .sort((a, b) => a.id - b.id)
    .map((b) => ({
      id: b.id,
      name: b.name,
      englishName: b.englishName,
      abbreviation: b.abbreviation,
      testament: b.testament,
      chapters: b.chapters,
      chapters_data: b.chapters_data
    }));
  return {
    version: 1,
    language: raw.lang,
    source: raw.source,
    bookCount: books.length,
    books
  };
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const ALL = {
  en: { type: 'thiagobodruk', code: 'en_kjv' },
  sw: { type: 'thiagobodruk', code: 'sw_sruv' },
  rw: { type: 'thiagobodruk', code: 'rw_ruf' },
  fr: { type: 'midvash', lang: 'fr', version: 'lsg' }
};

const langs = args.lang ? [args.lang] : args.all ? Object.keys(ALL) : [];

if (langs.length === 0) {
  console.error('Usage: node import-bible.mjs --lang=en | --all');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

for (const lang of langs) {
  const cfg = ALL[lang];
  let raw;
  if (cfg.type === 'thiagobodruk') raw = await fromThiagobodruk(lang, cfg.code);
  else raw = await fromMidvash(cfg.lang, cfg.version);
  const bundle = toBundle(raw);
  const out = join(OUT_DIR, `${lang}.json`);
  await writeFile(out, JSON.stringify(bundle));
  console.log(`Wrote ${out} — ${bundle.bookCount} books, ${(JSON.stringify(bundle).length / 1024 / 1024).toFixed(2)} MB`);
}
console.log('Done.');
