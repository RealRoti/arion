import type {
  CreateSetlistInput,
  SetlistItem,
  SetlistSongSummary,
  SetlistWithItems,
  UpdateSetlistInput,
} from '@/domain/models/setlists';
import { getSupabaseClient } from '@/services/supabaseClient';

export type SetlistsServiceErrorCode = 'NOT_FOUND' | 'INVALID_INPUT' | 'GENERIC';

export class SetlistsServiceError extends Error {
  readonly code: SetlistsServiceErrorCode;

  constructor(code: SetlistsServiceErrorCode, message: string) {
    super(message);
    this.name = 'SetlistsServiceError';
    this.code = code;
  }
}

interface SongSummaryRow {
  id: string;
  title: string;
  author: string | null;
  original_key: string;
  tempo_bpm: number | null;
  time_signature: string | null;
}

interface SetlistItemRow {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  override_key: string | null;
  notes: string | null;
  songs?: SongSummaryRow | SongSummaryRow[] | null;
}

interface SetlistRow {
  id: string;
  title: string;
  event_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  setlist_items?: SetlistItemRow[];
}

const SETLIST_WITH_ITEMS_SELECT =
  'id, title, event_date, notes, created_at, updated_at, setlist_items(id, setlist_id, song_id, position, override_key, notes, songs(id, title, author, original_key, tempo_bpm, time_signature))';

const SETLIST_ITEM_SELECT =
  'id, setlist_id, song_id, position, override_key, notes, songs(id, title, author, original_key, tempo_bpm, time_signature)';

function mapSongSummary(
  raw: SongSummaryRow | SongSummaryRow[] | null | undefined,
): SetlistSongSummary | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    originalKey: row.original_key,
    tempoBpm: row.tempo_bpm !== null ? Number(row.tempo_bpm) : null,
    timeSignature: row.time_signature,
  };
}

function mapSetlistItemRow(row: SetlistItemRow): SetlistItem {
  return {
    id: row.id,
    setlistId: row.setlist_id,
    songId: row.song_id,
    position: Number(row.position) || 0,
    overrideKey: row.override_key,
    notes: row.notes,
    song: mapSongSummary(row.songs),
  };
}

function mapSetlistRow(row: SetlistRow): SetlistWithItems {
  const items = (row.setlist_items ?? [])
    .map(mapSetlistItemRow)
    .sort((a, b) => a.position - b.position);

  return {
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    notes: row.notes,
    itemCount: items.length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export async function listSetlists(): Promise<SetlistWithItems[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('setlists')
    .select(SETLIST_WITH_ITEMS_SELECT)
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .returns<SetlistRow[]>();

  if (error) {
    throw new SetlistsServiceError('GENERIC', error.message);
  }

  return (data ?? []).map(mapSetlistRow);
}

export async function getSetlistById(setlistId: string): Promise<SetlistWithItems | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('setlists')
    .select(SETLIST_WITH_ITEMS_SELECT)
    .eq('id', setlistId)
    .maybeSingle<SetlistRow>();

  if (error) {
    throw new SetlistsServiceError('GENERIC', error.message);
  }

  return data ? mapSetlistRow(data) : null;
}

export async function createSetlist(
  input: CreateSetlistInput,
  userId: string,
): Promise<SetlistWithItems> {
  const title = input.title.trim();
  if (!title) {
    throw new SetlistsServiceError('INVALID_INPUT', 'Setlist title is required');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('setlists')
    .insert({
      title,
      event_date: input.eventDate?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: userId,
    })
    .select(SETLIST_WITH_ITEMS_SELECT)
    .single<SetlistRow>();

  if (error) {
    throw new SetlistsServiceError('GENERIC', error.message);
  }

  return mapSetlistRow(data);
}

export async function updateSetlist(
  setlistId: string,
  input: UpdateSetlistInput,
): Promise<SetlistWithItems> {
  const title = input.title.trim();
  if (!title) {
    throw new SetlistsServiceError('INVALID_INPUT', 'Setlist title is required');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('setlists')
    .update({
      title,
      event_date: input.eventDate?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq('id', setlistId)
    .select(SETLIST_WITH_ITEMS_SELECT)
    .single<SetlistRow>();

  if (error) {
    throw new SetlistsServiceError('GENERIC', error.message);
  }

  return mapSetlistRow(data);
}

export async function deleteSetlist(setlistId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('setlists').delete().eq('id', setlistId);
  if (error) {
    throw new SetlistsServiceError('GENERIC', error.message);
  }
}

export async function duplicateSetlist(
  setlistId: string,
  copySuffix: string,
  userId: string,
): Promise<SetlistWithItems> {
  const source = await getSetlistById(setlistId);
  if (!source) {
    throw new SetlistsServiceError('NOT_FOUND', 'Setlist not found');
  }

  const created = await createSetlist(
    {
      title: `${source.title} ${copySuffix}`.trim(),
      eventDate: source.eventDate,
      notes: source.notes,
    },
    userId,
  );

  if (source.items.length > 0) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('setlist_items').insert(
      source.items.map((item, idx) => ({
        setlist_id: created.id,
        song_id: item.songId,
        position: idx,
        override_key: item.overrideKey,
        notes: item.notes,
      })),
    );
    if (error) {
      throw new SetlistsServiceError('GENERIC', error.message);
    }
  }

  const full = await getSetlistById(created.id);
  return full ?? created;
}

export async function addSongToSetlist(
  setlistId: string,
  songId: string,
  position: number,
  options?: { overrideKey?: string | null; notes?: string | null },
): Promise<SetlistItem> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('setlist_items')
    .insert({
      setlist_id: setlistId,
      song_id: songId,
      position: Math.max(0, Math.trunc(position)),
      override_key: options?.overrideKey?.trim() || null,
      notes: options?.notes?.trim() || null,
    })
    .select(SETLIST_ITEM_SELECT)
    .single<SetlistItemRow>();

  if (error) {
    throw new SetlistsServiceError('GENERIC', error.message);
  }

  return mapSetlistItemRow(data);
}

export async function updateSetlistItem(
  itemId: string,
  patch: { overrideKey?: string | null; notes?: string | null },
): Promise<SetlistItem> {
  const supabase = getSupabaseClient();
  const payload: { override_key?: string | null; notes?: string | null } = {};
  if (patch.overrideKey !== undefined) {
    payload.override_key = patch.overrideKey?.trim() || null;
  }
  if (patch.notes !== undefined) {
    payload.notes = patch.notes?.trim() || null;
  }

  const { data, error } = await supabase
    .from('setlist_items')
    .update(payload)
    .eq('id', itemId)
    .select(SETLIST_ITEM_SELECT)
    .single<SetlistItemRow>();

  if (error) {
    throw new SetlistsServiceError('GENERIC', error.message);
  }

  return mapSetlistItemRow(data);
}

export async function reorderSetlistItems(
  setlistId: string,
  orderedItemIds: readonly string[],
): Promise<void> {
  if (orderedItemIds.length === 0) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('reorder_setlist_items', {
    p_setlist_id: setlistId,
    p_item_ids: [...orderedItemIds],
  });

  if (error) {
    throw new SetlistsServiceError('GENERIC', error.message);
  }
}

export async function removeSetlistItem(
  setlistId: string,
  itemId: string,
  remainingOrderedIds: readonly string[],
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('setlist_items').delete().eq('id', itemId);
  if (error) {
    throw new SetlistsServiceError('GENERIC', error.message);
  }

  if (remainingOrderedIds.length > 0) {
    await reorderSetlistItems(setlistId, remainingOrderedIds);
  }
}
