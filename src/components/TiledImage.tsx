import { useEffect, useRef } from 'react';

import { useViewerContext } from '../context/ViewerContext';

import type { Rect, TileSource, TiledImage as OsdTiledImage } from 'openseadragon';

/** Props for TiledImage. */
export interface TiledImageProps {
  /**
   * Stable string identifier for this image.
   * Used as the key in useCoordinates(imageKey), useWorld().getByKey(imageKey),
   * and the world map passed to CanvasOverlay's onDraw. Must be unique within
   * a ViewerProvider.
   */
  imageKey: string;
  /**
   * The tile source to display. Accepts any OSD-compatible value: a TileSource
   * object, a DZI URL string, or an options object.
   * When this prop changes, the component removes the old image and adds the new one.
   *
   * See https://openseadragon.github.io/docs/OpenSeadragon.html#.AddTiledImageOptions
   */
  tileSource: TileSource | string | object;
  /**
   * X position in viewport coordinates.
   * The first image spans x=0 to x=1 by default.
   * Use this to arrange images side-by-side (e.g. x=1.05 places the image to
   * the right of the first with a 5% gap).
   *
   * See https://openseadragon.github.io/docs/OpenSeadragon.Viewport.html for the
   * viewport coordinate system.
   */
  x?: number;
  /**
   * Y position in viewport coordinates.
   * Use this to stack images vertically (e.g. y=1.05 places the image below
   * the first with a 5% gap).
   */
  y?: number;
  /**
   * Width in viewport coordinates. Defaults to 1 (the same as the primary image
   * width). Height is derived from the tile source aspect ratio.
   */
  width?: number;
  /**
   * Explicit height in viewport coordinates. When omitted, OSD calculates height
   * from the tile source aspect ratio and the given width.
   */
  height?: number;
  /**
   * Fits the image into this rectangle in viewport coordinates, overriding
   * x/y/width/height. Useful for constrained layouts.
   */
  fitBounds?: Rect;
  /**
   * Opacity from 0 (transparent) to 1 (opaque).
   * Changes to this prop are applied imperatively via tiledImage.setOpacity()
   * without removing and re-adding the image. Safe for high-frequency updates
   * such as an opacity slider.
   */
  opacity?: number;
  /**
   * Insertion index in the OSD world, controlling render Z-order.
   * Lower indices are rendered first (appear behind higher indices).
   * When omitted, OSD appends at the end; Z-order therefore follows JSX
   * declaration order.
   */
  index?: number;
  /**
   * Called after the tile source is successfully added to the world.
   *
   * See https://openseadragon.github.io/docs/OpenSeadragon.TiledImage.html
   */
  onLoad?: (tiledImage: OsdTiledImage) => void;
  /** Called if addTiledImage fails. */
  onError?: (error: Error) => void;
}

/**
 * Declarative wrapper for an OSD TiledImage. Calls viewer.addTiledImage() on
 * mount and viewer.world.removeItem() on unmount.
 *
 * Registers the resulting TiledImage in WorldContext under imageKey, making it
 * accessible to useCoordinates(imageKey), useWorld().getByKey(imageKey), and
 * the world map in CanvasOverlay's onDraw.
 *
 * Must be rendered as a descendant of ViewerProvider.
 *
 * Opacity changes are applied imperatively without re-adding the image.
 * All other prop changes cause the image to be removed and re-added.
 *
 * @example
 * <TiledImage imageKey="primary" tileSource={primaryTileSource} />
 *
 * @example
 * // Two images stacked vertically with a 5% gap
 * <TiledImage imageKey="image1" tileSource={source1} x={0} y={0} width={1} />
 * <TiledImage imageKey="image2" tileSource={source2} x={0} y={1.05} width={1} />
 */
export function TiledImage({
  imageKey,
  tileSource,
  x,
  y,
  width,
  height,
  fitBounds,
  opacity,
  index,
  onLoad,
  onError,
}: TiledImageProps) {
  const { viewer, _register, _unregister } = useViewerContext();

  const tiledImageRef = useRef<OsdTiledImage | null>(null);

  // Keep callbacks in refs so we can read latest values without re-adding image.
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  onLoadRef.current = onLoad;
  onErrorRef.current = onError;

  // Opacity changes are applied imperatively; they do not re-add the image.
  useEffect(() => {
    if (opacity !== undefined && tiledImageRef.current) {
      tiledImageRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  // Main effect: add image on mount, remove on unmount or when key deps change.
  useEffect(() => {
    if (!viewer) return;

    let cancelled = false;

    viewer.addTiledImage({
      tileSource,
      x,
      y,
      width,
      height,
      fitBounds,
      opacity,
      index,
      // @types/openseadragon types success as (event: Event) => void but the
      // actual OSD callback receives { item: TiledImage }.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      success: (event: any) => {
        const item = (event as { item: OsdTiledImage }).item;
        if (cancelled) {
          // Component unmounted before the async add completed; clean up immediately.
          viewer.world.removeItem(item);
          return;
        }
        tiledImageRef.current = item;
        _register({ key: imageKey, tiledImage: item });
        onLoadRef.current?.(item);
      },
      // @types/openseadragon types error as (error: Error) => void but the
      // actual OSD callback receives { message: string, source: string }.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: (event: any) => {
        if (!cancelled) {
          const msg = (event as { message?: string }).message;
          onErrorRef.current?.(new Error(msg ?? 'Failed to add tiled image'));
        }
      },
    });

    return () => {
      cancelled = true;
      if (tiledImageRef.current) {
        viewer.world.removeItem(tiledImageRef.current);
        _unregister(imageKey);
        tiledImageRef.current = null;
      }
    };
    // opacity is intentionally excluded: changes are handled by the separate effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, imageKey, tileSource, x, y, width, height, fitBounds, index, _register, _unregister]);

  return null;
}
