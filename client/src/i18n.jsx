import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext({ lang: 'ar', setLang() {}, t: (a) => a });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('lamaa_lang') || 'ar'; } catch { return 'ar'; } });
  useEffect(() => {
    try { localStorage.setItem('lamaa_lang', lang); } catch { /* تخزين غير متاح */ }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  // t('عربي', 'English') — يعيد النص حسب اللغة الحالية
  const t = (ar, en) => (lang === 'en' && en !== undefined ? en : ar);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
