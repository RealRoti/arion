import { isInstrumentDefaultView, type InstrumentDefaultView } from '@/domain/models/instruments';
import {
  isSongAssetType,
  type Song,
  type SongAsset,
  type UserSongPreferences,
} from '@/domain/models/songs';
import { deleteSongAssetFile, uploadSongPdfFile } from '@/services/storageService';
import { getSupabaseClient } from '@/services/supabaseClient';

export type SongsServiceErrorCode = 'NOT_FOUND' | 'INVALID_INPUT' | 'GENERIC';

export class SongsServiceError extends Error {
  readonly code: SongsServiceErrorCode;

  constructor(code: SongsServiceErrorCode, message: string) {
    super(message);
    this.name = 'SongsServiceError';
    this.code = code;
  }
}

interface SongAssetMetaRow {
  id: string;
  asset_type: string;
}

interface SongRow {
  id: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  original_key: string;
  tempo_bpm: number | null;
  time_signature: string | null;
  tags: string[];
  chordpro_content: string;
  conductor_notes: string | null;
  created_at: string;
  updated_at: string;
  song_assets?: SongAssetMetaRow[];
}

interface SongAssetRow {
  id: string;
  song_id: string;
  asset_type: string;
  title: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  instrument_ids: string[];
  metadata: Record<string, unknown>;
  sort_order: number;
  created_at: string;
}

interface UserSongPreferencesRow {
  user_id: string;
  song_id: string;
  capo_frets: number;
  preferred_view: string | null;
  preferred_asset_id: string | null;
  personal_notes: string | null;
  updated_at: string;
}

const SONG_BASE_COLUMNS =
  'id, title, subtitle, author, original_key, tempo_bpm, time_signature, tags, chordpro_content, conductor_notes, created_at, updated_at';

const SONG_LIST_COLUMNS = `${SONG_BASE_COLUMNS}, song_assets(id, asset_type)`;

const SONG_ASSET_COLUMNS =
  'id, song_id, asset_type, title, storage_path, mime_type, file_size_bytes, instrument_ids, metadata, sort_order, created_at';

function mapSongRow(row: SongRow): Song {
  const pdfCount = (row.song_assets ?? []).filter((asset) => asset.asset_type === 'pdf').length;
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    author: row.author,
    originalKey: row.original_key,
    tempoBpm: row.tempo_bpm !== null ? Number(row.tempo_bpm) : null,
    timeSignature: row.time_signature,
    tags: row.tags ?? [],
    chordproContent: row.chordpro_content ?? '',
    conductorNotes: row.conductor_notes,
    pdfCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSongAssetRow(row: SongAssetRow): SongAsset {
  return {
    id: row.id,
    songId: row.song_id,
    assetType: isSongAssetType(row.asset_type) ? row.asset_type : 'pdf',
    title: row.title,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes) || 0,
    instrumentIds: row.instrument_ids ?? [],
    metadata: row.metadata ?? {},
    sortOrder: Number(row.sort_order) || 100,
    createdAt: row.created_at,
  };
}

function mapUserSongPreferencesRow(row: UserSongPreferencesRow): UserSongPreferences {
  return {
    userId: row.user_id,
    songId: row.song_id,
    capoFrets: Math.max(0, Math.min(11, Number(row.capo_frets) || 0)),
    preferredView:
      row.preferred_view && isInstrumentDefaultView(row.preferred_view) ? row.preferred_view : null,
    preferredAssetId: row.preferred_asset_id,
    personalNotes: row.personal_notes,
    updatedAt: row.updated_at,
  };
}

export async function listSongs(): Promise<Song[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_LIST_COLUMNS)
    .order('title', { ascending: true })
    .returns<SongRow[]>();

  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }

  return (data ?? []).map(mapSongRow);
}

export async function listRecentSongs(limit = 5): Promise<Song[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_LIST_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(limit)
    .returns<SongRow[]>();

  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }

  return (data ?? []).map(mapSongRow);
}

export async function getSongById(songId: string): Promise<Song | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_LIST_COLUMNS)
    .eq('id', songId)
    .maybeSingle<SongRow>();

  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }

  return data ? mapSongRow(data) : null;
}

export interface SaveSongInput {
  title: string;
  subtitle?: string | null;
  author?: string | null;
  originalKey: string;
  tempoBpm?: number | null;
  timeSignature?: string | null;
  tags: readonly string[];
  chordproContent: string;
  conductorNotes?: string | null;
}

function normalizeSaveSongPayload(input: SaveSongInput) {
  const title = input.title.trim();
  if (!title) {
    throw new SongsServiceError('INVALID_INPUT', 'Song title is required');
  }

  const subtitle = input.subtitle?.trim() || null;
  const author = input.author?.trim() || null;
  const originalKey = input.originalKey.trim() || 'Do';
  const timeSignature = input.timeSignature?.trim() || null;
  const conductorNotes = input.conductorNotes?.trim() || null;
  const tempoBpm =
    input.tempoBpm !== undefined && input.tempoBpm !== null && Number.isFinite(input.tempoBpm)
      ? Math.max(20, Math.min(300, Math.round(input.tempoBpm)))
      : null;

  return {
    title,
    subtitle,
    author,
    original_key: originalKey,
    tempo_bpm: tempoBpm,
    time_signature: timeSignature,
    tags: [...input.tags],
    chordpro_content: input.chordproContent,
    conductor_notes: conductorNotes,
  };
}

export async function createSong(input: SaveSongInput, userId: string): Promise<Song> {
  const supabase = getSupabaseClient();
  const payload = normalizeSaveSongPayload(input);

  const { data, error } = await supabase
    .from('songs')
    .insert({
      ...payload,
      created_by: userId,
      updated_by: userId,
    })
    .select(SONG_LIST_COLUMNS)
    .single<SongRow>();

  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }

  return mapSongRow(data);
}

export async function updateSong(
  songId: string,
  input: SaveSongInput,
  userId: string,
): Promise<Song> {
  const supabase = getSupabaseClient();
  const payload = normalizeSaveSongPayload(input);

  const { data, error } = await supabase
    .from('songs')
    .update({
      ...payload,
      updated_by: userId,
    })
    .eq('id', songId)
    .select(SONG_LIST_COLUMNS)
    .single<SongRow>();

  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }

  return mapSongRow(data);
}

export async function deleteSong(songId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const assets = await listSongAssets(songId).catch(() => [] as SongAsset[]);

  const { error } = await supabase.from('songs').delete().eq('id', songId);
  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }

  await Promise.all(
    assets.map((asset) => deleteSongAssetFile(asset.storagePath).catch(() => undefined)),
  );
}

export async function listSongAssets(songId: string): Promise<SongAsset[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('song_assets')
    .select(SONG_ASSET_COLUMNS)
    .eq('song_id', songId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<SongAssetRow[]>();

  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }

  return (data ?? []).map(mapSongAssetRow);
}

export async function addSongPdfAsset({
  songId,
  file,
  title,
  instrumentIds,
  userId,
}: {
  songId: string;
  file: File;
  title: string;
  instrumentIds: readonly string[];
  userId: string;
}): Promise<SongAsset> {
  const uploaded = await uploadSongPdfFile(songId, file);
  const supabase = getSupabaseClient();
  const cleanTitle = title.trim() || file.name.replace(/\.pdf$/i, '').trim() || 'Spartito PDF';

  const { data, error } = await supabase
    .from('song_assets')
    .insert({
      song_id: songId,
      asset_type: 'pdf',
      title: cleanTitle,
      storage_path: uploaded.storagePath,
      mime_type: uploaded.mimeType,
      file_size_bytes: uploaded.fileSizeBytes,
      instrument_ids: [...instrumentIds],
      metadata: {},
      created_by: userId,
    })
    .select(SONG_ASSET_COLUMNS)
    .single<SongAssetRow>();

  if (error) {
    await deleteSongAssetFile(uploaded.storagePath).catch(() => undefined);
    throw new SongsServiceError('GENERIC', error.message);
  }

  return mapSongAssetRow(data);
}

export async function deleteSongAsset(asset: SongAsset): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('song_assets').delete().eq('id', asset.id);
  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }
  await deleteSongAssetFile(asset.storagePath).catch(() => undefined);
}

export async function getUserSongPreferences(
  userId: string,
  songId: string,
): Promise<UserSongPreferences | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_song_preferences')
    .select(
      'user_id, song_id, capo_frets, preferred_view, preferred_asset_id, personal_notes, updated_at',
    )
    .eq('user_id', userId)
    .eq('song_id', songId)
    .maybeSingle<UserSongPreferencesRow>();

  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }

  return data ? mapUserSongPreferencesRow(data) : null;
}

export async function upsertUserSongPreferences(input: {
  userId: string;
  songId: string;
  capoFrets?: number;
  preferredView?: InstrumentDefaultView | null;
  preferredAssetId?: string | null;
}): Promise<UserSongPreferences> {
  const supabase = getSupabaseClient();
  const payload: Record<string, string | number | null> = {
    user_id: input.userId,
    song_id: input.songId,
  };

  if (input.capoFrets !== undefined) {
    payload.capo_frets = Math.max(0, Math.min(11, Math.round(input.capoFrets)));
  }
  if (input.preferredView !== undefined) {
    payload.preferred_view = input.preferredView;
  }
  if (input.preferredAssetId !== undefined) {
    payload.preferred_asset_id = input.preferredAssetId;
  }

  const { data, error } = await supabase
    .from('user_song_preferences')
    .upsert(payload, { onConflict: 'user_id,song_id' })
    .select(
      'user_id, song_id, capo_frets, preferred_view, preferred_asset_id, personal_notes, updated_at',
    )
    .single<UserSongPreferencesRow>();

  if (error) {
    throw new SongsServiceError('GENERIC', error.message);
  }

  return mapUserSongPreferencesRow(data);
}
