import { type ViewerContextValue, useViewerContext } from '../context/ViewerContext';

/**
 * Returns the full ViewerContextValue from the nearest ViewerProvider,
 * including the viewer instance, container ref, and loading state.
 *
 * Throws if called outside a ViewerProvider.
 *
 * @example
 * const { viewer, containerRef, isOpen, isLoading } = useViewer();
 */
export function useViewer(): ViewerContextValue {
  return useViewerContext();
}
