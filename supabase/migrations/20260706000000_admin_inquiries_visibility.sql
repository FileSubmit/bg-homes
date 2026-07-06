begin;

-- The admin dashboard needs site-wide visibility into inquiries for stats
-- and moderation; previously only the property owner could see them.

create policy inquiries_select_admin_all
on public.inquiries
for select
to authenticated
using (public.current_user_is_admin());

commit;
