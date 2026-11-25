import { useEffect, useRef } from 'react';
import { extractLineLyrics } from '@/domain/chords/chordpro';
import type { ChordProDocument } from '@/domain/chords/types';
import { it } from '@/i18n/it';

interface ChordProRendererProps {
  readonly document: ChordProDocument;
  readonly showChords: boolean;
  readonly fontScale?: number;
  readonly twoColumns?: boolean;
  readonly activeSectionIndex?: number | null;
  readonly onSelectSection?: (sectionIndex: number) => void;
}

export function ChordProRenderer({
  document,
  showChords,
  fontScale = 1,
  twoColumns = false,
  activeSectionIndex = null,
  onSelectSection,
}: ChordProRendererProps) {
  const sectionRefs = useRef<Map<number, HTMLElement | null>>(new Map());

  useEffect(() => {
    if (activeSectionIndex === null || activeSectionIndex === undefined || activeSectionIndex < 0) {
      return;
    }
    const targetEl = sectionRefs.current.get(activeSectionIndex);
    targetEl?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [activeSectionIndex]);

  const indexedSections = document.sections
    .map((section, docIndex) => ({ section, docIndex }))
    .filter(({ section }) => {
      if (showChords) {
        return section.lines.length > 0;
      }
      return section.lines.some((line) => line.kind === 'comment' || !line.isInstrumental);
    });

  if (indexedSections.length === 0) {
    return (
      <p className="text-sm italic text-[var(--arion-text-muted)]">{it.reader.emptyChordPro}</p>
    );
  }

  return (
    <div
      data-testid="lectern-song-body"
      style={{ fontSize: `${fontScale}rem` }}
      className={`lectern-lyrics space-y-6 ${twoColumns ? 'md:columns-2 md:gap-8' : ''}`}
    >
      {indexedSections.map(({ section, docIndex }) => {
        const linesToRender = showChords
          ? section.lines
          : section.lines.filter((line) => line.kind === 'comment' || !line.isInstrumental);
        const isActiveSection = activeSectionIndex === docIndex;

        return (
          <section
            key={section.id}
            ref={(el) => {
              sectionRefs.current.set(docIndex, el);
            }}
            data-active-section={isActiveSection ? 'true' : undefined}
            className={`break-inside-avoid space-y-2.5 rounded-md transition-colors ${
              isActiveSection
                ? 'border-l-4 border-l-[var(--arion-accent)] bg-[var(--arion-accent-soft)] px-3 py-2'
                : ''
            }`}
          >
            {section.type !== 'generic' ? (
              onSelectSection ? (
                <button
                  type="button"
                  onClick={() => onSelectSection(docIndex)}
                  aria-pressed={isActiveSection}
                  className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActiveSection
                      ? 'border-[var(--arion-accent)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                      : 'border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] text-[var(--arion-accent)] hover:border-[var(--arion-accent)]'
                  }`}
                >
                  <span>{section.label}</span>
                </button>
              ) : (
                <h2 className="inline-block rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
                  {section.label}
                </h2>
              )
            ) : onSelectSection ? (
              <button
                type="button"
                onClick={() => onSelectSection(docIndex)}
                aria-pressed={isActiveSection}
                className="inline-flex items-center rounded border border-[var(--arion-border)] bg-[var(--arion-surface-subtle)] px-2 py-0.5 text-[11px] font-bold text-[var(--arion-text-muted)] hover:border-[var(--arion-accent)] hover:text-[var(--arion-accent)]"
              >
                {section.label}
              </button>
            ) : null}

            <div className="space-y-2.5">
              {linesToRender.map((line, lineIdx) => {
                if (line.kind === 'comment') {
                  return (
                    <p
                      key={lineIdx}
                      className="text-[0.85em] font-medium italic text-[var(--arion-accent)]"
                    >
                      {line.commentText}
                    </p>
                  );
                }

                if (!showChords) {
                  return <p key={lineIdx}>{extractLineLyrics(line)}</p>;
                }

                return (
                  <div key={lineIdx} className="flex flex-wrap items-end">
                    {line.segments.map((segment, segIdx) => (
                      <span key={segIdx} className="inline-flex flex-col whitespace-pre">
                        <span className="lectern-chord text-[0.9em] leading-tight">
                          {segment.chord ?? '\u00A0'}
                        </span>
                        <span>{segment.lyric.length > 0 ? segment.lyric : '\u00A0'}</span>
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
