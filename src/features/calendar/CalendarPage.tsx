import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  ListMusic,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { RequirePermission } from '@/components/RequirePermission';
import { getAppEnv } from '@/config/env';
import {
  CALENDAR_CATEGORIES,
  filterCalendarEvents,
  getUpcomingCalendarEvents,
  toLocalIsoDate,
  type CalendarCategory,
  type CalendarEvent,
} from '@/domain/models/calendar';
import type { SetlistWithItems } from '@/domain/models/setlists';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from '@/services/calendarService';
import { listSetlists } from '@/services/setlistsService';

type CalendarViewMode = 'upcoming' | 'month';
type CalendarFilter = 'all' | CalendarCategory;

function formatReadableDate(isoDate: string): string {
  const [yStr, mStr, dStr] = isoDate.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return isoDate;
  }
  const monthName = it.calendar.months[m - 1] ?? '';
  return `${d} ${monthName} ${y}`;
}

export function CalendarPage() {
  const { profile, can } = useAuth();
  const canManage = can('calendar:manage');
  const isSupabaseConfigured = getAppEnv().isSupabaseConfigured;

  const now = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toLocalIsoDate(now), [now]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [setlists, setSetlists] = useState<SetlistWithItems[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<CalendarViewMode>('upcoming');
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonthIdx, setViewMonthIdx] = useState<number>(now.getMonth());

  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CalendarCategory>('rehearsal');
  const [eventDate, setEventDate] = useState(todayIso);
  const [startTime, setStartTime] = useState('20:30');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [setlistId, setSetlistId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const [loadedEvents, loadedSetlists] = await Promise.all([
          listCalendarEvents(),
          canManage
            ? listSetlists().catch(() => [] as SetlistWithItems[])
            : Promise.resolve([] as SetlistWithItems[]),
        ]);
        if (!cancelled) {
          setEvents(loadedEvents);
          setSetlists(loadedSetlists);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(it.calendar.loadError);
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
  }, [canManage, isSupabaseConfigured]);

  const filteredEvents = useMemo(() => filterCalendarEvents(events, filter), [events, filter]);

  const upcomingEvents = useMemo(
    () => getUpcomingCalendarEvents(filteredEvents, todayIso),
    [filteredEvents, todayIso],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of filteredEvents) {
      const list = map.get(evt.eventDate) ?? [];
      list.push(evt);
      map.set(evt.eventDate, list);
    }
    return map;
  }, [filteredEvents]);

  const monthCells = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewYear, viewMonthIdx, 1, 12, 0, 0));
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonthIdx + 1, 0, 12, 0, 0)).getUTCDate();
    const startOffset = (firstDay.getUTCDay() + 6) % 7;

    const cells: Array<{ dateStr: string | null; dayNumber: number | null }> = [];
    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ dateStr: null, dayNumber: null });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateStr = `${viewYear}-${String(viewMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNumber: d });
    }
    return cells;
  }, [viewYear, viewMonthIdx]);

  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];

  const resetForm = () => {
    setEditingEventId(null);
    setTitle('');
    setCategory('rehearsal');
    setEventDate(selectedDate || todayIso);
    setStartTime('20:30');
    setEndTime('');
    setLocation('');
    setSetlistId('');
    setNotes('');
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    setTitle(evt.title);
    setCategory(evt.category);
    setEventDate(evt.eventDate);
    setStartTime(evt.startTime);
    setEndTime(evt.endTime ?? '');
    setLocation(evt.location ?? '');
    setSetlistId(evt.setlistId ?? '');
    setNotes(evt.notes ?? '');
    setShowForm(true);
  };

  const handleSaveEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !title.trim() || !eventDate || !startTime || saving) return;

    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const payload = {
        title,
        category,
        eventDate,
        startTime,
        endTime: endTime || null,
        location: location || null,
        setlistId: setlistId || null,
        notes: notes || null,
      };

      if (editingEventId) {
        const updated = await updateCalendarEvent(editingEventId, payload);
        setEvents((prev) =>
          prev
            .map((evt) => (evt.id === updated.id ? updated : evt))
            .sort(
              (a, b) =>
                a.eventDate.localeCompare(b.eventDate) || a.startTime.localeCompare(b.startTime),
            ),
        );
        setStatusMessage(it.calendar.updatedMessage);
      } else {
        const created = await createCalendarEvent(payload, profile.id);
        setEvents((prev) =>
          [...prev, created].sort(
            (a, b) =>
              a.eventDate.localeCompare(b.eventDate) || a.startTime.localeCompare(b.startTime),
          ),
        );
        setStatusMessage(it.calendar.createdMessage);
      }

      setShowForm(false);
      resetForm();
    } catch {
      setErrorMessage(it.calendar.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (busyId) return;
    setBusyId(eventId);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await deleteCalendarEvent(eventId);
      setEvents((prev) => prev.filter((evt) => evt.id !== eventId));
      setConfirmDeleteId(null);
      setStatusMessage(it.calendar.deletedMessage);
    } catch {
      setErrorMessage(it.calendar.saveError);
    } finally {
      setBusyId(null);
    }
  };

  const goPrevMonth = () => {
    if (viewMonthIdx === 0) {
      setViewYear((y) => y - 1);
      setViewMonthIdx(11);
    } else {
      setViewMonthIdx((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonthIdx === 11) {
      setViewYear((y) => y + 1);
      setViewMonthIdx(0);
    } else {
      setViewMonthIdx((m) => m + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonthIdx(today.getMonth());
    setSelectedDate(toLocalIsoDate(today));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={it.calendar.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={it.calendar.title}
              className="inline-flex rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-0.5 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setViewMode('upcoming')}
                aria-pressed={viewMode === 'upcoming'}
                className={`min-h-10 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                  viewMode === 'upcoming'
                    ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                    : 'text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
                }`}
              >
                <List className="h-4 w-4" aria-hidden="true" />
                <span>{it.calendar.viewUpcoming}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                aria-pressed={viewMode === 'month'}
                className={`min-h-10 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                  viewMode === 'month'
                    ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                    : 'text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
                }`}
              >
                <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                <span>{it.calendar.viewMonth}</span>
              </button>
            </div>

            <RequirePermission permission="calendar:manage" fallback={null}>
              <button
                type="button"
                onClick={() => (showForm ? setShowForm(false) : openCreateForm())}
                className="touch-target inline-flex items-center gap-1.5 rounded-md bg-[var(--arion-primary)] px-3.5 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] shadow-2xs hover:bg-[var(--arion-primary-hover)]"
              >
                <Plus className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
                <span>{showForm ? it.common.cancel : it.calendar.newEventButton}</span>
              </button>
            </RequirePermission>
          </div>
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

      {canManage && showForm ? (
        <form
          onSubmit={(e) => void handleSaveEvent(e)}
          className="space-y-3 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-surface)] p-4 shadow-2xs"
        >
          <h2 className="text-sm font-bold text-[var(--arion-text)]">
            {editingEventId ? it.calendar.editFormTitle : it.calendar.createFormTitle}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label
                htmlFor="cal-event-title"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.calendar.titleLabel}
              </label>
              <input
                id="cal-event-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={it.calendar.titlePlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="cal-event-category"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.calendar.categoryLabel}
              </label>
              <select
                id="cal-event-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CalendarCategory)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)]"
              >
                {CALENDAR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {it.calendar.categories[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="cal-event-date"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.calendar.dateLabel}
              </label>
              <input
                id="cal-event-date"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="cal-event-start"
                  className="block text-xs font-bold text-[var(--arion-text)]"
                >
                  {it.calendar.startTimeLabel}
                </label>
                <input
                  id="cal-event-start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-2 text-sm text-[var(--arion-text)]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="cal-event-end"
                  className="block text-xs font-bold text-[var(--arion-text)]"
                >
                  {it.calendar.endTimeLabel}
                </label>
                <input
                  id="cal-event-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-2 text-sm text-[var(--arion-text)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="cal-event-location"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.calendar.locationLabel}
              </label>
              <input
                id="cal-event-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={it.calendar.locationPlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)]"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="cal-event-setlist"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.calendar.setlistLabel}
              </label>
              <select
                id="cal-event-setlist"
                value={setlistId}
                onChange={(e) => setSetlistId(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)]"
              >
                <option value="">{it.calendar.noSetlistOption}</option>
                {setlists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="cal-event-notes"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.calendar.notesLabel}
              </label>
              <input
                id="cal-event-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={it.calendar.notesPlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !title.trim() || !eventDate || !startTime}
            className="touch-target rounded-md bg-[var(--arion-primary)] px-4 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
          >
            {saving
              ? it.calendar.savingButton
              : editingEventId
                ? it.calendar.saveEditButton
                : it.calendar.createButton}
          </button>
        </form>
      ) : null}

      {/* Category Filter */}
      <div role="group" aria-label={it.calendar.filterLabel} className="flex flex-wrap gap-2">
        {(
          [
            { key: 'all', label: it.calendar.filterAll },
            { key: 'rehearsal', label: it.calendar.filterRehearsal },
            { key: 'concert', label: it.calendar.filterConcert },
            { key: 'service', label: it.calendar.filterService },
            { key: 'other', label: it.calendar.filterOther },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`min-h-10 rounded-full border px-3.5 py-1 text-xs font-bold transition-colors ${
              filter === key
                ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                : 'border-[var(--arion-border)] bg-[var(--arion-surface)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--arion-text-muted)]">{it.common.loading}</p>
      ) : viewMode === 'upcoming' ? (
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6 text-center shadow-2xs">
              <p className="text-sm font-semibold text-[var(--arion-text-muted)]">
                {it.calendar.emptyUpcoming}
              </p>
            </div>
          ) : (
            upcomingEvents.map((evt) => (
              <EventCard
                key={evt.id}
                event={evt}
                showDate
                canManage={canManage}
                busy={busyId === evt.id}
                confirmingDelete={confirmDeleteId === evt.id}
                onEdit={() => openEditForm(evt)}
                onAskDelete={() => setConfirmDeleteId(evt.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => void handleDeleteEvent(evt.id)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={goPrevMonth}
                aria-label={it.calendar.prevMonthLabel}
                className="touch-target inline-flex items-center justify-center rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-2.5">
                <h2 className="font-editorial text-lg font-bold text-[var(--arion-text)]">
                  {it.calendar.months[viewMonthIdx]} {viewYear}
                </h2>
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded border border-[var(--arion-border)] bg-[var(--arion-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--arion-accent)] hover:border-[var(--arion-accent)]"
                >
                  {it.calendar.todayButton}
                </button>
              </div>

              <button
                type="button"
                onClick={goNextMonth}
                aria-label={it.calendar.nextMonthLabel}
                className="touch-target inline-flex items-center justify-center rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-wider text-[var(--arion-text-muted)]">
              {it.calendar.weekdaysShort.map((wk) => (
                <div key={wk} className="py-1">
                  {wk}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell, idx) => {
                if (!cell.dateStr || cell.dayNumber === null) {
                  return <div key={`empty-${idx}`} className="h-11" />;
                }
                const dateStr = cell.dateStr;
                const dayEvents = eventsByDate.get(dateStr) ?? [];
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayIso;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`flex h-11 flex-col items-center justify-between rounded border p-1 transition-colors ${
                      isSelected
                        ? 'border-2 border-[var(--arion-primary)] bg-[var(--arion-accent-soft)] font-extrabold text-[var(--arion-text)]'
                        : isToday
                          ? 'border-[var(--arion-accent)] bg-[var(--arion-bg)] font-bold text-[var(--arion-text)]'
                          : 'border-[var(--arion-border)] bg-[var(--arion-surface)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
                    }`}
                  >
                    <span className="text-xs leading-none">{cell.dayNumber}</span>
                    {dayEvents.length > 0 ? (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[var(--arion-accent)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="h-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <section className="space-y-2.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs">
            <h3 className="font-editorial text-base font-bold text-[var(--arion-text)]">
              {formatReadableDate(selectedDate)}
            </h3>
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-[var(--arion-text-muted)]">{it.calendar.emptyDay}</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((evt) => (
                  <EventCard
                    key={evt.id}
                    event={evt}
                    showDate={false}
                    canManage={canManage}
                    busy={busyId === evt.id}
                    confirmingDelete={confirmDeleteId === evt.id}
                    onEdit={() => openEditForm(evt)}
                    onAskDelete={() => setConfirmDeleteId(evt.id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                    onConfirmDelete={() => void handleDeleteEvent(evt.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  showDate,
  canManage,
  busy,
  confirmingDelete,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  event: CalendarEvent;
  showDate: boolean;
  canManage: boolean;
  busy: boolean;
  confirmingDelete: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <div className="rounded-md border border-[var(--arion-border)] border-l-4 border-l-[var(--arion-accent)] bg-[var(--arion-surface)] p-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
            {it.calendar.categories[event.category]}
          </span>
          {showDate ? (
            <span className="text-xs font-semibold text-[var(--arion-text-muted)]">
              {formatReadableDate(event.eventDate)}
            </span>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              aria-label={`${it.common.edit} ${event.title}`}
              onClick={onEdit}
              className="touch-target rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-1.5 text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {confirmingDelete ? (
              <span className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onConfirmDelete}
                  className="touch-target rounded bg-[var(--arion-danger)] px-2.5 py-1 text-xs font-bold text-white"
                >
                  {it.common.confirm}
                </button>
                <button
                  type="button"
                  onClick={onCancelDelete}
                  className="touch-target rounded border border-[var(--arion-border)] px-2 py-1 text-xs font-bold text-[var(--arion-text)]"
                >
                  {it.common.cancel}
                </button>
              </span>
            ) : (
              <button
                type="button"
                disabled={busy}
                aria-label={`${it.common.delete} ${event.title}`}
                onClick={onAskDelete}
                className="touch-target rounded border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-1.5 text-[var(--arion-danger)]"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : null}
      </div>

      <h3 className="mt-2 text-base font-bold text-[var(--arion-text)]">{event.title}</h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--arion-text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {event.startTime}
            {event.endTime ? ` - ${event.endTime}` : ''}
          </span>
        </span>
        {event.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{event.location}</span>
          </span>
        ) : null}
      </div>

      {event.notes ? (
        <p className="mt-1.5 text-xs text-[var(--arion-text-muted)]">{event.notes}</p>
      ) : null}

      {event.setlistId ? (
        <div className="mt-3 border-t border-[var(--arion-border)] pt-2.5">
          <Link
            to={`/scalette/${event.setlistId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--arion-primary)] hover:underline"
          >
            <ListMusic className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {event.setlistTitle
                ? `${it.calendar.openSetlistLink}: ${event.setlistTitle}`
                : it.calendar.openSetlistLink}
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
