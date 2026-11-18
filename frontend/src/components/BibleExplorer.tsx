import { useEffect, useMemo, useState } from 'react';
import { db, seedOfflineData, getBibleChapterVerses, type BibleBook, type BibleVerse } from '../db';
import { BOOKS, bookName, isDeuterocanonical, sortBooksForTradition } from '../data/books';
import { bookCountForTradition } from '../data/traditions';
import { LANGS, LANG_LABELS, t, type Lang } from '../i18n';
import { useChurchTradition } from '../lib/useChurchTradition';
import { usePersistentState } from '../lib/usePersistentState';
import type { ShareCardOptions } from '../lib/shareCard';
import BackButton from './BackButton';
import Modal from './Modal';
import ShareCardModal from './ShareCardModal';
import TabCard from './TabCard';
import TextSizeControl from './TextSizeControl';
import TraditionSelect from './TraditionSelect';
import { BibleIcon, CompareIcon, CrossIcon, ScrollIcon, SearchIcon, ShareIcon, StarIcon } from './icons';

type Testament = 'old' | 'new';

interface Bookmark {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
}

const BOOKMARKS_KEY = 'tuza-bookmarks-v1';
const FONT_KEY = 'tuza-bible-font';

export default function BibleExplorer({ lang }: { lang: Lang }) {
  const s = t(lang);
  const [tradition, setTradition] = useChurchTradition();

  const [books, setBooks] = useState<BibleBook[]>([]);
  const [testament, setTestament] = useState<Testament | null>(null);
  const [book, setBook] = useState<BibleBook | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([]);
  const [query, setQuery] = useState('');
  const [verseHits, setVerseHits] = useState<BibleVerse[]>([]);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [bookmarks, setBookmarks] = usePersistentState<Bookmark[]>(BOOKMARKS_KEY, []);
  const [fontScale, setFontScale] = usePersistentState<number>(FONT_KEY, 1);
  const [shareCard, setShareCard] = useState<ShareCardOptions | null>(null);
  const [compareOn, setCompareOn] = useState(false);
  const [compareLang, setCompareLang] = useState<Lang>(lang === 'en' ? 'rw' : 'en');
  const [compareData, setCompareData] = useState<{ key: string; rows: BibleVerse[] }>({ key: '', rows: [] });

  const visibleBooks = useMemo(() => sortBooksForTradition(books, tradition), [books, tradition]);
  const visibleBookIds = useMemo(() => new Set(visibleBooks.map((row) => row.id)), [visibleBooks]);
  const activeBook = book && visibleBookIds.has(book.id) ? book : null;
  const oldCount = BOOKS.filter(
    (row) => row.testament === 'old' && (tradition === 'catholic' || !row.deuterocanonical)
  ).length;
  const newCount = BOOKS.filter((row) => row.testament === 'new').length;

  useEffect(() => {
    seedOfflineData()
      .then(() => db.bibleBooks.orderBy('id').toArray())
      .then((rows) => setBooks(rows.length ? rows : []));
  }, []);

  useEffect(() => {
    if (!activeBook || chapter === null) {
      setChapterVerses([]);
      return;
    }
    void (async () => {
      const result = await getBibleChapterVerses(lang, activeBook.id, chapter);
      setChapterVerses(result.verses);
    })();
  }, [activeBook, chapter, lang]);

  const compareKey = activeBook && chapter !== null ? `${compareLang}:${activeBook.id}:${chapter}` : '';

  useEffect(() => {
    if (!compareOn || !activeBook || chapter === null) return;
    let alive = true;
    getBibleChapterVerses(compareLang, activeBook.id, chapter)
      .then((result) => {
        if (alive) setCompareData({ key: `${compareLang}:${activeBook.id}:${chapter}`, rows: result.verses });
      });
    return () => {
      alive = false;
    };
  }, [compareOn, compareLang, activeBook, chapter]);

  // Only use rows that belong to the chapter currently open.
  const compareByVerse = useMemo(() => {
    const map = new Map<number, string>();
    if (compareData.key !== compareKey) return map;
    for (const row of compareData.rows) map.set(row.verse, row.text);
    return map;
  }, [compareData, compareKey]);

  const normalized = query.trim().toLowerCase();

  useEffect(() => {
    if (normalized.length < 2) {
      setVerseHits([]);
      return;
    }
    let alive = true;
    db.bibleVerses
      .where('lang')
      .equals(lang)
      .filter((verse) => visibleBookIds.has(verse.bookId) && verse.text.toLowerCase().includes(normalized))
      .limit(24)
      .toArray()
      .then((rows) => {
        if (alive) setVerseHits(rows);
      });
    return () => {
      alive = false;
    };
  }, [normalized, lang, visibleBookIds]);

  const bookMatches = useMemo(
    () => (normalized ? visibleBooks.filter((b) => bookName(b.id, lang).toLowerCase().includes(normalized)) : []),
    [visibleBooks, normalized, lang]
  );

  const selectTestament = (next: Testament) => {
    setQuery('');
    if (testament === next) {
      setTestament(null);
      setBook(null);
      setChapter(null);
      return;
    }
    setTestament(next);
    setBook(null);
    setChapter(null);
  };

  const openBook = (next: BibleBook) => {
    setQuery('');
    setTestament(next.testament);
    setBook(next);
    setChapter(null);
  };

  const openReference = (bookId: number, targetChapter: number) => {
    const target = visibleBooks.find((b) => b.id === bookId);
    if (!target) return;
    setBookmarksOpen(false);
    setQuery('');
    setTestament(target.testament);
    setBook(target);
    setChapter(targetChapter);
  };

  const isBookmarked = (verse: number) =>
    bookmarks.some((b) => b.bookId === activeBook?.id && b.chapter === chapter && b.verse === verse);

  const toggleBookmark = (verse: BibleVerse) => {
    if (!activeBook || chapter === null) return;
    const existing = bookmarks.find(
      (b) => b.bookId === activeBook.id && b.chapter === chapter && b.verse === verse.verse
    );
    setBookmarks(
      existing
        ? bookmarks.filter((b) => b !== existing)
        : [...bookmarks, { bookId: activeBook.id, chapter, verse: verse.verse, text: verse.text }]
    );
  };

  const removeBookmark = (target: Bookmark) => {
    setBookmarks(bookmarks.filter((b) => b !== target));
  };

  const savedVerses = chapter
    ? chapterVerses.filter((v) => isBookmarked(v.verse)).length
    : 0;

  let body;

  if (normalized) {
    body = (
      <div className="space-y-3">
        {bookMatches.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold tracking-[0.18em] text-[#FACC15] uppercase">{s.books}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {bookMatches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => openBook(b)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left text-[11px] font-semibold text-white transition hover:border-[#FACC15]/60 hover:bg-white/10"
                >
                  {bookName(b.id, lang)}
                </button>
              ))}
            </div>
          </div>
        )}
        {verseHits.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold tracking-[0.18em] text-[#FACC15] uppercase">{s.verses}</p>
            <ul className="space-y-1.5">
              {verseHits.map((verse) => (
                <li key={`${verse.bookId}-${verse.chapter}-${verse.verse}`}>
                  <button
                    type="button"
                    onClick={() => openReference(verse.bookId, verse.chapter)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left transition hover:border-[#FACC15]/50 hover:bg-white/10"
                  >
                    <span className="block text-[10px] font-bold text-[#FACC15]">
                      {bookName(verse.bookId, lang)} {verse.chapter}:{verse.verse}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-white">
                      {verse.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {bookMatches.length === 0 && verseHits.length === 0 && (
          <p className="py-6 text-center text-xs font-medium text-white/92">{s.noResults}</p>
        )}
      </div>
    );
  } else if (activeBook && chapter !== null) {
    body = (
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <BackButton label={s.backToChapters} onClick={() => setChapter(null)} />
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
        <h3 className="mb-2 text-sm font-bold text-white">
          {bookName(activeBook.id, lang)} <span className="font-medium text-white/92">· {s.chapter} {chapter}</span>
          {savedVerses > 0 && <span className="ml-2 text-[10px] font-semibold text-[#FACC15]">★ {savedVerses}</span>}
        </h3>
        {chapterVerses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-xs font-medium text-white/92">
            <p>{s.noVerses}</p>
          </div>
        ) : (
          <div className={compareOn ? 'space-y-2' : 'space-y-1'}>
            {chapterVerses.map((verse) => {
              const saved = isBookmarked(verse.verse);
              const parallel = compareOn ? compareByVerse.get(verse.verse) : undefined;
              return (
                <div
                  key={`${verse.chapter}-${verse.verse}`}
                  className={
                    compareOn
                      ? 'rounded-xl border border-white/16 bg-white/[0.08] px-2.5 py-2 backdrop-blur-[14px]'
                      : 'group flex items-start gap-1.5 rounded-xl px-2 py-1.5 transition hover:bg-white/5'
                  }
                >
                  <div className={compareOn ? 'grid gap-2 sm:grid-cols-2' : 'contents'}>
                    <div className="flex items-start gap-1.5">
                      <p
                        className="flex-1 text-white"
                        style={{ fontSize: `${0.95 * fontScale}rem`, lineHeight: 1.75 }}
                      >
                        <sup className="mr-1.5 text-[0.65em] font-bold text-[#FACC15]">{verse.verse}</sup>
                        {verse.text}
                      </p>
                      <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            activeBook &&
                            setShareCard({
                              reference: `${bookName(activeBook.id, lang)} ${chapter}:${verse.verse}`,
                              text: verse.text
                            })
                          }
                          aria-label={s.shareCard}
                          title={s.shareCard}
                          className="flex h-6 w-6 items-center justify-center rounded-full font-medium text-white/92 transition hover:text-[#FACC15]"
                        >
                          <ShareIcon size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBookmark(verse)}
                          aria-label={saved ? s.removeBookmark : s.bookmarkVerse}
                          title={saved ? s.removeBookmark : s.bookmarkVerse}
                          aria-pressed={saved}
                          className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                            saved ? 'text-[#FACC15]' : 'font-medium text-white/92 hover:text-[#FACC15]'
                          }`}
                        >
                          <StarIcon size={13} filled={saved} />
                        </button>
                      </div>
                    </div>
                    {compareOn && (
                      <p
                        className="whitespace-pre-line border-t border-white/10 pt-1.5 font-medium text-white/92 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2.5"
                        style={{ fontSize: `${0.9 * fontScale}rem`, lineHeight: 1.7 }}
                      >
                        <span className="mr-1.5 text-[0.65em] font-bold tracking-wide text-[#FACC15] uppercase">
                          {LANG_LABELS[compareLang]}:
                        </span>
                        {parallel ?? '—'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  } else if (activeBook) {
    body = (
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <BackButton label={s.backToBooks} onClick={() => setBook(null)} />
          <span className="text-[9px] font-bold tracking-wide text-[#FACC15] uppercase">
            {activeBook.testament === 'old' ? s.oldTestament : s.newTestament}
          </span>
        </div>
        <h3 className="mb-0.5 text-sm font-bold text-white">{bookName(activeBook.id, lang)}</h3>
        <p className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-white/92">
          <span>{activeBook.chapters} {s.chapters}</span>
          {isDeuterocanonical(activeBook.id) && (
            <span className="rounded-full border border-[#FACC15]/30 bg-[#FACC15]/10 px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-[#FACC15] uppercase">
              {s.deuterocanonical}
            </span>
          )}
        </p>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
          {Array.from({ length: activeBook.chapters }, (_, i) => i + 1).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChapter(ch)}
              className="aspect-square rounded-lg border border-white/15 bg-white/5 text-xs font-semibold text-white transition hover:border-[#FACC15]/70 hover:bg-[#FACC15]/20"
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (testament) {
    const list = visibleBooks.filter((b) => b.testament === testament);
    body = (
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold tracking-[0.18em] text-[#FACC15] uppercase">
            {testament === 'old' ? s.oldTestament : s.newTestament}
          </p>
          <span className="text-[10px] font-medium text-white/92">
            {list.length} {s.books}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {list.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => openBook(b)}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left transition hover:border-[#F43F5E]/60 hover:bg-white/10"
            >
              <span className="block truncate text-[11px] font-semibold text-white">{bookName(b.id, lang)}</span>
              <span className="block text-[9px] font-medium text-white/92">
                {b.chapters} {s.chapters}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <p className="rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-xs font-medium text-white/92">
        {s.chooseTestament}
      </p>
    );
  }

  return (
    <section
      aria-labelledby="bible-panel-title"
      className="flex flex-col rounded-3xl border border-white/16 bg-white/[0.08] p-3 shadow-xl backdrop-blur-[14px] sm:p-4"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="bible-panel-title" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#FACC15] to-[#F59E0B] text-[#3B1277] shadow-md">
            <BibleIcon size={17} />
          </span>
          <span className="tuza-card-title truncate text-base font-black tracking-wide text-white uppercase sm:text-lg">{s.bible}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <TraditionSelect lang={lang} value={tradition} onChange={setTradition} />
          <span className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/92">
            {bookCountForTradition(tradition)} {s.books}
          </span>
        </div>
      </header>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-2.5 py-2 focus-within:border-[#FACC15]/70">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={s.searchBible}
            aria-label={s.searchBible}
            className="w-full min-w-0 bg-transparent text-xs text-white outline-none placeholder:text-white/82"
          />
        </div>
        <button
          type="button"
          onClick={() => setBookmarksOpen(true)}
          aria-label={s.bookmarks}
          title={s.bookmarks}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-[#FACC15] transition hover:border-[#FACC15]/60 hover:bg-white/15"
        >
          <StarIcon size={15} filled={bookmarks.length > 0} />
          {bookmarks.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F43F5E] px-1 text-[9px] font-bold text-white keep-white">
              {bookmarks.length}
            </span>
          )}
        </button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <TabCard
          title={s.oldTestament}
          meta={`${oldCount} ${s.books}`}
          icon={<ScrollIcon size={16} />}
          active={testament === 'old'}
          accent="gold"
          onClick={() => selectTestament('old')}
        />
        <TabCard
          title={s.newTestament}
          meta={`${newCount} ${s.books}`}
          icon={<CrossIcon size={16} />}
          active={testament === 'new'}
          accent="coral"
          onClick={() => selectTestament('new')}
        />
      </div>

      <div className="min-h-[7rem] flex-1">{body}</div>

      <ShareCardModal
        open={shareCard !== null}
        onClose={() => setShareCard(null)}
        lang={lang}
        card={shareCard}
      />

      <Modal open={bookmarksOpen} title={s.bookmarks} closeLabel={s.close} onClose={() => setBookmarksOpen(false)}>
        {bookmarks.length === 0 ? (
          <p className="py-6 text-center text-xs font-medium text-white/92">{s.noBookmarks}</p>
        ) : (
          <ul className="space-y-1.5">
            {bookmarks.map((mark) => (
              <li
                key={`${mark.bookId}-${mark.chapter}-${mark.verse}`}
                className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5"
              >
                <button
                  type="button"
                  onClick={() => openReference(mark.bookId, mark.chapter)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-[10px] font-bold text-[#FACC15]">
                    {bookName(mark.bookId, lang)} {mark.chapter}:{mark.verse}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-white">{mark.text}</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeBookmark(mark)}
                  aria-label={s.removeBookmark}
                  title={s.removeBookmark}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-medium text-white/92 transition hover:bg-white/10 hover:text-[#F43F5E]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </section>
  );
}
