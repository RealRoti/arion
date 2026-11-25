export const ROLES = ['admin', 'conductor', 'musician'] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'instance:manage',
  'users:manage',
  'instruments:manage',
  'songs:read',
  'songs:create',
  'songs:update',
  'songs:delete',
  'assets:upload',
  'assets:delete',
  'setlists:read',
  'setlists:manage',
  'calendar:read',
  'calendar:manage',
  'live:host',
  'live:takeover',
  'live:join',
  'profile:manage_own',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const MUSICIAN_PERMISSIONS: readonly Permission[] = [
  'songs:read',
  'setlists:read',
  'calendar:read',
  'live:join',
  'profile:manage_own',
];

const CONDUCTOR_PERMISSIONS: readonly Permission[] = [
  ...MUSICIAN_PERMISSIONS,
  'songs:create',
  'songs:update',
  'songs:delete',
  'assets:upload',
  'assets:delete',
  'setlists:manage',
  'calendar:manage',
  'live:host',
  'live:takeover',
];

const ADMIN_PERMISSIONS: readonly Permission[] = [
  ...CONDUCTOR_PERMISSIONS,
  'instance:manage',
  'users:manage',
  'instruments:manage',
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  musician: new Set(MUSICIAN_PERMISSIONS),
  conductor: new Set(CONDUCTOR_PERMISSIONS),
  admin: new Set(ADMIN_PERMISSIONS),
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function getPermissionsForRole(
  role: Role | null | undefined,
  isActive = true,
): ReadonlySet<Permission> {
  if (!isActive || !role) {
    return new Set();
  }
  return ROLE_PERMISSIONS[role];
}

export function can(permissions: ReadonlySet<Permission>, permission: Permission): boolean {
  return permissions.has(permission);
}

export function canAny(
  permissions: ReadonlySet<Permission>,
  required: readonly Permission[],
): boolean {
  return required.some((perm) => permissions.has(perm));
}

export function canAll(
  permissions: ReadonlySet<Permission>,
  required: readonly Permission[],
): boolean {
  return required.every((perm) => permissions.has(perm));
}
