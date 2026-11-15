import { useEffect, type ReactNode } from 'react';

export default function Modal({
  open,
  title,
  closeLabel,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#1B0736]/70 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-white/20 bg-[#2B0F5C]/95 p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-extrabold tracking-[0.18em] text-[#FACC15] uppercase">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-violet-100/80 transition hover:border-white/30 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
