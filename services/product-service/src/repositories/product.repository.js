const pool = require('../db');

function rowToProduct(r) {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    code: r.code || '',
    price: Number(r.price),
    unit: r.unit || 'Pcs',
    category: r.category || 'General',
    stock: Number(r.stock),
  };
}

async function findProductsByTenant(tenantId) {
  const [rows] = await pool.execute(
    'SELECT * FROM products WHERE tenant_id = ? ORDER BY created_at ASC, name ASC',
    [tenantId]
  );
  return rows;
}

async function createProduct(product) {
  await pool.execute(
    'INSERT INTO products (id, tenant_id, name, code, price, unit, category, stock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      product.id, product.tenantId, product.name, product.code,
      product.price, product.unit, product.category, product.stock,
      new Date(),
    ]
  );
}

async function findProductByIdAndTenant(id, tenantId) {
  const [rows] = await pool.execute(
    'SELECT * FROM products WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rows[0] || null;
}

async function findProductByCodeAndTenant(tenantId, code) {
  const [rows] = await pool.execute(
    'SELECT * FROM products WHERE tenant_id = ? AND code = ? LIMIT 1',
    [tenantId, code]
  );
  return rows[0] || null;
}

async function updateProduct(id, tenantId, updated) {
  await pool.execute(
    'UPDATE products SET name = ?, code = ?, price = ?, unit = ?, category = ?, stock = ? WHERE id = ? AND tenant_id = ?',
    [updated.name, updated.code, updated.price, updated.unit, updated.category, updated.stock, id, tenantId]
  );
}

async function deleteProduct(id, tenantId) {
  const [result] = await pool.execute(
    'DELETE FROM products WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return result.affectedRows > 0;
}

async function deleteByTenantId(tenantId) {
  await pool.execute(
    'DELETE FROM products WHERE tenant_id = ?',
    [tenantId]
  );
}

module.exports = {
  findProductsByTenant,
  createProduct,
  findProductByIdAndTenant,
  findProductByCodeAndTenant,
  updateProduct,
  deleteProduct,
  deleteByTenantId,
  rowToProduct,
};