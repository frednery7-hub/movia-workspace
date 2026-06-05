import React, { createContext, useContext } from 'react';
import { t, SupportedLocale } from '../i18n';

interface LocaleContextValue {
  locale: SupportedLocale;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'es-CL',
  t: (key: string) => key,
});

export function LocaleProvider({
  locale,
  children,
}: { locale: SupportedLocale; children: React.ReactNode }) {
  const translate = (key: string) => t(key, locale);
  return (
    <LocaleContext.Provider value={{ locale, t: translate }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export type { SupportedLocale };
