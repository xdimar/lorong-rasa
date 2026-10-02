-- ============================================================
-- MIGRATION: Tabel Ulasan Menu (menu_reviews) & Sistem Balasan Barista
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Buat Tabel menu_reviews jika belum ada
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

-- 2. Index untuk performa query cepat
CREATE INDEX IF NOT EXISTS idx_menu_reviews_menu_item_id ON public.menu_reviews(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_reviews_user_id ON public.menu_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_reviews_created_at ON public.menu_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_reviews_is_approved ON public.menu_reviews(is_approved);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.menu_reviews ENABLE ROW LEVEL SECURITY;

-- Policy 1: Siapapun (publik/guest) bisa membaca ulasan yang disetujui (is_approved = true)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'menu_reviews' AND policyname = 'Public can read approved reviews'
  ) THEN
    CREATE POLICY "Public can read approved reviews"
      ON public.menu_reviews
      FOR SELECT
      USING (is_approved = true OR auth.role() = 'authenticated');
  END IF;
END $$;

-- Policy 2: Pengguna login dapat menambahkan ulasan mereka sendiri
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'menu_reviews' AND policyname = 'Authenticated users can insert reviews'
  ) THEN
    CREATE POLICY "Authenticated users can insert reviews"
      ON public.menu_reviews
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy 3: Pemilik ulasan atau Admin/Cashier dapat mengubah ulasan (misal balas atau edit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'menu_reviews' AND policyname = 'Users or staff can update reviews'
  ) THEN
    CREATE POLICY "Users or staff can update reviews"
      ON public.menu_reviews
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = user_id OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'cashier')
        )
      );
  END IF;
END $$;

-- Policy 4: Pemilik ulasan atau Admin dapat menghapus ulasan
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'menu_reviews' AND policyname = 'Users or admin can delete reviews'
  ) THEN
    CREATE POLICY "Users or admin can delete reviews"
      ON public.menu_reviews
      FOR DELETE
      TO authenticated
      USING (
        auth.uid() = user_id OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- 4. Verifikasi dan info status tabel
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'menu_reviews'
ORDER BY ordinal_position;
