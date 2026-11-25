-- Add instance-configurable technical support email and atomic setlist item reordering RPC

alter table public.instance_settings
  add column if not exists support_email text;

alter table public.instance_settings
  drop constraint if exists instance_settings_support_email_check;

alter table public.instance_settings
  add constraint instance_settings_support_email_check
  check (
    support_email is null
    or (length(btrim(support_email)) > 3 and position('@' in support_email) > 1)
  );

create or replace function public.reorder_setlist_items(
  p_setlist_id uuid,
  p_item_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.has_any_role(array['admin', 'conductor']) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if p_item_ids is null or coalesce(array_length(p_item_ids, 1), 0) = 0 then
    return;
  end if;

  update public.setlist_items as si
  set position = ord.new_pos
  from (
    select item_id, (ordinality - 1)::integer as new_pos
    from unnest(p_item_ids) with ordinality as u(item_id, ordinality)
  ) as ord
  where si.setlist_id = p_setlist_id
    and si.id = ord.item_id;
end;
$$;

revoke all on function public.reorder_setlist_items(uuid, uuid[]) from anon;
grant execute on function public.reorder_setlist_items(uuid, uuid[]) to authenticated, service_role;
