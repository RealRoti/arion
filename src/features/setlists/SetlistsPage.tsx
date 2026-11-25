import { ArrowLeft, ChevronRight, ListMusic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { DEMO_SETLISTS, DEMO_SONGS } from '@/features/repertoire/demoSongs';
import { it } from '@/i18n/it';

export function SetlistsPage() {
  return (
    <div className="space-y-4">
      <Link
        to="/altro"
        className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{it.setlists.backToMore}</span>
      </Link>

      <PageHeader title={it.setlists.title} subtitle={it.setlists.subtitle} />

      <div className="space-y-3">
        {DEMO_SETLISTS.map((setlist) => {
          const songs = setlist.songIds
            .map((id) => DEMO_SONGS.find((song) => song.id === id))
            .filter((song): song is NonNullable<typeof song> => Boolean(song));
          const firstSong = songs[0];

          return (
            <section
              key={setlist.id}
              className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-[var(--arion-text)]">
                    <ListMusic
                      className="h-4 w-4 shrink-0 text-[var(--arion-accent)]"
                      aria-hidden="true"
                    />
                    <span>{setlist.title}</span>
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--arion-text-muted)]">
                    {setlist.dateLabel} · {it.setlists.songsCount(songs.length)}
                  </p>
                </div>

                {firstSong ? (
                  <Link
                    to={`/repertorio/${firstSong.id}`}
                    className="touch-target inline-flex items-center rounded-md bg-[var(--arion-primary)] px-3.5 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
                  >
                    {it.setlists.openFirstSong}
                  </Link>
                ) : null}
              </div>

              <ol className="divide-y divide-[var(--arion-border)] rounded border border-[var(--arion-border)] bg-[var(--arion-bg)]">
                {songs.map((song, idx) => (
                  <li key={song.id}>
                    <Link
                      to={`/repertorio/${song.id}`}
                      className="touch-target flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-[var(--arion-surface-subtle)]"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="w-5 text-xs font-bold text-[var(--arion-text-muted)]">
                          {idx + 1}.
                        </span>
                        <span className="truncate font-semibold text-[var(--arion-text)]">
                          {song.title}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-bold text-[var(--arion-accent)]">
                          {song.key}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 text-[var(--arion-text-muted)]"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-[var(--arion-text-muted)]">{it.setlists.demoNotice}</p>
    </div>
  );
}
