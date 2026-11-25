import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Permission } from '@/domain/rbac/permissions';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';

interface RequirePermissionProps {
  permission?: Permission;
  anyOf?: readonly Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}

function DefaultForbiddenFallback() {
  return (
    <div className="mx-auto max-w-lg rounded-md border border-[var(--arion-border)] border-t-4 border-t-[var(--arion-danger)] bg-[var(--arion-surface)] p-6 shadow-2xs">
      <div className="flex items-center gap-2.5 text-[var(--arion-danger)]">
        <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h1 className="font-editorial text-xl font-bold text-[var(--arion-text)]">
          {it.forbidden.title}
        </h1>
      </div>
      <p className="mt-2 text-sm text-[var(--arion-text-muted)]">{it.forbidden.body}</p>
      <div className="mt-4">
        <Link
          to="/"
          className="touch-target inline-flex items-center rounded-md bg-[var(--arion-primary)] px-4 py-2 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
        >
          {it.forbidden.backHome}
        </Link>
      </div>
    </div>
  );
}

export function RequirePermission({
  permission,
  anyOf,
  fallback,
  children,
}: RequirePermissionProps) {
  const { can, canAny } = useAuth();

  let allowed = true;
  if (permission) {
    allowed = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    allowed = canAny(anyOf);
  }

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return <DefaultForbiddenFallback />;
}
