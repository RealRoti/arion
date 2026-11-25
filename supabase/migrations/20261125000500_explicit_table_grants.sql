-- Explicit PostgreSQL role grants for hosted Supabase Cloud (where public tables are not auto-exposed)
-- Defense-in-depth: anon receives zero access to public tables (Arion is strictly invite-only).
-- authenticated and service_role receive explicit table grants; row-level authorization is enforced by RLS.

grant usage on schema public to authenticated, service_role;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Singleton tables (RLS allows SELECT and privileged UPDATE only; never direct INSERT/DELETE)
revoke all on table public.instance_settings from authenticated;
grant select, update on table public.instance_settings to authenticated;

revoke all on table public.live_sessions from authenticated;
grant select, update on table public.live_sessions to authenticated;

-- Operational tables (row-level authorization enforced by RLS policies)
grant select, insert, update, delete on table
  public.instruments,
  public.allowed_emails,
  public.profiles,
  public.user_instruments,
  public.songs,
  public.song_assets,
  public.user_song_preferences,
  public.setlists,
  public.setlist_items,
  public.calendar_events
to authenticated;

-- Full table privileges for service_role (admin/seed/maintenance operations)
grant select, insert, update, delete on table
  public.instance_settings,
  public.instruments,
  public.allowed_emails,
  public.profiles,
  public.user_instruments,
  public.songs,
  public.song_assets,
  public.user_song_preferences,
  public.setlists,
  public.setlist_items,
  public.calendar_events,
  public.live_sessions
to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

grant execute on function public.is_active_user() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.has_any_role(text[]) to authenticated, service_role;
