import { describe, expect, it as vitestIt } from 'vitest';
import { APP_VERSION } from '@/config/env';
import { it } from '@/i18n/it';

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStringValues(entry));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((entry) => collectStringValues(entry));
  }
  return [];
}

describe('Italian dictionary (src/i18n/it.ts)', () => {
  vitestIt('provides non-empty brand, navigation, releases and avoids em-dashes', () => {
    expect(it.app.name).toBe('Arion');
    expect(it.app.subtitle.length).toBeGreaterThan(0);
    expect(it.nav.home).toBe('Home');
    expect(it.nav.repertoire).toBe('Repertorio');
    expect(it.nav.live).toBe('Live');
    expect(it.nav.calendar).toBe('Calendario');
    expect(it.nav.more).toBe('Altro');
    expect(it.themes.daylight).toBe('Chiaro');
    expect(it.themes.stageDark).toBe('Palco Notturno');
    expect(it.themes.oledBlack).toBe('Nero OLED');
    expect(it.reader.modeLyricsOnly).toBe('Solo Testo');
    expect(it.reader.modeChords).toBe('Testo + Accordi');
    expect(it.guide.articles.length).toBeGreaterThanOrEqual(3);
    expect(it.devInfo.changelogReleases[0]?.version).toBe(APP_VERSION);

    const allStrings = collectStringValues(it);
    expect(allStrings.every((text) => !text.includes('—'))).toBe(true);
  });
});
