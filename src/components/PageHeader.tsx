import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--arion-border)] pb-3">
      <div className="min-w-0">
        <h1 className="font-editorial text-2xl font-bold tracking-tight text-[var(--arion-text)] sm:text-[1.7rem]">
          {title}
        </h1>
        <div className="mt-1.5 h-0.5 w-12 bg-[var(--arion-accent)]" aria-hidden="true" />
        {subtitle ? (
          <p className="mt-2 text-sm text-[var(--arion-text-muted)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
