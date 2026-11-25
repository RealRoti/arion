import { BookOpen, ListMusic, Music2, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';

export function LivePage() {
  const { activeInstrument } = useAuth();

  return (
    <div className="space-y-5">
      <PageHeader title={it.live.title} />

      <section className="rounded-md border border-[var(--arion-border)] border-t-4 border-t-[var(--arion-primary)] bg-[var(--arion-surface)] p-5 shadow-2xs sm:p-6">
        <div className="inline-flex items-center gap-2 rounded border border-[var(--arion-border)] bg-[var(--arion-surface-subtle)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--arion-text-muted)]">
          <Radio className="h-3.5 w-3.5 text-[var(--arion-primary)]" aria-hidden="true" />
          <span>{it.live.statusBadgeIdle}</span>
        </div>

        <h2 className="mt-3 font-editorial text-xl font-bold text-[var(--arion-text)]">
          {it.live.idleHeading}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--arion-text-muted)]">
          {it.live.idleDescription}
        </p>

        <div className="mt-4 flex items-center gap-2.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3.5 py-2.5 text-sm">
          <Music2 className="h-4 w-4 shrink-0 text-[var(--arion-accent)]" aria-hidden="true" />
          <span className="text-[var(--arion-text-muted)]">{it.live.activeInstrumentLabel}:</span>
          <strong className="text-[var(--arion-text)]">
            {activeInstrument?.name ?? it.app.defaultActiveInstrument}
          </strong>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            to="/repertorio"
            className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2.5 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>{it.live.goToRepertoire}</span>
          </Link>
          <Link
            to="/scalette"
            className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-4 py-2.5 text-sm font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
          >
            <ListMusic className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.live.goToSetlists}</span>
          </Link>
        </div>
      </section>

      <p className="text-xs text-[var(--arion-text-muted)]">{it.live.syncHint}</p>
    </div>
  );
}
