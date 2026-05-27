import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import OpenSeadragon from 'openseadragon';

import type { TiledImageEntry } from '../context/ViewerContext';
import type { OsdInstancePlugin, OsdPlugin } from '../plugins/types';
import type { TileCache, TileSource, Viewer } from 'openseadragon';

/** Options for useOpenseadragon. */
export interface UseOpenseadragonOptions {
  /**
   * OpenSeadragon options. The id field is required and used as the id attribute
   * on the container div rendered by the Viewer component. OSD itself is
   * initialised with the container element directly (not by id).
   * Pass a module-level constant or memoised value; changing this reference
   * destroys and recreates the viewer.
   */
  options: OpenSeadragon.Options & { id: string };
  /**
   * Plugins to install. Prototype plugins are applied once globally; instance
   * plugins run init/destroy per viewer lifecycle.
   * Pass a module-level constant (not an inline array).
   */
  plugins?: OsdPlugin[];
}

/** All state returned by useOpenseadragon, to be passed to ViewerStateProvider. */
export interface OsdState {
  viewer: Viewer | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  isOpen: boolean;
  worldItems: TiledImageEntry[];
  _register: (entry: TiledImageEntry) => void;
  _unregister: (key: string) => void;
  tileSource: TileSource | undefined;
  setTileSource: (ts: TileSource | undefined) => void;
  tileCache: TileCache;
  /**
   * Callback ref to attach to the OSD container div. The Viewer component passes
   * this as the ref prop on the div it renders. OSD initialises once the element
   * is available and destroys when it is removed.
   */
  setContainerElement: (el: HTMLDivElement | null) => void;
}

/**
 * Initialises an OpenSeadragon viewer at the layout level, decoupled from the
 * container div's location in the tree.
 *
 * The returned setContainerElement should be passed as the ref prop of the div
 * that the Viewer component renders. OSD initialises as soon as the element is
 * available and cleans up when it is removed (e.g. when the Viewer unmounts).
 *
 * Pass the returned OsdState to ViewerStateProvider to make viewer state
 * accessible to all descendants via useViewerContext().
 *
 * @example
 * const osdState = useOpenseadragon({ options: VIEWER_OPTIONS, plugins: PLUGINS });
 * return (
 *   <ViewerStateProvider state={osdState}>
 *     <Outlet />
 *   </ViewerStateProvider>
 * );
 */
export function useOpenseadragon({ options, plugins }: UseOpenseadragonOptions): OsdState {
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [worldItems, setWorldItems] = useState<TiledImageEntry[]>([]);
  const [tileSource, setTileSource] = useState<TileSource | undefined>(undefined);
  const [tileCache] = useState<TileCache>(() => new OpenSeadragon.TileCache({}));

  const _register = useCallback((entry: TiledImageEntry) => {
    setWorldItems((prev) => [...prev, entry]);
  }, []);

  const _unregister = useCallback((key: string) => {
    setWorldItems((prev) => prev.filter((e) => e.key !== key));
  }, []);

  // Keep containerRef in sync with the element state so useMouseTracker
  // (which reads containerRef.current) always has the current element.
  useEffect(() => {
    containerRef.current = containerElement;
  }, [containerElement]);

  useEffect(() => {
    if (!containerElement) return;

    // Apply prototype plugins idempotently.
    plugins
      ?.filter((p): p is Extract<OsdPlugin, { kind: 'prototype' }> => p.kind === 'prototype')
      .forEach((p) => p.apply(OpenSeadragon));

    // Strip tileSources; TiledImage components own image loading.
    const {
      tileSources: _stripped,
      id: _id,
      ...restOptions
    } = options as OpenSeadragon.Options & {
      id: string;
      tileSources?: unknown;
    };
    // Use element directly so OSD does not need to find the div by id.
    // autoResize is forced off; we drive resizes synchronously via the
    // ResizeObserver below so layout changes (e.g. a sibling panel mounting)
    // do not produce a one-frame squeeze before OSD's RAF tick catches up.
    const v = OpenSeadragon({ ...restOptions, element: containerElement, autoResize: false });
    v.tileCache = tileCache;

    const instancePlugins = (plugins ?? []).filter(
      (p): p is OsdInstancePlugin => p.kind === 'instance'
    );
    instancePlugins.forEach((p) => p.init(v));

    v.addHandler('open', () => {
      setIsOpen(true);
      setIsLoading(false);
    });

    // Synchronously resize the viewport and redraw the canvas in the
    // ResizeObserver callback, which fires after layout but before paint.
    // This mirrors OSD's internal doViewerResize (preserving zoom/pan around
    // the center) and then drives world.draw() directly so the canvas backing
    // buffer is updated in the same frame as the layout change.
    const preserveImageSize = options.preserveImageSizeOnResize ?? false;
    let prevSize = {
      x: v.viewport.getContainerSize().x,
      y: v.viewport.getContainerSize().y,
    };
    const resizeObserver = new ResizeObserver((entries) => {
      if (v.isDestroyed()) return;
      const entry = entries[0];
      if (!entry) return;
      const newSize = new OpenSeadragon.Point(
        Math.max(1, Math.round(entry.contentRect.width)),
        Math.max(1, Math.round(entry.contentRect.height))
      );
      if (prevSize.x === newSize.x && prevSize.y === newSize.y) return;
      const viewport = v.viewport;
      const zoom = viewport.getZoom();
      const center = viewport.getCenter();
      viewport.resize(newSize, preserveImageSize);
      viewport.panTo(center, true);
      const resizeRatio = preserveImageSize
        ? prevSize.x / newSize.x
        : (Math.hypot(newSize.x, newSize.y) / Math.hypot(prevSize.x, prevSize.y)) *
          (prevSize.x / newSize.x);
      viewport.zoomTo(zoom * resizeRatio, undefined, true);
      prevSize = { x: newSize.x, y: newSize.y };
      v.world.draw();
      // Mirror OSD's drawWorld + animation dispatch so the canvas overlay
      // (subscribed to 'update-viewport') redraws and the SVG overlay
      // (subscribed to 'animation') refreshes its viewBox in the same frame.
      // viewport.resize already raised 'resize', but that fires before the
      // subsequent panTo/zoomTo, so the SVG viewBox is stale until 'animation'.
      v.raiseEvent('update-viewport', {});
      v.raiseEvent('animation', {});
    });
    resizeObserver.observe(containerElement);

    setIsLoading(true);
    setIsOpen(false);
    setViewer(v);

    return () => {
      resizeObserver.disconnect();
      instancePlugins.forEach((p) => p.destroy?.(v));
      v.destroy();
      setViewer(null);
      setIsOpen(false);
      setIsLoading(false);
      setWorldItems([]);
      setTileSource(undefined);
    };
    // tileCache is stable (created once via useState initialiser).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerElement, options, plugins]);

  return useMemo(
    () => ({
      viewer,
      containerRef,
      isLoading,
      isOpen,
      worldItems,
      _register,
      _unregister,
      tileSource,
      setTileSource,
      tileCache,
      setContainerElement,
    }),
    [viewer, isLoading, isOpen, worldItems, _register, _unregister, tileSource, tileCache]
  );
}
