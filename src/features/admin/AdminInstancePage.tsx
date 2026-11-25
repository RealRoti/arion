import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, Trash2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArionLogo } from '@/components/ArionLogo';
import { PageHeader } from '@/components/PageHeader';
import { RequirePermission } from '@/components/RequirePermission';
import {
  NOTATION_SYSTEMS,
  THEME_MODES,
  type NotationSystem,
  type ThemeMode,
} from '@/domain/models/theme';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';
import {
  fetchInstanceSettings,
  InstanceServiceError,
  removeInstanceLogo,
  updateInstanceSettings,
  uploadInstanceLogo,
} from '@/services/instanceService';

const THEME_LABELS: Record<ThemeMode, string> = {
  daylight: it.themes.daylight,
  stage_dark: it.themes.stageDark,
  oled_black: it.themes.oledBlack,
};

const NOTATION_LABELS: Record<NotationSystem, string> = {
  italian: it.notations.italian,
  english: it.notations.english,
};

export function AdminInstancePage() {
  const { instanceSettings, refreshInstanceSettings } = useAuth();

  const [groupName, setGroupName] = useState(
    instanceSettings?.groupName ?? it.app.defaultGroupName,
  );
  const [groupSubtitle, setGroupSubtitle] = useState(instanceSettings?.groupSubtitle ?? '');
  const [defaultTheme, setDefaultTheme] = useState<ThemeMode>(
    instanceSettings?.defaultTheme ?? 'daylight',
  );
  const [defaultNotation, setDefaultNotation] = useState<NotationSystem>(
    instanceSettings?.defaultNotation ?? 'italian',
  );
  const [logoPath, setLogoPath] = useState<string | null>(instanceSettings?.logoPath ?? null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(
    instanceSettings?.logoSignedUrl ?? null,
  );

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadLatest = async () => {
      try {
        const latest = await fetchInstanceSettings();
        if (!cancelled) {
          setGroupName(latest.groupName);
          setGroupSubtitle(latest.groupSubtitle ?? '');
          setDefaultTheme(latest.defaultTheme);
          setDefaultNotation(latest.defaultNotation);
          setLogoPath(latest.logoPath);
          setLogoPreviewUrl(latest.logoSignedUrl);
        }
      } catch {
        // Keep initial auth context values if unavailable
      }
    };
    void loadLatest();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || saving) return;

    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await updateInstanceSettings({
        groupName,
        groupSubtitle: groupSubtitle.trim() || null,
        defaultTheme,
        defaultNotation,
      });
      await refreshInstanceSettings();
      setStatusMessage(it.adminInstance.savedMessage);
    } catch {
      setErrorMessage(it.adminInstance.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploadingLogo) return;

    setUploadingLogo(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const updated = await uploadInstanceLogo(file, logoPath);
      setLogoPath(updated.logoPath);
      setLogoPreviewUrl(updated.logoSignedUrl);
      await refreshInstanceSettings();
      setStatusMessage(it.adminInstance.logoSavedMessage);
    } catch (err) {
      if (err instanceof InstanceServiceError) {
        if (err.code === 'INVALID_TYPE') {
          setErrorMessage(it.adminInstance.errors.invalidType);
        } else if (err.code === 'FILE_TOO_LARGE') {
          setErrorMessage(it.adminInstance.errors.fileTooLarge);
        } else {
          setErrorMessage(it.adminInstance.errors.generic);
        }
      } else {
        setErrorMessage(it.adminInstance.errors.generic);
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoPath || uploadingLogo) return;
    setUploadingLogo(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const updated = await removeInstanceLogo(logoPath);
      setLogoPath(updated.logoPath);
      setLogoPreviewUrl(updated.logoSignedUrl);
      await refreshInstanceSettings();
      setStatusMessage(it.adminInstance.logoRemovedMessage);
    } catch {
      setErrorMessage(it.adminInstance.errors.generic);
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <RequirePermission permission="instance:manage">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          to="/admin"
          className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{it.admin.backToPanel}</span>
        </Link>

        <PageHeader title={it.adminInstance.title} subtitle={it.adminInstance.subtitle} />

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

        {/* Identity Form */}
        <form
          onSubmit={(e) => void handleSaveSettings(e)}
          className="space-y-4 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-2xs"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="instance-group-name"
              className="block text-sm font-bold text-[var(--arion-text)]"
            >
              {it.adminInstance.groupNameLabel}
            </label>
            <input
              id="instance-group-name"
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={it.adminInstance.groupNamePlaceholder}
              className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3.5 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="instance-group-subtitle"
              className="block text-sm font-bold text-[var(--arion-text)]"
            >
              {it.adminInstance.groupSubtitleLabel}
            </label>
            <input
              id="instance-group-subtitle"
              type="text"
              value={groupSubtitle}
              onChange={(e) => setGroupSubtitle(e.target.value)}
              placeholder={it.adminInstance.groupSubtitlePlaceholder}
              className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3.5 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="instance-default-theme"
                className="block text-sm font-bold text-[var(--arion-text)]"
              >
                {it.adminInstance.defaultThemeLabel}
              </label>
              <select
                id="instance-default-theme"
                value={defaultTheme}
                onChange={(e) => setDefaultTheme(e.target.value as ThemeMode)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              >
                {THEME_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {THEME_LABELS[mode]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="instance-default-notation"
                className="block text-sm font-bold text-[var(--arion-text)]"
              >
                {it.adminInstance.defaultNotationLabel}
              </label>
              <select
                id="instance-default-notation"
                value={defaultNotation}
                onChange={(e) => setDefaultNotation(e.target.value as NotationSystem)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              >
                {NOTATION_SYSTEMS.map((sys) => (
                  <option key={sys} value={sys}>
                    {NOTATION_LABELS[sys]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !groupName.trim()}
            className="touch-target rounded-md bg-[var(--arion-primary)] px-4 py-2.5 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
          >
            {saving ? it.adminInstance.savingButton : it.adminInstance.saveButton}
          </button>
        </form>

        {/* White-label logo */}
        <section className="space-y-4 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-[var(--arion-text)]">
              {it.adminInstance.logoSectionTitle}
            </h2>
            <p className="mt-1 text-xs text-[var(--arion-text-muted)]">
              {it.adminInstance.logoHint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ArionLogo
              size="lg"
              showWordmark
              title={groupName || it.app.name}
              subtitle={groupSubtitle || it.app.subtitle}
              showSubtitle
              logoUrl={logoPreviewUrl}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-4 py-2 text-sm font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]">
              <Upload className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>
                {uploadingLogo
                  ? it.adminInstance.uploadingLogoButton
                  : it.adminInstance.uploadLogoButton}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={uploadingLogo}
                onChange={(e) => void handleLogoUpload(e)}
                className="sr-only"
              />
            </label>

            {logoPath ? (
              <button
                type="button"
                disabled={uploadingLogo}
                onClick={() => void handleRemoveLogo()}
                className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-danger)]/50 bg-[var(--arion-danger)]/10 px-4 py-2 text-sm font-bold text-[var(--arion-danger)] hover:bg-[var(--arion-danger)]/15 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>{it.adminInstance.removeLogoButton}</span>
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
