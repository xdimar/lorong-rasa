-- ============================================================
-- LORONG RASA — MASTER DATABASE SCHEMA (ALL-IN-ONE)
-- Jalankan skrip ini di Supabase SQL Editor untuk inisialisasi
-- atau pembaruan menyeluruh database Lorong Rasa Cafe Wajak.
-- ============================================================

-- ------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- 2. TABEL PROFILES & ROLE HELPER
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'cashier', 'admin')),
  avatar_url TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom baru ada jika tabel pernah dibuat
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Helper functions untuk cek role di RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'cashier')
  );
END;
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;
ALTER FUNCTION public.is_staff() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated, service_role;

-- Trigger auto-create profile saat user sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Izin eksekusi internal Supabase & cegah pemanggilan via public API
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, supabase_auth_admin, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by everyone" ON public.profiles;
CREATE POLICY "Profiles readable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = id)
    OR public.is_admin()
    OR auth.role() = 'service_role'
    OR auth.role() = 'supabase_auth_admin'
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and admin can update profiles" ON public.profiles;
CREATE POLICY "Users and admin can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admin can delete all profiles" ON public.profiles;
CREATE POLICY "Admin can delete all profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 3. TABEL MENU CATEGORIES & MENU ITEMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories readable by everyone" ON public.menu_categories;
CREATE POLICY "Categories readable by everyone"
  ON public.menu_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories manageable by admin" ON public.menu_categories;
CREATE POLICY "Categories manageable by admin"
  ON public.menu_categories FOR ALL USING (public.is_staff());

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  cost_price NUMERIC NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  category TEXT NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Menu items readable by everyone" ON public.menu_items;
CREATE POLICY "Menu items readable by everyone"
  ON public.menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Menu items manageable by staff" ON public.menu_items;
CREATE POLICY "Menu items manageable by staff"
  ON public.menu_items FOR ALL USING (public.is_staff());

-- ------------------------------------------------------------
-- 4. TABEL VOUCHERS (PROMO CAFE & DISKON PRODUK)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'product')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 100,
  current_uses INTEGER NOT NULL DEFAULT 0,
  product_name TEXT DEFAULT NULL,
  product_menu_item_id UUID DEFAULT NULL REFERENCES public.menu_items(id) ON DELETE SET NULL,
  share_token TEXT UNIQUE DEFAULT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom baru ada jika tabel pernah dibuat
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT NULL;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS product_menu_item_id UUID DEFAULT NULL;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'vouchers_discount_type_check'
  ) THEN
    ALTER TABLE public.vouchers DROP CONSTRAINT vouchers_discount_type_check;
  END IF;
END $$;

ALTER TABLE public.vouchers
  ADD CONSTRAINT vouchers_discount_type_check
  CHECK (discount_type IN ('percentage', 'fixed', 'product'));

CREATE INDEX IF NOT EXISTS idx_vouchers_share_token ON public.vouchers(share_token);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vouchers readable by everyone" ON public.vouchers;
CREATE POLICY "Vouchers readable by everyone"
  ON public.vouchers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vouchers manageable by admin" ON public.vouchers;
CREATE POLICY "Vouchers manageable by admin"
  ON public.vouchers FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------
-- 5. TABEL USER VOUCHERS (DOMPET VOUCHER KLAIM MEMBER)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  voucher_id UUID REFERENCES public.vouchers ON DELETE CASCADE NOT NULL,
  voucher_code TEXT NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'used', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, voucher_id)
);

CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_id ON public.user_vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_status ON public.user_vouchers(status);

ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own claimed vouchers" ON public.user_vouchers;
CREATE POLICY "Users can view own claimed vouchers"
  ON public.user_vouchers FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "Users can insert own voucher claim" ON public.user_vouchers;
CREATE POLICY "Users can insert own voucher claim"
  ON public.user_vouchers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can update user voucher status" ON public.user_vouchers;
CREATE POLICY "Staff can update user voucher status"
  ON public.user_vouchers FOR UPDATE
  USING (public.is_staff() OR auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. TABEL ORDERS & ORDER ITEMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  order_type TEXT NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway')),
  table_number TEXT,
  payment_method TEXT NOT NULL DEFAULT 'qris' CHECK (payment_method IN ('qris', 'cash')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  voucher_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orders readable by owner or staff" ON public.orders;
DROP POLICY IF EXISTS "Orders select policy" ON public.orders;
CREATE POLICY "Orders select policy"
  ON public.orders FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR public.is_staff()
    OR user_id IS NULL
  );

DROP POLICY IF EXISTS "Anyone can insert order" ON public.orders;
CREATE POLICY "Anyone can insert order"
  ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can manage orders" ON public.orders;
CREATE POLICY "Staff can manage orders"
  ON public.orders FOR ALL USING (public.is_staff());

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items ON DELETE SET NULL,
  menu_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order items readable by owner or staff" ON public.order_items;
DROP POLICY IF EXISTS "Order items select policy" ON public.order_items;
CREATE POLICY "Order items select policy"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (
        (auth.uid() IS NOT NULL AND orders.user_id = auth.uid())
        OR public.is_staff()
        OR orders.user_id IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items"
  ON public.order_items FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------
-- 7. TABEL LOYALTY REWARDS & LOYALTY TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_required INTEGER NOT NULL CHECK (points_required > 0),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('voucher', 'free_item', 'merchandise')),
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC CHECK (discount_value > 0),
  min_order NUMERIC DEFAULT 0,
  icon_name TEXT DEFAULT 'Tag',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Loyalty rewards readable by everyone" ON public.loyalty_rewards;
CREATE POLICY "Loyalty rewards readable by everyone"
  ON public.loyalty_rewards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Loyalty rewards manageable by admin" ON public.loyalty_rewards;
CREATE POLICY "Loyalty rewards manageable by admin"
  ON public.loyalty_rewards FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'adjusted')),
  description TEXT NOT NULL,
  order_id UUID REFERENCES public.orders ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can read own loyalty transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "Users and staff can insert loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Users and staff can insert loyalty transactions"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "Admin can manage loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Admin can manage loyalty transactions"
  ON public.loyalty_transactions FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------
-- 8. TABEL MENU REVIEWS & BALASAN BARISTA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT NULL,
  rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  comment TEXT NOT NULL,
  reply TEXT NULL,
  replied_at TIMESTAMPTZ NULL,
  replied_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_reviews_menu_item_id ON public.menu_reviews(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_reviews_user_id ON public.menu_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_reviews_created_at ON public.menu_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_reviews_is_approved ON public.menu_reviews(is_approved);

ALTER TABLE public.menu_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read approved reviews" ON public.menu_reviews;
CREATE POLICY "Public can read approved reviews"
  ON public.menu_reviews FOR SELECT
  USING (is_approved = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.menu_reviews;
CREATE POLICY "Authenticated users can insert reviews"
  ON public.menu_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users or staff can update reviews" ON public.menu_reviews;
CREATE POLICY "Users or staff can update reviews"
  ON public.menu_reviews FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR public.is_staff()
  );

DROP POLICY IF EXISTS "Users or admin can delete reviews" ON public.menu_reviews;
CREATE POLICY "Users or admin can delete reviews"
  ON public.menu_reviews FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- ------------------------------------------------------------
-- 9. SEED DATA DEFAULT (VOUCHERS & LOYALTY REWARDS)
-- ------------------------------------------------------------
INSERT INTO public.vouchers (code, description, discount_type, discount_value, min_order, max_uses, expires_at)
VALUES
  ('RASA10', 'Diskon 10% untuk semua menu tanpa min. order', 'percentage', 10, 0, 200, NOW() + INTERVAL '30 days'),
  ('HEMAT20', 'Potongan Rp 20.000 (Min. transaksi Rp 50.000)', 'fixed', 20000, 50000, 100, NOW() + INTERVAL '14 days'),
  ('NGOPIASIK', 'Diskon 15% khusus pembelian aneka varian Kopi', 'percentage', 15, 25000, 150, NOW() + INTERVAL '21 days')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.loyalty_rewards (title, description, points_required, reward_type, discount_type, discount_value, min_order, icon_name)
VALUES
  ('Voucher Hemat Rp 10.000', 'Potongan langsung Rp 10.000 untuk pesanan apa pun dengan minimal belanja Rp 35.000.', 15, 'voucher', 'fixed', 10000, 35000, 'Tag'),
  ('Voucher Diskon 20%', 'Diskon 20% untuk semua menu racikan Lorong Rasa (Min. belanja Rp 45.000).', 25, 'voucher', 'percentage', 20, 45000, 'Percent'),
  ('Voucher Spesial Rp 25.000', 'Potongan besar Rp 25.000 untuk pesanan dine in maupun takeaway dengan min. belanja Rp 60.000.', 40, 'voucher', 'fixed', 25000, 60000, 'Sparkles'),
  ('Traktiran Kopi Lorong Rasa (Rp 35.000)', 'Voucher senilai Rp 35.000 setara free minuman signature favoritmu!', 60, 'voucher', 'fixed', 35000, 35000, 'Coffee')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 10. STORAGE BUCKET & POLICIES (MENU IMAGES)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Menu images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Menu images public access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can insert menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete menu images" ON storage.objects;

CREATE POLICY "Menu images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

CREATE POLICY "Staff can upload menu images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND public.is_staff()
  );

CREATE POLICY "Staff can update menu images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_staff()
  );

CREATE POLICY "Staff can delete menu images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_staff()
  );
