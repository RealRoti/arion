import {
  resolveEffectiveSetlistKey,
  type SetlistItem,
  type SetlistWithItems,
} from '@/domain/models/setlists';
import type { Song } from '@/domain/models/songs';
import type { Role } from '@/domain/rbac/permissions';

export interface FlashSignal {
  readonly id: string;
  readonly message: string;
  readonly issuedAt: string;
  readonly issuedByName?: string | null;
}

export interface LiveSessionState {
  readonly isActive: boolean;
  readonly conductorId: string | null;
  readonly conductorName: string | null;
  readonly setlistId: string | null;
  readonly activeSetlistItemId: string | null;
  readonly activeSongId: string | null;
  readonly activeKey: string | null;
  readonly activeSectionIndex: number | null;
  readonly activePage: number | null;
  readonly nextSongId: string | null;
  readonly nextSongKey: string | null;
  readonly flashSignal: FlashSignal | null;
  readonly updatedAt: string;
}

export type LiveSyncStatus = 'synced' | 'detached';

export type LiveConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface LivePresenceMember {
  readonly userId: string;
  readonly displayName: string;
  readonly role: Role;
  readonly instrumentName: string;
  readonly status: LiveSyncStatus;
  readonly isConductor: boolean;
  readonly joinedAt: string;
}

export interface LiveLocalState {
  readonly syncStatus: LiveSyncStatus;
  readonly detachedSongId: string | null;
  readonly detachedPage: number | null;
}

export interface LiveSessionUpdatePatch {
  readonly is_active?: boolean;
  readonly conductor_id?: string | null;
  readonly setlist_id?: string | null;
  readonly active_setlist_item_id?: string | null;
  readonly active_song_id?: string | null;
  readonly active_key?: string | null;
  readonly active_section_index?: number | null;
  readonly active_page?: number | null;
  readonly next_song_id?: string | null;
  readonly next_song_key?: string | null;
  readonly flash_signal?: FlashSignal | null;
}

export function createIdleLiveSession(): LiveSessionState {
  return {
    isActive: false,
    conductorId: null,
    conductorName: null,
    setlistId: null,
    activeSetlistItemId: null,
    activeSongId: null,
    activeKey: null,
    activeSectionIndex: null,
    activePage: null,
    nextSongId: null,
    nextSongKey: null,
    flashSignal: null,
    updatedAt: '',
  };
}

export function isActiveConductor(
  session: LiveSessionState,
  currentUserId: string | null | undefined,
  canHost: boolean,
): boolean {
  return Boolean(
    session.isActive && canHost && currentUserId && session.conductorId === currentUserId,
  );
}

export function canTakeoverLiveSession(
  session: LiveSessionState,
  currentUserId: string | null | undefined,
  canTakeover: boolean,
): boolean {
  return Boolean(
    session.isActive && canTakeover && currentUserId && session.conductorId !== currentUserId,
  );
}

/**
 * Returns true when an active setlist session is temporarily playing an impromptu song
 * outside the setlist while keeping `activeSetlistItemId` paused for quick return.
 */
export function isOffSetlistSong(
  session: LiveSessionState,
  setlistItems: readonly SetlistItem[],
): boolean {
  if (!session.isActive || !session.setlistId || !session.activeSongId) {
    return false;
  }
  const pausedItem = session.activeSetlistItemId
    ? setlistItems.find((item) => item.id === session.activeSetlistItemId)
    : undefined;
  if (!pausedItem) {
    return true;
  }
  return pausedItem.songId !== session.activeSongId;
}

export function buildSetlistStepPatch(
  setlist: SetlistWithItems,
  targetIndex: number,
): LiveSessionUpdatePatch | null {
  const item = setlist.items[targetIndex];
  if (!item) {
    return null;
  }
  const effectiveKey = resolveEffectiveSetlistKey(item.song?.originalKey ?? 'Do', item.overrideKey);
  return {
    setlist_id: setlist.id,
    active_setlist_item_id: item.id,
    active_song_id: item.songId,
    active_key: effectiveKey,
    active_section_index: null,
    active_page: 1,
    next_song_id: null,
    next_song_key: null,
  };
}

export function buildStartFromSetlistPatch(
  setlist: SetlistWithItems,
  conductorId: string,
  startIndex = 0,
): LiveSessionUpdatePatch | null {
  const stepPatch = buildSetlistStepPatch(setlist, startIndex);
  if (!stepPatch) {
    return null;
  }
  return {
    is_active: true,
    conductor_id: conductorId,
    flash_signal: null,
    ...stepPatch,
  };
}

export function buildStartFromSongPatch(song: Song, conductorId: string): LiveSessionUpdatePatch {
  return {
    is_active: true,
    conductor_id: conductorId,
    setlist_id: null,
    active_setlist_item_id: null,
    active_song_id: song.id,
    active_key: song.originalKey,
    active_section_index: null,
    active_page: 1,
    next_song_id: null,
    next_song_key: null,
    flash_signal: null,
  };
}

export function buildOffSetlistSongPatch(
  session: LiveSessionState,
  song: Song,
): LiveSessionUpdatePatch {
  return {
    setlist_id: session.setlistId,
    active_setlist_item_id: session.activeSetlistItemId,
    active_song_id: song.id,
    active_key: song.originalKey,
    active_section_index: null,
    active_page: 1,
    next_song_id: null,
    next_song_key: null,
  };
}

export function buildReturnToSetlistPatch(
  session: LiveSessionState,
  setlist: SetlistWithItems,
): LiveSessionUpdatePatch | null {
  if (setlist.items.length === 0) {
    return null;
  }
  const pausedIdx = session.activeSetlistItemId
    ? setlist.items.findIndex((item) => item.id === session.activeSetlistItemId)
    : -1;
  return buildSetlistStepPatch(setlist, pausedIdx >= 0 ? pausedIdx : 0);
}

export function buildNextSongAnnouncementPatch(
  songId: string,
  key: string,
): LiveSessionUpdatePatch {
  return {
    next_song_id: songId,
    next_song_key: key,
  };
}

export function buildClearNextSongPatch(): LiveSessionUpdatePatch {
  return {
    next_song_id: null,
    next_song_key: null,
  };
}

export function buildTakeoverPatch(conductorId: string): LiveSessionUpdatePatch {
  return {
    conductor_id: conductorId,
  };
}

export function createFlashSignal(message: string, issuedByName?: string | null): FlashSignal {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: randomPart,
    message: message.trim(),
    issuedAt: new Date().toISOString(),
    issuedByName: issuedByName ?? null,
  };
}

export function isRecentFlashSignal(
  signal: FlashSignal | null | undefined,
  nowMs = Date.now(),
  maxAgeMs = 15_000,
): boolean {
  if (!signal || !signal.message.trim()) {
    return false;
  }
  const issuedMs = Date.parse(signal.issuedAt);
  if (Number.isNaN(issuedMs)) {
    return false;
  }
  const age = nowMs - issuedMs;
  return age >= -5_000 && age <= maxAgeMs;
}

export function createInitialLocalState(): LiveLocalState {
  return {
    syncStatus: 'synced',
    detachedSongId: null,
    detachedPage: null,
  };
}

export function detachLocalState(
  prev: LiveLocalState,
  patch: { detachedSongId?: string | null; detachedPage?: number | null },
): LiveLocalState {
  return {
    syncStatus: 'detached',
    detachedSongId: patch.detachedSongId !== undefined ? patch.detachedSongId : prev.detachedSongId,
    detachedPage: patch.detachedPage !== undefined ? patch.detachedPage : prev.detachedPage,
  };
}

export function reattachLocalState(): LiveLocalState {
  return createInitialLocalState();
}

export function flattenPresenceState(
  rawState: Record<string, readonly Record<string, unknown>[]>,
): LivePresenceMember[] {
  const byUser = new Map<string, LivePresenceMember>();

  for (const entries of Object.values(rawState)) {
    for (const raw of entries) {
      const userId = typeof raw.userId === 'string' ? raw.userId : '';
      if (!userId) continue;

      const member: LivePresenceMember = {
        userId,
        displayName:
          typeof raw.displayName === 'string' && raw.displayName.trim()
            ? raw.displayName.trim()
            : 'Musicista',
        role:
          raw.role === 'admin' || raw.role === 'conductor' || raw.role === 'musician'
            ? raw.role
            : 'musician',
        instrumentName:
          typeof raw.instrumentName === 'string' && raw.instrumentName.trim()
            ? raw.instrumentName.trim()
            : 'Voce / Corista',
        status: raw.status === 'detached' ? 'detached' : 'synced',
        isConductor: Boolean(raw.isConductor),
        joinedAt: typeof raw.joinedAt === 'string' ? raw.joinedAt : '',
      };

      const existing = byUser.get(userId);
      if (!existing || member.joinedAt >= existing.joinedAt) {
        byUser.set(userId, member);
      }
    }
  }

  return Array.from(byUser.values()).sort((a, b) => {
    if (a.isConductor !== b.isConductor) {
      return a.isConductor ? -1 : 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });
}
