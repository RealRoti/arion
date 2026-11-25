import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, KeyRound, Music2, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { RequirePermission } from '@/components/RequirePermission';
import { getAppEnv } from '@/config/env';
import type { Permission } from '@/domain/rbac/permissions';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';
import { listAllowedEmails, listProfiles } from '@/services/usersService';

const CARD_META: Record<
  'instance' | 'users' | 'instruments',
  {
    icon: typeof SlidersHorizontal;
    to: string | null;
    permission: Permission;
  }
> = {
  instance: {
    icon: SlidersHorizontal,
    to: '/admin/istanza',
    permission: 'instance:manage',
  },
  users: {
    icon: KeyRound,
    to: '/admin/utenti',
    permission: 'users:manage',
  },
  instruments: {
    icon: Music2,
    to: '/admin/strumenti',
    permission: 'instruments:manage',
  },
};

export function AdminPanelPage() {
  const env = getAppEnv();
  const { can } = useAuth();
  const canManageUsers = can('users:manage');
  const [metrics, setMetrics] = useState<{ usersCount: number; invitesCount: number } | null>(null);

  useEffect(() => {
    if (!canManageUsers || !env.isSupabaseConfigured) {
      return;
    }
    let cancelled = false;
    const loadMetrics = async () => {
      try {
        const [profiles, invites] = await Promise.all([listProfiles(), listAllowedEmails()]);
        if (!cancelled) {
          setMetrics({
            usersCount: profiles.filter((p) => p.isActive).length,
            invitesCount: invites.filter((i) => i.isActive).length,
          });
        }
      } catch {
        // Non-blocking metrics strip
      }
    };
    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [canManageUsers, env.isSupabaseConfigured]);

  return (
    <RequirePermission anyOf={['instance:manage', 'users:manage', 'instruments:manage']}>
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
            {metrics ? (
              <span className="text-[var(--arion-text-muted)]">
                · {it.admin.summaryMetrics(metrics.usersCount, metrics.invitesCount)}
              </span>
            ) : null}
          </div>
          <span className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-0.5 font-mono font-bold text-[var(--arion-text-muted)]">
            {it.app.versionLabel(env.appVersion)}
          </span>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {it.admin.cards.map((card) => {
            const meta = CARD_META[card.id];
            if (!can(meta.permission)) {
              return null;
            }
            const Icon = meta.icon;

            if (meta.to) {
              return (
                <Link
                  key={card.id}
                  to={meta.to}
                  className="flex flex-col justify-between space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs transition-colors hover:border-[var(--arion-accent)]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[var(--arion-accent)]">
                      <span className="flex items-center gap-2">
                        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <h2 className="text-base font-bold text-[var(--arion-text)]">
                          {card.title}
                        </h2>
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-[var(--arion-text-muted)]"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-sm leading-snug text-[var(--arion-text-muted)]">
                      {card.description}
                    </p>
                  </div>
                  <span className="self-start rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
                    {it.admin.openSection}
                  </span>
                </Link>
              );
            }

            return (
              <div
                key={card.id}
                className="flex flex-col justify-between space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 opacity-85 shadow-2xs"
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
    </RequirePermission>
  );
}
