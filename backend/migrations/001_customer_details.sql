-- Apply once to existing databases before deploying the customer-detail changes.
-- Adds fields only; existing customer values are preserved.
ALTER TABLE customers
  ADD COLUMN contact VARCHAR(255) NULL,
  ADD COLUMN city VARCHAR(255) NULL,
  ADD COLUMN segment VARCHAR(255) NULL;
