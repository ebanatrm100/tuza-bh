import { useEffect, useMemo, useState } from 'react';
import { db, seedOfflineData, type Hymn, type HymnCollection } from '../db';
import { LANGS, LANG_LABELS, t, type Lang } from '../i18n';
import { usePersistentState } from '../lib/usePersistentState';
import type { ShareCardOptions } from '../lib/shareCard';
import BackButton from './BackButton';
import ShareCardModal from './ShareCardModal';
import TabCard from './TabCard';
import TextSizeControl from './TextSizeControl';
import { ChevronIcon, CompareIcon, HeartIcon, MusicIcon, NoteIcon, SearchIcon, ShareIcon } from './icons';

const FONT_KEY = 'tuza-hymn-font';

const belongsTo = (hymn: Hymn, collection: HymnCollection) =>
  hymn.collection === collection || hymn.category === collection;

export default function HymnalExplorer({ lang }: { lang: Lang }) {
  const s = t(lang);

  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [collection, setCollection] = useState<HymnCollection | null>(null);
  const [selected, setSelected] = useState<Hymn | null>(null);
  const [query, setQuery] = useState('');
  const [fontScale, setFontScale] = usePersistentState<number>(FONT_KEY, 1);
  const [shareCard, setShareCard] = useState<ShareCardOptions | null>(null);
  const [compareOn, setCompareOn] = useState(false);
  const [compareLang, setCompareLang] = useState<Lang>(lang === 'en' ? 'rw' : 'en');
  const [compareData, setCompareData] = useState<{ key: string; hymn: Hymn | null }>({ key: '', hymn: null });

  useEffect(() => {
    seedOfflineData()
      .then(() => db.hymns.where('lang').equals(lang).sortBy('number'))
      .then((rows) => setHymns(rows));
  }, [lang]);

  const compareKey = selected ? `${compareLang}:${selected.collection}:${selected.number}` : '';

  useEffect(() => {
    if (!compareOn || !selected) return;
    let alive = true;
    db.hymns
      .where('[lang+number]')
      .equals([compareLang, selected.number])
      .filter((row) => belongsTo(row, selected.collection))
      .first()
      .then((row) => {
        if (alive) setCompareData({ key: `${compareLang}:${selected.collection}:${selected.number}`, hymn: row ?? null });
      });
    return () => {
      alive = false;
    };
  }, [compareOn, compareLang, selected]);

  const inCollection = useMemo(
    () => (collection ? hymns.filter((hymn) => belongsTo(hymn, collection)) : []),
    [hymns, collection]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inCollection;
    return inCollection.filter(
      (hymn) =>
        hymn.title.toLowerCase().includes(q) ||
        String(hymn.number) === q ||
        hymn.lyrics.toLowerCase().includes(q) ||
        Boolean(hymn.chorus?.toLowerCase().includes(q))
    );
  }, [inCollection, query]);

  const selectCollection = (next: HymnCollection) => {
    setQuery('');
    setCollection(collection === next ? null : next);
  };

  const meta = (count: number) => (hymns.length ? `${count} ${s.songs}` : '—');

  if (selected) {
    const stanzas = selected.lyrics
      .split(/\n{2,}/)
      .map((stanza) => stanza.trim())
      .filter(Boolean);
    const compareHymn = compareData.key === compareKey ? compareData.hymn : null;
    const parallelStanzas = compareHymn
      ? compareHymn.lyrics
          .split(/\n{2,}/)
          .map((stanza) => stanza.trim())
          .filter(Boolean)
      : [];
    const shareHymn = (body: string, suffix?: string) =>
      setShareCard({
        reference: `${s.hymnNumber} ${selected.number} · ${selected.title}${suffix ?? ''}`,
        text: body
      });

    return (
      <section
        aria-labelledby="hymnal-reader-title"
        className="flex flex-col rounded-3xl border border-white/15 bg-white/[0.07] p-3 shadow-xl backdrop-blur-md sm:p-4"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <BackButton label={s.backToCollections} onClick={() => setSelected(null)} />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCompareOn((v) => !v)}
              aria-pressed={compareOn}
              title={s.compareLanguage}
              className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[10px] font-bold tracking-wide uppercase transition ${
                compareOn
                  ? 'border-[#FACC15]/70 bg-[#FACC15]/15 text-[#FACC15]'
                  : 'border-white/15 bg-white/5 text-violet-100/70 hover:border-[#FACC15]/50 hover:text-white'
              }`}
            >
              <CompareIcon size={12} />
              {s.compareLanguage}
            </button>
            <TextSizeControl
              label={s.textSize}
              increaseLabel={s.increaseText}
              decreaseLabel={s.decreaseText}
              scale={fontScale}
              onChange={setFontScale}
            />
          </div>
        </div>

        {compareOn && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#FACC15]/30 bg-[#FACC15]/10 px-2.5 py-1.5">
            <span className="text-[9px] font-bold tracking-[0.16em] text-[#FACC15]/80 uppercase">{s.compareWith}</span>
            <select
              value={compareLang}
              onChange={(e) => setCompareLang(e.target.value as Lang)}
              aria-label={s.compareWith}
              className="flex-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white outline-none focus:border-[#FACC15]/70"
            >
              {LANGS.filter((l) => l !== lang).map((l) => (
                <option key={l} value={l} className="bg-[#2B0F5C] text-white">
                  {LANG_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
        )}

        <article className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 sm:px-5 sm:py-5">
          <p className="text-[10px] font-bold tracking-[0.22em] text-[#FACC15] uppercase">
            {s.hymnNumber} {selected.number}
          </p>
          <h2 id="hymnal-reader-title" className="mt-1 text-xl leading-tight font-black text-white">
            {selected.title}
          </h2>

          <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
            {stanzas.map((stanza, index) => (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[9px] font-bold tracking-[0.18em] text-[#FACC15]/70 uppercase">
                    {s.stanza} {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => shareHymn(stanza, ` — ${s.stanza} ${index + 1}`)}
                    aria-label={s.shareCard}
                    title={s.shareCard}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-violet-100/30 transition hover:text-[#FACC15]"
                  >
                    <ShareIcon size={12} />
                  </button>
                </div>
                <div className={compareOn ? 'grid gap-2 sm:grid-cols-2' : undefined}>
                  <p
                    className="whitespace-pre-line text-violet-50"
                    style={{ fontSize: `${0.95 * fontScale}rem`, lineHeight: 1.8 }}
                  >
                    {stanza}
                  </p>
                  {compareOn && (
                    <p
                      className="whitespace-pre-line border-t border-white/10 pt-1.5 text-violet-100/85 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2.5"
                      style={{ fontSize: `${0.9 * fontScale}rem`, lineHeight: 1.7 }}
                    >
                      <span className="mr-1.5 text-[0.65em] font-bold tracking-wide text-[#FACC15]/70 uppercase">
                        {LANG_LABELS[compareLang]}
                      </span>
                      {parallelStanzas[index] ?? '—'}
                    </p>
                  )}
                </div>

                {selected.chorus && (
                  <div className="mt-3 rounded-xl border-l-2 border-[#F43F5E] bg-white/5 px-3 py-2">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.18em] text-[#F43F5E] uppercase">
                        <NoteIcon size={11} />
                        {s.chorus}
                      </p>
                      <button
                        type="button"
                        onClick={() => shareHymn(selected.chorus ?? '', ` — ${s.chorus}`)}
                        aria-label={s.shareCard}
                        title={s.shareCard}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-violet-100/30 transition hover:text-[#FACC15]"
                      >
                        <ShareIcon size={12} />
                      </button>
                    </div>
                    <div className={compareOn ? 'grid gap-2 sm:grid-cols-2' : undefined}>
                      <p
                        className="whitespace-pre-line text-violet-50/90 italic"
                        style={{ fontSize: `${0.9 * fontScale}rem`, lineHeight: 1.7 }}
                      >
                        {selected.chorus}
                      </p>
                      {compareOn && (
                        <p
                          className="whitespace-pre-line border-t border-white/10 pt-1.5 text-violet-100/85 italic sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2.5"
                          style={{ fontSize: `${0.85 * fontScale}rem`, lineHeight: 1.7 }}
                        >
                          <span className="mr-1.5 text-[0.65em] font-bold tracking-wide text-[#F43F5E]/80 uppercase">
                            {LANG_LABELS[compareLang]}
                          </span>
                          {compareHymn?.chorus ?? '—'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>

        <ShareCardModal
          open={shareCard !== null}
          onClose={() => setShareCard(null)}
          lang={lang}
          card={shareCard}
        />
      </section>
    );
  }

  return (
    <section
      aria-labelledby="hymnal-panel-title"
      className="flex flex-col rounded-3xl border border-white/15 bg-white/[0.07] p-3 shadow-xl backdrop-blur-md sm:p-4"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 id="hymnal-panel-title" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#F43F5E] to-[#9F1239] text-white shadow-md">
            <MusicIcon size={17} />
          </span>
          <span className="truncate text-base font-black tracking-wide text-white uppercase sm:text-lg">{s.hymnal}</span>
        </h2>
        <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-violet-100/70">
          {hymns.length} {s.songs}
        </span>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <TabCard
          title={s.praiseSongs}
          meta={meta(hymns.filter((hymn) => belongsTo(hymn, 'praise')).length)}
          icon={<NoteIcon size={16} />}
          active={collection === 'praise'}
          accent="gold"
          onClick={() => selectCollection('praise')}
        />
        <TabCard
          title={s.salvationSongs}
          meta={meta(hymns.filter((hymn) => belongsTo(hymn, 'salvation')).length)}
          icon={<HeartIcon size={16} />}
          active={collection === 'salvation'}
          accent="coral"
          onClick={() => selectCollection('salvation')}
        />
      </div>

      {collection ? (
        <>
          <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 focus-within:border-[#F43F5E]/70">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={s.searchHymns}
              aria-label={s.searchHymns}
              className="w-full min-w-0 bg-transparent text-xs text-white outline-none placeholder:text-violet-100/45"
            />
          </div>

          <ul className="min-h-[7rem] space-y-1.5">
            {visible.map((hymn) => (
              <li key={`${hymn.lang}-${hymn.number}`}>
                <button
                  type="button"
                  onClick={() => setSelected(hymn)}
                  aria-label={`${s.readHymn}: ${hymn.title}`}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-left transition hover:border-[#F43F5E]/60 hover:bg-white/10"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FACC15]/15 text-[11px] font-bold text-[#FACC15]">
                    {hymn.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-white sm:text-xs">{hymn.title}</span>
                    <span className="block truncate text-[9px] text-violet-100/55 sm:text-[10px]">
                      {hymn.lyrics.split('\n')[0]}
                    </span>
                  </span>
                  <span className="shrink-0 text-violet-100/40">
                    <ChevronIcon size={13} />
                  </span>
                </button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-xs text-violet-100/60">
                {s.noHymns}
              </li>
            )}
          </ul>
        </>
      ) : (
        <p className="min-h-[7rem] rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-xs text-violet-100/60">
          {s.chooseCollection}
        </p>
      )}
    </section>
  );
}
