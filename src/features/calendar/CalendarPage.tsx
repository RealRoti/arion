import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  ListMusic,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { buildDemoCalendarEvents, type DemoCalendarEvent } from '@/features/repertoire/demoSongs';
import { it } from '@/i18n/it';

type CalendarViewMode = 'upcoming' | 'month';
type CalendarFilter = 'all' | 'rehearsal' | 'concert' | 'service';

function toLocalIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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
  const now = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toLocalIsoDate(now), [now]);
  const events = useMemo(() => buildDemoCalendarEvents(now), [now]);

  const [viewMode, setViewMode] = useState<CalendarViewMode>('upcoming');
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonthIdx, setViewMonthIdx] = useState<number>(now.getMonth());

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => filter === 'all' || evt.category === filter);
  }, [events, filter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, DemoCalendarEvent[]>();
    for (const evt of filteredEvents) {
      const list = map.get(evt.date) ?? [];
      list.push(evt);
      map.set(evt.date, list);
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
        }
      />

      {/* Category Filter */}
      <div role="group" aria-label={it.calendar.filterLabel} className="flex flex-wrap gap-2">
        {(
          [
            { key: 'all', label: it.calendar.filterAll },
            { key: 'rehearsal', label: it.calendar.filterRehearsal },
            { key: 'concert', label: it.calendar.filterConcert },
            { key: 'service', label: it.calendar.filterService },
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

      {viewMode === 'upcoming' ? (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6 text-center shadow-2xs">
              <p className="text-sm font-semibold text-[var(--arion-text-muted)]">
                {it.calendar.emptyUpcoming}
              </p>
            </div>
          ) : (
            filteredEvents.map((evt) => <EventCard key={evt.id} event={evt} showDate />)
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
                  <EventCard key={evt.id} event={evt} showDate={false} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <p className="text-xs text-[var(--arion-text-muted)]">{it.calendar.demoNotice}</p>
    </div>
  );
}

function EventCard({ event, showDate }: { event: DemoCalendarEvent; showDate: boolean }) {
  return (
    <div className="rounded-md border border-[var(--arion-border)] border-l-4 border-l-[var(--arion-accent)] bg-[var(--arion-surface)] p-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
          {it.calendar.categories[event.category]}
        </span>
        {showDate ? (
          <span className="text-xs font-semibold text-[var(--arion-text-muted)]">
            {formatReadableDate(event.date)}
          </span>
        ) : null}
      </div>

      <h3 className="mt-2 text-base font-bold text-[var(--arion-text)]">{event.title}</h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--arion-text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {event.startTime} – {event.endTime}
          </span>
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{event.location}</span>
        </span>
      </div>

      {event.setlistId ? (
        <div className="mt-3 pt-2.5 border-t border-[var(--arion-border)]">
          <Link
            to="/scalette"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--arion-primary)] hover:underline"
          >
            <ListMusic className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{it.calendar.openSetlistLink}</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
