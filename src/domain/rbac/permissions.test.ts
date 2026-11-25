import { describe, expect, it } from 'vitest';
import {
  can,
  canAll,
  canAny,
  getPermissionsForRole,
  isRole,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '@/domain/rbac/permissions';

describe('RBAC permissions domain (src/domain/rbac/permissions.ts)', () => {
  it('validates known role names strictly', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('conductor')).toBe(true);
    expect(isRole('musician')).toBe(true);
    expect(isRole('guest')).toBe(false);
  });

  it('grants every catalog permission to active admin', () => {
    const perms = getPermissionsForRole('admin', true);
    for (const permission of PERMISSIONS) {
      expect(can(perms, permission)).toBe(true);
    }
  });

  it('grants repertoire, setlists, calendar and live management to conductor but denies admin ops', () => {
    const perms = getPermissionsForRole('conductor', true);

    expect(can(perms, 'songs:create')).toBe(true);
    expect(can(perms, 'assets:upload')).toBe(true);
    expect(can(perms, 'setlists:manage')).toBe(true);
    expect(can(perms, 'calendar:manage')).toBe(true);
    expect(can(perms, 'live:host')).toBe(true);
    expect(can(perms, 'live:takeover')).toBe(true);

    expect(can(perms, 'instance:manage')).toBe(false);
    expect(can(perms, 'users:manage')).toBe(false);
    expect(can(perms, 'instruments:manage')).toBe(false);
  });

  it('limits musician to read, live join and own profile preferences', () => {
    const perms = getPermissionsForRole('musician', true);

    expect(can(perms, 'songs:read')).toBe(true);
    expect(can(perms, 'setlists:read')).toBe(true);
    expect(can(perms, 'calendar:read')).toBe(true);
    expect(can(perms, 'live:join')).toBe(true);
    expect(can(perms, 'profile:manage_own')).toBe(true);

    expect(can(perms, 'songs:create')).toBe(false);
    expect(can(perms, 'setlists:manage')).toBe(false);
    expect(can(perms, 'calendar:manage')).toBe(false);
    expect(can(perms, 'live:host')).toBe(false);
    expect(can(perms, 'users:manage')).toBe(false);
  });

  it('returns empty permissions for inactive or missing roles', () => {
    expect(getPermissionsForRole('admin', false).size).toBe(0);
    expect(getPermissionsForRole(null, true).size).toBe(0);
    expect(getPermissionsForRole(undefined, true).size).toBe(0);
  });

  it('supports canAny and canAll helpers accurately', () => {
    const musicianPerms = ROLE_PERMISSIONS.musician;
    expect(canAny(musicianPerms, ['users:manage', 'songs:read'])).toBe(true);
    expect(canAny(musicianPerms, ['users:manage', 'live:host'])).toBe(false);
    expect(canAll(musicianPerms, ['songs:read', 'live:join'])).toBe(true);
    expect(canAll(musicianPerms, ['songs:read', 'songs:create'])).toBe(false);
  });
});
