import { Link } from 'react-router-dom';
import BibleExplorer from '../components/BibleExplorer';
import { t, type Lang } from '../i18n';

export default function Bible({ lang }: { lang: Lang }) {
  const s = t(lang);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/92 transition hover:text-[#FACC15]"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {s.home}
      </Link>
      <div className="mt-3">
        <BibleExplorer lang={lang} />
      </div>
    </div>
  );
}
