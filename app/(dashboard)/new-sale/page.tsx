'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BarcodeScanner from '@/components/BarcodeScanner';
import { apiFetch } from '@/lib/apiClient';

interface Product { id: string; name: string; code: string; price: number; unit: string; }
interface CartItem { productId: string; name: string; qty: number; price: number; total: number; }
interface AccountSettings { gstApplicable: boolean; gstPercentage: number; }

const PAYMENT_TYPES = ['Cash', 'UPI', 'Card', 'Credit'];

export default function NewSalePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [paymentType, setPaymentType] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeMsg, setBarcodeMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiFetch('/api/products');
      const d = await res.json().catch(() => ({}));
      return (d.products || []) as Product[];
    },
  });

  const { data: accountSettings } = useQuery({
    queryKey: ['account'],
    queryFn: async () => {
      const res = await apiFetch('/api/account');
      const d = await res.json().catch(() => ({}));
      return (d.account || null) as AccountSettings | null;
    },
  });

  const gstApplicable = accountSettings?.gstApplicable ?? false;
  const gstPct = accountSettings?.gstPercentage ?? 5;

  const createBillMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await apiFetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create bill');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      sessionStorage.setItem('current_bill', JSON.stringify(data.bill));
      router.push('/bill-preview');
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = products.filter(p =>
    search.length > 0 &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
  );

  function addToCart(product: Product) {
    setCart(c => {
      const existing = c.find(i => i.productId === product.id);
      if (existing) {
        return c.map(i => i.productId === product.id
          ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price }
          : i
        );
      }
      return [...c, { productId: product.id, name: product.name, qty: 1, price: product.price, total: product.price }];
    });
    setSearch('');
    setShowDropdown(false);
  }

  async function lookupBarcode(raw: string) {
    const code = raw.trim();
    if (!code) return;
    try {
      const res = await fetch(`/api/products/by-code?code=${encodeURIComponent(code)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.product) {
        addToCart(data.product);
        setBarcode('');
        setBarcodeMsg({ text: `Added ${data.product.name}`, ok: true });
      } else {
        setBarcodeMsg({ text: data.error || 'Product not found', ok: false });
      }
    } catch {
      setBarcodeMsg({ text: 'Product not found', ok: false });
    }
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) {
      setCart(c => c.filter(i => i.productId !== productId));
      return;
    }
    setCart(c => c.map(i => i.productId === productId ? { ...i, qty, total: qty * i.price } : i));
  }

  function removeItem(productId: string) {
    setCart(c => c.filter(i => i.productId !== productId));
  }

  function clearCart() { setCart([]); setNotes(''); setCustomerName(''); setPaymentType('Cash'); }

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const gstAmount = gstApplicable ? parseFloat(((subtotal * gstPct) / 100).toFixed(2)) : 0;
  const total = subtotal + gstAmount;

  const saving = createBillMutation.isPending;

  function handleSave() {
    if (cart.length === 0) return;
    createBillMutation.mutate({ items: cart, paymentType, notes, customerName });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>New Sale</h1>
        <button className="btn btn-ghost" onClick={clearCart} id="clear-sale-btn">Clear</button>
      </div>

      <div className="sale-layout">
        {/* Left: Item selection */}
        <div>
          <div className="card">
            <div className="card-body">
              {/* Barcode */}
              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Barcode</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    id="barcode-input"
                    placeholder="Scan or type barcode, press Enter"
                    value={barcode}
                    onChange={e => { setBarcode(e.target.value); if (barcodeMsg) setBarcodeMsg(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupBarcode(barcode); } }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn"
                    id="scan-barcode-btn"
                    onClick={() => setShowScanner(true)}
                    style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="11" x2="7" y2="13"/><line x1="10" y1="11" x2="10" y2="16"/><line x1="13" y1="11" x2="13" y2="14"/><line x1="16" y1="11" x2="16" y2="15"/><line x1="19" y1="11" x2="19" y2="12"/></svg>
                    Scan
                  </button>
                </div>
                {barcodeMsg && (
                  <div style={{ fontSize: '0.82rem', marginTop: 6, color: barcodeMsg.ok ? '#2e7d32' : 'var(--danger)' }} id="barcode-feedback">
                    {barcodeMsg.text}
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="search-bar" ref={searchRef} style={{ position: 'relative', marginBottom: 20 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search item (name / code)"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  id="item-search"
                />
                {showDropdown && filtered.length > 0 && (
                  <div className="search-dropdown">
                    {filtered.map(p => (
                      <div key={p.id} className="search-option" onClick={() => addToCart(p)}>
                        <div>
                          <div className="opt-name">{p.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.code} • {p.unit}</div>
                        </div>
                        <span className="opt-price">₹{p.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 20px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                  <h3>Cart is empty</h3>
                  <p>Search and add items above</p>
                </div>
              ) : (
                <>
                  <div className="sale-item-row sale-item-header">
                    <span>Item</span><span style={{ textAlign: 'center' }}>Qty</span>
                    <span style={{ textAlign: 'right' }}>Price</span>
                    <span style={{ textAlign: 'right' }}>Total</span>
                    <span />
                  </div>
                  {cart.map(item => (
                    <div key={item.productId} className="sale-item-row">
                      <span className="sale-item-name">{item.name}</span>
                      <input
                        className="qty-input"
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => updateQty(item.productId, Number(e.target.value))}
                        id={`qty-${item.productId}`}
                      />
                      <span style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>₹{item.price}</span>
                      <span className="sale-item-total" style={{ textAlign: 'right' }}>₹{item.total.toFixed(2)}</span>
                      <button className="delete-btn" onClick={() => removeItem(item.productId)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  ))}
                </>
              )}

              {/* Add item from all products */}
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {products.slice(0, 8).map(p => (
                  <button key={p.id} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => addToCart(p)}>
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customer name */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <label className="form-label">Customer Name (Optional)</label>
              <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" id="customer-name" />
            </div>
          </div>
        </div>

        {/* Right: Summary & Payment */}
        <div>
          <div className="card">
            <div className="card-header"><span className="card-title">Bill Summary</span></div>
            <div className="card-body">
              <div className="sale-summary">
                <div className="summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                {gstApplicable && <div className="summary-row"><span>GST ({gstPct}%)</span><span>₹{gstAmount.toFixed(2)}</span></div>}
                <div className="summary-row total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="form-label">Payment Type</label>
                <div className="payment-tabs">
                  {PAYMENT_TYPES.map(pt => (
                    <button
                      key={pt}
                      className={`payment-tab ${paymentType === pt ? 'selected' : ''}`}
                      onClick={() => setPaymentType(pt)}
                      id={`pay-${pt.toLowerCase()}`}
                      type="button"
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-input form-textarea"
                  style={{ minHeight: 70 }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any note..."
                  id="sale-notes"
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 16, fontSize: '1rem', padding: '14px' }}
                onClick={handleSave}
                disabled={saving || cart.length === 0}
                id="generate-bill-btn"
              >
                {saving ? <span className="spinner" /> : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Generate Bill
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={code => {
          setShowScanner(false);
          lookupBarcode(code);
        }}
      />
    </div>
  );
}
