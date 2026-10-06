'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', shopName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-logo-row">
          <svg className="auth-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span className="auth-brand">BillEasy</span>
        </div>
        <h1 className="auth-title" style={{ marginTop: 12 }}>Create Account</h1>
        <p className="auth-subtitle">Start your free billing journey</p>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {[
            { name: 'name', placeholder: 'Your Full Name', icon: 'user' },
            { name: 'shopName', placeholder: 'Shop / Business Name', icon: 'store' },
            { name: 'email', placeholder: 'Email Address', icon: 'mail' },
            { name: 'phone', placeholder: 'Phone Number', icon: 'phone' },
            { name: 'password', placeholder: 'Create Password', icon: 'lock' },
          ].map(({ name, placeholder, icon }) => (
            <div key={name} className="input-wrap">
              <FieldIcon icon={icon} />
              <input
                type={name === 'password' ? 'password' : name === 'email' ? 'email' : 'text'}
                name={name}
                placeholder={placeholder}
                value={(form as Record<string, string>)[name]}
                onChange={handleChange}
                required={name !== 'phone'}
                id={`register-${name}`}
              />
            </div>
          ))}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} id="register-btn">
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>

          <div className="divider">OR</div>

          <Link href="/login" className="btn btn-outline btn-full">Back to Login</Link>
        </form>

        <div className="auth-footer">Simple Billing • Grow Together</div>
      </div>
    </div>
  );
}

function FieldIcon({ icon }: { icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    store: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>,
    lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  };
  return <>{icons[icon]}</>;
}
