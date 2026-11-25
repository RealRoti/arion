import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Trash2, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { RequirePermission } from '@/components/RequirePermission';
import type { AllowedEmailEntry, UserProfile } from '@/domain/models/auth';
import { ROLES, type Role } from '@/domain/rbac/permissions';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';
import {
  createAllowedEmail,
  deleteAllowedEmail,
  listAllowedEmails,
  listProfiles,
  updateAllowedEmail,
  updateUserProfileAdmin,
  UsersServiceError,
} from '@/services/usersService';

export function AdminUsersPage() {
  const { refreshProfile } = useAuth();
  const [invites, setInvites] = useState<AllowedEmailEntry[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<Role>('musician');
  const [submitting, setSubmitting] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      try {
        const [loadedInvites, loadedProfiles] = await Promise.all([
          listAllowedEmails(),
          listProfiles(),
        ]);
        if (!cancelled) {
          setInvites(loadedInvites);
          setProfiles(loadedProfiles);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(it.adminUsers.errors.generic);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void fetchInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleError = (err: unknown) => {
    if (err instanceof UsersServiceError) {
      if (err.code === 'DUPLICATE_EMAIL') {
        setErrorMessage(it.adminUsers.errors.duplicateEmail);
        return;
      }
      if (err.code === 'LAST_ADMIN_GUARD') {
        setErrorMessage(it.adminUsers.errors.lastAdmin);
        return;
      }
    }
    setErrorMessage(it.adminUsers.errors.generic);
  };

  const handleAddInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || submitting) return;

    setSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const created = await createAllowedEmail({
        email: newEmail,
        role: newRole,
        displayName: newDisplayName,
      });
      setInvites((prev) => [created, ...prev]);
      setNewEmail('');
      setNewDisplayName('');
      setNewRole('musician');
      setStatusMessage(it.adminUsers.inviteAddedMessage);
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleInvite = async (entry: AllowedEmailEntry) => {
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const updated = await updateAllowedEmail(entry.id, { isActive: !entry.isActive });
      setInvites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      handleError(err);
    }
  };

  const handleDeleteInvite = async (entry: AllowedEmailEntry) => {
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await deleteAllowedEmail(entry.id);
      setInvites((prev) => prev.filter((item) => item.id !== entry.id));
    } catch (err) {
      handleError(err);
    }
  };

  const handleProfileRoleChange = async (user: UserProfile, role: Role) => {
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const updated = await updateUserProfileAdmin(user.id, { role });
      setProfiles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      await refreshProfile();
    } catch (err) {
      handleError(err);
    }
  };

  const handleProfileActiveToggle = async (user: UserProfile) => {
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const updated = await updateUserProfileAdmin(user.id, { isActive: !user.isActive });
      setProfiles((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      await refreshProfile();
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <RequirePermission permission="users:manage">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          to="/admin"
          className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{it.admin.backToPanel}</span>
        </Link>

        <PageHeader title={it.adminUsers.title} subtitle={it.adminUsers.subtitle} />

        {statusMessage ? (
          <div
            role="status"
            className="rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] p-3 text-sm font-semibold text-[var(--arion-accent)]"
          >
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-3 text-sm font-semibold text-[var(--arion-danger)]"
          >
            {errorMessage}
          </div>
        ) : null}

        {/* Add invite form */}
        <form
          onSubmit={(e) => void handleAddInvite(e)}
          className="space-y-4 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-2xs"
        >
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--arion-text)]">
            <UserPlus className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.adminUsers.inviteSectionTitle}</span>
          </h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor="invite-email"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.adminUsers.emailLabel}
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={it.adminUsers.emailPlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="invite-display-name"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.adminUsers.displayNameLabel}
              </label>
              <input
                id="invite-display-name"
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder={it.adminUsers.displayNamePlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="invite-role"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.adminUsers.roleLabel}
              </label>
              <select
                id="invite-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {it.roles[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !newEmail.trim()}
            className="touch-target rounded-md bg-[var(--arion-primary)] px-4 py-2 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
          >
            {submitting ? it.adminUsers.addingInviteButton : it.adminUsers.addInviteButton}
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-[var(--arion-text-muted)]">{it.common.loading}</p>
        ) : (
          <>
            {/* Allowed emails list */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
                {it.adminUsers.invitesListTitle}
              </h2>
              {invites.length === 0 ? (
                <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 text-sm text-[var(--arion-text-muted)]">
                  {it.adminUsers.emptyInvites}
                </div>
              ) : (
                <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
                  {invites.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--arion-text)]">
                          {entry.displayName ? `${entry.displayName} · ` : ''}
                          {entry.email}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 font-bold text-[var(--arion-accent)]">
                            {it.roles[entry.role]}
                          </span>
                          <span className="font-semibold text-[var(--arion-text-muted)]">
                            {entry.isActive
                              ? it.adminUsers.statusActive
                              : it.adminUsers.statusRevoked}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleToggleInvite(entry)}
                          className="touch-target rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
                        >
                          {entry.isActive
                            ? it.adminUsers.revokeButton
                            : it.adminUsers.reactivateButton}
                        </button>
                        <button
                          type="button"
                          aria-label={`${it.adminUsers.deleteInviteButton} ${entry.email}`}
                          onClick={() => void handleDeleteInvite(entry)}
                          className="touch-target inline-flex items-center justify-center rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 px-2.5 py-1.5 text-[var(--arion-danger)] hover:bg-[var(--arion-danger)]/15"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Registered users list */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
                {it.adminUsers.usersListTitle}
              </h2>
              {profiles.length === 0 ? (
                <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 text-sm text-[var(--arion-text-muted)]">
                  {it.adminUsers.emptyUsers}
                </div>
              ) : (
                <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
                  {profiles.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--arion-text)]">
                          {user.displayName}
                        </p>
                        <p className="truncate text-xs text-[var(--arion-text-muted)]">
                          {user.email} ·{' '}
                          {user.isActive
                            ? it.adminUsers.statusActive
                            : it.adminUsers.statusDisabled}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`${it.adminUsers.roleLabel} ${user.email}`}
                          value={user.role}
                          onChange={(e) =>
                            void handleProfileRoleChange(user, e.target.value as Role)
                          }
                          className="min-h-10 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-1 text-xs font-bold text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {it.roles[role]}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => void handleProfileActiveToggle(user)}
                          className="touch-target rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
                        >
                          {user.isActive
                            ? it.adminUsers.deactivateButton
                            : it.adminUsers.reactivateButton}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
