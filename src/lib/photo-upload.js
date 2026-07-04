import { supabase } from './supabase.js';

const BUCKET = 'property-photos';
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const EXTENSION_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export function validatePhotoFile(file) {
  if (!ALLOWED_TYPES.has(file.type)) {
    return `Файлът "${file.name}" не е поддържан формат (позволени са JPEG, PNG, WebP или GIF).`;
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return `Файлът "${file.name}" е по-голям от 2MB.`;
  }

  return null;
}

export async function uploadPropertyPhoto(file, userId) {
  if (!supabase) {
    return { url: null, error: new Error('Supabase is not configured.') };
  }

  const extension = EXTENSION_BY_TYPE[file.type] ?? 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    return { url: null, error };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { url: data.publicUrl, error: null };
}

function storagePathFromPublicUrl(url) {
  const index = String(url ?? '').indexOf(PUBLIC_URL_MARKER);
  return index === -1 ? null : url.slice(index + PUBLIC_URL_MARKER.length);
}

export async function deletePropertyPhotosByUrl(urls) {
  if (!supabase) {
    return;
  }

  const paths = urls.map(storagePathFromPublicUrl).filter(Boolean);

  if (paths.length === 0) {
    return;
  }

  await supabase.storage.from(BUCKET).remove(paths);
}
