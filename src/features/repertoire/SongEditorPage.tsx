import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Save, Sparkles, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { RequirePermission } from '@/components/RequirePermission';
import { useTheme } from '@/components/useTheme';
import { parseChordPro } from '@/domain/chords/chordpro';
import {
  formatKey,
  parseKey,
  STANDARD_KEYS_MAJOR,
  STANDARD_KEYS_MINOR,
} from '@/domain/chords/transposer';
import { normalizeTagsInput, type SongAsset } from '@/domain/models/songs';
import { useAuth } from '@/features/auth/useAuth';
import { ChordProRenderer } from '@/features/reader/ChordProRenderer';
import { SongAssetsManager } from '@/features/repertoire/SongAssetsManager';
import { SongImportWizard } from '@/features/repertoire/SongImportWizard';
import { it } from '@/i18n/it';
import {
  createSong,
  deleteSong,
  getSongById,
  listSongAssets,
  updateSong,
} from '@/services/songsService';

export function SongEditorPage() {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const { profile, can } = useAuth();
  const { notation } = useTheme();
  const isEditMode = Boolean(songId);

  const [loading, setLoading] = useState(isEditMode);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [originalKey, setOriginalKey] = useState('Do');
  const [tempoBpm, setTempoBpm] = useState('');
  const [timeSignature, setTimeSignature] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [conductorNotes, setConductorNotes] = useState('');
  const [chordproContent, setChordproContent] = useState('');
  const [assets, setAssets] = useState<SongAsset[]>([]);

  const [showImporter, setShowImporter] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!songId) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const [loadedSong, loadedAssets] = await Promise.all([
          getSongById(songId),
          listSongAssets(songId),
        ]);
        if (cancelled) return;

        if (!loadedSong) {
          setNotFound(true);
          return;
        }

        setTitle(loadedSong.title);
        setSubtitle(loadedSong.subtitle ?? '');
        setAuthor(loadedSong.author ?? '');
        setOriginalKey(loadedSong.originalKey);
        setTempoBpm(loadedSong.tempoBpm !== null ? String(loadedSong.tempoBpm) : '');
        setTimeSignature(loadedSong.timeSignature ?? '');
        setTagsInput(loadedSong.tags.join(', '));
        setConductorNotes(loadedSong.conductorNotes ?? '');
        setChordproContent(loadedSong.chordproContent);
        setAssets(loadedAssets);
      } catch {
        if (!cancelled) {
          setErrorNotice(it.songEditor.errors.generic);
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
  }, [songId]);

  const keyOptions = useMemo(() => {
    const all = [...STANDARD_KEYS_MAJOR, ...STANDARD_KEYS_MINOR].map((key) =>
      formatKey(key, notation),
    );
    const currentFormatted = (() => {
      const parsed = parseKey(originalKey);
      return parsed ? formatKey(parsed, notation) : originalKey;
    })();
    if (currentFormatted && !all.includes(currentFormatted)) {
      all.unshift(currentFormatted);
    }
    return all;
  }, [notation, originalKey]);

  const normalizedKeyValue = useMemo(() => {
    const parsed = parseKey(originalKey);
    return parsed ? formatKey(parsed, notation) : originalKey;
  }, [notation, originalKey]);

  const liveDocument = useMemo(() => parseChordPro(chordproContent), [chordproContent]);

  const insertSnippet = (snippet: string) => {
    setChordproContent((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${snippet}` : snippet));
  };

  const persistSong = async (redirectTarget: 'stay' | 'reader' | 'edit') => {
    if (!profile || saving) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorNotice(it.songEditor.errors.titleRequired);
      return;
    }

    setSaving(true);
    setSavedNotice(null);
    setErrorNotice(null);

    try {
      const parsedTempo = tempoBpm.trim() ? Number.parseInt(tempoBpm.trim(), 10) : null;
      const payload = {
        title: trimmedTitle,
        subtitle,
        author,
        originalKey: normalizedKeyValue,
        tempoBpm: parsedTempo !== null && !Number.isNaN(parsedTempo) ? parsedTempo : null,
        timeSignature,
        tags: normalizeTagsInput(tagsInput),
        chordproContent,
        conductorNotes,
      };

      if (songId) {
        await updateSong(songId, payload, profile.id);
        setSavedNotice(it.songEditor.savedMessage);
      } else {
        const created = await createSong(payload, profile.id);
        if (redirectTarget === 'edit') {
          navigate(`/repertorio/${created.id}/modifica`, { replace: true });
        } else {
          navigate(`/repertorio/${created.id}`, { replace: true });
        }
      }
    } catch {
      setErrorNotice(it.songEditor.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void persistSong(isEditMode ? 'stay' : 'reader');
  };

  const handleDelete = async () => {
    if (!songId || deleting) return;
    setDeleting(true);
    setErrorNotice(null);
    try {
      await deleteSong(songId);
      navigate('/repertorio', { replace: true });
    } catch {
      setErrorNotice(it.songEditor.errors.generic);
      setDeleting(false);
    }
  };

  return (
    <RequirePermission permission={isEditMode ? 'songs:update' : 'songs:create'}>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            to={songId ? `/repertorio/${songId}` : '/repertorio'}
            className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{songId ? it.songEditor.backToSong : it.songEditor.backToRepertoire}</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowImporter((prev) => !prev)}
            className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-3.5 py-2 text-xs font-bold text-[var(--arion-accent)]"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>
              {showImporter ? it.songEditor.importToggleClose : it.songEditor.importToggleOpen}
            </span>
          </button>
        </div>

        <PageHeader title={isEditMode ? it.songEditor.editTitle : it.songEditor.createTitle} />

        {loading ? (
          <p className="text-sm text-[var(--arion-text-muted)]">{it.common.loading}</p>
        ) : notFound ? (
          <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6">
            <p className="text-sm font-semibold text-[var(--arion-danger)]">
              {it.songEditor.errors.notFound}
            </p>
          </div>
        ) : (
          <>
            {showImporter ? (
              <SongImportWizard
                onApply={(imported) => {
                  setChordproContent(imported.chordpro);
                  if (!title.trim() && imported.detectedTitle) {
                    setTitle(imported.detectedTitle);
                  }
                  if (!author.trim() && imported.detectedAuthor) {
                    setAuthor(imported.detectedAuthor);
                  }
                  if (imported.detectedKey) {
                    setOriginalKey(imported.detectedKey);
                  }
                  if (!timeSignature.trim() && imported.detectedTimeSignature) {
                    setTimeSignature(imported.detectedTimeSignature);
                  }
                  if (!tempoBpm.trim() && imported.detectedTempoBpm) {
                    setTempoBpm(String(imported.detectedTempoBpm));
                  }
                  setShowImporter(false);
                }}
              />
            ) : null}

            {savedNotice ? (
              <div
                role="status"
                className="rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] p-3 text-sm font-semibold text-[var(--arion-accent)]"
              >
                {savedNotice}
              </div>
            ) : null}

            {errorNotice ? (
              <div
                role="alert"
                className="rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-3 text-sm font-semibold text-[var(--arion-danger)]"
              >
                {errorNotice}
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-2xs"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label
                    htmlFor="song-title"
                    className="block text-xs font-bold text-[var(--arion-text)]"
                  >
                    {it.songEditor.titleLabel}
                  </label>
                  <input
                    id="song-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={it.songEditor.titlePlaceholder}
                    className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="song-subtitle"
                    className="block text-xs font-bold text-[var(--arion-text)]"
                  >
                    {it.songEditor.subtitleLabel}
                  </label>
                  <input
                    id="song-subtitle"
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder={it.songEditor.subtitlePlaceholder}
                    className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="song-author"
                    className="block text-xs font-bold text-[var(--arion-text)]"
                  >
                    {it.songEditor.authorLabel}
                  </label>
                  <input
                    id="song-author"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={it.songEditor.authorPlaceholder}
                    className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="song-key"
                      className="block text-xs font-bold text-[var(--arion-text)]"
                    >
                      {it.songEditor.originalKeyLabel}
                    </label>
                    <select
                      id="song-key"
                      value={normalizedKeyValue}
                      onChange={(e) => setOriginalKey(e.target.value)}
                      className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-2 text-sm font-bold text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                    >
                      {keyOptions.map((keyOpt) => (
                        <option key={keyOpt} value={keyOpt}>
                          {keyOpt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="song-tempo"
                      className="block text-xs font-bold text-[var(--arion-text)]"
                    >
                      {it.songEditor.tempoLabel}
                    </label>
                    <input
                      id="song-tempo"
                      type="number"
                      min={20}
                      max={300}
                      value={tempoBpm}
                      onChange={(e) => setTempoBpm(e.target.value)}
                      placeholder={it.songEditor.tempoPlaceholder}
                      className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="song-time-signature"
                      className="block text-xs font-bold text-[var(--arion-text)]"
                    >
                      {it.songEditor.timeSignatureLabel}
                    </label>
                    <input
                      id="song-time-signature"
                      type="text"
                      value={timeSignature}
                      onChange={(e) => setTimeSignature(e.target.value)}
                      placeholder={it.songEditor.timeSignaturePlaceholder}
                      className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2.5 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="song-tags"
                    className="block text-xs font-bold text-[var(--arion-text)]"
                  >
                    {it.songEditor.tagsLabel}
                  </label>
                  <input
                    id="song-tags"
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder={it.songEditor.tagsPlaceholder}
                    className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label
                    htmlFor="song-conductor-notes"
                    className="block text-xs font-bold text-[var(--arion-text)]"
                  >
                    {it.songEditor.conductorNotesLabel}
                  </label>
                  <input
                    id="song-conductor-notes"
                    type="text"
                    value={conductorNotes}
                    onChange={(e) => setConductorNotes(e.target.value)}
                    placeholder={it.songEditor.conductorNotesPlaceholder}
                    className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* ChordPro Editor + Side-by-Side Live Preview */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="song-chordpro"
                      className="text-xs font-bold text-[var(--arion-text)]"
                    >
                      {it.songEditor.chordproLabel}
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { label: it.songEditor.insertVerse, tpl: it.songEditor.verseTemplate },
                        { label: it.songEditor.insertChorus, tpl: it.songEditor.chorusTemplate },
                        { label: it.songEditor.insertBridge, tpl: it.songEditor.bridgeTemplate },
                        { label: it.songEditor.insertComment, tpl: it.songEditor.commentTemplate },
                      ] as const
                    ).map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => insertSnippet(btn.tpl)}
                        className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-1 text-[11px] font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)]"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    id="song-chordpro"
                    rows={14}
                    value={chordproContent}
                    onChange={(e) => setChordproContent(e.target.value)}
                    className="w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] p-3 font-mono text-xs leading-relaxed text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
                  />
                  <p className="text-[11px] text-[var(--arion-text-muted)]">
                    {it.songEditor.chordproHint}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
                    {it.songEditor.previewTitle}
                  </p>
                  <div className="min-h-[20rem] rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] p-4">
                    <ChordProRenderer document={liveDocument} showChords />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--arion-border)] pt-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="submit"
                    disabled={saving || !title.trim()}
                    className="touch-target inline-flex items-center gap-2 rounded-md bg-[var(--arion-primary)] px-4 py-2.5 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
                    <span>
                      {saving ? it.songEditor.savingButton : it.songEditor.saveSongButton}
                    </span>
                  </button>

                  {!isEditMode && can('assets:upload') ? (
                    <button
                      type="button"
                      disabled={saving || !title.trim()}
                      onClick={() => void persistSong('edit')}
                      className="touch-target rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-4 py-2.5 text-sm font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)] disabled:opacity-50"
                    >
                      {it.songEditor.saveAndAddPdfButton}
                    </button>
                  ) : null}
                </div>

                {isEditMode && can('songs:delete') ? (
                  confirmDelete ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--arion-danger)]">
                        {it.songEditor.confirmDeletePrompt}
                      </span>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => void handleDelete()}
                        className="touch-target rounded-md bg-[var(--arion-danger)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {deleting
                          ? it.songEditor.deletingButton
                          : it.songEditor.confirmDeleteButton}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="touch-target rounded-md border border-[var(--arion-border)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)]"
                      >
                        {it.common.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="touch-target inline-flex items-center gap-1.5 rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 px-3.5 py-2 text-xs font-bold text-[var(--arion-danger)] hover:bg-[var(--arion-danger)]/15"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span>{it.songEditor.deleteSongButton}</span>
                    </button>
                  )
                ) : null}
              </div>
            </form>

            {songId ? (
              <SongAssetsManager songId={songId} assets={assets} onAssetsChange={setAssets} />
            ) : (
              <p className="text-xs text-[var(--arion-text-muted)]">
                {it.songEditor.assetsSaveFirstHint}
              </p>
            )}
          </>
        )}
      </div>
    </RequirePermission>
  );
}
