import { X, Zap } from 'lucide-react';
import type { FlashSignal } from '@/domain/models/live';
import { it } from '@/i18n/it';

interface LiveFlashToastProps {
  readonly signal: FlashSignal | null;
  readonly onDismiss: () => void;
}

export function LiveFlashToast({ signal, onDismiss }: LiveFlashToastProps) {
  if (!signal) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      className="flex items-start justify-between gap-3 rounded-md border-2 border-[var(--arion-accent)] bg-[var(--arion-primary)] px-4 py-3 text-[var(--arion-primary-contrast)] shadow-md"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Zap className="mt-0.5 h-5 w-5 shrink-0 text-[var(--arion-accent)]" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--arion-accent)]">
            {signal.issuedByName
              ? `${it.live.flashSignalHeading} · ${signal.issuedByName}`
              : it.live.flashSignalHeading}
          </p>
          <p className="text-sm font-bold sm:text-base">{signal.message}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label={it.live.dismissSignalLabel}
        className="touch-target shrink-0 rounded p-1 text-[var(--arion-primary-contrast)]/80 hover:text-[var(--arion-primary-contrast)]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
