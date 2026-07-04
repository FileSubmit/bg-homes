begin;

-- Security fix: a column-level REVOKE does not undo a table-level GRANT.
-- "revoke update (role) ... from authenticated" in the initial schema left the
-- table-level UPDATE grant intact, so any signed-in user could still set
-- role = 'admin' on their own profile row (verified against the live API).
-- Replace the blanket UPDATE grant with an explicit safe column list.

revoke update on public.profiles from authenticated;

grant update (first_name, last_name, phone) on public.profiles to authenticated;

commit;
