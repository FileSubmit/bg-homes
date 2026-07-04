begin;

create extension if not exists pgcrypto;

create type public.profile_role as enum ('user', 'admin');
create type public.transaction_type as enum ('sale', 'rent');
create type public.property_status as enum ('active', 'archived', 'sold');
create type public.inquiry_status as enum ('unread', 'read', 'replied');
create type public.property_type as enum (
  'apartment',
  'house',
  'villa',
  'studio',
  'office',
  'store',
  'land',
  'garage',
  'other'
);
create type public.construction_type as enum (
  'brick',
  'panel',
  'epk',
  'tuf',
  'mixed',
  'other'
);
create type public.construction_stage as enum (
  'project',
  'rough_construction',
  'act_14',
  'act_15',
  'act_16',
  'turnkey',
  'renovated',
  'other'
);
create type public.heating_type as enum (
  'central',
  'electric',
  'gas',
  'air_conditioning',
  'pellet',
  'wood',
  'other'
);
create type public.furnishing_type as enum ('unfurnished', 'partially_furnished', 'furnished');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  role public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
as $$
  select case
    when auth.uid() is null then false
    else exists (
      select 1
      from public.profiles profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  end;
$$;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  transaction_type public.transaction_type not null,
  property_type public.property_type not null,
  price numeric(14, 2) not null check (price >= 0),
  currency char(3) not null,
  region text not null,
  city text not null,
  neighborhood text,
  address text not null,
  map_coordinates point,
  net_area numeric(10, 2) check (net_area > 0),
  gross_area numeric(10, 2) check (gross_area > 0),
  bedrooms smallint check (bedrooms >= 0),
  bathrooms numeric(4, 1) check (bathrooms >= 0),
  floor smallint,
  total_floors smallint check (total_floors > 0),
  construction_type public.construction_type,
  construction_year smallint check (construction_year between 1800 and extract(year from now())::int + 1),
  construction_stage public.construction_stage,
  heating public.heating_type,
  furnishing public.furnishing_type,
  description text,
  status public.property_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  photo_url text not null,
  display_order integer not null default 0 check (display_order >= 0),
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_photos_display_order_unique unique (property_id, display_order)
);

create table public.features (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_features (
  property_id uuid not null references public.properties (id) on delete cascade,
  feature_id uuid not null references public.features (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (property_id, feature_id)
);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_name text not null,
  sender_phone text not null,
  sender_email text not null,
  message text not null,
  status public.inquiry_status not null default 'unread',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

create index properties_owner_id_idx on public.properties (owner_id);
create index properties_status_idx on public.properties (status);
create index properties_transaction_type_idx on public.properties (transaction_type);
create index properties_status_transaction_type_idx on public.properties (status, transaction_type);
create index properties_region_city_neighborhood_idx on public.properties (region, city, neighborhood);
create index properties_price_idx on public.properties (price);

create index property_photos_property_id_idx on public.property_photos (property_id);
create index property_photos_property_id_display_order_idx on public.property_photos (property_id, display_order);
create unique index property_photos_cover_unique_idx on public.property_photos (property_id)
where is_cover;

create index features_name_idx on public.features (name);

create index property_features_feature_id_idx on public.property_features (feature_id);

create index favorites_user_id_idx on public.favorites (user_id);
create index favorites_property_id_idx on public.favorites (property_id);

create index inquiries_property_id_idx on public.inquiries (property_id);
create index inquiries_sender_id_idx on public.inquiries (sender_id);
create index inquiries_status_idx on public.inquiries (status);
create index inquiries_property_status_idx on public.inquiries (property_id, status);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_properties_updated_at
before update on public.properties
for each row
execute function public.set_updated_at();

create trigger set_property_photos_updated_at
before update on public.property_photos
for each row
execute function public.set_updated_at();

create trigger set_features_updated_at
before update on public.features
for each row
execute function public.set_updated_at();

create trigger set_property_features_updated_at
before update on public.property_features
for each row
execute function public.set_updated_at();

create trigger set_favorites_updated_at
before update on public.favorites
for each row
execute function public.set_updated_at();

create trigger set_inquiries_updated_at
before update on public.inquiries
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_photos enable row level security;
alter table public.features enable row level security;
alter table public.property_features enable row level security;
alter table public.favorites enable row level security;
alter table public.inquiries enable row level security;

alter table public.profiles force row level security;
alter table public.properties force row level security;
alter table public.property_photos force row level security;
alter table public.features force row level security;
alter table public.property_features force row level security;
alter table public.favorites force row level security;
alter table public.inquiries force row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
revoke update (role) on public.profiles from authenticated;

grant select on public.properties to anon;
grant select on public.property_photos to anon;
grant select on public.features to anon;
grant select on public.property_features to anon;
grant insert on public.inquiries to anon;

grant select, insert, update, delete on public.properties to authenticated;
grant select, insert, update, delete on public.property_photos to authenticated;
grant select, insert, update, delete on public.features to authenticated;
grant select, insert, update, delete on public.property_features to authenticated;
grant select, insert, update, delete on public.favorites to authenticated;
grant select, insert, update, delete on public.inquiries to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and role = 'user');

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using (id = auth.uid());

create policy properties_select_public_or_owner
on public.properties
for select
to anon, authenticated
using (
  status = 'active'
  or owner_id = auth.uid()
  or public.current_user_is_admin()
);

create policy properties_insert_owner_or_admin
on public.properties
for insert
to authenticated
with check (
  owner_id = auth.uid()
  or public.current_user_is_admin()
);

create policy properties_update_owner_or_admin
on public.properties
for update
to authenticated
using (
  owner_id = auth.uid()
  or public.current_user_is_admin()
)
with check (
  owner_id = auth.uid()
  or public.current_user_is_admin()
);

create policy properties_delete_owner_or_admin
on public.properties
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.current_user_is_admin()
);

create policy property_photos_select_public_or_owner
on public.property_photos
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.status = 'active'
        or properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

create policy property_photos_insert_owner_or_admin
on public.property_photos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

create policy property_photos_update_owner_or_admin
on public.property_photos
for update
to authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

create policy property_photos_delete_owner_or_admin
on public.property_photos
for delete
to authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

create policy features_select_public
on public.features
for select
to anon, authenticated
using (true);

create policy features_insert_admin_only
on public.features
for insert
to authenticated
with check (public.current_user_is_admin());

create policy features_update_admin_only
on public.features
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy features_delete_admin_only
on public.features
for delete
to authenticated
using (public.current_user_is_admin());

create policy property_features_select_public_or_owner
on public.property_features
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.status = 'active'
        or properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

create policy property_features_insert_owner_or_admin
on public.property_features
for insert
to authenticated
with check (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

create policy property_features_update_owner_or_admin
on public.property_features
for update
to authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
)
with check (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

create policy property_features_delete_owner_or_admin
on public.property_features
for delete
to authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and (
        properties.owner_id = auth.uid()
        or public.current_user_is_admin()
      )
  )
);

create policy favorites_select_own
on public.favorites
for select
to authenticated
using (user_id = auth.uid());

create policy favorites_insert_own
on public.favorites
for insert
to authenticated
with check (user_id = auth.uid());

create policy favorites_update_own
on public.favorites
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy favorites_delete_own
on public.favorites
for delete
to authenticated
using (user_id = auth.uid());

create policy inquiries_insert_public
on public.inquiries
for insert
to anon, authenticated
with check (sender_id is null or sender_id = auth.uid());

create policy inquiries_select_owner_only
on public.inquiries
for select
to authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and properties.owner_id = auth.uid()
  )
);

create policy inquiries_update_owner_only
on public.inquiries
for update
to authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and properties.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and properties.owner_id = auth.uid()
  )
);

create policy inquiries_delete_owner_only
on public.inquiries
for delete
to authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and properties.owner_id = auth.uid()
  )
);

commit;