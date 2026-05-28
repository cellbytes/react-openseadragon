import { useMemo } from 'react';

import { ViewerContext } from '../context/ViewerContext';

import type { OsdState } from '../hooks/useOpenseadragon';

interface ViewerStateProviderProps {
  /** State returned by useOpenseadragon. */
  state: OsdState;
  children?: React.ReactNode;
}

/**
 * Thin context provider that shares the OsdState returned by useOpenseadragon
 * with every descendant via useViewerContext().
 *
 * Render it as an ancestor of every component that needs to read viewer
 * state. The component that renders the OSD container div must attach
 * state.setContainerElement as its ref so OSD knows where to mount.
 *
 * @example
 * const osdState = useOpenseadragon({ options: VIEWER_OPTIONS, plugins: PLUGINS });
 * return (
 *   <ViewerStateProvider state={osdState}>
 *     <div ref={osdState.setContainerElement} style={{ width: '100%', height: 600 }} />
 *     <TiledImage imageKey="primary" tileSource={tileSource} />
 *   </ViewerStateProvider>
 * );
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
