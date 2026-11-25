import { BookOpen, Calendar, ChevronRight, ListMusic, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/features/auth/useAuth';
import { DEMO_SONGS } from '@/features/repertoire/demoSongs';
import { it } from '@/i18n/it';

export function HomePage() {
  const { profile } = useAuth();
  const currentHour = new Date().getHours();
  const firstName = profile?.displayName.trim().split(/\s+/)[0] || it.app.defaultDisplayName;
  const greeting = it.home.greeting(currentHour, firstName);

  return (
    <div className="space-y-5">
      <PageHeader title={greeting} />

      {/* Next upcoming event strip */}
      <Link
        to="/calendario"
        className="flex items-center justify-between gap-3 rounded-md border border-[var(--arion-border)] border-l-4 border-l-[var(--arion-accent)] bg-[var(--arion-surface)] px-4 py-3 shadow-2xs transition-colors hover:border-[var(--arion-accent)]"
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{it.home.nextEventKicker}</span>
          </div>
          <p className="truncate text-sm font-bold text-[var(--arion-text)] sm:text-base">
            {it.home.nextEventSampleTitle}
          </p>
          <p className="text-xs text-[var(--arion-text-muted)]">{it.home.nextEventSampleWhen}</p>
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-[var(--arion-text-muted)]"
          aria-hidden="true"
        />
      </Link>

      {/* Live Status Card */}
      <section
        aria-labelledby="home-live-heading"
        className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2
              id="home-live-heading"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]"
            >
              <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{it.home.liveSectionTitle}</span>
            </h2>
            <p className="text-base font-bold text-[var(--arion-text)]">{it.home.liveIdleTitle}</p>
            <p className="text-sm text-[var(--arion-text-muted)]">{it.home.liveIdleSubtitle}</p>
          </div>
          <Link
            to="/live"
            className="touch-target inline-flex items-center justify-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2 text-sm font-bold text-[var(--arion-primary-contrast)] transition-colors hover:bg-[var(--arion-primary-hover)]"
          >
            <Radio className="h-4 w-4" aria-hidden="true" />
            <span>{it.home.liveOpenButton}</span>
          </Link>
        </div>
      </section>

      {/* Quick Access */}
      <section aria-labelledby="home-quick-heading" className="space-y-2.5">
        <h2
          id="home-quick-heading"
          className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]"
        >
          {it.home.quickAccessTitle}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to="/repertorio"
            className="flex items-center justify-between gap-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs transition-colors hover:border-[var(--arion-accent)]"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-[var(--arion-primary)]">
                <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="text-base font-bold text-[var(--arion-text)]">
                  {it.home.quickRepertoireTitle}
                </span>
              </div>
              <p className="text-sm text-[var(--arion-text-muted)]">
                {it.home.quickRepertoireDesc}
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-[var(--arion-text-muted)]"
              aria-hidden="true"
            />
          </Link>

          <Link
            to="/scalette"
            className="flex items-center justify-between gap-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs transition-colors hover:border-[var(--arion-accent)]"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-[var(--arion-primary)]">
                <ListMusic className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="text-base font-bold text-[var(--arion-text)]">
                  {it.home.quickSetlistsTitle}
                </span>
              </div>
              <p className="text-sm text-[var(--arion-text-muted)]">{it.home.quickSetlistsDesc}</p>
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-[var(--arion-text-muted)]"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      {/* Recent Songs */}
      <section aria-labelledby="home-recent-heading" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2
            id="home-recent-heading"
            className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]"
          >
            {it.home.recentSongsTitle}
          </h2>
          <Link
            to="/repertorio"
            className="text-sm font-semibold text-[var(--arion-primary)] hover:underline"
          >
            {it.home.viewAllRepertoire}
          </Link>
        </div>

        <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
          {DEMO_SONGS.map((song) => (
            <Link
              key={song.id}
              to={`/repertorio/${song.id}`}
              className="touch-target flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--arion-surface-subtle)]"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-[var(--arion-text)]">
                  {song.title}
                </p>
                <p className="text-xs text-[var(--arion-text-muted)]">
                  {song.author} · {it.reader.keyPrefix} {song.key}
                </p>
              </div>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-[var(--arion-text-muted)]"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
