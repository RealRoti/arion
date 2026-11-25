import { describe, expect, it as vitestIt } from 'vitest';
import {
  getSequentialNavigation,
  reorderItemIds,
  resolveEffectiveSetlistKey,
  type SetlistItem,
} from '@/domain/models/setlists';

const ITEMS: readonly SetlistItem[] = [
  {
    id: 'item-1',
    setlistId: 'sl-1',
    songId: 'song-a',
    position: 0,
    overrideKey: null,
    notes: null,
    song: {
      id: 'song-a',
      title: 'Canto Primo',
      author: null,
      originalKey: 'Do',
      tempoBpm: null,
      timeSignature: null,
    },
  },
  {
    id: 'item-2',
    setlistId: 'sl-1',
    songId: 'song-b',
    position: 1,
    overrideKey: 'Fa',
    notes: 'Solo 2 strofe',
    song: {
      id: 'song-b',
      title: 'Canto Secondo',
      author: null,
      originalKey: 'Sol',
      tempoBpm: null,
      timeSignature: null,
    },
  },
  {
    id: 'item-3',
    setlistId: 'sl-1',
    songId: 'song-c',
    position: 2,
    overrideKey: null,
    notes: null,
    song: {
      id: 'song-c',
      title: 'Canto Finale',
      author: null,
      originalKey: 'Re',
      tempoBpm: null,
      timeSignature: null,
    },
  },
];

describe('Setlists domain helpers', () => {
  vitestIt('reorders item ids safely without mutating the source array', () => {
    const source = ['a', 'b', 'c'];
    expect(reorderItemIds(source, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(reorderItemIds(source, 2, 1)).toEqual(['a', 'c', 'b']);
    expect(reorderItemIds(source, -1, 1)).toEqual(['a', 'b', 'c']);
    expect(reorderItemIds(source, 1, 99)).toEqual(['a', 'b', 'c']);
    expect(source).toEqual(['a', 'b', 'c']);
  });

  vitestIt('resolves override key when set or falls back to original key', () => {
    expect(resolveEffectiveSetlistKey('Sol', 'Fa')).toBe('Fa');
    expect(resolveEffectiveSetlistKey('Sol', null)).toBe('Sol');
    expect(resolveEffectiveSetlistKey('Sol', '   ')).toBe('Sol');
  });

  vitestIt('computes sequential navigation by item id or fallback song id', () => {
    const mid = getSequentialNavigation(ITEMS, 'item-2');
    expect(mid.currentIndex).toBe(1);
    expect(mid.total).toBe(3);
    expect(mid.prevItem?.id).toBe('item-1');
    expect(mid.nextItem?.id).toBe('item-3');

    const fallback = getSequentialNavigation(ITEMS, null, 'song-c');
    expect(fallback.currentIndex).toBe(2);
    expect(fallback.prevItem?.id).toBe('item-2');
    expect(fallback.nextItem).toBeNull();
  });
});
