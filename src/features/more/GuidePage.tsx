import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Lightbulb, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { it, type GuideArticle } from '@/i18n/it';

export function GuidePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(
    () => new Set(it.guide.articles[0] ? [it.guide.articles[0].id] : []),
  );

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const art of it.guide.articles) {
      if (!seen.has(art.category)) {
        seen.add(art.category);
        list.push(art.category);
      }
    }
    return list;
  }, []);

  const queryTokens = useMemo(
    () => searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [searchQuery],
  );

  const filteredArticles = useMemo(() => {
    return it.guide.articles.filter((article) => {
      if (selectedCategory !== 'ALL' && article.category !== selectedCategory) {
        return false;
      }
      if (queryTokens.length === 0) return true;
      const haystack = [
        article.title,
        article.category,
        article.summary,
        ...article.keywords,
        ...article.steps,
        article.tip ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return queryTokens.every((token) => haystack.includes(token));
    });
  }, [selectedCategory, queryTokens]);

  const toggleArticle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/altro"
        className="touch-target inline-flex items-center gap-1.5 text-sm font-bold text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{it.nav.back}</span>
      </Link>

      <PageHeader title={it.guide.title} subtitle={it.guide.subtitle} />

      <div className="space-y-3 rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-4 shadow-2xs">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--arion-text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={it.guide.searchPlaceholder}
            aria-label={it.guide.searchPlaceholder}
            className="min-h-11 w-full rounded-md border border-[var(--arion-border)] bg-[var(--arion-bg)] py-2 pr-10 pl-9 text-sm text-[var(--arion-text)] placeholder:text-[var(--arion-text-muted)] focus:border-[var(--arion-primary)] focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={it.guide.clearSearch}
              className="touch-target absolute top-1/2 right-1 inline-flex -translate-y-1/2 items-center justify-center text-[var(--arion-text-muted)] hover:text-[var(--arion-text)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`min-h-10 rounded-full border px-3.5 py-1 text-xs font-bold transition-colors ${
              selectedCategory === 'ALL'
                ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
            }`}
          >
            {it.guide.categoryAll}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-10 rounded-full border px-3.5 py-1 text-xs font-bold transition-colors ${
                selectedCategory === cat
                  ? 'border-[var(--arion-primary)] bg-[var(--arion-primary)] text-[var(--arion-primary-contrast)]'
                  : 'border-[var(--arion-border)] bg-[var(--arion-bg)] text-[var(--arion-text)] hover:border-[var(--arion-accent)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
          {it.guide.resultsCount(filteredArticles.length)}
        </p>
      </div>

      {filteredArticles.length === 0 ? (
        <div className="rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] p-6 text-center shadow-2xs">
          <p className="text-base font-bold text-[var(--arion-text)]">{it.guide.emptyTitle}</p>
          <p className="mt-1 text-sm text-[var(--arion-text-muted)]">{it.guide.emptySubtitle}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredArticles.map((article) => (
            <GuideCard
              key={article.id}
              article={article}
              isOpen={queryTokens.length > 0 || openIds.has(article.id)}
              forceExpanded={queryTokens.length > 0}
              onToggle={() => toggleArticle(article.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GuideCard({
  article,
  isOpen,
  forceExpanded,
  onToggle,
}: {
  article: GuideArticle;
  isOpen: boolean;
  forceExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-md border border-[var(--arion-border)] bg-[var(--arion-surface)] shadow-2xs">
      <button
        type="button"
        onClick={onToggle}
        disabled={forceExpanded}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--arion-surface-subtle)]"
      >
        <div className="min-w-0 space-y-1">
          <span className="inline-block rounded border border-[var(--arion-accent-border)] bg-[var(--arion-accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--arion-accent)]">
            {article.category}
          </span>
          <h2 className="font-editorial text-lg font-bold text-[var(--arion-text)]">
            {article.title}
          </h2>
          <p className="text-sm text-[var(--arion-text-muted)]">{article.summary}</p>
        </div>
        {!forceExpanded ? (
          <span className="mt-1 shrink-0 text-[var(--arion-accent)]" aria-hidden="true">
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="space-y-3 border-t border-[var(--arion-border)] bg-[var(--arion-bg)] px-4 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
            {it.guide.stepsHeading}
          </h3>
          <ol className="space-y-2">
            {article.steps.map((step, idx) => (
              <li
                key={`${article.id}-${idx}`}
                className="flex items-start gap-2.5 text-sm text-[var(--arion-text)]"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--arion-primary)] text-xs font-bold text-[var(--arion-primary-contrast)]">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {article.tip ? (
            <div className="flex items-start gap-2 rounded border border-[var(--arion-accent-border)] bg-[var(--arion-surface)] p-3 text-sm">
              <Lightbulb
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--arion-accent)]"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--arion-accent)]">
                  {it.guide.tipHeading}
                </p>
                <p className="mt-0.5 text-[var(--arion-text)]">{article.tip}</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
