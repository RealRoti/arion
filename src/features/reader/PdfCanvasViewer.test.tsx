import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it as vitestIt, vi } from 'vitest';
import type { SongAsset } from '@/domain/models/songs';
import { PdfCanvasViewer } from '@/features/reader/PdfCanvasViewer';
import { it } from '@/i18n/it';

vi.mock('@/services/storageService', () => ({
  downloadSongAssetArrayBuffer: vi.fn(async () => new ArrayBuffer(8)),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      cleanup: vi.fn(async () => undefined),
      getPage: vi.fn(async () => ({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 600 * scale,
          height: 800 * scale,
        }),
        render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
      })),
    }),
  })),
}));

const PDF_ASSET: SongAsset = {
  id: 'asset-pdf-1',
  songId: 'song-1',
  assetType: 'pdf',
  title: 'Partitura Organo',
  storagePath: 'songs/song-1/organo.pdf',
  mimeType: 'application/pdf',
  fileSizeBytes: 2048,
  instrumentIds: [],
  metadata: {},
  sortOrder: 10,
  createdAt: '',
};

describe('PdfCanvasViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  vitestIt(
    'opens fullscreen overlay via Portal, locks body scroll, renders canvas without iframe/embed, and closes on Escape',
    async () => {
      render(
        <PdfCanvasViewer
          assets={[PDF_ASSET]}
          selectedAssetId={PDF_ASSET.id}
          onSelectAsset={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(document.querySelector('canvas')).not.toBeNull();
      });

      expect(screen.queryByTestId('pdf-fullscreen-overlay')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: it.reader.pdfFullscreen }));

      const overlay = await screen.findByTestId('pdf-fullscreen-overlay');
      expect(overlay).toHaveAttribute('role', 'dialog');
      expect(overlay).toHaveClass('fixed', 'inset-0', 'z-[60]');
      expect(overlay.parentElement).toBe(document.body);
      expect(document.body.style.overflow).toBe('hidden');
      expect(overlay.querySelector('canvas')).not.toBeNull();
      expect(document.querySelector('iframe')).toBeNull();
      expect(document.querySelector('embed')).toBeNull();

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('pdf-fullscreen-overlay')).not.toBeInTheDocument();
      });
      expect(document.body.style.overflow).toBe('');
    },
  );

  vitestIt(
    'supports defaultFullscreen and notifies onFullscreenChange(false) when closed',
    async () => {
      const onFullscreenChange = vi.fn();
      render(
        <PdfCanvasViewer
          assets={[PDF_ASSET]}
          selectedAssetId={PDF_ASSET.id}
          onSelectAsset={vi.fn()}
          defaultFullscreen
          onFullscreenChange={onFullscreenChange}
        />,
      );

      const overlay = await screen.findByTestId('pdf-fullscreen-overlay');
      expect(overlay).toBeInTheDocument();
      expect(document.body.style.overflow).toBe('hidden');

      fireEvent.click(screen.getByRole('button', { name: it.reader.pdfExitFullscreen }));

      await waitFor(() => {
        expect(screen.queryByTestId('pdf-fullscreen-overlay')).not.toBeInTheDocument();
      });
      expect(onFullscreenChange).toHaveBeenCalledWith(false);
      expect(document.body.style.overflow).toBe('');
    },
  );
});
