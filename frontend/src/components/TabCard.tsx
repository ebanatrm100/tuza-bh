import { type ReactNode } from 'react';

export default function TabCard({
  title,
  meta,
  icon,
  active,
  accent,
  onClick
}: {
  title: string;
  meta: string;
  icon: ReactNode;
  active: boolean;
  accent: 'gold' | 'coral';
  onClick: () => void;
}) {
  const accentIcon =
    accent === 'gold'
      ? 'from-[#FACC15] to-[#F59E0B] text-[#3B1277]'
      : 'from-[#F43F5E] to-[#9F1239] text-white';
  const activeCard =
    accent === 'gold'
      ? 'border-[#FACC15]/80 bg-gradient-to-br from-[#FACC15]/25 via-[#FACC15]/10 to-transparent shadow-[0_0_26px_rgba(250,204,21,0.25)]'
      : 'border-[#F43F5E]/80 bg-gradient-to-br from-[#F43F5E]/25 via-[#F43F5E]/10 to-transparent shadow-[0_0_26px_rgba(244,63,94,0.28)]';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex min-h-[5.5rem] flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left transition duration-200 ${
        active ? activeCard : 'border-white/15 bg-white/[0.06] hover:border-white/30 hover:bg-white/10'
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br shadow-md ${accentIcon} ${
          active ? '' : 'opacity-80 group-hover:opacity-100'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] leading-tight font-extrabold tracking-wide text-white keep-white uppercase sm:text-xs">
          {title}
        </span>
        <span className="mt-0.5 block text-[10px] font-medium text-white/92">{meta}</span>
      </span>
    </button>
  );
}
