// Components
export { TiledImage } from './components/TiledImage';
export type { TiledImageProps } from './components/TiledImage';
export { ViewerStateProvider } from './components/ViewerStateProvider';

// Hooks
export { useCoordinates } from './hooks/useCoordinates';
export type { CoordinateAdapter } from './hooks/useCoordinates';
export { useMouseTracker } from './hooks/useMouseTracker';
export type { UseMouseTrackerOptions } from './hooks/useMouseTracker';
export { useOpenseadragon } from './hooks/useOpenseadragon';
export type { OsdState, UseOpenseadragonOptions } from './hooks/useOpenseadragon';
export { useTiledImage } from './hooks/useTiledImage';
export { useViewer } from './hooks/useViewer';
export { useViewerEvent } from './hooks/useViewerEvent';
export { useViewerState } from './hooks/useViewerState';
export type { ViewerState } from './hooks/useViewerState';
export { useWorld } from './hooks/useWorld';
export type { WorldState } from './hooks/useWorld';

// Plugins (mechanism only; concrete plugins live in app code)
export { createInstancePlugin, createPrototypePlugin } from './plugins/createPlugin';
export type { OsdInstancePlugin, OsdPlugin, OsdPrototypePlugin } from './plugins/types';

// Utils
export { toRect } from './utils/coordinateUtils';
export type { Rectable } from './utils/coordinateUtils';

// Context (for advanced use cases)
export { ViewerContext, useViewerContext } from './context/ViewerContext';
export type { TiledImageEntry, ViewerContextValue } from './context/ViewerContext';
