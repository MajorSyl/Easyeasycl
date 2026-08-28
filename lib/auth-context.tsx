import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type VerificationTier = 'none' | 'phone_verified' | 'agent_verified' | 'id_verified';

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: 'user' | 'agent' | 'landlord' | 'agency';
  business_name: string | null;
  verification_tier: VerificationTier;
  phone_verification_requested_at: string | null;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  onlineUserIds: Set<string>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
};

// The site the recovery email link points at. This app's Supabase project
// is production-only (no separate staging instance), so there's just the
// one live domain to send people to -- from there, `app/reset-password.tsx`
// picks up the recovery token and lets them set a new password.
const RESET_PASSWORD_URL = 'https://easyfen.com/reset-password';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // getSession() and onAuthStateChange's initial event can both fire within
  // milliseconds of each other on startup, so loadProfile can end up
  // in-flight more than once concurrently. A request-id guard makes sure
  // only the most recently *started* call is allowed to set state, so a
  // slower, now-stale response (e.g. one that lost a token-attachment race
  // and 401'd) can never overwrite a newer good result with an empty
  // profile. A failed fetch also no longer wipes out an already-loaded
  // profile -- it's far more likely to be transient than the user's name
  // having actually disappeared.
  const profileRequestIdRef = useRef(0);

  async function loadProfile(userId: string) {
    const requestId = ++profileRequestIdRef.current;
    const [{ data, error }, { data: phone }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, business_name, verification_tier, phone_verification_requested_at')
        .eq('id', userId)
        .single(),
      supabase.rpc('get_profile_phone', { profile_id: userId }),
    ]);
    if (requestId !== profileRequestIdRef.current) return;
    if (error) return;
    setProfile(data ? ({ ...data, phone: phone ?? null } as Profile) : null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
      } else {
        profileRequestIdRef.current++; // invalidate any in-flight loadProfile so it can't repopulate after sign-out
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setOnlineUserIds(new Set());
      return;
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: session.user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return {
      error: error?.message ?? null,
      // When Supabase requires email confirmation, sign-up succeeds but no
      // session is returned until the user clicks the link in their inbox.
      needsEmailConfirmation: !error && !data.session,
    };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_URL,
    });
    return error?.message ?? null;
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id);
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, onlineUserIds, signUp, signIn, signOut, refreshProfile, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
