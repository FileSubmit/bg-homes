begin;

-- Bug fix: current_user_is_admin() queries public.profiles without bypassing
-- RLS. Once profiles_select_admin_all (migration 20260704010000) was applied,
-- any select on public.profiles started recursing infinitely: evaluating the
-- admin policy calls current_user_is_admin(), which selects from profiles,
-- which re-evaluates the same admin policy, and so on, until Postgres aborts
-- with "stack depth limit exceeded" (verified live against the project).
--
-- Fix: make the helper SECURITY DEFINER with a pinned search_path so its
-- internal lookup runs as the function owner (bypassing RLS) instead of
-- re-entering the calling role's RLS-checked view of profiles.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
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

commit;
