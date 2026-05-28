import { createContext, useContext, RefObject } from 'react';

import type { TileCache, TileSource, Viewer } from 'openseadragon';

/** A TiledImage currently registered in the OSD world via a TiledImage component. */
export interface TiledImageEntry {
  /**
   * The consumer-assigned stable identifier from the imageKey prop.
   * Used by useCoordinates(imageKey), useWorld().getByKey(imageKey), and
   * the CanvasOverlay world map.
   */
  key: string;
  /** The underlying OSD TiledImage object. */
  tiledImage: import('openseadragon').TiledImage;
}

/** Shared state provided by ViewerProvider or ViewerStateProvider to all descendant components. */
export interface ViewerContextValue {
  /**
   * The live OSD Viewer instance. Null before the container mounts and after unmount.
   * Changes identity when the viewer is destroyed and recreated (when options change).
   */
  viewer: Viewer | null;
  /**
   * Ref to the div element that OSD is mounted into. Stable across viewer recreations.
   * Use this as the target for MouseTracker and other DOM-bound operations; do not
   * query by element id.
   */
  containerRef: RefObject<HTMLDivElement | null>;
  /**
   * True while the viewer exists but the OSD 'open' event has not yet fired.
   * Useful for showing a loading indicator.
   */
  isLoading: boolean;
  /**
   * True once OSD has fired its 'open' event for the current tile sources.
   * Reset to false when the viewer is destroyed or options change.
   */
  isOpen: boolean;

  // World state (previously WorldContext)

  /** Ordered list of all TiledImages currently registered in the OSD world. */
  worldItems: TiledImageEntry[];
  /** Internal: called by TiledImage on mount after addTiledImage succeeds. */
  _register: (entry: TiledImageEntry) => void;
  /** Internal: called by TiledImage on unmount after removeItem. */
  _unregister: (key: string) => void;

  // Optional shared tile state
  // These are undefined when the context is provided by the standalone ViewerProvider
  // (e.g. an isolated mini-viewer). They are populated by ViewerStateProvider.

  /**
   * The primary tile source for the current viewer session.
   * Set by the consuming application once its tile source has loaded.
   */
  tileSource: TileSource | undefined;
  /** Updates the tile source stored in context. */
  setTileSource: (ts: TileSource | undefined) => void;
  /**
   * Shared TileCache instance. Injected into OSD so that secondary viewers can
   * reuse tiles already fetched by the primary viewer.
   */
  tileCache: TileCache | undefined;
  /**
   * Callback ref for the OSD container div. Attach this as the `ref` prop on
   * the div that should host the OSD canvas. The provider initialises OSD as
   * soon as the element is available and tears it down when it is removed.
   */
  setContainerElement: (el: HTMLDivElement | null) => void;
}

export const ViewerContext = createContext<ViewerContextValue | null>(null);

/**
 * Returns the full ViewerContextValue from the nearest ViewerProvider or ViewerStateProvider.
 * Throws if called outside a provider.
 */
export function useViewerContext(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (!ctx) {
    throw new Error('useViewerContext must be used inside a ViewerProvider or ViewerStateProvider');
  }
  return ctx;
}
