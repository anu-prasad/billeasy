const productService = require('../services/product.service');

async function listProducts(req, res, next) {
  try {
    const products = await productService.listProducts(req.user.tenantId);
    return res.json({ products });
  } catch (err) {
    return next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.user.tenantId, req.body || {});
    return res.status(201).json({ product });
  } catch (err) {
    return next(err);
  }
}

async function getProductByCode(req, res, next) {
  try {
    const product = await productService.findProductByCode(req.user.tenantId, req.query.code || '');
    return res.json({ product });
  } catch (err) {
    return next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(req.params.id, req.user.tenantId, req.body || {});
    return res.json({ product });
  } catch (err) {
    return next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id, req.user.tenantId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

async function deleteTenant(req, res, next) {
  try {
    await productService.deleteTenantData(req.params.tenantId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listProducts,
  createProduct,
  getProductByCode,
  updateProduct,
  deleteProduct,
  deleteTenant,
};