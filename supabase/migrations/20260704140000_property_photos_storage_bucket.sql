begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy property_photos_storage_select_public
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'property-photos');

create policy property_photos_storage_insert_own_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy property_photos_storage_update_own_folder
on storage.objects
for update
to authenticated
using (
  bucket_id = 'property-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_is_admin()
  )
)
with check (
  bucket_id = 'property-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_is_admin()
  )
);

create policy property_photos_storage_delete_own_folder
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'property-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_is_admin()
  )
);

commit;
