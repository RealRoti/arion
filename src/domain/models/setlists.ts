export interface SetlistSongSummary {
  readonly id: string;
  readonly title: string;
  readonly author: string | null;
  readonly originalKey: string;
  readonly tempoBpm: number | null;
  readonly timeSignature: string | null;
}

export interface SetlistItem {
  readonly id: string;
  readonly setlistId: string;
  readonly songId: string;
  readonly position: number;
  readonly overrideKey: string | null;
  readonly notes: string | null;
  readonly song: SetlistSongSummary | null;
}

export interface Setlist {
  readonly id: string;
  readonly title: string;
  readonly eventDate: string | null;
  readonly notes: string | null;
  readonly itemCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SetlistWithItems extends Setlist {
  readonly items: readonly SetlistItem[];
}

export interface CreateSetlistInput {
  readonly title: string;
  readonly eventDate?: string | null;
  readonly notes?: string | null;
}

export interface UpdateSetlistInput {
  readonly title: string;
  readonly eventDate?: string | null;
  readonly notes?: string | null;
}

export interface SequentialNavigationState {
  readonly currentItem: SetlistItem | null;
  readonly currentIndex: number;
  readonly total: number;
  readonly prevItem: SetlistItem | null;
  readonly nextItem: SetlistItem | null;
}

export function reorderItemIds(
  ids: readonly string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= ids.length ||
    toIndex >= ids.length ||
    fromIndex === toIndex
  ) {
    return [...ids];
  }
  const copy = [...ids];
  const [moved] = copy.splice(fromIndex, 1);
  if (moved === undefined) {
    return [...ids];
  }
  copy.splice(toIndex, 0, moved);
  return copy;
}

export function resolveEffectiveSetlistKey(
  originalKey: string,
  overrideKey: string | null,
): string {
  const trimmed = overrideKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : originalKey;
}

export function getSequentialNavigation(
  items: readonly SetlistItem[],
  currentItemId: string | null,
  fallbackSongId?: string | null,
): SequentialNavigationState {
  if (items.length === 0) {
    return {
      currentItem: null,
      currentIndex: -1,
      total: 0,
      prevItem: null,
      nextItem: null,
    };
  }

  let index = currentItemId ? items.findIndex((item) => item.id === currentItemId) : -1;
  if (index < 0 && fallbackSongId) {
    index = items.findIndex((item) => item.songId === fallbackSongId);
  }

  if (index < 0) {
    return {
      currentItem: null,
      currentIndex: -1,
      total: items.length,
      prevItem: null,
      nextItem: null,
    };
  }

  return {
    currentItem: items[index] ?? null,
    currentIndex: index,
    total: items.length,
    prevItem: items[index - 1] ?? null,
    nextItem: items[index + 1] ?? null,
  };
}
