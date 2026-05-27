import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ViewerContext } from '../context/ViewerContext';
import { createMockContext, makeTiledImageEntry } from '../testUtils';
import { useWorld } from './useWorld';

describe('useWorld', () => {
  test('items matches the worldItems array from context', async () => {
    const entries = [makeTiledImageEntry('foo'), makeTiledImageEntry('bar')];
    const mockContext = createMockContext({ worldItems: entries });

    const { result } = await renderHook(() => useWorld(), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current.items).toBe(entries);
  });

  test('getByKey returns the tiledImage from the matching entry', async () => {
    const fooEntry = makeTiledImageEntry('foo');
    const barEntry = makeTiledImageEntry('bar');
    const mockContext = createMockContext({ worldItems: [fooEntry, barEntry] });

    const { result } = await renderHook(() => useWorld(), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current.getByKey('foo')).toBe(fooEntry.tiledImage);
    expect(result.current.getByKey('bar')).toBe(barEntry.tiledImage);
  });

  test('getByKey returns undefined for an unknown key', async () => {
    const mockContext = createMockContext({ worldItems: [makeTiledImageEntry('foo')] });

    const { result } = await renderHook(() => useWorld(), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current.getByKey('nonexistent')).toBeUndefined();
  });

  test('getByIndex(0) returns the first item tiledImage', async () => {
    const firstEntry = makeTiledImageEntry('first');
    const secondEntry = makeTiledImageEntry('second');
    const mockContext = createMockContext({ worldItems: [firstEntry, secondEntry] });

    const { result } = await renderHook(() => useWorld(), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current.getByIndex(0)).toBe(firstEntry.tiledImage);
  });

  test('getByIndex returns undefined for an out-of-range index', async () => {
    const mockContext = createMockContext({ worldItems: [makeTiledImageEntry('only')] });

    const { result } = await renderHook(() => useWorld(), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current.getByIndex(5)).toBeUndefined();
  });
});
