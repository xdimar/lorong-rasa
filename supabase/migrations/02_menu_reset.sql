-- =============================================
-- SCRIPT RESET KATEGORI & MENU LORONG RASA
-- Jalankan skrip ini di SQL Editor Supabase untuk
-- memperbarui seluruh menu dan kategori secara instan.
-- =============================================

-- 1. Pastikan tabel menu_categories dan menu_items sudah siap
create table if not exists public.menu_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

alter table public.menu_categories enable row level security;
drop policy if exists "Categories readable by everyone" on public.menu_categories;
create policy "Categories readable by everyone" on public.menu_categories for select using (true);
drop policy if exists "Categories insertable by admin" on public.menu_categories;
create policy "Categories insertable by admin" on public.menu_categories for insert with check (public.is_admin());
drop policy if exists "Categories deletable by admin" on public.menu_categories;
create policy "Categories deletable by admin" on public.menu_categories for delete using (public.is_admin());

-- 2. Bersihkan kategori lama & masukkan 8 kategori baru
delete from public.menu_categories;

insert into public.menu_categories (name) values
  ('Makanan Berat'),
  ('Snack'),
  ('Milky Series'),
  ('Renceng Series'),
  ('Lokal Series'),
  ('Tea Series'),
  ('Coffee Series'),
  ('Mocktail Series')
on conflict (name) do nothing;

-- 3. Bersihkan menu lama
delete from public.menu_items;

-- 4. Masukkan seluruh 53 menu baru
insert into public.menu_items (name, description, price, category, image_url, is_available) values
  -- Makanan Berat
  ('Seblak Prasmanan', 'Seblak kuah pedas gurih dengan aneka pilihan topping prasmanan segar.', 12000, 'Makanan Berat', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80', true),
  ('Mie Nyemek / Goreng', 'Olahan mie bumbu racikan gurih mantap dengan sayur dan telur.', 8000, 'Makanan Berat', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80', true),
  ('Ayam Geprek', 'Ayam krispi renyah digeprek dengan sambal bawang pedas nampol.', 12000, 'Makanan Berat', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80', true),

  -- Snack
  ('Pisang Pasir (M)', 'Pisang manis balut tepung panir krispi renyah porsi Medium.', 6000, 'Snack', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80', true),
  ('Pisang Pasir (L)', 'Pisang pasir krispi porsi Large melimpah pas untuk dinikmati bersama.', 10000, 'Snack', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80', true),
  ('Piscok (M)', 'Pisang coklat lumer dibalut kulit lumpia renyah porsi Medium.', 6000, 'Snack', 'https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=600&auto=format&fit=crop&q=80', true),
  ('Piscok (L)', 'Pisang coklat lumer ekstra coklat meleleh porsi Large.', 10000, 'Snack', 'https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=600&auto=format&fit=crop&q=80', true),
  ('Dimsum', 'Dimsum kukus lembut isi olahan daging ayam dan udang gurih lezat.', 10000, 'Snack', 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600&auto=format&fit=crop&q=80', true),
  ('Tahu Kres', 'Tahu goreng berbalut tepung krispi gurih renyah.', 5000, 'Snack', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80', true),
  ('Cireng Isi (M)', 'Cireng kenyal isi ayam pedas gurih porsi Medium.', 6000, 'Snack', 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80', true),
  ('Cireng Isi (L)', 'Cireng kenyal isi ayam pedas gurih porsi Large puas.', 10000, 'Snack', 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80', true),
  ('Cilok Aci', 'Cilok kenyal gurih disajikan dengan bumbu kacang atau saus pedas.', 5000, 'Snack', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80', true),
  ('Tahu Kocek (M)', 'Tahu kocek khas dengan sambal cabe uleg rawit segar porsi Medium.', 6000, 'Snack', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80', true),
  ('Tahu Kocek (L)', 'Tahu kocek khas sambal cabe rawit pedas mantap porsi Large.', 10000, 'Snack', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80', true),
  ('Kocek Mix (M)', 'Kombinasi tahu dan cilok bumbu kocek pedas porsi Medium.', 6000, 'Snack', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80', true),
  ('Kocek Mix (L)', 'Kombinasi tahu dan cilok bumbu kocek pedas porsi Large.', 10000, 'Snack', 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80', true),
  ('Kentang Goreng', 'Kentang goreng stik renyah gurih disajikan dengan saus cocol.', 6000, 'Snack', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80', true),
  ('Mix Platter', 'Platter camilan lengkap kentang, sosis, dan nugget dalam satu piring.', 10000, 'Snack', 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&auto=format&fit=crop&q=80', true),
  ('Basreng (M)', 'Bakso goreng krispi renyah bumbu pedas daun jeruk porsi Medium.', 6000, 'Snack', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80', true),
  ('Basreng (L)', 'Bakso goreng krispi renyah bumbu pedas daun jeruk porsi Large.', 10000, 'Snack', 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80', true),
  ('Sosis Bakar', 'Sosis panggang gurih diolesi saus barbeque lezat manis pedas.', 5000, 'Snack', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', true),
  ('Bakaran Seafood', 'Aneka sate olahan seafood bakar saus istimewa per porsi.', 10000, 'Snack', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80', true),
  ('Risoles', 'Risoles isi creamy lezat dengan kulit renyah keemasan per porsi.', 10000, 'Snack', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80', true),
  ('Burger Beef', 'Burger daging sapi gurih dengan sayuran segar dan saus spesial.', 8000, 'Snack', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', true),
  ('Pentol Mercon', 'Pentol daging sapi kenyal dimasak dalam sambal cabe rawit mercon membakar lidah.', 10000, 'Snack', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&auto=format&fit=crop&q=80', true),
  ('Donat Toping (M)', 'Donat lembut aneka topping coklat/keju porsi Medium.', 6000, 'Snack', 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80', true),
  ('Donat Toping (L)', 'Donat lembut aneka topping porsi Large istimewa.', 10000, 'Snack', 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop&q=80', true),
  ('Getuk Goreng', 'Getuk singkong manis legit digoreng renyah di luar lembut di dalam.', 6000, 'Snack', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80', true),
  ('Corndog Mozza', 'Corndog krispi lumer keju mozzarella mulur dengan saus mayonaise dan sambal.', 8000, 'Snack', 'https://images.unsplash.com/photo-1628294895950-9805252327bc?w=600&auto=format&fit=crop&q=80', true),
  ('Corndog Sosis', 'Corndog renyah isi sosis daging gurih nikmat.', 7000, 'Snack', 'https://images.unsplash.com/photo-1628294895950-9805252327bc?w=600&auto=format&fit=crop&q=80', true),

  -- Milky Series
  ('Ice Milky Matcha', 'Perpaduan susu segar creamy dan bubuk matcha aromatik dingin segar.', 8000, 'Milky Series', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80', true),
  ('Ice Milky Choco', 'Susu segar berpadu coklat pekat lezat pelepas dahaga.', 8000, 'Milky Series', 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80', true),
  ('Ice Milky Taro', 'Rasa taro manis lembut dengan susu creamy segar berwarna ungu memikat.', 8000, 'Milky Series', 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=600&auto=format&fit=crop&q=80', true),
  ('Ice Milky Redvelvet', 'Red velvet manis gurih berpadu susu dingin segar.', 8000, 'Milky Series', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80', true),

  -- Renceng Series
  ('Pop Ice', 'Minuman blender dingin segar aneka rasa nostalgia.', 4000, 'Renceng Series', 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=600&auto=format&fit=crop&q=80', true),
  ('Nutrisari', 'Minuman sari jeruk kaya vitamin C disajikan dingin menyegarkan.', 4000, 'Renceng Series', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80', true),

  -- Lokal Series
  ('Ice Jeruk', 'Jeruk peras alami segar disajikan dingin dengan es batu.', 4000, 'Lokal Series', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80', true),
  ('Hot Jeruk', 'Jeruk peras hangat alami melegakan tenggorokan.', 4000, 'Lokal Series', 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80', true),
  ('Hot Tea', 'Teh seduh hangat wangi melati alami dengan gula asli.', 4000, 'Lokal Series', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80', true),
  ('Es Teh Jumbo', 'Es teh manis segar disajikan dalam gelas porsi jumbo puas.', 4000, 'Lokal Series', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80', true),
  ('Es Teler (Musiman)', 'Es teler santan segar isi alpukat, kelapa muda, dan nangka (ketersediaan musiman).', 10000, 'Lokal Series', 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600&auto=format&fit=crop&q=80', true),
  ('Es Jagung (Musiman)', 'Es jagung manis creamy khas dengan susu dan parutan keju (ketersediaan musiman).', 10000, 'Lokal Series', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80', true),

  -- Tea Series
  ('Ice Lychee Tea', 'Teh aromatik dipadukan sirup leci manis segar dengan buah leci dingin.', 6000, 'Tea Series', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80', true),
  ('Ice Lemon Tea', 'Teh segar dengan perasan lemon asli dingin pelepas dahaga.', 6000, 'Tea Series', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', true),

  -- Coffee Series
  ('Black Coffee', 'Kopi hitam seduh aromatik khas biji kopi pilihan.', 5000, 'Coffee Series', 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80', true),
  ('Nescafe Latte Ice', 'Kopi latte creamy Nescafe disajikan dingin menyegarkan.', 9000, 'Coffee Series', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80', true),
  ('Nescafe Latte Hot', 'Kopi latte hangat lembut menenangkan dari Nescafe.', 7000, 'Coffee Series', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80', true),
  ('Americano (Ice/Hot)', 'Espresso dengan air mineral segar (pilihan Ice / Hot, gula / no sugar).', 5000, 'Coffee Series', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80', true),
  ('Brown Sugar Coffee Latte', 'Kopi susu lembut berpadu lelehan gula aren murni aromatik.', 9000, 'Coffee Series', 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80', true),
  ('Butterscotch Coffee Latte', 'Kopi susu berpadu aroma sirup butterscotch manis gurih karamel.', 9000, 'Coffee Series', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80', true),

  -- Mocktail Series
  ('Blood Sparkling', 'Mocktail merah segar bersoda dengan kombinasi sirup berry manis menggigit.', 8000, 'Mocktail Series', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80', true),
  ('Melon Squash', 'Kesegaran sirup melon berpadu soda dingin dan bulir selasih.', 8000, 'Mocktail Series', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', true),
  ('Lemon Squash', 'Kesegaran perasan lemon asli bersoda dingin nendang pelepas dahaga.', 8000, 'Mocktail Series', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', true);
