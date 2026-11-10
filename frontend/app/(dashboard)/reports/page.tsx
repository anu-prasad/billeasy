'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

interface Summary { totalSales: number; cashTotal: number; upiTotal: number; cardTotal: number; creditTotal: number; billCount: number; }
interface Transaction { id: string; billNumber: string; date: string; payment: string; amount: number; items: number; customerName: string; }

const PAYMENT_COLORS: Record<string, string> = {
  Cash: 'badge-green', UPI: 'badge-blue', Card: 'badge-purple', Credit: 'badge-orange'
};

function fmt(n: number) { return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; }

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<'date' | 'payment'>('date');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [range, setRange] = useState({ from: today, to: today });

  const { data, isFetching: loading } = useQuery({
    queryKey: ['reports', range],
    queryFn: async () => {
      const res = await apiFetch(`/api/reports?from=${range.from}&to=${range.to}`);
      const d = await res.json().catch(() => ({}));
      return {
        summary: (d.summary || null) as Summary | null,
        transactions: (d.transactions || []) as Transaction[],
      };
    },
  });

  const summary = data?.summary ?? null;
  const transactions = data?.transactions ?? [];
  const generated = !!data;

  function generateReport() {
    setRange({ from, to });
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Reports</h1>

      {/* Tabs */}
      <div className="report-tabs">
        <button className={`report-tab ${tab === 'date' ? 'active' : ''}`} onClick={() => setTab('date')} id="tab-date-wise">Date Wise</button>
        <button className={`report-tab ${tab === 'payment' ? 'active' : ''}`} onClick={() => setTab('payment')} id="tab-payment-wise">Payment Wise</button>
      </div>

      {/* Date Filter */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="date-filter-row">
            <div>
              <label className="form-label">From Date</label>
              <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} id="from-date" />
            </div>
            <div>
              <label className="form-label">To Date</label>
              <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} id="to-date" />
            </div>
            <button className="btn btn-primary" onClick={generateReport} disabled={loading} id="generate-report-btn">
              {loading ? <span className="spinner" /> : 'Generate Report'}
            </button>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Today', fn: () => { const t = new Date().toISOString().slice(0,10); setFrom(t); setTo(t); } },
              { label: 'Yesterday', fn: () => { const d = new Date(); d.setDate(d.getDate()-1); const s = d.toISOString().slice(0,10); setFrom(s); setTo(s); } },
              { label: 'This Week', fn: () => { const d = new Date(); const day = d.getDay(); const mon = new Date(d); mon.setDate(d.getDate() - day + 1); setFrom(mon.toISOString().slice(0,10)); setTo(new Date().toISOString().slice(0,10)); } },
              { label: 'This Month', fn: () => { const d = new Date(); setFrom(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`); setTo(d.toISOString().slice(0,10)); } },
            ].map(q => (
              <button key={q.label} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '5px 12px' }} onClick={() => { q.fn(); }} id={`quick-${q.label.toLowerCase().replace(' ','-')}`}>
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {generated && summary && (
        <>
          {/* Summary Cards */}
          <div className="report-summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 20 }}>
            <div className="report-stat rs-green">
              <div className="rs-label">Total Sales</div>
              <div className="rs-value">{fmt(summary.totalSales)}</div>
              <div style={{ fontSize: '0.8rem', marginTop: 2 }}>{summary.billCount} bills</div>
            </div>
            <div className="report-stat rs-blue">
              <div className="rs-label">Cash</div>
              <div className="rs-value">{fmt(summary.cashTotal)}</div>
            </div>
            <div className="report-stat rs-purple">
              <div className="rs-label">UPI</div>
              <div className="rs-value">{fmt(summary.upiTotal)}</div>
            </div>
            <div className="report-stat rs-orange">
              <div className="rs-label">Card</div>
              <div className="rs-value">{fmt(summary.cardTotal)}</div>
            </div>
          </div>

          {/* Transactions */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Transactions ({transactions.length})</span>
              {summary.creditTotal > 0 && (
                <span style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 600 }}>
                  Credit: {fmt(summary.creditTotal)}
                </span>
              )}
            </div>
            {transactions.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <h3>No transactions</h3>
                <p>No bills found for the selected date range</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Bill No</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Payment</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {new Date(t.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                        <td><span className="badge badge-gray">{t.billNumber}</span></td>
                        <td>{t.customerName || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{t.items} items</td>
                        <td><span className={`badge ${PAYMENT_COLORS[t.payment] || 'badge-gray'}`}>{t.payment}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{fmt(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
