import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Eye,
  FileText,
  ListMusic,
  Minus,
  Moon,
  Music2,
  Pencil,
  Plus,
  RotateCcw,
  Sun,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { RequirePermission } from '@/components/RequirePermission';
import { useTheme } from '@/components/useTheme';
import { parseChordPro, transposeChordProDocument } from '@/domain/chords/chordpro';
import {
  calculateEffectiveTransposition,
  computeKeyOffsetSemitones,
  formatKey,
  parseKey,
} from '@/domain/chords/transposer';
import type { InstrumentDefaultView } from '@/domain/models/instruments';
import {
  getSequentialNavigation,
  resolveEffectiveSetlistKey,
  type SetlistWithItems,
} from '@/domain/models/setlists';
import {
  pickPreferredPdfAsset,
  resolveReaderViewMode,
  type Song,
  type SongAsset,
} from '@/domain/models/songs';
import { useAuth } from '@/features/auth/useAuth';
import { ChordProRenderer } from '@/features/reader/ChordProRenderer';
import { PdfCanvasViewer } from '@/features/reader/PdfCanvasViewer';
import { usePedalNavigation } from '@/features/reader/usePedalNavigation';
import { useWakeLock } from '@/features/reader/useWakeLock';
import { it } from '@/i18n/it';
import { updateOwnProfile } from '@/services/authService';
import { getSetlistById } from '@/services/setlistsService';
import {
  getSongById,
  getUserSongPreferences,
  listSongAssets,
  upsertUserSongPreferences,
} from '@/services/songsService';

const CAPO_FRET_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export function SongReaderPage() {
  const { songId } = useParams<{ songId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, setTheme, notation } = useTheme();
  const { profile, activeInstrument } = useAuth();

  const setlistIdParam = searchParams.get('setlist');
  const setlistItemIdParam = searchParams.get('item');

  const [song, setSong] = useState<Song | null>(null);
  const [assets, setAssets] = useState<SongAsset[]>([]);
  const [activeSetlist, setActiveSetlist] = useState<SetlistWithItems | null>(null);
  const [loading, setLoading] = useState(Boolean(songId));
  const [notFound, setNotFound] = useState(!songId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedView, setSelectedView] = useState<InstrumentDefaultView>(() =>
    resolveReaderViewMode({
      activeInstrument,
      userPreferenceView: null,
      hasPdfAssets: false,
    }),
  );
  const [capoFrets, setCapoFrets] = useState(0);
  const [studyShift, setStudyShift] = useState(0);
  const [fontScale, setFontScale] = useState(() => profile?.fontScale ?? 1);
  const [twoColumns, setTwoColumns] = useState(false);
  const [preferredAssetId, setPreferredAssetId] = useState<string | null>(null);

  const routeResetKey = `${songId ?? ''}::${setlistIdParam ?? ''}::${setlistItemIdParam ?? ''}`;
  const [prevRouteResetKey, setPrevRouteResetKey] = useState(routeResetKey);
  if (routeResetKey !== prevRouteResetKey) {
    setPrevRouteResetKey(routeResetKey);
    setStudyShift(0);
    setLoading(Boolean(songId));
    setNotFound(!songId);
    setErrorMessage(null);
  }

  const pdfAssets = useMemo(() => assets.filter((asset) => asset.assetType === 'pdf'), [assets]);
  const hasPdfAssets = pdfAssets.length > 0;

  const activeInstrumentId = activeInstrument?.id ?? null;
  const [prevInstrumentId, setPrevInstrumentId] = useState<string | null>(activeInstrumentId);
  if (activeInstrumentId !== prevInstrumentId) {
    setPrevInstrumentId(activeInstrumentId);
    setSelectedView(
      resolveReaderViewMode({
        activeInstrument,
        userPreferenceView: null,
        hasPdfAssets,
      }),
    );
  }

  useEffect(() => {
    if (!songId) {
      return;
    }

    let cancelled = false;
    const userId = profile?.id ?? null;

    const load = async () => {
      try {
        const [loadedSong, loadedAssets, loadedPrefs, loadedSetlist] = await Promise.all([
          getSongById(songId),
          listSongAssets(songId),
          userId ? getUserSongPreferences(userId, songId).catch(() => null) : Promise.resolve(null),
          setlistIdParam ? getSetlistById(setlistIdParam).catch(() => null) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (!loadedSong) {
          setNotFound(true);
          return;
        }

        const pdfAvailable = loadedAssets.some((asset) => asset.assetType === 'pdf');
        const prefView = loadedPrefs?.preferredView ?? null;

        setSong(loadedSong);
        setAssets(loadedAssets);
        setActiveSetlist(loadedSetlist);
        setCapoFrets(loadedPrefs?.capoFrets ?? 0);
        setPreferredAssetId(loadedPrefs?.preferredAssetId ?? null);
        setSelectedView(
          resolveReaderViewMode({
            activeInstrument,
            userPreferenceView: prefView,
            hasPdfAssets: pdfAvailable,
          }),
        );
      } catch {
        if (!cancelled) {
          setErrorMessage(it.errors.generic);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeInstrument, profile?.id, setlistIdParam, songId]);

  const setlistNavigation = useMemo(() => {
    if (!activeSetlist) return null;
    return getSequentialNavigation(activeSetlist.items, setlistItemIdParam, songId);
  }, [activeSetlist, setlistItemIdParam, songId]);

  const navigateToSetlistItem = useCallback(
    (targetItemId: string, targetSongId: string) => {
      if (!activeSetlist) return;
      navigate(`/repertorio/${targetSongId}?setlist=${activeSetlist.id}&item=${targetItemId}`);
    },
    [activeSetlist, navigate],
  );

  const wakeLockActive = useWakeLock(Boolean(song) && !loading);

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
    if (typeof window !== 'undefined') {
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
      if (atBottom && setlistNavigation?.nextItem) {
        navigateToSetlistItem(setlistNavigation.nextItem.id, setlistNavigation.nextItem.songId);
        return;
      }
      if (typeof window.scrollBy === 'function') {
        window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: 'smooth' });
      }
    }
  }, [navigateToSetlistItem, selectedView, setlistNavigation]);

  const handlePedalPrev = useCallback(() => {
    if (selectedView === 'pdf' && pdfPedalRef.current) {
      pdfPedalRef.current.prev();
      return;
    }
    if (typeof window !== 'undefined') {
      const atTop = window.scrollY <= 8;
      if (atTop && setlistNavigation?.prevItem) {
        navigateToSetlistItem(setlistNavigation.prevItem.id, setlistNavigation.prevItem.songId);
        return;
      }
      if (typeof window.scrollBy === 'function') {
        window.scrollBy({ top: -Math.round(window.innerHeight * 0.75), behavior: 'smooth' });
      }
    }
  }, [navigateToSetlistItem, selectedView, setlistNavigation]);

  usePedalNavigation({
    enabled: Boolean(song) && !loading,
    onNext: handlePedalNext,
    onPrev: handlePedalPrev,
  });

  const overrideKey = setlistNavigation?.currentItem?.overrideKey ?? null;

  const effectiveTransposition = useMemo(() => {
    if (!song) return null;
    if (overrideKey) {
      if (studyShift === 0) {
        return calculateEffectiveTransposition({
          originalKey: song.originalKey,
          activeKey: overrideKey,
          instrumentTranspositionSemitones: activeInstrument?.transpositionSemitones ?? 0,
          capoFrets,
          notation,
        });
      }
      const overrideOffset = computeKeyOffsetSemitones(song.originalKey, overrideKey);
      return calculateEffectiveTransposition({
        originalKey: song.originalKey,
        explicitSemitoneShift: overrideOffset + studyShift,
        instrumentTranspositionSemitones: activeInstrument?.transpositionSemitones ?? 0,
        capoFrets,
        notation,
      });
    }
    return calculateEffectiveTransposition({
      originalKey: song.originalKey,
      explicitSemitoneShift: studyShift,
      instrumentTranspositionSemitones: activeInstrument?.transpositionSemitones ?? 0,
      capoFrets,
      notation,
    });
  }, [
    activeInstrument?.transpositionSemitones,
    capoFrets,
    notation,
    overrideKey,
    song,
    studyShift,
  ]);

  const parsedDoc = useMemo(() => (song ? parseChordPro(song.chordproContent) : null), [song]);

  const transposedDoc = useMemo(() => {
    if (!parsedDoc || !effectiveTransposition) return null;
    return transposeChordProDocument(parsedDoc, {
      semitones: effectiveTransposition.totalSemitones,
      notation,
      accidentalPreference: effectiveTransposition.accidentalPreference,
    });
  }, [effectiveTransposition, notation, parsedDoc]);

  const selectedPdfAsset = useMemo(
    () => pickPreferredPdfAsset(pdfAssets, activeInstrument?.id ?? null, preferredAssetId),
    [activeInstrument?.id, pdfAssets, preferredAssetId],
  );

  const persistPreferences = (patch: {
    capoFrets?: number;
    preferredView?: InstrumentDefaultView | null;
    preferredAssetId?: string | null;
  }) => {
    if (!profile || !song) return;
    void upsertUserSongPreferences({
      userId: profile.id,
      songId: song.id,
      ...patch,
    }).catch(() => undefined);
  };

  const handleSelectView = (nextView: InstrumentDefaultView) => {
    setSelectedView(nextView);
    persistPreferences({ preferredView: nextView });
  };

  const handleCapoChange = (nextCapo: number) => {
    setCapoFrets(nextCapo);
    persistPreferences({ capoFrets: nextCapo });
  };

  const handleSelectPdfAsset = (assetId: string) => {
    setPreferredAssetId(assetId);
    persistPreferences({ preferredAssetId: assetId });
  };

  const updateScale = (nextScale: number) => {
    setFontScale(nextScale);
    if (profile) {
      void updateOwnProfile(profile.id, { fontScale: nextScale }).catch(() => undefined);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--arion-text-muted)]">{it.common.loading}</p>;
  }

  if (errorMessage) {
    return (
      <div className="space-y-4">
        <Link
          to="/repertorio"
          className="touch-target inline-flex items-center gap-2 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{it.reader.backToRepertoire}</span>
        </Link>
        <div
          role="alert"
          className="rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-4 text-sm font-semibold text-[var(--arion-danger)]"
        >
          {errorMessage}
        </div>
      </div>
    );
  }

  if (notFound || !song || !transposedDoc || !effectiveTransposition) {
    return (
      <div className="space-y-4">
        <Link
          to="/repertorio"
          className="touch-target inline-flex items-center gap-2 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{it.reader.backToRepertoire}</span>
        </Link>
        <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6">
          <h1 className="font-editorial text-xl font-bold text-[var(--arion-text)]">
            {it.reader.notFoundTitle}
          </h1>
          <p className="mt-1 text-sm text-[var(--arion-text-muted)]">
            {it.reader.notFoundSubtitle}
          </p>
        </div>
      </div>
    );
  }

  const isDarkStage = theme === 'stage_dark' || theme === 'oled_black';
  const showCapoControl = Boolean(activeInstrument?.supportsCapo || capoFrets > 0);
  const parsedOriginalKey = parseKey(song.originalKey);
  const originalKeyLabel = parsedOriginalKey
    ? formatKey(parsedOriginalKey, notation)
    : song.originalKey;
  const isTransposedOrCapo =
    effectiveTransposition.totalSemitones !== 0 || capoFrets > 0 || studyShift !== 0;

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={activeSetlist ? `/scalette/${activeSetlist.id}` : '/repertorio'}
          className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{activeSetlist ? it.reader.backToSetlist : it.reader.backToRepertoire}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-0.5 shadow-2xs">
            <button
              type="button"
              aria-pressed={selectedView === 'lyrics_only'}
              onClick={() => handleSelectView('lyrics_only')}
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
              onClick={() => handleSelectView('chords')}
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
                onClick={() => handleSelectView('pdf')}
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

          <button
            type="button"
            onClick={() => setTheme(isDarkStage ? 'daylight' : 'stage_dark')}
            className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] shadow-2xs hover:border-[var(--arion-accent)]"
          >
            {isDarkStage ? (
              <Sun className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--arion-primary)]" aria-hidden="true" />
            )}
            <span>{isDarkStage ? it.themes.stageToggleToLight : it.themes.stageToggleToDark}</span>
          </button>

          <RequirePermission permission="songs:update" fallback={null}>
            <Link
              to={`/repertorio/${song.id}/modifica`}
              className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] shadow-2xs hover:border-[var(--arion-accent)]"
            >
              <Pencil className="h-3.5 w-3.5 text-[var(--arion-accent)]" aria-hidden="true" />
              <span>{it.reader.editSongButton}</span>
            </Link>
          </RequirePermission>
        </div>
      </div>

      {/* Text / Transposition / Capo Controls (when not in PDF view) */}
      {selectedView !== 'pdf' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] px-3 py-2 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Font scale */}
            <div className="inline-flex items-center rounded border border-[var(--arion-border)] bg-[var(--arion-bg)]">
              <button
                type="button"
                onClick={() => updateScale(Math.max(0.85, Number((fontScale - 0.1).toFixed(2))))}
                aria-label={it.reader.fontDecreaseLabel}
                className="touch-target rounded px-2.5 py-1 text-xs font-bold text-[var(--arion-text)] hover:bg-[var(--arion-surface-subtle)]"
              >
                {it.reader.fontDecreaseShort}
              </button>
              <span
                aria-label={it.reader.fontScaleLabel}
                className="min-w-[3rem] text-center text-xs font-semibold text-[var(--arion-text-muted)]"
              >
                {Math.round(fontScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => updateScale(Math.min(1.5, Number((fontScale + 0.1).toFixed(2))))}
                aria-label={it.reader.fontIncreaseLabel}
                className="touch-target rounded px-2.5 py-1 text-xs font-bold text-[var(--arion-text)] hover:bg-[var(--arion-surface-subtle)]"
              >
                {it.reader.fontIncreaseShort}
              </button>
            </div>

            {/* 2 Columns toggle on tablet/desktop */}
            <button
              type="button"
              aria-pressed={twoColumns}
              onClick={() => setTwoColumns((prev) => !prev)}
              className={`touch-target hidden items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-bold transition-colors md:inline-flex ${
                twoColumns
                  ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                  : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{it.reader.twoColumnsLabel}</span>
            </button>
          </div>

          {selectedView === 'chords' ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Study Transpose */}
              <div className="inline-flex items-center gap-1 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-1.5 py-0.5">
                <span className="px-1 text-[11px] font-bold text-[var(--arion-text-muted)]">
                  {it.reader.studyTransposeLabel}
                </span>
                <button
                  type="button"
                  aria-label={it.reader.transposeDownLabel}
                  onClick={() => setStudyShift((prev) => Math.max(-11, prev - 1))}
                  className="touch-target rounded p-1 text-[var(--arion-text)] hover:bg-[var(--arion-surface-subtle)]"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="min-w-[2rem] text-center text-xs font-bold text-[var(--arion-text)]">
                  {studyShift === 0 ? '0' : studyShift > 0 ? `+${studyShift}` : studyShift}
                </span>
                <button
                  type="button"
                  aria-label={it.reader.transposeUpLabel}
                  onClick={() => setStudyShift((prev) => Math.min(11, prev + 1))}
                  className="touch-target rounded p-1 text-[var(--arion-text)] hover:bg-[var(--arion-surface-subtle)]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                {studyShift !== 0 ? (
                  <button
                    type="button"
                    aria-label={it.reader.transposeResetLabel}
                    onClick={() => setStudyShift(0)}
                    className="touch-target rounded p-1 text-[var(--arion-accent)] hover:bg-[var(--arion-surface-subtle)]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              {/* Local Capo */}
              {showCapoControl ? (
                <label className="inline-flex items-center gap-1.5 rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-1 text-xs font-bold text-[var(--arion-text)]">
                  <span>{it.reader.capoLabel}</span>
                  <select
                    aria-label={it.reader.capoLabel}
                    value={capoFrets}
                    onChange={(e) => handleCapoChange(Number(e.target.value))}
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
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Sequential Setlist Navigation Strip */}
      {activeSetlist && setlistNavigation && setlistNavigation.currentItem ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2 font-bold text-[var(--arion-text)]">
            <ListMusic className="h-4 w-4 shrink-0 text-[var(--arion-accent)]" aria-hidden="true" />
            <span className="truncate">
              {it.reader.setlistPositionLabel(
                setlistNavigation.currentIndex + 1,
                setlistNavigation.total,
                activeSetlist.title,
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={!setlistNavigation.prevItem}
              onClick={() => {
                if (setlistNavigation.prevItem) {
                  navigateToSetlistItem(
                    setlistNavigation.prevItem.id,
                    setlistNavigation.prevItem.songId,
                  );
                }
              }}
              className="touch-target inline-flex items-center gap-1 rounded border border-[var(--arion-border)] bg-[var(--arion-surface)] px-2.5 py-1 font-bold text-[var(--arion-text)] disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{it.reader.setlistPrevButton}</span>
            </button>

            <button
              type="button"
              disabled={!setlistNavigation.nextItem}
              onClick={() => {
                if (setlistNavigation.nextItem) {
                  navigateToSetlistItem(
                    setlistNavigation.nextItem.id,
                    setlistNavigation.nextItem.songId,
                  );
                }
              }}
              className="touch-target inline-flex items-center gap-1 rounded bg-[var(--arion-primary)] px-2.5 py-1 font-bold text-[var(--arion-primary-contrast)] disabled:opacity-40"
            >
              <span>{it.reader.setlistNextButton}</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Main Lectern Card */}
      <article className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-2xs sm:p-7">
        <header className="space-y-2 border-b border-[var(--arion-border)] pb-4">
          <h1 className="font-editorial text-2xl font-bold text-[var(--arion-text)]">
            {song.title}
          </h1>
          {song.subtitle ? (
            <p className="text-sm text-[var(--arion-text-muted)]">{song.subtitle}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-[var(--arion-text-muted)]">
            {isTransposedOrCapo && selectedView === 'chords' ? (
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
                <strong className="text-[var(--arion-text)]">{originalKeyLabel}</strong>
              </span>
            )}

            {song.tempoBpm ? (
              <span>
                {it.reader.tempoPrefix}{' '}
                <strong className="text-[var(--arion-text)]">
                  {song.tempoBpm} BPM{song.timeSignature ? ` · ${song.timeSignature}` : ''}
                </strong>
              </span>
            ) : song.timeSignature ? (
              <span>
                <strong className="text-[var(--arion-text)]">{song.timeSignature}</strong>
              </span>
            ) : null}

            {song.author ? (
              <span>
                {it.reader.authorLabel}{' '}
                <strong className="text-[var(--arion-text)]">{song.author}</strong>
              </span>
            ) : null}

            {activeInstrument ? (
              <span className="inline-flex items-center gap-1 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--arion-accent)]">
                <Music2 className="h-3 w-3" aria-hidden="true" />
                <span>{activeInstrument.name}</span>
              </span>
            ) : null}

            {wakeLockActive ? (
              <span className="text-[11px] text-[var(--arion-text-muted)]">
                · {it.reader.wakeLockActive}
              </span>
            ) : null}
          </div>

          {setlistNavigation?.currentItem?.notes ? (
            <div className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-xs text-[var(--arion-text)]">
              <strong className="text-[var(--arion-accent)]">
                {it.reader.setlistItemNotesLabel}:
              </strong>{' '}
              {setlistNavigation.currentItem.notes}
            </div>
          ) : null}

          {song.conductorNotes ? (
            <div className="rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-3 py-2 text-xs text-[var(--arion-text)]">
              <strong className="text-[var(--arion-accent)]">
                {it.reader.conductorNotesTitle}:
              </strong>{' '}
              {song.conductorNotes}
            </div>
          ) : null}
        </header>

        <div className="mt-5">
          {selectedView === 'pdf' && hasPdfAssets ? (
            <PdfCanvasViewer
              assets={pdfAssets}
              selectedAssetId={selectedPdfAsset?.id ?? null}
              onSelectAsset={handleSelectPdfAsset}
              onRegisterPedalHandlers={registerPdfPedal}
              onBoundaryPrev={
                setlistNavigation?.prevItem
                  ? () =>
                      navigateToSetlistItem(
                        setlistNavigation.prevItem!.id,
                        setlistNavigation.prevItem!.songId,
                      )
                  : undefined
              }
              onBoundaryNext={
                setlistNavigation?.nextItem
                  ? () =>
                      navigateToSetlistItem(
                        setlistNavigation.nextItem!.id,
                        setlistNavigation.nextItem!.songId,
                      )
                  : undefined
              }
            />
          ) : (
            <ChordProRenderer
              document={transposedDoc}
              showChords={selectedView === 'chords'}
              fontScale={fontScale}
              twoColumns={twoColumns}
            />
          )}
        </div>
      </article>

      {activeSetlist && setlistNavigation?.nextItem ? (
        <button
          type="button"
          onClick={() =>
            navigateToSetlistItem(
              setlistNavigation.nextItem!.id,
              setlistNavigation.nextItem!.songId,
            )
          }
          className="flex w-full items-center justify-between gap-3 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-surface)] px-4 py-3 text-left shadow-2xs transition-colors hover:border-[var(--arion-accent)]"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--arion-accent)]">
              {it.reader.nextSongBannerLabel}
            </p>
            <p className="truncate text-sm font-bold text-[var(--arion-text)]">
              {setlistNavigation.nextItem.song?.title ?? '-'} ·{' '}
              <span className="text-[var(--arion-accent)]">
                {(() => {
                  const nextKey = resolveEffectiveSetlistKey(
                    setlistNavigation.nextItem.song?.originalKey ?? 'Do',
                    setlistNavigation.nextItem.overrideKey,
                  );
                  const parsed = parseKey(nextKey);
                  return parsed ? formatKey(parsed, notation) : nextKey;
                })()}
              </span>
            </p>
          </div>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-[var(--arion-accent)]"
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  );
}
