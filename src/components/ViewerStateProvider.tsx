import { useMemo } from 'react';

import { ViewerContext } from '../context/ViewerContext';

import type { OsdState } from '../hooks/useOpenseadragon';

interface ViewerStateProviderProps {
  /** State returned by useOpenseadragon. */
  state: OsdState;
  children?: React.ReactNode;
}

/**
 * Thin context provider for layout-level viewer initialisation. Accepts the
 * OsdState returned by useOpenseadragon and makes it available to all
 * descendants via useViewerContext().
 *
 * Pair this with useOpenseadragon at the layout level to share a single viewer
 * instance across an entire route subtree without nesting a ViewerProvider
 * inside the Viewer component.
 *
 * The Viewer component inside this subtree must render a div and attach
 * state.setContainerElement as its ref so OSD knows where to mount.
 *
 * @example
 * // In the layout:
 * const osdState = useOpenseadragon({ options: VIEWER_OPTIONS, plugins: PLUGINS });
 * return (
 *   <ViewerStateProvider state={osdState}>
 *     <Outlet />
 *   </ViewerStateProvider>
 * );
 *
 * // In the Viewer component:
 * const { setContainerElement } = useViewerContext();
 * return <div id="openSeaDragon" ref={setContainerElement} />;
 */
export function ViewerStateProvider({ state, children }: ViewerStateProviderProps) {
  const value = useMemo(
    () => ({
      viewer: state.viewer,
      containerRef: state.containerRef,
      isLoading: state.isLoading,
      isOpen: state.isOpen,
      worldItems: state.worldItems,
      _register: state._register,
      _unregister: state._unregister,
      tileSource: state.tileSource,
      setTileSource: state.setTileSource,
      tileCache: state.tileCache,
      setContainerElement: state.setContainerElement,
    }),
    [state]
  );

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}
