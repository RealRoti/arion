import { extractLineLyrics } from '@/domain/chords/chordpro';
import type { ChordProDocument } from '@/domain/chords/types';
import { it } from '@/i18n/it';

interface ChordProRendererProps {
  readonly document: ChordProDocument;
  readonly showChords: boolean;
  readonly fontScale?: number;
  readonly twoColumns?: boolean;
}

export function ChordProRenderer({
  document,
  showChords,
  fontScale = 1,
  twoColumns = false,
}: ChordProRendererProps) {
  const visibleSections = document.sections.filter((section) => {
    if (showChords) {
      return section.lines.length > 0;
    }
    return section.lines.some((line) => line.kind === 'comment' || !line.isInstrumental);
  });

  if (visibleSections.length === 0) {
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
      {visibleSections.map((section) => {
        const linesToRender = showChords
          ? section.lines
          : section.lines.filter((line) => line.kind === 'comment' || !line.isInstrumental);

        return (
          <section key={section.id} className="break-inside-avoid space-y-2.5">
            {section.type !== 'generic' ? (
              <h2 className="inline-block rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
                {section.label}
              </h2>
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
