import { ArrowLeft, KeyRound, Music2, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { getAppEnv } from '@/config/env';
import { it } from '@/i18n/it';

const CARD_ICONS = {
  instance: SlidersHorizontal,
  users: KeyRound,
  instruments: Music2,
} as const;

export function AdminPanelPage() {
  const env = getAppEnv();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/altro"
        className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{it.admin.backToMore}</span>
      </Link>

      <PageHeader title={it.admin.title} subtitle={it.admin.subtitle} />

      <section className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-4 py-3 text-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-[var(--arion-accent)]">
            {it.admin.statusLabel}:
          </span>
          <span className="font-semibold text-[var(--arion-text)]">{it.admin.statusReady}</span>
          <span className="text-[var(--arion-text-muted)]">· {it.admin.backendPending}</span>
        </div>
        <span className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-0.5 font-mono font-bold text-[var(--arion-text-muted)]">
          {it.app.versionLabel(env.appVersion)}
        </span>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {it.admin.cards.map((card) => {
          const Icon = CARD_ICONS[card.id];
          return (
            <div
              key={card.id}
              className="flex flex-col justify-between space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[var(--arion-accent)]">
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <h2 className="text-base font-bold text-[var(--arion-text)]">{card.title}</h2>
                </div>
                <p className="text-sm leading-snug text-[var(--arion-text-muted)]">
                  {card.description}
                </p>
              </div>
              <span className="self-start rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--arion-text-muted)]">
                {card.milestone}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
