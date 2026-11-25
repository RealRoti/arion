import { describe, expect, it as vitestIt } from 'vitest';
import {
  buildOffSetlistSongPatch,
  buildReturnToSetlistPatch,
  buildSetlistStepPatch,
  buildStartFromSetlistPatch,
  canTakeoverLiveSession,
  createFlashSignal,
  createIdleLiveSession,
  createInitialLocalState,
  detachLocalState,
  flattenPresenceState,
  isActiveConductor,
  isOffSetlistSong,
  isRecentFlashSignal,
  reattachLocalState,
  type LiveSessionState,
} from '@/domain/models/live';
import type { SetlistWithItems } from '@/domain/models/setlists';
import type { Song } from '@/domain/models/songs';

const SAMPLE_SETLIST: SetlistWithItems = {
  id: 'sl-1',
  title: 'Scaletta Domenica',
  eventDate: '2026-12-06',
  notes: null,
  itemCount: 2,
  createdAt: '',
  updatedAt: '',
  items: [
    {
      id: 'item-1',
      setlistId: 'sl-1',
      songId: 'song-1',
      position: 0,
      overrideKey: 'Fa',
      notes: null,
      song: {
        id: 'song-1',
        title: 'Canto Uno',
        author: null,
        originalKey: 'Sol',
        tempoBpm: null,
        timeSignature: null,
      },
    },
    {
      id: 'item-2',
      setlistId: 'sl-1',
      songId: 'song-2',
      position: 1,
      overrideKey: null,
      notes: null,
      song: {
        id: 'song-2',
        title: 'Canto Due',
        author: null,
        originalKey: 'Re',
        tempoBpm: null,
        timeSignature: null,
      },
    },
  ],
};

const IMPROMPTU_SONG: Song = {
  id: 'song-extra',
  title: 'Canto Extra',
  subtitle: null,
  author: null,
  originalKey: 'Lam',
  tempoBpm: null,
  timeSignature: null,
  tags: [],
  chordproContent: '',
  conductorNotes: null,
  pdfCount: 0,
  createdAt: '',
  updatedAt: '',
};

describe('Live mode domain state machine', () => {
  vitestIt(
    'starts from setlist preserving override key and transitions smoothly off-setlist and back',
    () => {
      const startPatch = buildStartFromSetlistPatch(SAMPLE_SETLIST, 'cond-1', 0);
      expect(startPatch).toMatchObject({
        is_active: true,
        conductor_id: 'cond-1',
        setlist_id: 'sl-1',
        active_setlist_item_id: 'item-1',
        active_song_id: 'song-1',
        active_key: 'Fa',
      });

      const activeSession: LiveSessionState = {
        ...createIdleLiveSession(),
        isActive: true,
        conductorId: 'cond-1',
        setlistId: 'sl-1',
        activeSetlistItemId: 'item-1',
        activeSongId: 'song-1',
        activeKey: 'Fa',
      };
      expect(isOffSetlistSong(activeSession, SAMPLE_SETLIST.items)).toBe(false);

      // Step to item-2
      const step2 = buildSetlistStepPatch(SAMPLE_SETLIST, 1);
      expect(step2).toMatchObject({
        active_setlist_item_id: 'item-2',
        active_song_id: 'song-2',
        active_key: 'Re',
      });

      // Launch impromptu song outside setlist while keeping item-1 paused
      const offPatch = buildOffSetlistSongPatch(activeSession, IMPROMPTU_SONG);
      const offSession: LiveSessionState = {
        ...activeSession,
        activeSongId: offPatch.active_song_id ?? null,
        activeKey: offPatch.active_key ?? null,
      };
      expect(offSession.activeSetlistItemId).toBe('item-1');
      expect(isOffSetlistSong(offSession, SAMPLE_SETLIST.items)).toBe(true);

      // Return to setlist restores paused item-1 and its overrideKey
      const returnPatch = buildReturnToSetlistPatch(offSession, SAMPLE_SETLIST);
      expect(returnPatch).toMatchObject({
        active_setlist_item_id: 'item-1',
        active_song_id: 'song-1',
        active_key: 'Fa',
      });
    },
  );

  vitestIt('evaluates active conductor, takeover rights and musician detach/reattach state', () => {
    const session: LiveSessionState = {
      ...createIdleLiveSession(),
      isActive: true,
      conductorId: 'cond-1',
    };

    expect(isActiveConductor(session, 'cond-1', true)).toBe(true);
    expect(isActiveConductor(session, 'cond-2', true)).toBe(false);
    expect(canTakeoverLiveSession(session, 'cond-2', true)).toBe(true);
    expect(canTakeoverLiveSession(session, 'cond-1', true)).toBe(false);
    expect(canTakeoverLiveSession(session, 'mus-1', false)).toBe(false);

    const local0 = createInitialLocalState();
    expect(local0.syncStatus).toBe('synced');
    const detached = detachLocalState(local0, { detachedSongId: 'song-99' });
    expect(detached).toEqual({
      syncStatus: 'detached',
      detachedSongId: 'song-99',
      detachedPage: null,
    });
    expect(reattachLocalState()).toEqual(local0);
  });

  vitestIt(
    'flattens Realtime Presence deduplicating users with conductor first and checks flash age',
    () => {
      const members = flattenPresenceState({
        'u-2': [
          {
            userId: 'u-2',
            displayName: 'Zoe Voce',
            role: 'musician',
            instrumentName: 'Soprano',
            status: 'detached',
            isConductor: false,
            joinedAt: '2026-11-25T20:00:00Z',
          },
        ],
        'u-1': [
          {
            userId: 'u-1',
            displayName: 'Maestro Demo',
            role: 'conductor',
            instrumentName: 'Organo',
            status: 'synced',
            isConductor: true,
            joinedAt: '2026-11-25T20:01:00Z',
          },
        ],
      });

      expect(members.map((m) => m.userId)).toEqual(['u-1', 'u-2']);
      expect(members[1]?.status).toBe('detached');

      const freshSignal = createFlashSignal('Ripetiamo il Ritornello', 'Maestro Demo');
      expect(isRecentFlashSignal(freshSignal)).toBe(true);
      expect(
        isRecentFlashSignal(
          { id: 'old', message: 'Vecchio', issuedAt: '2026-01-01T00:00:00Z' },
          Date.now(),
        ),
      ).toBe(false);
    },
  );
});
