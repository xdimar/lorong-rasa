-- ============================================================
-- 05_FIX_RLS_AND_STORAGE.SQL
-- Perbaikan Error 54001 (Stack Depth Limit Exceeded / Infinite Recursion)
-- & Konfigurasi Supabase Storage untuk menu-images
-- ============================================================

-- ------------------------------------------------------------
-- 1. PERBAIKI FUNGSI is_admin() & is_staff()
--    Tambahkan pengecekan langsung auth.uid() IS NULL agar
--    permintaan anonim tidak memicu query profiles berulang.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 2. HAPUS KEBIJAKAN REKURSIF PADA TABEL public.profiles
--    Penyebab utama error 54001:
--    Kebijakan "Admin can manage all profiles" menggunakan FOR ALL
--    sehingga saat is_admin()/is_staff() melakukan SELECT pada profiles,
--    PostgreSQL mengevaluasi is_admin() lagi -> loop tak terbatas!
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan lama yang bermasalah / rekursif
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete all profiles" ON public.profiles;

-- Kebijakan SELECT (Aman dari rekursi: tidak memanggil fungsi is_admin)
CREATE POLICY "Profiles readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Kebijakan UPDATE (Hanya untuk pemilik akun atau admin)
CREATE POLICY "Users and admin can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = id)
    OR public.is_admin()
  );

-- Kebijakan DELETE (Hanya admin)
CREATE POLICY "Admin can delete all profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 3. KONFIGURASI STORAGE BUCKET menu-images
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

-- ------------------------------------------------------------
-- 4. KEBIJAKAN RLS STORAGE (storage.objects) UNTUK menu-images
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Menu images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Menu images public access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can insert menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete menu images" ON storage.objects;

-- Siapapun dapat melihat dan mengunduh foto menu (Publik)
CREATE POLICY "Menu images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

-- Staff/Admin terautentikasi dapat mengunggah foto menu
CREATE POLICY "Staff can upload menu images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND public.is_staff()
  );

-- Staff/Admin terautentikasi dapat memperbarui foto menu
CREATE POLICY "Staff can update menu images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_staff()
  );

-- Staff/Admin terautentikasi dapat menghapus foto menu
CREATE POLICY "Staff can delete menu images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND public.is_staff()
  );
