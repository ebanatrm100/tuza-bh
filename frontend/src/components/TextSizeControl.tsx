const MIN = 0.85;
const MAX = 1.7;

export default function TextSizeControl({
  label,
  increaseLabel,
  decreaseLabel,
  scale,
  onChange
}: {
  label: string;
  increaseLabel: string;
  decreaseLabel: string;
  scale: number;
  onChange: (next: number) => void;
}) {
  const step = (delta: number) => {
    const next = Math.min(MAX, Math.max(MIN, Math.round((scale + delta) * 100) / 100));
    onChange(next);
  };

  return (
    <div
      role="group"
      aria-label={label}
      title={label}
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/15 bg-white/5 px-1 py-0.5"
    >
      <button
        type="button"
        onClick={() => step(-0.1)}
        disabled={scale <= MIN}
        aria-label={decreaseLabel}
        title={decreaseLabel}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white/92 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
      >
        A−
      </button>
      <span aria-hidden="true" className="text-[10px] font-bold tracking-wide text-[#FACC15]">
        Aa
      </span>
      <button
        type="button"
        onClick={() => step(0.1)}
        disabled={scale >= MAX}
        aria-label={increaseLabel}
        title={increaseLabel}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white/92 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
      >
        A+
      </button>
    </div>
  );
}
