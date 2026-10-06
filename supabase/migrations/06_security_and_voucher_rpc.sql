-- ============================================================
-- 06_SECURITY_AND_VOUCHER_RPC.SQL
-- 1. Proteksi RLS update role & loyalty_points pada public.profiles
-- 2. RPC increment_voucher_usage (Atomik & Aman dari Race Condition)
-- 3. Izin Staff (Admin & Kasir) untuk pengelolaan voucher
-- 4. Unique Index Idempotensi Poin Loyalitas
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROTEKSI PROFIL: CEGAH MANIPULASI ROLE & POIN OLEH USER BIASA
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Jika bukan admin yang melakukan pembaruan (misal: user biasa via Supabase Client)
  IF NOT public.is_admin() THEN
    -- Cegah pengubahan kolom role (Privilege Escalation)
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Akses Ditolak: Anda tidak memiliki izin untuk mengubah peran akun (role).';
    END IF;

    -- Cegah pengubahan langsung saldo loyalty_points via update profil client
    IF NEW.loyalty_points IS DISTINCT FROM OLD.loyalty_points THEN
      RAISE EXCEPTION 'Akses Ditolak: Saldo poin hanya dapat diubah melalui sistem transaksi kafe.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_fields ON public.profiles;
CREATE TRIGGER tr_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- ------------------------------------------------------------
-- 2. RPC ATOMIK: INCREMENT VOUCHER USAGE (ANTI RACE-CONDITION)
--    Dapat dipanggil dengan aman oleh Checkout Online & Kasir POS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_voucher_usage(voucher_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  -- Kunci baris voucher untuk transaksi ini (mencegah double-spending)
  SELECT id, code, is_active, max_uses, current_uses, expires_at
  INTO v_rec
  FROM public.vouchers
  WHERE id = voucher_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher tidak ditemukan di sistem.');
  END IF;

  IF NOT v_rec.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher saat ini sedang tidak aktif.');
  END IF;

  IF v_rec.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher telah kedaluwarsa.');
  END IF;

  IF v_rec.max_uses > 0 AND (v_rec.current_uses >= v_rec.max_uses) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kuota penggunaan voucher sudah habis.');
  END IF;

  -- Tambah kuota pemakaian secara atomik
  UPDATE public.vouchers
  SET current_uses = COALESCE(current_uses, 0) + 1,
      updated_at = NOW()
  WHERE id = voucher_id;

  RETURN jsonb_build_object(
    'success', true,
    'voucher_id', voucher_id,
    'code', v_rec.code,
    'current_uses', COALESCE(v_rec.current_uses, 0) + 1
  );
END;
$$;

ALTER FUNCTION public.increment_voucher_usage(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.increment_voucher_usage(UUID) TO anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 3. PERBARUI KEBIJAKAN VOUCHERS UNTUK STAFF (ADMIN & KASIR)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Vouchers manageable by admin" ON public.vouchers;
DROP POLICY IF EXISTS "Vouchers manageable by staff" ON public.vouchers;
CREATE POLICY "Vouchers manageable by staff"
  ON public.vouchers FOR ALL
  USING (public.is_staff());

DROP POLICY IF EXISTS "Vouchers readable by everyone" ON public.vouchers;
CREATE POLICY "Vouchers readable by everyone"
  ON public.vouchers FOR SELECT
  USING (true);

-- ------------------------------------------------------------
-- 4. INDEKS UNIK IDEMPOTENSI POIN LOYALITAS
--    Mencegah perolehan poin ganda untuk pesanan yang sama
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_order_earned
  ON public.loyalty_transactions(order_id, type)
  WHERE order_id IS NOT NULL AND type = 'earned';
