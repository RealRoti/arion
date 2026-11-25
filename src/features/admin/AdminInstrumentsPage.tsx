import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Music2, Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { RequirePermission } from '@/components/RequirePermission';
import {
  INSTRUMENT_CATEGORIES,
  INSTRUMENT_DEFAULT_VIEWS,
  slugifyInstrumentName,
  TRANSPOSITION_RANGE,
  type Instrument,
  type InstrumentCategory,
  type InstrumentDefaultView,
} from '@/domain/models/instruments';
import { useAuth } from '@/features/auth/useAuth';
import { it } from '@/i18n/it';
import {
  createInstrument,
  InstrumentsServiceError,
  listInstruments,
  swapInstrumentSortOrder,
  updateInstrument,
} from '@/services/instrumentsService';

type CatalogFilter = 'all' | 'enabled' | 'disabled';

const TRANSPOSITION_OPTIONS: number[] = Array.from(
  { length: TRANSPOSITION_RANGE.max - TRANSPOSITION_RANGE.min + 1 },
  (_, index) => TRANSPOSITION_RANGE.min + index,
);

function sortCatalog(items: readonly Instrument[]): Instrument[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function AdminInstrumentsPage() {
  const { refreshInstruments } = useAuth();
  const [items, setItems] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CatalogFilter>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<InstrumentCategory>('instrument');
  const [defaultView, setDefaultView] = useState<InstrumentDefaultView>('chords');
  const [transpositionSemitones, setTranspositionSemitones] = useState(0);
  const [supportsCapo, setSupportsCapo] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      try {
        const loaded = await listInstruments({ includeDisabled: true });
        if (!cancelled) {
          setItems(sortCatalog(loaded));
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(it.adminInstruments.errors.generic);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setCategory('instrument');
    setDefaultView('chords');
    setTranspositionSemitones(0);
    setSupportsCapo(false);
    setIsEnabled(true);
  };

  const handleCategoryChange = (nextCategory: InstrumentCategory) => {
    setCategory(nextCategory);
    if (!editingId) {
      if (nextCategory === 'voice') {
        setDefaultView('lyrics_only');
        setTranspositionSemitones(0);
        setSupportsCapo(false);
      } else {
        setDefaultView('chords');
      }
    }
  };

  const handleServiceError = (err: unknown) => {
    if (err instanceof InstrumentsServiceError) {
      if (err.code === 'DUPLICATE_SLUG') {
        setErrorMessage(it.adminInstruments.errors.duplicateSlug);
        return;
      }
      if (err.code === 'INVALID_INPUT') {
        setErrorMessage(it.adminInstruments.errors.invalidInput);
        return;
      }
    }
    setErrorMessage(it.adminInstruments.errors.generic);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      if (editingId) {
        const updated = await updateInstrument(editingId, {
          name,
          slug: slug.trim() ? slug : undefined,
          category,
          defaultView,
          transpositionSemitones,
          supportsCapo,
          isEnabled,
        });
        setItems((prev) =>
          sortCatalog(prev.map((item) => (item.id === updated.id ? updated : item))),
        );
        await refreshInstruments();
        resetForm();
        setStatusMessage(it.adminInstruments.updatedMessage);
      } else {
        const created = await createInstrument({
          name,
          slug: slug.trim() ? slug : undefined,
          category,
          defaultView,
          transpositionSemitones,
          supportsCapo,
          isEnabled,
        });
        setItems((prev) => sortCatalog([...prev, created]));
        await refreshInstruments();
        resetForm();
        setStatusMessage(it.adminInstruments.createdMessage);
      }
    } catch (err) {
      handleServiceError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (instrument: Instrument) => {
    setEditingId(instrument.id);
    setName(instrument.name);
    setSlug(instrument.slug);
    setCategory(instrument.category);
    setDefaultView(instrument.defaultView);
    setTranspositionSemitones(instrument.transpositionSemitones);
    setSupportsCapo(instrument.supportsCapo);
    setIsEnabled(instrument.isEnabled);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleToggleEnabled = async (instrument: Instrument) => {
    if (busyRowId) return;
    setBusyRowId(instrument.id);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const updated = await updateInstrument(instrument.id, { isEnabled: !instrument.isEnabled });
      setItems((prev) =>
        sortCatalog(prev.map((item) => (item.id === updated.id ? updated : item))),
      );
      await refreshInstruments();
      setStatusMessage(it.adminInstruments.updatedMessage);
    } catch (err) {
      handleServiceError(err);
    } finally {
      setBusyRowId(null);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    const first = items[index];
    const second = items[targetIndex];
    if (!first || !second || busyRowId) return;

    setBusyRowId(first.id);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await swapInstrumentSortOrder(first, second, items);
      const reloaded = await listInstruments({ includeDisabled: true });
      setItems(sortCatalog(reloaded));
      await refreshInstruments();
      setStatusMessage(it.adminInstruments.reorderedMessage);
    } catch (err) {
      handleServiceError(err);
    } finally {
      setBusyRowId(null);
    }
  };

  const enabledCount = items.filter((item) => item.isEnabled).length;
  const disabledCount = items.length - enabledCount;
  const visibleItems = items.filter((item) => {
    if (filter === 'enabled') return item.isEnabled;
    if (filter === 'disabled') return !item.isEnabled;
    return true;
  });

  return (
    <RequirePermission permission="instruments:manage">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          to="/admin"
          className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{it.admin.backToPanel}</span>
        </Link>

        <PageHeader title={it.adminInstruments.title} subtitle={it.adminInstruments.subtitle} />

        {statusMessage ? (
          <div
            role="status"
            className="rounded-md border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] p-3 text-sm font-semibold text-[var(--arion-accent)]"
          >
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-md border border-[var(--arion-danger)]/40 bg-[var(--arion-danger)]/10 p-3 text-sm font-semibold text-[var(--arion-danger)]"
          >
            {errorMessage}
          </div>
        ) : null}

        {/* Create / Edit Instrument Form */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 shadow-2xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-[var(--arion-text)]">
              {editingId ? (
                <Pencil className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4 text-[var(--arion-accent)]" aria-hidden="true" />
              )}
              <span>
                {editingId
                  ? it.adminInstruments.formEditTitle
                  : it.adminInstruments.formCreateTitle}
              </span>
            </h2>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)] hover:underline"
              >
                {it.adminInstruments.cancelEditButton}
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                htmlFor="instrument-name"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.adminInstruments.nameLabel}
              </label>
              <input
                id="instrument-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={it.adminInstruments.namePlaceholder}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="instrument-slug"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.adminInstruments.slugLabel}
              </label>
              <input
                id="instrument-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={
                  name.trim() ? slugifyInstrumentName(name) : it.adminInstruments.slugPlaceholder
                }
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 font-mono text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="instrument-category"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.adminInstruments.categoryLabel}
              </label>
              <select
                id="instrument-category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as InstrumentCategory)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              >
                {INSTRUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {it.instruments.categories[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="instrument-default-view"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.adminInstruments.defaultViewLabel}
              </label>
              <select
                id="instrument-default-view"
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value as InstrumentDefaultView)}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              >
                {INSTRUMENT_DEFAULT_VIEWS.map((view) => (
                  <option key={view} value={view}>
                    {it.instruments.defaultViews[view]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label
                htmlFor="instrument-transposition"
                className="block text-xs font-bold text-[var(--arion-text)]"
              >
                {it.adminInstruments.transpositionLabel}
              </label>
              <select
                id="instrument-transposition"
                value={transpositionSemitones}
                onChange={(e) => setTranspositionSemitones(Number(e.target.value))}
                className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-2 text-sm text-[var(--arion-text)] focus:border-[var(--arion-primary)] focus:outline-none"
              >
                {TRANSPOSITION_OPTIONS.map((semitones) => (
                  <option key={semitones} value={semitones}>
                    {semitones === 0
                      ? it.instruments.concertPitch
                      : it.instruments.transpositionLabel(semitones)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--arion-text)]">
              <input
                type="checkbox"
                checked={supportsCapo}
                onChange={(e) => setSupportsCapo(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--arion-border)] accent-[var(--arion-primary)]"
              />
              <span>{it.adminInstruments.supportsCapoLabel}</span>
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--arion-text)]">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--arion-border)] accent-[var(--arion-primary)]"
              />
              <span>{it.adminInstruments.isEnabledLabel}</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="touch-target rounded-md bg-[var(--arion-primary)] px-4 py-2.5 text-sm font-bold text-[var(--arion-primary-contrast)] hover:bg-[var(--arion-primary-hover)] disabled:opacity-50"
          >
            {submitting
              ? editingId
                ? it.adminInstruments.savingButton
                : it.adminInstruments.creatingButton
              : editingId
                ? it.adminInstruments.saveButton
                : it.adminInstruments.createButton}
          </button>
        </form>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-0.5 shadow-2xs">
            {(
              [
                { id: 'all', label: `${it.adminInstruments.filterAll} (${items.length})` },
                { id: 'enabled', label: `${it.adminInstruments.filterEnabled} (${enabledCount})` },
                {
                  id: 'disabled',
                  label: `${it.adminInstruments.filterDisabled} (${disabledCount})`,
                },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`touch-target rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                      : 'text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {filter !== 'all' ? (
            <p className="text-xs text-[var(--arion-text-muted)]">
              {it.adminInstruments.reorderHint}
            </p>
          ) : null}
        </div>

        {/* Catalog List */}
        {loading ? (
          <p className="text-sm text-[var(--arion-text-muted)]">{it.common.loading}</p>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-5 text-sm text-[var(--arion-text-muted)]">
            {it.adminInstruments.emptyList}
          </div>
        ) : (
          <div className="divide-y divide-[var(--arion-border)] overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
            {visibleItems.map((instrument, index) => {
              const isBusy = busyRowId === instrument.id;
              return (
                <div
                  key={instrument.id}
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                    instrument.isEnabled ? '' : 'bg-[var(--arion-surface-subtle)] opacity-80'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Music2
                        className="h-4 w-4 shrink-0 text-[var(--arion-accent)]"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-bold text-[var(--arion-text)]">
                        {instrument.name}
                      </p>
                      <span
                        className={`rounded border px-2 py-0.5 text-[11px] font-bold ${
                          instrument.isEnabled
                            ? 'border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] text-[var(--arion-accent)]'
                            : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text-muted)]'
                        }`}
                      >
                        {instrument.isEnabled
                          ? it.adminInstruments.statusEnabled
                          : it.adminInstruments.statusDisabled}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--arion-text-muted)]">
                      <span className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-1.5 py-0.5 font-semibold">
                        {it.instruments.categories[instrument.category]}
                      </span>
                      <span className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-1.5 py-0.5 font-semibold">
                        {it.instruments.defaultViews[instrument.defaultView]}
                      </span>
                      {instrument.transpositionSemitones !== 0 ? (
                        <span className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-1.5 py-0.5 font-semibold">
                          {it.instruments.transpositionLabel(instrument.transpositionSemitones)}
                        </span>
                      ) : null}
                      {instrument.supportsCapo ? (
                        <span className="rounded border border-[var(--arion-border)] bg-[var(--arion-bg)] px-1.5 py-0.5 font-semibold">
                          {it.instruments.capoSupported}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {filter === 'all' ? (
                      <>
                        <button
                          type="button"
                          disabled={index === 0 || Boolean(busyRowId)}
                          aria-label={`${it.adminInstruments.moveUpLabel} ${instrument.name}`}
                          onClick={() => void handleMove(index, -1)}
                          className="touch-target inline-flex items-center justify-center rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-1.5 text-[var(--arion-text)] hover:border-[var(--arion-accent)] disabled:opacity-35"
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={index === visibleItems.length - 1 || Boolean(busyRowId)}
                          aria-label={`${it.adminInstruments.moveDownLabel} ${instrument.name}`}
                          onClick={() => void handleMove(index, 1)}
                          className="touch-target inline-flex items-center justify-center rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-2 py-1.5 text-[var(--arion-text)] hover:border-[var(--arion-accent)] disabled:opacity-35"
                        >
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </>
                    ) : null}

                    <button
                      type="button"
                      disabled={isBusy}
                      aria-label={`${it.adminInstruments.editButton} ${instrument.name}`}
                      onClick={() => handleStartEdit(instrument)}
                      className="touch-target rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)] disabled:opacity-50"
                    >
                      {it.adminInstruments.editButton}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      aria-label={`${
                        instrument.isEnabled
                          ? it.adminInstruments.disableButton
                          : it.adminInstruments.enableButton
                      } ${instrument.name}`}
                      onClick={() => void handleToggleEnabled(instrument)}
                      className="touch-target rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] px-3 py-1.5 text-xs font-bold text-[var(--arion-text)] hover:border-[var(--arion-accent)] disabled:opacity-50"
                    >
                      {instrument.isEnabled
                        ? it.adminInstruments.disableButton
                        : it.adminInstruments.enableButton}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
