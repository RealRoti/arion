import {
  isInstrumentCategory,
  isInstrumentDefaultView,
  slugifyInstrumentName,
  TRANSPOSITION_RANGE,
  type Instrument,
  type InstrumentCategory,
  type InstrumentDefaultView,
  type UserInstrumentAssignment,
} from '@/domain/models/instruments';
import { getSupabaseClient } from '@/services/supabaseClient';

export type InstrumentsServiceErrorCode = 'DUPLICATE_SLUG' | 'INVALID_INPUT' | 'GENERIC';

export class InstrumentsServiceError extends Error {
  readonly code: InstrumentsServiceErrorCode;

  constructor(code: InstrumentsServiceErrorCode, message: string) {
    super(message);
    this.name = 'InstrumentsServiceError';
    this.code = code;
  }
}

interface InstrumentRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  default_view: string;
  transposition_semitones: number;
  supports_capo: boolean;
  is_enabled: boolean;
  sort_order: number;
}

interface UserInstrumentRow {
  user_id: string;
  instrument_id: string;
  is_primary: boolean;
}

const INSTRUMENT_SELECT_COLUMNS =
  'id, slug, name, category, default_view, transposition_semitones, supports_capo, is_enabled, sort_order';

function mapInstrumentRow(row: InstrumentRow): Instrument {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: isInstrumentCategory(row.category) ? row.category : 'instrument',
    defaultView: isInstrumentDefaultView(row.default_view) ? row.default_view : 'chords',
    transpositionSemitones: Number(row.transposition_semitones) || 0,
    supportsCapo: Boolean(row.supports_capo),
    isEnabled: Boolean(row.is_enabled),
    sortOrder: Number(row.sort_order) || 100,
  };
}

function mapUserInstrumentRow(row: UserInstrumentRow): UserInstrumentAssignment {
  return {
    userId: row.user_id,
    instrumentId: row.instrument_id,
    isPrimary: Boolean(row.is_primary),
  };
}

function validateTransposition(semitones: number): number {
  const rounded = Math.trunc(semitones);
  if (
    Number.isNaN(rounded) ||
    rounded < TRANSPOSITION_RANGE.min ||
    rounded > TRANSPOSITION_RANGE.max
  ) {
    throw new InstrumentsServiceError(
      'INVALID_INPUT',
      `Transposition must be between ${TRANSPOSITION_RANGE.min} and ${TRANSPOSITION_RANGE.max}`,
    );
  }
  return rounded;
}

export async function listInstruments(options?: {
  includeDisabled?: boolean;
}): Promise<Instrument[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('instruments')
    .select(INSTRUMENT_SELECT_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!options?.includeDisabled) {
    query = query.eq('is_enabled', true);
  }

  const { data, error } = await query.returns<InstrumentRow[]>();

  if (error) {
    throw new InstrumentsServiceError('GENERIC', error.message);
  }

  return (data ?? []).map(mapInstrumentRow);
}

export interface CreateInstrumentInput {
  name: string;
  slug?: string;
  category: InstrumentCategory;
  defaultView: InstrumentDefaultView;
  transpositionSemitones: number;
  supportsCapo: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
}

export async function createInstrument(input: CreateInstrumentInput): Promise<Instrument> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new InstrumentsServiceError('INVALID_INPUT', 'Instrument name is required');
  }

  const transposition = validateTransposition(input.transpositionSemitones);
  const slug = slugifyInstrumentName(input.slug?.trim() || trimmedName);
  const supabase = getSupabaseClient();

  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const { data: maxRow, error: maxError } = await supabase
      .from('instruments')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle<{ sort_order: number }>();

    if (maxError) {
      throw new InstrumentsServiceError('GENERIC', maxError.message);
    }

    sortOrder = (maxRow?.sort_order ?? 0) + 10;
  }

  const { data, error } = await supabase
    .from('instruments')
    .insert({
      slug,
      name: trimmedName,
      category: input.category,
      default_view: input.defaultView,
      transposition_semitones: transposition,
      supports_capo: input.supportsCapo,
      is_enabled: input.isEnabled ?? true,
      sort_order: sortOrder,
    })
    .select(INSTRUMENT_SELECT_COLUMNS)
    .single<InstrumentRow>();

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('duplicate')) {
      throw new InstrumentsServiceError('DUPLICATE_SLUG', error.message);
    }
    throw new InstrumentsServiceError('GENERIC', error.message);
  }

  return mapInstrumentRow(data);
}

export interface UpdateInstrumentInput {
  name?: string;
  slug?: string;
  category?: InstrumentCategory;
  defaultView?: InstrumentDefaultView;
  transpositionSemitones?: number;
  supportsCapo?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
}

export async function updateInstrument(
  id: string,
  patch: UpdateInstrumentInput,
): Promise<Instrument> {
  const supabase = getSupabaseClient();
  const payload: Record<string, string | number | boolean> = {};

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) {
      throw new InstrumentsServiceError('INVALID_INPUT', 'Instrument name cannot be empty');
    }
    payload.name = trimmed;
  }

  if (patch.slug !== undefined) {
    payload.slug = slugifyInstrumentName(patch.slug);
  }

  if (patch.category !== undefined) {
    payload.category = patch.category;
  }

  if (patch.defaultView !== undefined) {
    payload.default_view = patch.defaultView;
  }

  if (patch.transpositionSemitones !== undefined) {
    payload.transposition_semitones = validateTransposition(patch.transpositionSemitones);
  }

  if (patch.supportsCapo !== undefined) {
    payload.supports_capo = patch.supportsCapo;
  }

  if (patch.isEnabled !== undefined) {
    payload.is_enabled = patch.isEnabled;
  }

  if (patch.sortOrder !== undefined) {
    payload.sort_order = Math.trunc(patch.sortOrder);
  }

  const { data, error } = await supabase
    .from('instruments')
    .update(payload)
    .eq('id', id)
    .select(INSTRUMENT_SELECT_COLUMNS)
    .single<InstrumentRow>();

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('duplicate')) {
      throw new InstrumentsServiceError('DUPLICATE_SLUG', error.message);
    }
    throw new InstrumentsServiceError('GENERIC', error.message);
  }

  return mapInstrumentRow(data);
}

export async function swapInstrumentSortOrder(
  first: Instrument,
  second: Instrument,
  allOrdered: readonly Instrument[],
): Promise<void> {
  const supabase = getSupabaseClient();

  if (first.sortOrder !== second.sortOrder) {
    const [firstRes, secondRes] = await Promise.all([
      supabase.from('instruments').update({ sort_order: second.sortOrder }).eq('id', first.id),
      supabase.from('instruments').update({ sort_order: first.sortOrder }).eq('id', second.id),
    ]);

    if (firstRes.error) {
      throw new InstrumentsServiceError('GENERIC', firstRes.error.message);
    }
    if (secondRes.error) {
      throw new InstrumentsServiceError('GENERIC', secondRes.error.message);
    }
    return;
  }

  const reordered = [...allOrdered];
  const firstIdx = reordered.findIndex((item) => item.id === first.id);
  const secondIdx = reordered.findIndex((item) => item.id === second.id);
  if (firstIdx < 0 || secondIdx < 0) {
    return;
  }

  const temp = reordered[firstIdx];
  const target = reordered[secondIdx];
  if (!temp || !target) {
    return;
  }
  reordered[firstIdx] = target;
  reordered[secondIdx] = temp;

  await Promise.all(
    reordered.map(async (item, index) => {
      const nextOrder = (index + 1) * 10;
      if (item.sortOrder === nextOrder) {
        return;
      }
      const { error } = await supabase
        .from('instruments')
        .update({ sort_order: nextOrder })
        .eq('id', item.id);
      if (error) {
        throw new InstrumentsServiceError('GENERIC', error.message);
      }
    }),
  );
}

export async function listUserInstruments(userId: string): Promise<UserInstrumentAssignment[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_instruments')
    .select('user_id, instrument_id, is_primary')
    .eq('user_id', userId)
    .returns<UserInstrumentRow[]>();

  if (error) {
    throw new InstrumentsServiceError('GENERIC', error.message);
  }

  return (data ?? []).map(mapUserInstrumentRow);
}

export async function saveUserInstruments(
  userId: string,
  instrumentIds: readonly string[],
  primaryInstrumentId: string | null,
): Promise<UserInstrumentAssignment[]> {
  const supabase = getSupabaseClient();
  const uniqueIds = Array.from(new Set(instrumentIds));

  const existing = await listUserInstruments(userId);
  const uniqueSet = new Set(uniqueIds);
  const removedIds = existing
    .map((item) => item.instrumentId)
    .filter((instrumentId) => !uniqueSet.has(instrumentId));

  if (removedIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('user_instruments')
      .delete()
      .eq('user_id', userId)
      .in('instrument_id', removedIds);

    if (deleteError) {
      throw new InstrumentsServiceError('GENERIC', deleteError.message);
    }
  }

  if (uniqueIds.length === 0) {
    return [];
  }

  const resolvedPrimary =
    primaryInstrumentId && uniqueSet.has(primaryInstrumentId)
      ? primaryInstrumentId
      : (uniqueIds[0] ?? null);

  const upsertRows = uniqueIds.map((instrumentId) => ({
    user_id: userId,
    instrument_id: instrumentId,
    is_primary: instrumentId === resolvedPrimary,
  }));

  const { data, error: upsertError } = await supabase
    .from('user_instruments')
    .upsert(upsertRows, { onConflict: 'user_id,instrument_id' })
    .select('user_id, instrument_id, is_primary')
    .returns<UserInstrumentRow[]>();

  if (upsertError) {
    throw new InstrumentsServiceError('GENERIC', upsertError.message);
  }

  return (data ?? []).map(mapUserInstrumentRow);
}
