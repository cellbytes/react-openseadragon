import { useLayoutEffect } from 'react';

import { Viewer } from 'openseadragon';
import { describe, expect, test, vi } from 'vitest';
import { render, renderHook } from 'vitest-browser-react';

import { ViewerContext } from '../context/ViewerContext';
import { createMockContext } from '../testUtils';
import { useViewerEvent } from './useViewerEvent';

describe('useViewerEvent', () => {
  test('calls viewer.addHandler when viewer is set and enabled is true (default)', async () => {
    const mockViewer = {
      addHandler: vi.fn(),
      addOnceHandler: vi.fn(),
      removeHandler: vi.fn(),
    } as unknown as Viewer;

    const handler = vi.fn();
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );
    await renderHook(() => useViewerEvent('animation', handler), { wrapper });
    expect(mockViewer.addHandler).toHaveBeenCalledOnce();
    expect(mockViewer.addHandler).toHaveBeenCalledWith('animation', expect.any(Function));
  });

  test('calls viewer.removeHandler with same stable wrapper reference on unmount', async () => {
    const mockViewer = {
      addHandler: vi.fn(),
      addOnceHandler: vi.fn(),
      removeHandler: vi.fn(),
    } as unknown as Viewer;

    const handler = vi.fn();
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );
    const { unmount } = await renderHook(() => useViewerEvent('animation', handler), { wrapper });
    const [[, registeredWrapper]] = (mockViewer.addHandler as ReturnType<typeof vi.fn>).mock.calls;
    await unmount();
    expect(mockViewer.removeHandler).toHaveBeenCalledWith('animation', registeredWrapper);
  });

  test('calls viewer.addOnceHandler instead of addHandler when once: true', async () => {
    const mockViewer = {
      addHandler: vi.fn(),
      addOnceHandler: vi.fn(),
      removeHandler: vi.fn(),
    } as unknown as Viewer;

    const handler = vi.fn();
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );
    await renderHook(() => useViewerEvent('animation', handler, { once: true }), { wrapper });
    expect(mockViewer.addOnceHandler).toHaveBeenCalledOnce();
    expect(mockViewer.addHandler).not.toHaveBeenCalled();
  });

  test('does not call addHandler when enabled: false', async () => {
    const mockViewer = {
      addHandler: vi.fn(),
      addOnceHandler: vi.fn(),
      removeHandler: vi.fn(),
    } as unknown as Viewer;

    const handler = vi.fn();
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );
    await renderHook(() => useViewerEvent('animation', handler, { enabled: false }), { wrapper });
    expect(mockViewer.addHandler).not.toHaveBeenCalled();
  });

  test('does not call addHandler when viewer is null', async () => {
    const mockViewer = {
      addHandler: vi.fn(),
      addOnceHandler: vi.fn(),
      removeHandler: vi.fn(),
    } as unknown as Viewer;

    const handler = vi.fn();
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: null })}>
        {children}
      </ViewerContext.Provider>
    );
    await renderHook(() => useViewerEvent('animation', handler), { wrapper });
    expect(mockViewer.addHandler).not.toHaveBeenCalled();
  });

  test('stable wrapper dispatches to the latest handler without re-registering', async () => {
    const mockViewer = {
      addHandler: vi.fn(),
      addOnceHandler: vi.fn(),
      removeHandler: vi.fn(),
    } as unknown as Viewer;

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );

    const { rerender } = await renderHook(
      ({ h }: { h?: typeof handler1 } = {}) => useViewerEvent('animation', h ?? handler1),
      { wrapper, initialProps: { h: handler1 } }
    );

    // addHandler was called once on mount
    expect(mockViewer.addHandler).toHaveBeenCalledOnce();

    // Get the stable wrapper that was registered
    const [[, stableWrapper]] = (mockViewer.addHandler as ReturnType<typeof vi.fn>).mock.calls;

    // Rerender with a different handler
    await rerender({ h: handler2 });

    // addHandler must not be called again (no re-registration)
    expect(mockViewer.addHandler).toHaveBeenCalledOnce();

    // Invoke the stable wrapper -- it should call handler2, not handler1
    stableWrapper({});
    expect(handler2).toHaveBeenCalledOnce();
    expect(handler1).not.toHaveBeenCalled();
  });

  test('each event after a re-render reaches only the handler of the latest render', async () => {
    const mockViewer = {
      addHandler: vi.fn(),
      addOnceHandler: vi.fn(),
      removeHandler: vi.fn(),
    } as unknown as Viewer;

    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        {children}
      </ViewerContext.Provider>
    );

    const { rerender } = await renderHook(
      ({ h }: { h?: typeof handler1 } = {}) => useViewerEvent('animation', h ?? handler1),
      { wrapper, initialProps: { h: handler1 } }
    );
    const [[, stableWrapper]] = (mockViewer.addHandler as ReturnType<typeof vi.fn>).mock.calls;

    stableWrapper({ n: 1 });
    await rerender({ h: handler2 });
    stableWrapper({ n: 2 });
    await rerender({ h: handler3 });
    stableWrapper({ n: 3 });

    expect(handler1.mock.calls).toEqual([[{ n: 1 }]]);
    expect(handler2.mock.calls).toEqual([[{ n: 2 }]]);
    expect(handler3.mock.calls).toEqual([[{ n: 3 }]]);
    expect(mockViewer.addHandler).toHaveBeenCalledOnce();
  });

  test('an event fired from a child layout effect of the same commit reaches the new handler', async () => {
    const mockViewer = {
      addHandler: vi.fn(),
      addOnceHandler: vi.fn(),
      removeHandler: vi.fn(),
    } as unknown as Viewer;
    const fireRegistered = (n: number) => {
      const calls = (mockViewer.addHandler as ReturnType<typeof vi.fn>).mock.calls;
      calls.at(-1)?.[1]({ n });
    };

    // Fires the registered wrapper while React commits, before passive effects.
    function FireOnCommit({ n }: { n: number }) {
      useLayoutEffect(() => {
        fireRegistered(n);
      }, [n]);
      return null;
    }

    function Subscriber({ handler, n }: { handler: (e: unknown) => void; n: number }) {
      useViewerEvent('animation', handler);
      return <FireOnCommit n={n} />;
    }

    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const ui = (handler: (e: unknown) => void, n: number) => (
      <ViewerContext.Provider value={createMockContext({ viewer: mockViewer })}>
        <Subscriber handler={handler} n={n} />
      </ViewerContext.Provider>
    );

    // On mount the subscription does not exist yet when the layout effect runs.
    const { rerender } = await render(ui(handler1, 1));
    expect(mockViewer.addHandler).toHaveBeenCalledOnce();

    await rerender(ui(handler2, 2));

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2.mock.calls).toEqual([[{ n: 2 }]]);
  });
});
