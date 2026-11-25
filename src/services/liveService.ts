import {
  createIdleLiveSession,
  flattenPresenceState,
  type FlashSignal,
  type LiveConnectionState,
  type LivePresenceMember,
  type LiveSessionState,
  type LiveSessionUpdatePatch,
} from '@/domain/models/live';
import { getSupabaseClient } from '@/services/supabaseClient';

export class LiveServiceError extends Error {
  readonly code: 'GENERIC';

  constructor(message: string) {
    super(message);
    this.name = 'LiveServiceError';
    this.code = 'GENERIC';
  }
}

interface JoinedConductorProfile {
  display_name: string;
}

interface LiveSessionRow {
  id: number;
  is_active: boolean;
  conductor_id: string | null;
  setlist_id: string | null;
  active_setlist_item_id: string | null;
  active_song_id: string | null;
  active_key: string | null;
  active_section_index: number | null;
  active_page: number | null;
  next_song_id: string | null;
  next_song_key: string | null;
  flash_signal: FlashSignal | null;
  updated_at: string;
  profiles?: JoinedConductorProfile | JoinedConductorProfile[] | null;
}

const LIVE_SESSION_SELECT =
  'id, is_active, conductor_id, setlist_id, active_setlist_item_id, active_song_id, active_key, active_section_index, active_page, next_song_id, next_song_key, flash_signal, updated_at, profiles:conductor_id(display_name)';

function mapLiveSessionRow(row: LiveSessionRow | null | undefined): LiveSessionState {
  if (!row) {
    return createIdleLiveSession();
  }
  const joinedConductor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const rawSignal = row.flash_signal;
  const flashSignal: FlashSignal | null =
    rawSignal && typeof rawSignal.message === 'string' && typeof rawSignal.issuedAt === 'string'
      ? {
          id: typeof rawSignal.id === 'string' ? rawSignal.id : rawSignal.issuedAt,
          message: rawSignal.message,
          issuedAt: rawSignal.issuedAt,
          issuedByName: rawSignal.issuedByName ?? null,
        }
      : null;

  return {
    isActive: Boolean(row.is_active),
    conductorId: row.conductor_id,
    conductorName: joinedConductor?.display_name ?? null,
    setlistId: row.setlist_id,
    activeSetlistItemId: row.active_setlist_item_id,
    activeSongId: row.active_song_id,
    activeKey: row.active_key,
    activeSectionIndex: row.active_section_index !== null ? Number(row.active_section_index) : null,
    activePage: row.active_page !== null ? Number(row.active_page) : null,
    nextSongId: row.next_song_id,
    nextSongKey: row.next_song_key,
    flashSignal,
    updatedAt: row.updated_at,
  };
}

export async function fetchLiveSession(): Promise<LiveSessionState> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('live_sessions')
    .select(LIVE_SESSION_SELECT)
    .eq('id', 1)
    .maybeSingle<LiveSessionRow>();

  if (error) {
    throw new LiveServiceError(error.message);
  }

  return mapLiveSessionRow(data);
}

export async function updateLiveSession(patch: LiveSessionUpdatePatch): Promise<LiveSessionState> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('live_sessions')
    .update(patch)
    .eq('id', 1)
    .select(LIVE_SESSION_SELECT)
    .single<LiveSessionRow>();

  if (error) {
    throw new LiveServiceError(error.message);
  }

  return mapLiveSessionRow(data);
}

export async function endLiveSession(): Promise<LiveSessionState> {
  return updateLiveSession({
    is_active: false,
    conductor_id: null,
    setlist_id: null,
    active_setlist_item_id: null,
    active_song_id: null,
    active_key: null,
    active_section_index: null,
    active_page: null,
    next_song_id: null,
    next_song_key: null,
    flash_signal: null,
  });
}

export interface LiveChannelSubscriptionOptions {
  readonly presenceKey: string;
  readonly initialPresence: LivePresenceMember;
  readonly onStateSync: (session: LiveSessionState) => void;
  readonly onFlashSignal: (signal: FlashSignal) => void;
  readonly onPresenceChange: (members: LivePresenceMember[]) => void;
  readonly onConnectionChange: (state: LiveConnectionState) => void;
}

export interface LiveChannelSubscription {
  sendStateSync: (session: LiveSessionState) => Promise<void>;
  sendFlashSignal: (signal: FlashSignal) => Promise<void>;
  updatePresence: (presence: LivePresenceMember) => Promise<void>;
  unsubscribe: () => void;
}

export function subscribeToLiveChannel(
  options: LiveChannelSubscriptionOptions,
): LiveChannelSubscription {
  const supabase = getSupabaseClient();
  let latestPresence = options.initialPresence;
  let isSubscribed = false;

  const channel = supabase.channel('live:main', {
    config: {
      broadcast: { self: false },
      presence: { key: options.presenceKey },
    },
  });

  channel
    .on('broadcast', { event: 'state_sync' }, ({ payload }) => {
      const candidate = (payload as { session?: LiveSessionState } | null)?.session;
      if (candidate && typeof candidate.isActive === 'boolean') {
        options.onStateSync(candidate);
      }
    })
    .on('broadcast', { event: 'flash_signal' }, ({ payload }) => {
      const candidate = (payload as { signal?: FlashSignal } | null)?.signal;
      if (candidate && typeof candidate.message === 'string') {
        options.onFlashSignal(candidate);
      }
    })
    .on('presence', { event: 'sync' }, () => {
      const raw = channel.presenceState() as Record<string, readonly Record<string, unknown>[]>;
      options.onPresenceChange(flattenPresenceState(raw));
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribed = true;
        options.onConnectionChange('connected');
        void channel.track(latestPresence);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        isSubscribed = false;
        options.onConnectionChange('reconnecting');
      } else if (status === 'CLOSED') {
        isSubscribed = false;
        options.onConnectionChange('disconnected');
      }
    });

  return {
    sendStateSync: async (session: LiveSessionState) => {
      if (!isSubscribed) return;
      await channel.send({
        type: 'broadcast',
        event: 'state_sync',
        payload: { session },
      });
    },
    sendFlashSignal: async (signal: FlashSignal) => {
      if (!isSubscribed) return;
      await channel.send({
        type: 'broadcast',
        event: 'flash_signal',
        payload: { signal },
      });
    },
    updatePresence: async (presence: LivePresenceMember) => {
      latestPresence = presence;
      if (!isSubscribed) return;
      await channel.track(presence);
    },
    unsubscribe: () => {
      isSubscribed = false;
      void channel.untrack().catch(() => undefined);
      void supabase.removeChannel(channel);
    },
  };
}
