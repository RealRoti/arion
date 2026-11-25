import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { isThemeMode, THEME_COLORS, type ThemeMode } from '@/domain/models/theme';
import { ThemeContext } from '@/components/useTheme';

const STORAGE_KEY = 'arion:theme';

function readInitialTheme(defaultTheme: ThemeMode): ThemeMode {
  if (typeof window === 'undefined') {
    return defaultTheme;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isThemeMode(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage read failures in restricted environments
  }
  return defaultTheme;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
}

export function ThemeProvider({ children, defaultTheme = 'stage_dark' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readInitialTheme(defaultTheme));

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage write failures in restricted environments
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', THEME_COLORS[theme]);
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
