-- ============================================================
-- 07_LOYALTY_REDEEM_RPC.SQL
-- 1. RPC award_order_loyalty_points (Atomik & Aman dari Trigger Proteksi)
-- 2. RPC redeem_loyalty_reward (Penukaran Poin & Penerbitan Voucher Atomik)
-- ============================================================

-- ------------------------------------------------------------
-- 1. RPC: AWARD ORDER LOYALTY POINTS
--    Memberi poin loyalitas saat pesanan selesai (1 poin per Rp 10.000)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_order_loyalty_points(
  p_order_id UUID,
  p_user_id UUID,
  p_total_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_pts_to_award INTEGER;
  v_current_points INTEGER;
  v_new_points INTEGER;
BEGIN
  -- Hitung poin: 1 poin tiap Rp 10.000 belanja
  v_pts_to_award := FLOOR(COALESCE(p_total_amount, 0) / 10000)::INTEGER;
  IF v_pts_to_award <= 0 THEN
    RETURN jsonb_build_object('success', true, 'points_awarded', 0);
  END IF;

  -- 1. Cek idempotensi: jangan beri poin ganda jika pesanan sudah pernah tercatat
  IF EXISTS (
    SELECT 1 FROM public.loyalty_transactions
    WHERE order_id = p_order_id AND type = 'earned'
  ) THEN
    RETURN jsonb_build_object('success', true, 'points_awarded', 0, 'already_awarded', true);
  END IF;

  -- 2. Kunci baris profil user untuk update poin secara aman
  SELECT COALESCE(loyalty_points, 0)
  INTO v_current_points
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profil member tidak ditemukan.');
  END IF;

  v_new_points := v_current_points + v_pts_to_award;

  -- 3. Update saldo poin profil
  UPDATE public.profiles
  SET loyalty_points = v_new_points,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- 4. Catat transaksi mutasi poin
  INSERT INTO public.loyalty_transactions (
    user_id,
    points,
    type,
    description,
    order_id
  ) VALUES (
    p_user_id,
    v_pts_to_award,
    'earned',
    format('Perolehan poin dari pesanan #%s', UPPER(SUBSTRING(p_order_id::text, 1, 8))),
    p_order_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_pts_to_award,
    'new_points', v_new_points
  );
END;
$$;

ALTER FUNCTION public.award_order_loyalty_points(UUID, UUID, NUMERIC) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.award_order_loyalty_points(UUID, UUID, NUMERIC) TO anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 2. RPC: REDEEM LOYALTY REWARD
--    Penukaran poin member dengan voucher diskon secara atomik
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(
  p_reward_id TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_reward RECORD;
  v_current_points INTEGER;
  v_new_points INTEGER;
  v_voucher_code TEXT;
  v_voucher_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_rand_suffix TEXT;
BEGIN
  -- 1. Tentukan user_id (dari sesi autentikasi atau diberikan staf)
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sesi pengguna tidak valid. Silakan login kembali.');
  END IF;

  -- 2. Jika menukar atas nama user lain, pastikan pemanggil adalah staf/admin
  IF p_user_id IS NOT NULL AND p_user_id <> auth.uid() AND NOT public.is_staff() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Akses ditolak: Anda tidak memiliki wewenang menukar poin akun lain.');
  END IF;

  -- 3. Cari reward di tabel loyalty_rewards (dukung UUID atau pencarian fallback)
  BEGIN
    SELECT id, title, description, points_required, reward_type, discount_type, discount_value, min_order, is_active
    INTO v_reward
    FROM public.loyalty_rewards
    WHERE id = p_reward_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    SELECT id, title, description, points_required, reward_type, discount_type, discount_value, min_order, is_active
    INTO v_reward
    FROM public.loyalty_rewards
    WHERE is_active = TRUE AND (title ILIKE '%' || p_reward_id || '%' OR p_reward_id ILIKE '%' || points_required::text || '%')
    ORDER BY points_required ASC
    LIMIT 1;
  END;

  IF v_reward.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Katalog reward tidak ditemukan di sistem.');
  END IF;

  IF NOT v_reward.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward ini sedang tidak aktif.');
  END IF;

  -- 4. Kunci baris member profil dan cek kecukupan saldo poin
  SELECT COALESCE(loyalty_points, 0)
  INTO v_current_points
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profil member tidak ditemukan.');
  END IF;

  IF v_current_points < v_reward.points_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Poin Anda (%s) belum mencukupi untuk reward ini (butuh %s poin).', v_current_points, v_reward.points_required)
    );
  END IF;

  v_new_points := v_current_points - v_reward.points_required;

  -- 5. Buat kode voucher unik baru: POIN-XXXXX
  LOOP
    v_rand_suffix := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 5));
    v_voucher_code := 'POIN-' || v_rand_suffix;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vouchers WHERE code = v_voucher_code);
  END LOOP;

  v_expires_at := NOW() + INTERVAL '30 days';

  -- 6. Terbitkan voucher baru di tabel vouchers (Security Definer memiliki izin insert)
  INSERT INTO public.vouchers (
    code,
    description,
    discount_type,
    discount_value,
    min_order,
    max_uses,
    current_uses,
    expires_at,
    is_active
  ) VALUES (
    v_voucher_code,
    '[Reward Tukar Poin] ' || v_reward.title,
    COALESCE(v_reward.discount_type, 'fixed'),
    COALESCE(v_reward.discount_value, 10000),
    COALESCE(v_reward.min_order, 0),
    1,
    0,
    v_expires_at,
    TRUE
  ) RETURNING id INTO v_voucher_id;

  -- 7. Simpan langsung ke dompet user_vouchers member
  INSERT INTO public.user_vouchers (
    user_id,
    voucher_id,
    voucher_code,
    status
  ) VALUES (
    v_user_id,
    v_voucher_id,
    v_voucher_code,
    'claimed'
  );

  -- 8. Potong saldo poin member
  UPDATE public.profiles
  SET loyalty_points = v_new_points,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- 9. Catat transaksi penukaran poin
  INSERT INTO public.loyalty_transactions (
    user_id,
    points,
    type,
    description,
    order_id
  ) VALUES (
    v_user_id,
    -v_reward.points_required,
    'redeemed',
    format('Penukaran %s poin untuk voucher %s (%s)', v_reward.points_required, v_voucher_code, v_reward.title),
    NULL
  );

  -- 10. Kembalikan respons berhasil
  RETURN jsonb_build_object(
    'success', true,
    'voucher_code', v_voucher_code,
    'voucher_id', v_voucher_id,
    'title', v_reward.title,
    'new_points', v_new_points,
    'expires_at', v_expires_at
  );
END;
$$;

ALTER FUNCTION public.redeem_loyalty_reward(TEXT, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(TEXT, UUID) TO anon, authenticated, service_role;
