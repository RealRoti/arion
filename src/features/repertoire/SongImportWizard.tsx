import { useState, type ChangeEvent } from 'react';
import { FileUp, ScanText, Sparkles } from 'lucide-react';
import {
  convertChordsAboveLyricsToChordPro,
  DocxImportError,
  importSongFromDocxArrayBuffer,
} from '@/domain/chords/importer';
import {
  importSongFromMusicXmlArrayBuffer,
  MusicXmlImportError,
} from '@/domain/chords/musicXmlImporter';
import {
  importSongFromOcrImageBlob,
  importSongFromOcrPdfArrayBuffer,
  OcrImportError,
} from '@/domain/chords/ocrImporter';
import { importSongFromPdfArrayBuffer, PdfImportError } from '@/domain/chords/pdfImporter';
import type { NotationSystem } from '@/domain/models/theme';
import { useTheme } from '@/components/useTheme';
import { it } from '@/i18n/it';

interface SongImportWizardProps {
  readonly onApply: (imported: {
    chordpro: string;
    detectedTitle: string | null;
    detectedKey: string | null;
    detectedAuthor?: string | null;
    detectedTimeSignature?: string | null;
    detectedTempoBpm?: number | null;
  }) => void;
}

type PendingOcrSource =
  | { readonly kind: 'pdf'; readonly file: File }
  | { readonly kind: 'image'; readonly file: File }
  | null;

export function SongImportWizard({ onApply }: SongImportWizardProps) {
  const { notation } = useTheme();
  const [targetNotation, setTargetNotation] = useState<NotationSystem>(notation);
  const [pasteText, setPasteText] = useState('');
  const [convertedChordPro, setConvertedChordPro] = useState('');
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null);
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [detectedAuthor, setDetectedAuthor] = useState<string | null>(null);
  const [detectedTimeSignature, setDetectedTimeSignature] = useState<string | null>(null);
  const [detectedTempoBpm, setDetectedTempoBpm] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingOcrSource, setPendingOcrSource] = useState<PendingOcrSource>(null);
  const [ocrProgressLabel, setOcrProgressLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyConversionResult = (result: {
    chordpro: string;
    detectedTitle: string | null;
    detectedKey: string | null;
    detectedChordLines: number;
    detectedAuthor?: string | null;
    detectedTimeSignature?: string | null;
    detectedTempoBpm?: number | null;
    warnings: readonly string[];
  }) => {
    setConvertedChordPro(result.chordpro);
    setDetectedTitle(result.detectedTitle);
    setDetectedKey(result.detectedKey);
    setDetectedAuthor(result.detectedAuthor ?? null);
    setDetectedTimeSignature(result.detectedTimeSignature ?? null);
    setDetectedTempoBpm(result.detectedTempoBpm ?? null);
    setPendingOcrSource(null);
    setOcrProgressLabel(null);
    setErrorMessage(null);
    setStatusMessage(
      result.warnings.includes('no_chords_detected')
        ? it.songEditor.importNoChordsWarning
        : it.songEditor.importSuccess(result.detectedChordLines),
    );
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setPendingOcrSource(null);
    setOcrProgressLabel(null);

    try {
      const lowerName = file.name.trim().toLowerCase();

      if (lowerName.endsWith('.musx')) {
        setErrorMessage(it.songEditor.importMusxUnsupportedError);
        return;
      }

      if (
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.webp') ||
        file.type.startsWith('image/')
      ) {
        setPendingOcrSource({ kind: 'image', file });
        setStatusMessage(it.songEditor.importOcrImageReady);
        return;
      }

      const buffer = await file.arrayBuffer();

      if (
        lowerName.endsWith('.musicxml') ||
        lowerName.endsWith('.xml') ||
        lowerName.endsWith('.mxl')
      ) {
        const result = await importSongFromMusicXmlArrayBuffer(buffer, file.name, {
          targetNotation,
        });
        applyConversionResult(result);
        return;
      }

      if (lowerName.endsWith('.pdf')) {
        const result = await importSongFromPdfArrayBuffer(buffer, { targetNotation });
        applyConversionResult(result);
        return;
      }

      if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
        const result = await importSongFromDocxArrayBuffer(buffer, file.name, { targetNotation });
        applyConversionResult(result);
        return;
      }

      setErrorMessage(it.songEditor.importUnsupportedFormatError);
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
      if (err instanceof PdfImportError) {
        if (err.code === 'SCANNED_PDF_NO_TEXT') {
          setPendingOcrSource({ kind: 'pdf', file });
          setErrorMessage(it.songEditor.importScannedPdfError);
          return;
        }
        if (err.code === 'HYBRID_SCANNED_PDF') {
          setPendingOcrSource({ kind: 'pdf', file });
          setErrorMessage(it.songEditor.importHybridScannedPdfError);
          return;
        }
        if (err.code === 'INVALID_PDF') {
          setErrorMessage(it.songEditor.importInvalidPdfError);
          return;
        }
      }
      if (err instanceof MusicXmlImportError) {
        if (err.code === 'FINALE_MUSX_UNSUPPORTED') {
          setErrorMessage(it.songEditor.importMusxUnsupportedError);
          return;
        }
        if (err.code === 'INVALID_MUSICXML') {
          setErrorMessage(it.songEditor.importInvalidMusicXmlError);
          return;
        }
      }
      setErrorMessage(it.songEditor.importGenericError);
    } finally {
      setBusy(false);
    }
  };

  const handleRunOcr = async () => {
    if (!pendingOcrSource || busy) return;
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setOcrProgressLabel(it.songEditor.importOcrRunning(1, 1, 0));

    try {
      const result =
        pendingOcrSource.kind === 'pdf'
          ? await importSongFromOcrPdfArrayBuffer(await pendingOcrSource.file.arrayBuffer(), {
              targetNotation,
              onProgress: ({ page, totalPages, progress }) => {
                setOcrProgressLabel(it.songEditor.importOcrRunning(page, totalPages, progress));
              },
            })
          : await importSongFromOcrImageBlob(pendingOcrSource.file, {
              targetNotation,
              onProgress: ({ page, totalPages, progress }) => {
                setOcrProgressLabel(it.songEditor.importOcrRunning(page, totalPages, progress));
              },
            });
      applyConversionResult(result);
    } catch (err) {
      console.error('[Arion OCR]', err);
      setOcrProgressLabel(null);
      if (err instanceof OcrImportError && err.code === 'EMPTY_OCR_TEXT') {
        setErrorMessage(it.songEditor.importOcrEmptyError);
      } else {
        setErrorMessage(it.songEditor.importOcrFailedError);
      }
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
            htmlFor="import-file-input"
            className="block text-xs font-bold text-[var(--arion-text)]"
          >
            {it.songEditor.importFileLabel}
          </label>
          <label className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3.5 py-2 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]">
            <FileUp className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.songEditor.importFileButton}</span>
            <input
              id="import-file-input"
              type="file"
              disabled={busy}
              accept=".docx,.doc,.pdf,.musicxml,.xml,.mxl,.musx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml,application/xml,text/xml,image/png,image/jpeg,image/webp"
              onChange={(e) => void handleFileUpload(e)}
              className="sr-only"
            />
          </label>
          <p className="text-[11px] text-[var(--arion-text-muted)]">
            {it.songEditor.importFileHint}
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

      {ocrProgressLabel ? (
        <p role="status" className="text-xs font-semibold text-[var(--arion-accent)]">
          {ocrProgressLabel}
        </p>
      ) : null}

      {pendingOcrSource ? (
        <div className="flex flex-wrap items-center gap-2 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-surface)] p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRunOcr()}
            className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-3.5 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
          >
            <ScanText className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.songEditor.importOcrButton}</span>
          </button>
          <span className="text-[11px] text-[var(--arion-text-muted)]">
            {it.songEditor.importOcrHint}
          </span>
        </div>
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
                detectedAuthor,
                detectedTimeSignature,
                detectedTempoBpm,
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
