import { useState } from 'react';
import { ArrowLeft, Eye, Moon, Music2, Sun } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTheme } from '@/components/useTheme';
import { getEffectiveDefaultShowChords } from '@/domain/models/instruments';
import { useAuth } from '@/features/auth/useAuth';
import { DEMO_SONGS } from '@/features/repertoire/demoSongs';
import { it } from '@/i18n/it';

export function SongReaderPage() {
  const { songId } = useParams<{ songId: string }>();
  const { theme, setTheme } = useTheme();
  const { activeInstrument } = useAuth();

  const currentInstrumentId = activeInstrument?.id ?? null;
  const [prevInstrumentId, setPrevInstrumentId] = useState<string | null>(currentInstrumentId);
  const [showChords, setShowChords] = useState<boolean>(() =>
    getEffectiveDefaultShowChords(activeInstrument),
  );
  const [fontScale, setFontScale] = useState(1);

  if (currentInstrumentId !== prevInstrumentId) {
    setPrevInstrumentId(currentInstrumentId);
    setShowChords(getEffectiveDefaultShowChords(activeInstrument));
  }

  const song = DEMO_SONGS.find((item) => item.id === songId);

  if (!song) {
    return (
      <div className="space-y-4">
        <Link
          to="/repertorio"
          className="touch-target inline-flex items-center gap-2 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{it.reader.backToRepertoire}</span>
        </Link>
        <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6">
          <h1 className="font-editorial text-xl font-bold text-[var(--arion-text)]">
            {it.reader.notFoundTitle}
          </h1>
          <p className="mt-1 text-sm text-[var(--arion-text-muted)]">
            {it.reader.notFoundSubtitle}
          </p>
        </div>
      </div>
    );
  }

  const isDarkStage = theme === 'stage_dark' || theme === 'oled_black';

  const decreaseFont = () => {
    setFontScale((prev) => Math.max(0.85, Number((prev - 0.1).toFixed(2))));
  };

  const increaseFont = () => {
    setFontScale((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(2))));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/repertorio"
          className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{it.reader.backToRepertoire}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowChords((prev) => !prev)}
            aria-pressed={showChords}
            className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] shadow-2xs hover:border-[var(--arion-accent)]"
          >
            <Eye className="h-4 w-4 text-[var(--arion-primary)]" aria-hidden="true" />
            <span>{showChords ? it.reader.modeChords : it.reader.modeLyricsOnly}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(isDarkStage ? 'daylight' : 'stage_dark')}
            className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] shadow-2xs hover:border-[var(--arion-accent)]"
          >
            {isDarkStage ? (
              <Sun className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--arion-primary)]" aria-hidden="true" />
            )}
            <span>{isDarkStage ? it.themes.stageToggleToLight : it.themes.stageToggleToDark}</span>
          </button>

          <div className="inline-flex items-center rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={decreaseFont}
              aria-label={it.reader.fontDecreaseLabel}
              className="touch-target rounded px-2.5 py-1 text-xs font-bold text-[var(--arion-text)] hover:bg-[var(--arion-surface-subtle)]"
            >
              {it.reader.fontDecreaseShort}
            </button>
            <span
              aria-label={it.reader.fontScaleLabel}
              className="min-w-[3rem] text-center text-xs font-semibold text-[var(--arion-text-muted)]"
            >
              {Math.round(fontScale * 100)}%
            </span>
            <button
              type="button"
              onClick={increaseFont}
              aria-label={it.reader.fontIncreaseLabel}
              className="touch-target rounded px-2.5 py-1 text-xs font-bold text-[var(--arion-text)] hover:bg-[var(--arion-surface-subtle)]"
            >
              {it.reader.fontIncreaseShort}
            </button>
          </div>
        </div>
      </div>

      <article className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-2xs sm:p-7">
        <header className="border-b border-[var(--arion-border)] pb-4">
          <h1 className="font-editorial text-2xl font-bold text-[var(--arion-text)]">
            {song.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[var(--arion-text-muted)]">
            <span>
              {it.reader.keyPrefix} <strong className="text-[var(--arion-text)]">{song.key}</strong>
            </span>
            <span>
              {it.reader.tempoPrefix}{' '}
              <strong className="text-[var(--arion-text)]">{song.tempo}</strong>
            </span>
            <span>
              {it.reader.authorLabel}{' '}
              <strong className="text-[var(--arion-text)]">{song.author}</strong>
            </span>
            {activeInstrument ? (
              <span className="inline-flex items-center gap-1 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--arion-accent)]">
                <Music2 className="h-3 w-3" aria-hidden="true" />
                <span>{activeInstrument.name}</span>
              </span>
            ) : null}
          </div>
        </header>

        <div
          className="lectern-lyrics mt-5 space-y-6"
          style={{ fontSize: `${fontScale}rem` }}
          data-testid="lectern-song-body"
        >
          {song.sections.map((section) => (
            <section key={section.label} className="space-y-2.5">
              <h2 className="inline-block rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
                {section.label}
              </h2>
              <div className="space-y-3">
                {section.lines.map((line, lineIdx) => (
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
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
