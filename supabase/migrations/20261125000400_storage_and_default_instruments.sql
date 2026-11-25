-- Private Storage buckets, Storage RLS policies and default generic instruments catalog

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'song-assets',
  'song-assets',
  false,
  26214400, -- 25 MiB
  array[
    'application/pdf',
    'audio/midi',
    'audio/x-midi',
    'application/xml',
    'text/xml',
    'application/vnd.recordare.musicxml+xml',
    'application/vnd.recordare.musicxml'
  ]
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'instance-branding',
  'instance-branding',
  false,
  5242880, -- 5 MiB
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml'
  ]
)
on conflict (id) do nothing;

-- Storage RLS policies on storage.objects for song-assets
create policy "Active users can read song assets storage"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'song-assets' and public.is_active_user());

create policy "Conductors and admins can upload song assets storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'song-assets'
    and public.has_any_role(array['admin', 'conductor'])
  );

create policy "Conductors and admins can update song assets storage"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'song-assets'
    and public.has_any_role(array['admin', 'conductor'])
  )
  with check (
    bucket_id = 'song-assets'
    and public.has_any_role(array['admin', 'conductor'])
  );

create policy "Conductors and admins can delete song assets storage"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'song-assets'
    and public.has_any_role(array['admin', 'conductor'])
  );

-- Storage RLS policies on storage.objects for instance-branding
create policy "Active users can read instance branding storage"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'instance-branding' and public.is_active_user());

create policy "Admins can upload instance branding storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'instance-branding'
    and public.has_any_role(array['admin'])
  );

create policy "Admins can update instance branding storage"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'instance-branding'
    and public.has_any_role(array['admin'])
  )
  with check (
    bucket_id = 'instance-branding'
    and public.has_any_role(array['admin'])
  );

create policy "Admins can delete instance branding storage"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'instance-branding'
    and public.has_any_role(array['admin'])
  );

-- Default generic voices & instruments catalog (Admin can enable/disable or extend anytime)
insert into public.instruments (
  slug,
  name,
  category,
  default_view,
  transposition_semitones,
  supports_capo,
  is_enabled,
  sort_order
)
values
  ('voce', 'Voce / Corista', 'voice', 'lyrics_only', 0, false, true, 10),
  ('soprano', 'Soprano', 'voice', 'lyrics_only', 0, false, true, 20),
  ('contralto', 'Contralto', 'voice', 'lyrics_only', 0, false, true, 30),
  ('tenore', 'Tenore', 'voice', 'lyrics_only', 0, false, true, 40),
  ('basso', 'Basso', 'voice', 'lyrics_only', 0, false, true, 50),
  ('chitarra', 'Chitarra', 'instrument', 'chords', 0, true, true, 60),
  ('tastiera-organo', 'Tastiera / Organo', 'instrument', 'pdf', 0, false, true, 70),
  ('pianoforte', 'Pianoforte', 'instrument', 'pdf', 0, false, true, 80),
  ('violino', 'Violino', 'instrument', 'pdf', 0, false, true, 90),
  ('flauto', 'Flauto', 'instrument', 'pdf', 0, false, true, 100),
  ('clarinetto-sib', 'Clarinetto in Sib', 'instrument', 'pdf', 2, false, false, 110),
  ('sax-contralto-mib', 'Sax Contralto in Mib', 'instrument', 'pdf', -3, false, false, 120),
  ('percussioni', 'Percussioni', 'instrument', 'chords', 0, false, false, 130)
on conflict (slug) do nothing;
