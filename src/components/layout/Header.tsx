import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { LANGUAGES, setLang, t, getLang, type LangCode } from '../../lib/i18n';

function useTheme() {
  const [dark, setDark] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem('glovol_theme');
    let isDark: boolean;
    if (saved) {
      isDark = saved === 'dark';
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    setDark(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggle = () => {
    if (dark === undefined) return;
    const next = !dark;
    setDark(next);
    localStorage.setItem('glovol_theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return { dark, toggle };
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLangState] = useState<LangCode>(getLang());
  const { dark, toggle } = useTheme();

  // Escuchar cambios de idioma desde otros componentes
  useEffect(() => {
    const handler = (e: Event) => {
      setLangState((e as CustomEvent).detail as LangCode);
    };
    window.addEventListener('glovol:lang', handler);
    return () => window.removeEventListener('glovol:lang', handler);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  const handleLangChange = (code: LangCode) => {
    setLang(code);
    setLangState(code);
    setLangOpen(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];
  const isRtl = lang === 'ar';

  return (
    <header
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-800 h-14 flex items-center px-4 gap-4 w-full"
    >
      {/* Logo */}
      <a href="/" className="flex items-center gap-1.5 flex-shrink-0">
        <span style={{ color: 'var(--gv-accent)' }} className="font-bold text-xl tracking-tight">GloVol</span>
      </a>

      {/* Buscador centrado */}
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('header.search', lang)}
            className="w-full pl-9 pr-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Contenedor de acciones (sin flex-row-reverse para que dir="rtl" haga la inversión) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Selector idioma */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1 text-zinc-400 hover:text-white text-sm transition px-2 py-1.5 rounded-lg hover:bg-zinc-900"
          >
            <span className="text-base leading-none">{currentLang.flag}</span>
            <span className="font-medium text-xs">{currentLang.code.toUpperCase()}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-20 overflow-hidden min-w-[160px]">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => handleLangChange(l.code)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${lang === l.code ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                    <span className="text-base">{l.flag}</span>
                    <span>{l.label}</span>
                    {lang === l.code && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 ml-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Icono de perfil / login */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-medium hover:bg-zinc-600 transition"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.displayName?.charAt(0).toUpperCase() ?? 'U'
              )}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-20">
                  <div className="px-4 py-3 border-b border-zinc-700">
                    <p className="text-white text-sm font-medium truncate">{user.displayName}</p>
                    <p className="text-zinc-500 text-xs truncate">{user.email}</p>
                  </div>
                  <a href="/profile/me" className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {t('header.myProfile', lang)}
                  </a>
                  <a href="/profile/edit" className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                    {t('header.settings', lang)}
                  </a>
                  <a href="/notifications" className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    Notificaciones
                  </a>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition border-t border-zinc-700 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    {t('header.logout', lang)}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <a href="/profile/me" className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </a>
        )}

        {/* Toggle dark/light con corrección para RTL */}
        <button
          onClick={toggle}
          aria-label="Cambiar tema"
          className="relative inline-flex items-center flex-shrink-0"
        >
          <span
            suppressHydrationWarning
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
              dark === undefined ? 'bg-zinc-600' : dark ? 'bg-zinc-600' : 'bg-zinc-300'
            }`}
          >
            <span
              suppressHydrationWarning
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-200 ${
                dark === undefined
                  ? 'translate-x-0.5 rtl:-translate-x-0.5'
                  : dark
                    ? 'translate-x-5 rtl:-translate-x-5'
                    : 'translate-x-0.5 rtl:-translate-x-0.5'
              }`}
            >
              {dark === undefined ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-zinc-700" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              ) : dark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-zinc-700" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.592-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              )}
            </span>
          </span>
        </button>

        {/* Tres puntos */}
        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
    </header>
  );
}