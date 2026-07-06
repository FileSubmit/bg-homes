begin;

-- In-app messaging between users, started from a property listing: a buyer
-- messages the property owner; both can keep replying in the same thread.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_participants_distinct check (buyer_id <> owner_id),
  constraint conversations_thread_unique unique (property_id, buyer_id, owner_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index conversations_buyer_id_idx on public.conversations (buyer_id);
create index conversations_owner_id_idx on public.conversations (owner_id);
create index conversations_property_id_idx on public.conversations (property_id);
create index conversations_updated_at_idx on public.conversations (updated_at desc);

create index messages_conversation_id_idx on public.messages (conversation_id);
create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);
create index messages_unread_lookup_idx on public.messages (conversation_id, sender_id) where read_at is null;

create trigger set_conversations_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

-- Bumps the parent conversation's updated_at whenever a new message arrives,
-- so conversation lists can sort by latest activity. Runs as the function
-- owner (bypassing RLS/grants) since authenticated users have no UPDATE
-- grant on conversations.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

create trigger touch_conversation_after_message
after insert on public.messages
for each row
execute function public.touch_conversation_on_message();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

alter table public.conversations force row level security;
alter table public.messages force row level security;

grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

create policy conversations_select_participant
on public.conversations
for select
to authenticated
using (buyer_id = auth.uid() or owner_id = auth.uid());

create policy conversations_insert_buyer
on public.conversations
for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and owner_id <> auth.uid()
  and exists (
    select 1
    from public.properties properties
    where properties.id = property_id
      and properties.owner_id = owner_id
  )
);

create policy messages_select_participant
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations conversations
    where conversations.id = conversation_id
      and (conversations.buyer_id = auth.uid() or conversations.owner_id = auth.uid())
  )
);

create policy messages_insert_participant
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversations conversations
    where conversations.id = conversation_id
      and (conversations.buyer_id = auth.uid() or conversations.owner_id = auth.uid())
  )
);

create policy messages_update_mark_read
on public.messages
for update
to authenticated
using (
  sender_id <> auth.uid()
  and exists (
    select 1
    from public.conversations conversations
    where conversations.id = conversation_id
      and (conversations.buyer_id = auth.uid() or conversations.owner_id = auth.uid())
  )
)
with check (
  sender_id <> auth.uid()
  and exists (
    select 1
    from public.conversations conversations
    where conversations.id = conversation_id
      and (conversations.buyer_id = auth.uid() or conversations.owner_id = auth.uid())
  )
);

commit;
