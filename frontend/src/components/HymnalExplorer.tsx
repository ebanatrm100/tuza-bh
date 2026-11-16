import { useEffect, useMemo, useState } from 'react';
import { db, seedOfflineData, type Hymn, type HymnCollection, type HymnEdition } from '../db';
import { dataEditionForTradition } from '../data/traditions';
import { LANGS, LANG_LABELS, t, type Lang } from '../i18n';
import { useChurchTradition } from '../lib/useChurchTradition';
import { usePersistentState } from '../lib/usePersistentState';
import type { ShareCardOptions } from '../lib/shareCard';
import BackButton from './BackButton';
import ShareCardModal from './ShareCardModal';
import TabCard from './TabCard';
import TextSizeControl from './TextSizeControl';
import TraditionSelect from './TraditionSelect';
import { ChevronIcon, CompareIcon, HeartIcon, MusicIcon, NoteIcon, SearchIcon, ShareIcon } from './icons';

const FONT_KEY = 'tuza-hymn-font';

const belongsTo = (hymn: Hymn, collection: HymnCollection) =>
  hymn.collection === collection || hymn.category === collection;

const otherEdition = (edition: HymnEdition): HymnEdition => (edition === 'sda' ? 'protestant' : 'sda');

export default function HymnalExplorer({ lang }: { lang: Lang }) {
  const s = t(lang);
  const [tradition, setTradition] = useChurchTradition();
  const dataEdition = dataEditionForTradition(tradition);

  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [collection, setCollection] = useState<HymnCollection | null>(null);
  const [selected, setSelected] = useState<Hymn | null>(null);
  const [query, setQuery] = useState('');
  const [fontScale, setFontScale] = usePersistentState<number>(FONT_KEY, 1);
  const [altOn, setAltOn] = useState(false);
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
      .filter(
        (row) =>
          belongsTo(row, selected.collection) &&
          (!selected.edition || !row.edition || row.edition === selected.edition)
      )
      .first()
      .then((row) => {
        if (alive) setCompareData({ key: `${compareLang}:${selected.collection}:${selected.number}`, hymn: row ?? null });
      });
    return () => {
      alive = false;
    };
  }, [compareOn, compareLang, selected]);

  const traditionHymns = useMemo(
    () => hymns.filter((hymn) => !hymn.edition || hymn.edition === dataEdition),
    [hymns, dataEdition]
  );
  const effectiveCollection = tradition === 'sda' ? 'praise' : collection;

  const inCollection = useMemo(
    () => (effectiveCollection ? traditionHymns.filter((hymn) => belongsTo(hymn, effectiveCollection)) : []),
    [traditionHymns, effectiveCollection]
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
    if (tradition === 'sda') return;
    setQuery('');
    setCollection(collection === next ? null : next);
  };

  const selectTradition = (next: typeof tradition) => {
    if (next === tradition) return;
    setTradition(next);
    setQuery('');
    setSelected(null);
    setCompareOn(false);
    setAltOn(false);
    setCollection(null);
  };

  const meta = (count: number) => (traditionHymns.length ? `${count} ${s.songs}` : '—');

  if (selected) {
    const stanzas = selected.lyrics
      .split(/\n{2,}/)
      .map((stanza) => stanza.trim())
      .filter(Boolean);
    const alt = selected.altVersion;
    const altStanzas = alt
      ? Array.isArray(alt.stanzas) && alt.stanzas.length
        ? alt.stanzas
        : (alt.lyrics ?? '')
            .split(/\n{2,}/)
            .map((stanza) => stanza.trim())
            .filter(Boolean)
      : [];
    const altAvailable = Boolean(alt && (altStanzas.length > 0 || alt.chorus));
    const showingAlt = altOn && altAvailable;
    const displayStanzas = showingAlt ? altStanzas : stanzas;
    const displayChorus = (showingAlt ? alt?.chorus : selected.chorus) ?? '';
    const displayEdition = showingAlt ? otherEdition(selected.edition ?? dataEdition) : (selected.edition ?? dataEdition);
    const chorusLabel = displayEdition === 'sda' ? s.chorusSda : s.chorusProtestant;
    const displayBook = selected.bookName;
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
        className="flex flex-col rounded-3xl border border-white/16 bg-white/[0.08] p-3 shadow-xl backdrop-blur-[14px] sm:p-4"
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
                  : 'border-white/15 bg-white/5 font-medium text-white/92 hover:border-[#FACC15]/50 hover:text-white'
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
            <span className="text-[9px] font-bold tracking-[0.16em] text-[#FACC15] uppercase">{s.compareWith}</span>
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

        <article className="rounded-2xl border border-white/16 bg-white/[0.08] px-3 py-4 backdrop-blur-[14px] sm:px-5 sm:py-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#FACC15] uppercase">
              {s.hymnNumber} {selected.number}
            </p>
            {displayBook && (
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[8px] font-bold tracking-wide text-white/92 uppercase">
                {displayBook}
              </span>
            )}
          </div>
          <h2 id="hymnal-reader-title" className="mt-1 text-xl leading-tight font-black text-white">
            {selected.title}
          </h2>

          {altAvailable && (
            <button
              type="button"
              onClick={() => setAltOn((value) => !value)}
              aria-pressed={showingAlt}
              className={`mt-2 flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition ${
                showingAlt
                  ? 'border-[#FACC15]/60 bg-[#FACC15]/15 text-[#FACC15]'
                  : 'border-white/15 bg-white/[0.04] font-medium text-white/92 hover:border-[#FACC15]/40 hover:text-white'
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5 text-[9px] font-semibold sm:text-[10px]">
                <CompareIcon size={12} />
                {s.switchChurchWording}
              </span>
              <span className="shrink-0 rounded-full border border-white/20 px-1.5 py-0.5 text-[8px] font-bold tracking-wide uppercase">
                {alt?.bookName}
              </span>
            </button>
          )}

          <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
            {displayStanzas.map((stanza, index) => (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[9px] font-bold tracking-[0.18em] text-[#FACC15] uppercase">
                    {s.stanza} {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => shareHymn(stanza, ` — ${s.stanza} ${index + 1}`)}
                    aria-label={s.shareCard}
                    title={s.shareCard}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-medium text-white/92 transition hover:text-[#FACC15]"
                  >
                    <ShareIcon size={12} />
                  </button>
                </div>
                <div className={compareOn ? 'grid gap-2 sm:grid-cols-2' : undefined}>
                  <p
                    className="whitespace-pre-line text-white"
                    style={{ fontSize: `${0.95 * fontScale}rem`, lineHeight: 1.8 }}
                  >
                    {stanza}
                  </p>
                  {compareOn && (
                    <p
                      className="whitespace-pre-line border-t border-white/10 pt-1.5 font-medium text-white/92 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2.5"
                      style={{ fontSize: `${0.9 * fontScale}rem`, lineHeight: 1.7 }}
                    >
                      <span className="mr-1.5 text-[0.65em] font-bold tracking-wide text-[#FACC15] uppercase">
                        {LANG_LABELS[compareLang]}
                      </span>
                      {parallelStanzas[index] ?? '—'}
                    </p>
                  )}
                </div>

                {displayChorus && (
                  <div className="mt-3 rounded-xl border-l-2 border-[#F43F5E] bg-white/5 px-3 py-2">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.18em] text-[#F43F5E] uppercase">
                        <NoteIcon size={11} />
                        {chorusLabel}
                      </p>
                      <button
                        type="button"
                        onClick={() => shareHymn(displayChorus, ` — ${chorusLabel}`)}
                        aria-label={s.shareCard}
                        title={s.shareCard}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-medium text-white/92 transition hover:text-[#FACC15]"
                      >
                        <ShareIcon size={12} />
                      </button>
                    </div>
                    <div className={compareOn ? 'grid gap-2 sm:grid-cols-2' : undefined}>
                      <p
                        className="whitespace-pre-line font-medium text-white/92 italic"
                        style={{ fontSize: `${0.9 * fontScale}rem`, lineHeight: 1.7 }}
                      >
                        {displayChorus}
                      </p>
                      {compareOn && (
                        <p
                          className="whitespace-pre-line border-t border-white/10 pt-1.5 font-medium text-white/92 italic sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2.5"
                          style={{ fontSize: `${0.85 * fontScale}rem`, lineHeight: 1.7 }}
                        >
                          <span className="mr-1.5 text-[0.65em] font-bold tracking-wide text-[#F43F5E] uppercase">
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
      className="flex flex-col rounded-3xl border border-white/16 bg-white/[0.08] p-3 shadow-xl backdrop-blur-[14px] sm:p-4"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="hymnal-panel-title" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#F43F5E] to-[#9F1239] text-white shadow-md">
            <MusicIcon size={17} />
          </span>
          <span className="truncate text-base font-black tracking-wide text-white uppercase sm:text-lg">{s.hymnal}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <TraditionSelect lang={lang} value={tradition} onChange={selectTradition} />
          <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/92">
            {traditionHymns.length} {s.songs}
          </span>
        </div>
      </header>

      {tradition === 'sda' ? (
        <div className="mb-3">
          <TabCard
            title={s.sdaHymnal}
            meta={meta(traditionHymns.length)}
            icon={<NoteIcon size={16} />}
            active
            accent="gold"
            onClick={() => setCollection('praise')}
          />
        </div>
      ) : (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <TabCard
            title={s.praiseSongs}
            meta={meta(traditionHymns.filter((hymn) => belongsTo(hymn, 'praise')).length)}
            icon={<NoteIcon size={16} />}
            active={collection === 'praise'}
            accent="gold"
            onClick={() => selectCollection('praise')}
          />
          <TabCard
            title={s.salvationSongs}
            meta={meta(traditionHymns.filter((hymn) => belongsTo(hymn, 'salvation')).length)}
            icon={<HeartIcon size={16} />}
            active={collection === 'salvation'}
            accent="coral"
            onClick={() => selectCollection('salvation')}
          />
        </div>
      )}

      {effectiveCollection ? (
        <>
          <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-2.5 py-2 focus-within:border-[#F43F5E]/70">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={s.searchHymns}
              aria-label={s.searchHymns}
              className="w-full min-w-0 bg-transparent text-xs text-white outline-none placeholder:text-white/82"
            />
          </div>

          <ul className="min-h-[7rem] space-y-1.5">
            {visible.map((hymn) => (
              <li key={`${hymn.lang}-${hymn.edition ?? 'common'}-${hymn.collection}-${hymn.number}-${hymn.title}`}>
                <button
                  type="button"
                  onClick={() => {
                    setAltOn(false);
                    setSelected(hymn);
                  }}
                  aria-label={`${s.readHymn}: ${hymn.title}`}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-left transition hover:border-[#F43F5E]/60 hover:bg-white/10"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FACC15]/15 text-[11px] font-bold text-[#FACC15]">
                    {hymn.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-white sm:text-xs">{hymn.title}</span>
                    <span className="block truncate text-[9px] font-medium text-white/92 sm:text-[10px]">
                      {hymn.lyrics.split('\n')[0]}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium text-white/92">
                    <ChevronIcon size={13} />
                  </span>
                </button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-xs font-medium text-white/92">
                {s.noHymns}
              </li>
            )}
          </ul>
        </>
      ) : (
        <p className="min-h-[7rem] rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-xs font-medium text-white/92">
          {s.chooseCollection}
        </p>
      )}
    </section>
  );
}
