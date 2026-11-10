const pool = require('../db');

function rowToItem(r) {
  return {
    productId: r.product_id,
    name: r.name,
    qty: Number(r.qty),
    price: Number(r.price),
    total: Number(r.total),
  };
}

function rowToBill(r, items = []) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    billNumber: r.bill_number,
    date: new Date(r.date).toISOString(),
    items,
    subtotal: Number(r.subtotal),
    gstPercentage: Number(r.gst_percentage),
    gstAmount: Number(r.gst_amount),
    total: Number(r.total),
    paymentType: r.payment_type,
    notes: r.notes || '',
    customerName: r.customer_name || '',
  };
}

async function findBillsByTenant(tenantId, limit, offset) {
  const [rows] = await pool.execute(
    'SELECT * FROM bills WHERE tenant_id = ? ORDER BY date DESC LIMIT ? OFFSET ?',
    [tenantId, limit, offset]
  );
  return rows;
}

async function countBillsByTenant(tenantId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS c FROM bills WHERE tenant_id = ?',
    [tenantId]
  );
  return Number(rows[0].c);
}

async function findItemsByBillIds(ids) {
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT * FROM bill_items WHERE bill_id IN (${placeholders})`,
    ids
  );
  return rows;
}

async function findBillById(id, tenantId) {
  const [rows] = await pool.execute(
    'SELECT * FROM bills WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rows[0] || null;
}

async function findItemsByBillId(billId) {
  const [rows] = await pool.execute(
    'SELECT * FROM bill_items WHERE bill_id = ?',
    [billId]
  );
  return rows;
}

async function countBillsForDay(tenantId, from, to) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS c FROM bills WHERE tenant_id = ? AND date >= ? AND date < ?',
    [tenantId, from, to]
  );
  return Number(rows[0].c);
}

function buildReportWhere(tenantId, from, to) {
  const clauses = ['tenant_id = ?'];
  const params = [tenantId];
  if (from) {
    clauses.push('date >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('date < ?');
    params.push(to);
  }
  return { clause: clauses.join(' AND '), params };
}

async function getReportSummary(tenantId, from, to) {
  const { clause, params } = buildReportWhere(tenantId, from, to);
  const [rows] = await pool.execute(
    `SELECT
       COUNT(*) AS bill_count,
       COALESCE(SUM(total), 0) AS total_sales,
       COALESCE(SUM(CASE WHEN payment_type = 'Cash' THEN total ELSE 0 END), 0) AS cash_total,
       COALESCE(SUM(CASE WHEN payment_type = 'UPI' THEN total ELSE 0 END), 0) AS upi_total,
       COALESCE(SUM(CASE WHEN payment_type = 'Card' THEN total ELSE 0 END), 0) AS card_total,
       COALESCE(SUM(CASE WHEN payment_type = 'Credit' THEN total ELSE 0 END), 0) AS credit_total
     FROM bills
     WHERE ${clause}`,
    params
  );
  return rows[0];
}

async function findReportTransactions(tenantId, from, to, limit, offset) {
  const { clause, params } = buildReportWhere(tenantId, from, to);
  params.push(limit, offset);
  const [rows] = await pool.execute(
    `SELECT id, tenant_id, bill_number, date, payment_type, total, customer_name
     FROM bills
     WHERE ${clause}
     ORDER BY date DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

async function countReportTransactions(tenantId, from, to) {
  const { clause, params } = buildReportWhere(tenantId, from, to);
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS c FROM bills WHERE ${clause}`,
    params
  );
  return Number(rows[0].c);
}

async function findItemCountsByBillIds(ids) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT bill_id, COUNT(*) AS item_count
     FROM bill_items
     WHERE bill_id IN (${placeholders})
     GROUP BY bill_id`,
    ids
  );
  return rows;
}

async function deleteBill(id, tenantId) {
  const [result] = await pool.execute(
    'DELETE FROM bills WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return result.affectedRows > 0;
}

async function deleteByTenantId(tenantId) {
  await pool.execute(
    'DELETE FROM bills WHERE tenant_id = ?',
    [tenantId]
  );
}

async function createBillWithItems(bill, items) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO bills (
         id, tenant_id, bill_number, date, subtotal,
         gst_percentage, gst_amount, total, payment_type, notes, customer_name
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill.id, bill.tenantId, bill.billNumber, bill.date,
        bill.subtotal, bill.gstPercentage, bill.gstAmount, bill.total,
        bill.paymentType, bill.notes, bill.customerName,
      ]
    );
    for (const item of items) {
      await conn.execute(
        `INSERT INTO bill_items (id, bill_id, product_id, name, qty, price, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id, item.billId,
          item.productId, item.name,
          item.qty, item.price, item.total,
        ]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  findBillsByTenant,
  countBillsByTenant,
  findItemsByBillIds,
  findBillById,
  findItemsByBillId,
  countBillsForDay,
  getReportSummary,
  findReportTransactions,
  countReportTransactions,
  findItemCountsByBillIds,
  deleteBill,
  deleteByTenantId,
  createBillWithItems,
  rowToItem,
  rowToBill,
};