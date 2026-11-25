import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, ListMusic, Plus, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { RequirePermission } from '@/components/RequirePermission';
import { useTheme } from '@/components/useTheme';
import { getAppEnv } from '@/config/env';
import { formatKey, parseKey } from '@/domain/chords/transposer';
import { filterSongs, type Song } from '@/domain/models/songs';
import { it } from '@/i18n/it';
import { listSongs } from '@/services/songsService';

export function RepertoirePage() {
  const { notation } = useTheme();
  const isSupabaseConfigured = getAppEnv().isSupabaseConfigured;

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [selectedKey, setSelectedKey] = useState<string>('ALL');
  const [pdfOnly, setPdfOnly] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const loaded = await listSongs();
        if (!cancelled) {
          setSongs(loaded);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(it.repertoire.loadError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isSupabaseConfigured]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const song of songs) {
      for (const tag of song.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [songs]);

  const allKeys = useMemo(() => {
    const seen = new Map<string, string>();
    for (const song of songs) {
      const parsed = parseKey(song.originalKey);
      const formatted = parsed ? formatKey(parsed, notation) : song.originalKey;
      const groupId = parsed ? `${parsed.rootPitch}-${parsed.isMinor}` : formatted;
      if (!seen.has(groupId)) {
        seen.set(groupId, formatted);
      }
    }
    return Array.from(seen.values());
  }, [notation, songs]);

  const filteredSongs = useMemo(
    () =>
      filterSongs(songs, {
        query,
        tag: selectedTag,
        key: selectedKey,
        pdfOnly,
      }),
    [pdfOnly, query, selectedKey, selectedTag, songs],
  );

  const formatSongKey = (rawKey: string) => {
    const parsed = parseKey(rawKey);
    return parsed ? formatKey(parsed, notation) : rawKey;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={it.repertoire.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/scalette"
              className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3.5 py-2 text-sm font-bold text-[var(--arion-text)] shadow-2xs hover:border-[var(--arion-accent)]"
            >
              <ListMusic className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{it.repertoire.setlistsShortcut}</span>
            </Link>

            <RequirePermission permission="songs:create" fallback={null}>
              <Link
                to="/repertorio/nuovo"
                className="touch-target inline-flex items-center gap-1.5 rounded-md bg-[var(--arion-primary)] px-3.5 py-2 text-sm font-bold text-[var(--arion-primary-contrast)] shadow-2xs hover:bg-[var(--arion-primary-hover)]"
              >
                <Plus className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
                <span>{it.repertoire.newSongButton}</span>
              </Link>
            </RequirePermission>
          </div>
        }
      />

      {/* Search & Filter */}
      <div className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-3.5 shadow-2xs">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
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

          {allKeys.length > 0 ? (
            <select
              aria-label={it.repertoire.keyFilterLabel}
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="min-h-11 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-xs font-bold text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
            >
              <option value="ALL">{it.repertoire.keyFilterAll}</option>
              {allKeys.map((keyOpt) => (
                <option key={keyOpt} value={keyOpt}>
                  {keyOpt}
                </option>
              ))}
            </select>
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

          <button
            type="button"
            aria-pressed={pdfOnly}
            onClick={() => setPdfOnly((prev) => !prev)}
            className={`min-h-10 inline-flex items-center gap-1 rounded-full border px-3.5 py-1 text-xs font-bold transition-colors ${
              pdfOnly
                ? 'border-[var(--arion-accent)] bg-[var(--arion-accent-soft)] text-[var(--arion-accent)]'
                : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{it.repertoire.pdfOnlyFilter}</span>
          </button>
        </div>

        <p className="text-xs font-semibold text-[var(--arion-text-muted)]">
          {it.repertoire.songsCount(filteredSongs.length)}
        </p>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-4 text-sm font-semibold text-[var(--arion-danger)]"
        >
          {errorMessage}
        </div>
      ) : loading ? (
        <p className="text-sm text-[var(--arion-text-muted)]">{it.common.loading}</p>
      ) : songs.length === 0 ? (
        <div className="space-y-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6 text-center shadow-2xs">
          <p className="text-base font-bold text-[var(--arion-text)]">
            {it.repertoire.emptyArchiveTitle}
          </p>
          <p className="text-sm text-[var(--arion-text-muted)]">
            {it.repertoire.emptyArchiveSubtitle}
          </p>
        </div>
      ) : filteredSongs.length === 0 ? (
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
                  {song.author ? <span>{song.author}</span> : null}
                  {song.author && song.tempoBpm ? <span>·</span> : null}
                  {song.tempoBpm ? (
                    <span>
                      {it.reader.tempoPrefix} {song.tempoBpm} BPM
                    </span>
                  ) : null}
                  {song.tags.length > 0 ? <span>· {song.tags.slice(0, 3).join(', ')}</span> : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {song.pdfCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--arion-text-muted)]">
                    <FileText className="h-3 w-3 text-[var(--arion-accent)]" aria-hidden="true" />
                    <span>{it.repertoire.pdfBadge}</span>
                  </span>
                ) : null}
                <span className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
                  {formatSongKey(song.originalKey)}
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
    </div>
  );
}
