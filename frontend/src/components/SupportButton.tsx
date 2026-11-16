import { useState } from 'react';
import { t, type Lang } from '../i18n';
import SupportModal from './SupportModal';

export default function SupportButton({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 md:px-6 md:py-3 rounded-full text-white keep-white font-bold text-sm md:text-base tracking-wide transition-transform hover:scale-105 glow-coral support-tuza"
        style={{ background: 'linear-gradient(135deg, #F43F5E, #FACC15)', boxShadow: '0 0 18px rgba(244,63,94,0.5), 0 0 30px rgba(250,204,21,0.3)' }}
      >
        <span className="drop-shadow">{t(lang).support}</span>
      </button>
      <SupportModal open={open} onClose={() => setOpen(false)} lang={lang} />
    </>
  );
}
