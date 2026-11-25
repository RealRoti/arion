import { getSupabaseClient } from '@/services/supabaseClient';

const SONG_ASSETS_BUCKET = 'song-assets';
const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024;

export type StorageServiceErrorCode = 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'GENERIC';

export class StorageServiceError extends Error {
  readonly code: StorageServiceErrorCode;

  constructor(code: StorageServiceErrorCode, message: string) {
    super(message);
    this.name = 'StorageServiceError';
    this.code = code;
  }
}

function sanitizeFileName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\.pdf$/i, '');
  const slug = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug.slice(0, 60) : 'spartito';
}

export async function uploadSongPdfFile(
  songId: string,
  file: File,
): Promise<{ storagePath: string; mimeType: string; fileSizeBytes: number }> {
  const isPdfMime = file.type === 'application/pdf';
  const isPdfExt = /\.pdf$/i.test(file.name);
  if (!isPdfMime && !isPdfExt) {
    throw new StorageServiceError(
      'INVALID_TYPE',
      `Unsupported file type: ${file.type || file.name}`,
    );
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new StorageServiceError('FILE_TOO_LARGE', 'PDF exceeds 25 MiB limit');
  }

  const supabase = getSupabaseClient();
  const safeBase = sanitizeFileName(file.name);
  const storagePath = `songs/${songId}/${Date.now()}-${safeBase}.pdf`;

  const { error } = await supabase.storage.from(SONG_ASSETS_BUCKET).upload(storagePath, file, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (error) {
    throw new StorageServiceError('GENERIC', error.message);
  }

  return {
    storagePath,
    mimeType: 'application/pdf',
    fileSizeBytes: file.size,
  };
}

export async function deleteSongAssetFile(storagePath: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(SONG_ASSETS_BUCKET).remove([storagePath]);
  if (error) {
    throw new StorageServiceError('GENERIC', error.message);
  }
}

export async function downloadSongAssetArrayBuffer(storagePath: string): Promise<ArrayBuffer> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(SONG_ASSETS_BUCKET).download(storagePath);

  if (error || !data) {
    throw new StorageServiceError('GENERIC', error?.message ?? 'Unable to download asset');
  }

  return data.arrayBuffer();
}
