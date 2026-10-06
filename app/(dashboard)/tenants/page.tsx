'use client';
import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

interface TenantAccount {
  tenantId: string;
  ownerName: string;
  shopName: string;
  shopAddress: string;
  phone: string;
  licenseValidity: string;
  plan: string;
  status: string;
  planStartedAt: string;
  suspendedAt: string | null;
  deletedAt: string | null;
}

interface ConfirmTarget {
  account: TenantAccount;
  mode: 'soft' | 'hard';
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
  undo?: { tenantId: string; eventId: number };
}

interface ExtendTarget {
  account: TenantAccount;
  kind: 'activate' | 'extend';
  newValidity: string;
  requestId: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function computeNewValidity(license: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = license ? new Date(`${license}T00:00:00`) : null;
  const base = current && current >= today ? current : today;
  const next = new Date(base);
  next.setFullYear(next.getFullYear() + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function newRequestId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* fall back below */ }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const exp = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}

function badgeClass(status: string) {
  if (status === 'active') return 'badge-green';
  if (status === 'pending') return 'badge-blue';
  if (status === 'expired') return 'badge-orange';
  if (status === 'suspended') return 'badge-red';
  return 'badge-gray';
}

function StatusDot({ color }: { color: string }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6 }} />;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmTarget | null>(null);
  const [confirmExtend, setConfirmExtend] = useState<ExtendTarget | null>(null);
  const [typed, setTyped] = useState('');
  const [page, setPage] = useState(1);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  function showUndoToast(msg: string, undo: { tenantId: string; eventId: number }) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: msg, type: 'success', undo });
    toastTimer.current = setTimeout(() => setToast(null), 10000);
  }

  const { data: accounts = [], isPending: loading } = useQuery({
    queryKey: ['admin', 'accounts', search],
    queryFn: async () => {
      const url = `/api/admin/accounts${search ? `?search=${encodeURIComponent(search)}` : ''}`;
      const res = await apiFetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      return (data.accounts || []) as TenantAccount[];
    },
  });

  function submitSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  const invalidateTenants = () => queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] });

  const actionMutation = useMutation({
    mutationFn: async (vars: { tenantId: string; path: string; method: string; body?: object }) => {
      const res = await apiFetch(`/api/admin/accounts/${vars.tenantId}${vars.path}`, {
        method: vars.method,
        headers: { 'Content-Type': 'application/json' },
        body: vars.body ? JSON.stringify(vars.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Action failed');
      return data;
    },
    onSuccess: () => {
      showToast('Done');
      invalidateTenants();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Action failed', 'error'),
  });

  const extendMutation = useMutation({
    mutationFn: async (target: ExtendTarget) => {
      const res = await apiFetch(`/api/admin/accounts/${target.account.tenantId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: target.requestId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Activation failed');
      return data;
    },
    onSuccess: (data, target) => {
      setConfirmExtend(null);
      showUndoToast(`Subscription activated until ${formatDate(data.newValidity)}.`, {
        tenantId: target.account.tenantId,
        eventId: data.eventId,
      });
      invalidateTenants();
    },
    onError: async (err) => {
      showToast(err instanceof Error ? err.message : 'Activation failed', 'error');
      invalidateTenants();
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (target: { tenantId: string; eventId: number }) => {
      const res = await apiFetch(`/api/admin/accounts/${target.tenantId}/undo-extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: target.eventId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Undo failed');
      return data;
    },
    onSuccess: () => {
      showToast('Subscription activation undone.');
      invalidateTenants();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Undo failed', 'error'),
  });

  const busy = actionMutation.isPending || extendMutation.isPending || undoMutation.isPending;

  async function runAction(tenantId: string, path: string, method: string, body?: object) {
    try {
      await actionMutation.mutateAsync({ tenantId, path, method, body });
      return true;
    } catch {
      return false;
    }
  }

  function openExtendConfirm(a: TenantAccount) {
    setConfirmExtend({
      account: a,
      kind: a.status === 'pending' ? 'activate' : 'extend',
      newValidity: computeNewValidity(a.licenseValidity),
      requestId: newRequestId(),
    });
  }

  function handleExtendConfirm() {
    if (!confirmExtend || busy) return;
    extendMutation.mutate(confirmExtend);
  }

  function handleUndo(target: { tenantId: string; eventId: number }) {
    if (busy) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
    undoMutation.mutate(target);
  }

  function handleConfirmDelete() {
    if (!confirmDelete) return;
    const { account, mode } = confirmDelete;
    if (mode === 'hard' && typed.trim() !== account.tenantId) {
      showToast('Type the tenant id to confirm permanent delete');
      return;
    }
    const ok = runAction(account.tenantId, '', 'DELETE', { force: mode === 'hard' });
    ok.then(success => { if (success) setConfirmDelete(null); });
  }

  const total = accounts.length;
  const active = accounts.filter(a => a.status === 'active').length;
  const expiring = accounts.filter(a => {
    const d = daysUntil(a.licenseValidity);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const suspended = accounts.filter(a => a.status === 'suspended').length;

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageAccounts = accounts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  const emptyTitle = search ? 'No matching tenants' : 'No tenant accounts';
  const toastUndo = toast?.undo;

  return (
    <div>
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`toast ${toast.type}`}
          role="status"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}
        >
          <span>{toast.message}</span>
          {toastUndo && (
            <button
              className="btn"
              id="toast-undo-btn"
              disabled={busy}
              onClick={() => handleUndo(toastUndo)}
              style={{
                flexShrink: 0,
                height: 28,
                padding: '0 12px',
                fontSize: '0.8rem',
                background: '#fff',
                color: 'var(--danger)',
                border: '1px solid var(--danger)',
                fontWeight: 700,
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* ── Page heading ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Tenant Accounts</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          Manage registered shops and their subscription status
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="stats-row" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon qa-icon-gray">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l7-4v18"/><path d="M19 21V11l-7-4"/></svg>
          </div>
          <div className="stat-label">Total Shops</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon qa-icon-green">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="stat-label">Active</div>
          <div className="stat-value">{active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon qa-icon-orange">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-label">Expiring in 30 days</div>
          <div className="stat-value">{expiring}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon qa-icon-red">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div className="stat-label">Suspended</div>
          <div className="stat-value">{suspended}</div>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner spinner-dark" /></div>
      ) : accounts.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18"/><path d="M5 21V7l7-4v18"/><path d="M19 21V11l-7-4"/><line x1="9" y1="9" x2="9" y2="9.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="9" y1="19" x2="9" y2="19.01"/></svg>
          <h3>{emptyTitle}</h3>
          <p>{search ? 'Try a different search term' : 'Registered shops will appear here'}</p>
        </div>
      ) : (
        <div className="card">
          {/* Card header: title + search */}
          <div className="card-header">
            <div>
              <div className="card-title">All Tenants</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {total} registered {total === 1 ? 'shop' : 'shops'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <svg
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)', pointerEvents: 'none' }}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  className="form-input"
                  style={{ paddingLeft: 36, width: 260, fontSize: '0.875rem' }}
                  placeholder="Search shop, owner, phone…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitSearch(); }}
                  id="tenant-search"
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ height: 40, padding: '0 16px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                onClick={() => submitSearch()}
                disabled={busy}
              >
                Search
              </button>
            </div>
          </div>
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Owner</th>
                  <th>Contact</th>
                  <th>Plan</th>
                  <th>Valid Till</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageAccounts.map(a => {
                  const d = daysUntil(a.licenseValidity);
                  const expiryText =
                    d === null ? '' : d < 0 ? `expired ${-d}d ago` : d === 0 ? 'expires today' : `${d} days left`;
                  const dotColor =
                    a.status === 'active' ? '#2e7d32' : a.status === 'pending' ? '#1976d2' : a.status === 'expired' ? '#e65100' : a.status === 'suspended' ? '#ea4335' : '#9e9e9e';
                  const isDormant = a.status === 'suspended' || a.status === 'deleted';
                  return (
                    <tr key={a.tenantId}>
                      <td style={{ maxWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            className="staff-avatar"
                            style={{ flexShrink: 0, width: 36, height: 36, fontSize: '0.72rem', background: 'var(--primary-light)', color: 'var(--primary)' }}
                          >{initials(a.shopName || a.ownerName || a.tenantId) || '?'}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.shopName}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{a.tenantId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{a.ownerName || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{a.phone || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{a.plan || 'yearly'}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {a.licenseValidity ? (
                          <>
                            <div style={{ fontWeight: 500 }}>{formatDate(a.licenseValidity)}</div>
                            {expiryText && (
                              <div style={{ fontSize: '0.75rem', color: d !== null && d < 0 ? 'var(--danger)' : 'var(--text-muted)', marginTop: 2 }}>{expiryText}</div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Not set</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`badge ${badgeClass(a.status)}`}>
                          <StatusDot color={dotColor} />
                          <span style={{ textTransform: 'capitalize' }}>{a.status}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, whiteSpace: 'nowrap' }}>
                        {a.status === 'pending' ? (
                          <button
                            className="btn btn-primary"
                            style={{ height: 32, padding: '0 12px', fontSize: '0.8rem' }}
                            onClick={() => openExtendConfirm(a)}
                            disabled={busy}
                            title="Activate plan: set expiry to today + 1 year"
                          >
                            Activate 1 Year
                          </button>
                        ) : (
                          <button
                            className="btn btn-outline"
                            style={{ height: 32, padding: '0 12px', fontSize: '0.8rem' }}
                            onClick={() => openExtendConfirm(a)}
                            disabled={busy}
                            title="Extend plan by 1 year"
                          >
                            +1 yr
                          </button>
                        )}
                        {isDormant && (
                          <button
                            className="btn"
                            style={{ height: 32, padding: '0 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', background: '#f0fdf4', color: '#2e7d32', border: '1px solid #bbf7d0' }}
                            onClick={() => runAction(a.tenantId, '/reactivate', 'POST')}
                            disabled={busy}
                          >
                            Reactivate
                          </button>
                        )}
                        {!isDormant && a.status !== 'pending' && (
                          <button
                            className="btn"
                            style={{ height: 32, padding: '0 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', background: '#fffbeb', color: '#b7791f', border: '1px solid #fde68a' }}
                            onClick={() => runAction(a.tenantId, '/suspend', 'POST')}
                            disabled={busy}
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          className="btn btn-icon"
                          style={{ height: 32, width: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fff5f5', color: 'var(--danger)', border: '1px solid #fed7d7' }}
                          onClick={() => { setConfirmDelete({ account: a, mode: 'soft' }); setTyped(''); }}
                          disabled={busy}
                          title="Delete"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 20px', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {from}–{to} of {total}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                disabled={busy || page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0 4px' }}>Page {page} of {totalPages}</span>
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                disabled={busy || page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">Delete {confirmDelete.account.shopName}</span>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ padding: '4px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 14px' }}>
                <span className="badge badge-gray">{confirmDelete.account.status}</span>
                {confirmDelete.account.licenseValidity && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Valid till {confirmDelete.account.licenseValidity}</span>
                )}
              </div>

              {(['soft', 'hard'] as const).map(mode => {
                const selected = confirmDelete.mode === mode;
                const danger = mode === 'hard';
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setConfirmDelete({ ...confirmDelete, mode })}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      marginBottom: 10,
                      textAlign: 'left',
                      borderRadius: 10,
                      border: `1.5px solid ${selected ? (danger ? 'var(--danger)' : '#2e7d32') : 'var(--border)'}`,
                      background: selected ? (danger ? '#fff5f5' : '#f0fdf4') : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <span>
                      <div style={{ fontWeight: 600, color: danger ? 'var(--danger)' : '#2e7d32' }}>
                        {mode === 'soft' ? 'Soft delete (recommended)' : 'Permanently delete'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {mode === 'soft'
                          ? 'Keeps data, blocks all logins. Can be restored anytime with Reactivate.'
                          : 'Deletes the shop, users, products, bills and staff from every service. Not reversible.'}
                      </div>
                    </span>
                    <span style={{ fontSize: '1rem', color: danger ? 'var(--danger)' : '#2e7d32' }}>
                      {selected ? (danger ? '●' : '●') : '○'}
                    </span>
                  </button>
                );
              })}

              {confirmDelete.mode === 'hard' && (
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">Type the tenant id to confirm</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <code
                      style={{
                        flex: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: '#fff5f5',
                        border: '1px solid #fed7d7',
                        color: 'var(--danger)',
                        overflowX: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >{confirmDelete.account.tenantId}</code>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0 }}
                      onClick={() => navigator.clipboard.writeText(confirmDelete.account.tenantId).then(() => showToast('Tenant id copied'))}
                    >
                      Copy
                    </button>
                  </div>
                  <input
                    className="form-input"
                    value={typed}
                    onChange={e => setTyped(e.target.value)}
                    placeholder="Paste or type the tenant id above"
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    id="delete-typed"
                  />
                  <div style={{ fontSize: '0.78rem', marginTop: 6 }}>
                    {typed.trim() === confirmDelete.account.tenantId ? (
                      <span style={{ color: '#2e7d32', fontWeight: 600 }}>Tenant id verified — delete is now enabled</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Paste the id above to enable permanent delete</span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: confirmDelete.mode === 'hard' ? 'var(--danger)' : '#2e7d32',
                    color: '#fff',
                    border: 'none',
                  }}
                  onClick={handleConfirmDelete}
                  disabled={busy || (confirmDelete.mode === 'hard' && typed.trim() !== confirmDelete.account.tenantId)}
                  id="confirm-delete-btn"
                >
                  {busy ? <span className="spinner" /> : confirmDelete.mode === 'hard' ? 'Permanently Delete' : 'Soft Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmExtend && (
        <div className="modal-overlay" onClick={() => { if (!busy) setConfirmExtend(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">
                {confirmExtend.kind === 'activate'
                  ? `Activate subscription for ${confirmExtend.account.shopName}?`
                  : `Extend subscription for ${confirmExtend.account.shopName}?`}
              </span>
              <button className="modal-close" onClick={() => setConfirmExtend(null)} disabled={busy}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ padding: '4px 0 0' }}>
              <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Current validity</span>
                  <span style={{ fontWeight: 600 }}>
                    {confirmExtend.account.licenseValidity
                      ? formatDate(confirmExtend.account.licenseValidity)
                      : 'Not activated'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>New validity</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatDate(confirmExtend.newValidity)}</span>
                </div>
              </div>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.83rem',
                  marginBottom: 16,
                }}
              >
                This will {confirmExtend.kind === 'activate' ? 'activate the subscription' : 'extend the subscription'} by 1 year and cannot be undone accidentally.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmExtend(null)} disabled={busy}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  id="confirm-extend-btn"
                  onClick={handleExtendConfirm}
                  disabled={busy}
                >
                  {busy ? <span className="spinner" /> : 'Confirm Activation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}