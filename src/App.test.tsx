import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt } from 'vitest';
import { App } from '@/App';
import { it } from '@/i18n/it';

function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

describe('Arion App Navigation & Screens', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  vitestIt('renders the 5 primary navigation items and Home workspace', () => {
    renderApp();

    expect(screen.getAllByRole('link', { name: it.nav.home }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: it.nav.repertoire }).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByRole('link', { name: it.nav.live }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: it.nav.calendar }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: it.nav.more }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(it.home.nextEventSampleTitle)).toBeInTheDocument();
  });

  vitestIt('opens Repertorio, enters SongReaderPage, toggles chords and scales font', () => {
    renderApp(['/repertorio']);

    expect(screen.getByRole('heading', { name: it.repertoire.title })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('link', { name: it.repertoire.openSongLabel('Canto di Prova') }),
    );

    expect(screen.getByRole('heading', { name: 'Canto di Prova' })).toBeInTheDocument();
    expect(screen.getByText('Sol/Si')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: it.reader.modeChords }));
    expect(screen.queryByText('Sol/Si')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: it.reader.modeLyricsOnly })).toBeInTheDocument();

    const body = screen.getByTestId('lectern-song-body');
    expect(body.style.fontSize).toBe('1rem');
    fireEvent.click(screen.getByRole('button', { name: it.reader.fontIncreaseLabel }));
    expect(body.style.fontSize).toBe('1.1rem');
    fireEvent.click(screen.getByRole('button', { name: it.reader.fontDecreaseLabel }));
    expect(body.style.fontSize).toBe('1rem');
  });

  vitestIt('switches CalendarPage between Prossimi and Mese views', () => {
    renderApp(['/calendario']);

    expect(screen.getByRole('heading', { name: it.calendar.title })).toBeInTheDocument();
    expect(screen.getByText('Prova settimanale di repertorio')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: it.calendar.viewMonth }));
    expect(screen.getByRole('button', { name: it.calendar.todayButton })).toBeInTheDocument();
    expect(screen.getByText(it.calendar.weekdaysShort[0])).toBeInTheDocument();
  });

  vitestIt(
    'navigates through Altro menu to Settings, Support, Guide, Privacy and Developer Info',
    () => {
      renderApp(['/altro']);

      expect(screen.getByRole('heading', { name: it.more.title })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: it.nav.settings }));
      expect(screen.getByRole('heading', { name: it.settings.title })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('radio', { name: it.themes.stageDark }));
      expect(document.documentElement.dataset.theme).toBe('stage_dark');

      const backLinks = screen.getAllByRole('link', { name: it.settings.backToMore });
      fireEvent.click(backLinks[backLinks.length - 1]!);
      fireEvent.click(screen.getByRole('link', { name: it.nav.support }));
      expect(screen.getByRole('heading', { name: it.support.title })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: it.nav.back }));
      fireEvent.click(screen.getByRole('link', { name: it.nav.privacy }));
      expect(screen.getByRole('heading', { name: it.privacy.title })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: it.nav.back }));
      fireEvent.click(screen.getByRole('link', { name: it.nav.guide }));
      expect(screen.getByRole('heading', { name: it.guide.title })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: it.nav.back }));
      fireEvent.click(screen.getByRole('link', { name: it.nav.devInfo }));
      expect(screen.getByRole('heading', { name: it.devInfo.title })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: new RegExp(it.devInfo.techTitle) }));
      expect(screen.getByText(it.devInfo.techItems[0])).toBeInTheDocument();
    },
  );
});
