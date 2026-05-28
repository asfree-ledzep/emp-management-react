import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from './translations';

const LangContext = createContext(null);

/**
 * 앱 최상위에 감싸는 언어 Provider
 * <LangProvider><App /></LangProvider>
 */
export function LangProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem('lang') || 'ko'
  );

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'ko' ? 'en' : 'ko';
      localStorage.setItem('lang', next);
      return next;
    });
  }, []);

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

/**
 * 번역 훅
 *
 * const { t, lang, toggleLang } = useLang();
 * t('logout')               → '로그아웃' | 'Logout'
 * t('leaveUsed', { total: 15, used: 3 })  → '총 15일 중 사용 3일'
 */
export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');

  const { lang, toggleLang } = ctx;
  const dict = translations[lang] || translations['ko'];

  const t = useCallback((key, vars) => {
    let str = dict[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
    }
    return str;
  }, [dict]);

  return { t, lang, toggleLang };
}
