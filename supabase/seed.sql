-- Local development seed for Arion (STRICTLY generic placeholders only)

insert into public.allowed_emails (email, role, display_name, is_active)
values
  ('admin@arion.local', 'admin', 'Admin Demo', true),
  ('maestro@arion.local', 'conductor', 'Maestro Demo', true),
  ('musicista@arion.local', 'musician', 'Musicista Demo', true)
on conflict (email) do nothing;

-- Attach default instruments to demo whitelist entries
update public.allowed_emails
set default_instrument_ids = array(
  select id from public.instruments where slug in ('tastiera-organo')
)
where email = 'admin@arion.local';

update public.allowed_emails
set default_instrument_ids = array(
  select id from public.instruments where slug in ('chitarra', 'tastiera-organo')
)
where email = 'maestro@arion.local';

update public.allowed_emails
set default_instrument_ids = array(
  select id from public.instruments where slug in ('voce', 'soprano')
)
where email = 'musicista@arion.local';

-- Demo public-domain / fictional songs
insert into public.songs (
  id,
  title,
  subtitle,
  author,
  original_key,
  tempo_bpm,
  time_signature,
  tags,
  chordpro_content,
  conductor_notes
)
values
  (
    '11111111-1111-4111-8111-111111111101',
    'Canto di Prova',
    'Brano dimostrativo',
    'Tradizionale',
    'Do',
    92,
    '4/4',
    array['Ingresso', 'Assemblea'],
    E'{title: Canto di Prova}\n{key: Do}\n{sov: Strofa 1}\n[Do]Canta con gioia, [Sol/Si]apri la tua [Lam]voce,\n[Fa]ogni nota in[Sol]sieme trova [Do]armonia.\n{eov}\n{soc: Ritornello}\n[Fa]Sali in alto [Sol]su quest’onda [Do]chiara,\n[Rem]ritmo e [Sol]canto in ogni [Do]nota.\n{eoc}',
    'Introduzione breve di 4 battute.'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Inno del Mattino',
    'Brano dimostrativo',
    'Pubblico dominio',
    'Sol',
    84,
    '3/4',
    array['Assemblea'],
    E'{title: Inno del Mattino}\n{key: Sol}\n{sov: Strofa 1}\n[Sol]Sorge la luce [Re/Fa#]sopra il sen[Mim]tiero,\n[Do]scorre la [Re]voce lieve nel [Sol]coro.\n{eov}',
    null
  )
on conflict (id) do nothing;

-- Demo setlist
insert into public.setlists (id, title, event_date, notes)
values (
  '22222222-2222-4222-8222-222222222201',
  'Scaletta Prova Settimanale',
  current_date + 2,
  'Scaletta dimostrativa per collaudo locale.'
)
on conflict (id) do nothing;

insert into public.setlist_items (id, setlist_id, song_id, position, override_key, notes)
values
  (
    '33333333-3333-4333-8333-333333333301',
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111101',
    0,
    null,
    'Attacco corale completo'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111102',
    1,
    'Fa',
    'Trasposto un tono sotto per comodità vocale'
  )
on conflict (id) do nothing;

-- Demo calendar event
insert into public.calendar_events (
  id,
  title,
  category,
  event_date,
  start_time,
  end_time,
  location,
  setlist_id,
  notes
)
values (
  '44444444-4444-4444-8444-444444444401',
  'Prova settimanale di repertorio',
  'rehearsal',
  current_date + 2,
  '20:45',
  '22:15',
  'Sala prove',
  '22222222-2222-4222-8222-222222222201',
  'Portare leggio o tablet carico.'
)
on conflict (id) do nothing;
