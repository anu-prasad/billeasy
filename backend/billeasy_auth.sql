-- ============================================
-- Database: billeasy_auth
-- Creates DB, users & otps tables, demo data
-- ============================================
CREATE DATABASE IF NOT EXISTS billeasy_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE billeasy_auth;

CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(64)  NOT NULL,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('owner','staff','admin') NOT NULL DEFAULT 'owner',
  tenant_id  VARCHAR(64)  NOT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_email (email),
  KEY idx_users_tenant (tenant_id),
  KEY idx_users_email_lower ((LOWER(email)))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS otps (
  id         INT NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) NOT NULL,
  otp        VARCHAR(10)  NOT NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_otp_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(64)  NOT NULL,
  user_id    VARCHAR(64)  NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  PRIMARY KEY (session_id),
  KEY idx_sessions_user (user_id)
) ENGINE=InnoDB;

INSERT INTO users (id, name, email, password, role, tenant_id, active, created_at) VALUES
('tenant-demo-001', 'Abhinav T', 'demo@billeasy.com', 'demo123', 'owner', 'tenant-demo-001', 1, '2026-01-01 00:00:00'),
('staff-001', 'Rahul Kumar', 'rahul@freshmart.com', 'staff123', 'staff', 'tenant-demo-001', 1, '2026-01-15 00:00:00');

-- Super admin (tenant management page): login admin@billeasy.com / admin123
INSERT INTO users (id, name, email, password, role, tenant_id, active, created_at) VALUES
('tenant-admin', 'BillEasy Admin', 'admin@billeasy.com', 'admin123', 'admin', 'ADMIN', 1, '2026-01-01 00:00:00');