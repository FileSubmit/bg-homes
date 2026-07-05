begin;

-- Contact card on the property detail page needs to show the poster's
-- name/phone/email. profiles has no email column (it only lives in
-- auth.users), and profiles RLS only allows a user to read their own row
-- (or an admin to read all) - a visitor viewing someone else's active
-- listing currently gets nulled-out owner columns on the embedded join.

alter table public.profiles add column if not exists email text;

update public.profiles profiles
set email = users.email
from auth.users users
where users.id = profiles.id
  and profiles.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_name_value text;
  last_name_value text;
  role_value public.profile_role;
begin
  first_name_value := coalesce(
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(split_part(coalesce(new.raw_user_meta_data->>'full_name', new.email), ' ', 1), ''),
    'User'
  );

  last_name_value := coalesce(
    nullif(new.raw_user_meta_data->>'last_name', ''),
    nullif(trim(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 2)), ''),
    'Member'
  );

  role_value := case
    when lower(coalesce(new.email, '')) = 'admin@bg-homes.local' then 'admin'
    else 'user'
  end;

  insert into public.profiles (id, first_name, last_name, phone, email, role)
  values (
    new.id,
    first_name_value,
    last_name_value,
    nullif(new.raw_user_meta_data->>'phone', ''),
    new.email,
    role_value
  )
  on conflict (id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        phone = excluded.phone,
        email = excluded.email,
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$;

grant select on public.profiles to anon;

create policy profiles_select_public_for_active_property_owners
on public.profiles
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.properties properties
    where properties.owner_id = profiles.id
      and properties.status = 'active'
  )
);

commit;
