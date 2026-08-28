'use client';
import { useState, useTransition } from 'react';
import { login, requestPasswordReset } from '../actions';

export default function LoginPage() {
  const [mode, setMode] = useState<'sign_in' | 'forgot_password'>('sign_in');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  async function handleForgotPassword(formData: FormData) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const email = formData.get('email') as string;
      const result = await requestPasswordReset(email);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNotice(`If ${email} has an account, a password reset link is on its way.`);
    });
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">Easy<span>fen</span></div>
        <p className="login-sub">
          {mode === 'sign_in' ? 'Admin Dashboard — sign in with your admin account' : 'Reset your password'}
        </p>

        {error && <div className="error-msg">{error}</div>}
        {notice && <div className="error-msg" style={{ background: '#DCFCE7', color: '#15803D' }}>{notice}</div>}

        {mode === 'sign_in' ? (
          <>
            <form action={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input id="email" name="email" type="email" className="form-input" required autoComplete="email" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input id="password" name="password" type="password" className="form-input" required autoComplete="current-password" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px', justifyContent: 'center', marginTop: 8 }} disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
              onClick={() => { setMode('forgot_password'); setError(null); setNotice(null); }}
            >
              Forgot password?
            </button>
          </>
        ) : (
          <>
            <form action={handleForgotPassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">Email</label>
                <input id="reset-email" name="email" type="email" className="form-input" required autoComplete="email" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px', justifyContent: 'center', marginTop: 8 }} disabled={pending}>
                {pending ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
              onClick={() => { setMode('sign_in'); setError(null); setNotice(null); }}
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
