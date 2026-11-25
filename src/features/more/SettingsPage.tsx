import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
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
import { it } from '@/i18n/it';

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

      {/* Musical profile summary */}
      <section className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs">
        <h2 className="text-base font-bold text-[var(--arion-text)]">
          {it.settings.profileSectionTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3">
            <p className="text-xs font-semibold text-[var(--arion-text-muted)]">
              {it.settings.groupLabel}
            </p>
            <p className="mt-0.5 text-sm font-bold text-[var(--arion-text)]">
              {it.app.defaultGroupName}
            </p>
          </div>
          <div className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3">
            <p className="text-xs font-semibold text-[var(--arion-text-muted)]">
              {it.settings.instrumentLabel}
            </p>
            <p className="mt-0.5 text-sm font-bold text-[var(--arion-text)]">
              {it.app.defaultActiveInstrument}
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--arion-text-muted)]">{it.settings.accountNote}</p>
      </section>

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
                onClick={() => setTheme(mode)}
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
                onClick={() => setTextSize(size)}
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
                onClick={() => setNotation(sys)}
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

      {/* Privacy link */}
      <div>
        <Link
          to="/privacy"
          className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--arion-accent)]"
        >
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{it.settings.privacyButton}</span>
        </Link>
      </div>
    </div>
  );
}
