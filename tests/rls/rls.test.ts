import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdminServiceClient, createAnonClient, ensureTestUserAndSignIn } from './helpers';

const TEST_PASSWORD = 'ArionTestPassword!2026';

describe('PostgreSQL RLS & Security Policies (Milestone 1.1)', () => {
  let anonClient: SupabaseClient;
  let serviceClient: SupabaseClient;
  let adminClient: SupabaseClient;
  let conductorClient: SupabaseClient;
  let musicianClient: SupabaseClient;

  let adminUserId = '';
  let conductorUserId = '';
  let musicianUserId = '';

  const createdSongIds: string[] = [];
  const createdSetlistIds: string[] = [];
  const createdEventIds: string[] = [];
  const createdAllowedEmails: string[] = [];
  const createdInstrumentSlugs: string[] = [];
  const uploadedSongAssetPaths: string[] = [];
  const uploadedBrandingPaths: string[] = [];

  beforeAll(async () => {
    anonClient = createAnonClient();
    serviceClient = createAdminServiceClient();

    const admin = await ensureTestUserAndSignIn('admin@arion.local', TEST_PASSWORD);
    const conductor = await ensureTestUserAndSignIn('maestro@arion.local', TEST_PASSWORD);
    const musician = await ensureTestUserAndSignIn('musicista@arion.local', TEST_PASSWORD);

    adminUserId = admin.userId;
    adminClient = admin.client;
    conductorUserId = conductor.userId;
    conductorClient = conductor.client;
    musicianUserId = musician.userId;
    musicianClient = musician.client;

    await serviceClient.from('instance_settings').update({ group_name: 'Il Mio Coro' }).eq('id', 1);
    await serviceClient
      .from('live_sessions')
      .update({ is_active: false, conductor_id: null, active_song_id: null })
      .eq('id', 1);
  });

  afterAll(async () => {
    if (uploadedSongAssetPaths.length > 0) {
      await serviceClient.storage.from('song-assets').remove(uploadedSongAssetPaths);
    }
    if (uploadedBrandingPaths.length > 0) {
      await serviceClient.storage.from('instance-branding').remove(uploadedBrandingPaths);
    }
    if (createdEventIds.length > 0) {
      await serviceClient.from('calendar_events').delete().in('id', createdEventIds);
    }
    if (createdSetlistIds.length > 0) {
      await serviceClient.from('setlists').delete().in('id', createdSetlistIds);
    }
    if (createdSongIds.length > 0) {
      await serviceClient.from('songs').delete().in('id', createdSongIds);
    }
    if (createdAllowedEmails.length > 0) {
      await serviceClient.from('allowed_emails').delete().in('email', createdAllowedEmails);
    }
    if (createdInstrumentSlugs.length > 0) {
      await serviceClient.from('instruments').delete().in('slug', createdInstrumentSlugs);
    }
    await serviceClient.from('instance_settings').update({ group_name: 'Il Mio Coro' }).eq('id', 1);
    await serviceClient
      .from('live_sessions')
      .update({ is_active: false, conductor_id: null, active_song_id: null })
      .eq('id', 1);
  });

  it('rejects signup for non-whitelisted emails and auto-provisions whitelisted profiles', async () => {
    const { error: signupError } = await anonClient.auth.signUp({
      email: 'intruder@arion.local',
      password: TEST_PASSWORD,
    });
    expect(signupError).not.toBeNull();

    const { data: profile, error: profileError } = await musicianClient
      .from('profiles')
      .select('email, role, is_active')
      .eq('id', musicianUserId)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toMatchObject({
      email: 'musicista@arion.local',
      role: 'musician',
      is_active: true,
    });
  });

  it('blocks anonymous access on protected tables', async () => {
    const [songsRes, settingsRes, setlistsRes, calendarRes, liveRes, allowedRes, profilesRes] =
      await Promise.all([
        anonClient.from('songs').select('id'),
        anonClient.from('instance_settings').select('id'),
        anonClient.from('setlists').select('id'),
        anonClient.from('calendar_events').select('id'),
        anonClient.from('live_sessions').select('id'),
        anonClient.from('allowed_emails').select('id'),
        anonClient.from('profiles').select('id'),
      ]);

    expect(songsRes.data ?? []).toHaveLength(0);
    expect(settingsRes.data ?? []).toHaveLength(0);
    expect(setlistsRes.data ?? []).toHaveLength(0);
    expect(calendarRes.data ?? []).toHaveLength(0);
    expect(liveRes.data ?? []).toHaveLength(0);
    expect(allowedRes.data ?? []).toHaveLength(0);
    expect(profilesRes.data ?? []).toHaveLength(0);

    expect(songsRes.error).not.toBeNull();
    expect(settingsRes.error).not.toBeNull();
    expect(setlistsRes.error).not.toBeNull();
    expect(calendarRes.error).not.toBeNull();
    expect(liveRes.error).not.toBeNull();
    expect(allowedRes.error).not.toBeNull();
    expect(profilesRes.error).not.toBeNull();
  });

  it('allows musician to read repertoire/enabled instruments and manage own preferences, while blocking privilege escalation and writes', async () => {
    const { data: songs, error: songsErr } = await musicianClient.from('songs').select('id, title');
    expect(songsErr).toBeNull();
    expect((songs ?? []).length).toBeGreaterThanOrEqual(1);

    // Disabled instruments must be hidden from non-admin users
    const { data: instruments, error: instErr } = await musicianClient
      .from('instruments')
      .select('slug, is_enabled');
    expect(instErr).toBeNull();
    expect((instruments ?? []).every((i) => i.is_enabled === true)).toBe(true);

    // Musician can update own display_name and preferred_notation
    const { error: ownUpdateErr } = await musicianClient
      .from('profiles')
      .update({ preferred_notation: 'english' })
      .eq('id', musicianUserId);
    expect(ownUpdateErr).toBeNull();

    // Musician CANNOT self-promote role or alter is_active
    const { error: escalateRoleErr } = await musicianClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', musicianUserId);
    expect(escalateRoleErr).not.toBeNull();

    const { error: toggleActiveErr } = await musicianClient
      .from('profiles')
      .update({ is_active: false })
      .eq('id', musicianUserId);
    expect(toggleActiveErr).not.toBeNull();

    // Musician CANNOT create songs, setlists, calendar events, allowed_emails or update live/settings
    const songIns = await musicianClient.from('songs').insert({ title: 'Unauthorized Song' });
    const setlistIns = await musicianClient
      .from('setlists')
      .insert({ title: 'Unauthorized Setlist' });
    const calIns = await musicianClient.from('calendar_events').insert({
      title: 'Unauthorized Event',
      category: 'rehearsal',
      event_date: '2026-12-01',
      start_time: '20:00',
    });
    // RLS UPDATE filters rows via USING clause: 0 rows affected and row remains unchanged
    const liveUpd = await musicianClient
      .from('live_sessions')
      .update({ is_active: true })
      .eq('id', 1)
      .select('id');
    const settingsUpd = await musicianClient
      .from('instance_settings')
      .update({ group_name: 'Hacked' })
      .eq('id', 1)
      .select('id');
    const allowedIns = await musicianClient
      .from('allowed_emails')
      .insert({ email: 'rogue@arion.local', role: 'admin' });

    expect(songIns.error).not.toBeNull();
    expect(setlistIns.error).not.toBeNull();
    expect(calIns.error).not.toBeNull();
    expect(liveUpd.data ?? []).toHaveLength(0);
    expect(settingsUpd.data ?? []).toHaveLength(0);
    expect(allowedIns.error).not.toBeNull();

    const { data: liveCheck } = await serviceClient
      .from('live_sessions')
      .select('is_active')
      .eq('id', 1)
      .single();
    const { data: settingsCheck } = await serviceClient
      .from('instance_settings')
      .select('group_name')
      .eq('id', 1)
      .single();
    expect(liveCheck?.is_active).toBe(false);
    expect(settingsCheck?.group_name).toBe('Il Mio Coro');

    // Musician CANNOT upload to song-assets or instance-branding
    const pdfBlob = new Blob([new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])], {
      type: 'application/pdf',
    });
    const { error: uploadAssetErr } = await musicianClient.storage
      .from('song-assets')
      .upload(`unauthorized/${Date.now()}.pdf`, pdfBlob, { contentType: 'application/pdf' });
    expect(uploadAssetErr).not.toBeNull();

    const pngBlob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
      type: 'image/png',
    });
    const { error: uploadBrandErr } = await musicianClient.storage
      .from('instance-branding')
      .upload(`unauthorized/${Date.now()}.png`, pngBlob, { contentType: 'image/png' });
    expect(uploadBrandErr).not.toBeNull();
  });

  it('isolates personal user_song_preferences strictly to the owner', async () => {
    const firstSongId = '11111111-1111-4111-8111-111111111101';

    const { error: upsertErr } = await musicianClient.from('user_song_preferences').upsert({
      user_id: musicianUserId,
      song_id: firstSongId,
      capo_frets: 2,
      personal_notes: 'Nota privata del musicista',
    });
    expect(upsertErr).toBeNull();

    // Even admin/conductor cannot read or overwrite another user's personal song preferences via RLS
    const { data: adminReadPrefs } = await adminClient
      .from('user_song_preferences')
      .select('*')
      .eq('user_id', musicianUserId);
    expect(adminReadPrefs ?? []).toHaveLength(0);

    const { error: crossInsertErr } = await conductorClient.from('user_song_preferences').insert({
      user_id: musicianUserId,
      song_id: firstSongId,
      capo_frets: 5,
    });
    expect(crossInsertErr).not.toBeNull();
  });

  it('allows conductor to manage songs, setlists, calendar, live_sessions and song-assets storage, but blocks admin tables', async () => {
    const { data: song, error: songErr } = await conductorClient
      .from('songs')
      .insert({ title: 'Brano Test Maestro', original_key: 'Re', created_by: conductorUserId })
      .select('id')
      .single();
    expect(songErr).toBeNull();
    expect(song?.id).toBeTruthy();
    if (song?.id) createdSongIds.push(song.id);

    const { data: setlist, error: setlistErr } = await conductorClient
      .from('setlists')
      .insert({ title: 'Scaletta Test Maestro', created_by: conductorUserId })
      .select('id')
      .single();
    expect(setlistErr).toBeNull();
    expect(setlist?.id).toBeTruthy();
    if (setlist?.id) createdSetlistIds.push(setlist.id);

    const { data: calEvent, error: calErr } = await conductorClient
      .from('calendar_events')
      .insert({
        title: 'Prova Test Maestro',
        category: 'rehearsal',
        event_date: '2026-12-10',
        start_time: '21:00',
        setlist_id: setlist?.id ?? null,
        created_by: conductorUserId,
      })
      .select('id')
      .single();
    expect(calErr).toBeNull();
    if (calEvent?.id) createdEventIds.push(calEvent.id);

    const { error: liveErr } = await conductorClient
      .from('live_sessions')
      .update({
        is_active: true,
        conductor_id: conductorUserId,
        active_song_id: song?.id ?? null,
      })
      .eq('id', 1);
    expect(liveErr).toBeNull();

    // Conductor CAN upload PDF to song-assets
    const pdfPath = `tests/${Date.now()}-test.pdf`;
    const pdfBlob = new Blob([new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])], {
      type: 'application/pdf',
    });
    const { error: storageUpErr } = await conductorClient.storage
      .from('song-assets')
      .upload(pdfPath, pdfBlob, { contentType: 'application/pdf' });
    expect(storageUpErr).toBeNull();
    uploadedSongAssetPaths.push(pdfPath);

    // Conductor CANNOT modify admin-only tables or branding bucket
    const settingsRes = await conductorClient
      .from('instance_settings')
      .update({ group_name: 'No' })
      .eq('id', 1)
      .select('id');
    const instErr = await conductorClient.from('instruments').insert({
      slug: 'forbidden-inst',
      name: 'Vietato',
      category: 'instrument',
      default_view: 'pdf',
    });
    const allowedErr = await conductorClient
      .from('allowed_emails')
      .insert({ email: 'blocked@arion.local', role: 'musician' });
    const pngBlob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
      type: 'image/png',
    });
    const brandErr = await conductorClient.storage
      .from('instance-branding')
      .upload(`tests/${Date.now()}.png`, pngBlob, {
        contentType: 'image/png',
      });

    expect(settingsRes.data ?? []).toHaveLength(0);
    expect(instErr.error).not.toBeNull();
    expect(allowedErr.error).not.toBeNull();
    expect(brandErr.error).not.toBeNull();
  });

  it('allows admin to manage instance, allowed_emails, instruments and branding, and blocks removing the last active admin', async () => {
    const { error: settingsUpdErr } = await adminClient
      .from('instance_settings')
      .update({ group_name: 'Coro Demo Verificato' })
      .eq('id', 1);
    expect(settingsUpdErr).toBeNull();

    const testInvite = `invito-${Date.now()}@arion.local`;
    const { error: inviteErr } = await adminClient
      .from('allowed_emails')
      .insert({ email: testInvite, role: 'musician', display_name: 'Ospite Test' });
    expect(inviteErr).toBeNull();
    createdAllowedEmails.push(testInvite);

    const instSlug = `test-inst-${Date.now()}`;
    const { error: instInsertErr } = await adminClient.from('instruments').insert({
      slug: instSlug,
      name: 'Strumento Test',
      category: 'instrument',
      default_view: 'pdf',
      is_enabled: false,
    });
    expect(instInsertErr).toBeNull();
    createdInstrumentSlugs.push(instSlug);

    // Admin can see disabled instruments too
    const { data: disabledInst } = await adminClient
      .from('instruments')
      .select('slug')
      .eq('slug', instSlug)
      .single();
    expect(disabledInst?.slug).toBe(instSlug);

    // Admin can upload to instance-branding
    const logoPath = `tests/${Date.now()}-logo.png`;
    const logoBlob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
      type: 'image/png',
    });
    const { error: logoErr } = await adminClient.storage
      .from('instance-branding')
      .upload(logoPath, logoBlob, { contentType: 'image/png' });
    expect(logoErr).toBeNull();
    uploadedBrandingPaths.push(logoPath);

    // Anti-lockout guard: cannot demote or deactivate the sole active admin
    const { error: demoteErr } = await adminClient
      .from('profiles')
      .update({ role: 'conductor' })
      .eq('id', adminUserId);
    expect(demoteErr).not.toBeNull();

    const { error: deactivateErr } = await adminClient
      .from('profiles')
      .update({ is_active: false })
      .eq('id', adminUserId);
    expect(deactivateErr).not.toBeNull();
  });
});
