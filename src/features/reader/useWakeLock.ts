import { useEffect, useRef, useState } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

export function useWakeLock(enabled: boolean): boolean {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined') {
      return;
    }

    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock?.request) {
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel = await nav.wakeLock?.request('screen');
        if (!sentinel) return;
        if (cancelled) {
          void sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        setActive(true);
      } catch {
        if (!cancelled) {
          setActive(false);
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sentinelRef.current) {
        void sentinelRef.current.release();
        sentinelRef.current = null;
      }
      setActive(false);
    };
  }, [enabled]);

  return active;
}
