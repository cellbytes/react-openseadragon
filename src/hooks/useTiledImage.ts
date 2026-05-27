import { useViewerContext } from '../context/ViewerContext';

import type { TiledImage } from 'openseadragon';

/**
 * Returns the OSD TiledImage for the given imageKey, or undefined if no
 * TiledImage component with that key is currently mounted.
 *
 * The returned value updates whenever TiledImage components mount or unmount,
 * so components that consume it re-render automatically on world changes.
 *
 * Throws if called outside a ViewerProvider or ViewerStateProvider.
 *
 * @param imageKey - The imageKey prop of the TiledImage component to look up.
 *
 * @example
 * const primaryTiledImage = useTiledImage('primary');
 */
export function useTiledImage(imageKey: string): TiledImage | undefined {
  const { worldItems } = useViewerContext();
  return worldItems.find((e) => e.key === imageKey)?.tiledImage;
}
