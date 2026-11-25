-- Security helpers, invite-only signup gate, profile provisioning and anti-escalation guards

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

create or replace function public.has_any_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any(allowed_roles), false);
$$;

-- Enforce invite-only access against public.allowed_emails before user creation in auth.users
create or replace function public.enforce_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := lower(btrim(coalesce(new.email, '')));

  if v_email = '' then
    raise exception 'Email address is required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.allowed_emails ae
    where ae.email = v_email
      and ae.is_active = true
  ) then
    raise exception 'Email is not authorized in allowed_emails'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger on_auth_user_check_allowed_email
  before insert on auth.users
  for each row execute function public.enforce_allowed_email();

-- Auto-provision public.profiles and user_instruments from allowed_emails after user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_allowed public.allowed_emails%rowtype;
  v_settings public.instance_settings%rowtype;
  v_display_name text;
  v_primary_instrument_id uuid;
begin
  v_email := lower(btrim(new.email));

  select *
  into v_allowed
  from public.allowed_emails
  where email = v_email
  limit 1;

  if not found then
    raise exception 'Missing allowed_emails entry for %', v_email
      using errcode = '42501';
  end if;

  select *
  into v_settings
  from public.instance_settings
  where id = 1;

  v_display_name := coalesce(
    nullif(btrim(v_allowed.display_name), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(v_email, '@', 1)
  );

  select i.id
  into v_primary_instrument_id
  from public.instruments i
  where i.id = any(v_allowed.default_instrument_ids)
    and i.is_enabled = true
  order by array_position(v_allowed.default_instrument_ids, i.id)
  limit 1;

  insert into public.profiles (
    id,
    email,
    display_name,
    role,
    is_active,
    active_instrument_id,
    preferred_notation,
    preferred_theme
  )
  values (
    new.id,
    v_email,
    v_display_name,
    v_allowed.role,
    v_allowed.is_active,
    v_primary_instrument_id,
    coalesce(v_settings.default_notation, 'italian'),
    coalesce(v_settings.default_theme, 'daylight')
  )
  on conflict (id) do nothing;

  insert into public.user_instruments (user_id, instrument_id, is_primary)
  select
    new.id,
    i.id,
    (i.id = v_primary_instrument_id)
  from public.instruments i
  where i.id = any(v_allowed.default_instrument_ids)
  on conflict (user_id, instrument_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent non-admin users from altering privileged profile columns (role, is_active, email)
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.has_any_role(array['admin']) then
    if new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email then
      raise exception 'Only administrators can modify role, active status or email'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger before_profile_update_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- Anti-lockout guard: prevent deleting, demoting or deactivating the last active admin
create or replace function public.guard_last_active_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_active_admin boolean;
  v_stays_active_admin boolean;
begin
  v_was_active_admin := (old.role = 'admin' and old.is_active = true);

  if not v_was_active_admin then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    v_stays_active_admin := false;
  else
    v_stays_active_admin := (new.role = 'admin' and new.is_active = true);
  end if;

  if not v_stays_active_admin then
    if not exists (
      select 1
      from public.profiles p
      where p.id <> old.id
        and p.role = 'admin'
        and p.is_active = true
    ) then
      raise exception 'Cannot remove or demote the last active admin'
        using errcode = 'P0001';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger before_profile_change_guard_last_admin
  before update or delete on public.profiles
  for each row execute function public.guard_last_active_admin();
