import { useRef } from 'react';

import OpenSeadragon, { TileCache, TiledImage } from 'openseadragon';
import { expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ViewerStateProvider } from './components/ViewerStateProvider';
import {
  ViewerContext,
  ViewerContextValue,
  TiledImageEntry,
  useViewerContext,
} from './context/ViewerContext';
import { useOpenseadragon } from './hooks/useOpenseadragon';
import { useViewer } from './hooks/useViewer';

import type { OsdPlugin } from './plugins/types';

const TEST_VIEWER_OPTIONS: OpenSeadragon.Options & { id: string } = {
  id: 'openSeaDragon',
  showNavigator: false,
  animationTime: 0,
  blendTime: 0,
};

function ViewerTestProvider({
  children,
  plugins,
}: React.PropsWithChildren<{ plugins: OsdPlugin[] }>) {
  const state = useOpenseadragon({ options: TEST_VIEWER_OPTIONS, plugins });
  return <ViewerStateProvider state={state}>{children}</ViewerStateProvider>;
}

/**
 * Renders children inside a ViewerStateProvider backed by a real OSD instance.
 * Pass any OSD plugins the test needs (for example an overlay plugin).
 */
export async function renderViewer(children: React.ReactNode, plugins: OsdPlugin[] = []) {
  return render(<ViewerTestProvider plugins={plugins}>{children}</ViewerTestProvider>);
}

/**
 * Static ViewerContext provider for tests that need to mount viewer-aware
 * components without booting a real OSD instance. The context exposes
 * empty/null defaults; use renderViewer for tests that need real OSD.
 */
export function MockViewerContextProvider({ children }: React.PropsWithChildren) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tileCache = new OpenSeadragon.TileCache({});

  const value: ViewerContextValue = {
    viewer: null,
    containerRef,
    isLoading: false,
    isOpen: false,
    worldItems: [],
    _register: () => {},
    _unregister: () => {},
    tileSource: undefined,
    setTileSource: () => {},
    tileCache,
    setContainerElement: () => {},
  };

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function createMockContext(overrides?: Partial<ViewerContextValue>): ViewerContextValue {
  return {
    viewer: null,
    containerRef: { current: null },
    isLoading: false,
    isOpen: false,
    worldItems: [],
    _register: vi.fn(),
    _unregister: vi.fn(),
    tileSource: undefined,
    setTileSource: vi.fn(),
    tileCache: {} as TileCache,
    setContainerElement: vi.fn(),
    ...overrides,
  };
}

export function makeTiledImageEntry(key: string): TiledImageEntry {
  return { key, tiledImage: {} as TiledImage };
}

/**
 * Minimal OSD container that hooks into the layout-level ViewerStateProvider,
 * attaching setContainerElement so OSD initializes.
 */
export function TestOsdContainer() {
  const { setContainerElement } = useViewerContext();
  return (
    <div
      ref={setContainerElement}
      id="openSeaDragon"
      data-testid="osd-container"
      style={{ width: 400, height: 400 }}
    />
  );
}

/** Signals when the viewer is non-null (OSD has initialized). */
export function ViewerReadySignal({
  onViewer,
}: {
  onViewer?: (v: OpenSeadragon.Viewer | null) => void;
} = {}) {
  const { viewer } = useViewer();
  onViewer?.(viewer);
  return <div data-testid="viewer-ready">{viewer ? 'ready' : 'not-ready'}</div>;
}

/** Waits for OSD viewer to initialize (viewer becomes non-null). */
export async function waitForViewer() {
  await vi.waitFor(
    () => {
      expect(document.querySelector('[data-testid="viewer-ready"]')?.textContent).toBe('ready');
    },
    { timeout: 10000 }
  );
}
