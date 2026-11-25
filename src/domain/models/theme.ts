export const THEME_MODES = ['stage_dark', 'oled_black', 'daylight'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export type NotationSystem = 'italian' | 'english';

export const THEME_COLORS: Record<ThemeMode, string> = {
  stage_dark: '#070B14',
  oled_black: '#000000',
  daylight: '#FAFAF9',
};

export function isThemeMode(value: string): value is ThemeMode {
  return (THEME_MODES as readonly string[]).includes(value);
}
