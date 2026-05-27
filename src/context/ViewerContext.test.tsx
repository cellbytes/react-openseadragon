import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { createMockContext } from '../testUtils';
import { ViewerContext, useViewerContext } from './ViewerContext';

describe('useViewerContext', () => {
  test('throws with expected message when called outside any provider', async () => {
    await expect(renderHook(() => useViewerContext())).rejects.toThrow(
      'useViewerContext must be used inside a ViewerProvider or ViewerStateProvider'
    );
  });

  test('returns the provided value when wrapped in ViewerContext.Provider', async () => {
    const mockContext = createMockContext({ isLoading: true, isOpen: false });

    const { result } = await renderHook(() => useViewerContext(), {
      wrapper: ({ children }) => (
        <ViewerContext.Provider value={mockContext}>{children}</ViewerContext.Provider>
      ),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.viewer).toBeNull();
  });
});
