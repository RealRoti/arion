import { useState, type ChangeEvent } from 'react';
import { FileUp, Sparkles } from 'lucide-react';
import {
  convertChordsAboveLyricsToChordPro,
  DocxImportError,
  importSongFromDocxArrayBuffer,
} from '@/domain/chords/importer';
import type { NotationSystem } from '@/domain/models/theme';
import { useTheme } from '@/components/useTheme';
import { it } from '@/i18n/it';

interface SongImportWizardProps {
  readonly onApply: (imported: {
    chordpro: string;
    detectedTitle: string | null;
    detectedKey: string | null;
  }) => void;
}

export function SongImportWizard({ onApply }: SongImportWizardProps) {
  const { notation } = useTheme();
  const [targetNotation, setTargetNotation] = useState<NotationSystem>(notation);
  const [pasteText, setPasteText] = useState('');
  const [convertedChordPro, setConvertedChordPro] = useState('');
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null);
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyConversionResult = (result: {
    chordpro: string;
    detectedTitle: string | null;
    detectedKey: string | null;
    detectedChordLines: number;
    warnings: readonly string[];
  }) => {
    setConvertedChordPro(result.chordpro);
    setDetectedTitle(result.detectedTitle);
    setDetectedKey(result.detectedKey);
    setErrorMessage(null);
    setStatusMessage(
      result.warnings.includes('no_chords_detected')
        ? it.songEditor.importNoChordsWarning
        : it.songEditor.importSuccess(result.detectedChordLines),
    );
  };

  const handleDocxUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const result = await importSongFromDocxArrayBuffer(buffer, file.name, { targetNotation });
      applyConversionResult(result);
    } catch (err) {
      if (err instanceof DocxImportError) {
        if (err.code === 'LEGACY_DOC_UNSUPPORTED') {
          setErrorMessage(it.songEditor.importLegacyDocError);
          return;
        }
        if (err.code === 'INVALID_DOCX') {
          setErrorMessage(it.songEditor.importInvalidDocxError);
          return;
        }
      }
      setErrorMessage(it.songEditor.importGenericError);
    } finally {
      setBusy(false);
    }
  };

  const handleConvertPaste = () => {
    if (!pasteText.trim()) return;
    const result = convertChordsAboveLyricsToChordPro(pasteText, { targetNotation });
    applyConversionResult(result);
  };

  return (
    <section className="space-y-4 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-surface-subtle)] p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--arion-text)]">
          <Sparkles className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
          <span>{it.songEditor.importTitle}</span>
        </h3>
        <p className="text-xs text-[var(--arion-text-muted)]">{it.songEditor.importSubtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="import-docx-input"
            className="block text-xs font-bold text-[var(--arion-text)]"
          >
            {it.songEditor.importDocxLabel}
          </label>
          <label className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3.5 py-2 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]">
            <FileUp className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.songEditor.importDocxButton}</span>
            <input
              id="import-docx-input"
              type="file"
              disabled={busy}
              accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={(e) => void handleDocxUpload(e)}
              className="sr-only"
            />
          </label>
          <p className="text-[11px] text-[var(--arion-text-muted)]">
            {it.songEditor.importDocxHint}
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="import-notation"
            className="block text-xs font-bold text-[var(--arion-text)]"
          >
            {it.songEditor.importNotationLabel}
          </label>
          <select
            id="import-notation"
            value={targetNotation}
            onChange={(e) => setTargetNotation(e.target.value as NotationSystem)}
            className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-2 text-xs font-bold text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
          >
            <option value="italian">{it.notations.italian}</option>
            <option value="english">{it.notations.english}</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="import-paste-textarea"
          className="block text-xs font-bold text-[var(--arion-text)]"
        >
          {it.songEditor.importPasteLabel}
        </label>
        <textarea
          id="import-paste-textarea"
          rows={5}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={it.songEditor.importPastePlaceholder}
          className="w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-3 font-mono text-xs text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
        />
        <button
          type="button"
          disabled={busy || !pasteText.trim()}
          onClick={handleConvertPaste}
          className="touch-target rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3.5 py-2 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)] disabled:opacity-50"
        >
          {it.songEditor.importConvertButton}
        </button>
      </div>

      {statusMessage ? (
        <p role="status" className="text-xs font-semibold text-[var(--arion-accent)]">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-xs font-semibold text-[var(--arion-danger)]">
          {errorMessage}
        </p>
      ) : null}

      {convertedChordPro ? (
        <div className="space-y-2 border-t border-[var(--arion-border)] pt-3">
          <p className="text-xs font-bold text-[var(--arion-text)]">
            {it.songEditor.importPreviewTitle}
          </p>
          <pre className="max-h-48 overflow-auto rounded border border-[var(--arion-border)] bg-[var(--arion-surface)] p-3 font-mono text-xs text-[var(--arion-text)]">
            {convertedChordPro}
          </pre>
          <button
            type="button"
            onClick={() =>
              onApply({
                chordpro: convertedChordPro,
                detectedTitle,
                detectedKey,
              })
            }
            className="touch-target rounded-md bg-[var(--arion-primary)] px-4 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
          >
            {it.songEditor.importApplyButton}
          </button>
        </div>
      ) : null}
    </section>
  );
}
