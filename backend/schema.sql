-- ============================================================
-- WINCREA LOOM — Fabric Inventory ERP
-- Database schema
--
-- IMPORTANT: This schema was reconstructed by reading every
-- SQL query in the backend controllers, because no schema.sql
-- or migration files were included in the project export.
-- It should reflect what the code expects, but please review
-- it (data types, lengths, extra indexes) before relying on it
-- in production, and test the full app against it.
--
-- Run this once against your Aiven MySQL database, e.g.:
--   mysql --host=... --port=... --user=avnadmin -p \
--       --ssl-ca=ca.pem defaultdb < schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(150)    NOT NULL,
    email               VARCHAR(255)    NOT NULL UNIQUE,
    password_hash       VARCHAR(255)    NOT NULL,
    role                ENUM('STAFF','ADMIN') NOT NULL DEFAULT 'STAFF',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    approval_status     ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED',
    email_verified      BOOLEAN         NOT NULL DEFAULT FALSE,
    approved_at         DATETIME        NULL,
    approved_by         INT             NULL,
    rejection_reason    VARCHAR(500)    NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- EMAIL OTPS (registration verification / password reset)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_otps (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT             NULL,
    email       VARCHAR(255)    NOT NULL,
    otp_hash    VARCHAR(255)    NOT NULL,
    purpose     ENUM('REGISTRATION','PASSWORD_RESET') NOT NULL,
    attempts    INT             NOT NULL DEFAULT 0,
    expires_at  DATETIME        NOT NULL,
    used_at     DATETIME        NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_otps_lookup (email, purpose, used_at),
    CONSTRAINT fk_email_otps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200)    NOT NULL,
    phone       VARCHAR(30)     NULL,
    email       VARCHAR(255)    NULL,
    address     VARCHAR(500)    NULL,
    gst_number  VARCHAR(20)     NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200)    NOT NULL,
    phone       VARCHAR(30)     NULL,
    email       VARCHAR(255)    NULL,
    address     VARCHAR(500)    NULL,
    gst_number  VARCHAR(20)     NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    sku             VARCHAR(100)    NOT NULL UNIQUE,
    name            VARCHAR(200)    NOT NULL,
    category        ENUM('ESSENTIAL','PREMIUM') NOT NULL,
    color           VARCHAR(100)    NULL,
    width_cm        DECIMAL(10,2)   NULL,
    rate_per_meter  DECIMAL(12,2)   NOT NULL DEFAULT 0,
    reorder_level   DECIMAL(12,2)   NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ROLLS (individual fabric roll inventory units)
-- ============================================================
CREATE TABLE IF NOT EXISTS rolls (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    roll_id             VARCHAR(100)    NOT NULL UNIQUE,
    product_id          INT             NOT NULL,
    original_length     DECIMAL(12,2)   NOT NULL,
    remaining_length    DECIMAL(12,2)   NOT NULL,
    status              ENUM('AVAILABLE','EMPTY') NOT NULL DEFAULT 'AVAILABLE',
    batch               VARCHAR(100)    NULL,
    rack                VARCHAR(50)     NULL,
    bin                 VARCHAR(50)     NULL,
    supplier_id         INT             NULL,
    inward_date         DATETIME        NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rolls_product (product_id),
    CONSTRAINT fk_rolls_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_rolls_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    po_number       VARCHAR(50)     NOT NULL UNIQUE,
    supplier_id     INT             NOT NULL,
    status          ENUM('DRAFT','APPROVED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
    expected_date   DATE            NULL,
    notes           VARCHAR(1000)   NULL,
    created_by      INT             NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id   INT             NOT NULL,
    product_id          INT             NOT NULL,
    ordered_meters      DECIMAL(12,2)   NOT NULL,
    received_meters     DECIMAL(12,2)   NOT NULL DEFAULT 0,
    rate_per_meter      DECIMAL(12,2)   NOT NULL DEFAULT 0,
    INDEX idx_poi_po (purchase_order_id),
    CONSTRAINT fk_poi_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PROFORMA INVOICES (outward / sales drafts)
-- ============================================================
CREATE TABLE IF NOT EXISTS proforma_invoices (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pi_number       VARCHAR(50)     NOT NULL UNIQUE,
    customer_id     INT             NOT NULL,
    status          ENUM('DRAFT','CONFIRMED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
    invoice_date    DATE            NULL,
    remarks         VARCHAR(1000)   NULL,
    created_by      INT             NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pi_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pi_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS proforma_invoice_items (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    proforma_invoice_id     INT             NOT NULL,
    roll_id                 INT             NOT NULL,
    product_id              INT             NOT NULL,
    quantity                DECIMAL(12,2)   NOT NULL,
    rate_per_meter          DECIMAL(12,2)   NOT NULL DEFAULT 0,
    INDEX idx_pii_pi (proforma_invoice_id),
    CONSTRAINT fk_pii_pi FOREIGN KEY (proforma_invoice_id) REFERENCES proforma_invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_pii_roll FOREIGN KEY (roll_id) REFERENCES rolls(id) ON DELETE RESTRICT,
    CONSTRAINT fk_pii_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TRANSACTIONS (ledger of INWARD / OUTWARD / RETURN movements)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    transaction_number  VARCHAR(50)     NOT NULL UNIQUE,
    transaction_type    ENUM('INWARD','OUTWARD','RETURN') NOT NULL,
    customer_id         INT             NULL,
    supplier_id         INT             NULL,
    user_id             INT             NULL,
    notes               VARCHAR(1000)   NULL,
    source_type         ENUM('MANUAL','EXCEL') NOT NULL DEFAULT 'MANUAL',
    source_file         VARCHAR(255)    NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_txn_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_txn_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    CONSTRAINT fk_txn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transaction_items (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id      INT             NOT NULL,
    roll_id             INT             NOT NULL,
    quantity            DECIMAL(12,2)   NOT NULL,
    INDEX idx_ti_txn (transaction_id),
    INDEX idx_ti_roll (roll_id),
    CONSTRAINT fk_ti_txn FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ti_roll FOREIGN KEY (roll_id) REFERENCES rolls(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INVENTORY ADJUSTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    roll_id             INT             NOT NULL,
    adjustment_type     ENUM('INCREASE','DECREASE','SET') NOT NULL,
    quantity            DECIMAL(12,2)   NOT NULL,
    previous_length     DECIMAL(12,2)   NOT NULL,
    new_length          DECIMAL(12,2)   NOT NULL,
    reason              ENUM('DAMAGED','LOST','MEASUREMENT_CORRECTION','OTHER') NOT NULL,
    notes               VARCHAR(1000)   NULL,
    user_id             INT             NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_adj_roll FOREIGN KEY (roll_id) REFERENCES rolls(id) ON DELETE RESTRICT,
    CONSTRAINT fk_adj_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SHARE LINKS (public read-only links to products/rolls)
-- ============================================================
CREATE TABLE IF NOT EXISTS share_links (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    token           VARCHAR(255)    NOT NULL UNIQUE,
    resource_type   ENUM('PRODUCTS','ROLLS') NOT NULL,
    expires_at      DATETIME        NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_by      INT             NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_share_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- OPTIONAL: seed an initial admin user so you can log in.
-- Replace the bcrypt hash below with your own — generate one
-- locally with:
--   node -e "console.log(require('bcryptjs').hashSync('YourPassword123', 12))"
-- ============================================================
-- INSERT INTO users (name, email, password_hash, role, is_active, approval_status, email_verified)
-- VALUES ('Admin', 'admin@example.com', '$2a$12$REPLACE_WITH_REAL_HASH', 'ADMIN', TRUE, 'APPROVED', TRUE);
