import { useState } from 'react';

import { describe, expect, test, vi } from 'vitest';

import { TiledImage, useWorld } from '..';
import { useViewerContext } from '../context/ViewerContext';
import { renderViewer, TestOsdContainer, ViewerReadySignal, waitForViewer } from '../testUtils';

import type { TiledImage as OsdTiledImage } from 'openseadragon';

/** Generic single-image tile source served from the test public directory. */
const imageTileSource = () => ({ type: 'image' as const, url: '/fixtures/test-image.jpg' });

/** Deep Zoom (DZI) tile source, exercising a real multi-level tile pyramid. */
const dziTileSource = () => '/fixtures/test.dzi';

/** Helper component that renders the current world registration state. */
function WorldChecker({ imageKey }: { imageKey: string }) {
  const world = useWorld();
  const img = world.getByKey(imageKey);
  return <div data-testid="world-state">{img ? 'registered' : 'unregistered'}</div>;
}

/** Helper to render with the viewer test layout and wait for OSD initialization. */
async function setup(children: React.ReactNode) {
  await renderViewer(
    <>
      <TestOsdContainer />
      <ViewerReadySignal />
      {children}
    </>
  );
  await waitForViewer();
}

describe('TiledImage', () => {
  test('after mount with a valid tile source, image is registered in world', async () => {
    const tileSource = imageTileSource();
    await setup(
      <>
        <TiledImage imageKey="test" tileSource={tileSource} />
        <WorldChecker imageKey="test" />
      </>
    );

    await vi.waitFor(
      () => {
        expect(document.querySelector('[data-testid="world-state"]')?.textContent).toBe(
          'registered'
        );
      },
      { timeout: 10000 }
    );
  });

  test('after mount with a DZI tile source, image is registered in world', async () => {
    const tileSource = dziTileSource();
    await setup(
      <>
        <TiledImage imageKey="test" tileSource={tileSource} />
        <WorldChecker imageKey="test" />
      </>
    );

    await vi.waitFor(
      () => {
        expect(document.querySelector('[data-testid="world-state"]')?.textContent).toBe(
          'registered'
        );
      },
      { timeout: 10000 }
    );
  });

  test('after unmount, image is unregistered from world', async () => {
    const tileSource = imageTileSource();

    function ToggleImage() {
      const [shown, setShown] = useState(true);
      return (
        <>
          {shown && <TiledImage imageKey="test" tileSource={tileSource} />}
          <WorldChecker imageKey="test" />
          <button onClick={() => setShown(false)}>unmount</button>
        </>
      );
    }

    await setup(<ToggleImage />);

    // Wait for initial registration
    await vi.waitFor(
      () => {
        expect(document.querySelector('[data-testid="world-state"]')?.textContent).toBe(
          'registered'
        );
      },
      { timeout: 10000 }
    );

    // Unmount the TiledImage
    document.querySelector<HTMLButtonElement>('[role="button"], button')?.click();

    await vi.waitFor(
      () => {
        expect(document.querySelector('[data-testid="world-state"]')?.textContent).toBe(
          'unregistered'
        );
      },
      { timeout: 5000 }
    );
  });

  test('onLoad callback is called with the TiledImage after successful add', async () => {
    const tileSource = imageTileSource();
    let loadedImage: OsdTiledImage | null = null;

    await setup(
      <TiledImage imageKey="test" tileSource={tileSource} onLoad={(img) => (loadedImage = img)} />
    );

    await vi.waitFor(
      () => {
        expect(loadedImage).not.toBeNull();
      },
      { timeout: 10000 }
    );
  });

  test('onError callback is called when given an invalid tile source', async () => {
    let errorReceived: Error | null = null;
    const invalidTileSource = {
      type: 'legacy-image',
      url: '/nonexistent.jpg',
      buildPyramid: false,
    };

    // OpenSeadragon writes the underlying "No TileSource was able to open ..."
    // message to console.error before invoking the open-failed handler we
    // forward to onError. We assert via the callback below, so silence the
    // expected library log for this case.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await setup(
        <TiledImage
          imageKey="test-error"
          tileSource={invalidTileSource}
          onError={(err) => (errorReceived = err)}
        />
      );

      await vi.waitFor(
        () => {
          expect(errorReceived).not.toBeNull();
        },
        { timeout: 10000 }
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  test('changing tileSource causes re-registration under the same key', async () => {
    const tileSource1 = imageTileSource();
    const tileSource2 = imageTileSource();

    const loadedImages: OsdTiledImage[] = [];

    function SwitchableImage() {
      const [source, setSource] = useState<ReturnType<typeof imageTileSource>>(tileSource1);
      return (
        <>
          <TiledImage
            imageKey="test"
            tileSource={source}
            onLoad={(img) => loadedImages.push(img)}
          />
          <WorldChecker imageKey="test" />
          <button onClick={() => setSource(tileSource2)}>switch</button>
        </>
      );
    }

    await setup(<SwitchableImage />);

    // Wait for first registration
    await vi.waitFor(
      () => {
        expect(document.querySelector('[data-testid="world-state"]')?.textContent).toBe(
          'registered'
        );
        expect(loadedImages.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 10000 }
    );

    const firstImage = loadedImages[0];

    // Switch tile source
    document.querySelector<HTMLButtonElement>('button')?.click();

    // Wait for re-registration with new tile source
    await vi.waitFor(
      () => {
        expect(loadedImages.length).toBeGreaterThanOrEqual(2);
        expect(loadedImages[loadedImages.length - 1]).not.toBe(firstImage);
      },
      { timeout: 10000 }
    );

    // Should still be registered under same key
    expect(document.querySelector('[data-testid="world-state"]')?.textContent).toBe('registered');
  });

  test('stable tileSource reference does not cause a rerender loop when worldItems change', async () => {
    // Regression test: a tileSource created as a new inline object on every render
    // would, when TiledImage registered (updating worldItems), cause the parent to
    // re-render with a new object reference, re-running the effect and removing and
    // re-adding the image -- an infinite loop. This test verifies the invariant:
    // once registered, a stable tileSource never causes worldItems to drop back to 0.
    const tileSource = imageTileSource();
    const worldLengths: number[] = [];

    function ParentObservingWorldItems() {
      const { worldItems } = useViewerContext();
      worldLengths.push(worldItems.length);
      return <TiledImage imageKey="test" tileSource={tileSource} opacity={0.5} />;
    }

    await setup(<ParentObservingWorldItems />);

    // Wait for the image to register (worldItems reaches 1)
    await vi.waitFor(() => expect(worldLengths).toContain(1), { timeout: 10000 });

    // In a rerender loop worldItems would oscillate: the count would drop from 1 back to 0
    // as the image is removed and re-added. Verify it never drops after first registration.
    const indexOfFirstOne = worldLengths.indexOf(1);
    expect(worldLengths.slice(indexOfFirstOne).every((n) => n === 1)).toBe(true);
  });
});
