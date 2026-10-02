-- ============================================================
-- MIGRATION: Tambah tipe voucher "product" (diskon produk spesifik)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom baru ke tabel vouchers
ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS product_menu_item_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT NULL;

-- 2. Isi share_token otomatis untuk voucher yang sudah ada
UPDATE vouchers
SET share_token = LOWER(SUBSTRING(MD5(id::text || code), 1, 12))
WHERE share_token IS NULL;

-- 3. Ubah constraint discount_type agar menerima nilai 'product'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'vouchers_discount_type_check'
  ) THEN
    ALTER TABLE vouchers DROP CONSTRAINT vouchers_discount_type_check;
  END IF;
END $$;

ALTER TABLE vouchers
  ADD CONSTRAINT vouchers_discount_type_check
  CHECK (discount_type IN ('percentage', 'fixed', 'product'));

-- 4. Index untuk share_token
CREATE INDEX IF NOT EXISTS idx_vouchers_share_token ON vouchers(share_token);

-- Verifikasi
SELECT code, discount_type, discount_value, product_name, share_token FROM vouchers LIMIT 10;
