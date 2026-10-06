-- ============================================
-- Database: billeasy_bills
-- Creates DB, bills & bill_items tables, demo data
-- ============================================
CREATE DATABASE IF NOT EXISTS billeasy_bills CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE billeasy_bills;

CREATE TABLE IF NOT EXISTS bills (
  id             VARCHAR(64)  NOT NULL,
  tenant_id      VARCHAR(64)  NOT NULL,
  bill_number    VARCHAR(50)  NOT NULL,
  date           TIMESTAMP    NULL,
  subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_percentage DECIMAL(5,2)  NOT NULL DEFAULT 0,
  gst_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  total          DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_type   ENUM('Cash','UPI','Card','Credit') NOT NULL DEFAULT 'Cash',
  notes          TEXT,
  customer_name  VARCHAR(255),
  created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bills_tenant (tenant_id),
  KEY idx_bills_tenant_date (tenant_id, date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bill_items (
  id          VARCHAR(64)   NOT NULL,
  bill_id     VARCHAR(64)   NOT NULL,
  product_id  VARCHAR(64),
  name        VARCHAR(255)  NOT NULL,
  qty         INT           NOT NULL DEFAULT 1,
  price       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_items_bill (bill_id),
  CONSTRAINT fk_items_bill FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO bills (id, tenant_id, bill_number, date, subtotal, gst_percentage, gst_amount, total, payment_type, notes, customer_name) VALUES
('bill-demo-001', 'tenant-demo-001', '20260917-001', '2026-09-17 08:34:43', 60, 5, 3, 63, 'Cash',  '', ''),
('bill-demo-002', 'tenant-demo-001', '20260917-002', '2026-09-17 08:46:14', 60, 5, 3, 63, 'UPI',   '', 'Ravi'),
('bill-demo-003', 'tenant-demo-001', '20260917-003', '2026-09-17 08:47:36', 300, 5, 15, 315, 'UPI', '', 'Ravi');

INSERT INTO bill_items (id, bill_id, product_id, name, qty, price, total) VALUES
('bi-001', 'bill-demo-001', 'prod-001', 'Rice (Per Kg)',    1,  60, 60),
('bi-002', 'bill-demo-002', 'prod-001', 'Rice (Per Kg)',    1,  60, 60),
('bi-003', 'bill-demo-003', 'prod-001', 'Rice (Per Kg)',    5,  60, 300);