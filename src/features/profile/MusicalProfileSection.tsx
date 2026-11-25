import { useState, type FormEvent } from 'react';
import { Check, Star } from 'lucide-react';
import type { Instrument, UserInstrumentAssignment } from '@/domain/models/instruments';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';
import { updateOwnProfile } from '@/services/authService';
import { saveUserInstruments } from '@/services/instrumentsService';

function getPrimaryFromAssignments(
  assignments: readonly UserInstrumentAssignment[],
): string | null {
  return (
    assignments.find((item) => item.isPrimary)?.instrumentId ?? assignments[0]?.instrumentId ?? null
  );
}

export function MusicalProfileSection() {
  const { profile, instruments, userInstruments, refreshInstruments, refreshProfile, status } =
    useAuth();

  const [prevAssignments, setPrevAssignments] =
    useState<readonly UserInstrumentAssignment[]>(userInstruments);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    userInstruments.map((item) => item.instrumentId),
  );
  const [primaryId, setPrimaryId] = useState<string | null>(() =>
    getPrimaryFromAssignments(userInstruments),
  );

  if (userInstruments !== prevAssignments) {
    setPrevAssignments(userInstruments);
    setSelectedIds(userInstruments.map((item) => item.instrumentId));
    setPrimaryId(getPrimaryFromAssignments(userInstruments));
  }

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!profile || status !== 'authenticated') {
    return null;
  }

  const toggleInstrument = (instrumentId: string) => {
    setSavedNotice(null);
    setErrorNotice(null);

    if (selectedIds.includes(instrumentId)) {
      const next = selectedIds.filter((id) => id !== instrumentId);
      setSelectedIds(next);
      if (primaryId === instrumentId) {
        setPrimaryId(next[0] ?? null);
      }
      return;
    }

    const next = [...selectedIds, instrumentId];
    setSelectedIds(next);
    if (!primaryId) {
      setPrimaryId(instrumentId);
    }
  };

  const handleSetPrimary = (instrumentId: string) => {
    setSavedNotice(null);
    setErrorNotice(null);
    if (!selectedIds.includes(instrumentId)) {
      setSelectedIds((prev) => [...prev, instrumentId]);
    }
    setPrimaryId(instrumentId);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setSavedNotice(null);
    setErrorNotice(null);

    try {
      const resolvedPrimary =
        primaryId && selectedIds.includes(primaryId) ? primaryId : (selectedIds[0] ?? null);

      await saveUserInstruments(profile.id, selectedIds, resolvedPrimary);

      if (
        resolvedPrimary &&
        (!profile.activeInstrumentId || !selectedIds.includes(profile.activeInstrumentId))
      ) {
        await updateOwnProfile(profile.id, { activeInstrumentId: resolvedPrimary });
      }

      await Promise.all([refreshInstruments(), refreshProfile()]);
      setSavedNotice(it.profileInstruments.savedMessage);
    } catch {
      setErrorNotice(it.profileInstruments.saveError);
    } finally {
      setSaving(false);
    }
  };

  const voices = instruments.filter((item) => item.category === 'voice');
  const instrumental = instruments.filter((item) => item.category === 'instrument');

  const renderGroup = (title: string, groupItems: readonly Instrument[]) => {
    if (groupItems.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
          {title}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {groupItems.map((inst) => {
            const isSelected = selectedIds.includes(inst.id);
            const isPrimary = isSelected && primaryId === inst.id;

            return (
              <div
                key={inst.id}
                className={`flex items-center justify-between gap-2 rounded-md border p-2.5 transition-colors ${
                  isSelected
                    ? 'border-[var(--arion-primary)] bg-[var(--arion-accent-soft)]'
                    : 'border-[var(--arion-border)] bg-[var(--arion-bg)]'
                }`}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleInstrument(inst.id)}
                  className="touch-target flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                        : 'border-[var(--arion-border)] bg-[var(--arion-surface)]'
                    }`}
                  >
                    {isSelected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[var(--arion-text)]">
                      {inst.name}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--arion-text-muted)]">
                      {it.profileInstruments.activeViewHint(
                        it.instruments.defaultViews[inst.defaultView],
                      )}
                    </span>
                  </span>
                </button>

                {isSelected ? (
                  <button
                    type="button"
                    aria-pressed={isPrimary}
                    aria-label={`${it.profileInstruments.setPrimaryLabel} ${inst.name}`}
                    onClick={() => handleSetPrimary(inst.id)}
                    className={`touch-target inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-bold transition-colors ${
                      isPrimary
                        ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                        : 'border border-[var(--arion-border)] bg-[var(--arion-surface)] text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
                    }`}
                  >
                    <Star
                      className={`h-3 w-3 ${isPrimary ? 'fill-current' : ''}`}
                      aria-hidden="true"
                    />
                    <span>{it.profileInstruments.primaryBadge}</span>
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <form
      onSubmit={(e) => void handleSave(e)}
      className="space-y-4 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs"
    >
      <div>
        <h2 className="text-base font-bold text-[var(--arion-text)]">
          {it.profileInstruments.sectionTitle}
        </h2>
        <p className="mt-0.5 text-xs text-[var(--arion-text-muted)]">
          {it.profileInstruments.subtitle}
        </p>
      </div>

      {instruments.length === 0 ? (
        <p className="text-sm text-[var(--arion-text-muted)]">
          {it.profileInstruments.emptyCatalog}
        </p>
      ) : (
        <div className="space-y-4">
          {renderGroup(it.profileInstruments.voicesGroupTitle, voices)}
          {renderGroup(it.profileInstruments.instrumentsGroupTitle, instrumental)}
        </div>
      )}

      {selectedIds.length === 0 && instruments.length > 0 ? (
        <p className="text-xs text-[var(--arion-text-muted)]">
          {it.profileInstruments.noSelectionHint}
        </p>
      ) : null}

      {savedNotice ? (
        <p role="status" className="text-xs font-semibold text-[var(--arion-success)]">
          {savedNotice}
        </p>
      ) : null}

      {errorNotice ? (
        <p role="alert" className="text-xs font-semibold text-[var(--arion-danger)]">
          {errorNotice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving || instruments.length === 0}
        className="touch-target rounded-md bg-[var(--arion-primary)] px-4 py-2 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
      >
        {saving ? it.profileInstruments.savingButton : it.profileInstruments.saveButton}
      </button>
    </form>
  );
}
