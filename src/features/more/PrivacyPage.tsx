import { ArrowLeft, CheckCircle2, LifeBuoy, Settings, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { it } from '@/i18n/it';

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-6">
      <Link
        to="/altro"
        className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{it.nav.back}</span>
      </Link>

      <article className="space-y-6 rounded-md border border-[var(--arion-border)] border-t-4 border-t-[var(--arion-accent)] bg-[var(--arion-surface)] p-5 shadow-2xs sm:p-7">
        <header className="space-y-2 border-b border-[var(--arion-border)] pb-4">
          <div className="inline-flex items-center gap-2 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--arion-accent)]">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{it.privacy.badge}</span>
          </div>
          <h1 className="font-editorial text-2xl font-bold text-[var(--arion-text)] sm:text-3xl">
            {it.privacy.title}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--arion-text-muted)] sm:text-base">
            {it.privacy.subtitle}
          </p>
          <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-[var(--arion-text-muted)]">
            {it.privacy.lastUpdated}
          </p>
        </header>

        <section className="space-y-3 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] p-4">
          <h2 className="font-editorial text-lg font-bold text-[var(--arion-text)]">
            {it.privacy.summaryTitle}
          </h2>
          <ul className="space-y-2">
            {it.privacy.summaryBullets.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--arion-text)]"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--arion-accent)]"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {it.privacy.highlights.map((card) => (
            <div
              key={card.label}
              className="space-y-1 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3.5"
            >
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
                {card.label}
              </div>
              <div className="text-base font-bold text-[var(--arion-text)]">{card.value}</div>
              <p className="text-xs leading-snug text-[var(--arion-text-muted)]">{card.detail}</p>
            </div>
          ))}
        </div>

        <div className="space-y-5 pt-1">
          {it.privacy.sections.map((section) => (
            <section
              key={section.id}
              className="space-y-2 border-t border-[var(--arion-border)] pt-4 first:border-t-0 first:pt-0"
            >
              <h2 className="font-editorial text-lg font-bold text-[var(--arion-text)]">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-relaxed text-[var(--arion-text-muted)] sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <section className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
            {it.privacy.actionsTitle}
          </h2>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/impostazioni"
              className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-4 py-2.5 text-sm font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
            >
              <Settings className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{it.privacy.openSettingsButton}</span>
            </Link>
            <Link
              to="/assistenza"
              className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2.5 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
            >
              <LifeBuoy className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{it.privacy.openSupportButton}</span>
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
