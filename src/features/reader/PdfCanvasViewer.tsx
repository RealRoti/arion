import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Moon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
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
  readonly onBoundaryPrev?: () => void;
  readonly onBoundaryNext?: () => void;
  readonly controlledPage?: number | null;
  readonly onPageChange?: (page: number, totalPages: number) => void;
  readonly defaultFullscreen?: boolean;
  readonly onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function PdfCanvasViewer({
  assets,
  selectedAssetId,
  onSelectAsset,
  onRegisterPedalHandlers,
  onBoundaryPrev,
  onBoundaryNext,
  controlledPage = null,
  onPageChange,
  defaultFullscreen = false,
  onFullscreenChange,
}: PdfCanvasViewerProps) {
  const pdfAssets = assets.filter((asset) => asset.assetType === 'pdf');
  const activeAsset =
    pdfAssets.find((asset) => asset.id === selectedAssetId) ?? pdfAssets[0] ?? null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const [loadedDocKey, setLoadedDocKey] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(
    controlledPage && controlledPage >= 1 ? Math.floor(controlledPage) : 1,
  );
  const [zoom, setZoom] = useState(1);
  const [nightScore, setNightScore] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(defaultFullscreen);
  const [viewportRevision, setViewportRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(activeAsset));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [prevControlledPage, setPrevControlledPage] = useState<number | null>(controlledPage);
  if (controlledPage !== prevControlledPage) {
    setPrevControlledPage(controlledPage);
    if (
      typeof controlledPage === 'number' &&
      Number.isFinite(controlledPage) &&
      controlledPage >= 1
    ) {
      const target = Math.floor(controlledPage);
      setPageNumber(totalPages > 0 ? Math.min(totalPages, target) : target);
    }
  }

  const initialControlledPageRef = useRef<number | null>(controlledPage);
  useEffect(() => {
    initialControlledPageRef.current = controlledPage;
  }, [controlledPage]);

  const goPrev = useCallback(() => {
    const nextPage = Math.max(1, pageNumber - 1);
    if (nextPage === pageNumber) return;
    setPageNumber(nextPage);
    onPageChange?.(nextPage, totalPages);
  }, [onPageChange, pageNumber, totalPages]);

  const goNext = useCallback(() => {
    if (totalPages <= 0) return;
    const nextPage = Math.min(totalPages, pageNumber + 1);
    if (nextPage === pageNumber) return;
    setPageNumber(nextPage);
    onPageChange?.(nextPage, totalPages);
  }, [onPageChange, pageNumber, totalPages]);

  const openFullscreen = () => {
    setIsFullscreen(true);
    onFullscreenChange?.(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    onFullscreenChange?.(false);
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      closeFullscreen();
    } else {
      openFullscreen();
    }
  };

  const handlePedalPrev = useCallback(() => {
    if (pageNumber <= 1 && onBoundaryPrev) {
      onBoundaryPrev();
      return;
    }
    goPrev();
  }, [goPrev, onBoundaryPrev, pageNumber]);

  const handlePedalNext = useCallback(() => {
    if (totalPages > 0 && pageNumber >= totalPages && onBoundaryNext) {
      onBoundaryNext();
      return;
    }
    goNext();
  }, [goNext, onBoundaryNext, pageNumber, totalPages]);

  useEffect(() => {
    if (!onRegisterPedalHandlers) return;
    onRegisterPedalHandlers({ next: handlePedalNext, prev: handlePedalPrev });
    return () => {
      onRegisterPedalHandlers(null);
    };
  }, [handlePedalNext, handlePedalPrev, onRegisterPedalHandlers]);

  // Body scroll lock + Escape & standalone keyboard paging while fullscreen
  useEffect(() => {
    if (!isFullscreen || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsFullscreen(false);
        onFullscreenChange?.(false);
        return;
      }

      if (!onRegisterPedalHandlers) {
        if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
          event.preventDefault();
          goPrev();
        } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
          event.preventDefault();
          goNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [goNext, goPrev, isFullscreen, onFullscreenChange, onRegisterPedalHandlers]);

  // Re-render canvas cleanly on viewport resize or orientation change
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let timeoutId: number | null = null;
    const scheduleResize = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        setViewportRevision((v) => v + 1);
      }, 100);
    };

    window.addEventListener('resize', scheduleResize);
    const observedElement = containerRef.current;
    const observer =
      typeof ResizeObserver !== 'undefined' && observedElement
        ? new ResizeObserver(scheduleResize)
        : null;
    if (observer && observedElement) {
      observer.observe(observedElement);
    }

    return () => {
      window.removeEventListener('resize', scheduleResize);
      observer?.disconnect();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isFullscreen]);

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
        const targetInitial = initialControlledPageRef.current;
        setPageNumber(
          targetInitial && targetInitial >= 1
            ? Math.min(doc.numPages, Math.floor(targetInitial))
            : 1,
        );
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
        const container = containerRef.current ?? canvas.parentElement;
        const containerWidth = container?.clientWidth || 760;
        const containerHeight = container?.clientHeight || 0;
        const fitByWidth = Math.max(0.4, (containerWidth - 16) / baseViewport.width);
        const fitScale =
          isFullscreen && containerHeight > 120
            ? Math.max(
                0.4,
                Math.min(
                  3,
                  Math.min(fitByWidth, Math.max(0.4, (containerHeight - 16) / baseViewport.height)),
                ),
              )
            : Math.max(0.5, Math.min(2, fitByWidth));
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
  }, [isFullscreen, loadedDocKey, pageNumber, totalPages, viewportRevision, zoom]);

  if (!activeAsset) {
    return null;
  }

  const toolbarContent = (
    <div className="flex flex-wrap items-center justify-between gap-2">
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
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
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

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? it.reader.pdfExitFullscreen : it.reader.pdfFullscreen}
          aria-pressed={isFullscreen}
          className={`touch-target inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-bold transition-colors ${
            isFullscreen
              ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
              : 'border-[var(--arion-border)] bg-[var(--arion-surface)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
          }`}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{it.reader.pdfExitFullscreenShort}</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{it.reader.pdfFullscreen}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const canvasContent = loading ? (
    <div className="m-auto flex items-center justify-center py-12 text-sm text-[var(--arion-text-muted)]">
      {it.reader.pdfLoading}
    </div>
  ) : errorMessage ? (
    <div
      role="alert"
      className="m-auto flex items-center justify-center py-12 text-sm font-semibold text-[var(--arion-danger)]"
    >
      {errorMessage}
    </div>
  ) : (
    <div className={isFullscreen ? 'relative m-auto inline-block' : 'relative inline-block'}>
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
  );

  if (isFullscreen) {
    const fullscreenNode = (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={it.reader.pdfFullscreenDialogLabel}
        data-testid="pdf-fullscreen-overlay"
        className="fixed inset-0 z-[60] flex h-[100dvh] w-screen flex-col bg-[var(--arion-bg)]"
      >
        <div className="shrink-0 border-b border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          {toolbarContent}
        </div>
        <div
          ref={containerRef}
          className="relative flex min-h-0 flex-1 overflow-auto bg-[var(--arion-bg)] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          {canvasContent}
        </div>
      </div>
    );

    if (typeof document === 'undefined') {
      return fullscreenNode;
    }

    return createPortal(fullscreenNode, document.body);
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface-subtle)] p-2.5">
        {toolbarContent}
      </div>

      {/* Canvas Container with left/right edge touch turn zones */}
      <div
        ref={containerRef}
        className="relative flex min-h-[24rem] justify-center overflow-x-auto rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] p-2"
      >
        {canvasContent}
      </div>
    </div>
  );
}
