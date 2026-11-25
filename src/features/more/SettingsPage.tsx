import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, LogOut, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useTheme } from '@/components/useTheme';
import {
  NOTATION_SYSTEMS,
  TEXT_SIZE_MODES,
  THEME_MODES,
  type NotationSystem,
  type TextSizeMode,
  type ThemeMode,
} from '@/domain/models/theme';
import { useAuth } from '@/features/auth/useAuth';
import { MusicalProfileSection } from '@/features/profile/MusicalProfileSection';
import { it } from '@/i18n/it';
import { updateOwnProfile, type UpdateOwnProfileInput } from '@/services/authService';

const THEME_LABELS: Record<ThemeMode, string> = {
  daylight: it.themes.daylight,
  stage_dark: it.themes.stageDark,
  oled_black: it.themes.oledBlack,
};

const TEXT_SIZE_LABELS: Record<TextSizeMode, string> = {
  compact: it.textSizes.compact,
  extended: it.textSizes.extended,
};

const NOTATION_LABELS: Record<NotationSystem, string> = {
  italian: it.notations.italian,
  english: it.notations.english,
};

export function SettingsPage() {
  const { theme, setTheme, textSize, setTextSize, notation, setNotation } = useTheme();
  const { profile, instanceSettings, activeInstrument, refreshProfile, signOut, status } =
    useAuth();

  const [prevProfileName, setPrevProfileName] = useState(profile?.displayName ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  if ((profile?.displayName ?? '') !== prevProfileName) {
    setPrevProfileName(profile?.displayName ?? '');
    setDisplayName(profile?.displayName ?? '');
  }
  const [savingName, setSavingName] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const persistPreference = async (patch: UpdateOwnProfileInput) => {
    if (!profile || status !== 'authenticated') return;
    try {
      await updateOwnProfile(profile.id, patch);
    } catch {
      // Keep local preference active even if network is offline
    }
  };

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!profile || !trimmed || savingName) return;

    setSavingName(true);
    setSavedNotice(null);
    setErrorNotice(null);
    try {
      await updateOwnProfile(profile.id, { displayName: trimmed });
      await refreshProfile();
      setSavedNotice(it.settings.profileSavedMessage);
    } catch {
      setErrorNotice(it.errors.generic);
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        to="/altro"
        className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{it.settings.backToMore}</span>
      </Link>

      <PageHeader title={it.settings.title} />

      {/* Musical profile & account */}
      <section className="space-y-4 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs">
        <h2 className="text-base font-bold text-[var(--arion-text)]">
          {it.settings.profileSectionTitle}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3">
            <p className="text-xs font-semibold text-[var(--arion-text-muted)]">
              {it.settings.groupLabel}
            </p>
            <p className="mt-0.5 text-sm font-bold text-[var(--arion-text)]">
              {instanceSettings?.groupName ?? it.app.defaultGroupName}
            </p>
          </div>
          <div className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3">
            <p className="text-xs font-semibold text-[var(--arion-text-muted)]">
              {it.settings.instrumentLabel}
            </p>
            <p className="mt-0.5 text-sm font-bold text-[var(--arion-text)]">
              {activeInstrument?.name ?? it.app.defaultActiveInstrument}
            </p>
          </div>
          {profile ? (
            <>
              <div className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3">
                <p className="text-xs font-semibold text-[var(--arion-text-muted)]">
                  {it.settings.emailLabel}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-[var(--arion-text)]">
                  {profile.email}
                </p>
              </div>
              <div className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3">
                <p className="text-xs font-semibold text-[var(--arion-text-muted)]">
                  {it.settings.roleLabel}
                </p>
                <p className="mt-0.5 text-sm font-bold text-[var(--arion-text)]">
                  {it.roles[profile.role]}
                </p>
              </div>
            </>
          ) : null}
        </div>

        {profile ? (
          <form
            onSubmit={(e) => void handleSaveName(e)}
            className="space-y-3 border-t border-[var(--arion-border)] pt-3"
          >
            <label
              htmlFor="settings-display-name"
              className="block text-sm font-bold text-[var(--arion-text)]"
            >
              {it.settings.displayNameLabel}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="settings-display-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="min-h-11 flex-1 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3.5 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingName || !displayName.trim()}
                className="touch-target rounded-md bg-[var(--arion-primary)] px-4 py-2 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
              >
                {savingName ? it.settings.savingProfileButton : it.settings.saveProfileButton}
              </button>
            </div>
            {savedNotice ? (
              <p className="text-xs font-semibold text-[var(--arion-success)]">{savedNotice}</p>
            ) : null}
            {errorNotice ? (
              <p className="text-xs font-semibold text-[var(--arion-danger)]">{errorNotice}</p>
            ) : null}
          </form>
        ) : null}

        <p className="text-xs text-[var(--arion-text-muted)]">{it.settings.accountNote}</p>
      </section>

      <MusicalProfileSection />

      {/* Theme selector */}
      <section className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs">
        <h2 className="text-base font-bold text-[var(--arion-text)]">{it.themes.selectorLabel}</h2>
        <div
          role="radiogroup"
          aria-label={it.themes.selectorLabel}
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {THEME_MODES.map((mode) => {
            const active = theme === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setTheme(mode);
                  void persistPreference({ preferredTheme: mode });
                }}
                className={`touch-target inline-flex items-center justify-center gap-1.5 rounded-md border-2 px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                    : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
                }`}
              >
                {active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                <span>{THEME_LABELS[mode]}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--arion-text-muted)]">{it.settings.themeHint}</p>
      </section>

      {/* Text Size */}
      <section className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs">
        <h2 className="text-base font-bold text-[var(--arion-text)]">
          {it.textSizes.sectionTitle}
        </h2>
        <div
          role="radiogroup"
          aria-label={it.textSizes.sectionTitle}
          className="grid grid-cols-2 gap-2"
        >
          {TEXT_SIZE_MODES.map((size) => {
            const active = textSize === size;
            return (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setTextSize(size);
                  void persistPreference({ preferredTextSize: size });
                }}
                className={`touch-target inline-flex items-center justify-center gap-1.5 rounded-md border-2 px-3 py-2.5 font-bold transition-colors ${
                  size === 'extended' ? 'text-base' : 'text-sm'
                } ${
                  active
                    ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                    : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
                }`}
              >
                {active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                <span>{TEXT_SIZE_LABELS[size]}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--arion-text-muted)]">{it.textSizes.hint}</p>
      </section>

      {/* Chord Notation */}
      <section className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs">
        <h2 className="text-base font-bold text-[var(--arion-text)]">
          {it.notations.sectionTitle}
        </h2>
        <div
          role="radiogroup"
          aria-label={it.notations.sectionTitle}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {NOTATION_SYSTEMS.map((sys) => {
            const active = notation === sys;
            return (
              <button
                key={sys}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setNotation(sys);
                  void persistPreference({ preferredNotation: sys });
                }}
                className={`touch-target inline-flex items-center justify-center gap-1.5 rounded-md border-2 px-3 py-2.5 text-sm font-bold transition-colors ${
                  active
                    ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                    : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
                }`}
              >
                {active ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                <span>{NOTATION_LABELS[sys]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Privacy & Sign out */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/privacy"
          className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--arion-accent)]"
        >
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{it.settings.privacyButton}</span>
        </Link>

        {profile ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-danger)]/50 bg-[var(--arion-danger)]/10 px-4 py-2.5 text-sm font-bold text-[var(--arion-danger)] hover:bg-[var(--arion-danger)]/15"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{it.settings.signOutButton}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
