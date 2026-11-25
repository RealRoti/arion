import { useState } from 'react';
import { CheckCircle2, Eye, Music2, Smartphone, Sparkles } from 'lucide-react';
import { ArionLogo } from '@/components/ArionLogo';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useTheme } from '@/components/useTheme';
import { getAppEnv } from '@/config/env';
import { THEME_MODES, type ThemeMode } from '@/domain/models/theme';
import { it } from '@/i18n/it';

interface ChordSegment {
  chord: string | null;
  lyric: string;
}

const DEMO_VERSE_LINES: readonly ChordSegment[][] = [
  [
    { chord: 'Do', lyric: 'Canta con gioia, ' },
    { chord: 'Sol/Si', lyric: 'apri la tua ' },
    { chord: 'Lam', lyric: 'voce,' },
  ],
  [
    { chord: 'Fa', lyric: 'ogni nota in' },
    { chord: 'Sol', lyric: 'sieme trova ' },
    { chord: 'Do', lyric: 'armonia.' },
  ],
];

const THEME_LABELS: Record<ThemeMode, string> = {
  stage_dark: it.themes.stageDark,
  oled_black: it.themes.oledBlack,
  daylight: it.themes.daylight,
};

function WorkspaceShell() {
  const { theme, setTheme } = useTheme();
  const [showChords, setShowChords] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const env = getAppEnv();

  const decreaseFont = () => {
    setFontScale((prev) => Math.max(0.85, Number((prev - 0.1).toFixed(2))));
  };

  const increaseFont = () => {
    setFontScale((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(2))));
  };

  return (
    <div className="min-h-screen bg-[var(--arion-bg)] text-[var(--arion-text)]">
      <header className="border-b border-[var(--arion-border)] bg-[var(--arion-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <ArionLogo size="md" showWordmark showSubtitle />

          <div
            role="group"
            aria-label={it.themes.selectorLabel}
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--arion-border)] bg-[var(--arion-bg)] p-1"
          >
            {THEME_MODES.map((mode) => {
              const active = theme === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  aria-pressed={active}
                  className={`touch-target rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[var(--arion-accent)] text-[var(--arion-accent-contrast)]'
                      : 'text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
                  }`}
                >
                  {THEME_LABELS[mode]}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-2xl border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--arion-border)] bg-[var(--arion-surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--arion-accent)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {it.app.milestoneBadge}
            </span>
            <span className="text-xs text-[var(--arion-text-muted)]">
              {env.isSupabaseConfigured ? it.status.envConfigured : it.status.envPending}
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {it.app.defaultGroupName}
          </h1>
          <p className="mt-1 text-sm text-[var(--arion-text-muted)]">{it.app.workspaceIntro}</p>
        </section>

        <section
          aria-labelledby="reader-preview-heading"
          className="rounded-2xl border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--arion-border)] pb-4">
            <div>
              <h2
                id="reader-preview-heading"
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <Music2
                  className="h-5 w-5 text-[var(--arion-accent-secondary)]"
                  aria-hidden="true"
                />
                {it.readerPreview.sectionTitle}
              </h2>
              <p className="mt-0.5 text-sm text-[var(--arion-text-muted)]">
                {it.readerPreview.sectionSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowChords((prev) => !prev)}
                aria-pressed={showChords}
                className="touch-target inline-flex items-center gap-2 rounded-xl border border-[var(--arion-border)] bg-[var(--arion-surface-elevated)] px-3.5 py-2 text-sm font-semibold text-[var(--arion-text)] transition-colors hover:border-[var(--arion-accent)]"
              >
                <Eye className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
                {showChords ? it.readerPreview.modeChords : it.readerPreview.modeLyricsOnly}
              </button>

              <div className="flex items-center gap-1 rounded-xl border border-[var(--arion-border)] bg-[var(--arion-bg)] p-1">
                <button
                  type="button"
                  onClick={decreaseFont}
                  aria-label={it.readerPreview.fontDecreaseLabel}
                  className="touch-target rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--arion-text)] hover:bg-[var(--arion-surface-elevated)]"
                >
                  {it.readerPreview.fontDecreaseShort}
                </button>
                <span
                  aria-label={it.readerPreview.fontScaleLabel}
                  className="min-w-[3.2rem] text-center text-xs font-medium text-[var(--arion-text-muted)]"
                >
                  {Math.round(fontScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={increaseFont}
                  aria-label={it.readerPreview.fontIncreaseLabel}
                  className="touch-target rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--arion-text)] hover:bg-[var(--arion-surface-elevated)]"
                >
                  {it.readerPreview.fontIncreaseShort}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--arion-border)] bg-[var(--arion-bg)] p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-bold text-[var(--arion-text)]">
                {it.readerPreview.demoSongTitle}
              </h3>
              <span className="text-xs font-medium text-[var(--arion-text-muted)]">
                {it.readerPreview.demoSongMeta}
              </span>
            </div>

            <div className="mb-3 inline-block rounded-md bg-[var(--arion-surface-elevated)] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[var(--arion-accent)]">
              {it.readerPreview.verseLabel}
            </div>

            <div
              className="lectern-lyrics space-y-4"
              style={{ fontSize: `${fontScale}rem` }}
              data-testid="lectern-preview-body"
            >
              {DEMO_VERSE_LINES.map((line, lineIdx) => (
                <div key={lineIdx} className="flex flex-wrap items-end">
                  {line.map((segment, segIdx) => (
                    <span key={segIdx} className="inline-flex flex-col whitespace-pre">
                      {showChords ? (
                        <span className="lectern-chord text-[0.9em] leading-tight">
                          {segment.chord ?? '\u00A0'}
                        </span>
                      ) : null}
                      <span>{segment.lyric}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="status-heading"
          className="rounded-2xl border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-sm sm:p-6"
        >
          <h2 id="status-heading" className="flex items-center gap-2 text-base font-semibold">
            <Smartphone className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            {it.status.sectionTitle}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              it.status.pwaReady,
              it.status.strictTs,
              it.status.italianUi,
              it.status.marineStage,
            ].map((label) => (
              <li
                key={label}
                className="flex items-center gap-2.5 rounded-xl border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3.5 py-2.5 text-sm"
              >
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-[var(--arion-accent-secondary)]"
                  aria-hidden="true"
                />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <WorkspaceShell />
    </ThemeProvider>
  );
}

export default App;
