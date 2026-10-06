'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

interface BillItem { productId: string; name: string; qty: number; price: number; total: number; }
interface Bill {
  id: string; billNumber: string; date: string;
  items: BillItem[]; subtotal: number; gstPercentage: number;
  gstAmount: number; total: number; paymentType: string;
  notes: string; customerName: string;
}
interface Account { shopName: string; shopAddress: string; phone: string; gstNumber: string; upiId: string; defaultMessage: string; logoUrl: string; }

export default function BillPreviewPage() {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [bill] = useState<Bill | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem('current_bill');
    return stored ? JSON.parse(stored) as Bill : null;
  });

  const { data: account, isPending: loading } = useQuery({
    queryKey: ['account'],
    queryFn: async () => {
      const res = await apiFetch('/api/account');
      const d = await res.json().catch(() => ({}));
      return (d.account || null) as Account | null;
    },
  });

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=600,height=800');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head><title>Bill - ${bill?.billNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
        .bill-shop-name { font-size: 1.2rem; font-weight: 800; text-align: center; }
        .bill-shop-info { text-align: center; font-size: 0.82rem; color: #666; line-height: 1.5; }
        hr { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 0.78rem; text-align: left; padding: 6px 0; border-bottom: 1px solid #000; }
        td { font-size: 0.85rem; padding: 5px 0; }
        .total-row { display: flex; justify-content: space-between; font-size: 0.85rem; margin: 3px 0; }
        .final { font-weight: 800; font-size: 1rem; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
        .bill-meta { display: flex; justify-content: space-between; font-size: 0.82rem; color: #666; }
        .footer { text-align: center; font-size: 0.82rem; color: #666; margin-top: 12px; font-style: italic; }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  async function handlePDF() {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, w, h);
    pdf.save(`Bill-${bill?.billNumber || 'receipt'}.pdf`);
  }

  function handleShare() {
    if (!bill || !account) return;
    const text = `*${account.shopName}*\n${account.shopAddress}\nTel: ${account.phone}\n\n*Bill No:* ${bill.billNumber}\n*Date:* ${new Date(bill.date).toLocaleString('en-IN')}\n\n${bill.items.map(i => `${i.name} x${i.qty} = ₹${i.total}`).join('\n')}\n\n*Subtotal:* ₹${bill.subtotal}\n${bill.gstAmount > 0 ? `*GST(${bill.gstPercentage}%):* ₹${bill.gstAmount}\n` : ''}*Total:* ₹${bill.total}\n*Payment:* ${bill.paymentType}\n\n${account.defaultMessage}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  if (loading || !bill) return <div className="page-loading"><div className="spinner spinner-dark" /><span>Loading bill...</span></div>;

  const billDate = new Date(bill.date);
  const dateStr = billDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Bill Preview</h1>
        <button className="btn btn-ghost" onClick={() => router.push('/new-sale')}>← New Bill</button>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Printable Bill */}
        <div className="bill-paper" ref={printRef}>
          {account?.logoUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={account.logoUrl} alt="Logo" style={{ height: 60, objectFit: 'contain' }} />
            </div>
          )}
          <div className="bill-shop-name">{account?.shopName}</div>
          <div className="bill-shop-info">
            {account?.shopAddress}<br />
            {account?.phone && <>Ph: {account.phone}<br /></>}
            {account?.gstNumber && <>GST No: {account.gstNumber}</>}
          </div>

          <hr className="bill-divider" />

          <div className="bill-meta">
            <span>Bill No: {bill.billNumber}</span>
            <span>Date: {dateStr} {timeStr}</span>
          </div>
          {bill.customerName && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              Customer: {bill.customerName}
            </div>
          )}

          <hr className="bill-divider" />

          <table className="bill-table">
            <thead>
              <tr>
                <th>#</th><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr key={item.productId}>
                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td>{item.name}</td>
                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ textAlign: 'right' }}>{item.price}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="bill-divider" />

          <div className="bill-totals">
            <div className="bill-total-row"><span>Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span></div>
            {bill.gstAmount > 0 && <div className="bill-total-row"><span>GST ({bill.gstPercentage}%)</span><span>₹{bill.gstAmount.toFixed(2)}</span></div>}
            <div className="bill-total-row final"><span>Total</span><span>₹{bill.total.toFixed(2)}</span></div>
          </div>

          <hr className="bill-divider" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Payment Mode</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{bill.paymentType}</div>
            </div>
            {account?.upiId && (
              <div className="qr-wrap">
                <div style={{ width: 64, height: 64, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', padding: 4 }}>
                  <div>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                    </svg>
                    <div>Scan & Pay</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {bill.notes && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {bill.notes}
            </div>
          )}

          <hr className="bill-divider" />
          <div className="bill-footer">{account?.defaultMessage}</div>
        </div>

        {/* Action Buttons */}
        <div className="bill-actions no-print" style={{ marginTop: 16 }}>
          <button className="bill-action-btn bab-print" onClick={handlePrint} id="print-bill-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
          <button className="bill-action-btn bab-pdf" onClick={handlePDF} id="download-pdf-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 18 15 15"/>
            </svg>
            PDF
          </button>
          <button className="bill-action-btn bab-whatsapp" onClick={handleShare} id="share-whatsapp-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
