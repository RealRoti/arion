export const THEME_MODES = ['daylight', 'stage_dark', 'oled_black'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export const TEXT_SIZE_MODES = ['compact', 'extended'] as const;

export type TextSizeMode = (typeof TEXT_SIZE_MODES)[number];

export const NOTATION_SYSTEMS = ['italian', 'english'] as const;

export type NotationSystem = (typeof NOTATION_SYSTEMS)[number];

export const THEME_COLORS: Record<ThemeMode, string> = {
  daylight: '#F8F7F4',
  stage_dark: '#111317',
  oled_black: '#000000',
};

export function isThemeMode(value: string): value is ThemeMode {
  return (THEME_MODES as readonly string[]).includes(value);
}

export function isTextSizeMode(value: string): value is TextSizeMode {
  return (TEXT_SIZE_MODES as readonly string[]).includes(value);
}

export function isNotationSystem(value: string): value is NotationSystem {
  return (NOTATION_SYSTEMS as readonly string[]).includes(value);
}
