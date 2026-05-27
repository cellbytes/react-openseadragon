import OpenSeadragon, { MouseTrackerOptions } from 'openseadragon';
import { describe, expect, test, vi, afterEach } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ViewerContext } from '../context/ViewerContext';
import { createMockContext } from '../testUtils';
import { useMouseTracker } from './useMouseTracker';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMouseTracker', () => {
  test('creates a MouseTracker instance when element is provided and enabled is true', async () => {
    const mockDestroy = vi.fn();
    // Must be a regular function (not arrow function) to be used as a constructor.
    const MockMouseTrackerCtor = vi.fn(function MockMouseTrackerImpl() {
      return { destroy: mockDestroy };
    });
    vi.spyOn(OpenSeadragon, 'MouseTracker').mockImplementation(
      MockMouseTrackerCtor as unknown as typeof OpenSeadragon.MouseTracker
    );

    const container = document.createElement('div');
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ containerRef: { current: container } })}>
        {children}
      </ViewerContext.Provider>
    );

    // The hook returns trackerRef.current at render time; since the ref is set in
    // a useEffect it is only observable on a subsequent re-render. Verify tracker
    // creation via the constructor call count instead.
    await renderHook(() => useMouseTracker({ element: container }), { wrapper });
    expect(MockMouseTrackerCtor).toHaveBeenCalledOnce();
  });

  test('calls tracker.destroy() on unmount', async () => {
    const mockDestroy = vi.fn();
    const MockMouseTrackerCtor = vi.fn(function MockMouseTrackerImpl() {
      return { destroy: mockDestroy };
    });
    vi.spyOn(OpenSeadragon, 'MouseTracker').mockImplementation(
      MockMouseTrackerCtor as unknown as typeof OpenSeadragon.MouseTracker
    );

    const container = document.createElement('div');
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ containerRef: { current: container } })}>
        {children}
      </ViewerContext.Provider>
    );

    const { unmount } = await renderHook(() => useMouseTracker({ element: container }), {
      wrapper,
    });
    await unmount();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  test('returns null and does not create tracker when enabled: false', async () => {
    const MockMouseTrackerCtor = vi.fn(function MockMouseTrackerImpl() {
      return { destroy: vi.fn() };
    });
    vi.spyOn(OpenSeadragon, 'MouseTracker').mockImplementation(
      MockMouseTrackerCtor as unknown as typeof OpenSeadragon.MouseTracker
    );

    const container = document.createElement('div');
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ containerRef: { current: container } })}>
        {children}
      </ViewerContext.Provider>
    );

    const { result } = await renderHook(
      () => useMouseTracker({ element: container, enabled: false }),
      { wrapper }
    );
    expect(MockMouseTrackerCtor).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  test('returns null and does not create tracker when element is null', async () => {
    const MockMouseTrackerCtor = vi.fn(function MockMouseTrackerImpl() {
      return { destroy: vi.fn() };
    });
    vi.spyOn(OpenSeadragon, 'MouseTracker').mockImplementation(
      MockMouseTrackerCtor as unknown as typeof OpenSeadragon.MouseTracker
    );

    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ containerRef: { current: null } })}>
        {children}
      </ViewerContext.Provider>
    );

    const { result } = await renderHook(() => useMouseTracker({ element: null }), { wrapper });
    expect(MockMouseTrackerCtor).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  test('falls back to containerRef.current when no element prop is provided', async () => {
    const MockMouseTrackerCtor = vi.fn(function MockMouseTrackerImpl(_opts: MouseTrackerOptions) {
      return { destroy: vi.fn() };
    });
    vi.spyOn(OpenSeadragon, 'MouseTracker').mockImplementation(
      MockMouseTrackerCtor as unknown as typeof OpenSeadragon.MouseTracker
    );

    const container = document.createElement('div');
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ containerRef: { current: container } })}>
        {children}
      </ViewerContext.Provider>
    );

    await renderHook(() => useMouseTracker({}), { wrapper });
    expect(MockMouseTrackerCtor).toHaveBeenCalledOnce();
    const callArgs = MockMouseTrackerCtor.mock.calls[0]?.[0];
    expect(callArgs?.element).toBe(container);
  });

  test('stable wrapper dispatches to latest handler without recreating the tracker', async () => {
    const MockMouseTrackerCtor = vi.fn(function MockMouseTrackerImpl(_opts: MouseTrackerOptions) {
      return { destroy: vi.fn() };
    });
    vi.spyOn(OpenSeadragon, 'MouseTracker').mockImplementation(
      MockMouseTrackerCtor as unknown as typeof OpenSeadragon.MouseTracker
    );

    const container = document.createElement('div');
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ containerRef: { current: container } })}>
        {children}
      </ViewerContext.Provider>
    );

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = await renderHook(
      ({ h }: { h?: typeof handler1 } = {}) =>
        useMouseTracker({ element: container, moveHandler: h }),
      { wrapper, initialProps: { h: handler1 } }
    );

    // Tracker created once on mount
    expect(MockMouseTrackerCtor).toHaveBeenCalledOnce();

    // Get the moveHandler stable wrapper that was passed to the constructor
    const constructorOptions = MockMouseTrackerCtor.mock.calls[0]?.[0];
    expect(constructorOptions).toBeDefined();
    const stableMoveHandler = constructorOptions?.moveHandler;
    expect(stableMoveHandler).toBeDefined();

    // Rerender with a different handler
    await rerender({ h: handler2 });

    // Tracker must not have been recreated
    expect(MockMouseTrackerCtor).toHaveBeenCalledOnce();

    // Invoking the stable wrapper should call handler2, not handler1
    stableMoveHandler!({} as import('openseadragon').PointerMouseTrackerEvent);
    expect(handler2).toHaveBeenCalledOnce();
    expect(handler1).not.toHaveBeenCalled();
  });
});
