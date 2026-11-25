import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  GripVertical,
  Play,
  Plus,
  Radio,
  Save,
  Trash2,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useTheme } from '@/components/useTheme';
import {
  formatKey,
  parseKey,
  STANDARD_KEYS_MAJOR,
  STANDARD_KEYS_MINOR,
} from '@/domain/chords/transposer';
import {
  reorderItemIds,
  resolveEffectiveSetlistKey,
  type SetlistItem,
  type SetlistWithItems,
} from '@/domain/models/setlists';
import type { Song } from '@/domain/models/songs';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';
import {
  addSongToSetlist,
  getSetlistById,
  removeSetlistItem,
  reorderSetlistItems,
  updateSetlist,
  updateSetlistItem,
} from '@/services/setlistsService';
import { listSongs } from '@/services/songsService';

export function SetlistDetailPage() {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { can } = useAuth();
  const { notation } = useTheme();
  const canManage = can('setlists:manage');

  const [setlist, setSetlist] = useState<SetlistWithItems | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(Boolean(setlistId));
  const [notFound, setNotFound] = useState(!setlistId);

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const [songSearch, setSongSearch] = useState('');
  const [selectedSongId, setSelectedSongId] = useState('');
  const [newOverrideKey, setNewOverrideKey] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [addingSong, setAddingSong] = useState(false);

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [itemNotesDrafts, setItemNotesDrafts] = useState<Record<string, string>>({});
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!setlistId) return;

    let cancelled = false;
    const load = async () => {
      try {
        const [loadedSetlist, loadedSongs] = await Promise.all([
          getSetlistById(setlistId),
          canManage ? listSongs() : Promise.resolve([] as Song[]),
        ]);
        if (cancelled) return;

        if (!loadedSetlist) {
          setNotFound(true);
          return;
        }

        setSetlist(loadedSetlist);
        setTitle(loadedSetlist.title);
        setEventDate(loadedSetlist.eventDate ?? '');
        setNotes(loadedSetlist.notes ?? '');

        const notesMap: Record<string, string> = {};
        for (const item of loadedSetlist.items) {
          notesMap[item.id] = item.notes ?? '';
        }
        setItemNotesDrafts(notesMap);
        setSongs(loadedSongs);
        if (loadedSongs[0]) {
          setSelectedSongId(loadedSongs[0].id);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(it.setlists.loadError);
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
  }, [canManage, setlistId]);

  const keyOptions = useMemo(
    () => [...STANDARD_KEYS_MAJOR, ...STANDARD_KEYS_MINOR].map((k) => formatKey(k, notation)),
    [notation],
  );

  const filteredSongs = useMemo(() => {
    const q = songSearch.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.author?.toLowerCase().includes(q) ?? false) ||
        s.originalKey.toLowerCase().includes(q),
    );
  }, [songSearch, songs]);

  const effectiveSelectedSongId = useMemo(() => {
    if (filteredSongs.some((s) => s.id === selectedSongId)) {
      return selectedSongId;
    }
    return filteredSongs[0]?.id ?? '';
  }, [filteredSongs, selectedSongId]);

  const formatDisplayKey = (rawKey: string) => {
    const parsed = parseKey(rawKey);
    return parsed ? formatKey(parsed, notation) : rawKey;
  };

  const handleSaveMetadata = async (e: FormEvent) => {
    e.preventDefault();
    if (!setlist || !title.trim() || savingMeta) return;
    setSavingMeta(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const updated = await updateSetlist(setlist.id, {
        title,
        eventDate: eventDate || null,
        notes: notes || null,
      });
      setSetlist(updated);
      setStatusMessage(it.setlists.metaSavedMessage);
    } catch {
      setErrorMessage(it.setlists.saveError);
    } finally {
      setSavingMeta(false);
    }
  };

  const handleAddSong = async (e: FormEvent) => {
    e.preventDefault();
    if (!setlist || !effectiveSelectedSongId || addingSong) return;
    setAddingSong(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const createdItem = await addSongToSetlist(
        setlist.id,
        effectiveSelectedSongId,
        setlist.items.length,
        {
          overrideKey: newOverrideKey || null,
          notes: newItemNotes || null,
        },
      );
      setSetlist((prev) =>
        prev
          ? {
              ...prev,
              itemCount: prev.items.length + 1,
              items: [...prev.items, createdItem],
            }
          : prev,
      );
      setItemNotesDrafts((prev) => ({ ...prev, [createdItem.id]: createdItem.notes ?? '' }));
      setNewOverrideKey('');
      setNewItemNotes('');
      setStatusMessage(it.setlists.songAddedMessage);
    } catch {
      setErrorMessage(it.setlists.saveError);
    } finally {
      setAddingSong(false);
    }
  };

  const commitReorder = async (fromIndex: number, toIndex: number) => {
    if (!setlist || fromIndex === toIndex) return;
    const prevItems = setlist.items;
    const currentIds = prevItems.map((item) => item.id);
    const nextIds = reorderItemIds(currentIds, fromIndex, toIndex);
    const itemById = new Map(prevItems.map((item) => [item.id, item]));
    const nextItems: SetlistItem[] = nextIds
      .map((id, position) => {
        const found = itemById.get(id);
        return found ? { ...found, position } : null;
      })
      .filter((item): item is SetlistItem => item !== null);

    setSetlist({ ...setlist, items: nextItems });
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await reorderSetlistItems(setlist.id, nextIds);
      setStatusMessage(it.setlists.reorderedMessage);
    } catch {
      setSetlist({ ...setlist, items: prevItems });
      setErrorMessage(it.setlists.saveError);
    }
  };

  const handleOverrideKeyChange = async (item: SetlistItem, nextOverride: string) => {
    setBusyItemId(item.id);
    setErrorMessage(null);
    try {
      const updated = await updateSetlistItem(item.id, {
        overrideKey: nextOverride || null,
      });
      setSetlist((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((itItem) => (itItem.id === item.id ? updated : itItem)),
            }
          : prev,
      );
      setStatusMessage(it.setlists.itemUpdatedMessage);
    } catch {
      setErrorMessage(it.setlists.saveError);
    } finally {
      setBusyItemId(null);
    }
  };

  const handleSaveItemNotes = async (item: SetlistItem) => {
    setBusyItemId(item.id);
    setErrorMessage(null);
    try {
      const updated = await updateSetlistItem(item.id, {
        notes: itemNotesDrafts[item.id] ?? null,
      });
      setSetlist((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((itItem) => (itItem.id === item.id ? updated : itItem)),
            }
          : prev,
      );
      setStatusMessage(it.setlists.itemUpdatedMessage);
    } catch {
      setErrorMessage(it.setlists.saveError);
    } finally {
      setBusyItemId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!setlist) return;
    setBusyItemId(itemId);
    setErrorMessage(null);
    const remainingIds = setlist.items.filter((i) => i.id !== itemId).map((i) => i.id);
    try {
      await removeSetlistItem(setlist.id, itemId, remainingIds);
      setSetlist((prev) =>
        prev
          ? {
              ...prev,
              itemCount: prev.items.length - 1,
              items: prev.items
                .filter((i) => i.id !== itemId)
                .map((i, idx) => ({ ...i, position: idx })),
            }
          : prev,
      );
      setStatusMessage(it.setlists.itemRemovedMessage);
    } catch {
      setErrorMessage(it.setlists.saveError);
    } finally {
      setBusyItemId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--arion-text-muted)]">{it.common.loading}</p>;
  }

  if (notFound || !setlist) {
    return (
      <div className="space-y-4">
        <Link
          to="/scalette"
          className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{it.setlists.backToSetlists}</span>
        </Link>
        <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6">
          <p className="text-sm font-semibold text-[var(--arion-danger)]">{it.setlists.notFound}</p>
        </div>
      </div>
    );
  }

  const firstItem = setlist.items[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/scalette"
          className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{it.setlists.backToSetlists}</span>
        </Link>

        {firstItem ? (
          <div className="flex flex-wrap items-center gap-2">
            {can('live:host') ? (
              <Link
                to={`/live?startSetlist=${setlist.id}`}
                className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-live)] px-3.5 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                <Radio className="h-4 w-4" aria-hidden="true" />
                <span>{it.setlists.startLiveButton}</span>
              </Link>
            ) : null}

            <Link
              to={`/repertorio/${firstItem.songId}?setlist=${setlist.id}&item=${firstItem.id}`}
              className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
            >
              <Play className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{it.setlists.openFirstSong}</span>
            </Link>
          </div>
        ) : null}
      </div>

      <PageHeader title={setlist.title} subtitle={it.setlists.songsCount(setlist.items.length)} />

      {statusMessage ? (
        <div
          role="status"
          className="rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] p-3 text-sm font-semibold text-[var(--arion-accent)]"
        >
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-3 text-sm font-semibold text-[var(--arion-danger)]"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Setlist metadata */}
      {canManage ? (
        <form
          onSubmit={(e) => void handleSaveMetadata(e)}
          className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="detail-setlist-title"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.setlists.titleLabel}
              </label>
              <input
                id="detail-setlist-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="detail-setlist-date"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.setlists.eventDateLabel}
              </label>
              <input
                id="detail-setlist-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label
                htmlFor="detail-setlist-notes"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.setlists.notesLabel}
              </label>
              <input
                id="detail-setlist-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={it.setlists.notesPlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingMeta || !title.trim()}
            className="touch-target inline-flex items-center gap-1.5 rounded-md bg-[var(--arion-primary)] px-4 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{savingMeta ? it.setlists.savingMetaButton : it.setlists.saveMetaButton}</span>
          </button>
        </form>
      ) : setlist.notes ? (
        <p className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-3.5 text-sm text-[var(--arion-text-muted)]">
          {setlist.notes}
        </p>
      ) : null}

      {/* Ordered Setlist Items */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
          {it.setlists.sequenceHeading}
        </h2>

        {setlist.items.length === 0 ? (
          <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 text-sm text-[var(--arion-text-muted)] shadow-2xs">
            {it.setlists.emptySetlistItems}
          </div>
        ) : (
          <ol className="space-y-2.5">
            {setlist.items.map((item, idx) => {
              const originalKey = item.song?.originalKey ?? 'Do';
              const effKey = resolveEffectiveSetlistKey(originalKey, item.overrideKey);
              const formattedOriginalKey = formatDisplayKey(originalKey);
              const selectValue = item.overrideKey ? formatDisplayKey(item.overrideKey) : '';
              const perItemKeyOptions =
                keyOptions.includes(selectValue) || !selectValue
                  ? keyOptions
                  : [selectValue, ...keyOptions];

              return (
                <li
                  key={item.id}
                  draggable={canManage}
                  onDragStart={() => setDraggingItemId(item.id)}
                  onDragOver={(e) => {
                    if (canManage) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!canManage || !draggingItemId) return;
                    const fromIdx = setlist.items.findIndex((i) => i.id === draggingItemId);
                    setDraggingItemId(null);
                    if (fromIdx >= 0 && fromIdx !== idx) {
                      void commitReorder(fromIdx, idx);
                    }
                  }}
                  onDragEnd={() => setDraggingItemId(null)}
                  className="space-y-2.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-3.5 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {canManage ? (
                        <GripVertical
                          className="h-4 w-4 shrink-0 cursor-grab text-[var(--arion-text-muted)]"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="w-5 shrink-0 text-xs font-bold text-[var(--arion-text-muted)]">
                        {idx + 1}.
                      </span>
                      <Link
                        to={`/repertorio/${item.songId}?setlist=${setlist.id}&item=${item.id}`}
                        className="truncate text-sm font-bold text-[var(--arion-text)] hover:text-[var(--arion-primary)] sm:text-base"
                      >
                        {item.song?.title ?? '-'}
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
                        {formatDisplayKey(effKey)}
                      </span>

                      {canManage ? (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0 || busyItemId === item.id}
                            aria-label={`${it.setlists.moveUpLabel} ${item.song?.title ?? ''}`}
                            onClick={() => void commitReorder(idx, idx - 1)}
                            className="touch-target rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-1.5 text-[var(--arion-text)] disabled:opacity-35"
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === setlist.items.length - 1 || busyItemId === item.id}
                            aria-label={`${it.setlists.moveDownLabel} ${item.song?.title ?? ''}`}
                            onClick={() => void commitReorder(idx, idx + 1)}
                            className="touch-target rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-1.5 text-[var(--arion-text)] disabled:opacity-35"
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={busyItemId === item.id}
                            aria-label={`${it.setlists.removeSongLabel} ${item.song?.title ?? ''}`}
                            onClick={() => void handleRemoveItem(item.id)}
                            className="touch-target rounded border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-1.5 text-[var(--arion-danger)] disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {canManage ? (
                    <div className="grid gap-2 border-t border-[var(--arion-border)] pt-2.5 sm:grid-cols-2">
                      <label className="space-y-1 text-xs">
                        <span className="block font-bold text-[var(--arion-text-muted)]">
                          {it.setlists.itemKeyOverrideLabel}
                        </span>
                        <select
                          aria-label={`${it.setlists.itemKeyOverrideLabel} ${item.song?.title ?? ''}`}
                          disabled={busyItemId === item.id}
                          value={selectValue}
                          onChange={(e) => void handleOverrideKeyChange(item, e.target.value)}
                          className="min-h-10 w-full rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--arion-text)]"
                        >
                          <option value="">
                            {it.setlists.originalKeyOption(formattedOriginalKey)}
                          </option>
                          {perItemKeyOptions.map((keyOpt) => (
                            <option key={keyOpt} value={keyOpt}>
                              {keyOpt}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="space-y-1 text-xs">
                        <label
                          htmlFor={`item-notes-${item.id}`}
                          className="block font-bold text-[var(--arion-text-muted)]"
                        >
                          {it.setlists.itemNotesLabel}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`item-notes-${item.id}`}
                            type="text"
                            value={itemNotesDrafts[item.id] ?? ''}
                            onChange={(e) =>
                              setItemNotesDrafts((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder={it.setlists.itemNotesPlaceholder}
                            className="min-h-10 w-full rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-1.5 text-xs text-[var(--arion-text)]"
                          />
                          <button
                            type="button"
                            disabled={busyItemId === item.id}
                            onClick={() => void handleSaveItemNotes(item)}
                            className="min-h-10 shrink-0 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
                          >
                            {it.common.save}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : item.notes ? (
                    <p className="text-xs text-[var(--arion-text-muted)]">{item.notes}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Add Song to Setlist (Conductor / Admin) */}
      {canManage ? (
        <form
          onSubmit={(e) => void handleAddSong(e)}
          className="space-y-3 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-surface-subtle)] p-4"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text)]">
            <Plus className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.setlists.addSongHeading}</span>
          </h2>

          {songs.length === 0 ? (
            <p className="text-xs text-[var(--arion-text-muted)]">{it.setlists.noSongsInCatalog}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="add-song-search"
                  className="block text-xs font-bold text-[var(--arion-text)]"
                >
                  {it.setlists.filterSongsLabel}
                </label>
                <input
                  id="add-song-search"
                  type="search"
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  placeholder={it.setlists.filterSongsPlaceholder}
                  className="min-h-10 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs text-[var(--arion-text)]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="add-song-select"
                  className="block text-xs font-bold text-[var(--arion-text)]"
                >
                  {it.setlists.selectSongLabel}
                </label>
                <select
                  id="add-song-select"
                  value={effectiveSelectedSongId}
                  onChange={(e) => setSelectedSongId(e.target.value)}
                  className="min-h-10 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)]"
                >
                  {filteredSongs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({formatDisplayKey(s.originalKey)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="add-song-override-key"
                  className="block text-xs font-bold text-[var(--arion-text)]"
                >
                  {it.setlists.itemKeyOverrideLabel}
                </label>
                <select
                  id="add-song-override-key"
                  value={newOverrideKey}
                  onChange={(e) => setNewOverrideKey(e.target.value)}
                  className="min-h-10 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)]"
                >
                  <option value="">{it.setlists.useSongDefaultKeyOption}</option>
                  {keyOptions.map((keyOpt) => (
                    <option key={keyOpt} value={keyOpt}>
                      {keyOpt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="add-song-notes"
                  className="block text-xs font-bold text-[var(--arion-text)]"
                >
                  {it.setlists.itemNotesLabel}
                </label>
                <input
                  id="add-song-notes"
                  type="text"
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  placeholder={it.setlists.itemNotesPlaceholder}
                  className="min-h-10 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs text-[var(--arion-text)]"
                />
              </div>
            </div>
          )}

          {songs.length > 0 ? (
            <button
              type="submit"
              disabled={addingSong || !effectiveSelectedSongId}
              className="touch-target rounded-md bg-[var(--arion-primary)] px-4 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
            >
              {addingSong ? it.setlists.addingSongButton : it.setlists.addSongButton}
            </button>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
