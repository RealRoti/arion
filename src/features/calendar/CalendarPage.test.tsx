import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import { toLocalIsoDate, type CalendarEvent } from '@/domain/models/calendar';
import type { SetlistWithItems } from '@/domain/models/setlists';
import { can, canAny, getPermissionsForRole, type Role } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { it } from '@/i18n/it';
import { createCalendarEvent, listCalendarEvents } from '@/services/calendarService';
import { listSetlists } from '@/services/setlistsService';

vi.mock('@/services/calendarService', () => ({
  listCalendarEvents: vi.fn(),
  createCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
  deleteCalendarEvent: vi.fn(),
}));

vi.mock('@/services/setlistsService', () => ({
  listSetlists: vi.fn(),
}));

const TODAY = toLocalIsoDate(new Date());

const SAMPLE_SETLIST: SetlistWithItems = {
  id: 'sl-1',
  title: 'Scaletta Prova',
  eventDate: TODAY,
  notes: null,
  itemCount: 0,
  createdAt: '',
  updatedAt: '',
  items: [],
};

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Prova settimanale',
    category: 'rehearsal',
    eventDate: TODAY,
    startTime: '20:45',
    endTime: '22:15',
    location: 'Sala prove',
    setlistId: 'sl-1',
    setlistTitle: 'Scaletta Prova',
    notes: null,
    createdAt: '',
    updatedAt: '',
  },
];

function renderCalendar(role: Role) {
  const permissions = getPermissionsForRole(role, true);
  const authOverride: AuthContextValue = {
    status: 'authenticated',
    profile: {
      id: 'user-1',
      email: `${role}@arion.local`,
      displayName: 'Utente Demo',
      role,
      isActive: true,
      activeInstrumentId: null,
      preferredNotation: 'italian',
      preferredTheme: 'daylight',
      preferredTextSize: 'compact',
      fontScale: 1,
    },
    permissions,
    instanceSettings: null,
    instruments: [],
    userInstruments: [],
    activeInstrument: null,
    can: (perm) => can(permissions, perm),
    canAny: (reqs) => canAny(permissions, reqs),
    setActiveInstrument: async () => undefined,
    refreshProfile: async () => undefined,
    refreshInstanceSettings: async () => undefined,
    refreshInstruments: async () => undefined,
    signOut: async () => undefined,
  };

  render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider valueOverride={authOverride}>
          <CalendarPage />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listCalendarEvents).mockResolvedValue(INITIAL_EVENTS);
    vi.mocked(listSetlists).mockResolvedValue([SAMPLE_SETLIST]);
    vi.mocked(createCalendarEvent).mockResolvedValue({
      id: 'evt-2',
      title: 'Concerto Demo',
      category: 'concert',
      eventDate: TODAY,
      startTime: '21:00',
      endTime: null,
      location: 'Teatro',
      setlistId: 'sl-1',
      setlistTitle: 'Scaletta Prova',
      notes: null,
      createdAt: '',
      updatedAt: '',
    });
  });

  vitestIt(
    'creates an event linked to a setlist for conductor and filters/switches to Mese',
    async () => {
      renderCalendar('conductor');

      await waitFor(() => {
        expect(screen.getByText('Prova settimanale')).toBeInTheDocument();
      });

      expect(
        screen.getByRole('link', { name: `${it.calendar.openSetlistLink}: Scaletta Prova` }),
      ).toHaveAttribute('href', '/scalette/sl-1');

      fireEvent.click(screen.getByRole('button', { name: it.calendar.newEventButton }));
      fireEvent.change(screen.getByLabelText(it.calendar.titleLabel), {
        target: { value: 'Concerto Demo' },
      });
      fireEvent.change(screen.getByLabelText(it.calendar.categoryLabel), {
        target: { value: 'concert' },
      });
      fireEvent.change(screen.getByLabelText(it.calendar.setlistLabel), {
        target: { value: 'sl-1' },
      });
      fireEvent.click(screen.getByRole('button', { name: it.calendar.createButton }));

      await waitFor(() => {
        expect(createCalendarEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Concerto Demo',
            category: 'concert',
            setlistId: 'sl-1',
          }),
          'user-1',
        );
        expect(screen.getByText('Concerto Demo')).toBeInTheDocument();
      });

      // Category filter hides rehearsal when concert is selected
      fireEvent.click(screen.getByRole('button', { name: it.calendar.filterConcert }));
      expect(screen.queryByText('Prova settimanale')).not.toBeInTheDocument();
      expect(screen.getByText('Concerto Demo')).toBeInTheDocument();

      // Month view switch
      fireEvent.click(screen.getByRole('button', { name: it.calendar.viewMonth }));
      expect(screen.getByRole('button', { name: it.calendar.todayButton })).toBeInTheDocument();
    },
  );

  vitestIt('hides creation and edit buttons for musician role', async () => {
    renderCalendar('musician');

    await waitFor(() => {
      expect(screen.getByText('Prova settimanale')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: it.calendar.newEventButton }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: `${it.common.edit} Prova settimanale` }),
    ).not.toBeInTheDocument();
  });
});
