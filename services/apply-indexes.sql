-- ============================================================
-- BillEasy — Database index optimization (run ONCE)
--
-- Applies the new indexes to an EXISTING development database.
-- Fresh installs already get these from the per-service db.sql files.
--
-- Requirements / notes:
--   * MySQL 8.0.13+ is required for the users email LOWER() index.
--     If you use MariaDB, skip only that last CREATE INDEX.
--   * Run once: running twice will fail with "Duplicate key name".
--   * No tables are recreated and no data is removed.
--
-- Verify existing indexes first (none of the names below should exist):
--   SHOW INDEX FROM billeasy_products.products;
--   SHOW INDEX FROM billeasy_bills.bills;
--   SHOW INDEX FROM billeasy_auth.users;
-- ============================================================

USE billeasy_products;

ALTER TABLE products
  ADD INDEX idx_products_tenant_code (tenant_id, code);

USE billeasy_bills;

ALTER TABLE bills
  ADD INDEX idx_bills_tenant_date (tenant_id, date);

USE billeasy_auth;

ALTER TABLE users
  ADD INDEX idx_users_tenant (tenant_id);

-- Optional — MySQL 8.0.13+ only (skip on MariaDB):
ALTER TABLE users
  ADD INDEX idx_users_email_lower ((LOWER(email)));

-- ============================================================
-- Verification:
--   SHOW INDEX FROM billeasy_products.products;
--   SHOW INDEX FROM billeasy_bills.bills;
--   SHOW INDEX FROM billeasy_auth.users;
--
--   EXPLAIN SELECT * FROM products
--          WHERE tenant_id = 'tenant-demo-001' AND code = 'RICE001';
--   EXPLAIN SELECT * FROM bills
--          WHERE tenant_id = 'tenant-demo-001'
--            AND date >= '2026-09-16 00:00:00' AND date < '2026-09-18 00:00:00';
--   EXPLAIN SELECT * FROM users
--          WHERE tenant_id = 'tenant-demo-001';
--   EXPLAIN SELECT * FROM users
--          WHERE LOWER(email) = LOWER('demo@billeasy.com');
-- ============================================================