import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
  // Don't throw here: a module-scope throw crashes the app before any UI can
  // render. Queries will fail against the placeholder host, and screens show
  // their empty states instead of the app dying on launch.
  console.error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (.env locally, eas.json build env for EAS builds).'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://unconfigured.invalid',
  supabaseAnonKey || 'unconfigured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
