'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/apiClient';

interface AccountInfo {
  shopName: string;
  ownerName: string;
  status?: string;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/account': 'Account Info',
  '/new-sale': 'New Sale',
  '/products': 'Products',
  '/staff': 'Staff Logins',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/bill-preview': 'Bill Preview',
  '/tenants': 'Tenants',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/account');
        const d = await res.json();
        return (d.account || null) as AccountInfo | null;
      } catch {
        return null;
      }
    },
  });

  const shopName = account?.shopName || '';
  const userName = account?.ownerName || 'Shop Owner';
  const status = account?.status;
  const blockStatus: 'pending' | 'suspended' | 'deleted' | '' =
    status === 'pending' || status === 'suspended' || status === 'deleted' ? status : '';

  async function handleForceLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (blockStatus) {
    const content = {
      pending: {
        title: 'Account Pending Activation',
        message: 'Your BillEasy account has been created. Your subscription has not been activated yet. Please contact the administrator.',
        color: '#e65100',
        icon: (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        ),
      },
      suspended: {
        title: 'Plan Suspended',
        message: 'Your account is currently suspended. Contact the administrator to renew or restore your plan.',
        color: '#ea4335',
        icon: (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ea4335" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16" r="0.8" fill="#ea4335"/></svg>
        ),
      },
      deleted: {
        title: 'Account Deactivated',
        message: 'Your account has been deactivated. Contact the administrator to renew or restore your plan.',
        color: '#ea4335',
        icon: (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ea4335" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg>
        ),
      },
    }[blockStatus];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="card" style={{ maxWidth: 420, width: '100%', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem' }}>{content.icon}</div>
          <h2 style={{ margin: '12px 0', color: content.color }}>{content.title}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{content.message}</p>
          <button className="btn btn-primary" onClick={handleForceLogout} style={{ width: '100%' }}>Logout</button>
        </div>
      </div>
    );
  }

  const initials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const title = PAGE_TITLES[pathname] || 'BillEasy';
  const isTenants = pathname === '/tenants';

  return (
    <div className="app-layout">
      {!isTenants && (
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          shopName={shopName}
          userName={userName}
        />
      )}
      <div className="main-content" style={isTenants ? { marginLeft: 0 } : undefined}>
        <header className="topbar">
          <div className="topbar-left">
            {!isTenants && (
              <button className="hamburger" onClick={() => setSidebarOpen(o => !o)} id="hamburger-btn" aria-label="Toggle menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <span className="page-title">{title}</span>
          </div>
          <div className="topbar-right">
            {isTenants ? (
              <button className="logout-btn" onClick={handleForceLogout} id="tenants-logout-btn" style={{ width: 'auto', padding: '8px 14px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" style={{ cursor: 'pointer' }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <div className="avatar" title={userName}>{initials || 'U'}</div>
              </>
            )}
          </div>
        </header>
        <main className="page-body" style={isTenants ? { maxWidth: 1200, margin: '0 auto' } : undefined}>
          {children}
        </main>
      </div>
    </div>
  );
}
