-- Private storage buckets. Objects live under "<user_id>/…" and policies enforce that prefix.
-- Database RLS does NOT protect storage objects, so these policies are required.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('analytics-uploads', 'analytics-uploads', false, 4194304, array['image/png','image/jpeg','image/webp']),
  ('avatars', 'avatars', false, 1048576, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
declare b text;
begin
  foreach b in array array['analytics-uploads','avatars']
  loop
    execute format($f$create policy %I on storage.objects for select to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$f$, b || '_select_own', b);
    execute format($f$create policy %I on storage.objects for insert to authenticated
      with check (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$f$, b || '_insert_own', b);
    execute format($f$create policy %I on storage.objects for update to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)
      with check (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$f$, b || '_update_own', b, b);
    execute format($f$create policy %I on storage.objects for delete to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$f$, b || '_delete_own', b);
  end loop;
end $$;
