import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Copy,
  ListMusic,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { RequirePermission } from '@/components/RequirePermission';
import { useTheme } from '@/components/useTheme';
import { getAppEnv } from '@/config/env';
import { formatKey, parseKey } from '@/domain/chords/transposer';
import { resolveEffectiveSetlistKey, type SetlistWithItems } from '@/domain/models/setlists';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';
import {
  createSetlist,
  deleteSetlist,
  duplicateSetlist,
  listSetlists,
} from '@/services/setlistsService';

function formatIsoDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  const monthName = it.calendar.months[Number(m) - 1] ?? m;
  return `${Number(d)} ${monthName} ${y}`;
}

export function SetlistsPage() {
  const { profile, can } = useAuth();
  const { notation } = useTheme();
  const isSupabaseConfigured = getAppEnv().isSupabaseConfigured;

  const [setlists, setSetlists] = useState<SetlistWithItems[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const loaded = await listSetlists();
        if (!cancelled) {
          setSetlists(loaded);
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
  }, [isSupabaseConfigured]);

  const formatSongKey = (rawKey: string) => {
    const parsed = parseKey(rawKey);
    return parsed ? formatKey(parsed, notation) : rawKey;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !newTitle.trim() || creating) return;

    setCreating(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const created = await createSetlist(
        {
          title: newTitle,
          eventDate: newDate || null,
          notes: newNotes || null,
        },
        profile.id,
      );
      setSetlists((prev) => [created, ...prev]);
      setNewTitle('');
      setNewDate('');
      setNewNotes('');
      setShowCreateForm(false);
      setStatusMessage(it.setlists.createdMessage);
    } catch {
      setErrorMessage(it.setlists.saveError);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (setlistId: string) => {
    if (!profile || busyId) return;
    setBusyId(setlistId);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const copy = await duplicateSetlist(setlistId, it.setlists.duplicateSuffix, profile.id);
      setSetlists((prev) => [copy, ...prev]);
      setStatusMessage(it.setlists.duplicatedMessage);
    } catch {
      setErrorMessage(it.setlists.saveError);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (setlistId: string) => {
    if (busyId) return;
    setBusyId(setlistId);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await deleteSetlist(setlistId);
      setSetlists((prev) => prev.filter((item) => item.id !== setlistId));
      setConfirmDeleteId(null);
      setStatusMessage(it.setlists.deletedMessage);
    } catch {
      setErrorMessage(it.setlists.saveError);
    } finally {
      setBusyId(null);
    }
  };

  const canManage = can('setlists:manage');

  return (
    <div className="space-y-4">
      <Link
        to="/altro"
        className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{it.setlists.backToMore}</span>
      </Link>

      <PageHeader
        title={it.setlists.title}
        subtitle={it.setlists.subtitle}
        actions={
          <RequirePermission permission="setlists:manage" fallback={null}>
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="touch-target inline-flex items-center gap-1.5 rounded-md bg-[var(--arion-primary)] px-3.5 py-2 text-sm font-bold text-[var(--arion-primary-contrast)] shadow-2xs hover:bg-[var(--arion-primary-hover)]"
            >
              <Plus className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{showCreateForm ? it.common.cancel : it.setlists.newSetlistButton}</span>
            </button>
          </RequirePermission>
        }
      />

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

      {canManage && showCreateForm ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-3 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-surface)] p-4 shadow-2xs"
        >
          <h2 className="text-sm font-bold text-[var(--arion-text)]">
            {it.setlists.createFormTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="new-setlist-title"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.setlists.titleLabel}
              </label>
              <input
                id="new-setlist-title"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={it.setlists.titlePlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="new-setlist-date"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.setlists.eventDateLabel}
              </label>
              <input
                id="new-setlist-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label
                htmlFor="new-setlist-notes"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.setlists.notesLabel}
              </label>
              <input
                id="new-setlist-notes"
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder={it.setlists.notesPlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="touch-target rounded-md bg-[var(--arion-primary)] px-4 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
          >
            {creating ? it.setlists.creatingButton : it.setlists.createButton}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--arion-text-muted)]">{it.common.loading}</p>
      ) : setlists.length === 0 ? (
        <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6 text-center shadow-2xs">
          <p className="font-editorial text-lg font-bold text-[var(--arion-text)]">
            {it.setlists.emptyTitle}
          </p>
          <p className="mt-1 text-sm text-[var(--arion-text-muted)]">{it.setlists.emptySubtitle}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {setlists.map((setlist) => {
            const firstItem = setlist.items[0] ?? null;

            return (
              <section
                key={setlist.id}
                className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/scalette/${setlist.id}`}
                      className="inline-flex items-center gap-2 text-base font-bold text-[var(--arion-text)] hover:text-[var(--arion-primary)]"
                    >
                      <ListMusic
                        className="h-4 w-4 shrink-0 text-[var(--arion-accent)]"
                        aria-hidden="true"
                      />
                      <span className="truncate">{setlist.title}</span>
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[var(--arion-text-muted)]">
                      {setlist.eventDate ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          <span>{formatIsoDateShort(setlist.eventDate)}</span>
                        </span>
                      ) : null}
                      <span>{it.setlists.songsCount(setlist.items.length)}</span>
                    </p>
                    {setlist.notes ? (
                      <p className="mt-1 text-xs text-[var(--arion-text-muted)]">{setlist.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/scalette/${setlist.id}`}
                      className="touch-target inline-flex items-center rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
                    >
                      {canManage ? it.setlists.manageButton : it.setlists.openDetailsButton}
                    </Link>

                    {firstItem ? (
                      <Link
                        to={`/repertorio/${firstItem.songId}?setlist=${setlist.id}&item=${firstItem.id}`}
                        className="touch-target inline-flex items-center gap-1.5 rounded-md bg-[var(--arion-primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
                      >
                        <Play
                          className="h-3.5 w-3.5 text-[var(--arion-accent)]"
                          aria-hidden="true"
                        />
                        <span>{it.setlists.openFirstSong}</span>
                      </Link>
                    ) : null}

                    {canManage ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === setlist.id}
                          onClick={() => void handleDuplicate(setlist.id)}
                          aria-label={`${it.setlists.duplicateButton} ${setlist.title}`}
                          className="touch-target inline-flex items-center gap-1 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)] disabled:opacity-50"
                        >
                          <Copy
                            className="h-3.5 w-3.5 text-[var(--arion-accent)]"
                            aria-hidden="true"
                          />
                          <span>{it.setlists.duplicateButton}</span>
                        </button>

                        {confirmDeleteId === setlist.id ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={busyId === setlist.id}
                              onClick={() => void handleDelete(setlist.id)}
                              className="touch-target rounded-md bg-[var(--arion-danger)] px-2.5 py-1.5 text-xs font-bold text-white"
                            >
                              {it.common.confirm}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="touch-target rounded-md border border-[var(--arion-border)] px-2.5 py-1.5 text-xs font-bold text-[var(--arion-text)]"
                            >
                              {it.common.cancel}
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === setlist.id}
                            onClick={() => setConfirmDeleteId(setlist.id)}
                            aria-label={`${it.common.delete} ${setlist.title}`}
                            className="touch-target inline-flex items-center rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 px-2.5 py-1.5 text-xs font-bold text-[var(--arion-danger)] hover:bg-[var(--arion-danger)]/15"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                {setlist.items.length > 0 ? (
                  <ol className="divide-y divide-[var(--arion-border)] rounded border border-[var(--arion-border)] bg-[var(--arion-bg)]">
                    {setlist.items.map((item, idx) => {
                      const effKey = resolveEffectiveSetlistKey(
                        item.song?.originalKey ?? 'Do',
                        item.overrideKey,
                      );
                      return (
                        <li key={item.id}>
                          <Link
                            to={`/repertorio/${item.songId}?setlist=${setlist.id}&item=${item.id}`}
                            className="touch-target flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-[var(--arion-surface-subtle)]"
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="w-5 text-xs font-bold text-[var(--arion-text-muted)]">
                                {idx + 1}.
                              </span>
                              <span className="truncate font-semibold text-[var(--arion-text)]">
                                {item.song?.title ?? '-'}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span className="text-xs font-bold text-[var(--arion-accent)]">
                                {formatSongKey(effKey)}
                              </span>
                              <ChevronRight
                                className="h-4 w-4 text-[var(--arion-text-muted)]"
                                aria-hidden="true"
                              />
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p className="text-xs text-[var(--arion-text-muted)]">
                    {it.setlists.emptySetlistItems}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
