import { useEffect, useState } from 'react';
import { db, seedOfflineData, type BibleVerse, type Hymn } from '../db';
import { bookName, isDeuterocanonical } from '../data/books';
import { dataEditionForTradition } from '../data/traditions';
import { t, type Lang } from '../i18n';
import { useChurchTradition } from '../lib/useChurchTradition';
import { SearchIcon } from './icons';

export default function UnifiedSearch({ lang }: { lang: Lang }) {
  const s = t(lang);
  const [tradition] = useChurchTradition();
  const dataEdition = dataEditionForTradition(tradition);
  const [query, setQuery] = useState('');
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [hymns, setHymns] = useState<Hymn[]>([]);

  const normalized = query.trim().toLowerCase();

  useEffect(() => {
    if (normalized.length < 2) {
      setVerses([]);
      setHymns([]);
      return;
    }
    let alive = true;
    seedOfflineData().then(() => {
      Promise.all([
        db.bibleVerses
          .where('lang')
          .equals(lang)
          .filter((v) => (tradition === 'catholic' || !isDeuterocanonical(v.bookId)) && v.text.toLowerCase().includes(normalized))
          .limit(12)
          .toArray(),
        db.hymns
          .where('lang')
          .equals(lang)
          .filter(
            (h) =>
              (!h.edition || h.edition === dataEdition) &&
              (h.title.toLowerCase().includes(normalized) ||
                h.lyrics.toLowerCase().includes(normalized) ||
                (h.chorus ?? '').toLowerCase().includes(normalized))
          )
          .limit(12)
          .toArray()
      ]).then(([vs, hs]) => {
        if (alive) {
          setVerses(vs);
          setHymns(hs);
        }
      });
    });
    return () => {
      alive = false;
    };
  }, [normalized, lang, tradition, dataEdition]);

  return (
    <section className="mt-4 rounded-3xl border border-white/15 bg-white/[0.07] p-3 shadow-xl backdrop-blur-md sm:p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-black tracking-wide text-white uppercase">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#F43F5E] to-[#9F1239] text-white">
          <SearchIcon />
        </span>
        {s.searchAll}
      </h2>
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 focus-within:border-[#FACC15]/70">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={s.searchBible}
          aria-label={s.searchBible}
          className="w-full min-w-0 bg-transparent text-xs text-white outline-none placeholder:text-violet-100/45"
        />
      </div>

      {normalized.length < 2 ? (
        <p className="py-4 text-center text-xs text-violet-100/60">{s.noResults}</p>
      ) : (
        <div className="space-y-3">
          {verses.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold tracking-[0.18em] text-[#FACC15]/80 uppercase">{s.verses}</p>
              <ul className="space-y-1.5">
                {verses.map((v) => (
                  <li key={`${v.bookId}-${v.chapter}-${v.verse}`}>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                      <span className="block text-[10px] font-bold text-[#FACC15]">
                        {bookName(v.bookId, lang)} {v.chapter}:{v.verse}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-violet-50">{v.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hymns.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold tracking-[0.18em] text-[#F43F5E]/80 uppercase">{s.hymnal}</p>
              <ul className="space-y-1.5">
                {hymns.map((h) => (
                  <li key={`${h.lang}-${h.edition ?? 'common'}-${h.collection}-${h.number}-${h.title}`}>
                    <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                      <span className="block text-[10px] font-bold text-[#F43F5E]">
                        {s.hymnNumber} {h.number} · {h.title}
                        {h.bookName ? ` · ${h.bookName}` : ''}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-violet-50">
                        {h.lyrics.split('\n')[0]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {verses.length === 0 && hymns.length === 0 && (
            <p className="py-4 text-center text-xs text-violet-100/60">{s.noResults}</p>
          )}
        </div>
      )}
    </section>
  );
}
