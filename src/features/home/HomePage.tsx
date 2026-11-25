import { useEffect, useState } from 'react';
import { BookOpen, Calendar, ChevronRight, ListMusic, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useTheme } from '@/components/useTheme';
import { getAppEnv } from '@/config/env';
import { formatKey, parseKey } from '@/domain/chords/transposer';
import { toLocalIsoDate, type CalendarEvent } from '@/domain/models/calendar';
import type { LiveSessionState } from '@/domain/models/live';
import type { Song } from '@/domain/models/songs';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';
import { getNextUpcomingEvent } from '@/services/calendarService';
import { fetchLiveSession } from '@/services/liveService';
import { listRecentSongs } from '@/services/songsService';

function formatHomeEventMeta(event: CalendarEvent): string {
  const [, mStr, dStr] = event.eventDate.split('-');
  const monthName = mStr ? (it.calendar.months[Number(mStr) - 1] ?? mStr) : '';
  const dateLabel = dStr && monthName ? `${Number(dStr)} ${monthName}` : event.eventDate;
  const parts = [dateLabel, event.startTime];
  if (event.location) parts.push(event.location);
  return parts.join(' · ');
}

export function HomePage() {
  const { profile } = useAuth();
  const { notation } = useTheme();
  const isSupabaseConfigured = getAppEnv().isSupabaseConfigured;
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSessionState | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    let cancelled = false;
    const todayIso = toLocalIsoDate(new Date());
    const loadHomeData = async () => {
      try {
        const [loadedSongs, loadedEvent, loadedLive] = await Promise.all([
          listRecentSongs(5).catch(() => [] as Song[]),
          getNextUpcomingEvent(todayIso).catch(() => null),
          fetchLiveSession().catch(() => null),
        ]);
        if (!cancelled) {
          setRecentSongs(loadedSongs);
          setNextEvent(loadedEvent);
          setLiveSession(loadedLive);
        }
      } catch {
        // Non-blocking home widgets
      }
    };
    void loadHomeData();
    return () => {
      cancelled = true;
    };
  }, [isSupabaseConfigured]);

  const currentHour = new Date().getHours();
  const firstName = profile?.displayName.trim().split(/\s+/)[0] || it.app.defaultDisplayName;
  const greeting = it.home.greeting(currentHour, firstName);

  const formatSongKey = (rawKey: string) => {
    const parsed = parseKey(rawKey);
    return parsed ? formatKey(parsed, notation) : rawKey;
  };

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
          {nextEvent ? (
            <>
              <p className="truncate text-sm font-bold text-[var(--arion-text)] sm:text-base">
                {nextEvent.title}
              </p>
              <p className="text-xs text-[var(--arion-text-muted)]">
                {formatHomeEventMeta(nextEvent)}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-[var(--arion-text-muted)]">
              {it.home.nextEventEmpty}
            </p>
          )}
        </div>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-[var(--arion-text-muted)]"
          aria-hidden="true"
        />
      </Link>

      {/* Live Status Card */}
      <section
        aria-labelledby="home-live-heading"
        className={`rounded-md border p-4 shadow-2xs ${
          liveSession?.isActive
            ? 'border-[var(--arion-live)] bg-[var(--arion-surface)]'
            : 'border-[var(--arion-border)] bg-[var(--arion-surface)]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2
              id="home-live-heading"
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                liveSession?.isActive ? 'text-[var(--arion-live)]' : 'text-[var(--arion-accent)]'
              }`}
            >
              <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {liveSession?.isActive ? it.home.liveActiveBadge : it.home.liveSectionTitle}
              </span>
            </h2>
            <p className="text-base font-bold text-[var(--arion-text)]">
              {liveSession?.isActive ? it.home.liveActiveTitle : it.home.liveIdleTitle}
            </p>
            <p className="text-sm text-[var(--arion-text-muted)]">
              {liveSession?.isActive
                ? liveSession.conductorName
                  ? it.home.liveActiveSubtitleBy(liveSession.conductorName)
                  : it.home.liveActiveSubtitle
                : it.home.liveIdleSubtitle}
            </p>
          </div>
          <Link
            to="/live"
            className={`touch-target inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
              liveSession?.isActive
                ? 'bg-[var(--arion-live)] text-white hover:opacity-90'
                : 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]'
            }`}
          >
            <Radio className="h-4 w-4" aria-hidden="true" />
            <span>{liveSession?.isActive ? it.home.liveJoinButton : it.home.liveOpenButton}</span>
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

        {recentSongs.length === 0 ? (
          <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 text-sm text-[var(--arion-text-muted)] shadow-2xs">
            {it.home.emptyRecentSongs}
          </div>
        ) : (
          <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
            {recentSongs.map((song) => (
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
                    {song.author ? `${song.author} · ` : ''}
                    {it.reader.keyPrefix} {formatSongKey(song.originalKey)}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[var(--arion-text-muted)]"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
