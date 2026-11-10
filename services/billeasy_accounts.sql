-- ============================================
-- Database: billeasy_accounts
-- Creates DB, accounts table, demo data
-- ============================================
CREATE DATABASE IF NOT EXISTS billeasy_accounts CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE billeasy_accounts;

CREATE TABLE IF NOT EXISTS accounts (
  tenant_id        VARCHAR(64)  NOT NULL,
  owner_name       VARCHAR(255) NOT NULL,
  shop_name        VARCHAR(255) NOT NULL,
  shop_address     TEXT,
  phone            VARCHAR(50),
  gst_applicable   TINYINT(1)   NOT NULL DEFAULT 0,
  gst_percentage   DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  gst_number       VARCHAR(50),
  upi_id           VARCHAR(255),
  default_message  TEXT,
  license_validity DATE,
  logo_url         TEXT,
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT 'pending | active | expired | suspended | deleted',
  plan             VARCHAR(20)  NOT NULL DEFAULT 'yearly',
  plan_started_at  DATE,
  suspended_at     DATETIME,
  deleted_at       DATETIME,
  PRIMARY KEY (tenant_id)
) ENGINE=InnoDB;

INSERT INTO accounts (
  tenant_id, owner_name, shop_name, shop_address, phone,
  gst_applicable, gst_percentage, gst_number, upi_id,
  default_message, license_validity, logo_url,
  status, plan, plan_started_at
) VALUES (
  'tenant-demo-001', 'Abhinav T', 'Fresh Mart',
  'Main Road, Malappuram\nKerala - 676505',
  '98766 43210', 1, 5.00, '32ABCDE1234F1Z5', 'shop@okaxis',
  'Thank you for shopping with us! This is your purchase bill. Visit again',
  '2026-12-31', '', 'active', 'yearly', '2026-01-01'
);

-- Audit history for admin plan actions (activate / extend / suspend / reactivate / delete / undo)
CREATE TABLE IF NOT EXISTS account_plan_events (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id            VARCHAR(64) NOT NULL,
  action               VARCHAR(20) NOT NULL COMMENT 'activate | extend | suspend | reactivate | delete | undo',
  by_admin_id          VARCHAR(64) NOT NULL,
  old_expiry           DATE,
  old_status           VARCHAR(20) NULL,
  new_status           VARCHAR(20) NULL,
  old_plan_started_at  DATE NULL,
  new_plan_started_at  DATE NULL,
  new_expiry           DATE,
  reversed_at          TIMESTAMP NULL DEFAULT NULL,
  reverses_event_id    INT NULL,
  request_id           VARCHAR(64) NULL,
  created_at           TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_events_tenant_request (tenant_id, request_id),
  KEY idx_events_tenant (tenant_id)
) ENGINE=InnoDB;