import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data', 'hymnals');

const source = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'library.json'), 'utf8'));

const titles = {
  1: { en: 'God of Grace', sw: 'Mungu wa Neema', fr: 'Dieu de Grâce' },
  2: { en: 'Jesus is King', sw: 'Yesu ni Mfalme', fr: 'Jésus est Roi' },
  3: { en: 'Thank You, God', sw: 'Asante Mungu', fr: 'Merci, Dieu' },
  4: { en: 'The Lord Is My Shepherd', sw: 'Bwana ni Mchungaji Wangu', fr: 'Le Seigneur est Mon Berger' },
  5: { en: 'Your Sweet Voice', sw: 'Sauti Yako Tamu', fr: 'Ta Douce Voix' },
  6: { en: 'Light of the World', sw: 'Nuru ya Ulimwengu', fr: 'Lumière du Monde' },
  7: { en: 'Hallelujah', sw: 'Halleluya', fr: 'Alléluia' },
  8: { en: 'I Will Stay Near You', sw: 'Nitakaa Karibu Nawe', fr: 'Je Reste Près de Toi' }
};

const categoryOf = (h) => h.category ?? 'praise';

function toHymn(h, lang) {
  const stanzas = h.lyrics.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return {
    number: h.number,
    title: lang === 'rw' ? h.title : titles[h.number][lang],
    chorus: h.chorus,
    stanzas,
    translated: lang === 'rw'
  };
}

function build(lang) {
  const collections = { praise: [], salvation: [] };
  for (const h of source.hymns) {
    const hymn = toHymn(h, lang);
    collections[categoryOf(h)].push(hymn);
  }
  return {
    version: 1,
    language: lang,
    note: lang === 'rw'
      ? 'Sample Kinyarwanda hymnal (8 hymns).'
      : 'Titles translated; lyrics pending full translation. Structure matches the Kinyarwanda bundle.',
    collections
  };
}  mkdirSync(OUT_DIR, { recursive: true });
for (const lang of ['rw', 'en', 'sw', 'fr']) {
  const bundle = build(lang);
  const out = join(OUT_DIR, `${lang}.json`);
  writeFileSync(out, JSON.stringify(bundle));
  const total = bundle.collections.praise.length + bundle.collections.salvation.length;
  console.log(`Wrote ${out} — ${total} hymns (praise ${bundle.collections.praise.length}, salvation ${bundle.collections.salvation.length})`);
}
console.log('Done.');