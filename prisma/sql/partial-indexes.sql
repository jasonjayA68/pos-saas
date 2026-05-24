-- Recommended partial indexes (not expressible in Prisma schema).
-- Apply after the initial `prisma migrate dev` via a follow-up migration:
--   npx prisma migrate dev --create-only -n partial_indexes
-- then paste this into the generated SQL file.

-- Active products only — the common "list/search products" query path
CREATE INDEX IF NOT EXISTS idx_products_active_name
  ON products (business_id, name)
  WHERE deleted_at IS NULL AND is_active = true;

-- Barcode lookup, only when the product has a barcode and is alive
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_alive_unique
  ON products (business_id, barcode)
  WHERE barcode IS NOT NULL AND deleted_at IS NULL;

-- Low-stock alert query (used by dashboards / reorder suggestions)
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
  ON inventory_levels (business_id, branch_id)
  WHERE quantity <= reorder_point;

-- Active (non-voided) sales sorted by recency — the daily-sales hot path
CREATE INDEX IF NOT EXISTS idx_sales_active_recent
  ON sales (business_id, branch_id, created_at DESC)
  WHERE voided_at IS NULL;

-- Customer email lookup (when present), enforce per-business uniqueness on live rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_alive_unique
  ON customers (business_id, email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;

-- Phone lookup (very common in PH retail) on live customers only
CREATE INDEX IF NOT EXISTS idx_customers_phone_alive
  ON customers (business_id, phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- Active expenses sorted by paid date
CREATE INDEX IF NOT EXISTS idx_expenses_active_paid
  ON expenses (business_id, paid_at DESC)
  WHERE deleted_at IS NULL;

-- System roles (business_id IS NULL) must be globally unique by name.
-- The schema's @@unique([businessId, name]) allows multiple NULL business_ids
-- in Postgres, so this partial index pins down system role names.
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_system_name_unique
  ON roles (name)
  WHERE business_id IS NULL;
