import { useEffect, useState } from 'react';
import { t, type Lang } from '../i18n';
import Modal from './Modal';
import { requestDailyNotificationPermission } from '../lib/notifications';

type Platform = 'ios' | 'android' | 'windows' | 'linux' | 'other';

// Capture the install prompt as early as possible, before React mounts, so we
// never miss `beforeinstallprompt` (e.g. under StrictMode double-mounting).
let capturedPrompt: any = null;
const promptSubscribers = new Set<(prompt: any) => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event: any) => {
    event.preventDefault();
    capturedPrompt = event;
    promptSubscribers.forEach((cb) => cb(event));
  });
  window.addEventListener('appinstalled', () => {
    capturedPrompt = null;
    try { localStorage.setItem('tuza-installed', '1'); } catch {}
    promptSubscribers.forEach((cb) => cb(null));
  });
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Linux/.test(ua)) return 'linux';
  return 'other';
}

function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function AddressBarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline-block align-middle">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <rect x="3" y="17" width="18" height="4" rx="1" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/10 text-white" aria-hidden="true">
      ⋮
    </span>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline-block align-middle">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function HomeScreenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline-block align-middle">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

export default function InstallAppButton({ lang }: { lang: Lang }) {
  const s = t(lang);
  const [platform] = useState<Platform>(detectPlatform);
  const [installed, setInstalled] = useState<boolean>(() => isStandaloneMode());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => capturedPrompt);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) setInstalled(true);

    const onPromptChange = (prompt: any) => setDeferredPrompt(prompt);
    promptSubscribers.add(onPromptChange);
    setDeferredPrompt(capturedPrompt);

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem('tuza-installed', '1');
      void requestDailyNotificationPermission();
    };
    const onDisplayChange = () => {
      if (isStandaloneMode()) setInstalled(true);
    };

    window.addEventListener('appinstalled', onInstalled);
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener?.('change', onDisplayChange);

    return () => {
      promptSubscribers.delete(onPromptChange);
      window.removeEventListener('appinstalled', onInstalled);
      mql.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  const handleClick = async () => {
    if (installed) return;
    void requestDailyNotificationPermission();
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result?.outcome === 'accepted') setInstalled(true);
      } catch {
        // Fall through to instructions modal.
        setOpen(true);
      } finally {
        setDeferredPrompt(null);
      }
    } else {
      setOpen(true);
    }
  };

  if (installed) {
    return (
      <div className="lang-select rounded-full px-3 py-2 flex items-center gap-2 shadow-lg text-emerald-200 text-sm font-semibold">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span className="whitespace-nowrap">{s.installedOffline}</span>
      </div>
    );
  }

  const isDesktop = platform === 'windows' || platform === 'linux' || platform === 'other';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="lang-select rounded-full px-3 py-2 flex items-center gap-2 shadow-lg text-white font-semibold text-sm transition-transform hover:scale-105"
        aria-label={s.installApp}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        <span className="whitespace-nowrap">{s.installApp}</span>
      </button>

      <Modal open={open} title={s.installApp} closeLabel={s.close} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          {isDesktop && (
            <>
              <p className="text-sm text-violet-100/90">
                Install TUZA BIBLE+HYMNAL as a desktop app that works 100% offline.
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FACC15]/20 text-sm font-bold text-[#FACC15]">
                    1
                  </span>
                  <span className="text-sm text-white">
                    Click the Install icon <AddressBarIcon /> in your browser&apos;s address bar.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FACC15]/20 text-sm font-bold text-[#FACC15]">
                    2
                  </span>
                  <span className="text-sm text-white">
                    Or open the browser Menu <MenuIcon /> → &quot;Install TUZA BIBLE+HYMNAL&quot;.
                  </span>
                </li>
              </ol>
            </>
          )}

          {platform === 'android' && (
            <>
              <p className="text-sm text-violet-100/90">
                Add TUZA BIBLE+HYMNAL to your home screen for offline access.
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FACC15]/20 text-sm font-bold text-[#FACC15]">
                    1
                  </span>
                  <span className="text-sm text-white">
                    Tap the browser Menu <MenuIcon />.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FACC15]/20 text-sm font-bold text-[#FACC15]">
                    2
                  </span>
                  <span className="text-sm text-white">
                    Choose &quot;Install app&quot; or &quot;Add to Home screen&quot; <HomeScreenIcon />.
                  </span>
                </li>
              </ol>
            </>
          )}

          {platform === 'ios' && (
            <>
              <p className="text-sm text-violet-100/90">
                Add TUZA BIBLE+HYMNAL to your home screen for offline access.
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FACC15]/20 text-sm font-bold text-[#FACC15]">
                    1
                  </span>
                  <span className="text-sm text-white">
                    Tap the Share icon <ShareIcon /> at the bottom (or top) of Safari.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FACC15]/20 text-sm font-bold text-[#FACC15]">
                    2
                  </span>
                  <span className="text-sm text-white">
                    Scroll down and tap &quot;Add to Home Screen&quot; <HomeScreenIcon />.
                  </span>
                </li>
              </ol>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
