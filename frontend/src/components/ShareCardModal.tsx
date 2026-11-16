import { useEffect, useState } from 'react';
import Modal from './Modal';
import { t, type Lang } from '../i18n';
import { downloadBlob, generateShareCardBlob, type ShareCardOptions } from '../lib/shareCard';
import { DownloadIcon, ShareIcon } from './icons';

export default function ShareCardModal({
  open,
  onClose,
  lang,
  card
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  card: ShareCardOptions | null;
}) {
  const s = t(lang);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !card) return;
    let alive = true;
    let objectUrl: string | null = null;
    setBusy(true);
    setNote('');
    generateShareCardBlob(card)
      .then((nextBlob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(nextBlob);
        setBlob(nextBlob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (alive) setNote(s.shareFailed);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card]);

  const filename = `tuza-${(card?.reference ?? 'card').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;

  const handleDownload = () => {
    if (!blob) return;
    downloadBlob(blob, filename);
  };

  const handleShare = async () => {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    try {
      if (nav.share) {
        const shareData: ShareData = {
          title: 'TUZA BIBLE+HYMNAL',
          text: card?.reference ? `${card.reference} — TUZA BIBLE+HYMNAL` : 'TUZA BIBLE+HYMNAL',
          files: [file]
        };
        if (!nav.canShare || nav.canShare(shareData)) {
          await nav.share(shareData);
          return;
        }
        await nav.share({ title: shareData.title, text: shareData.text });
        return;
      }
      handleDownload();
    } catch {
      // user cancelled or share not permitted; keep the card available
    }
  };

  return (
    <Modal open={open} title={s.shareCard} closeLabel={s.close} onClose={onClose}>
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-[#FACC15]/40 bg-white/5 shadow-[0_0_28px_rgba(250,204,21,0.2)]">
          {previewUrl ? (
            <img src={previewUrl} alt={card?.reference ?? s.shareCard} className="block w-full" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-xs font-medium text-white/92">
              {busy ? s.supportProcessing : note}
            </div>
          )}
        </div>

        {note && <p className="text-[11px] font-semibold text-rose-300">{note}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleShare}
            disabled={busy || !blob}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#F59E0B] px-3 py-2.5 text-xs font-black tracking-wide text-[#2B0F5C] shadow-[0_0_20px_rgba(250,204,21,0.4)] transition hover:scale-[1.02] disabled:opacity-50"
          >
            <ShareIcon size={14} />
            {s.share}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy || !blob}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-bold text-white transition hover:border-[#FACC15]/60 hover:bg-white/15 disabled:opacity-50"
          >
            <DownloadIcon size={14} />
            {s.downloadImage}
          </button>
        </div>
      </div>
    </Modal>
  );
}
