const { randomUUID } = require('crypto');
const config = require('../config/env');
const repository = require('../repositories/bill.repository');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function round2(n) {
  return parseFloat(n.toFixed(2));
}

async function fetchAccount(tenantId) {
  try {
    const res = await fetch(`${config.ACCOUNT_SERVICE_URL}/internal/accounts/${tenantId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.account || null;
  } catch (err) {
    console.error('[bill-service] account-service call failed:', err.message);
    return null;
  }
}

async function listBills(tenantId, page = 1, pageSize = 100) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 100, 1), 500);
  const offset = (p - 1) * size;

  const [total, bills] = await Promise.all([
    repository.countBillsByTenant(tenantId),
    repository.findBillsByTenant(tenantId, size, offset),
  ]);
  if (bills.length === 0) {
    return { bills: [], pagination: { page: p, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)) } };
  }

  const items = await repository.findItemsByBillIds(bills.map((b) => b.id));

  const itemsByBill = {};
  for (const it of items) {
    if (!itemsByBill[it.bill_id]) itemsByBill[it.bill_id] = [];
    itemsByBill[it.bill_id].push(repository.rowToItem(it));
  }

  return {
    bills: bills.map((b) => repository.rowToBill(b, itemsByBill[b.id] || [])),
    pagination: { page: p, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)) },
  };
}

async function generateBillNumber(tenantId) {
  const now = new Date();
  const dayStart = now.toISOString().slice(0, 10);
  const from = new Date(`${dayStart}T00:00:00.000Z`);
  const to = new Date(from.getTime() + 86400000);

  const count = await repository.countBillsForDay(tenantId, from, to);
  const seq = count + 1;
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `${dateStr}-${String(seq).padStart(3, '0')}`;
}

async function getBill(id, tenantId) {
  const bill = await repository.findBillById(id, tenantId);
  if (!bill) throw httpError(404, 'Not found');

  const items = await repository.findItemsByBillId(bill.id);
  return repository.rowToBill(bill, items.map(repository.rowToItem));
}

async function createBill(tenantId, body) {
  const account = await fetchAccount(tenantId);

  const items = Array.isArray(body.items) ? body.items : [];
  const subtotal = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const gstApplicable = !!(account && account.gstApplicable);
  const gstPct = gstApplicable ? Number(account.gstPercentage || 5) : 0;
  const gstAmount = gstApplicable ? round2((subtotal * gstPct) / 100) : 0;
  const total = round2(subtotal + gstAmount);

  const bill = {
    id: randomUUID(),
    tenantId,
    billNumber: await generateBillNumber(tenantId),
    date: new Date(),
    items,
    subtotal,
    gstPercentage: gstPct,
    gstAmount,
    total,
    paymentType: body.paymentType || 'Cash',
    notes: body.notes || '',
    customerName: body.customerName || '',
  };

  const itemRows = items.map((item) => ({
    id: randomUUID(),
    billId: bill.id,
    productId: item.productId || null,
    name: item.name || '',
    qty: Number(item.qty) || 0,
    price: Number(item.price) || 0,
    total: Number(item.total) || 0,
  }));

  await repository.createBillWithItems(bill, itemRows);

  return {
    ...bill,
    date: bill.date.toISOString(),
    tenantId: bill.tenantId,
  };
}

async function deleteBill(id, tenantId) {
  const deleted = await repository.deleteBill(id, tenantId);
  if (!deleted) throw httpError(404, 'Not found');
}

async function deleteTenantData(tenantId) {
  await repository.deleteByTenantId(tenantId);
}

function parseDayStart(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function nextDay(date) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + 1);
  return d;
}

async function getReport(tenantId, from, to, page = 1, pageSize = 100) {
  const fromBoundary = parseDayStart(from);
  const toBoundary = parseDayStart(to);
  const toExclusive = toBoundary ? nextDay(toBoundary) : null;
  const p = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.min(Math.max(parseInt(pageSize, 10) || 100, 1), 500);
  const offset = (p - 1) * size;

  const [summaryRow, bills, total] = await Promise.all([
    repository.getReportSummary(tenantId, fromBoundary, toExclusive),
    repository.findReportTransactions(tenantId, fromBoundary, toExclusive, size, offset),
    repository.countReportTransactions(tenantId, fromBoundary, toExclusive),
  ]);

  const counts = new Map(
    (await repository.findItemCountsByBillIds(bills.map((b) => b.id))).map((r) => [r.bill_id, Number(r.item_count)])
  );

  const transactions = bills.map((b) => ({
    id: b.id,
    billNumber: b.bill_number,
    date: new Date(b.date).toISOString(),
    payment: b.payment_type,
    amount: Number(b.total),
    items: counts.get(b.id) || 0,
    customerName: b.customer_name || '',
  }));

  return {
    summary: {
      totalSales: Number(summaryRow.total_sales),
      cashTotal: Number(summaryRow.cash_total),
      upiTotal: Number(summaryRow.upi_total),
      cardTotal: Number(summaryRow.card_total),
      creditTotal: Number(summaryRow.credit_total),
      billCount: Number(summaryRow.bill_count),
    },
    transactions,
    pagination: {
      page: p,
      pageSize: size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    },
  };
}

module.exports = {
  listBills,
  getBill,
  createBill,
  deleteBill,
  deleteTenantData,
  getReport,
};