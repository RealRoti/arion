import { describe, expect, it as vitestIt } from 'vitest';
import { it } from '@/i18n/it';

describe('Italian dictionary (src/i18n/it.ts)', () => {
  vitestIt('provides non-empty brand, navigation and screen strings', () => {
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
  });
});
