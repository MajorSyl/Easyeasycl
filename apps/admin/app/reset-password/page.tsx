'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

const MIN_PASSWORD_LENGTH = 8;

type Status = 'checking' | 'ready' | 'invalid' | 'saving' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Supabase's recovery link lands here with a token in the URL. The
  // browser client (detectSessionInUrl defaults to true) parses that on
  // load and fires PASSWORD_RECOVERY once it's established a session from
  // it -- that's the signal this link is genuine and the form can show.
  // If nothing fires within a few seconds, the link was invalid, expired,
  // or already used.
  useEffect(() => {
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready');
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === 'checking' ? 'invalid' : current));
    }, 5000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('saving');
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setStatus('ready');
      return;
    }
    setStatus('done');
    setTimeout(() => router.push('/'), 1500);
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">Easy<span>fen</span></div>
        <p className="login-sub">Admin Dashboard — set a new password</p>

        {status === 'checking' && <p className="muted">Verifying your reset link…</p>}

        {status === 'invalid' && (
          <>
            <div className="error-msg">
              This reset link is invalid or has expired. Request a new one from Supabase Dashboard →
              Authentication → Users → find your account → Send password recovery.
            </div>
          </>
        )}

        {(status === 'ready' || status === 'saving') && (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label className="form-label" htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                type="password"
                className="form-input"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', justifyContent: 'center', marginTop: 8 }}
              disabled={status === 'saving'}
            >
              {status === 'saving' ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}

        {status === 'done' && <p className="muted">Password updated. Redirecting you to sign in…</p>}
      </div>
    </div>
  );
}
