-- Initial PostgreSQL schema for Arion (Phase 1)

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. White-label instance settings (singleton row id = 1)
create table public.instance_settings (
  id integer primary key default 1 check (id = 1),
  group_name text not null default 'Il Mio Coro',
  group_subtitle text,
  logo_path text,
  default_notation text not null default 'italian' check (default_notation in ('italian', 'english')),
  default_theme text not null default 'daylight' check (default_theme in ('daylight', 'stage_dark', 'oled_black')),
  updated_at timestamptz not null default now()
);

create trigger set_instance_settings_updated_at
  before update on public.instance_settings
  for each row execute function public.set_updated_at();

insert into public.instance_settings (id)
values (1)
on conflict (id) do nothing;

-- 2. Dynamic instruments and voices catalog
create table public.instruments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('voice', 'instrument')),
  default_view text not null check (default_view in ('lyrics_only', 'chords', 'pdf')),
  transposition_semitones smallint not null default 0 check (transposition_semitones between -11 and 11),
  supports_capo boolean not null default false,
  is_enabled boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_instruments_updated_at
  before update on public.instruments
  for each row execute function public.set_updated_at();

-- 3. Invite-only email whitelist
create table public.allowed_emails (
  id uuid primary key default gen_random_uuid(),
  email text unique not null check (email = lower(btrim(email))),
  role text not null check (role in ('admin', 'conductor', 'musician')),
  display_name text,
  default_instrument_ids uuid[] not null default '{}',
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_allowed_emails_updated_at
  before update on public.allowed_emails
  for each row execute function public.set_updated_at();

-- 4. User profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null check (email = lower(btrim(email))),
  display_name text not null,
  role text not null check (role in ('admin', 'conductor', 'musician')),
  is_active boolean not null default true,
  active_instrument_id uuid references public.instruments(id) on delete set null,
  preferred_notation text not null default 'italian' check (preferred_notation in ('italian', 'english')),
  preferred_theme text not null default 'daylight' check (preferred_theme in ('daylight', 'stage_dark', 'oled_black')),
  preferred_text_size text not null default 'compact' check (preferred_text_size in ('compact', 'extended')),
  font_scale numeric(3, 2) not null default 1.00 check (font_scale between 0.70 and 2.00),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 5. User <-> Instruments mapping
create table public.user_instruments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, instrument_id)
);

-- 6. Repertoire songs
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  author text,
  original_key text not null default 'Do',
  tempo_bpm smallint check (tempo_bpm is null or tempo_bpm between 20 and 300),
  time_signature text,
  tags text[] not null default '{}',
  chordpro_content text not null default '',
  conductor_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index songs_title_idx on public.songs (title);
create index songs_tags_gin_idx on public.songs using gin (tags);

create trigger set_songs_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- 7. Polymorphic song assets (PDF in Phase 1; MIDI/MusicXML ready for Phases 2-3)
create table public.song_assets (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  asset_type text not null check (asset_type in ('pdf', 'midi', 'musicxml')),
  title text not null,
  storage_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  instrument_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index song_assets_song_id_idx on public.song_assets (song_id, sort_order);

create trigger set_song_assets_updated_at
  before update on public.song_assets
  for each row execute function public.set_updated_at();

-- 8. Per-user per-song preferences (includes personal_notes ready for Phase 2)
create table public.user_song_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  capo_frets smallint not null default 0 check (capo_frets between 0 and 11),
  preferred_view text check (preferred_view is null or preferred_view in ('lyrics_only', 'chords', 'pdf')),
  preferred_asset_id uuid references public.song_assets(id) on delete set null,
  personal_notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create trigger set_user_song_preferences_updated_at
  before update on public.user_song_preferences
  for each row execute function public.set_updated_at();

-- 9. Setlists
create table public.setlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_setlists_updated_at
  before update on public.setlists
  for each row execute function public.set_updated_at();

-- 10. Setlist items
create table public.setlist_items (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null check (position >= 0),
  override_key text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint setlist_items_unique_position unique (setlist_id, position) deferrable initially deferred
);

create index setlist_items_setlist_pos_idx on public.setlist_items (setlist_id, position);

create trigger set_setlist_items_updated_at
  before update on public.setlist_items
  for each row execute function public.set_updated_at();

-- 11. Musical calendar events
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('rehearsal', 'concert', 'service', 'other')),
  event_date date not null,
  start_time time not null,
  end_time time,
  location text,
  setlist_id uuid references public.setlists(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_events_date_idx on public.calendar_events (event_date, start_time);

create trigger set_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- 12. Singleton Live session state (id = 1)
create table public.live_sessions (
  id integer primary key default 1 check (id = 1),
  is_active boolean not null default false,
  conductor_id uuid references public.profiles(id) on delete set null,
  setlist_id uuid references public.setlists(id) on delete set null,
  active_setlist_item_id uuid references public.setlist_items(id) on delete set null,
  active_song_id uuid references public.songs(id) on delete set null,
  active_key text,
  active_section_index integer,
  active_page integer,
  next_song_id uuid references public.songs(id) on delete set null,
  next_song_key text,
  flash_signal jsonb,
  updated_at timestamptz not null default now()
);

create trigger set_live_sessions_updated_at
  before update on public.live_sessions
  for each row execute function public.set_updated_at();

insert into public.live_sessions (id)
values (1)
on conflict (id) do nothing;
