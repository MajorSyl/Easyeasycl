import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Required by expo-web-browser so a pending native auth session correctly
// resolves (rather than hanging) if the app was backgrounded mid-flow and
// the OS later delivers the redirect while the app is foregrounding again.
WebBrowser.maybeCompleteAuthSession();

async function applySessionFromUrl(url: string): Promise<string | null> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) return errorCode;
  // This project's Supabase client uses the default implicit OAuth flow, so
  // the tokens arrive directly in the redirect URL rather than as a `code`
  // to exchange — no server round-trip needed here.
  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return null; // user backed out before completing sign-in
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return error ? error.message : null;
}

// Starts Google sign-in. Returns an error message on failure, or null on
// success / user-cancelled (both of which need no error UI). On web this
// navigates the whole page away to Google and never resolves -- the actual
// session gets set later, when the browser lands back on
// app/auth-callback.tsx (see finishWebGoogleSignIn below).
export async function signInWithGoogle(): Promise<string | null> {
  const redirectTo = Linking.createURL('auth-callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return error.message;
  if (!data?.url) return 'Could not start Google sign-in.';

  if (Platform.OS === 'web') {
    window.location.assign(data.url);
    return null;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success' && result.url) {
    return applySessionFromUrl(result.url);
  }
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return null;
  }
  return 'Could not complete Google sign-in.';
}

// Called once by app/auth-callback.tsx when the browser lands back on the
// app after the web OAuth redirect. No-op on native, where the redirect is
// already fully handled inside signInWithGoogle() above and this screen is
// never actually reached.
export async function finishWebGoogleSignIn(): Promise<string | null> {
  if (Platform.OS !== 'web') return null;
  return applySessionFromUrl(window.location.href);
}

// Supabase stamps created_at and last_sign_in_at with the same instant on a
// user's very first sign-in; last_sign_in_at moves on every one after that.
// Comparing the two is the standard way to tell "brand-new account" apart
// from "logging back in" for a provider like Google that has no separate
// sign-up step of its own.
export function isFirstSignIn(user: User): boolean {
  const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
  const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
  return Math.abs(lastSignInAt - createdAt) < 5000;
}
