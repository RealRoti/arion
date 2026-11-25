import { useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import type { LivePresenceMember } from '@/domain/models/live';
import { it } from '@/i18n/it';

interface LivePresenceDrawerProps {
  readonly members: readonly LivePresenceMember[];
}

export function LivePresenceDrawer({ members }: LivePresenceDrawerProps) {
  const [open, setOpen] = useState(false);
  const syncedCount = members.filter((m) => m.status === 'synced').length;
  const detachedCount = members.length - syncedCount;

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
      >
        <Users className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
        <span>{it.live.presenceSummary(members.length, syncedCount, detachedCount)}</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-[var(--arion-text-muted)]" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--arion-text-muted)]" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div className="divide-y divide-[var(--arion-border)] rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)]">
          {members.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--arion-text-muted)]">
              {it.live.presenceEmpty}
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[var(--arion-text)]">
                    {member.displayName}
                    {member.isConductor ? (
                      <span className="ml-2 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--arion-accent)]">
                        {it.roles.conductor}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-[var(--arion-text-muted)]">
                    {member.instrumentName}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    member.status === 'synced'
                      ? 'bg-[var(--arion-accent-soft)] text-[var(--arion-accent)]'
                      : 'bg-[var(--arion-danger)]/15 text-[var(--arion-danger)]'
                  }`}
                >
                  {member.status === 'synced' ? it.live.presenceSynced : it.live.presenceDetached}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
