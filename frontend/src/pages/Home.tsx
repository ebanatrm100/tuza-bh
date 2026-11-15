import BibleExplorer from '../components/BibleExplorer';
import HeroIllustration from '../components/HeroIllustration';
import HymnalExplorer from '../components/HymnalExplorer';
import UnifiedSearch from '../components/UnifiedSearch';
import { useEffect, useState } from 'react';
import { getSeedProgress, subscribeSeedProgress, type SeedProgress } from '../db';
import { t, type Lang } from '../i18n';

export default function Home({ lang }: { lang: Lang }) {
  const s = t(lang);
  const [progress, setProgress] = useState<SeedProgress>(() => getSeedProgress());
  const [showProgress, setShowProgress] = useState(() => !getSeedProgress().done);

  useEffect(() => {
    const unsubscribe = subscribeSeedProgress((p) => {
      setProgress(p);
      if (p.done) {
        setShowProgress(true);
        window.setTimeout(() => setShowProgress(false), 4000);
      } else {
        setShowProgress(true);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
      <div className="mb-4 flex flex-col items-center text-center sm:mb-5">
        <h1 className="text-[1.7rem] leading-[1.05] font-black tracking-tight text-white sm:text-4xl">
          TUZA
          <span className="mx-1.5 text-[#FACC15] glow-gold">BIBLE</span>
          <span className="text-[#F43F5E]">+</span>
          <span className="ml-1.5">HYMNAL</span>
        </h1>

        <div className="mt-2 sm:mt-3">
          <span className="tuza-slogan-pill">
            <span className="tuza-slogan-text text-[0.72rem] sm:text-sm md:text-base">{s.slogan}</span>
          </span>
        </div>

        <p className="mt-1.5 max-w-xl text-[11px] font-medium text-violet-100/85 sm:text-sm">{s.subtitle}</p>

        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-2.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#FACC15] uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#FACC15]" aria-hidden="true" />
          {s.offline}
        </span>

        {showProgress && (
          <div className="mt-2 w-full max-w-xs">
            <div className="rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-3 py-1.5 shadow-[0_0_16px_rgba(250,204,21,0.15)]">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#FACC15] transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-[9px] font-semibold tracking-wide text-[#FACC15]/90">
                {s.offlineSaving.replace('{percent}', String(progress.progress))}
              </p>
            </div>
          </div>
        )}

        <HeroIllustration className="mt-1 w-36 sm:w-44" />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <BibleExplorer lang={lang} />
        <HymnalExplorer lang={lang} />
      </div>

      <UnifiedSearch lang={lang} />
    </div>
  );
}
