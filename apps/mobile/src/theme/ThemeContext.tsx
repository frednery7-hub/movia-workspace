import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  getAppTheme,
  type AppColorScheme,
  type AppTheme,
  type AppThemeMode,
} from './colors';

const THEME_MODE_STORAGE_KEY = 'movia_theme_mode';

type ThemeContextValue = {
  themeMode: AppThemeMode;
  effectiveTheme: AppColorScheme;
  theme: AppTheme;
  setThemeMode: (mode: AppThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  effectiveTheme: 'light',
  theme: getAppTheme('light'),
  setThemeMode: () => undefined,
});

function isThemeMode(value: string | null): value is AppThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<AppThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_STORAGE_KEY).then(value => {
      if (isThemeMode(value)) setThemeModeState(value);
    }).catch(() => undefined);
  }, []);

  const setThemeMode = useCallback((mode: AppThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, mode).catch(() => undefined);
  }, []);

  const effectiveTheme: AppColorScheme = themeMode === 'system'
    ? systemColorScheme === 'dark' ? 'dark' : 'light'
    : themeMode;

  const value = useMemo<ThemeContextValue>(() => ({
    themeMode,
    effectiveTheme,
    theme: getAppTheme(effectiveTheme),
    setThemeMode,
  }), [effectiveTheme, setThemeMode, themeMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext).theme;
}

export function useThemeController(): ThemeContextValue {
  return useContext(ThemeContext);
}
