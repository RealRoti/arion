import { ArrowLeft, Bug, Mail, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAppEnv } from '@/config/env';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';

export function SupportPage() {
  const env = getAppEnv();
  const { instanceSettings } = useAuth();
  const supportEmail = instanceSettings?.supportEmail?.trim() || env.supportEmail;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '-';

  const mailBody = [
    it.support.emailBodyIntro,
    '',
    '',
    `--- ${it.support.emailDeviceLabel} ---`,
    `${it.app.name} ${it.app.versionLabel(env.appVersion)}`,
    `User-Agent: ${userAgent}`,
  ].join('\n');

  const mailtoHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent(
        `${it.support.emailSubject} ${it.app.versionLabel(env.appVersion)}`,
      )}&body=${encodeURIComponent(mailBody)}`
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link
        to="/altro"
        className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{it.nav.back}</span>
      </Link>

      <div className="space-y-5 rounded-md border border-[var(--arion-border)] border-t-4 border-t-[var(--arion-accent)] bg-[var(--arion-surface)] p-5 shadow-2xs sm:p-7">
        <div className="inline-flex items-center gap-2 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--arion-accent)]">
          <Bug className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{it.support.badge}</span>
        </div>

        <h1 className="font-editorial text-2xl font-bold text-[var(--arion-text)]">
          {it.support.title}
        </h1>

        <p className="text-sm leading-relaxed text-[var(--arion-text-muted)] sm:text-base">
          {it.support.description}
        </p>

        {mailtoHref ? (
          <a
            href={mailtoHref}
            className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-3 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
          >
            <Mail className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.support.emailButton}</span>
          </a>
        ) : (
          <p className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3.5 text-sm font-medium text-[var(--arion-text)]">
            {it.support.noEmailConfigured}
          </p>
        )}

        <div className="space-y-1.5 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3.5 text-xs text-[var(--arion-text-muted)]">
          <p className="font-bold uppercase tracking-wider text-[var(--arion-accent)]">
            {it.support.diagnosticsHeading}
          </p>
          <p>
            {it.app.name} {it.app.versionLabel(env.appVersion)}
          </p>
          <p className="break-all">{userAgent}</p>
        </div>

        <p className="flex items-start gap-2 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] p-3 text-xs font-semibold text-[var(--arion-text)] sm:text-sm">
          <Radio
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--arion-accent)]"
            aria-hidden="true"
          />
          <span>{it.support.urgentNote}</span>
        </p>
      </div>
    </div>
  );
}
