'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send OTP'); return; }
      setSent(true);
      setDevOtp(data.otp); // Show OTP in dev mode
      // Store email in sessionStorage for OTP page
      sessionStorage.setItem('otp_email', email);
      setTimeout(() => router.push('/verify-otp'), 500);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72,
            background: 'var(--primary-light)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h1 className="auth-title">Forgot Password?</h1>
          <p className="auth-subtitle">We will send an OTP to your email</p>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
        {sent && devOtp && (
          <div className="success-msg" style={{ marginBottom: 16 }}>
            ✅ OTP sent! <strong>Dev OTP: {devOtp}</strong>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSend}>
          <div className="input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <input
              type="email"
              placeholder="Enter your Gmail / Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              id="forgot-email"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} id="send-otp-btn">
            {loading ? <span className="spinner" /> : 'Send OTP'}
          </button>

          <Link href="/login" className="btn btn-ghost btn-full" style={{ textAlign: 'center' }}>
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}
