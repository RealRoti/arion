import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Columns2,
  Eye,
  FileText,
  ListMusic,
  Moon,
  Music2,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { useTheme } from '@/components/useTheme';
import { getAppEnv } from '@/config/env';
import { parseChordPro, transposeChordProDocument } from '@/domain/chords/chordpro';
import { calculateEffectiveTransposition, formatKey, parseKey } from '@/domain/chords/transposer';
import type { InstrumentDefaultView } from '@/domain/models/instruments';
import {
  buildClearNextSongPatch,
  buildNextSongAnnouncementPatch,
  buildOffSetlistSongPatch,
  buildReturnToSetlistPatch,
  buildSetlistStepPatch,
  buildStartFromSetlistPatch,
  buildStartFromSongPatch,
  buildTakeoverPatch,
  canTakeoverLiveSession,
  createFlashSignal,
  createIdleLiveSession,
  createInitialLocalState,
  detachLocalState,
  isActiveConductor,
  isOffSetlistSong,
  isRecentFlashSignal,
  reattachLocalState,
  type FlashSignal,
  type LiveConnectionState,
  type LivePresenceMember,
  type LiveSessionState,
  type LiveSessionUpdatePatch,
} from '@/domain/models/live';
import { resolveEffectiveSetlistKey, type SetlistWithItems } from '@/domain/models/setlists';
import {
  pickPreferredPdfAsset,
  resolveReaderViewMode,
  type Song,
  type SongAsset,
  type UserSongPreferences,
} from '@/domain/models/songs';
import { useAuth } from '@/features/auth/useAuth';
import { LiveConductorConsole, LiveConductorLauncher } from '@/features/live/LiveConductorControls';
import { LiveFlashToast } from '@/features/live/LiveFlashToast';
import { LiveNextSongBanner } from '@/features/live/LiveNextSongBanner';
import { LivePresenceDrawer } from '@/features/live/LivePresenceDrawer';
import { ChordProRenderer } from '@/features/reader/ChordProRenderer';
import { PdfCanvasViewer } from '@/features/reader/PdfCanvasViewer';
import { usePedalNavigation } from '@/features/reader/usePedalNavigation';
import { useWakeLock } from '@/features/reader/useWakeLock';
import { it } from '@/i18n/it';
import {
  endLiveSession,
  fetchLiveSession,
  subscribeToLiveChannel,
  updateLiveSession,
  type LiveChannelSubscription,
} from '@/services/liveService';
import { listSetlists } from '@/services/setlistsService';
import {
  getSongById,
  getUserSongPreferences,
  listSongAssets,
  listSongs,
  upsertUserSongPreferences,
} from '@/services/songsService';

const CAPO_FRET_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export function LivePage() {
  const [searchParams] = useSearchParams();
  const startSetlistParam = searchParams.get('startSetlist');
  const startSongParam = searchParams.get('startSong');

  const { profile, activeInstrument, can } = useAuth();
  const { theme, setTheme, notation } = useTheme();
  const isSupabaseConfigured = getAppEnv().isSupabaseConfigured;

  const canHost = can('live:host');
  const canTakeover = can('live:takeover');

  const [session, setSession] = useState<LiveSessionState>(() => createIdleLiveSession());
  const [localState, setLocalState] = useState(() => createInitialLocalState());
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('connecting');
  const [members, setMembers] = useState<LivePresenceMember[]>([]);
  const [visibleSignal, setVisibleSignal] = useState<FlashSignal | null>(null);

  const [setlists, setSetlists] = useState<SetlistWithItems[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(isSupabaseConfigured);
  const [busyAction, setBusyAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmTakeover, setConfirmTakeover] = useState(false);

  const [displayedSong, setDisplayedSong] = useState<Song | null>(null);
  const [assets, setAssets] = useState<SongAsset[]>([]);
  const [capoFrets, setCapoFrets] = useState(0);
  const [preferredAssetId, setPreferredAssetId] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(() => profile?.fontScale ?? 1);
  const [twoColumns, setTwoColumns] = useState(false);
  const [selectedView, setSelectedView] = useState<InstrumentDefaultView>(() =>
    resolveReaderViewMode({
      activeInstrument,
      userPreferenceView: null,
      hasPdfAssets: false,
    }),
  );

  const [nextSongPrefs, setNextSongPrefs] = useState<UserSongPreferences | null>(null);
  const [showBrowseSongs, setShowBrowseSongs] = useState(false);
  const [browseQuery, setBrowseQuery] = useState('');

  const channelRef = useRef<LiveChannelSubscription | null>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const scrollAnchorYRef = useRef(0);
  const lastSignalIdRef = useRef<string | null>(null);

  const scheduleProgrammaticGuard = useCallback(() => {
    programmaticScrollRef.current = true;
    scrollAnchorYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
    if (programmaticScrollTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    if (typeof window !== 'undefined') {
      programmaticScrollTimerRef.current = window.setTimeout(() => {
        programmaticScrollRef.current = false;
        scrollAnchorYRef.current = window.scrollY;
      }, 900);
    }
  }, []);

  useEffect(() => {
    if (!visibleSignal || typeof window === 'undefined') return;
    const timeoutId = window.setTimeout(() => {
      setVisibleSignal(null);
    }, 8000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [visibleSignal]);

  const isConductor = isActiveConductor(session, profile?.id, canHost);
  const showTakeoverPrompt = canTakeoverLiveSession(session, profile?.id, canTakeover);

  // Initial fetch of live session, setlists and songs + Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !profile) {
      return;
    }

    let cancelled = false;

    const acceptSignal = (signal: FlashSignal | null) => {
      if (!signal || !isRecentFlashSignal(signal)) return;
      if (lastSignalIdRef.current === signal.id) return;
      lastSignalIdRef.current = signal.id;
      setVisibleSignal(signal);
    };

    const loadInitial = async () => {
      try {
        const [loadedSession, loadedSetlists, loadedSongs] = await Promise.all([
          fetchLiveSession(),
          listSetlists().catch(() => [] as SetlistWithItems[]),
          listSongs().catch(() => [] as Song[]),
        ]);
        if (cancelled) return;
        setSession(loadedSession);
        setSetlists(loadedSetlists);
        setSongs(loadedSongs);
        acceptSignal(loadedSession.flashSignal);
      } catch {
        if (!cancelled) {
          setErrorMessage(it.live.errorUpdatingSession);
        }
      } finally {
        if (!cancelled) {
          setLoadingInitial(false);
        }
      }
    };

    void loadInitial();

    const subscription = subscribeToLiveChannel({
      presenceKey: profile.id,
      initialPresence: {
        userId: profile.id,
        displayName: profile.displayName,
        role: profile.role,
        instrumentName: activeInstrument?.name ?? it.app.defaultActiveInstrument,
        status: 'synced',
        isConductor: false,
        joinedAt: new Date().toISOString(),
      },
      onStateSync: (incoming) => {
        scheduleProgrammaticGuard();
        setSession(incoming);
        setConfirmTakeover(false);
        if (!incoming.isActive) {
          setLocalState(reattachLocalState());
          setVisibleSignal(null);
        } else {
          acceptSignal(incoming.flashSignal);
        }
      },
      onFlashSignal: (signal) => {
        acceptSignal(signal);
      },
      onPresenceChange: (nextMembers) => {
        setMembers(nextMembers);
      },
      onConnectionChange: (nextState) => {
        setConnectionState(nextState);
      },
    });

    channelRef.current = subscription;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchLiveSession()
          .then((fresh) => {
            if (!cancelled) {
              scheduleProgrammaticGuard();
              setSession(fresh);
            }
          })
          .catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
      channelRef.current = null;
      if (programmaticScrollTimerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(programmaticScrollTimerRef.current);
      }
    };
    // Subscribe once per authenticated user session; instrument/status updates use updatePresence
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupabaseConfigured, profile?.id, scheduleProgrammaticGuard]);

  // Keep Realtime presence synced with current active instrument, conductor flag and detach state
  useEffect(() => {
    if (!profile || !channelRef.current) return;
    void channelRef.current.updatePresence({
      userId: profile.id,
      displayName: profile.displayName,
      role: profile.role,
      instrumentName: activeInstrument?.name ?? it.app.defaultActiveInstrument,
      status: isConductor ? 'synced' : localState.syncStatus,
      isConductor,
      joinedAt: new Date().toISOString(),
    });
  }, [activeInstrument?.name, isConductor, localState.syncStatus, profile]);

  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  const displayedSongId = useMemo(() => {
    if (!session.isActive) return null;
    if (!isConductor && localState.syncStatus === 'detached' && localState.detachedSongId) {
      return localState.detachedSongId;
    }
    return session.activeSongId;
  }, [
    isConductor,
    localState.detachedSongId,
    localState.syncStatus,
    session.activeSongId,
    session.isActive,
  ]);

  // Load displayed song details, assets and local preferences when songId changes
  useEffect(() => {
    if (!displayedSongId) {
      return;
    }

    let cancelled = false;
    const cachedSong = songsById.get(displayedSongId) ?? null;

    const loadSongBundle = async () => {
      try {
        const [resolvedSong, loadedAssets, loadedPrefs] = await Promise.all([
          cachedSong ? Promise.resolve(cachedSong) : getSongById(displayedSongId),
          listSongAssets(displayedSongId).catch(() => [] as SongAsset[]),
          profile?.id
            ? getUserSongPreferences(profile.id, displayedSongId).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        setDisplayedSong(resolvedSong);
        setAssets(loadedAssets);
        setCapoFrets(loadedPrefs?.capoFrets ?? 0);
        setPreferredAssetId(loadedPrefs?.preferredAssetId ?? null);
        const pdfAvailable = loadedAssets.some((a) => a.assetType === 'pdf');
        setSelectedView(
          resolveReaderViewMode({
            activeInstrument,
            userPreferenceView: loadedPrefs?.preferredView ?? null,
            hasPdfAssets: pdfAvailable,
          }),
        );
      } catch {
        // Non-blocking fallback
      }
    };

    void loadSongBundle();
    return () => {
      cancelled = true;
    };
  }, [activeInstrument, displayedSongId, profile?.id, songsById]);

  // Load local preferences for announced Next Song (so guitarist sees own capo hint)
  useEffect(() => {
    if (!session.nextSongId || !profile?.id) {
      return;
    }
    let cancelled = false;
    void getUserSongPreferences(profile.id, session.nextSongId)
      .then((prefs) => {
        if (!cancelled) {
          setNextSongPrefs(prefs);
        }
      })
      .catch(() => {
        if (!cancelled) setNextSongPrefs(null);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, session.nextSongId]);

  // Adjust default view immediately when musician toggles 1-tap active instrument
  const activeInstrumentId = activeInstrument?.id ?? null;
  const [prevInstrumentId, setPrevInstrumentId] = useState<string | null>(activeInstrumentId);
  if (activeInstrumentId !== prevInstrumentId) {
    setPrevInstrumentId(activeInstrumentId);
    const pdfAvailable = assets.some((a) => a.assetType === 'pdf');
    setSelectedView(
      resolveReaderViewMode({
        activeInstrument,
        userPreferenceView: null,
        hasPdfAssets: pdfAvailable,
      }),
    );
  }

  // Manual scroll detach listener for musicians
  useEffect(() => {
    if (isConductor || !session.isActive || localState.syncStatus === 'detached') {
      return;
    }

    const handleScroll = () => {
      if (programmaticScrollRef.current) return;
      if (document.documentElement.scrollHeight <= window.innerHeight + 60) {
        return;
      }
      if (Math.abs(window.scrollY - scrollAnchorYRef.current) > 180) {
        setLocalState((prev) => detachLocalState(prev, {}));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isConductor, localState.syncStatus, session.isActive]);

  useWakeLock(session.isActive);

  const activeSetlist = useMemo(
    () => (session.setlistId ? (setlists.find((s) => s.id === session.setlistId) ?? null) : null),
    [session.setlistId, setlists],
  );

  const offSetlist = useMemo(
    () => (activeSetlist ? isOffSetlistSong(session, activeSetlist.items) : false),
    [activeSetlist, session],
  );

  const currentSetlistIndex = useMemo(() => {
    if (!activeSetlist || offSetlist || !session.activeSetlistItemId) {
      return -1;
    }
    return activeSetlist.items.findIndex((item) => item.id === session.activeSetlistItemId);
  }, [activeSetlist, offSetlist, session.activeSetlistItemId]);

  const applyConductorPatch = async (
    patch: LiveSessionUpdatePatch,
    flashOverride?: FlashSignal,
  ) => {
    if (busyAction) return;
    setBusyAction(true);
    setErrorMessage(null);
    try {
      scheduleProgrammaticGuard();
      const updated = await updateLiveSession(patch);
      setSession(updated);
      await channelRef.current?.sendStateSync(updated);
      if (flashOverride) {
        lastSignalIdRef.current = flashOverride.id;
        setVisibleSignal(flashOverride);
        await channelRef.current?.sendFlashSignal(flashOverride);
      }
    } catch {
      setErrorMessage(it.live.errorUpdatingSession);
    } finally {
      setBusyAction(false);
    }
  };

  const handleStartFromSetlist = (setlist: SetlistWithItems) => {
    if (!profile) return;
    const patch = buildStartFromSetlistPatch(setlist, profile.id, 0);
    if (!patch) return;
    setLocalState(reattachLocalState());
    void applyConductorPatch(patch);
  };

  const handleStartFromSong = (song: Song) => {
    if (!profile) return;
    setLocalState(reattachLocalState());
    void applyConductorPatch(buildStartFromSongPatch(song, profile.id));
  };

  const handleStepSetlist = (targetIndex: number) => {
    if (!activeSetlist) return;
    const patch = buildSetlistStepPatch(activeSetlist, targetIndex);
    if (!patch) return;
    void applyConductorPatch(patch);
  };

  const handleAnnounceNext = () => {
    if (!activeSetlist || currentSetlistIndex < 0) return;
    const nextItem = activeSetlist.items[currentSetlistIndex + 1];
    if (!nextItem) return;
    const nextKey = resolveEffectiveSetlistKey(
      nextItem.song?.originalKey ?? 'Do',
      nextItem.overrideKey,
    );
    void applyConductorPatch(buildNextSongAnnouncementPatch(nextItem.songId, nextKey));
  };

  const handleActivateNextNow = () => {
    if (!session.nextSongId) return;
    if (activeSetlist && currentSetlistIndex >= 0) {
      const nextItem = activeSetlist.items[currentSetlistIndex + 1];
      if (nextItem && nextItem.songId === session.nextSongId) {
        handleStepSetlist(currentSetlistIndex + 1);
        return;
      }
    }
    const targetSong = songsById.get(session.nextSongId);
    if (!targetSong) return;
    void applyConductorPatch({
      active_song_id: targetSong.id,
      active_key: session.nextSongKey ?? targetSong.originalKey,
      active_section_index: null,
      active_page: 1,
      next_song_id: null,
      next_song_key: null,
    });
  };

  const handleEndLive = async () => {
    if (busyAction) return;
    setBusyAction(true);
    setErrorMessage(null);
    try {
      const ended = await endLiveSession();
      setSession(ended);
      setLocalState(reattachLocalState());
      setVisibleSignal(null);
      await channelRef.current?.sendStateSync(ended);
    } catch {
      setErrorMessage(it.live.errorUpdatingSession);
    } finally {
      setBusyAction(false);
    }
  };

  const handleConfirmTakeover = () => {
    if (!profile) return;
    setConfirmTakeover(false);
    setLocalState(reattachLocalState());
    void applyConductorPatch(buildTakeoverPatch(profile.id));
  };

  const handleSendFlashSignal = (message: string) => {
    if (!profile) return;
    const signal = createFlashSignal(message, profile.displayName);
    void applyConductorPatch({ flash_signal: signal }, signal);
  };

  const handleReattach = () => {
    scheduleProgrammaticGuard();
    setLocalState(reattachLocalState());
    setShowBrowseSongs(false);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const pdfPedalRef = useRef<{ next: () => void; prev: () => void } | null>(null);
  const registerPdfPedal = useCallback(
    (handlers: { next: () => void; prev: () => void } | null) => {
      pdfPedalRef.current = handlers;
    },
    [],
  );

  const handlePedalNext = useCallback(() => {
    if (selectedView === 'pdf' && pdfPedalRef.current) {
      pdfPedalRef.current.next();
      return;
    }
    if (typeof window !== 'undefined' && typeof window.scrollBy === 'function') {
      window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: 'smooth' });
    }
  }, [selectedView]);

  const handlePedalPrev = useCallback(() => {
    if (selectedView === 'pdf' && pdfPedalRef.current) {
      pdfPedalRef.current.prev();
      return;
    }
    if (typeof window !== 'undefined' && typeof window.scrollBy === 'function') {
      window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: 'smooth' });
    }
  }, [selectedView]);

  usePedalNavigation({
    enabled: session.isActive && Boolean(displayedSong),
    onNext: handlePedalNext,
    onPrev: handlePedalPrev,
  });

  const isDetachedBrowsingOtherSong = Boolean(
    !isConductor && localState.syncStatus === 'detached' && localState.detachedSongId,
  );

  const effectiveTransposition = useMemo(() => {
    if (!displayedSong) return null;
    return calculateEffectiveTransposition({
      originalKey: displayedSong.originalKey,
      activeKey: isDetachedBrowsingOtherSong ? null : session.activeKey,
      instrumentTranspositionSemitones: activeInstrument?.transpositionSemitones ?? 0,
      capoFrets,
      notation,
    });
  }, [
    activeInstrument?.transpositionSemitones,
    capoFrets,
    displayedSong,
    isDetachedBrowsingOtherSong,
    notation,
    session.activeKey,
  ]);

  const parsedDoc = useMemo(
    () => (displayedSong ? parseChordPro(displayedSong.chordproContent) : null),
    [displayedSong],
  );

  const transposedDoc = useMemo(() => {
    if (!parsedDoc || !effectiveTransposition) return null;
    return transposeChordProDocument(parsedDoc, {
      semitones: effectiveTransposition.totalSemitones,
      notation,
      accidentalPreference: effectiveTransposition.accidentalPreference,
    });
  }, [effectiveTransposition, notation, parsedDoc]);

  const pdfAssets = useMemo(() => assets.filter((a) => a.assetType === 'pdf'), [assets]);
  const hasPdfAssets = pdfAssets.length > 0;
  const selectedPdfAsset = useMemo(
    () => pickPreferredPdfAsset(pdfAssets, activeInstrument?.id ?? null, preferredAssetId),
    [activeInstrument?.id, pdfAssets, preferredAssetId],
  );

  const nextSong = session.nextSongId ? (songsById.get(session.nextSongId) ?? null) : null;
  const nextSongBannerData = useMemo(() => {
    if (!nextSong || !session.nextSongId) {
      return { keyLabel: null as string | null, hintLabel: null as string | null };
    }
    const concertKeyRaw = session.nextSongKey ?? nextSong.originalKey;
    const nextCapo = nextSongPrefs?.capoFrets ?? 0;
    const eff = calculateEffectiveTransposition({
      originalKey: nextSong.originalKey,
      activeKey: concertKeyRaw,
      instrumentTranspositionSemitones: activeInstrument?.transpositionSemitones ?? 0,
      capoFrets: nextCapo,
      notation,
    });
    const hasPersonalHint = nextCapo > 0 || (activeInstrument?.transpositionSemitones ?? 0) !== 0;
    return {
      keyLabel: eff.concertKeyLabel,
      hintLabel: hasPersonalHint ? it.live.nextReadingHint(nextCapo, eff.readingKeyLabel) : null,
    };
  }, [
    activeInstrument?.transpositionSemitones,
    nextSong,
    nextSongPrefs?.capoFrets,
    notation,
    session.nextSongId,
    session.nextSongKey,
  ]);

  const filteredBrowseSongs = useMemo(() => {
    const q = browseQuery.trim().toLowerCase();
    if (!q) return songs.slice(0, 20);
    return songs
      .filter(
        (s) => s.title.toLowerCase().includes(q) || (s.author?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 20);
  }, [browseQuery, songs]);

  const isDarkStage = theme === 'stage_dark' || theme === 'oled_black';
  const showCapoControl = Boolean(activeInstrument?.supportsCapo || capoFrets > 0);
  const defaultSongKeyForConsole =
    activeSetlist && currentSetlistIndex >= 0
      ? resolveEffectiveSetlistKey(
          displayedSong?.originalKey ?? 'Do',
          activeSetlist.items[currentSetlistIndex]?.overrideKey ?? null,
        )
      : (displayedSong?.originalKey ?? 'Do');

  const persistLocalPrefs = (patch: {
    capoFrets?: number;
    preferredView?: InstrumentDefaultView | null;
    preferredAssetId?: string | null;
  }) => {
    if (!profile || !displayedSong) return;
    void upsertUserSongPreferences({
      userId: profile.id,
      songId: displayedSong.id,
      ...patch,
    }).catch(() => undefined);
  };

  if (loadingInitial) {
    return (
      <div className="space-y-4">
        <PageHeader title={it.live.title} />
        <p className="text-sm text-[var(--arion-text-muted)]">{it.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={it.live.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                connectionState === 'connected'
                  ? 'border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] text-[var(--arion-accent)]'
                  : 'border-[var(--arion-border)] bg-[var(--arion-surface)] text-[var(--arion-text-muted)]'
              }`}
            >
              <Radio className="h-3 w-3" aria-hidden="true" />
              <span>{it.live.connectionStates[connectionState]}</span>
            </span>

            {session.isActive && !isConductor ? <LivePresenceDrawer members={members} /> : null}
          </div>
        }
      />

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-3 text-sm font-semibold text-[var(--arion-danger)]"
        >
          {errorMessage}
        </div>
      ) : null}

      <LiveFlashToast signal={visibleSignal} onDismiss={() => setVisibleSignal(null)} />

      {/* Takeover Banner for non-conducting Conductors / Admins */}
      {showTakeoverPrompt ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-4 py-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-semibold text-[var(--arion-text)]">
            <ShieldCheck className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            <span>{it.live.takeoverBannerText(session.conductorName)}</span>
          </div>

          {confirmTakeover ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                disabled={busyAction}
                onClick={handleConfirmTakeover}
                className="touch-target rounded-md bg-[var(--arion-primary)] px-3 py-1.5 text-xs font-bold text-[var(--arion-primary-contrast)]"
              >
                {it.live.confirmTakeoverButton}
              </button>
              <button
                type="button"
                onClick={() => setConfirmTakeover(false)}
                className="touch-target rounded-md border border-[var(--arion-border)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)]"
              >
                {it.common.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busyAction}
              onClick={() => setConfirmTakeover(true)}
              className="touch-target rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--arion-accent)] hover:border-[var(--arion-accent)]"
            >
              {it.live.takeoverButton}
            </button>
          )}
        </div>
      ) : null}

      {!session.isActive ? (
        canHost ? (
          <LiveConductorLauncher
            setlists={setlists}
            songs={songs}
            initialSetlistId={startSetlistParam}
            initialSongId={startSongParam}
            notation={notation}
            busy={busyAction}
            onStartFromSetlist={handleStartFromSetlist}
            onStartFromSong={handleStartFromSong}
          />
        ) : (
          <section className="rounded-md border border-[var(--arion-border)] border-t-4 border-t-[var(--arion-primary)] bg-[var(--arion-surface)] p-5 shadow-2xs sm:p-6">
            <div className="inline-flex items-center gap-2 rounded border border-[var(--arion-border)] bg-[var(--arion-surface-subtle)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--arion-text-muted)]">
              <Radio className="h-3.5 w-3.5 text-[var(--arion-primary)]" aria-hidden="true" />
              <span>{it.live.statusBadgeIdle}</span>
            </div>

            <h2 className="mt-3 font-editorial text-xl font-bold text-[var(--arion-text)]">
              {it.live.idleHeading}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--arion-text-muted)]">
              {it.live.idleDescription}
            </p>

            <div className="mt-4 flex items-center gap-2.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3.5 py-2.5 text-sm">
              <Music2 className="h-4 w-4 shrink-0 text-[var(--arion-accent)]" aria-hidden="true" />
              <span className="text-[var(--arion-text-muted)]">
                {it.live.activeInstrumentLabel}:
              </span>
              <strong className="text-[var(--arion-text)]">
                {activeInstrument?.name ?? it.app.defaultActiveInstrument}
              </strong>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                to="/repertorio"
                className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2.5 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)]"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>{it.live.goToRepertoire}</span>
              </Link>
              <Link
                to="/scalette"
                className="touch-target inline-flex items-center gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-4 py-2.5 text-sm font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
              >
                <ListMusic className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
                <span>{it.live.goToSetlists}</span>
              </Link>
            </div>
          </section>
        )
      ) : (
        <>
          {isConductor ? (
            <LiveConductorConsole
              session={session}
              activeSetlist={activeSetlist}
              currentSetlistIndex={currentSetlistIndex}
              offSetlist={offSetlist}
              defaultSongKey={defaultSongKeyForConsole}
              songs={songs}
              members={members}
              notation={notation}
              busy={busyAction}
              onStepSetlist={handleStepSetlist}
              onAnnounceNext={handleAnnounceNext}
              onLaunchOffSetlistSong={(song) =>
                void applyConductorPatch(buildOffSetlistSongPatch(session, song))
              }
              onReturnToSetlist={() => {
                if (!activeSetlist) return;
                const patch = buildReturnToSetlistPatch(session, activeSetlist);
                if (patch) void applyConductorPatch(patch);
              }}
              onChangeLiveKey={(nextKey) => void applyConductorPatch({ active_key: nextKey })}
              onSendFlashSignal={handleSendFlashSignal}
              onEndLive={() => void handleEndLive()}
            />
          ) : null}

          {/* Musician Detached Banner */}
          {!isConductor && localState.syncStatus === 'detached' ? (
            <div
              data-testid="live-detached-banner"
              className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-[var(--arion-live)] bg-[var(--arion-surface)] px-4 py-2.5 shadow-sm lg:top-4"
            >
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--arion-live)]">
                  {it.live.detachedBannerTitle}
                </p>
                <p className="text-xs text-[var(--arion-text-muted)]">
                  {it.live.detachedBannerSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={handleReattach}
                className="touch-target inline-flex items-center gap-1.5 rounded-md bg-[var(--arion-live)] px-3.5 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{it.live.returnToLiveButton}</span>
              </button>
            </div>
          ) : null}

          <LiveNextSongBanner
            nextSong={nextSong}
            nextKeyLabel={nextSongBannerData.keyLabel}
            readingHintLabel={nextSongBannerData.hintLabel}
            isConductor={isConductor}
            busy={busyAction}
            onActivateNext={handleActivateNextNow}
            onClearNext={() => void applyConductorPatch(buildClearNextSongPatch())}
          />

          {/* Local Lectern Controls + Musician Browse Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-2 shadow-2xs">
            <div className="inline-flex rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] p-0.5">
              <button
                type="button"
                aria-pressed={selectedView === 'lyrics_only'}
                onClick={() => {
                  setSelectedView('lyrics_only');
                  persistLocalPrefs({ preferredView: 'lyrics_only' });
                }}
                className={`touch-target inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold transition-colors ${
                  selectedView === 'lyrics_only'
                    ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                    : 'text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
                }`}
              >
                <span>{it.reader.modeLyricsOnly}</span>
              </button>

              <button
                type="button"
                aria-pressed={selectedView === 'chords'}
                onClick={() => {
                  setSelectedView('chords');
                  persistLocalPrefs({ preferredView: 'chords' });
                }}
                className={`touch-target inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold transition-colors ${
                  selectedView === 'chords'
                    ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                    : 'text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
                }`}
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{it.reader.modeChords}</span>
              </button>

              {hasPdfAssets ? (
                <button
                  type="button"
                  aria-pressed={selectedView === 'pdf'}
                  onClick={() => {
                    setSelectedView('pdf');
                    persistLocalPrefs({ preferredView: 'pdf' });
                  }}
                  className={`touch-target inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold transition-colors ${
                    selectedView === 'pdf'
                      ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                      : 'text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{it.reader.modePdf}</span>
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {selectedView !== 'pdf' ? (
                <>
                  <div className="inline-flex items-center rounded border border-[var(--arion-border)] bg-[var(--arion-bg)]">
                    <button
                      type="button"
                      onClick={() =>
                        setFontScale((prev) => Math.max(0.85, Number((prev - 0.1).toFixed(2))))
                      }
                      aria-label={it.reader.fontDecreaseLabel}
                      className="touch-target rounded px-2 py-1 text-xs font-bold text-[var(--arion-text)]"
                    >
                      {it.reader.fontDecreaseShort}
                    </button>
                    <span className="min-w-[2.75rem] text-center text-xs font-semibold text-[var(--arion-text-muted)]">
                      {Math.round(fontScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFontScale((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(2))))
                      }
                      aria-label={it.reader.fontIncreaseLabel}
                      className="touch-target rounded px-2 py-1 text-xs font-bold text-[var(--arion-text)]"
                    >
                      {it.reader.fontIncreaseShort}
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-pressed={twoColumns}
                    onClick={() => setTwoColumns((prev) => !prev)}
                    className={`touch-target hidden items-center gap-1 rounded border px-2.5 py-1 text-xs font-bold md:inline-flex ${
                      twoColumns
                        ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                        : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)]'
                    }`}
                  >
                    <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{it.reader.twoColumnsLabel}</span>
                  </button>

                  {selectedView === 'chords' && showCapoControl ? (
                    <label className="inline-flex items-center gap-1 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-1 text-xs font-bold text-[var(--arion-text)]">
                      <span>{it.reader.capoLabel}</span>
                      <select
                        aria-label={it.reader.capoLabel}
                        value={capoFrets}
                        onChange={(e) => {
                          const nextCapo = Number(e.target.value);
                          setCapoFrets(nextCapo);
                          persistLocalPrefs({ capoFrets: nextCapo });
                        }}
                        className="bg-transparent font-bold text-[var(--arion-primary)] focus:outline-none"
                      >
                        {CAPO_FRET_OPTIONS.map((fret) => (
                          <option key={fret} value={fret}>
                            {fret === 0 ? it.reader.capoNone : it.reader.capoFret(fret)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </>
              ) : null}

              <button
                type="button"
                onClick={() => setTheme(isDarkStage ? 'daylight' : 'stage_dark')}
                className="touch-target inline-flex items-center gap-1 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-1 text-xs font-bold text-[var(--arion-text)]"
              >
                {isDarkStage ? (
                  <Sun className="h-3.5 w-3.5 text-[var(--arion-accent)]" aria-hidden="true" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-[var(--arion-primary)]" aria-hidden="true" />
                )}
                <span>
                  {isDarkStage ? it.themes.stageToggleToLight : it.themes.stageToggleToDark}
                </span>
              </button>

              {!isConductor ? (
                <button
                  type="button"
                  aria-expanded={showBrowseSongs}
                  onClick={() => setShowBrowseSongs((prev) => !prev)}
                  className="touch-target inline-flex items-center gap-1 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-1 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
                >
                  <Search className="h-3.5 w-3.5 text-[var(--arion-accent)]" aria-hidden="true" />
                  <span>{it.live.browseOtherSongButton}</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Musician local song browser (triggers detach without affecting Conductor/others) */}
          {!isConductor && showBrowseSongs ? (
            <div className="space-y-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-3 shadow-2xs">
              <input
                type="search"
                aria-label={it.live.browseOtherSongPlaceholder}
                value={browseQuery}
                onChange={(e) => setBrowseQuery(e.target.value)}
                placeholder={it.live.browseOtherSongPlaceholder}
                className="min-h-10 w-full rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-1.5 text-xs text-[var(--arion-text)]"
              />
              <div className="max-h-48 divide-y divide-[var(--arion-border)] overflow-y-auto rounded border border-[var(--arion-border)] bg-[var(--arion-bg)]">
                {filteredBrowseSongs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setLocalState((prev) => detachLocalState(prev, { detachedSongId: s.id }));
                      setShowBrowseSongs(false);
                      setBrowseQuery('');
                    }}
                    className="touch-target flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--arion-surface-subtle)]"
                  >
                    <span className="truncate font-bold text-[var(--arion-text)]">{s.title}</span>
                    <span className="shrink-0 font-semibold text-[var(--arion-accent)]">
                      {(() => {
                        const p = parseKey(s.originalKey);
                        return p ? formatKey(p, notation) : s.originalKey;
                      })()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Main Synchronized Lectern Card */}
          {displayedSong && transposedDoc && effectiveTransposition ? (
            <article className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-2xs sm:p-7">
              <header className="space-y-2 border-b border-[var(--arion-border)] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h1 className="font-editorial text-2xl font-bold text-[var(--arion-text)]">
                    {displayedSong.title}
                  </h1>
                  {session.conductorName ? (
                    <span className="text-xs font-semibold text-[var(--arion-text-muted)]">
                      {it.live.conductorNameLabel(session.conductorName)}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-[var(--arion-text-muted)]">
                  {selectedView === 'chords' ? (
                    <span className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 font-bold text-[var(--arion-accent)]">
                      {it.reader.readingKeyNote(
                        effectiveTransposition.concertKeyLabel,
                        capoFrets,
                        effectiveTransposition.readingKeyLabel,
                      )}
                    </span>
                  ) : (
                    <span>
                      {it.reader.keyPrefix}{' '}
                      <strong className="text-[var(--arion-text)]">
                        {effectiveTransposition.concertKeyLabel}
                      </strong>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--arion-accent)]">
                    <Music2 className="h-3 w-3" aria-hidden="true" />
                    <span>
                      {it.live.readingAsLabel(
                        activeInstrument?.name ?? it.app.defaultActiveInstrument,
                      )}
                    </span>
                  </span>
                </div>

                {displayedSong.conductorNotes ? (
                  <div className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-3 py-2 text-xs text-[var(--arion-text)]">
                    <strong className="text-[var(--arion-accent)]">
                      {it.reader.conductorNotesTitle}:
                    </strong>{' '}
                    {displayedSong.conductorNotes}
                  </div>
                ) : null}

                {isConductor && selectedView !== 'pdf' ? (
                  <p className="text-[11px] text-[var(--arion-text-muted)]">
                    {it.live.sectionSyncHint}
                  </p>
                ) : null}
              </header>

              <div className="mt-5">
                {selectedView === 'pdf' && hasPdfAssets ? (
                  <PdfCanvasViewer
                    assets={pdfAssets}
                    selectedAssetId={selectedPdfAsset?.id ?? null}
                    onSelectAsset={(assetId) => {
                      setPreferredAssetId(assetId);
                      persistLocalPrefs({ preferredAssetId: assetId });
                    }}
                    onRegisterPedalHandlers={registerPdfPedal}
                    controlledPage={
                      isConductor || localState.syncStatus === 'synced'
                        ? (session.activePage ?? 1)
                        : (localState.detachedPage ?? undefined)
                    }
                    onPageChange={(nextPage) => {
                      if (isConductor) {
                        void applyConductorPatch({ active_page: nextPage });
                      } else {
                        setLocalState((prev) => detachLocalState(prev, { detachedPage: nextPage }));
                      }
                    }}
                  />
                ) : (
                  <ChordProRenderer
                    document={transposedDoc}
                    showChords={selectedView === 'chords'}
                    fontScale={fontScale}
                    twoColumns={twoColumns}
                    activeSectionIndex={
                      isConductor || localState.syncStatus === 'synced'
                        ? session.activeSectionIndex
                        : null
                    }
                    onSelectSection={
                      isConductor
                        ? (sectionIndex) => {
                            const nextIdx =
                              session.activeSectionIndex === sectionIndex ? null : sectionIndex;
                            void applyConductorPatch({ active_section_index: nextIdx });
                          }
                        : undefined
                    }
                  />
                )}
              </div>
            </article>
          ) : (
            <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6 text-sm text-[var(--arion-text-muted)]">
              {it.common.loading}
            </div>
          )}
        </>
      )}
    </div>
  );
}
