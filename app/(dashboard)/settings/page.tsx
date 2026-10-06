'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDeleteData() {
    if (!confirm('This will delete all your bills and reports data. Are you sure?')) return;
    alert('This feature is for demo only.');
  }

  async function handleLogout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const settings = [
    {
      section: 'Account',
      items: [
        { label: 'Account Info', desc: 'Update shop name, address, GST, UPI settings', href: '/account', icon: '👤' },
        { label: 'Staff Management', desc: 'Add or remove staff login access', href: '/staff', icon: '👥' },
      ]
    },
    {
      section: 'Billing',
      items: [
        { label: 'Products', desc: 'Manage your product catalog and pricing', href: '/products', icon: '📦' },
        { label: 'Bill History', desc: 'View all past bills and transactions', href: '/reports', icon: '📋' },
      ]
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24 }}>Settings</h1>

      {settings.map(group => (
        <div key={group.section} className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">{group.section}</span></div>
          <div style={{ padding: '0 8px 8px' }}>
            {group.items.map(item => (
              <button
                key={item.href}
                className="nav-item"
                style={{ padding: '16px', borderRadius: 8, margin: '4px 0', fontSize: '0.95rem', justifyContent: 'flex-start' }}
                onClick={() => router.push(item.href)}
                id={`settings-${item.label.toLowerCase().replace(/ /g, '-')}`}
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">About</span></div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Version</span>
            <span style={{ fontWeight: 600 }}>v1.0.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>App Name</span>
            <span style={{ fontWeight: 600 }}>BillEasy</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tagline</span>
            <span style={{ fontWeight: 600 }}>Simple Billing • Grow Together</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title" style={{ color: 'var(--danger)' }}>Danger Zone</span></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn btn-danger" onClick={handleDeleteData} id="delete-data-btn">
            🗑️ Clear All Bills Data
          </button>
          <button className="btn btn-outline" onClick={handleLogout} disabled={loading} id="settings-logout-btn"
            style={{ color: 'var(--danger)', borderColor: '#fed7d7' }}>
            {loading ? <span className="spinner spinner-dark" /> : '🚪 Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}
