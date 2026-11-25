import { describe, expect, it as vitestIt } from 'vitest';
import { it } from '@/i18n/it';

describe('Italian dictionary (src/i18n/it.ts)', () => {
  vitestIt('provides non-empty brand and UI strings', () => {
    expect(it.app.name).toBe('Arion');
    expect(it.app.subtitle.length).toBeGreaterThan(0);
    expect(it.themes.stageDark.length).toBeGreaterThan(0);
    expect(it.themes.oledBlack.length).toBeGreaterThan(0);
    expect(it.themes.daylight.length).toBeGreaterThan(0);
    expect(it.readerPreview.modeLyricsOnly).toBe('Solo Testo');
    expect(it.readerPreview.modeChords).toBe('Testo + Accordi');
  });
});
