import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ViewerContext } from '../context/ViewerContext';
import { createMockContext, makeTiledImageEntry } from '../testUtils';
import { useTiledImage } from './useTiledImage';

describe('useTiledImage', () => {
  test('returns the tiledImage from the entry matching imageKey', async () => {
    const targetEntry = makeTiledImageEntry('slide');
    const otherEntry = makeTiledImageEntry('other');
    const mockContext = createMockContext({ worldItems: [targetEntry, otherEntry] });

    const { result } = await renderHook(() => useTiledImage('slide'), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current).toBe(targetEntry.tiledImage);
  });

  test('returns undefined when no entry with that key exists', async () => {
    const mockContext = createMockContext({ worldItems: [makeTiledImageEntry('slide')] });

    const { result } = await renderHook(() => useTiledImage('nonexistent'), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current).toBeUndefined();
  });

  test('returns undefined when worldItems is empty', async () => {
    const mockContext = createMockContext({ worldItems: [] });

    const { result } = await renderHook(() => useTiledImage('slide'), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current).toBeUndefined();
  });
});
