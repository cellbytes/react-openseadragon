import { useViewerContext } from '../context/ViewerContext';

import type { TiledImage } from 'openseadragon';

/** The world state exposed to consumers. */
export interface WorldState {
  /**
   * Ordered list of all TiledImages currently registered in the OSD world,
   * in the order their TiledImage components mounted.
   */
  items: import('../context/ViewerContext').TiledImageEntry[];
  /**
   * Returns the TiledImage registered under the given imageKey, or undefined
   * if no TiledImage component with that key is currently mounted.
   *
   * @param key - The imageKey prop passed to the TiledImage component.
   */
  getByKey(key: string): TiledImage | undefined;
  /**
   * Returns the TiledImage at the given index in the mount-order list,
   * or undefined if the index is out of range.
   *
   * @param index - Zero-based index into the items array.
   */
  getByIndex(index: number): TiledImage | undefined;
}

/**
 * Returns the current state of the OSD world from the nearest ViewerProvider
 * or ViewerStateProvider, including all registered TiledImages and helper
 * lookup functions.
 *
 * The returned value updates whenever a TiledImage component mounts or unmounts.
 *
 * Throws if called outside a provider.
 *
 * @example
 * const world = useWorld();
 * const primary = world.getByKey('primary');
 * const first = world.getByIndex(0);
 */
export function useWorld(): WorldState {
  const { worldItems } = useViewerContext();

  function getByKey(key: string): TiledImage | undefined {
    return worldItems.find((e) => e.key === key)?.tiledImage;
  }

  function getByIndex(index: number): TiledImage | undefined {
    return worldItems[index]?.tiledImage;
  }

  return { items: worldItems, getByKey, getByIndex };
}
