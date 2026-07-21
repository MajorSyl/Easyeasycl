import { supabase } from './supabase';

export async function uploadListingPhoto(uri: string, userId: string): Promise<string> {
  const extMatch = uri.match(/\.(\w+)$/);
  const ext = extMatch ? extMatch[1] : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from('listing-photos')
    .upload(path, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });

  if (error) throw error;

  const { data } = supabase.storage.from('listing-photos').getPublicUrl(path);
  return data.publicUrl;
}
