import { LANGS, LANG_LABELS, t, type Lang } from '../i18n';

export default function LanguageSelector({
  lang,
  onChange
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="lang-select rounded-full px-3 py-2 flex items-center gap-2 shadow-lg">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
      </svg>
      <select
        aria-label={t(lang).language}
        value={lang}
        onChange={(e) => onChange(e.target.value as Lang)}
        className="bg-transparent text-white text-sm font-semibold outline-none cursor-pointer [&>option]:text-slate-900"
      >
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {LANG_LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
