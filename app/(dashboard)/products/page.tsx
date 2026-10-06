'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BarcodeScanner from '@/components/BarcodeScanner';
import { apiFetch } from '@/lib/apiClient';

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  unit: string;
  category: string;
  stock: number;
}

const EMPTY = { name: '', code: '', price: '', unit: 'Pcs', category: 'General', stock: '' };

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  const { data: products = [], isPending: loading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiFetch('/api/products');
      const d = await res.json().catch(() => ({}));
      return (d.products || []) as Product[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (vars: { id?: string; body: object }) => {
      const res = vars.id
        ? await apiFetch(`/api/products/${vars.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vars.body) })
        : await apiFetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vars.body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `Request failed (${res.status})`);
      return d;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast(vars.id ? 'Product updated!' : 'Product added!');
      setShowModal(false);
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Something went wrong'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Product deleted!');
    },
  });

  const saving = saveMutation.isPending;

  function openAdd() { setEditProduct(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(p: Product) { setEditProduct(p); setForm({ name: p.name, code: p.code, price: String(p.price), unit: p.unit, category: p.category, stock: String(p.stock) }); setShowModal(true); }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
    saveMutation.mutate({ id: editProduct?.id, body });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return;
    deleteMutation.mutate(id);
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {toast && <div className="toast success">{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Products ({products.length})</h1>
        <button className="btn btn-primary" onClick={openAdd} id="add-product-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: 20, position: 'relative' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search by name, code, or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="product-search"
          style={{ width: '100%', padding: '12px 14px 12px 42px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', background: 'var(--bg)' }}
        />
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner spinner-dark" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <h3>No products found</h3>
          <p>Add your first product to get started</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className="badge badge-gray">{p.code || '—'}</span></td>
                    <td>{p.category}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{p.price.toLocaleString('en-IN')}</td>
                    <td>{p.unit}</td>
                    <td>{p.stock}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(p)} title="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn btn-icon" onClick={() => handleDelete(p.id)} title="Delete" style={{ background: '#fff5f5', color: 'var(--danger)', border: '1px solid #fed7d7' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editProduct ? 'Edit Product' : 'Add Product'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid form-grid-2">
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Product Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required id="product-name" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Code / SKU (barcode)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                      id="product-code"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowScanner(true)}
                      id="scan-code-btn"
                      style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="11" x2="7" y2="13"/><line x1="10" y1="11" x2="10" y2="16"/><line x1="13" y1="11" x2="13" y2="14"/><line x1="16" y1="11" x2="16" y2="15"/><line x1="19" y1="11" x2="19" y2="12"/></svg>
                      Scan Barcode
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} id="product-category" />
                </div>
                <div>
                  <label className="form-label">Price (₹) *</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required id="product-price" />
                </div>
                <div>
                  <label className="form-label">Unit</label>
                  <select className="form-input form-select" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} id="product-unit">
                    {['Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Pkt', 'Bag', 'Dz'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Stock Qty</label>
                  <input className="form-input" type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} id="product-stock" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="save-product-btn">
                  {saving ? <span className="spinner" /> : (editProduct ? 'Update' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={code => {
          setForm(f => ({ ...f, code }));
          setShowScanner(false);
          showToast(code ? `Barcode: ${code}` : 'Barcode scanned');
        }}
      />
    </div>
  );
}
