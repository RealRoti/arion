import { ArrowRight, ListMusic, X } from 'lucide-react';
import type { Song } from '@/domain/models/songs';
import { it } from '@/i18n/it';

interface LiveNextSongBannerProps {
  readonly nextSong: Song | null;
  readonly nextKeyLabel: string | null;
  readonly readingHintLabel?: string | null;
  readonly isConductor: boolean;
  readonly busy?: boolean;
  readonly onActivateNext?: () => void;
  readonly onClearNext?: () => void;
}

export function LiveNextSongBanner({
  nextSong,
  nextKeyLabel,
  readingHintLabel = null,
  isConductor,
  busy = false,
  onActivateNext,
  onClearNext,
}: LiveNextSongBannerProps) {
  if (!nextSong) {
    return null;
  }

  return (
    <div
      data-testid="live-next-song-banner"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--arion-accent-border)] border-l-4 border-l-[var(--arion-accent)] bg-[var(--arion-accent-soft)] px-4 py-2.5"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--arion-accent)]">
          <ListMusic className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{it.live.nextSongBannerHeading}</span>
        </p>
        <p className="truncate text-sm font-bold text-[var(--arion-text)] sm:text-base">
          {nextSong.title}
          {nextKeyLabel ? (
            <span className="ml-2 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-surface)] px-2 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
              {nextKeyLabel}
            </span>
          ) : null}
          {readingHintLabel ? (
            <span className="ml-2 text-xs font-semibold text-[var(--arion-text-muted)]">
              ({readingHintLabel})
            </span>
          ) : null}
        </p>
      </div>

      {isConductor ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {onActivateNext ? (
            <button
              type="button"
              disabled={busy}
              onClick={onActivateNext}
              className="touch-target inline-flex items-center gap-1 rounded bg-[var(--arion-primary)] px-3 py-1.5 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
            >
              <span>{it.live.activateNextNowButton}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
          {onClearNext ? (
            <button
              type="button"
              disabled={busy}
              onClick={onClearNext}
              aria-label={it.live.clearNextButton}
              className="touch-target inline-flex items-center rounded border border-[var(--arion-border)] bg-[var(--arion-surface)] p-1.5 text-[var(--arion-text-muted)] hover:text-[var(--arion-text)] disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
