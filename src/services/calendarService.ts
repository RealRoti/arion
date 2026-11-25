import {
  formatTimeShort,
  isCalendarCategory,
  type CalendarEvent,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from '@/domain/models/calendar';
import { getSupabaseClient } from '@/services/supabaseClient';

export type CalendarServiceErrorCode = 'INVALID_INPUT' | 'GENERIC';

export class CalendarServiceError extends Error {
  readonly code: CalendarServiceErrorCode;

  constructor(code: CalendarServiceErrorCode, message: string) {
    super(message);
    this.name = 'CalendarServiceError';
    this.code = code;
  }
}

interface JoinedSetlistTitle {
  title: string;
}

interface CalendarEventRow {
  id: string;
  title: string;
  category: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  setlist_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  setlists?: JoinedSetlistTitle | JoinedSetlistTitle[] | null;
}

const CALENDAR_EVENT_SELECT =
  'id, title, category, event_date, start_time, end_time, location, setlist_id, notes, created_at, updated_at, setlists(title)';

function mapCalendarEventRow(row: CalendarEventRow): CalendarEvent {
  const joinedSetlist = Array.isArray(row.setlists) ? row.setlists[0] : row.setlists;
  return {
    id: row.id,
    title: row.title,
    category: isCalendarCategory(row.category) ? row.category : 'other',
    eventDate: row.event_date,
    startTime: formatTimeShort(row.start_time),
    endTime: row.end_time ? formatTimeShort(row.end_time) : null,
    location: row.location,
    setlistId: row.setlist_id,
    setlistTitle: joinedSetlist?.title ?? null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeEventPayload(input: CreateCalendarEventInput) {
  const title = input.title.trim();
  if (!title || !input.eventDate.trim() || !input.startTime.trim()) {
    throw new CalendarServiceError('INVALID_INPUT', 'Title, date and start time are required');
  }

  return {
    title,
    category: input.category,
    event_date: input.eventDate.trim(),
    start_time: input.startTime.trim(),
    end_time: input.endTime?.trim() || null,
    location: input.location?.trim() || null,
    setlist_id: input.setlistId?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('calendar_events')
    .select(CALENDAR_EVENT_SELECT)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .returns<CalendarEventRow[]>();

  if (error) {
    throw new CalendarServiceError('GENERIC', error.message);
  }

  return (data ?? []).map(mapCalendarEventRow);
}

export async function getNextUpcomingEvent(fromIsoDate: string): Promise<CalendarEvent | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('calendar_events')
    .select(CALENDAR_EVENT_SELECT)
    .gte('event_date', fromIsoDate)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle<CalendarEventRow>();

  if (error) {
    throw new CalendarServiceError('GENERIC', error.message);
  }

  return data ? mapCalendarEventRow(data) : null;
}

export async function createCalendarEvent(
  input: CreateCalendarEventInput,
  userId: string,
): Promise<CalendarEvent> {
  const supabase = getSupabaseClient();
  const payload = normalizeEventPayload(input);

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      ...payload,
      created_by: userId,
    })
    .select(CALENDAR_EVENT_SELECT)
    .single<CalendarEventRow>();

  if (error) {
    throw new CalendarServiceError('GENERIC', error.message);
  }

  return mapCalendarEventRow(data);
}

export async function updateCalendarEvent(
  eventId: string,
  input: UpdateCalendarEventInput,
): Promise<CalendarEvent> {
  const supabase = getSupabaseClient();
  const payload = normalizeEventPayload(input);

  const { data, error } = await supabase
    .from('calendar_events')
    .update(payload)
    .eq('id', eventId)
    .select(CALENDAR_EVENT_SELECT)
    .single<CalendarEventRow>();

  if (error) {
    throw new CalendarServiceError('GENERIC', error.message);
  }

  return mapCalendarEventRow(data);
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
  if (error) {
    throw new CalendarServiceError('GENERIC', error.message);
  }
}
