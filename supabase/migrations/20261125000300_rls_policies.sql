-- Explicit default-deny Row Level Security policies for all public tables

alter table public.instance_settings enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.profiles enable row level security;
alter table public.instruments enable row level security;
alter table public.user_instruments enable row level security;
alter table public.user_song_preferences enable row level security;
alter table public.songs enable row level security;
alter table public.song_assets enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_items enable row level security;
alter table public.calendar_events enable row level security;
alter table public.live_sessions enable row level security;

-- 1. instance_settings (singleton)
create policy "Active users can read instance settings"
  on public.instance_settings for select
  to authenticated
  using (public.is_active_user());

create policy "Deny direct insert on instance settings"
  on public.instance_settings for insert
  to authenticated
  with check (false);

create policy "Admins can update instance settings"
  on public.instance_settings for update
  to authenticated
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

create policy "Deny delete on instance settings"
  on public.instance_settings for delete
  to authenticated
  using (false);

-- 2. allowed_emails (admin only)
create policy "Admins can read allowed emails"
  on public.allowed_emails for select
  to authenticated
  using (public.has_any_role(array['admin']));

create policy "Admins can insert allowed emails"
  on public.allowed_emails for insert
  to authenticated
  with check (public.has_any_role(array['admin']));

create policy "Admins can update allowed emails"
  on public.allowed_emails for update
  to authenticated
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

create policy "Admins can delete allowed emails"
  on public.allowed_emails for delete
  to authenticated
  using (public.has_any_role(array['admin']));

-- 3. profiles
create policy "Active users can read profiles"
  on public.profiles for select
  to authenticated
  using (public.is_active_user());

create policy "Admins can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (public.has_any_role(array['admin']));

create policy "Users can update own profile and admins can update any profile"
  on public.profiles for update
  to authenticated
  using (
    public.is_active_user()
    and (id = auth.uid() or public.has_any_role(array['admin']))
  )
  with check (
    public.is_active_user()
    and (id = auth.uid() or public.has_any_role(array['admin']))
  );

create policy "Admins can delete profiles"
  on public.profiles for delete
  to authenticated
  using (public.has_any_role(array['admin']));

-- 4. instruments
create policy "Active users can read enabled instruments and admins read all"
  on public.instruments for select
  to authenticated
  using (
    public.is_active_user()
    and (is_enabled = true or public.has_any_role(array['admin']))
  );

create policy "Admins can insert instruments"
  on public.instruments for insert
  to authenticated
  with check (public.has_any_role(array['admin']));

create policy "Admins can update instruments"
  on public.instruments for update
  to authenticated
  using (public.has_any_role(array['admin']))
  with check (public.has_any_role(array['admin']));

create policy "Admins can delete instruments"
  on public.instruments for delete
  to authenticated
  using (public.has_any_role(array['admin']));

-- 5. user_instruments
create policy "Active users can read user instruments"
  on public.user_instruments for select
  to authenticated
  using (public.is_active_user());

create policy "Users manage own instruments and admins manage all"
  on public.user_instruments for insert
  to authenticated
  with check (
    public.is_active_user()
    and (user_id = auth.uid() or public.has_any_role(array['admin']))
  );

create policy "Users update own instruments and admins update all"
  on public.user_instruments for update
  to authenticated
  using (
    public.is_active_user()
    and (user_id = auth.uid() or public.has_any_role(array['admin']))
  )
  with check (
    public.is_active_user()
    and (user_id = auth.uid() or public.has_any_role(array['admin']))
  );

create policy "Users delete own instruments and admins delete all"
  on public.user_instruments for delete
  to authenticated
  using (
    public.is_active_user()
    and (user_id = auth.uid() or public.has_any_role(array['admin']))
  );

-- 6. user_song_preferences (strictly private per user)
create policy "Users read own song preferences"
  on public.user_song_preferences for select
  to authenticated
  using (public.is_active_user() and user_id = auth.uid());

create policy "Users insert own song preferences"
  on public.user_song_preferences for insert
  to authenticated
  with check (public.is_active_user() and user_id = auth.uid());

create policy "Users update own song preferences"
  on public.user_song_preferences for update
  to authenticated
  using (public.is_active_user() and user_id = auth.uid())
  with check (public.is_active_user() and user_id = auth.uid());

create policy "Users delete own song preferences"
  on public.user_song_preferences for delete
  to authenticated
  using (public.is_active_user() and user_id = auth.uid());

-- 7. songs
create policy "Active users can read songs"
  on public.songs for select
  to authenticated
  using (public.is_active_user());

create policy "Conductors and admins can insert songs"
  on public.songs for insert
  to authenticated
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can update songs"
  on public.songs for update
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']))
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can delete songs"
  on public.songs for delete
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']));

-- 8. song_assets
create policy "Active users can read song assets"
  on public.song_assets for select
  to authenticated
  using (public.is_active_user());

create policy "Conductors and admins can insert song assets"
  on public.song_assets for insert
  to authenticated
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can update song assets"
  on public.song_assets for update
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']))
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can delete song assets"
  on public.song_assets for delete
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']));

-- 9. setlists
create policy "Active users can read setlists"
  on public.setlists for select
  to authenticated
  using (public.is_active_user());

create policy "Conductors and admins can insert setlists"
  on public.setlists for insert
  to authenticated
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can update setlists"
  on public.setlists for update
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']))
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can delete setlists"
  on public.setlists for delete
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']));

-- 10. setlist_items
create policy "Active users can read setlist items"
  on public.setlist_items for select
  to authenticated
  using (public.is_active_user());

create policy "Conductors and admins can insert setlist items"
  on public.setlist_items for insert
  to authenticated
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can update setlist items"
  on public.setlist_items for update
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']))
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can delete setlist items"
  on public.setlist_items for delete
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']));

-- 11. calendar_events
create policy "Active users can read calendar events"
  on public.calendar_events for select
  to authenticated
  using (public.is_active_user());

create policy "Conductors and admins can insert calendar events"
  on public.calendar_events for insert
  to authenticated
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can update calendar events"
  on public.calendar_events for update
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']))
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Conductors and admins can delete calendar events"
  on public.calendar_events for delete
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']));

-- 12. live_sessions (singleton)
create policy "Active users can read live session"
  on public.live_sessions for select
  to authenticated
  using (public.is_active_user());

create policy "Deny direct insert on live session"
  on public.live_sessions for insert
  to authenticated
  with check (false);

create policy "Conductors and admins can update live session"
  on public.live_sessions for update
  to authenticated
  using (public.has_any_role(array['admin', 'conductor']))
  with check (public.has_any_role(array['admin', 'conductor']));

create policy "Deny delete on live session"
  on public.live_sessions for delete
  to authenticated
  using (false);
