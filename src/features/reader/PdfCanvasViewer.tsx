import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Moon, ZoomIn, ZoomOut } from 'lucide-react';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import type { SongAsset } from '@/domain/models/songs';
import { it } from '@/i18n/it';
import { downloadSongAssetArrayBuffer } from '@/services/storageService';

interface PdfCanvasViewerProps {
  readonly assets: readonly SongAsset[];
  readonly selectedAssetId: string | null;
  readonly onSelectAsset: (assetId: string) => void;
  readonly onRegisterPedalHandlers?: (
    handlers: { next: () => void; prev: () => void } | null,
  ) => void;
}

export function PdfCanvasViewer({
  assets,
  selectedAssetId,
  onSelectAsset,
  onRegisterPedalHandlers,
}: PdfCanvasViewerProps) {
  const pdfAssets = assets.filter((asset) => asset.assetType === 'pdf');
  const activeAsset =
    pdfAssets.find((asset) => asset.id === selectedAssetId) ?? pdfAssets[0] ?? null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const [loadedDocKey, setLoadedDocKey] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [nightScore, setNightScore] = useState(false);
  const [loading, setLoading] = useState(Boolean(activeAsset));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const goPrev = useCallback(() => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  }, []);

  const goNext = useCallback(() => {
    setPageNumber((prev) => (totalPages > 0 ? Math.min(totalPages, prev + 1) : prev));
  }, [totalPages]);

  useEffect(() => {
    if (!onRegisterPedalHandlers) return;
    onRegisterPedalHandlers({ next: goNext, prev: goPrev });
    return () => {
      onRegisterPedalHandlers(null);
    };
  }, [goNext, goPrev, onRegisterPedalHandlers]);

  useEffect(() => {
    if (!activeAsset) {
      return;
    }

    let cancelled = false;
    const storagePath = activeAsset.storagePath;

    const loadPdf = async () => {
      try {
        const [pdfjs, buffer] = await Promise.all([
          import('pdfjs-dist'),
          downloadSongAssetArrayBuffer(storagePath),
        ]);
        if (cancelled) return;

        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
        const doc = await loadingTask.promise;

        if (cancelled) {
          void doc.cleanup();
          return;
        }

        if (pdfDocRef.current) {
          void pdfDocRef.current.cleanup();
        }
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setPageNumber(1);
        setLoadedDocKey(activeAsset.id);
        setErrorMessage(null);
      } catch {
        if (!cancelled) {
          setErrorMessage(it.reader.pdfError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (pdfDocRef.current) {
        void pdfDocRef.current.cleanup();
        pdfDocRef.current = null;
      }
    };
  }, [activeAsset]);

  useEffect(() => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || !loadedDocKey || totalPages === 0) {
      return;
    }

    let cancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await doc.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = canvas.parentElement?.clientWidth ?? 760;
        const fitScale = Math.max(0.5, Math.min(2, (containerWidth - 16) / baseViewport.width));
        const outputScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const viewport = page.getViewport({ scale: fitScale * zoom });

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch {
        // Ignore cancellation errors on rapid page/zoom changes
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [loadedDocKey, pageNumber, totalPages, zoom]);

  if (!activeAsset) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface-subtle)] p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {pdfAssets.length > 1 ? (
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--arion-text)]">
              <span>{it.reader.pdfSelectorLabel}:</span>
              <select
                value={activeAsset.id}
                onChange={(e) => {
                  setLoading(true);
                  onSelectAsset(e.target.value);
                }}
                className="min-h-9 rounded border border-[var(--arion-border)] bg-[var(--arion-surface)] px-2 py-1 text-xs font-bold text-[var(--arion-text)]"
              >
                {pdfAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="text-xs font-bold text-[var(--arion-text)]">{activeAsset.title}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center rounded border border-[var(--arion-border)] bg-[var(--arion-surface)]">
            <button
              type="button"
              disabled={pageNumber <= 1 || loading}
              onClick={goPrev}
              aria-label={it.reader.pdfPrevPage}
              className="touch-target inline-flex items-center justify-center px-2 py-1 text-[var(--arion-text)] disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="px-2 text-xs font-bold text-[var(--arion-text)]">
              {totalPages > 0 ? it.reader.pdfPageStatus(pageNumber, totalPages) : '...'}
            </span>
            <button
              type="button"
              disabled={pageNumber >= totalPages || loading}
              onClick={goNext}
              aria-label={it.reader.pdfNextPage}
              className="touch-target inline-flex items-center justify-center px-2 py-1 text-[var(--arion-text)] disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="inline-flex items-center rounded border border-[var(--arion-border)] bg-[var(--arion-surface)]">
            <button
              type="button"
              aria-label={it.reader.pdfZoomOut}
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              className="touch-target inline-flex items-center justify-center px-2 py-1 text-[var(--arion-text)]"
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-2 py-1 text-xs font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
            >
              {it.reader.pdfZoomFit}
            </button>
            <button
              type="button"
              aria-label={it.reader.pdfZoomIn}
              onClick={() => setZoom((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
              className="touch-target inline-flex items-center justify-center px-2 py-1 text-[var(--arion-text)]"
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            aria-pressed={nightScore}
            onClick={() => setNightScore((prev) => !prev)}
            className={`touch-target inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-bold transition-colors ${
              nightScore
                ? 'border-[var(--arion-accent)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                : 'border-[var(--arion-border)] bg-[var(--arion-surface)] text-[var(--arion-text)]'
            }`}
          >
            <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{it.reader.nightScoreLabel}</span>
          </button>
        </div>
      </div>

      {/* Canvas Container with left/right edge touch turn zones */}
      <div className="relative flex min-h-[24rem] justify-center overflow-x-auto rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] p-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-[var(--arion-text-muted)]">
            {it.reader.pdfLoading}
          </div>
        ) : errorMessage ? (
          <div
            role="alert"
            className="flex items-center justify-center py-12 text-sm font-semibold text-[var(--arion-danger)]"
          >
            {errorMessage}
          </div>
        ) : (
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              className={`block rounded shadow-xs transition-[filter] ${
                nightScore ? 'brightness-90 contrast-110 invert hue-rotate-180' : ''
              }`}
            />
            <button
              type="button"
              aria-label={it.reader.pdfPrevPage}
              onClick={goPrev}
              className="absolute inset-y-0 left-0 w-[26%] cursor-pointer bg-transparent"
            />
            <button
              type="button"
              aria-label={it.reader.pdfNextPage}
              onClick={goNext}
              className="absolute inset-y-0 right-0 w-[26%] cursor-pointer bg-transparent"
            />
          </div>
        )}
      </div>
    </div>
  );
}
