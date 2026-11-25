import { createContext, useContext } from 'react';
import type { NotationSystem, TextSizeMode, ThemeMode } from '@/domain/models/theme';

export interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (nextTheme: ThemeMode) => void;
  textSize: TextSizeMode;
  setTextSize: (nextSize: TextSizeMode) => void;
  notation: NotationSystem;
  setNotation: (nextNotation: NotationSystem) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
