import { useState, useEffect } from 'react';
import { getLang, type LangCode } from '../lib/i18n';

export function useLang(): LangCode {
  const [lang, setLang] = useState<LangCode>(getLang);

  useEffect(() => {
    const handler = (e: Event) => {
      setLang((e as CustomEvent).detail as LangCode);
    };
    window.addEventListener('glovol:lang', handler);
    return () => window.removeEventListener('glovol:lang', handler);
  }, []);

  return lang;
}
