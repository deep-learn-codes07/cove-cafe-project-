-- ============================================================
-- COVE CAFE COMPLETE SUPABASE SCHEMA
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- CLEAN OLD TABLES (SAFE FOR NEW PROJECTS)
-- ============================================================

drop table if exists public.menu_items cascade;
drop table if exists public.subcategories cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;
drop policy "public read images" on storage.objects;
drop policy if exists "public read images" on storage.objects;
drop policy if exists "auth upload images" on storage.objects;
drop policy if exists "auth update images" on storage.objects;
drop policy if exists "auth delete images" on storage.objects;

-- ============================================================
-- CATEGORIES
-- ============================================================

create table public.categories (
id uuid primary key default gen_random_uuid(),
name text not null unique,
image_url text,
display_order integer not null default 0,
created_at timestamptz not null default now()
);

-- ============================================================
-- SUBCATEGORIES
-- ============================================================

create table public.subcategories (
id uuid primary key default gen_random_uuid(),

category_id uuid not null
references public.categories(id)
on delete cascade,

name text not null,

image_url text,

display_order integer not null default 0,

created_at timestamptz not null default now()
);

create index subcategories_category_idx
on public.subcategories(category_id);

-- ============================================================
-- MENU ITEMS
-- ============================================================

create table public.menu_items (
id uuid primary key default gen_random_uuid(),

subcategory_id uuid not null
references public.subcategories(id)
on delete cascade,

name text not null,

description text,

ingredients text,

allergens text,

price numeric(10,2) not null default 0,

image_url text,

is_available boolean not null default true,

is_bestseller boolean not null default false,

is_veg boolean not null default true,

display_order integer not null default 0,

created_at timestamptz not null default now()
);

create index menu_items_subcategory_idx
on public.menu_items(subcategory_id);

-- ============================================================
-- USER PROFILES
-- ============================================================

create table public.profiles (
id uuid primary key references auth.users(id) on delete cascade,

email text,

full_name text,

phone text,

provider text,

last_sign_in_at timestamptz,

created_at timestamptz not null default now(),

updated_at timestamptz not null default now()
);

-- ============================================================
-- UPDATED AT FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
new.updated_at = now();
return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- ============================================================
-- CREATE PROFILE AUTOMATICALLY AFTER SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

insert into public.profiles (
id,
email,
full_name,
phone,
provider
)
values (
new.id,
new.email,
coalesce(
new.raw_user_meta_data->>'full_name',
new.raw_user_meta_data->>'name'
),
coalesce(
new.phone,
new.raw_user_meta_data->>'phone'
),
coalesce(
new.raw_app_meta_data->>'provider',
'email'
)
)
on conflict (id) do nothing;

return new;

end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.menu_items enable row level security;
alter table public.profiles enable row level security;

-- ============================================================
-- PUBLIC MENU ACCESS
-- ============================================================

create policy "public read categories"
on public.categories
for select
using (true);

create policy "public read subcategories"
on public.subcategories
for select
using (true);

create policy "public read menu_items"
on public.menu_items
for select
using (true);

-- ============================================================
-- PROFILE POLICIES
-- ============================================================

create policy "users read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "users update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- ============================================================
-- ADMIN POLICIES
-- ============================================================

create policy "auth manage categories"
on public.categories
for all
to authenticated
using (true)
with check (true);

create policy "auth manage subcategories"
on public.subcategories
for all
to authenticated
using (true)
with check (true);

create policy "auth manage menu_items"
on public.menu_items
for all
to authenticated
using (true)
with check (true);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

insert into storage.buckets (
id,
name,
public
)
values (
'menu-images',
'menu-images',
true
)
on conflict do nothing;

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

create policy "public read images"
on storage.objects
for select
using (bucket_id = 'menu-images');

create policy "auth upload images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'menu-images');

create policy "auth update images"
on storage.objects
for update
to authenticated
using (bucket_id = 'menu-images')
with check (bucket_id = 'menu-images');

create policy "auth delete images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'menu-images');

-- ============================================================
-- DEFAULT CATEGORIES
-- ============================================================

insert into public.categories
(name, display_order)
values
('newly launched',1),
('match',2),
('food',3),
('Beverages',4),
('Mango Special',5),
('Desserts',6)
on conflict (name) do nothing;
