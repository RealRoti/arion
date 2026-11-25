import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  isNotationSystem,
  isTextSizeMode,
  isThemeMode,
  THEME_COLORS,
  type NotationSystem,
  type TextSizeMode,
  type ThemeMode,
} from '@/domain/models/theme';
import { ThemeContext } from '@/components/useTheme';

const THEME_STORAGE_KEY = 'arion:theme';
const TEXT_SIZE_STORAGE_KEY = 'arion:text-size';
const NOTATION_STORAGE_KEY = 'arion:notation';

function readStoredValue<T extends string>(
  key: string,
  guard: (value: string) => value is T,
  fallback: T,
): T {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const stored = window.localStorage.getItem(key);
    if (stored && guard(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage read failures in restricted environments
  }
  return fallback;
}

function writeStoredValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures in restricted environments
  }
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  defaultTextSize?: TextSizeMode;
  defaultNotation?: NotationSystem;
}

export function ThemeProvider({
  children,
  defaultTheme = 'daylight',
  defaultTextSize = 'compact',
  defaultNotation = 'italian',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    readStoredValue(THEME_STORAGE_KEY, isThemeMode, defaultTheme),
  );
  const [textSize, setTextSizeState] = useState<TextSizeMode>(() =>
    readStoredValue(TEXT_SIZE_STORAGE_KEY, isTextSizeMode, defaultTextSize),
  );
  const [notation, setNotationState] = useState<NotationSystem>(() =>
    readStoredValue(NOTATION_STORAGE_KEY, isNotationSystem, defaultNotation),
  );

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    writeStoredValue(THEME_STORAGE_KEY, nextTheme);
  }, []);

  const setTextSize = useCallback((nextSize: TextSizeMode) => {
    setTextSizeState(nextSize);
    writeStoredValue(TEXT_SIZE_STORAGE_KEY, nextSize);
  }, []);

  const setNotation = useCallback((nextNotation: NotationSystem) => {
    setNotationState(nextNotation);
    writeStoredValue(NOTATION_STORAGE_KEY, nextNotation);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', THEME_COLORS[theme]);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
  }, [textSize]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        textSize,
        setTextSize,
        notation,
        setNotation,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
