import { useEffect, useRef } from 'react';

import OpenSeadragon from 'openseadragon';

import { useViewerContext } from '../context/ViewerContext';

import type {
  ClickMouseTrackerEvent,
  ContextMenuMouseTrackerEvent,
  DblClickMouseTrackerEvent,
  DragEndMouseTrackerEvent,
  DragMouseTrackerEvent,
  EnterLeaveMouseTrackerEvent,
  KeyMouseTrackerEvent,
  MouseTracker,
  MouseTrackerEvent,
  NonPrimaryPressMouseTrackerEvent,
  PinchMouseTrackerEvent,
  PointerMouseTrackerEvent,
  ReleaseMouseTrackerEvent,
  ScrollMouseTrackerEvent,
} from 'openseadragon';

/** MouseTracker callback options (element handled separately). */
type MouseTrackerCallbacks = {
  contextMenuHandler?: (event: ContextMenuMouseTrackerEvent) => void;
  enterHandler?: (event: EnterLeaveMouseTrackerEvent) => void;
  leaveHandler?: (event: EnterLeaveMouseTrackerEvent) => void;
  overHandler?: (event: EnterLeaveMouseTrackerEvent) => void;
  outHandler?: (event: EnterLeaveMouseTrackerEvent) => void;
  pressHandler?: (event: PointerMouseTrackerEvent) => void;
  nonPrimaryPressHandler?: (event: NonPrimaryPressMouseTrackerEvent) => void;
  releaseHandler?: (event: ReleaseMouseTrackerEvent) => void;
  nonPrimaryReleaseHandler?: (event: NonPrimaryPressMouseTrackerEvent) => void;
  moveHandler?: (event: PointerMouseTrackerEvent) => void;
  scrollHandler?: (event: ScrollMouseTrackerEvent) => void;
  clickHandler?: (event: ClickMouseTrackerEvent) => void;
  dblClickHandler?: (event: DblClickMouseTrackerEvent) => void;
  dragHandler?: (event: DragMouseTrackerEvent) => void;
  dragEndHandler?: (event: DragEndMouseTrackerEvent) => void;
  pinchHandler?: (event: PinchMouseTrackerEvent) => void;
  keyDownHandler?: (event: KeyMouseTrackerEvent) => void;
  keyUpHandler?: (event: KeyMouseTrackerEvent) => void;
  keyHandler?: (event: KeyMouseTrackerEvent) => void;
  focusHandler?: (event: MouseTrackerEvent<FocusEvent>) => void;
  blurHandler?: (event: MouseTrackerEvent<FocusEvent>) => void;
};

/** Options for useMouseTracker. */
export type UseMouseTrackerOptions = MouseTrackerCallbacks & {
  /**
   * The element to attach the tracker to. Defaults to the viewer container div
   * from the nearest ViewerProvider. Override only when tracking a different element.
   */
  element?: HTMLElement | null;
  /**
   * When false, the tracker is not created. Set to false to conditionally disable
   * tracking without a conditional hook call. Default: true.
   */
  enabled?: boolean;
  /** Threshold in milliseconds for a click gesture. */
  clickTimeThreshold?: number;
  /** Threshold in pixels for a click gesture. */
  clickDistThreshold?: number;
  /** Threshold in milliseconds for a double-click gesture. */
  dblClickTimeThreshold?: number;
  /** Threshold in pixels for a double-click gesture. */
  dblClickDistThreshold?: number;
  /** Delay in milliseconds before the stop event fires. */
  stopDelay?: number;
  /** When true, tracking is initially disabled. */
  startDisabled?: boolean;
};

/**
 * Creates an OSD MouseTracker bound to the given element (or the viewer container
 * by default) and destroys it on cleanup.
 *
 * All callback handlers are stabilized internally via a ref, so they do not need
 * to be memoized. Stale closures are not possible.
 *
 * The tracker is recreated whenever the element reference or enabled flag changes.
 * Non-callback options (thresholds, startDisabled) are read at creation time only;
 * changes to them do not recreate the tracker.
 *
 * Returns the live MouseTracker instance, or null when the tracker is not active
 * (element not yet available or enabled is false).
 *
 * Throws if called outside a ViewerProvider.
 *
 * @example
 * useMouseTracker({
 *   moveHandler: (e) => updateCursor(e.position),
 *   leaveHandler: () => clearCursor(),
 *   contextMenuHandler: (e) => { e.originalEvent.preventDefault(); },
 * });
 *
 * @example
 * // Track a different element instead of the viewer container:
 * useMouseTracker({ element: customRef.current, clickHandler: handleClick });
 */
export function useMouseTracker(options: UseMouseTrackerOptions): MouseTracker | null {
  const { containerRef } = useViewerContext();
  const { element: elementProp, enabled = true, ...rest } = options;

  // When element is not provided, use the viewer container.
  const element = elementProp !== undefined ? elementProp : containerRef.current;

  // Keep callbacks and non-callback options in a ref so we can read the latest
  // values from stable wrappers without recreating the tracker.
  const optionsRef = useRef(rest);
  optionsRef.current = rest;

  const trackerRef = useRef<MouseTracker | null>(null);

  useEffect(() => {
    if (!element || !enabled) {
      return;
    }

    // Build stable wrappers for every callback. Each wrapper reads the latest
    // version from optionsRef.current on each call, eliminating stale closures.
    const tracker = new OpenSeadragon.MouseTracker({
      element,
      clickTimeThreshold: rest.clickTimeThreshold,
      clickDistThreshold: rest.clickDistThreshold,
      dblClickTimeThreshold: rest.dblClickTimeThreshold,
      dblClickDistThreshold: rest.dblClickDistThreshold,
      stopDelay: rest.stopDelay,
      startDisabled: rest.startDisabled,
      contextMenuHandler: (e) => optionsRef.current.contextMenuHandler?.(e),
      enterHandler: (e) => optionsRef.current.enterHandler?.(e),
      leaveHandler: (e) => optionsRef.current.leaveHandler?.(e),
      overHandler: (e) => optionsRef.current.overHandler?.(e),
      outHandler: (e) => optionsRef.current.outHandler?.(e),
      pressHandler: (e) => optionsRef.current.pressHandler?.(e),
      nonPrimaryPressHandler: (e) => optionsRef.current.nonPrimaryPressHandler?.(e),
      releaseHandler: (e) => optionsRef.current.releaseHandler?.(e),
      nonPrimaryReleaseHandler: (e) => optionsRef.current.nonPrimaryReleaseHandler?.(e),
      moveHandler: (e) => optionsRef.current.moveHandler?.(e),
      scrollHandler: (e) => optionsRef.current.scrollHandler?.(e),
      clickHandler: (e) => optionsRef.current.clickHandler?.(e),
      dblClickHandler: (e) => optionsRef.current.dblClickHandler?.(e),
      dragHandler: (e) => optionsRef.current.dragHandler?.(e),
      dragEndHandler: (e) => optionsRef.current.dragEndHandler?.(e),
      pinchHandler: (e) => optionsRef.current.pinchHandler?.(e),
      keyDownHandler: (e) => optionsRef.current.keyDownHandler?.(e),
      keyUpHandler: (e) => optionsRef.current.keyUpHandler?.(e),
      keyHandler: (e) => optionsRef.current.keyHandler?.(e),
      focusHandler: (e) => optionsRef.current.focusHandler?.(e),
      blurHandler: (e) => optionsRef.current.blurHandler?.(e),
    });

    trackerRef.current = tracker;
    return () => {
      tracker.destroy();
      trackerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element, enabled]);

  return trackerRef.current;
}
