import { useMemo, useState } from 'react';
import { ChevronRight, ListMusic, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { DEMO_SONGS } from '@/features/repertoire/demoSongs';
import { it } from '@/i18n/it';

export function RepertoirePage() {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const song of DEMO_SONGS) {
      for (const tag of song.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags);
  }, []);

  const filteredSongs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return DEMO_SONGS.filter((song) => {
      if (selectedTag !== 'ALL' && !song.tags.includes(selectedTag)) {
        return false;
      }
      if (!normalized) return true;
      const haystack = `${song.title} ${song.author} ${song.tags.join(' ')}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, selectedTag]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={it.repertoire.title}
        actions={
          <Link
            to="/scalette"
            className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3.5 py-2 text-sm font-bold text-[var(--arion-text)] shadow-2xs hover:border-[var(--arion-accent)]"
          >
            <ListMusic className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.repertoire.setlistsShortcut}</span>
          </Link>
        }
      />

      {/* Search & Tag Filter */}
      <div className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-3.5 shadow-2xs">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--arion-text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={it.repertoire.searchPlaceholder}
            aria-label={it.repertoire.searchPlaceholder}
            className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] py-2 pr-10 pl-9 text-sm text-[var(--arion-text)] placeholder:text-[var(--arion-text-muted)] focus:border-[var(--arion-primary)] focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={it.repertoire.clearSearchLabel}
              className="touch-target absolute top-1/2 right-1 inline-flex -translate-y-1/2 items-center justify-center rounded-md text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedTag('ALL')}
            className={`min-h-10 rounded-full border px-3.5 py-1 text-xs font-bold transition-colors ${
              selectedTag === 'ALL'
                ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
            }`}
          >
            {it.repertoire.filterAll}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`min-h-10 rounded-full border px-3.5 py-1 text-xs font-bold transition-colors ${
                selectedTag === tag
                  ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                  : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-[var(--arion-text-muted)]">
          {it.repertoire.songsCount(filteredSongs.length)}
        </p>
      </div>

      {/* Song List */}
      {filteredSongs.length === 0 ? (
        <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6 text-center shadow-2xs">
          <p className="text-base font-bold text-[var(--arion-text)]">{it.repertoire.emptyTitle}</p>
          <p className="mt-1 text-sm text-[var(--arion-text-muted)]">
            {it.repertoire.emptySubtitle}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
          {filteredSongs.map((song) => (
            <Link
              key={song.id}
              to={`/repertorio/${song.id}`}
              aria-label={it.repertoire.openSongLabel(song.title)}
              className="touch-target flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--arion-surface-subtle)]"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate text-base font-bold text-[var(--arion-text)]">
                  {song.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--arion-text-muted)]">
                  <span>{song.author}</span>
                  <span>·</span>
                  <span>
                    {it.reader.tempoPrefix} {song.tempo}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
                  {song.key}
                </span>
                <ChevronRight
                  className="h-4 w-4 text-[var(--arion-text-muted)]"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--arion-text-muted)]">{it.repertoire.demoNotice}</p>
    </div>
  );
}
