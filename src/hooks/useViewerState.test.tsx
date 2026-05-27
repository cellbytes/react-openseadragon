import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ViewerContext } from '../context/ViewerContext';
import { createMockContext } from '../testUtils';
import { useViewerState } from './useViewerState';

describe('useViewerState', () => {
  test('returns { isLoading: false, isOpen: false } with default context values', async () => {
    const mockContext = createMockContext();

    const { result } = await renderHook(() => useViewerState(), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isOpen).toBe(false);
  });

  test('returns { isLoading: true, isOpen: false } when context provides isLoading: true', async () => {
    const mockContext = createMockContext({ isLoading: true });

    const { result } = await renderHook(() => useViewerState(), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isOpen).toBe(false);
  });

  test('returns { isLoading: false, isOpen: true } when context provides isOpen: true', async () => {
    const mockContext = createMockContext({ isOpen: true });

    const { result } = await renderHook(() => useViewerState(), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isOpen).toBe(true);
  });
});
