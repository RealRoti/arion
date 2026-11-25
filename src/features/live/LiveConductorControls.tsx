import { useMemo, useState, type FormEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Megaphone,
  Minus,
  Music,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Square,
  Zap,
} from 'lucide-react';
import {
  formatKey,
  parseKey,
  STANDARD_KEYS_MAJOR,
  STANDARD_KEYS_MINOR,
  transposeKey,
} from '@/domain/chords/transposer';
import type { LivePresenceMember, LiveSessionState } from '@/domain/models/live';
import type { SetlistWithItems } from '@/domain/models/setlists';
import type { Song } from '@/domain/models/songs';
import type { NotationSystem } from '@/domain/models/theme';
import { LivePresenceDrawer } from '@/features/live/LivePresenceDrawer';
import { it } from '@/i18n/it';

interface LiveConductorLauncherProps {
  readonly setlists: readonly SetlistWithItems[];
  readonly songs: readonly Song[];
  readonly initialSetlistId?: string | null;
  readonly initialSongId?: string | null;
  readonly notation: NotationSystem;
  readonly busy: boolean;
  readonly onStartFromSetlist: (setlist: SetlistWithItems) => void;
  readonly onStartFromSong: (song: Song) => void;
}

export function LiveConductorLauncher({
  setlists,
  songs,
  initialSetlistId = null,
  initialSongId = null,
  notation,
  busy,
  onStartFromSetlist,
  onStartFromSong,
}: LiveConductorLauncherProps) {
  const nonEmptySetlists = useMemo(() => setlists.filter((s) => s.items.length > 0), [setlists]);
  const [sourceMode, setSourceMode] = useState<'setlist' | 'song'>(() =>
    initialSongId && !initialSetlistId ? 'song' : nonEmptySetlists.length > 0 ? 'setlist' : 'song',
  );
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>(
    () => initialSetlistId ?? nonEmptySetlists[0]?.id ?? '',
  );
  const [songQuery, setSongQuery] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string>(
    () => initialSongId ?? songs[0]?.id ?? '',
  );

  const effectiveSetlistId = useMemo(() => {
    if (nonEmptySetlists.some((s) => s.id === selectedSetlistId)) {
      return selectedSetlistId;
    }
    return nonEmptySetlists[0]?.id ?? '';
  }, [nonEmptySetlists, selectedSetlistId]);

  const filteredSongs = useMemo(() => {
    const q = songQuery.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.author?.toLowerCase().includes(q) ?? false) ||
        s.originalKey.toLowerCase().includes(q),
    );
  }, [songQuery, songs]);

  const effectiveSongId = useMemo(() => {
    if (filteredSongs.some((s) => s.id === selectedSongId)) {
      return selectedSongId;
    }
    return filteredSongs[0]?.id ?? '';
  }, [filteredSongs, selectedSongId]);

  const formatDisplayKey = (rawKey: string) => {
    const parsed = parseKey(rawKey);
    return parsed ? formatKey(parsed, notation) : rawKey;
  };

  const selectedSetlist = nonEmptySetlists.find((s) => s.id === effectiveSetlistId) ?? null;
  const selectedSong = filteredSongs.find((s) => s.id === effectiveSongId) ?? null;

  return (
    <section className="space-y-4 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-surface)] p-5 shadow-2xs">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
          <Radio className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{it.live.conductorLauncherBadge}</span>
        </div>
        <h2 className="font-editorial text-xl font-bold text-[var(--arion-text)]">
          {it.live.conductorLauncherTitle}
        </h2>
        <p className="text-sm text-[var(--arion-text-muted)]">
          {it.live.conductorLauncherSubtitle}
        </p>
      </div>

      <div className="inline-flex rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] p-0.5">
        <button
          type="button"
          onClick={() => setSourceMode('setlist')}
          aria-pressed={sourceMode === 'setlist'}
          className={`touch-target inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-colors ${
            sourceMode === 'setlist'
              ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
              : 'text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
          }`}
        >
          <ListMusic className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{it.live.launchFromSetlistTab}</span>
        </button>
        <button
          type="button"
          onClick={() => setSourceMode('song')}
          aria-pressed={sourceMode === 'song'}
          className={`touch-target inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-colors ${
            sourceMode === 'song'
              ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
              : 'text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
          }`}
        >
          <Music className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{it.live.launchFromSongTab}</span>
        </button>
      </div>

      {sourceMode === 'setlist' ? (
        nonEmptySetlists.length === 0 ? (
          <p className="text-sm text-[var(--arion-text-muted)]">{it.live.noSetlistsReady}</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="live-launch-setlist"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.live.selectSetlistLabel}
              </label>
              <select
                id="live-launch-setlist"
                value={effectiveSetlistId}
                onChange={(e) => setSelectedSetlistId(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm font-bold text-[var(--arion-text)]"
              >
                {nonEmptySetlists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({it.setlists.songsCount(s.items.length)})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={busy || !selectedSetlist}
              onClick={() => {
                if (selectedSetlist) onStartFromSetlist(selectedSetlist);
              }}
              className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2.5 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
            >
              <Play className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{it.live.startLiveButton}</span>
            </button>
          </div>
        )
      ) : songs.length === 0 ? (
        <p className="text-sm text-[var(--arion-text-muted)]">{it.live.noSongsReady}</p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="live-launch-song-search"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.setlists.filterSongsLabel}
              </label>
              <input
                id="live-launch-song-search"
                type="search"
                value={songQuery}
                onChange={(e) => setSongQuery(e.target.value)}
                placeholder={it.setlists.filterSongsPlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)]"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="live-launch-song"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.setlists.selectSongLabel}
              </label>
              <select
                id="live-launch-song"
                value={effectiveSongId}
                onChange={(e) => setSelectedSongId(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm font-bold text-[var(--arion-text)]"
              >
                {filteredSongs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({formatDisplayKey(s.originalKey)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={busy || !selectedSong}
            onClick={() => {
              if (selectedSong) onStartFromSong(selectedSong);
            }}
            className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2.5 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
          >
            <Play className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.live.startLiveButton}</span>
          </button>
        </div>
      )}
    </section>
  );
}

interface LiveConductorConsoleProps {
  readonly session: LiveSessionState;
  readonly activeSetlist: SetlistWithItems | null;
  readonly currentSetlistIndex: number;
  readonly offSetlist: boolean;
  readonly defaultSongKey: string;
  readonly songs: readonly Song[];
  readonly members: readonly LivePresenceMember[];
  readonly notation: NotationSystem;
  readonly busy: boolean;
  readonly onStepSetlist: (targetIndex: number) => void;
  readonly onAnnounceNext: () => void;
  readonly onLaunchOffSetlistSong: (song: Song) => void;
  readonly onReturnToSetlist: () => void;
  readonly onChangeLiveKey: (nextKey: string) => void;
  readonly onSendFlashSignal: (message: string) => void;
  readonly onEndLive: () => void;
}

export function LiveConductorConsole({
  session,
  activeSetlist,
  currentSetlistIndex,
  offSetlist,
  defaultSongKey,
  songs,
  members,
  notation,
  busy,
  onStepSetlist,
  onAnnounceNext,
  onLaunchOffSetlistSong,
  onReturnToSetlist,
  onChangeLiveKey,
  onSendFlashSignal,
  onEndLive,
}: LiveConductorConsoleProps) {
  const [showOffSetlistDrawer, setShowOffSetlistDrawer] = useState(false);
  const [offSetlistQuery, setOffSetlistQuery] = useState('');
  const [showSignalPanel, setShowSignalPanel] = useState(false);
  const [customSignal, setCustomSignal] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);

  const keyOptions = useMemo(() => {
    const standard = [...STANDARD_KEYS_MAJOR, ...STANDARD_KEYS_MINOR].map((k) =>
      formatKey(k, notation),
    );
    const parsedActive = session.activeKey ? parseKey(session.activeKey) : null;
    const formattedActive = parsedActive
      ? formatKey(parsedActive, notation)
      : (session.activeKey ?? '');
    if (formattedActive && !standard.includes(formattedActive)) {
      standard.unshift(formattedActive);
    }
    return standard;
  }, [notation, session.activeKey]);

  const currentFormattedKey = useMemo(() => {
    const raw = session.activeKey ?? defaultSongKey;
    const parsed = parseKey(raw);
    return parsed ? formatKey(parsed, notation) : raw;
  }, [defaultSongKey, notation, session.activeKey]);

  const defaultFormattedKey = useMemo(() => {
    const parsed = parseKey(defaultSongKey);
    return parsed ? formatKey(parsed, notation) : defaultSongKey;
  }, [defaultSongKey, notation]);

  const shiftKeySemitones = (delta: number) => {
    const raw = session.activeKey ?? defaultSongKey;
    const parsed = parseKey(raw);
    if (!parsed) return;
    const next = formatKey(transposeKey(parsed, delta), notation);
    onChangeLiveKey(next);
  };

  const nextSetlistItem =
    activeSetlist && currentSetlistIndex >= 0
      ? (activeSetlist.items[currentSetlistIndex + 1] ?? null)
      : null;

  const filteredOffSongs = useMemo(() => {
    const q = offSetlistQuery.trim().toLowerCase();
    if (!q) return songs.slice(0, 20);
    return songs
      .filter(
        (s) => s.title.toLowerCase().includes(q) || (s.author?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 20);
  }, [offSetlistQuery, songs]);

  const handleSubmitCustomSignal = (e: FormEvent) => {
    e.preventDefault();
    if (!customSignal.trim() || busy) return;
    onSendFlashSignal(customSignal.trim());
    setCustomSignal('');
    setShowSignalPanel(false);
  };

  return (
    <section
      data-testid="live-conductor-console"
      className="space-y-3 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-surface)] p-4 shadow-2xs"
    >
      {/* Top Row: Live badge + Presence + End Live */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--arion-live)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{it.live.statusBadgeActive}</span>
          </span>
          <span className="text-xs font-bold text-[var(--arion-text-muted)]">
            {it.live.conductorConsoleTitle}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LivePresenceDrawer members={members} />

          {confirmEnd ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={onEndLive}
                className="touch-target rounded-md bg-[var(--arion-danger)] px-3 py-1.5 text-xs font-bold text-white"
              >
                {it.live.confirmEndButton}
              </button>
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="touch-target rounded-md border border-[var(--arion-border)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)]"
              >
                {it.common.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmEnd(true)}
              className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 px-3 py-1.5 text-xs font-bold text-[var(--arion-danger)] hover:bg-[var(--arion-danger)]/15"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>{it.live.endLiveButton}</span>
            </button>
          )}
        </div>
      </div>

      {/* Setlist sequence / Off-setlist return bar */}
      {activeSetlist ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-xs">
          {offSetlist ? (
            <>
              <span className="font-bold text-[var(--arion-accent)]">
                {it.live.offSetlistBadge} · {activeSetlist.title}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={onReturnToSetlist}
                className="touch-target inline-flex items-center gap-1.5 rounded bg-[var(--arion-primary)] px-3 py-1.5 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[var(--arion-accent)]" aria-hidden="true" />
                <span>{it.live.returnToSetlistButton}</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 font-bold text-[var(--arion-text)]">
                <ListMusic className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
                <span>
                  {it.reader.setlistPositionLabel(
                    currentSetlistIndex + 1,
                    activeSetlist.items.length,
                    activeSetlist.title,
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={busy || currentSetlistIndex <= 0}
                  onClick={() => onStepSetlist(currentSetlistIndex - 1)}
                  className="touch-target inline-flex items-center gap-1 rounded border border-[var(--arion-border)] bg-[var(--arion-surface)] px-2.5 py-1 font-bold text-[var(--arion-text)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{it.reader.setlistPrevButton}</span>
                </button>

                {nextSetlistItem && !session.nextSongId ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onAnnounceNext}
                    className="touch-target inline-flex items-center gap-1 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2.5 py-1 font-bold text-[var(--arion-accent)] hover:border-[var(--arion-accent)]"
                  >
                    <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{it.live.announceNextShort(nextSetlistItem.song?.title ?? '')}</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={busy || currentSetlistIndex >= activeSetlist.items.length - 1}
                  onClick={() => onStepSetlist(currentSetlistIndex + 1)}
                  className="touch-target inline-flex items-center gap-1 rounded bg-[var(--arion-primary)] px-2.5 py-1 font-bold text-[var(--arion-primary-contrast)] disabled:opacity-40"
                >
                  <span>{it.reader.setlistNextButton}</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Controls row: Live Key + Off-Setlist + Flash Signals */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Live Key Transpose */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-1 text-xs">
          <span className="font-bold text-[var(--arion-text-muted)]">{it.live.liveKeyLabel}:</span>
          <button
            type="button"
            disabled={busy}
            aria-label={it.reader.transposeDownLabel}
            onClick={() => shiftKeySemitones(-1)}
            className="touch-target rounded p-1 text-[var(--arion-text)] hover:bg-[var(--arion-surface-subtle)]"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <select
            aria-label={it.live.liveKeyLabel}
            disabled={busy}
            value={currentFormattedKey}
            onChange={(e) => onChangeLiveKey(e.target.value)}
            className="bg-transparent font-bold text-[var(--arion-primary)] focus:outline-none"
          >
            {keyOptions.map((keyOpt) => (
              <option key={keyOpt} value={keyOpt}>
                {keyOpt}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            aria-label={it.reader.transposeUpLabel}
            onClick={() => shiftKeySemitones(1)}
            className="touch-target rounded p-1 text-[var(--arion-text)] hover:bg-[var(--arion-surface-subtle)]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {currentFormattedKey !== defaultFormattedKey ? (
            <button
              type="button"
              disabled={busy}
              aria-label={it.live.resetKeyLabel}
              onClick={() => onChangeLiveKey(defaultFormattedKey)}
              className="touch-target rounded p-1 text-[var(--arion-accent)] hover:bg-[var(--arion-surface-subtle)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-expanded={showOffSetlistDrawer}
            onClick={() => {
              setShowOffSetlistDrawer((prev) => !prev);
              setShowSignalPanel(false);
            }}
            className={`touch-target inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-bold transition-colors ${
              showOffSetlistDrawer
                ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
            }`}
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{it.live.offSetlistButton}</span>
          </button>

          <button
            type="button"
            aria-expanded={showSignalPanel}
            onClick={() => {
              setShowSignalPanel((prev) => !prev);
              setShowOffSetlistDrawer(false);
            }}
            className={`touch-target inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-bold transition-colors ${
              showSignalPanel
                ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                : 'border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] text-[var(--arion-accent)] hover:border-[var(--arion-accent)]'
            }`}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{it.live.flashSignalsButton}</span>
          </button>
        </div>
      </div>

      {/* Off-setlist quick launcher */}
      {showOffSetlistDrawer ? (
        <div className="space-y-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3">
          <input
            type="search"
            aria-label={it.live.offSetlistSearchPlaceholder}
            value={offSetlistQuery}
            onChange={(e) => setOffSetlistQuery(e.target.value)}
            placeholder={it.live.offSetlistSearchPlaceholder}
            className="min-h-10 w-full rounded border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs text-[var(--arion-text)]"
          />
          <div className="max-h-48 divide-y divide-[var(--arion-border)] overflow-y-auto rounded border border-[var(--arion-border)] bg-[var(--arion-surface)]">
            {filteredOffSongs.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="truncate font-bold text-[var(--arion-text)]">{s.title}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onLaunchOffSetlistSong(s);
                    setShowOffSetlistDrawer(false);
                    setOffSetlistQuery('');
                  }}
                  className="shrink-0 rounded bg-[var(--arion-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--arion-primary-contrast)]"
                >
                  {it.live.launchNowButton}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Flash signals quick panel */}
      {showSignalPanel ? (
        <div className="space-y-2.5 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-bg)] p-3">
          <p className="text-xs font-bold text-[var(--arion-text)]">
            {it.live.flashSignalsPanelTitle}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {it.live.signalPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={busy}
                onClick={() => {
                  onSendFlashSignal(preset);
                  setShowSignalPanel(false);
                }}
                className="touch-target rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
              >
                {preset}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmitCustomSignal} className="flex flex-wrap gap-2">
            <input
              type="text"
              aria-label={it.live.customSignalPlaceholder}
              value={customSignal}
              onChange={(e) => setCustomSignal(e.target.value)}
              placeholder={it.live.customSignalPlaceholder}
              maxLength={80}
              className="min-h-10 flex-1 rounded border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs text-[var(--arion-text)]"
            />
            <button
              type="submit"
              disabled={busy || !customSignal.trim()}
              className="touch-target rounded-md bg-[var(--arion-primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--arion-primary-contrast)] disabled:opacity-50"
            >
              {it.live.sendSignalButton}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
