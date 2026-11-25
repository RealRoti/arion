import type { ReactNode } from 'react';
import {
  BookOpen,
  Bug,
  ChevronRight,
  Code2,
  Heart,
  ListMusic,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { RequirePermission } from '@/components/RequirePermission';
import { getAppEnv } from '@/config/env';
import { it } from '@/i18n/it';

export function MoreMenuPage() {
  const env = getAppEnv();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-11rem)] max-w-xl flex-col justify-between space-y-6">
      <div className="space-y-5">
        <PageHeader title={it.more.title} />

        {/* Group 1: Tools & Preferences */}
        <section className="space-y-1.5">
          <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--arion-accent)]">
            {it.more.toolsSectionTitle}
          </h2>
          <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
            <MoreRow to="/scalette" icon={<ListMusic className="h-5 w-5" />}>
              {it.nav.setlists}
            </MoreRow>
            <MoreRow to="/guida" icon={<BookOpen className="h-5 w-5" />}>
              {it.nav.guide}
            </MoreRow>
            <MoreRow to="/impostazioni" icon={<Settings className="h-5 w-5" />}>
              {it.nav.settings}
            </MoreRow>
          </div>
        </section>

        {/* Group 2: Administration (visible only with admin permissions) */}
        <RequirePermission
          anyOf={['instance:manage', 'users:manage', 'instruments:manage']}
          fallback={null}
        >
          <section className="space-y-1.5">
            <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--arion-accent)]">
              {it.more.adminSectionTitle}
            </h2>
            <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
              <MoreRow to="/admin" icon={<SlidersHorizontal className="h-5 w-5" />}>
                {it.nav.adminControlPanel}
              </MoreRow>
            </div>
          </section>
        </RequirePermission>

        {/* Group 3: Support & Information */}
        <section className="space-y-1.5">
          <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-[var(--arion-accent)]">
            {it.more.supportSectionTitle}
          </h2>
          <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
            <MoreRow to="/assistenza" icon={<Bug className="h-5 w-5" />}>
              {it.nav.support}
            </MoreRow>
            <MoreRow to="/privacy" icon={<ShieldCheck className="h-5 w-5" />}>
              {it.nav.privacy}
            </MoreRow>
            <MoreRow to="/info-sviluppatori" icon={<Code2 className="h-5 w-5" />}>
              {it.nav.devInfo}
            </MoreRow>
          </div>
        </section>
      </div>

      <footer className="pb-2 pt-4 text-center text-xs leading-relaxed text-[var(--arion-text-muted)]">
        <p>
          {it.more.footerPrefix} {env.appVersion}, {it.more.footerMadeWith}{' '}
          <Heart
            className="inline h-3.5 w-3.5 fill-[var(--arion-live)] text-[var(--arion-live)]"
            aria-label={it.more.footerLoveLabel}
          />{' '}
          {it.more.footerByPrefix}{' '}
          <a
            href={it.app.githubRepoUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-[var(--arion-primary)] underline decoration-[var(--arion-accent-border)] underline-offset-2 hover:text-[var(--arion-accent)]"
          >
            {it.more.footerAuthorName}
          </a>
          .
        </p>
        <p className="mt-1 text-[11px] font-medium">{it.more.footerOpenSource}</p>
      </footer>
    </div>
  );
}

function MoreRow({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="touch-target flex items-center justify-between gap-3 px-4 py-3 text-base font-bold text-[var(--arion-text)] transition-colors hover:bg-[var(--arion-surface-subtle)]"
    >
      <span className="flex items-center gap-3 text-[var(--arion-accent)]">
        {icon}
        <span className="text-[var(--arion-text)]">{children}</span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-[var(--arion-text-muted)]"
        aria-hidden="true"
      />
    </Link>
  );
}
