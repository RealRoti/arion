import { useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound, Mail, RefreshCw } from 'lucide-react';
import { ArionLogo } from '@/components/ArionLogo';
import { it } from '@/i18n/it';
import {
  AuthServiceError,
  requestEmailOtp,
  verifyEmailOtp,
  type AuthServiceErrorCode,
} from '@/services/authService';

function getErrorMessage(code: AuthServiceErrorCode): string {
  switch (code) {
    case 'NOT_AUTHORIZED':
      return it.auth.errors.notAuthorized;
    case 'INVALID_OTP':
      return it.auth.errors.invalidOtp;
    case 'RATE_LIMITED':
      return it.auth.errors.rateLimited;
    default:
      return it.auth.errors.generic;
  }
}

export function LoginPage() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!normalizedEmail || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await requestEmailOtp(normalizedEmail);
      setStep('otp');
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setErrorMessage(getErrorMessage(err.code));
      } else {
        setErrorMessage(it.auth.errors.generic);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const cleanedOtp = otpCode.replace(/\s+/g, '');
    if (cleanedOtp.length < 6 || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await verifyEmailOtp(normalizedEmail, cleanedOtp);
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setErrorMessage(getErrorMessage(err.code));
      } else {
        setErrorMessage(it.auth.errors.generic);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!normalizedEmail || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await requestEmailOtp(normalizedEmail);
      setInfoMessage(it.auth.codeResentInfo);
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setErrorMessage(getErrorMessage(err.code));
      } else {
        setErrorMessage(it.auth.errors.generic);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--arion-bg)] px-4 py-8 text-[var(--arion-text)]">
      <div className="w-full max-w-md space-y-5 rounded-md border border-[var(--arion-border)] border-t-4 border-t-[var(--arion-accent)] bg-[var(--arion-surface)] p-6 shadow-xs sm:p-8">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--arion-border)] pb-4">
          <ArionLogo size="md" showWordmark showSubtitle />
          <span className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
            {it.auth.badge}
          </span>
        </div>

        {step === 'email' ? (
          <form onSubmit={(e) => void handleRequestOtp(e)} className="space-y-4">
            <div>
              <h1 className="font-editorial text-2xl font-bold text-[var(--arion-text)]">
                {it.auth.loginTitle}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-[var(--arion-text-muted)]">
                {it.auth.loginSubtitle}
              </p>
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="rounded border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-3 text-sm font-medium text-[var(--arion-danger)]"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-sm font-bold text-[var(--arion-text)]"
              >
                {it.auth.emailLabel}
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={it.auth.emailPlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3.5 py-2 text-base text-[var(--arion-text)] placeholder:text-[var(--arion-text-muted)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !normalizedEmail}
              className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-3 text-sm font-bold text-[var(--arion-primary-contrast)] transition-colors hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
            >
              <Mail className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{submitting ? it.auth.sendingCodeButton : it.auth.sendCodeButton}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={(e) => void handleVerifyOtp(e)} className="space-y-4">
            <div>
              <h1 className="font-editorial text-2xl font-bold text-[var(--arion-text)]">
                {it.auth.otpStepTitle}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-[var(--arion-text-muted)]">
                {it.auth.otpStepSubtitle(normalizedEmail)}
              </p>
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="rounded border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-3 text-sm font-medium text-[var(--arion-danger)]"
              >
                {errorMessage}
              </div>
            ) : null}

            {infoMessage ? (
              <div
                role="status"
                className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] p-3 text-sm font-medium text-[var(--arion-accent)]"
              >
                {infoMessage}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label
                htmlFor="login-otp"
                className="block text-sm font-bold text-[var(--arion-text)]"
              >
                {it.auth.otpLabel}
              </label>
              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder={it.auth.otpPlaceholder}
                className="min-h-12 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3.5 py-2 text-center font-mono text-2xl font-bold tracking-[0.35em] text-[var(--arion-text)] placeholder:tracking-normal placeholder:text-[var(--arion-text-muted)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || otpCode.length < 6}
              className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-3 text-sm font-bold text-[var(--arion-primary-contrast)] transition-colors hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{submitting ? it.auth.verifyingOtpButton : it.auth.verifyOtpButton}</span>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-bold">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleResend()}
                className="touch-target inline-flex items-center gap-1.5 text-[var(--arion-primary)] hover:underline disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{it.auth.resendCodeButton}</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setStep('email');
                  setOtpCode('');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="touch-target inline-flex items-center gap-1 text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{it.auth.changeEmailButton}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
