import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import InstallAppButton from './components/InstallAppButton';
import LanguageSelector from './components/LanguageSelector';
import SupportButton from './components/SupportButton';
import Home from './pages/Home';
import Bible from './pages/Bible';
import Hymns from './pages/Hymns';
import { seedOfflineData } from './db';
import { t, type Lang } from './i18n';
import { initDailyNotifications, requestDailyNotificationPermission, sendTestNotification } from './lib/notifications';

function BackgroundDecor() {
  return (
    <>
      <div className="pointer-events-none absolute -top-6 -left-6 h-48 w-48 md:h-64 md:w-64 dots-grid opacity-70 [mask-image:radial-gradient(circle_at_top_left,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 md:h-64 md:w-64 dots-grid opacity-60 [mask-image:radial-gradient(circle_at_bottom_right,black,transparent_70%)]" />
      <div className="pointer-events-none absolute top-24 right-[-10%] h-72 w-72 rounded-full bg-[#F43F5E]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-[-8%] h-72 w-72 rounded-full bg-[#FACC15]/15 blur-3xl" />

      <div className="wave pointer-events-none absolute right-0 bottom-0 left-0">
        <svg viewBox="0 0 1440 160" preserveAspectRatio="none">
          <path
            className="shape-fill"
            d="M0,96 C240,160 360,32 720,64 C1080,96 1200,0 1440,48 L1440,160 L0,160 Z"
          />
        </svg>
      </div>
      <div className="wave pointer-events-none absolute right-0 bottom-0 left-0">
        <svg viewBox="0 0 1440 160" preserveAspectRatio="none">
          <path
            d="M0,120 C320,64 480,160 760,128 C1040,96 1200,160 1440,112 L1440,160 L0,160 Z"
            fill="rgba(250,204,21,0.08)"
          />
        </svg>
      </div>
    </>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('tuza-lang');
    return saved === 'en' || saved === 'sw' || saved === 'fr' || saved === 'rw' ? saved : 'rw';
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() =>
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [notifBannerDismissed, setNotifBannerDismissed] = useState<boolean>(
    () => localStorage.getItem('tuza-notif-banner-dismissed') === '1'
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('tuza-theme') === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('tuza-theme', theme);
  }, [theme]);

  const s = t(lang);

  useEffect(() => {
    localStorage.setItem('tuza-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    seedOfflineData();
    void initDailyNotifications().then(() => {
      if ('Notification' in window) setNotifPermission(Notification.permission);
    });
  }, []);

  const isInstalledContext =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    localStorage.getItem('tuza-installed') === '1';

  const handleEnableDailyReminders = async () => {
    const granted = await requestDailyNotificationPermission();
    if ('Notification' in window) setNotifPermission(Notification.permission);
    if (granted) {
      setNotifBannerDismissed(true);
      localStorage.setItem('tuza-notif-banner-dismissed', '1');
    }
  };

  const dismissNotifBanner = () => {
    setNotifBannerDismissed(true);
    localStorage.setItem('tuza-notif-banner-dismissed', '1');
  };

  return (
    <BrowserRouter>
      <div className="tuza-bg flex min-h-screen flex-col">
        <BackgroundDecor />

        {notifPermission === 'default' && !notifBannerDismissed && isInstalledContext && (
          <div className="fixed top-3 left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 rounded-2xl border border-[#FACC15]/40 bg-[#5B21B6]/95 px-4 py-3 text-white shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">{s.dailyRemindersBanner}</span>
              <button
                type="button"
                onClick={handleEnableDailyReminders}
                className="ml-auto rounded-full bg-[#FACC15] px-3 py-1 text-xs font-bold text-[#431888] transition-transform hover:scale-105"
              >
                {s.enableDailyReminders}
              </button>
              <button
                type="button"
                onClick={dismissNotifBanner}
                aria-label={s.close}
                className="text-lg leading-none text-white hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <header className="relative z-20 flex items-start justify-between gap-3 px-4 pt-4 md:px-8 md:pt-6">
          <SupportButton lang={lang} />
          <div className="flex items-center gap-2">
            {notifPermission === 'default' && (
              <button
                type="button"
                onClick={handleEnableDailyReminders}
                className="lang-select rounded-full px-3 py-2 flex items-center gap-2 shadow-lg text-white font-semibold text-sm transition-transform hover:scale-105"
                aria-label={s.enableDailyReminders}
                title={s.enableDailyReminders}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => { void sendTestNotification(); }}
              className="lang-select rounded-full px-3 py-2 flex items-center gap-2 shadow-lg text-white font-semibold text-sm transition-transform hover:scale-105"
              aria-label="Test Notification Now"
              title="Test Notification Now"
            >
              Test Notification Now
            </button>
            <InstallAppButton lang={lang} />
            <button
              type="button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              className="lang-select rounded-full px-3 py-2 flex items-center gap-2 shadow-lg text-white font-semibold text-sm transition-transform hover:scale-105"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <LanguageSelector lang={lang} onChange={setLang} />
          </div>
        </header>

        <main className="relative z-10 flex flex-1 flex-col px-4 pt-4 pb-20 md:px-8">
          <Routes>
            <Route path="/" element={<Home lang={lang} />} />
            <Route path="/bible" element={<Bible lang={lang} />} />
            <Route path="/hymns" element={<Hymns lang={lang} />} />
            <Route path="*" element={<Home lang={lang} />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}