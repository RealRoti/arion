import { createPortal } from 'react-dom';
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

  const toastNode = (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] flex justify-center px-3">
      <div
        key={signal.id}
        role="status"
        aria-live="assertive"
        data-testid="live-flash-toast"
        className="arion-toast-in pointer-events-auto flex w-full max-w-sm items-center justify-between gap-2 rounded-lg border border-[var(--arion-accent)] bg-[var(--arion-primary)]/95 px-3.5 py-2 text-[var(--arion-primary-contrast)] shadow-lg backdrop-blur-xs"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Zap className="h-4 w-4 shrink-0 text-[var(--arion-accent)]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[var(--arion-accent)]">
              {signal.issuedByName
                ? `${it.live.flashSignalHeading} · ${signal.issuedByName}`
                : it.live.flashSignalHeading}
            </p>
            <p className="text-sm font-bold leading-snug">{signal.message}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label={it.live.dismissSignalLabel}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--arion-primary-contrast)]/80 hover:bg-white/10 hover:text-[var(--arion-primary-contrast)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return toastNode;
  }

  return createPortal(toastNode, document.body);
}
