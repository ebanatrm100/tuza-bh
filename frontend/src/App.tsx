import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import LanguageSelector from './components/LanguageSelector';
import SupportButton from './components/SupportButton';
import Home from './pages/Home';
import Bible from './pages/Bible';
import Hymns from './pages/Hymns';
import { seedOfflineData } from './db';
import { type Lang } from './i18n';

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

  useEffect(() => {
    localStorage.setItem('tuza-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    seedOfflineData();
  }, []);

  return (
    <BrowserRouter>
      <div className="tuza-bg flex min-h-screen flex-col">
        <BackgroundDecor />

        <header className="relative z-20 flex items-start justify-between gap-3 px-4 pt-4 md:px-8 md:pt-6">
          <SupportButton lang={lang} />
          <LanguageSelector lang={lang} onChange={setLang} />
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