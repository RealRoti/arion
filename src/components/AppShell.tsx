import type { ReactNode } from 'react';
import { BookOpen, Calendar, Home, Menu, Music2, Radio } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArionLogo } from '@/components/ArionLogo';
import { getAppEnv } from '@/config/env';
import { it } from '@/i18n/it';

interface AppShellProps {
  children: ReactNode;
}

const SECONDARY_MORE_PATHS = [
  '/scalette',
  '/guida',
  '/impostazioni',
  '/admin',
  '/assistenza',
  '/privacy',
  '/info-sviluppatori',
];

function isMoreRouteActive(pathname: string): boolean {
  return (
    pathname === '/altro' ||
    SECONDARY_MORE_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation();
  const env = getAppEnv();
  const moreActive = isMoreRouteActive(pathname);
  const liveActive = pathname === '/live' || pathname.startsWith('/live/');

  const desktopNavItems = [
    { to: '/', label: it.nav.home, icon: Home, end: true },
    { to: '/repertorio', label: it.nav.repertoire, icon: BookOpen, end: false },
    { to: '/live', label: it.nav.live, icon: Radio, end: false },
    { to: '/calendario', label: it.nav.calendar, icon: Calendar, end: false },
    { to: '/altro', label: it.nav.more, icon: Menu, end: false, forceActive: moreActive },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--arion-bg)] text-[var(--arion-text)] lg:flex">
      {/* Desktop fixed left sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-[var(--arion-border)] lg:bg-[var(--arion-surface)]">
        <div className="border-b border-[var(--arion-border)] px-5 py-4">
          <Link to="/" className="block">
            <ArionLogo size="md" showWordmark showSubtitle />
          </Link>
          <p className="mt-2.5 truncate text-xs font-semibold uppercase tracking-wider text-[var(--arion-accent)]">
            {it.app.defaultGroupName}
          </p>
        </div>

        <nav aria-label={it.nav.primaryNavLabel} className="flex-1 space-y-1 px-3 py-4">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => {
                  const active = 'forceActive' in item ? item.forceActive : isActive;
                  return `touch-target flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                      : 'text-[var(--arion-text-muted)] hover:bg-[var(--arion-surface-subtle)] hover:text-[var(--arion-text)]'
                  }`;
                }}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[var(--arion-border)] px-5 py-3">
          <Link
            to="/impostazioni"
            className="flex items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
          >
            <Music2 className="h-4 w-4 shrink-0 text-[var(--arion-accent)]" aria-hidden="true" />
            <span className="truncate">{it.app.defaultActiveInstrument}</span>
          </Link>
          <p className="mt-2.5 text-[11px] font-medium text-[var(--arion-text-muted)]">
            {it.app.name} {it.app.versionLabel(env.appVersion)}
          </p>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Compact mobile/tablet top header */}
        <header className="sticky top-0 z-20 border-b border-[var(--arion-border)] bg-[var(--arion-surface)] lg:hidden">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
            <Link to="/" className="min-w-0">
              <ArionLogo size="sm" showWordmark />
            </Link>
            <Link
              to="/impostazioni"
              className="inline-flex max-w-[50%] items-center gap-1.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--arion-text)]"
            >
              <Music2
                className="h-3.5 w-3.5 shrink-0 text-[var(--arion-accent)]"
                aria-hidden="true"
              />
              <span className="truncate">{it.app.defaultActiveInstrument}</span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 pb-28 sm:px-6 lg:py-7 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile & Tablet 5-tab bottom navbar with central Live action */}
      <nav
        aria-label={it.nav.primaryNavLabel}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--arion-border)] bg-[var(--arion-surface)] pb-[env(safe-area-inset-bottom)] shadow-sm lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end px-1 pt-1 pb-1.5">
          <BottomNavItem to="/" label={it.nav.home} icon={Home} end />
          <BottomNavItem to="/repertorio" label={it.nav.repertoire} icon={BookOpen} />

          {/* Center prominent Live button */}
          <div className="flex flex-col items-center justify-end">
            <Link
              to="/live"
              aria-current={liveActive ? 'page' : undefined}
              className={`-mt-4 flex h-13 w-13 items-center justify-center rounded-full border-4 border-[var(--arion-bg)] shadow-sm transition-colors ${
                liveActive
                  ? 'bg-[var(--arion-live)] text-[var(--arion-primary-contrast)]'
                  : 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]'
              }`}
            >
              <Radio className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">{it.nav.live}</span>
            </Link>
            <span
              className={`mt-0.5 text-[11px] font-bold ${
                liveActive ? 'text-[var(--arion-live)]' : 'text-[var(--arion-text)]'
              }`}
            >
              {it.nav.live}
            </span>
          </div>

          <BottomNavItem to="/calendario" label={it.nav.calendar} icon={Calendar} />
          <BottomNavItem to="/altro" label={it.nav.more} icon={Menu} forceActive={moreActive} />
        </div>
      </nav>
    </div>
  );
}

function BottomNavItem({
  to,
  label,
  icon: Icon,
  end = false,
  forceActive,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
  forceActive?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => {
        const active = forceActive !== undefined ? forceActive : isActive;
        return `touch-target flex flex-col items-center justify-center gap-0.5 rounded-md py-1 text-[11px] font-semibold transition-colors ${
          active ? 'text-[var(--arion-primary)]' : 'text-[var(--arion-text-muted)]'
        }`;
      }}
    >
      {({ isActive }) => {
        const active = forceActive !== undefined ? forceActive : isActive;
        return (
          <>
            <Icon className={`h-5 w-5 ${active ? 'stroke-[2.4]' : ''}`} aria-hidden="true" />
            <span className="truncate">{label}</span>
          </>
        );
      }}
    </NavLink>
  );
}
