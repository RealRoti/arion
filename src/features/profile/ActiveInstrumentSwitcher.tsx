import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Music2, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { partitionSelectableInstruments, type Instrument } from '@/domain/models/instruments';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';

interface ActiveInstrumentSwitcherProps {
  placement?: 'down' | 'up';
  className?: string;
}

export function ActiveInstrumentSwitcher({
  placement = 'down',
  className = '',
}: ActiveInstrumentSwitcherProps) {
  const { instruments, userInstruments, activeInstrument, setActiveInstrument } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const { assigned, others } = partitionSelectableInstruments(instruments, userInstruments);
  const activeLabel = activeInstrument?.name ?? it.app.defaultActiveInstrument;

  const handleSelect = (instrumentId: string) => {
    setOpen(false);
    void setActiveInstrument(instrumentId);
  };

  const renderGroup = (heading: string, groupItems: readonly Instrument[]) => (
    <div className="py-1">
      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--arion-accent)]">
        {heading}
      </p>
      {groupItems.map((inst) => {
        const selected = activeInstrument?.id === inst.id;
        return (
          <button
            key={inst.id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => handleSelect(inst.id)}
            className={`touch-target flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
              selected
                ? 'bg-[var(--arion-accent-soft)] font-bold text-[var(--arion-text)]'
                : 'text-[var(--arion-text)] hover:bg-[var(--arion-surface-subtle)]'
            }`}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{inst.name}</p>
              <p className="truncate text-[11px] text-[var(--arion-text-muted)]">
                {it.instruments.defaultViews[inst.defaultView]}
                {inst.transpositionSemitones !== 0
                  ? ` · ${it.instruments.transpositionLabel(inst.transpositionSemitones)}`
                  : ''}
              </p>
            </div>
            {selected ? (
              <Check className="h-4 w-4 shrink-0 text-[var(--arion-accent)]" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={it.instruments.switcherButtonLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="touch-target flex w-full items-center justify-between gap-1.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--arion-text)] transition-colors hover:border-[var(--arion-accent)]"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Music2 className="h-3.5 w-3.5 shrink-0 text-[var(--arion-accent)]" aria-hidden="true" />
          <span className="truncate">{activeLabel}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[var(--arion-text-muted)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={it.instruments.switcherMenuLabel}
          className={`absolute z-40 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-lg ${
            placement === 'up' ? 'bottom-full left-0 mb-1.5' : 'right-0 top-full mt-1.5'
          }`}
        >
          <div className="max-h-72 divide-y divide-[var(--arion-border)] overflow-y-auto">
            {instruments.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[var(--arion-text-muted)]">
                {it.instruments.noInstrumentsAvailable}
              </p>
            ) : assigned.length > 0 ? (
              <>
                {renderGroup(it.instruments.myInstrumentsHeading, assigned)}
                {others.length > 0
                  ? renderGroup(it.instruments.otherInstrumentsHeading, others)
                  : null}
              </>
            ) : (
              renderGroup(it.instruments.allInstrumentsHeading, instruments)
            )}
          </div>

          <div className="border-t border-[var(--arion-border)] bg-[var(--arion-surface-subtle)] p-1.5">
            <Link
              to="/impostazioni"
              onClick={() => setOpen(false)}
              className="touch-target flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-bold text-[var(--arion-primary)] hover:bg-[var(--arion-surface)]"
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{it.instruments.manageMyInstrumentsLink}</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
