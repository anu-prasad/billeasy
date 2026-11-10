'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRoleFromCookie } from '@/lib/clientAuth';

export default function VerifyOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email] = useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('otp_email') || '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const canResend = timer === 0;

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  function handleInput(idx: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length < 6) { setError('Enter all 6 digits'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpStr }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid OTP'); return; }
      sessionStorage.removeItem('otp_email');
      router.push(getRoleFromCookie() === 'admin' ? '/tenants' : '/dashboard');
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;
    setTimer(30);
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72,
            background: '#e8f5e9',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="auth-title">Enter OTP</h1>
          <p className="auth-subtitle">We have sent a 6-digit code to your email</p>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

        <form onSubmit={handleVerify}>
          <div className="otp-row" style={{ marginBottom: 24 }}>
            {otp.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                id={`otp-${i}`}
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || otp.join('').length < 6}
            id="verify-otp-btn"
            style={{ marginBottom: 16 }}
          >
            {loading ? <span className="spinner" /> : 'Verify OTP'}
          </button>

          <div className="resend-row">
            {canResend ? (
              <button type="button" onClick={handleResend} className="link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem' }}>
                Resend OTP
              </button>
            ) : (
              <span>Resend OTP ({String(Math.floor(timer / 60)).padStart(2,'0')}:{String(timer % 60).padStart(2,'0')})</span>
            )}
          </div>

          <Link href="/login" className="btn btn-ghost btn-full" style={{ textAlign: 'center', marginTop: 12 }}>
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}
