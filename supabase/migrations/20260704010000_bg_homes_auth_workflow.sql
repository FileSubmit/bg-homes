begin;

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

  insert into public.profiles (id, first_name, last_name, phone, role)
  values (
    new.id,
    first_name_value,
    last_name_value,
    nullif(new.raw_user_meta_data->>'phone', ''),
    role_value
  )
  on conflict (id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        phone = excluded.phone,
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop policy if exists profiles_select_admin_all on public.profiles;

create policy profiles_select_admin_all
on public.profiles
for select
to authenticated
using (public.current_user_is_admin());

commit;