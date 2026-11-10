'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

interface Account {
  tenantId: string;
  ownerName: string;
  shopName: string;
  shopAddress: string;
  phone: string;
  gstApplicable: boolean;
  gstPercentage: number;
  gstNumber: string;
  upiId: string;
  defaultMessage: string;
  licenseValidity: string;
  logoUrl: string;
}

export default function AccountPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Account | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  const { data, isPending: loading } = useQuery({
    queryKey: ['account'],
    queryFn: async () => {
      const res = await apiFetch('/api/account');
      const d = await res.json().catch(() => ({}));
      return (d.account || null) as Account | null;
    },
  });

  if (data && draft === null) setDraft(data);

  const saveMutation = useMutation({
    mutationFn: async (body: Account) => {
      const res = await apiFetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok;
    },
    onSuccess: (ok) => {
      if (ok) {
        queryClient.invalidateQueries({ queryKey: ['account'] });
        showToast('Account saved successfully!', 'success');
      } else {
        showToast('Failed to save', 'error');
      }
    },
  });

  const saving = saveMutation.isPending;

  function setField(key: keyof Account, val: string | boolean | number) {
    setDraft(a => a ? { ...a, [key]: val } : a);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (draft) saveMutation.mutate(draft);
  }

  function showToast(msg: string, type = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 3000);
  }

  const account = draft;

  if (loading) return <div className="page-loading"><div className="spinner spinner-dark" /><span>Loading...</span></div>;
  if (!account) return <div className="error-msg">Failed to load account</div>;

  return (
    <div>
      {toast && <div className={`toast ${toastType}`}>{toast}</div>}

      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Account Info</h1>
          <button type="submit" className="btn btn-primary" disabled={saving} id="save-account-btn">
            {saving ? <span className="spinner" /> : 'Save'}
          </button>
        </div>

        {/* Logo */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">Shop Logo</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {account.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.logoUrl} alt="Logo" className="logo-preview" />
            ) : (
              <div style={{ width: 80, height: 80, background: 'var(--primary-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
            )}
            <label className="btn btn-ghost" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
              Change Logo
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => setField('logoUrl', ev.target?.result as string);
                reader.readAsDataURL(file);
              }} />
            </label>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">Basic Information</span></div>
          <div className="card-body">
            <div className="form-grid form-grid-2">
              <div>
                <label className="form-label">Account Holder Name</label>
                <input className="form-input" value={account.ownerName} onChange={e => setField('ownerName', e.target.value)} id="owner-name" />
              </div>
              <div>
                <label className="form-label">Shop Name</label>
                <input className="form-input" value={account.shopName} onChange={e => setField('shopName', e.target.value)} id="shop-name" required />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="form-input" value={account.phone} onChange={e => setField('phone', e.target.value)} id="shop-phone" />
              </div>
              <div>
                <label className="form-label">UPI ID</label>
                <input className="form-input" value={account.upiId} onChange={e => setField('upiId', e.target.value)} placeholder="shop@okaxis" id="upi-id" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Shop Address</label>
                <textarea className="form-input form-textarea" value={account.shopAddress} onChange={e => setField('shopAddress', e.target.value)} id="shop-address" />
              </div>
            </div>
          </div>
        </div>

        {/* GST Settings */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">GST Settings</span></div>
          <div className="card-body">
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">GST Applicable?</label>
              <div className="radio-group">
                <label className={`radio-option ${account.gstApplicable ? 'selected' : ''}`}>
                  <input type="radio" name="gst" checked={account.gstApplicable} onChange={() => setField('gstApplicable', true)} /> Yes
                </label>
                <label className={`radio-option ${!account.gstApplicable ? 'selected' : ''}`}>
                  <input type="radio" name="gst" checked={!account.gstApplicable} onChange={() => setField('gstApplicable', false)} /> No
                </label>
              </div>
            </div>
            {account.gstApplicable && (
              <div className="form-grid form-grid-2">
                <div>
                  <label className="form-label">GST Percentage (%)</label>
                  <select className="form-input form-select" value={account.gstPercentage} onChange={e => setField('gstPercentage', Number(e.target.value))} id="gst-percentage">
                    {[0, 3, 5, 12, 18, 28].map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">GST Number</label>
                  <input className="form-input" value={account.gstNumber} onChange={e => setField('gstNumber', e.target.value)} placeholder="32ABCDE1234F1Z5" id="gst-number" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Default Message */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">Bill Settings</span></div>
          <div className="card-body">
            <div className="form-grid form-grid-2">
              <div>
                <label className="form-label">Default Message Template</label>
                <textarea className="form-input form-textarea" value={account.defaultMessage} onChange={e => setField('defaultMessage', e.target.value)} id="default-message" />
              </div>
              <div>
                <label className="form-label">License Validity Till</label>
                <input type="date" className="form-input" value={account.licenseValidity} onChange={e => setField('licenseValidity', e.target.value)} id="license-validity" />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
