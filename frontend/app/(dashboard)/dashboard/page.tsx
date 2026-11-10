'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

interface Account { shopName: string; ownerName: string; }
interface Summary { totalSales: number; cashTotal: number; upiTotal: number; billCount: number; }

const QUICK_ACTIONS = [
  { href: '/new-sale', label: 'New Sale', icon: 'cart', cls: 'qa-icon-green' },
  { href: '/products', label: 'Products', icon: 'box', cls: 'qa-icon-blue' },
  { href: '/reports', label: 'Reports', icon: 'bar-chart', cls: 'qa-icon-purple' },
  { href: '/account', label: 'Account Info', icon: 'user', cls: 'qa-icon-orange' },
  { href: '/staff', label: 'Staff Logins', icon: 'users', cls: 'qa-icon-teal' },
  { href: '/settings', label: 'Settings', icon: 'settings', cls: 'qa-icon-gray' },
];

function QAIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    cart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    box: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    'bar-chart': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  };
  return <>{icons[name] || null}</>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: async () => {
      const res = await apiFetch('/api/account');
      const d = await res.json().catch(() => ({}));
      return (d.account || null) as Account | null;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['reports', { from: today, to: today }],
    queryFn: async () => {
      const res = await apiFetch(`/api/reports?from=${today}&to=${today}`);
      const d = await res.json().catch(() => ({}));
      return (d.summary || null) as Summary | null;
    },
  });

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div>
      {/* Greeting */}
      <div className="dash-greeting">
        <h1>
          {getGreeting()},&nbsp;
          <span>{account?.shopName ? 'Shop Owner' : 'Shop Owner'}!</span>
        </h1>
        <p>{account?.shopName || 'Welcome to BillEasy'} &nbsp;•&nbsp; {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Today's Stats */}
      <div className="stats-row" style={{ marginBottom: 28 }}>
        {[
          { label: "Today's Sales", value: `₹${(summary?.totalSales || 0).toLocaleString('en-IN')}`, sub: `${summary?.billCount || 0} bills`, color: '#1a73e8', bg: 'var(--primary-light)' },
          { label: 'Cash', value: `₹${(summary?.cashTotal || 0).toLocaleString('en-IN')}`, sub: 'Today', color: '#2e7d32', bg: '#e8f5e9' },
          { label: 'UPI', value: `₹${(summary?.upiTotal || 0).toLocaleString('en-IN')}`, sub: 'Today', color: '#7b1fa2', bg: '#f3e5f5' },
          { label: 'Bills Created', value: summary?.billCount || 0, sub: 'Today', color: '#e65100', bg: '#fff3e0' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {i === 0 && <><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>}
                {i === 1 && <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/></>}
                {i === 2 && <><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/></>}
                {i === 3 && <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>}
              </svg>
            </div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Quick Actions</h2>
      <div className="quick-actions-grid">
        {QUICK_ACTIONS.map(qa => (
          <Link key={qa.href} href={qa.href} className="qa-card" id={`qa-${qa.label.toLowerCase().replace(/ /g, '-')}`}>
            <div className={`icon-wrap ${qa.cls}`}>
              <QAIcon name={qa.icon} />
            </div>
            <span className="qa-label">{qa.label}</span>
          </Link>
        ))}
      </div>

      {/* Logout */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
        <button
          className="btn btn-outline"
          onClick={handleLogout}
          id="dashboard-logout-btn"
          style={{ color: 'var(--danger)', borderColor: '#fed7d7', minWidth: 180 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}
