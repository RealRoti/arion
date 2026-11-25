import type { NotationSystem } from '@/domain/models/theme';

export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type AccidentalPreference = 'sharp' | 'flat';

export interface ParsedChord {
  readonly rootPitch: PitchClass;
  readonly isMinor: boolean;
  readonly suffix: string;
  readonly bassPitch: PitchClass | null;
  readonly sourceNotation: NotationSystem;
  readonly originalText: string;
}

export interface MusicalKey {
  readonly rootPitch: PitchClass;
  readonly isMinor: boolean;
  readonly accidentalPreference: AccidentalPreference;
}

export type ChordProSectionType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'generic';

export interface ChordProSegment {
  readonly chord: string | null;
  readonly parsedChord: ParsedChord | null;
  readonly lyric: string;
}

export interface ChordProLine {
  readonly kind: 'lyrics' | 'comment';
  readonly segments: readonly ChordProSegment[];
  readonly commentText?: string;
  readonly isInstrumental: boolean;
}

export interface ChordProSection {
  readonly id: string;
  readonly type: ChordProSectionType;
  readonly label: string;
  readonly lines: readonly ChordProLine[];
}

export interface ChordProMetadata {
  readonly title?: string;
  readonly subtitle?: string;
  readonly author?: string;
  readonly key?: string;
  readonly tempo?: number;
  readonly timeSignature?: string;
}

export interface ChordProDocument {
  readonly metadata: ChordProMetadata;
  readonly sections: readonly ChordProSection[];
}

export interface TranspositionContext {
  readonly originalKey: string;
  readonly activeKey?: string | null;
  readonly explicitSemitoneShift?: number;
  readonly instrumentTranspositionSemitones?: number;
  readonly capoFrets?: number;
  readonly notation: NotationSystem;
}

export interface EffectiveTranspositionResult {
  readonly songKeyOffset: number;
  readonly instrumentTranspositionSemitones: number;
  readonly capoFrets: number;
  readonly totalSemitones: number;
  readonly concertKey: MusicalKey | null;
  readonly readingKey: MusicalKey | null;
  readonly concertKeyLabel: string;
  readonly readingKeyLabel: string;
  readonly accidentalPreference: AccidentalPreference;
}

export interface PositionedChord {
  readonly column: number;
  readonly raw: string;
  readonly parsed: ParsedChord;
}

export interface ImportChordProOptions {
  readonly targetNotation?: NotationSystem;
  readonly accidentalPreference?: AccidentalPreference;
}

export interface TextImportResult {
  readonly chordpro: string;
  readonly detectedTitle: string | null;
  readonly detectedKey: string | null;
  readonly detectedChordLines: number;
  readonly warnings: readonly string[];
}
