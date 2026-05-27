import { useEffect, useRef } from 'react';

import { useViewerContext } from '../context/ViewerContext';

import type OpenSeadragon from 'openseadragon';

/**
 * Subscribes to an OSD Viewer event and calls handler on each occurrence.
 * The subscription is automatically cleaned up when the component unmounts,
 * when the viewer is recreated, or when the event name changes.
 *
 * Uses a ref-based dispatch pattern: OSD holds one stable wrapper per
 * subscription that reads the latest handler from a ref on each call.
 * The handler does not need to be memoized -- stale closures are not possible.
 *
 * @param event - The OSD event name, e.g. 'open', 'animation', 'canvas-click'.
 *   See https://openseadragon.github.io/docs/OpenSeadragon.Viewer.html for a
 *   full list of viewer events.
 * @param handler - Callback invoked on each event. May close over any React
 *   state or props without memoization.
 * @param options.once - When true, the handler fires at most once then
 *   unsubscribes automatically. Default: false.
 * @param options.enabled - When false, no subscription is created. Useful for
 *   conditionally enabling handlers without conditional hook calls.
 *   Default: true.
 *
 * @example
 * useViewerEvent('animation-finish', ({ eventSource }) => {
 *   syncUrlFromViewport(eventSource.viewport);
 * });
 *
 * @example
 * useViewerEvent<OpenSeadragon.CanvasClickEvent>(
 *   'canvas-click',
 *   (e) => handleClick(e.position),
 *   { enabled: mode === 'ANNOTATE' }
 * );
 */
/**
 * OSD events that fire before React has committed all child effects and cannot
 * be reliably caught via this hook. Use world state (useTiledImage, useWorld)
 * or viewer state (useViewer) as reactive alternatives.
 */
type ExcludedEvents = 'open';

export function useViewerEvent<
  K extends Exclude<keyof OpenSeadragon.ViewerEventMap, ExcludedEvents>,
>(
  event: K,
  handler: (event: OpenSeadragon.ViewerEventMap[K]) => void,
  options?: { once?: boolean; enabled?: boolean }
): void {
  const { viewer } = useViewerContext();
  const once = options?.once ?? false;
  const enabled = options?.enabled ?? true;

  // Always hold the latest handler without re-registering the OSD subscription.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!viewer || !enabled) return;

    // One stable wrapper per effect instance. OSD holds this reference.
    // Reading from handlerRef on each call avoids stale closures in handler.
    const stable = (e: OpenSeadragon.ViewerEventMap[K]) => handlerRef.current(e);

    // Cast event string to the OSD event map key type. addHandler/removeHandler
    // are typed to only accept known event names, but we expose a string API to
    // allow any OSD event without requiring a complete ViewerEventMap import.
    const eventKey = event;

    if (once) {
      viewer.addOnceHandler(eventKey, stable);
    } else {
      viewer.addHandler(eventKey, stable);
    }

    return () => {
      viewer.removeHandler(eventKey, stable);
    };
  }, [viewer, event, once, enabled]);
}
