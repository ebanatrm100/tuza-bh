import type { Tradition } from './traditions';
import { type Lang } from '../i18n';

export interface BookSeed {
  name: string;
  englishName: string;
  swahiliName: string;
  frenchName: string;
  abbreviation: string;
  chapters: number;
  testament: 'old' | 'new';
  deuterocanonical?: boolean;
}

// Canonical structure with names in all four supported languages. IDs 1–66 are
// the shared Protestant canon; 67–73 are the seven Catholic Deuterocanonical books.
export const BOOKS: BookSeed[] = [
  { name: 'Itangiriro', englishName: 'Genesis', swahiliName: 'Mwanzo', frenchName: 'Genèse', abbreviation: 'Int', chapters: 50, testament: 'old' },
  { name: 'Kuva', englishName: 'Exodus', swahiliName: 'Kutoka', frenchName: 'Exode', abbreviation: 'Kuv', chapters: 40, testament: 'old' },
  { name: 'Abalewi', englishName: 'Leviticus', swahiliName: 'Mambo ya Walawi', frenchName: 'Lévitique', abbreviation: 'Bal', chapters: 27, testament: 'old' },
  { name: 'Kubara', englishName: 'Numbers', swahiliName: 'Hesabu', frenchName: 'Nombres', abbreviation: 'Kub', chapters: 36, testament: 'old' },
  { name: 'Gutegeka kwa kabiri', englishName: 'Deuteronomy', swahiliName: 'Kumbukumbu la Torati', frenchName: 'Deutéronome', abbreviation: 'Gut', chapters: 34, testament: 'old' },
  { name: 'Yosuwa', englishName: 'Joshua', swahiliName: 'Yoshua', frenchName: 'Josué', abbreviation: 'Yos', chapters: 24, testament: 'old' },
  { name: 'Abacamanza', englishName: 'Judges', swahiliName: 'Waamuzi', frenchName: 'Juges', abbreviation: 'Abc', chapters: 21, testament: 'old' },
  { name: 'Rutu', englishName: 'Ruth', swahiliName: 'Ruthu', frenchName: 'Ruth', abbreviation: 'Rut', chapters: 4, testament: 'old' },
  { name: '1 Samueli', englishName: '1 Samuel', swahiliName: '1 Samweli', frenchName: '1 Samuel', abbreviation: '1Sam', chapters: 31, testament: 'old' },
  { name: '2 Samueli', englishName: '2 Samuel', swahiliName: '2 Samweli', frenchName: '2 Samuel', abbreviation: '2Sam', chapters: 24, testament: 'old' },
  { name: '1 Abami', englishName: '1 Kings', swahiliName: '1 Wafalme', frenchName: '1 Rois', abbreviation: '1Abm', chapters: 22, testament: 'old' },
  { name: '2 Abami', englishName: '2 Kings', swahiliName: '2 Wafalme', frenchName: '2 Rois', abbreviation: '2Abm', chapters: 25, testament: 'old' },
  { name: '1 Ngoma', englishName: '1 Chronicles', swahiliName: '1 Mambo ya Nyakati', frenchName: '1 Chroniques', abbreviation: '1Ngo', chapters: 29, testament: 'old' },
  { name: '2 Ngoma', englishName: '2 Chronicles', swahiliName: '2 Mambo ya Nyakati', frenchName: '2 Chroniques', abbreviation: '2Ngo', chapters: 36, testament: 'old' },
  { name: 'Ezira', englishName: 'Ezra', swahiliName: 'Ezra', frenchName: 'Esdras', abbreviation: 'Ezi', chapters: 10, testament: 'old' },
  { name: 'Nehemiya', englishName: 'Nehemiah', swahiliName: 'Nehemia', frenchName: 'Néhémie', abbreviation: 'Neh', chapters: 13, testament: 'old' },
  { name: 'Este', englishName: 'Esther', swahiliName: 'Esta', frenchName: 'Esther', abbreviation: 'Est', chapters: 10, testament: 'old' },
  { name: 'Yobu', englishName: 'Job', swahiliName: 'Ayubu', frenchName: 'Job', abbreviation: 'Yob', chapters: 42, testament: 'old' },
  { name: 'Zaburi', englishName: 'Psalms', swahiliName: 'Zaburi', frenchName: 'Psaumes', abbreviation: 'Zab', chapters: 150, testament: 'old' },
  { name: 'Imigani', englishName: 'Proverbs', swahiliName: 'Mithali', frenchName: 'Proverbes', abbreviation: 'Imi', chapters: 31, testament: 'old' },
  { name: 'Umubwiriza', englishName: 'Ecclesiastes', swahiliName: 'Mhubiri', frenchName: 'Ecclésiaste', abbreviation: 'Umb', chapters: 12, testament: 'old' },
  { name: "Indirimbo y'Indirimbo", englishName: 'Song of Songs', swahiliName: 'Wimbo Ulio Bora', frenchName: 'Cantique des Cantiques', abbreviation: 'Ind', chapters: 8, testament: 'old' },
  { name: 'Yesaya', englishName: 'Isaiah', swahiliName: 'Isaya', frenchName: 'Ésaïe', abbreviation: 'Yes', chapters: 66, testament: 'old' },
  { name: 'Yeremiya', englishName: 'Jeremiah', swahiliName: 'Yeremia', frenchName: 'Jérémie', abbreviation: 'Yer', chapters: 52, testament: 'old' },
  { name: 'Amaganya', englishName: 'Lamentations', swahiliName: 'Maombolezo', frenchName: 'Lamentations', abbreviation: 'Ama', chapters: 5, testament: 'old' },
  { name: 'Ezekiyeli', englishName: 'Ezekiel', swahiliName: 'Ezekieli', frenchName: 'Ézéchiel', abbreviation: 'Eze', chapters: 48, testament: 'old' },
  { name: 'Daniyeli', englishName: 'Daniel', swahiliName: 'Danieli', frenchName: 'Daniel', abbreviation: 'Dan', chapters: 12, testament: 'old' },
  { name: 'Hoseya', englishName: 'Hosea', swahiliName: 'Hosea', frenchName: 'Osée', abbreviation: 'Hos', chapters: 14, testament: 'old' },
  { name: 'Yoweli', englishName: 'Joel', swahiliName: 'Yoeli', frenchName: 'Joël', abbreviation: 'Yow', chapters: 3, testament: 'old' },
  { name: 'Amosi', englishName: 'Amos', swahiliName: 'Amosi', frenchName: 'Amos', abbreviation: 'Amo', chapters: 9, testament: 'old' },
  { name: 'Obadiya', englishName: 'Obadiah', swahiliName: 'Obadia', frenchName: 'Abdias', abbreviation: 'Oba', chapters: 1, testament: 'old' },
  { name: 'Yona', englishName: 'Jonah', swahiliName: 'Yona', frenchName: 'Jonas', abbreviation: 'Yon', chapters: 4, testament: 'old' },
  { name: 'Mika', englishName: 'Micah', swahiliName: 'Mika', frenchName: 'Michée', abbreviation: 'Mik', chapters: 7, testament: 'old' },
  { name: 'Nahumu', englishName: 'Nahum', swahiliName: 'Nahumu', frenchName: 'Nahum', abbreviation: 'Nah', chapters: 3, testament: 'old' },
  { name: 'Habakuki', englishName: 'Habakkuk', swahiliName: 'Habakuki', frenchName: 'Habacuc', abbreviation: 'Hab', chapters: 3, testament: 'old' },
  { name: 'Zefaniya', englishName: 'Zephaniah', swahiliName: 'Sefania', frenchName: 'Sophonie', abbreviation: 'Zef', chapters: 3, testament: 'old' },
  { name: 'Hagayi', englishName: 'Haggai', swahiliName: 'Hagai', frenchName: 'Aggée', abbreviation: 'Hag', chapters: 2, testament: 'old' },
  { name: 'Zekariya', englishName: 'Zechariah', swahiliName: 'Zekaria', frenchName: 'Zacharie', abbreviation: 'Zek', chapters: 14, testament: 'old' },
  { name: 'Malaki', englishName: 'Malachi', swahiliName: 'Malaki', frenchName: 'Malachie', abbreviation: 'Mal', chapters: 4, testament: 'old' },
  { name: 'Matayo', englishName: 'Matthew', swahiliName: 'Mathayo', frenchName: 'Matthieu', abbreviation: 'Mat', chapters: 28, testament: 'new' },
  { name: 'Mariko', englishName: 'Mark', swahiliName: 'Marko', frenchName: 'Marc', abbreviation: 'Mar', chapters: 16, testament: 'new' },
  { name: 'Luka', englishName: 'Luke', swahiliName: 'Luka', frenchName: 'Luc', abbreviation: 'Luk', chapters: 24, testament: 'new' },
  { name: 'Yohana', englishName: 'John', swahiliName: 'Yohana', frenchName: 'Jean', abbreviation: 'Yoh', chapters: 21, testament: 'new' },
  { name: "Ibikorwa by'Intumwa", englishName: 'Acts', swahiliName: 'Matendo ya Mitume', frenchName: 'Actes', abbreviation: 'Ibi', chapters: 28, testament: 'new' },
  { name: 'Abaroma', englishName: 'Romans', swahiliName: 'Warumi', frenchName: 'Romains', abbreviation: 'Rom', chapters: 16, testament: 'new' },
  { name: '1 Abakorinto', englishName: '1 Corinthians', swahiliName: '1 Wakorintho', frenchName: '1 Corinthiens', abbreviation: '1Kor', chapters: 16, testament: 'new' },
  { name: '2 Abakorinto', englishName: '2 Corinthians', swahiliName: '2 Wakorintho', frenchName: '2 Corinthiens', abbreviation: '2Kor', chapters: 13, testament: 'new' },
  { name: 'Abagalatiya', englishName: 'Galatians', swahiliName: 'Wagalatia', frenchName: 'Galates', abbreviation: 'Gal', chapters: 6, testament: 'new' },
  { name: 'Abefeso', englishName: 'Ephesians', swahiliName: 'Waefeso', frenchName: 'Éphésiens', abbreviation: 'Efe', chapters: 6, testament: 'new' },
  { name: 'Abafilipi', englishName: 'Philippians', swahiliName: 'Wafilipi', frenchName: 'Philippiens', abbreviation: 'Fil', chapters: 4, testament: 'new' },
  { name: 'Abakolosayi', englishName: 'Colossians', swahiliName: 'Wakolosai', frenchName: 'Colossiens', abbreviation: 'Kol', chapters: 4, testament: 'new' },
  { name: '1 Abatesalonike', englishName: '1 Thessalonians', swahiliName: '1 Wathesalonike', frenchName: '1 Thessaloniciens', abbreviation: '1Tes', chapters: 5, testament: 'new' },
  { name: '2 Abatesalonike', englishName: '2 Thessalonians', swahiliName: '2 Wathesalonike', frenchName: '2 Thessaloniciens', abbreviation: '2Tes', chapters: 3, testament: 'new' },
  { name: '1 Timoteyo', englishName: '1 Timothy', swahiliName: '1 Timotheo', frenchName: '1 Timothée', abbreviation: '1Tim', chapters: 6, testament: 'new' },
  { name: '2 Timoteyo', englishName: '2 Timothy', swahiliName: '2 Timotheo', frenchName: '2 Timothée', abbreviation: '2Tim', chapters: 4, testament: 'new' },
  { name: 'Tito', englishName: 'Titus', swahiliName: 'Tito', frenchName: 'Tite', abbreviation: 'Tit', chapters: 3, testament: 'new' },
  { name: 'Filemoni', englishName: 'Philemon', swahiliName: 'Filemoni', frenchName: 'Philémon', abbreviation: 'Fil', chapters: 1, testament: 'new' },
  { name: 'Abaheburayo', englishName: 'Hebrews', swahiliName: 'Waebrania', frenchName: 'Hébreux', abbreviation: 'Heb', chapters: 13, testament: 'new' },
  { name: 'Yakobo', englishName: 'James', swahiliName: 'Yakobo', frenchName: 'Jacques', abbreviation: 'Yak', chapters: 5, testament: 'new' },
  { name: '1 Petero', englishName: '1 Peter', swahiliName: '1 Petro', frenchName: '1 Pierre', abbreviation: '1Pet', chapters: 5, testament: 'new' },
  { name: '2 Petero', englishName: '2 Peter', swahiliName: '2 Petro', frenchName: '2 Pierre', abbreviation: '2Pet', chapters: 3, testament: 'new' },
  { name: '1 Yohana', englishName: '1 John', swahiliName: '1 Yohana', frenchName: '1 Jean', abbreviation: '1Yoh', chapters: 5, testament: 'new' },
  { name: '2 Yohana', englishName: '2 John', swahiliName: '2 Yohana', frenchName: '2 Jean', abbreviation: '2Yoh', chapters: 1, testament: 'new' },
  { name: '3 Yohana', englishName: '3 John', swahiliName: '3 Yohana', frenchName: '3 Jean', abbreviation: '3Yoh', chapters: 1, testament: 'new' },
  { name: 'Yuda', englishName: 'Jude', swahiliName: 'Yuda', frenchName: 'Jude', abbreviation: 'Yud', chapters: 1, testament: 'new' },
  { name: 'Ibyahishuwe', englishName: 'Revelation', swahiliName: 'Ufunuo', frenchName: 'Apocalypse', abbreviation: 'Iby', chapters: 22, testament: 'new' },
  { name: 'Tobi', englishName: 'Tobit', swahiliName: 'Tobiti', frenchName: 'Tobie', abbreviation: 'Tob', chapters: 14, testament: 'old', deuterocanonical: true },
  { name: 'Yudita', englishName: 'Judith', swahiliName: 'Yudita', frenchName: 'Judith', abbreviation: 'Jdt', chapters: 16, testament: 'old', deuterocanonical: true },
  { name: 'Ubuhanga', englishName: 'Wisdom', swahiliName: 'Hekima', frenchName: 'Sagesse', abbreviation: 'Wis', chapters: 19, testament: 'old', deuterocanonical: true },
  { name: 'Mwene Siraki', englishName: 'Sirach', swahiliName: 'Sira', frenchName: 'Siracide', abbreviation: 'Sir', chapters: 51, testament: 'old', deuterocanonical: true },
  { name: 'Baruki', englishName: 'Baruch', swahiliName: 'Baruku', frenchName: 'Baruch', abbreviation: 'Bar', chapters: 6, testament: 'old', deuterocanonical: true },
  { name: "Icya mbere cy'Abamakabe", englishName: '1 Maccabees', swahiliName: 'Wamakabayo 1', frenchName: '1 Maccabées', abbreviation: '1Macc', chapters: 16, testament: 'old', deuterocanonical: true },
  { name: "Icya kabiri cy'Abamakabe", englishName: '2 Maccabees', swahiliName: 'Wamakabayo 2', frenchName: '2 Maccabées', abbreviation: '2Macc', chapters: 15, testament: 'old', deuterocanonical: true }
];

const BOOK_BY_ID = new Map(BOOKS.map((book, index) => [index + 1, book]));

const DEUTEROCANONICAL_IDS = new Set([67, 68, 69, 70, 71, 72, 73]);

// Canonical Deuterocanonical book ids are stable across every language: the
// same numeric id is used in rw/sw/fr/en, so an English fallback can always be
// resolved from the selected book's id without name-string matching.
export const DEUTEROCANONICAL_ENGLISH_BOOK_IDS: Record<number, number> = {
  67: 67, // Tobit / Tobi / Tobiti / Tobie
  68: 68, // Judith / Yudita
  69: 69, // Wisdom / Ubuhanga / Hekima / Sagesse
  70: 70, // Sirach / Mwene Siraki / Sira / Siracide
  71: 71, // Baruch / Baruki / Baruku / Baruch
  72: 72, // 1 Maccabees / Icya mbere cy'Abamakabe / Wamakabayo 1 / 1 Maccabées
  73: 73 // 2 Maccabees / Icya kabiri cy'Abamakabe / Wamakabayo 2 / 2 Maccabées
};

// Catholic order places the Deuterocanonical books among the historical,
// wisdom, and prophetic books instead of appending them after Malachi.
export const CATHOLIC_ORDER = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 67, 68, 17, 72, 73,
  18, 19, 20, 21, 22, 69, 70, 23, 24, 25, 71, 26, 27, 28, 29, 30, 31, 32, 33,
  34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
  53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66
];

const CATHOLIC_RANK = new Map(CATHOLIC_ORDER.map((id, index) => [id, index]));

export function isDeuterocanonical(id: number): boolean {
  return DEUTEROCANONICAL_IDS.has(id);
}

/** Filter to the active canon and keep Catholic books in their liturgical order. */
export function sortBooksForTradition<T extends { id: number }>(books: T[], tradition: Tradition): T[] {
  if (tradition !== 'catholic') return books.filter((book) => !isDeuterocanonical(book.id));
  return [...books].sort(
    (a, b) => (CATHOLIC_RANK.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (CATHOLIC_RANK.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

/** Book ids are stable (1–73), so names always follow the active language. */
export function bookName(id: number, lang: Lang): string {
  const book = BOOK_BY_ID.get(id);
  if (!book) return '';
  if (lang === 'en') return book.englishName;
  if (lang === 'sw') return book.swahiliName;
  if (lang === 'fr') return book.frenchName;
  return book.name;
}
