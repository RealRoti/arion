import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import { ThemeProvider } from '@/components/ThemeProvider';
import { can, canAny, getPermissionsForRole, type Role } from '@/domain/rbac/permissions';
import type { AuthContextValue } from '@/features/auth/authContextStore';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { SongEditorPage } from '@/features/repertoire/SongEditorPage';
import { it } from '@/i18n/it';
import { createSong } from '@/services/songsService';

vi.mock('@/services/songsService', () => ({
  createSong: vi.fn(),
  getSongById: vi.fn(async () => null),
  listSongAssets: vi.fn(async () => []),
  updateSong: vi.fn(),
  deleteSong: vi.fn(),
  addSongPdfAsset: vi.fn(),
  deleteSongAsset: vi.fn(),
}));

function renderEditor(role: Role) {
  const permissions = getPermissionsForRole(role, true);
  const authOverride: AuthContextValue = {
    status: 'authenticated',
    profile: {
      id: 'user-1',
      email: `${role}@arion.local`,
      displayName: 'Maestro Demo',
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
    <MemoryRouter initialEntries={['/repertorio/nuovo']}>
      <ThemeProvider>
        <AuthProvider valueOverride={authOverride}>
          <Routes>
            <Route path="/repertorio/nuovo" element={<SongEditorPage />} />
            <Route path="/repertorio/:songId" element={<div>Song Reader Target</div>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('SongEditorPage & Import Wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSong).mockResolvedValue({
      id: 'song-new-1',
      title: 'Canto Importato',
      subtitle: null,
      author: null,
      originalKey: 'Do',
      tempoBpm: null,
      timeSignature: null,
      tags: ['Ingresso'],
      chordproContent: '{start_of_verse: Strofa 1}\n[Do]Ecco il [Sol]canto\n{end_of_verse}',
      conductorNotes: null,
      pdfCount: 0,
      createdAt: '',
      updatedAt: '',
    });
  });

  vitestIt('blocks access for musician role without songs:create permission', () => {
    renderEditor('musician');
    expect(screen.getByText(it.forbidden.title)).toBeInTheDocument();
  });

  vitestIt(
    'converts pasted chords-above-lyrics via wizard, updates live preview and saves song',
    async () => {
      renderEditor('conductor');

      fireEvent.change(screen.getByLabelText(it.songEditor.titleLabel), {
        target: { value: 'Canto Importato' },
      });
      fireEvent.change(screen.getByLabelText(it.songEditor.tagsLabel), {
        target: { value: 'Ingresso, Natale' },
      });

      // Open import wizard
      fireEvent.click(screen.getByRole('button', { name: it.songEditor.importToggleOpen }));
      fireEvent.change(screen.getByLabelText(it.songEditor.importPasteLabel), {
        target: { value: 'Strofa 1:\nC       G\nEcco il canto' },
      });
      fireEvent.click(screen.getByRole('button', { name: it.songEditor.importConvertButton }));

      expect(screen.getByText(it.songEditor.importSuccess(1))).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: it.songEditor.importApplyButton }));

      await waitFor(() => {
        const previewBody = screen.getByTestId('lectern-song-body');
        expect(previewBody).toHaveTextContent('Ecco il');
        expect(previewBody).toHaveTextContent('Sol');
        expect(previewBody).toHaveTextContent('canto');
      });

      fireEvent.click(screen.getByRole('button', { name: it.songEditor.saveSongButton }));

      await waitFor(() => {
        expect(createSong).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Canto Importato',
            originalKey: 'Do',
            tags: ['Ingresso', 'Natale'],
            chordproContent: expect.stringContaining('[Do]Ecco il [Sol]canto'),
          }),
          'user-1',
        );
        expect(screen.getByText('Song Reader Target')).toBeInTheDocument();
      });
    },
  );

  vitestIt(
    'shows guided warning for Finale .musx and imports MusicXML metadata and chords',
    async () => {
      renderEditor('conductor');

      fireEvent.click(screen.getByRole('button', { name: it.songEditor.importToggleOpen }));

      const fileInput = screen.getByLabelText(it.songEditor.importFileLabel);

      // Uploading Finale .musx shows guided export message
      const musxFile = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'canto.musx', {
        type: 'application/octet-stream',
      });
      fireEvent.change(fileInput, { target: { files: [musxFile] } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          it.songEditor.importMusxUnsupportedError,
        );
      });

      // Uploading valid .musicxml converts and applies title, author, key, tempo, time signature & chords
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <score-partwise version="4.0">
          <work><work-title>Inno MusicXML</work-title></work>
          <identification><creator type="composer">Compositore Demo</creator></identification>
          <part-list><score-part id="P1"><part-name>Voce</part-name></score-part></part-list>
          <part id="P1">
            <measure number="1">
              <attributes>
                <key><fifths>0</fifths><mode>major</mode></key>
                <time><beats>3</beats><beat-type>4</beat-type></time>
              </attributes>
              <direction><sound tempo="92"/></direction>
              <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
              <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><lyric><syllabic>single</syllabic><text>Lode</text></lyric></note>
            </measure>
          </part>
        </score-partwise>`;

      const xmlFile = new File([xmlContent], 'inno.musicxml', { type: 'application/xml' });
      Object.defineProperty(xmlFile, 'arrayBuffer', {
        value: async () => new TextEncoder().encode(xmlContent).buffer,
      });

      fireEvent.change(fileInput, { target: { files: [xmlFile] } });

      await waitFor(() => {
        expect(screen.getByText(it.songEditor.importSuccess(1))).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: it.songEditor.importApplyButton }));

      expect(screen.getByLabelText(it.songEditor.titleLabel)).toHaveValue('Inno MusicXML');
      expect(screen.getByLabelText(it.songEditor.authorLabel)).toHaveValue('Compositore Demo');
      expect(screen.getByLabelText(it.songEditor.timeSignatureLabel)).toHaveValue('3/4');
      expect(screen.getByLabelText(it.songEditor.tempoLabel)).toHaveValue(92);
    },
  );
});
