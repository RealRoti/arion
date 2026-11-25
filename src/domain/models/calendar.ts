export const CALENDAR_CATEGORIES = ['rehearsal', 'concert', 'service', 'other'] as const;

export type CalendarCategory = (typeof CALENDAR_CATEGORIES)[number];

export function isCalendarCategory(value: string): value is CalendarCategory {
  return (CALENDAR_CATEGORIES as readonly string[]).includes(value);
}

export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly category: CalendarCategory;
  readonly eventDate: string;
  readonly startTime: string;
  readonly endTime: string | null;
  readonly location: string | null;
  readonly setlistId: string | null;
  readonly setlistTitle: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCalendarEventInput {
  readonly title: string;
  readonly category: CalendarCategory;
  readonly eventDate: string;
  readonly startTime: string;
  readonly endTime?: string | null;
  readonly location?: string | null;
  readonly setlistId?: string | null;
  readonly notes?: string | null;
}

export type UpdateCalendarEventInput = CreateCalendarEventInput;

export function toLocalIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatTimeShort(rawTime: string | null | undefined): string {
  if (!rawTime) return '';
  const match = /^(\d{2}:\d{2})/.exec(rawTime.trim());
  return match ? (match[1] ?? rawTime.trim()) : rawTime.trim();
}

export function filterCalendarEvents(
  events: readonly CalendarEvent[],
  category: 'all' | CalendarCategory,
): CalendarEvent[] {
  return events.filter((evt) => category === 'all' || evt.category === category);
}

export function getUpcomingCalendarEvents(
  events: readonly CalendarEvent[],
  fromIsoDate: string,
): CalendarEvent[] {
  return events
    .filter((evt) => evt.eventDate >= fromIsoDate)
    .sort(
      (a, b) => a.eventDate.localeCompare(b.eventDate) || a.startTime.localeCompare(b.startTime),
    );
}

export function getNextCalendarEvent(
  events: readonly CalendarEvent[],
  fromIsoDate: string,
): CalendarEvent | null {
  return getUpcomingCalendarEvents(events, fromIsoDate)[0] ?? null;
}
