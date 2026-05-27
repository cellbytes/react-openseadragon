import { useViewerContext } from '../context/ViewerContext';

/** Reactive viewer loading and open state. */
export interface ViewerState {
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
}

/**
 * Returns the reactive loading and open state of the nearest ViewerProvider.
 *
 * Both values update as React state whenever their underlying OSD events fire,
 * so components that consume them re-render automatically.
 *
 * Throws if called outside a ViewerProvider.
 *
 * @example
 * const { isLoading, isOpen } = useViewerState();
 * if (isLoading) return <Spinner />;
 */
export function useViewerState(): ViewerState {
  const { isLoading, isOpen } = useViewerContext();
  return { isLoading, isOpen };
}
