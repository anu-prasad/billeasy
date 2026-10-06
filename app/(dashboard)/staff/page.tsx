'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

interface Staff { id: string; name: string; email: string; phone: string; role: string; active: boolean; createdAt: string; }

const EMPTY = { name: '', email: '', password: '', phone: '' };

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const { data: staff = [], isPending: loading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const res = await apiFetch('/api/staff');
      const d = await res.json().catch(() => ({}));
      return (d.staff || []) as Staff[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await apiFetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowModal(false);
      setForm(EMPTY);
      showToast('Staff member added!');
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch('/api/staff', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      showToast('Staff removed!');
    },
  });

  const saving = addMutation.isPending;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    addMutation.mutate(form);
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this staff member?')) return;
    deleteMutation.mutate(id);
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      {toast && <div className="toast success">{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Staff Logins</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} id="add-staff-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Staff
        </button>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner spinner-dark" /></div>
      ) : staff.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <h3>No staff members</h3>
          <p>Add staff who can log in to create bills</p>
        </div>
      ) : (
        <div className="staff-list">
          {staff.map(m => (
            <div key={m.id} className="staff-card">
              <div className="staff-avatar">{initials(m.name)}</div>
              <div className="staff-info">
                <div className="staff-name">{m.name}</div>
                <div className="staff-email">{m.email} {m.phone && `• ${m.phone}`}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`badge ${m.active ? 'badge-green' : 'badge-red'}`}>
                  {m.active ? 'Active' : 'Inactive'}
                </span>
                <button
                  className="btn btn-icon"
                  onClick={() => handleDelete(m.id)}
                  style={{ background: '#fff5f5', color: 'var(--danger)', border: '1px solid #fed7d7' }}
                  id={`delete-staff-${m.id}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Staff Member</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-grid">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required id="staff-name" />
                </div>
                <div>
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required id="staff-email" />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} id="staff-phone" />
                </div>
                <div>
                  <label className="form-label">Password *</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required id="staff-password" placeholder="Min 6 characters" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="save-staff-btn">
                  {saving ? <span className="spinner" /> : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
