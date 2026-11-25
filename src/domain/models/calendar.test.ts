import { describe, expect, it as vitestIt } from 'vitest';
import {
  filterCalendarEvents,
  formatTimeShort,
  getNextCalendarEvent,
  getUpcomingCalendarEvents,
  type CalendarEvent,
} from '@/domain/models/calendar';

const SAMPLE_EVENTS: readonly CalendarEvent[] = [
  {
    id: 'evt-past',
    title: 'Prova passata',
    category: 'rehearsal',
    eventDate: '2026-11-20',
    startTime: '20:30',
    endTime: '22:00',
    location: 'Sala prove',
    setlistId: null,
    setlistTitle: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'evt-late',
    title: 'Concerto serale',
    category: 'concert',
    eventDate: '2026-12-10',
    startTime: '21:00',
    endTime: null,
    location: 'Auditorium',
    setlistId: 'sl-1',
    setlistTitle: 'Scaletta Concerto',
    notes: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'evt-soon',
    title: 'Servizio domenicale',
    category: 'service',
    eventDate: '2026-11-29',
    startTime: '10:30',
    endTime: '11:30',
    location: 'Aula grande',
    setlistId: null,
    setlistTitle: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
  },
];

describe('Calendar domain helpers', () => {
  vitestIt('formats HH:MM:SS Postgres times cleanly to HH:MM', () => {
    expect(formatTimeShort('20:45:00')).toBe('20:45');
    expect(formatTimeShort('09:15')).toBe('09:15');
    expect(formatTimeShort(null)).toBe('');
  });

  vitestIt('filters events by category and finds next chronological upcoming event', () => {
    expect(filterCalendarEvents(SAMPLE_EVENTS, 'concert')).toHaveLength(1);
    expect(filterCalendarEvents(SAMPLE_EVENTS, 'all')).toHaveLength(3);

    const upcoming = getUpcomingCalendarEvents(SAMPLE_EVENTS, '2026-11-25');
    expect(upcoming.map((e) => e.id)).toEqual(['evt-soon', 'evt-late']);

    const next = getNextCalendarEvent(SAMPLE_EVENTS, '2026-11-25');
    expect(next?.id).toBe('evt-soon');
  });
});
