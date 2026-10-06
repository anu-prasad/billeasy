-- ============================================
-- Database: billeasy_products
-- Creates DB, products table, demo data
-- ============================================
CREATE DATABASE IF NOT EXISTS billeasy_products CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE billeasy_products;

CREATE TABLE IF NOT EXISTS products (
  id         VARCHAR(64)   NOT NULL,
  tenant_id  VARCHAR(64)   NOT NULL,
  name       VARCHAR(255)  NOT NULL,
  code       VARCHAR(100),
  price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit       VARCHAR(50)   NOT NULL DEFAULT 'Pcs',
  category   VARCHAR(100)  NOT NULL DEFAULT 'General',
  stock      INT           NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_tenant (tenant_id),
  KEY idx_products_tenant_code (tenant_id, code)
) ENGINE=InnoDB;

INSERT INTO products (id, tenant_id, name, code, price, unit, category, stock) VALUES
('prod-001', 'tenant-demo-001', 'Rice (Per Kg)',       'RICE001', 60,  'Kg',  'Grocery', 500),
('prod-002', 'tenant-demo-001', 'Sugar (Per Kg)',      'SUG001',  40,  'Kg',  'Grocery', 200),
('prod-003', 'tenant-demo-001', 'Cooking Oil (1 Ltr)', 'OIL001',  150, 'Ltr', 'Grocery', 100),
('prod-004', 'tenant-demo-001', 'Milk (500ml)',        'MILK001', 28,  'Pkt', 'Dairy',   150),
('prod-005', 'tenant-demo-001', 'Bread (400g)',        'BRD001',  45,  'Pkt', 'Bakery',  80);