import { useEffect, useRef, useState } from 'react';
import {
  TRADITIONS,
  traditionLabel,
  traditionShortLabel,
  type Tradition
} from '../data/traditions';
import { t, type Lang } from '../i18n';
import { ChevronIcon } from './icons';

interface TraditionSelectProps {
  lang: Lang;
  value: Tradition;
  onChange: (next: Tradition) => void;
}

export default function TraditionSelect({ lang, value, onChange }: TraditionSelectProps) {
  const s = t(lang);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const choose = (next: Tradition) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`${s.churchTradition}: ${traditionLabel(value, s)}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`${s.churchTradition}: ${traditionLabel(value, s)}`}
        className="flex h-8 max-w-[9.25rem] items-center gap-1 rounded-full border border-[#FACC15]/40 bg-white/10 py-1 pr-2 pl-2.5 text-[10px] font-bold tracking-wide text-[#FACC15] shadow-[0_0_14px_rgba(250,204,21,0.14)] backdrop-blur-md transition hover:border-[#FACC15]/70 hover:bg-white/15 focus:border-[#FACC15]/85 focus:outline-none sm:max-w-[11rem] sm:text-[11px]"
      >
        <span className="truncate">{traditionShortLabel(value, s)}</span>
        <span className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <ChevronIcon size={11} />
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={s.churchTradition}
          className="absolute right-0 z-40 mt-1 w-64 overflow-hidden rounded-xl border border-[#FACC15]/30 bg-[#2B0F5C]/95 p-1 shadow-2xl backdrop-blur-xl"
        >
          {TRADITIONS.map((tradition) => {
            const selected = tradition === value;
            return (
              <li key={tradition} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(tradition)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition ${
                    selected
                      ? 'bg-[#FACC15] text-[#3B1277]'
                      : 'text-violet-50 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {traditionLabel(tradition, s)}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
