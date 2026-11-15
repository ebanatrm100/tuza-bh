import { Link } from 'react-router-dom';
import HymnalExplorer from '../components/HymnalExplorer';
import { t, type Lang } from '../i18n';

export default function Hymns({ lang }: { lang: Lang }) {
  const s = t(lang);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-100/75 transition hover:text-[#FACC15]"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        {s.home}
      </Link>
      <div className="mt-3">
        <HymnalExplorer lang={lang} />
      </div>
    </div>
  );
}
