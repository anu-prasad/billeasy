-- ============================================
-- Database: billeasy_staff
-- Creates DB, staff table, demo data
-- ============================================
CREATE DATABASE IF NOT EXISTS billeasy_staff CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE billeasy_staff;

CREATE TABLE IF NOT EXISTS staff (
  id         VARCHAR(64)  NOT NULL,
  tenant_id  VARCHAR(64)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(10)  NOT NULL DEFAULT 'staff',
  phone      VARCHAR(50),
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_staff_email (email),
  KEY idx_staff_tenant (tenant_id)
) ENGINE=InnoDB;

INSERT INTO staff (id, tenant_id, name, email, password, role, phone, active, created_at) VALUES
('staff-001', 'tenant-demo-001', 'Rahul Kumar', 'rahul@freshmart.com', 'staff123', 'staff', '9876543210', 1, '2026-01-15 00:00:00');