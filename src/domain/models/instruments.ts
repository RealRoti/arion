export const INSTRUMENT_CATEGORIES = ['voice', 'instrument'] as const;

export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number];

export const INSTRUMENT_DEFAULT_VIEWS = ['lyrics_only', 'chords', 'pdf'] as const;

export type InstrumentDefaultView = (typeof INSTRUMENT_DEFAULT_VIEWS)[number];

export const TRANSPOSITION_RANGE = {
  min: -11,
  max: 11,
} as const;

export interface Instrument {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly category: InstrumentCategory;
  readonly defaultView: InstrumentDefaultView;
  readonly transpositionSemitones: number;
  readonly supportsCapo: boolean;
  readonly isEnabled: boolean;
  readonly sortOrder: number;
}

export interface UserInstrumentAssignment {
  readonly userId: string;
  readonly instrumentId: string;
  readonly isPrimary: boolean;
}

export function isInstrumentCategory(value: string): value is InstrumentCategory {
  return (INSTRUMENT_CATEGORIES as readonly string[]).includes(value);
}

export function isInstrumentDefaultView(value: string): value is InstrumentDefaultView {
  return (INSTRUMENT_DEFAULT_VIEWS as readonly string[]).includes(value);
}

export function slugifyInstrumentName(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : 'strumento';
}

export function resolveActiveInstrument(
  availableInstruments: readonly Instrument[],
  userAssignments: readonly UserInstrumentAssignment[],
  activeInstrumentId: string | null,
): Instrument | null {
  const enabled = availableInstruments.filter((item) => item.isEnabled);
  if (enabled.length === 0) {
    return null;
  }

  if (activeInstrumentId) {
    const activeMatch = enabled.find((item) => item.id === activeInstrumentId);
    if (activeMatch) {
      return activeMatch;
    }
  }

  const primaryAssignment = userAssignments.find((assignment) => assignment.isPrimary);
  if (primaryAssignment) {
    const primaryMatch = enabled.find((item) => item.id === primaryAssignment.instrumentId);
    if (primaryMatch) {
      return primaryMatch;
    }
  }

  const assignedIds = new Set(userAssignments.map((assignment) => assignment.instrumentId));
  const firstAssigned = enabled.find((item) => assignedIds.has(item.id));
  if (firstAssigned) {
    return firstAssigned;
  }

  return enabled[0] ?? null;
}

export function partitionSelectableInstruments(
  enabledInstruments: readonly Instrument[],
  userAssignments: readonly UserInstrumentAssignment[],
): { assigned: Instrument[]; others: Instrument[] } {
  const enabled = enabledInstruments.filter((item) => item.isEnabled);
  const assignmentMap = new Map(
    userAssignments.map((assignment) => [assignment.instrumentId, assignment]),
  );

  const assigned: Instrument[] = [];
  const others: Instrument[] = [];

  for (const instrument of enabled) {
    if (assignmentMap.has(instrument.id)) {
      assigned.push(instrument);
    } else {
      others.push(instrument);
    }
  }

  assigned.sort((a, b) => {
    const aPrimary = assignmentMap.get(a.id)?.isPrimary ? 1 : 0;
    const bPrimary = assignmentMap.get(b.id)?.isPrimary ? 1 : 0;
    return bPrimary - aPrimary;
  });

  return { assigned, others };
}

export function getEffectiveDefaultShowChords(activeInstrument: Instrument | null): boolean {
  return activeInstrument?.defaultView !== 'lyrics_only';
}

export function formatTranspositionSemitones(semitones: number): string {
  if (semitones === 0) {
    return '0';
  }
  return semitones > 0 ? `+${semitones}` : `${semitones}`;
}
