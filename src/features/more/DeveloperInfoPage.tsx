import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAppEnv } from '@/config/env';
import { it } from '@/i18n/it';

type DevAccordionKey = 'tech' | 'stages' | 'changelog' | 'licenses';

export function DeveloperInfoPage() {
  const env = getAppEnv();
  const [openSections, setOpenSections] = useState<ReadonlySet<DevAccordionKey>>(() => new Set());

  const toggleSection = (key: DevAccordionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/altro"
        className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{it.nav.back}</span>
      </Link>

      <article className="space-y-6 rounded-md border border-[var(--arion-border)] border-t-4 border-t-[var(--arion-accent)] bg-[var(--arion-surface)] p-5 shadow-2xs sm:p-7">
        <header className="space-y-2 border-b border-[var(--arion-border)] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-widest text-[var(--arion-accent)]">
            <span>{it.devInfo.kicker}</span>
            <span>{it.app.versionLabel(env.appVersion)}</span>
          </div>
          <h1 className="font-editorial text-2xl font-bold text-[var(--arion-text)] sm:text-3xl">
            {it.devInfo.title}
          </h1>
          <p className="text-xs font-medium text-[var(--arion-text-muted)]">
            {it.devInfo.openSourceNotice}
          </p>
        </header>

        <section className="space-y-3">
          {it.devInfo.abstractParagraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm leading-relaxed text-[var(--arion-text-muted)] sm:text-base"
            >
              {paragraph}
            </p>
          ))}

          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link
              to="/guida"
              className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-4 py-2.5 text-sm font-bold text-[var(--arion-accent)]"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>{it.devInfo.openGuideButton}</span>
            </Link>
            <Link
              to="/privacy"
              className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-4 py-2.5 text-sm font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
            >
              <ShieldCheck className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{it.devInfo.openPrivacyButton}</span>
            </Link>
            <a
              href={it.app.githubRepoUrl}
              target="_blank"
              rel="noreferrer"
              className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-4 py-2.5 text-sm font-bold text-[var(--arion-primary)] hover:border-[var(--arion-accent)]"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span>{it.devInfo.viewRepoButton}</span>
            </a>
          </div>
        </section>

        <div className="space-y-3 border-t border-[var(--arion-border)] pt-4">
          <AccordionSection
            title={it.devInfo.techTitle}
            subtitle={it.devInfo.techSubtitle}
            isOpen={openSections.has('tech')}
            onToggle={() => toggleSection('tech')}
          >
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--arion-text-muted)]">
              {it.devInfo.techItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </AccordionSection>

          <AccordionSection
            title={it.devInfo.stagesTitle}
            subtitle={it.devInfo.stagesSubtitle}
            isOpen={openSections.has('stages')}
            onToggle={() => toggleSection('stages')}
          >
            <div className="space-y-3">
              {it.devInfo.stages.map((stage) => (
                <div
                  key={stage.phase}
                  className="space-y-2 rounded border border-[var(--arion-border)] bg-[var(--arion-surface)] p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[var(--arion-text)]">{stage.phase}</h3>
                    <span className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
                      {stage.status}
                    </span>
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--arion-text-muted)]">
                    {stage.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            title={it.devInfo.changelogTitle}
            subtitle={it.devInfo.changelogSubtitle}
            isOpen={openSections.has('changelog')}
            onToggle={() => toggleSection('changelog')}
          >
            <div className="space-y-4">
              {it.devInfo.changelogReleases.map((release) => (
                <div
                  key={release.version}
                  className="border-l-2 border-l-[var(--arion-accent)] pl-3.5 text-sm"
                >
                  <div className="font-bold text-[var(--arion-text)]">{release.title}</div>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[var(--arion-text-muted)]">
                    {release.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </AccordionSection>

          <AccordionSection
            title={it.devInfo.licensesTitle}
            subtitle={it.devInfo.licensesSubtitle}
            isOpen={openSections.has('licenses')}
            onToggle={() => toggleSection('licenses')}
          >
            <div className="divide-y divide-[var(--arion-border)] rounded border border-[var(--arion-border)] bg-[var(--arion-surface)]">
              {it.devInfo.licenses.map((lib) => (
                <div key={lib.name} className="space-y-1 p-3 text-sm">
                  <div className="font-bold text-[var(--arion-text)]">{lib.name}</div>
                  <span className="inline-block rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--arion-accent)]">
                    {lib.license}
                  </span>
                  <p className="text-[var(--arion-text-muted)]">{lib.purpose}</p>
                  <p className="text-xs text-[var(--arion-text-muted)]">© {lib.copyright}</p>
                </div>
              ))}
            </div>
          </AccordionSection>
        </div>
      </article>
    </div>
  );
}

function AccordionSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex min-h-14 w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--arion-surface-subtle)]"
      >
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--arion-text)]">{title}</h2>
          <p className="mt-0.5 text-xs text-[var(--arion-text-muted)]">{subtitle}</p>
        </div>
        <span className="shrink-0 text-[var(--arion-accent)]" aria-hidden="true">
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>
      {isOpen ? <div className="border-t border-[var(--arion-border)] p-4">{children}</div> : null}
    </section>
  );
}
