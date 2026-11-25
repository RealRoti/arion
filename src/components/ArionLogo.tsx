import { it } from '@/i18n/it';

interface ArionLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  showSubtitle?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<ArionLogoProps['size']>, string> = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function ArionLogo({
  size = 'md',
  showWordmark = true,
  showSubtitle = false,
}: ArionLogoProps) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center rounded-lg border border-[var(--arion-border)] bg-[var(--arion-primary)] p-1.5 shadow-2xs`}
      >
        <svg
          viewBox="0 0 128 128"
          fill="none"
          role="img"
          aria-label={it.app.logoLabel}
          className="h-full w-full"
        >
          <path
            d="M26 84C31 54 55 32 84 33C92 33 100 37 105 42C109 46 115 47 118 49C112 53 106 53 100 54C92 55 85 59 80 66C75 73 70 78 63 81C58 83 51 81 47 86C42 90 44 98 50 102C39 102 31 95 26 84Z"
            fill="var(--arion-primary-contrast)"
          />
          <path
            d="M55 41C58 29 67 24 75 24C71 30 70 36 72 40C66 39 60 40 55 41Z"
            fill="var(--arion-primary-contrast)"
            opacity="0.82"
          />
          <path
            d="M28 82C20 85 13 81 10 75C16 77 22 76 27 72C26 76 27 79 28 82Z"
            fill="var(--arion-primary-contrast)"
            opacity="0.82"
          />
          <circle cx="88" cy="44" r="2.8" fill="var(--arion-primary)" />
          <circle cx="102" cy="25" r="4.8" fill="#C9A25B" />
          <path
            d="M105.5 25V12L115 14.5"
            stroke="#C9A25B"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showWordmark ? (
        <div className="flex flex-col leading-tight">
          <span className="font-editorial text-lg font-bold tracking-tight text-[var(--arion-text)]">
            {it.app.name}
          </span>
          {showSubtitle ? (
            <span className="text-xs text-[var(--arion-text-muted)]">{it.app.subtitle}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
