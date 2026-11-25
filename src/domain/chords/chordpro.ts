import { parseChord } from '@/domain/chords/parser';
import {
  formatChord,
  formatKey,
  parseKey,
  transposeChord,
  transposeKey,
} from '@/domain/chords/transposer';
import type {
  AccidentalPreference,
  ChordProDocument,
  ChordProLine,
  ChordProMetadata,
  ChordProSection,
  ChordProSectionType,
  ChordProSegment,
} from '@/domain/chords/types';
import type { NotationSystem } from '@/domain/models/theme';

const DEFAULT_SECTION_LABELS: Record<ChordProSectionType, string> = {
  verse: 'Strofa',
  chorus: 'Ritornello',
  bridge: 'Ponte',
  intro: 'Intro',
  outro: 'Finale',
  generic: 'Sezione',
};

interface SectionBuilder {
  id: string;
  type: ChordProSectionType;
  label: string;
  explicit: boolean;
  lines: ChordProLine[];
}

function parseDirectiveLine(line: string): { name: string; arg: string } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) {
    return null;
  }
  const colonIdx = inner.indexOf(':');
  if (colonIdx < 0) {
    return { name: inner.toLowerCase(), arg: '' };
  }
  return {
    name: inner.slice(0, colonIdx).trim().toLowerCase(),
    arg: inner.slice(colonIdx + 1).trim(),
  };
}

function mapStartDirectiveToType(name: string): ChordProSectionType | null {
  switch (name) {
    case 'start_of_verse':
    case 'sov':
      return 'verse';
    case 'start_of_chorus':
    case 'soc':
      return 'chorus';
    case 'start_of_bridge':
    case 'sob':
      return 'bridge';
    case 'start_of_intro':
    case 'soi':
      return 'intro';
    case 'start_of_outro':
    case 'soo':
      return 'outro';
    default:
      return null;
  }
}

function isEndDirective(name: string): boolean {
  return (
    name === 'end_of_verse' ||
    name === 'eov' ||
    name === 'end_of_chorus' ||
    name === 'eoc' ||
    name === 'end_of_bridge' ||
    name === 'eob' ||
    name === 'end_of_intro' ||
    name === 'eoi' ||
    name === 'end_of_outro' ||
    name === 'eoo'
  );
}

export function parseChordProLine(rawLine: string): ChordProLine {
  const segments: ChordProSegment[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let pendingChord: string | null = null;
  let hasChords = false;
  let hasNonSpaceLyric = false;

  for (const match of rawLine.matchAll(regex)) {
    const matchIndex = match.index ?? 0;
    const bracketToken = (match[1] ?? '').trim();
    const textBefore = rawLine.slice(lastIndex, matchIndex);

    if (textBefore.length > 0 || pendingChord !== null) {
      if (textBefore.trim().length > 0) {
        hasNonSpaceLyric = true;
      }
      segments.push({
        chord: pendingChord,
        parsedChord: pendingChord ? parseChord(pendingChord) : null,
        lyric: textBefore,
      });
    }

    pendingChord = bracketToken.length > 0 ? bracketToken : null;
    if (pendingChord) {
      hasChords = true;
    }
    lastIndex = matchIndex + match[0].length;
  }

  const trailingText = rawLine.slice(lastIndex);
  if (trailingText.trim().length > 0) {
    hasNonSpaceLyric = true;
  }

  if (trailingText.length > 0 || pendingChord !== null || segments.length === 0) {
    segments.push({
      chord: pendingChord,
      parsedChord: pendingChord ? parseChord(pendingChord) : null,
      lyric: trailingText,
    });
  }

  return {
    kind: 'lyrics',
    segments,
    isInstrumental: hasChords && !hasNonSpaceLyric,
  };
}

export function parseChordPro(source: string): ChordProDocument {
  const normalized = source.replace(/\r\n?/g, '\n');
  const rawLines = normalized.split('\n');

  const metadata: {
    title?: string;
    subtitle?: string;
    author?: string;
    key?: string;
    tempo?: number;
    timeSignature?: string;
  } = {};

  const sections: ChordProSection[] = [];
  let currentSection: SectionBuilder | null = null;
  let sectionCounter = 0;

  const flushSection = () => {
    if (!currentSection) return;
    if (currentSection.lines.length > 0 || currentSection.explicit) {
      sections.push({
        id: currentSection.id,
        type: currentSection.type,
        label: currentSection.label,
        lines: currentSection.lines,
      });
    }
    currentSection = null;
  };

  const ensureSection = (type: ChordProSectionType, label: string, explicit: boolean) => {
    if (!currentSection) {
      sectionCounter += 1;
      currentSection = {
        id: `sec-${sectionCounter}`,
        type,
        label: label || DEFAULT_SECTION_LABELS[type],
        explicit,
        lines: [],
      };
    }
    return currentSection;
  };

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (trimmed === '') {
      if (currentSection && !currentSection.explicit) {
        flushSection();
      }
      continue;
    }

    if (trimmed.startsWith('#')) {
      continue;
    }

    const directive = parseDirectiveLine(trimmed);
    if (directive) {
      switch (directive.name) {
        case 'title':
        case 't':
          if (directive.arg) metadata.title = directive.arg;
          continue;
        case 'subtitle':
        case 'st':
          if (directive.arg) metadata.subtitle = directive.arg;
          continue;
        case 'artist':
        case 'author':
        case 'composer':
          if (directive.arg) metadata.author = directive.arg;
          continue;
        case 'key':
          if (directive.arg) metadata.key = directive.arg;
          continue;
        case 'tempo': {
          const parsedTempo = Number.parseInt(directive.arg, 10);
          if (!Number.isNaN(parsedTempo) && parsedTempo > 0) {
            metadata.tempo = parsedTempo;
          }
          continue;
        }
        case 'time':
          if (directive.arg) metadata.timeSignature = directive.arg;
          continue;
        case 'comment':
        case 'c': {
          if (directive.arg) {
            const sec = ensureSection('generic', DEFAULT_SECTION_LABELS.generic, false);
            sec.lines.push({
              kind: 'comment',
              segments: [],
              commentText: directive.arg,
              isInstrumental: false,
            });
          }
          continue;
        }
        default: {
          const startType = mapStartDirectiveToType(directive.name);
          if (startType) {
            flushSection();
            sectionCounter += 1;
            currentSection = {
              id: `sec-${sectionCounter}`,
              type: startType,
              label: directive.arg || DEFAULT_SECTION_LABELS[startType],
              explicit: true,
              lines: [],
            };
            continue;
          }

          if (isEndDirective(directive.name)) {
            flushSection();
            continue;
          }
          // Ignore unknown directives cleanly
          continue;
        }
      }
    }

    const sec = ensureSection('generic', DEFAULT_SECTION_LABELS.generic, false);
    sec.lines.push(parseChordProLine(rawLine));
  }

  flushSection();

  const resolvedMetadata: ChordProMetadata = {
    ...(metadata.title !== undefined ? { title: metadata.title } : {}),
    ...(metadata.subtitle !== undefined ? { subtitle: metadata.subtitle } : {}),
    ...(metadata.author !== undefined ? { author: metadata.author } : {}),
    ...(metadata.key !== undefined ? { key: metadata.key } : {}),
    ...(metadata.tempo !== undefined ? { tempo: metadata.tempo } : {}),
    ...(metadata.timeSignature !== undefined ? { timeSignature: metadata.timeSignature } : {}),
  };

  return {
    metadata: resolvedMetadata,
    sections,
  };
}

export function extractLineLyrics(line: ChordProLine): string {
  if (line.kind === 'comment') {
    return line.commentText ?? '';
  }
  if (line.isInstrumental) {
    return '';
  }
  const combined = line.segments.map((segment) => segment.lyric).join('');
  return combined.replace(/ {2,}/g, ' ').trim();
}

export function extractPlainLyrics(doc: ChordProDocument): string {
  const sectionBlocks: string[] = [];

  for (const section of doc.sections) {
    const lyricLines: string[] = [];
    for (const line of section.lines) {
      if (line.kind === 'comment') continue;
      if (line.isInstrumental) continue;
      const plain = extractLineLyrics(line);
      if (plain.length > 0) {
        lyricLines.push(plain);
      }
    }

    if (lyricLines.length > 0) {
      const header = section.type !== 'generic' ? `${section.label}:\n` : '';
      sectionBlocks.push(`${header}${lyricLines.join('\n')}`);
    }
  }

  return sectionBlocks.join('\n\n');
}

export function transposeChordProDocument(
  doc: ChordProDocument,
  options: {
    readonly semitones: number;
    readonly notation: NotationSystem;
    readonly accidentalPreference: AccidentalPreference;
  },
): ChordProDocument {
  const { semitones, notation, accidentalPreference } = options;

  let nextKey = doc.metadata.key;
  if (doc.metadata.key) {
    const parsedKey = parseKey(doc.metadata.key);
    if (parsedKey) {
      const shiftedKey = transposeKey(parsedKey, semitones);
      nextKey = formatKey({ ...shiftedKey, accidentalPreference }, notation);
    }
  }

  const nextSections: ChordProSection[] = doc.sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => {
      if (line.kind === 'comment') {
        return line;
      }
      return {
        ...line,
        segments: line.segments.map((segment) => {
          if (!segment.chord) {
            return segment;
          }
          if (!segment.parsedChord) {
            return segment;
          }
          const transposed = transposeChord(segment.parsedChord, semitones);
          return {
            ...segment,
            parsedChord: transposed,
            chord: formatChord(transposed, notation, accidentalPreference),
          };
        }),
      };
    }),
  }));

  return {
    metadata: {
      ...doc.metadata,
      ...(nextKey !== undefined ? { key: nextKey } : {}),
    },
    sections: nextSections,
  };
}

function getSectionDirectivePair(type: ChordProSectionType): { start: string; end: string } | null {
  switch (type) {
    case 'verse':
      return { start: 'start_of_verse', end: 'end_of_verse' };
    case 'chorus':
      return { start: 'start_of_chorus', end: 'end_of_chorus' };
    case 'bridge':
      return { start: 'start_of_bridge', end: 'end_of_bridge' };
    case 'intro':
      return { start: 'start_of_intro', end: 'end_of_intro' };
    case 'outro':
      return { start: 'start_of_outro', end: 'end_of_outro' };
    default:
      return null;
  }
}

export function serializeChordPro(
  doc: ChordProDocument,
  options?: {
    readonly semitones?: number;
    readonly notation?: NotationSystem;
    readonly accidentalPreference?: AccidentalPreference;
  },
): string {
  const activeDoc =
    options?.notation !== undefined
      ? transposeChordProDocument(doc, {
          semitones: options.semitones ?? 0,
          notation: options.notation,
          accidentalPreference: options.accidentalPreference ?? 'sharp',
        })
      : doc;

  const output: string[] = [];

  if (activeDoc.metadata.title) output.push(`{title: ${activeDoc.metadata.title}}`);
  if (activeDoc.metadata.subtitle) output.push(`{subtitle: ${activeDoc.metadata.subtitle}}`);
  if (activeDoc.metadata.author) output.push(`{artist: ${activeDoc.metadata.author}}`);
  if (activeDoc.metadata.key) output.push(`{key: ${activeDoc.metadata.key}}`);
  if (activeDoc.metadata.tempo !== undefined) output.push(`{tempo: ${activeDoc.metadata.tempo}}`);
  if (activeDoc.metadata.timeSignature) output.push(`{time: ${activeDoc.metadata.timeSignature}}`);

  if (output.length > 0 && activeDoc.sections.length > 0) {
    output.push('');
  }

  activeDoc.sections.forEach((section, index) => {
    const pair = getSectionDirectivePair(section.type);
    if (pair) {
      output.push(section.label ? `{${pair.start}: ${section.label}}` : `{${pair.start}}`);
    }

    for (const line of section.lines) {
      if (line.kind === 'comment') {
        if (line.commentText) {
          output.push(`{comment: ${line.commentText}}`);
        }
        continue;
      }

      const lineText = line.segments
        .map((seg) => (seg.chord ? `[${seg.chord}]${seg.lyric}` : seg.lyric))
        .join('');
      output.push(lineText);
    }

    if (pair) {
      output.push(`{${pair.end}}`);
    }

    if (index < activeDoc.sections.length - 1) {
      output.push('');
    }
  });

  return output.join('\n').trim();
}
