  -- ============================================================
  -- cove Cafe — Supabase schema
  -- Run this in Supabase SQL editor.
  -- ============================================================

  create extension if not exists "pgcrypto";

  -- Categories
  create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    icon text,
    display_order int not null default 0,
    created_at timestamptz not null default now()
  );

  -- Menu items
  create table if not exists public.menu_items (
    id uuid primary key default gen_random_uuid(),
    category_id uuid references public.categories(id) on delete set null,
    name text not null,
    description text,
    ingredients text,
    allergens text,
    price numeric(10,2) not null default 0,
    image_url text,
    is_available boolean not null default true,
    is_bestseller boolean not null default false,
    is_veg boolean not null default true,
    created_at timestamptz not null default now()
  );

  create index if not exists menu_items_category_idx on public.menu_items (category_id);

  -- Enable RLS
  alter table public.categories enable row level security;
  alter table public.menu_items enable row level security;

  -- Public read for the menu
  drop policy if exists "public read categories" on public.categories;
  create policy "public read categories" on public.categories
    for select using (true);

  drop policy if exists "public read menu_items" on public.menu_items;
  create policy "public read menu_items" on public.menu_items
    for select using (true);

  -- Authenticated full access (admin uses Supabase Auth)
  drop policy if exists "auth manage categories" on public.categories;
  create policy "auth manage categories" on public.categories
    for all to authenticated using (true) with check (true);

  drop policy if exists "auth manage menu_items" on public.menu_items;
  create policy "auth manage menu_items" on public.menu_items
    for all to authenticated using (true) with check (true);

  -- Storage bucket (run via dashboard if needed)
  insert into storage.buckets (id, name, public) values ('menu-images','menu-images',true)
    on conflict do nothing;

  -- Storage policies (allow public read, authenticated write)
  drop policy if exists "public read images" on storage.objects;
  create policy "public read images" on storage.objects
    for select using (bucket_id = 'menu-images');

  drop policy if exists "auth upload images" on storage.objects;
  create policy "auth upload images" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'menu-images');

  drop policy if exists "auth update images" on storage.objects;
  create policy "auth update images" on storage.objects
    for update to authenticated
    using (bucket_id = 'menu-images')
    with check (bucket_id = 'menu-images');

  drop policy if exists "auth delete images" on storage.objects;
  create policy "auth delete images" on storage.objects
    for delete to authenticated
    using (bucket_id = 'menu-images');

  -- Seed categories
  insert into public.categories (name, icon, display_order) values
    ('newly launched ','☕',1),
    ('Beverages','🍵',2),
    ('special','🥤',3),
    ('food','🍹',4),
    ('Desserts','🍰',5)

  on conflict do nothing;
