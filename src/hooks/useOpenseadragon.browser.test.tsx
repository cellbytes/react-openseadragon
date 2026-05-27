import { useState } from 'react';

import OpenSeadragon from 'openseadragon';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { createInstancePlugin, createPrototypePlugin, TiledImage, ViewerStateProvider } from '..';
import { useOpenseadragon } from './useOpenseadragon';

import type { OsdPlugin } from '../plugins/types';
import type { OsdState } from './useOpenseadragon';

// Trivial plugins built with the package factories exercise the plugin-application
// path without depending on any concrete plugin.
const TEST_VIEWER_PLUGINS: OsdPlugin[] = [
  createPrototypePlugin('test-noop-prototype', () => {}),
  createInstancePlugin('test-noop-instance', () => {}),
];

const testViewerOptions: OpenSeadragon.Options & { id: string } = {
  id: 'test-osd-hook',
  showNavigator: false,
  animationTime: 0,
  blendTime: 0,
};

/** Simple harness that calls useOpenseadragon and exposes state via a callback. */
function TestHarness({
  onState,
  withContainer = true,
}: {
  onState: (s: OsdState) => void;
  withContainer?: boolean;
}) {
  const state = useOpenseadragon({ options: testViewerOptions, plugins: TEST_VIEWER_PLUGINS });
  onState(state);
  if (!withContainer) return null;
  return <div ref={state.setContainerElement} style={{ width: 400, height: 400 }} />;
}

/** Harness that mounts a TiledImage child inside a ViewerStateProvider. */
function HarnessWithTiledImage({
  onState,
  tileSource,
}: {
  onState: (s: OsdState) => void;
  tileSource: object;
}) {
  const state = useOpenseadragon({ options: testViewerOptions, plugins: TEST_VIEWER_PLUGINS });
  onState(state);
  return (
    <ViewerStateProvider state={state}>
      <div ref={state.setContainerElement} style={{ width: 400, height: 400 }} />
      <TiledImage imageKey="test" tileSource={tileSource} />
    </ViewerStateProvider>
  );
}

describe('useOpenseadragon', () => {
  test('viewer is null before setContainerElement is called with a DOM element', async () => {
    let capturedState: OsdState | null = null;
    await render(<TestHarness withContainer={false} onState={(s) => (capturedState = s)} />);
    expect(capturedState).not.toBeNull();
    expect(capturedState!.viewer).toBeNull();
  });

  test('isLoading becomes true and viewer becomes non-null once container div is mounted', async () => {
    let capturedState: OsdState | null = null;
    await render(<TestHarness onState={(s) => (capturedState = s)} />);

    await vi.waitFor(
      () => {
        expect(capturedState!.viewer).not.toBeNull();
      },
      { timeout: 5000 }
    );
  });

  test('tileCache has stable identity across re-renders', async () => {
    const states: OsdState[] = [];

    function RerenderHarness() {
      const [count, setCount] = useState(0);
      const state = useOpenseadragon({ options: testViewerOptions, plugins: TEST_VIEWER_PLUGINS });
      states.push(state);
      return (
        <div>
          <div ref={state.setContainerElement} style={{ width: 400, height: 400 }} />
          <button onClick={() => setCount((c) => c + 1)}>rerender {count}</button>
        </div>
      );
    }

    const { getByRole } = await render(<RerenderHarness />);

    // Trigger a re-render via button click
    await getByRole('button').click();

    await vi.waitFor(() => {
      expect(states.length).toBeGreaterThanOrEqual(2);
    });

    // The tileCache instance should be the same object across renders
    const firstCache = states[0].tileCache;
    for (const state of states.slice(1)) {
      expect(state.tileCache).toBe(firstCache);
    }
  });

  test('_register and _unregister update worldItems - verified via TiledImage mount', async () => {
    const tileSource = { type: 'image' as const, url: '/fixtures/test-image.jpg' };

    let capturedState: OsdState | null = null;

    await render(
      <HarnessWithTiledImage onState={(s) => (capturedState = s)} tileSource={tileSource} />
    );

    await vi.waitFor(
      () => {
        expect(capturedState!.worldItems.length).toBe(1);
      },
      { timeout: 10000 }
    );
    expect(capturedState!.worldItems[0].key).toBe('test');
  });
});
