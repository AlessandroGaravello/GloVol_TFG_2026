import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLang, setLang as setLangStorage, type LangCode } from '../lib/i18n';

interface LanguageContextType {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangCode>(getLang());

  const setLang = (code: LangCode) => {
    setLangStorage(code);
    setLangState(code);
  };

  // Sincronizar cambios desde otras pestañas
  useEffect(() => {
    const handleStorage = () => {
      setLangState(getLang());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isRtl = lang === 'ar';

  return (
    <LanguageContext.Provider value={{ lang, setLang, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};