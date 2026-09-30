-- =============================================
-- LORONG RASA — Orders System Schema & RLS Policies
-- Jalankan script ini di Supabase SQL Editor
-- =============================================

-- 1. Tabel orders
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  order_type text not null default 'dine_in' check (order_type in ('dine_in', 'takeaway')),
  table_number text,
  payment_method text not null default 'qris' check (payment_method in ('qris', 'cash')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  total_amount numeric not null default 0 check (total_amount >= 0),
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  voucher_code text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Pastikan kolom baru ada jika tabel orders sudah pernah dibuat sebelumnya
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists order_type text not null default 'dine_in';
alter table public.orders add column if not exists table_number text;
alter table public.orders add column if not exists payment_method text not null default 'qris';
alter table public.orders add column if not exists payment_status text not null default 'unpaid';

-- 2. Tabel order_items
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders on delete cascade not null,
  menu_item_id uuid references public.menu_items on delete set null,
  menu_item_name text not null,
  quantity integer not null check (quantity > 0),
  price numeric not null check (price >= 0),
  subtotal numeric not null check (subtotal >= 0),
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- Trigger: Otomatis Update Kuota Voucher Saat Order Dibuat
-- =============================================
create or replace function public.handle_order_voucher_usage()
returns trigger as $$
begin
  if new.voucher_code is not null and new.voucher_code <> '' then
    update public.vouchers
    set current_uses = current_uses + 1,
        updated_at = now()
    where code = new.voucher_code
      and is_active = true
      and expires_at > now();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists tr_order_voucher_usage on public.orders;
create trigger tr_order_voucher_usage
  after insert on public.orders
  for each row execute procedure public.handle_order_voucher_usage();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

alter table public.orders enable row level security;

-- Orders: Pengguna bisa melihat order miliknya, publik bisa membaca order berdasarkan ID (untuk struk pelacakan), staff bisa melihat semua
drop policy if exists "Users can read own orders" on public.orders;
drop policy if exists "Orders select policy" on public.orders;
create policy "Orders select policy"
  on public.orders for select
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or public.is_staff()
    or user_id is null
  );

-- Orders: Pengguna bisa membuat order. Jika login, user_id harus sesuai auth.uid()
drop policy if exists "Users can create orders" on public.orders;
drop policy if exists "Orders insert policy" on public.orders;
create policy "Orders insert policy"
  on public.orders for insert
  with check (
    public.is_staff()
    or (
      ((auth.uid() is not null and user_id = auth.uid()) or (auth.uid() is null and user_id is null))
      and payment_status = 'unpaid'
      and status = 'pending'
    )
  );

-- Orders: Staff (kasir & admin) bisa mengubah status & detail pesanan
drop policy if exists "Admin can update orders" on public.orders;
drop policy if exists "Orders update policy" on public.orders;
create policy "Orders update policy"
  on public.orders for update
  using (public.is_staff())
  with check (public.is_staff());

-- Orders: Hanya admin yang bisa menghapus pesanan
drop policy if exists "Admin can delete orders" on public.orders;
drop policy if exists "Orders delete policy" on public.orders;
create policy "Orders delete policy"
  on public.orders for delete
  using (public.is_admin());

-- =============================================
-- Order Items RLS
-- =============================================
alter table public.order_items enable row level security;

-- Order Items: Dapat dibaca jika order induknya dapat dibaca
drop policy if exists "Users can read own order items" on public.order_items;
drop policy if exists "Order items select policy" on public.order_items;
create policy "Order items select policy"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and (
        (auth.uid() is not null and orders.user_id = auth.uid())
        or public.is_staff()
        or orders.user_id is null
      )
    )
  );

-- Order Items: Hanya bisa dimasukkan jika order induknya milik user yang sedang membuat pesanan
drop policy if exists "Users can create order items" on public.order_items;
drop policy if exists "Order items insert policy" on public.order_items;
create policy "Order items insert policy"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and (
        (auth.uid() is not null and orders.user_id = auth.uid())
        or orders.user_id is null
        or public.is_staff()
      )
    )
  );

-- Order Items: Staff bisa update, hanya admin yang bisa hapus
drop policy if exists "Admin can update order items" on public.order_items;
drop policy if exists "Order items update policy" on public.order_items;
create policy "Order items update policy"
  on public.order_items for update
  using (public.is_staff());

drop policy if exists "Admin can delete order items" on public.order_items;
drop policy if exists "Order items delete policy" on public.order_items;
create policy "Order items delete policy"
  on public.order_items for delete
  using (public.is_admin());
