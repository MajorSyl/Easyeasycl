import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

// Phones commonly shoot 3000-4000px photos; nothing in the UI ever displays
// a listing photo larger than this, so cap the longer edge and re-encode as
// JPEG before upload to keep uploads fast on slow connections and keep
// Supabase Storage usage down.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

async function compressForUpload(uri: string): Promise<string> {
  try {
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
  } catch {
    // If manipulation fails for any reason, fall back to the original file
    // rather than blocking the upload entirely.
    return uri;
  }
}

export async function uploadListingPhoto(uri: string, userId: string): Promise<string> {
  const compressedUri = await compressForUpload(uri);
  const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;

  const response = await fetch(compressedUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from('listing-photos')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
  return data.publicUrl;
}
