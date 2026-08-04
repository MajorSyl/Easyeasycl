import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

// Phones commonly shoot 3000-4000px photos; nothing in the UI ever displays
// a listing photo larger than this, so cap the longer edge and re-encode as
// JPEG before upload to keep uploads fast on slow connections and keep
// Supabase Storage usage down.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — matches the storage bucket's own limit

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

// A file that isn't a decodable image will fail here — that's a *reject*,
// not a fallback. Silently uploading the untouched original (which the
// caller only ever labels as image/jpeg regardless of its real content)
// would let a non-image slip past the client-side check entirely.
async function compressForUpload(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri);
  const longerEdge = Math.max(width, height);
  const actions =
    longerEdge > MAX_DIMENSION
      ? [{ resize: width >= height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION } }]
      : [];

  const result = await manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

export async function uploadListingPhoto(uri: string, userId: string): Promise<string> {
  const compressedUri = await compressForUpload(uri);
  const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;

  const response = await fetch(compressedUri);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Photo is too large. Please choose a smaller image.');
  }

  const { error } = await supabase.storage
    .from('listing-photos')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatar(uri: string, userId: string): Promise<string> {
  const compressedUri = await compressForUpload(uri);
  const path = `${userId}/${Date.now()}-avatar.jpg`;

  const response = await fetch(compressedUri);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Photo is too large. Please choose a smaller image.');
  }

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
