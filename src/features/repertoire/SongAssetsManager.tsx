import { useState, type FormEvent } from 'react';
import { FileText, Maximize2, Trash2, Upload } from 'lucide-react';
import type { SongAsset } from '@/domain/models/songs';
import { useAuth } from '@/features/auth/useAuth';
import { PdfCanvasViewer } from '@/features/reader/PdfCanvasViewer';
import { it } from '@/i18n/it';
import { addSongPdfAsset, deleteSongAsset } from '@/services/songsService';
import { StorageServiceError } from '@/services/storageService';

interface SongAssetsManagerProps {
  readonly songId: string;
  readonly assets: readonly SongAsset[];
  readonly onAssetsChange: (nextAssets: SongAsset[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SongAssetsManager({ songId, assets, onAssetsChange }: SongAssetsManagerProps) {
  const { profile, instruments, can } = useAuth();
  const canUpload = can('assets:upload');
  const canDelete = can('assets:delete');

  const [assetTitle, setAssetTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const instrumentMap = new Map(instruments.map((inst) => [inst.id, inst.name]));

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedFile || uploading) return;

    setUploading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const created = await addSongPdfAsset({
        songId,
        file: selectedFile,
        title: assetTitle,
        instrumentIds: selectedInstrumentIds,
        userId: profile.id,
      });
      onAssetsChange([...assets, created]);
      setAssetTitle('');
      setSelectedFile(null);
      setSelectedInstrumentIds([]);
      setStatusMessage(it.songEditor.assetUploadedMessage);
    } catch (err) {
      if (err instanceof StorageServiceError) {
        if (err.code === 'INVALID_TYPE') {
          setErrorMessage(it.songEditor.errors.invalidPdf);
          return;
        }
        if (err.code === 'FILE_TOO_LARGE') {
          setErrorMessage(it.songEditor.errors.pdfTooLarge);
          return;
        }
      }
      setErrorMessage(it.songEditor.errors.generic);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (asset: SongAsset) => {
    if (busyId) return;
    setBusyId(asset.id);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await deleteSongAsset(asset);
      onAssetsChange(assets.filter((item) => item.id !== asset.id));
      if (previewAssetId === asset.id) {
        setPreviewAssetId(null);
      }
      setStatusMessage(it.songEditor.assetDeletedMessage);
    } catch {
      setErrorMessage(it.songEditor.errors.generic);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-2xs">
      <div>
        <h2 className="text-base font-bold text-[var(--arion-text)]">
          {it.songEditor.assetsTitle}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--arion-text-muted)]">
          {it.songEditor.assetsSubtitle}
        </p>
      </div>

      {statusMessage ? (
        <p role="status" className="text-xs font-semibold text-[var(--arion-success)]">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-xs font-semibold text-[var(--arion-danger)]">
          {errorMessage}
        </p>
      ) : null}

      {assets.length === 0 ? (
        <p className="text-sm text-[var(--arion-text-muted)]">{it.songEditor.assetsEmpty}</p>
      ) : (
        <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)]">
          {assets.map((asset) => {
            const labels = asset.instrumentIds
              .map((id) => instrumentMap.get(id))
              .filter((name): name is string => Boolean(name));

            return (
              <div
                key={asset.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-bold text-[var(--arion-text)]">
                    <FileText
                      className="h-4 w-4 shrink-0 text-[var(--arion-accent)]"
                      aria-hidden="true"
                    />
                    <span className="truncate">{asset.title}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--arion-text-muted)]">
                    <span>{formatFileSize(asset.fileSizeBytes)}</span>
                    <span>·</span>
                    {labels.length === 0 ? (
                      <span>{it.songEditor.generalAssetBadge}</span>
                    ) : (
                      labels.map((label) => (
                        <span
                          key={label}
                          className="rounded border border-[var(--arion-border)] bg-[var(--arion-surface)] px-1.5 py-0.5 text-[11px] font-semibold"
                        >
                          {label}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {asset.assetType === 'pdf' ? (
                    <button
                      type="button"
                      aria-label={`${it.reader.pdfFullscreen} ${asset.title}`}
                      onClick={() => setPreviewAssetId(asset.id)}
                      className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
                    >
                      <Maximize2
                        className="h-3.5 w-3.5 text-[var(--arion-accent)]"
                        aria-hidden="true"
                      />
                      <span>{it.reader.pdfFullscreen}</span>
                    </button>
                  ) : null}

                  {canDelete ? (
                    <button
                      type="button"
                      disabled={busyId === asset.id}
                      aria-label={`${it.songEditor.deleteAssetButton} ${asset.title}`}
                      onClick={() => void handleDeleteAsset(asset)}
                      className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 px-3 py-1.5 text-xs font-bold text-[var(--arion-danger)] hover:bg-[var(--arion-danger)]/15 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{it.songEditor.deleteAssetButton}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewAssetId ? (
        <PdfCanvasViewer
          assets={assets}
          selectedAssetId={previewAssetId}
          onSelectAsset={setPreviewAssetId}
          defaultFullscreen
          onFullscreenChange={(open) => {
            if (!open) {
              setPreviewAssetId(null);
            }
          }}
        />
      ) : null}

      {canUpload ? (
        <form
          onSubmit={(e) => void handleUpload(e)}
          className="space-y-3 border-t border-[var(--arion-border)] pt-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="asset-title"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.songEditor.assetTitleLabel}
              </label>
              <input
                id="asset-title"
                type="text"
                value={assetTitle}
                onChange={(e) => setAssetTitle(e.target.value)}
                placeholder={it.songEditor.assetTitlePlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="asset-pdf-file"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.songEditor.assetFileLabel}
              </label>
              <input
                id="asset-pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  if (file && !assetTitle.trim()) {
                    setAssetTitle(file.name.replace(/\.pdf$/i, ''));
                  }
                }}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-xs text-[var(--arion-text)]"
              />
            </div>
          </div>

          {instruments.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-[var(--arion-text)]">
                {it.songEditor.assetInstrumentsLabel}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {instruments.map((inst) => {
                  const selected = selectedInstrumentIds.includes(inst.id);
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setSelectedInstrumentIds((prev) =>
                          prev.includes(inst.id)
                            ? prev.filter((id) => id !== inst.id)
                            : [...prev, inst.id],
                        )
                      }
                      className={`touch-target rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        selected
                          ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                          : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
                      }`}
                    >
                      {inst.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[var(--arion-text-muted)]">
                {it.songEditor.assetInstrumentsHint}
              </p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2 text-xs font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
          >
            <Upload className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>
              {uploading ? it.songEditor.uploadingPdfButton : it.songEditor.uploadPdfButton}
            </span>
          </button>
        </form>
      ) : null}
    </section>
  );
}
