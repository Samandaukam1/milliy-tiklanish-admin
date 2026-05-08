import { supabase, isSupabaseConfigured } from './supabase';

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// Bucket names must match what is configured in Supabase Storage
export type StorageBucket =
  | 'article-images'
  | 'article-audio'
  | 'issue-pdfs'
  | 'media-videos'
  | 'media-thumbnails';

export interface StorageUploadResult {
  path: string;
  publicUrl: string;
}

export function extractStoragePathFromPublicUrl(
  bucket: StorageBucket,
  publicUrl?: string | null
): string | null {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export async function uploadAssetToStorage(
  bucket: StorageBucket,
  file: File,
  folder = ''
): Promise<StorageUploadResult> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${folder ? `${folder}/` : ''}${generateId()}.${ext}`;

  if (!isSupabaseConfigured()) {
    return {
      path,
      publicUrl: URL.createObjectURL(file),
    };
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false, cacheControl: '3600' });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
  };
}

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * If Supabase is not configured, returns a local object URL for preview.
 */
export async function uploadToStorage(
  bucket: StorageBucket,
  file: File,
  folder = ''
): Promise<string> {
  const { publicUrl } = await uploadAssetToStorage(bucket, file, folder);
  return publicUrl;
}

export async function deleteFromStorage(
  bucket: StorageBucket,
  path?: string | null
): Promise<void> {
  if (!path || !isSupabaseConfigured()) return;

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) throw new Error(error.message);
}
