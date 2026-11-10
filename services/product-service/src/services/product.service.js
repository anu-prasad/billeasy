const { randomUUID } = require('crypto');
const repository = require('../repositories/product.repository');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function listProducts(tenantId) {
  const rows = await repository.findProductsByTenant(tenantId);
  return rows.map(repository.rowToProduct);
}

async function createProduct(tenantId, body) {
  const product = {
    id: randomUUID(),
    tenantId,
    name: body.name,
    code: body.code || '',
    price: Number(body.price) || 0,
    unit: body.unit || 'Pcs',
    category: body.category || 'General',
    stock: Number(body.stock) || 0,
  };

  await repository.createProduct(product);
  return product;
}

async function findProductByCode(tenantId, code) {
  if (!code) throw httpError(400, 'code required');
  const row = await repository.findProductByCodeAndTenant(tenantId, code);
  if (!row) throw httpError(404, 'Product not found');
  return repository.rowToProduct(row);
}

async function updateProduct(id, tenantId, body) {
  const current = await repository.findProductByIdAndTenant(id, tenantId);
  if (!current) throw httpError(404, 'Not found');

  const updated = {
    name: body.name ?? current.name,
    code: body.code ?? current.code,
    price: body.price !== undefined ? Number(body.price) : Number(current.price),
    unit: body.unit ?? current.unit,
    category: body.category ?? current.category,
    stock: body.stock !== undefined ? Number(body.stock) : Number(current.stock),
  };

  await repository.updateProduct(id, tenantId, updated);

  return repository.rowToProduct({ ...current, ...updated, id, tenant_id: tenantId });
}

async function deleteProduct(id, tenantId) {
  const deleted = await repository.deleteProduct(id, tenantId);
  if (!deleted) throw httpError(404, 'Not found');
}

async function deleteTenantData(tenantId) {
  await repository.deleteByTenantId(tenantId);
}

module.exports = {
  listProducts,
  createProduct,
  findProductByCode,
  updateProduct,
  deleteProduct,
  deleteTenantData,
};