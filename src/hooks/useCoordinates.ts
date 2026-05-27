import { useMemo } from 'react';

import OpenSeadragon from 'openseadragon';

import { useViewerContext } from '../context/ViewerContext';

import type { Point, Rect, TiledImage } from 'openseadragon';

/**
 * Unified coordinate conversion adapter for a specific TiledImage or the viewport.
 *
 * When imageKey is provided, image-specific methods delegate to the corresponding
 * TiledImage coordinate methods:
 *   https://openseadragon.github.io/docs/OpenSeadragon.TiledImage.html
 *
 * Pixel/viewport conversion methods delegate to Viewport methods:
 *   https://openseadragon.github.io/docs/OpenSeadragon.Viewport.html
 *
 * All methods operate on values at the time they are called, not at the time
 * the adapter was created. The adapter itself is only re-created when the
 * underlying viewer or TiledImage reference changes.
 */
export interface CoordinateAdapter {
  /**
   * Converts image coordinates to viewport coordinates.
   * Delegates to TiledImage.imageToViewportCoordinates().
   * Throws if the adapter was created without an imageKey.
   *
   * @param x - X position in image coordinates (pixels from left edge of image).
   * @param y - Y position in image coordinates (pixels from top edge of image).
   */
  imageToViewport(x: number, y: number): Point;
  /**
   * Converts a viewport coordinate point to image coordinates.
   * Delegates to TiledImage.viewportToImageCoordinates().
   * Throws if the adapter was created without an imageKey.
   *
   * @param point - A point in viewport coordinates.
   */
  viewportToImage(point: Point): Point;
  /**
   * Converts an image coordinate rectangle to a viewport coordinate rectangle.
   * Delegates to TiledImage.imageToViewportRectangle().
   * Throws if the adapter was created without an imageKey.
   *
   * @param x - Left edge in image coordinates.
   * @param y - Top edge in image coordinates.
   * @param width - Width in image coordinate pixels.
   * @param height - Height in image coordinate pixels.
   */
  imageToViewportRect(x: number, y: number, width: number, height: number): Rect;
  /**
   * Converts a viewport coordinate rectangle to an image coordinate rectangle.
   * Delegates to TiledImage.viewportToImageRectangle().
   * Throws if the adapter was created without an imageKey.
   *
   * @param rect - A rectangle in viewport coordinates.
   */
  viewportToImageRect(rect: Rect): Rect;
  /**
   * Converts pixel coordinates (browser pixels relative to the viewer container)
   * to viewport coordinates.
   * Delegates to Viewport.pointFromPixel().
   *
   * @param point - A point in pixel coordinates.
   */
  pixelToViewport(point: Point): Point;
  /**
   * Converts viewport coordinates to pixel coordinates (browser pixels relative
   * to the viewer container).
   * Delegates to Viewport.pixelFromPoint().
   *
   * @param point - A point in viewport coordinates.
   */
  viewportToPixel(point: Point): Point;
  /**
   * Converts pixel coordinates (browser pixels relative to the viewer container)
   * to image coordinates.
   * Composed from pixelToViewport() and viewportToImage().
   * Throws if the adapter was created without an imageKey.
   *
   * @param point - A point in pixel coordinates.
   */
  pixelToImage(point: Point): Point;
  /**
   * The underlying TiledImage. Undefined when useCoordinates() was called without
   * an imageKey; in that case image-specific methods throw when called.
   */
  tiledImage: TiledImage | undefined;
  /**
   * Current zoom level from Viewport.getZoom().
   * Reflects the zoom at the time the adapter was last created (i.e. when the
   * viewer or TiledImage reference changed). For reactive zoom tracking, use
   * useViewerEvent('animation', handler) instead.
   */
  zoom: number;
}

function requireTiledImage(
  tiledImage: TiledImage | undefined,
  imageKey: string | undefined
): TiledImage {
  if (!tiledImage) {
    throw new Error(
      imageKey
        ? `useCoordinates: TiledImage with imageKey "${imageKey}" is not mounted.`
        : 'useCoordinates: image-specific methods require an imageKey.'
    );
  }
  return tiledImage;
}

/**
 * Returns a CoordinateAdapter for converting between image, viewport, and pixel
 * coordinate spaces.
 *
 * When imageKey is provided, the adapter includes image-specific conversions
 * (imageToViewport, viewportToImage, imageToViewportRect, viewportToImageRect,
 * pixelToImage). When omitted, only pixel/viewport conversions are available.
 *
 * The adapter is memoized and only re-created when the viewer or the TiledImage
 * reference changes.
 *
 * Throws if called outside a ViewerProvider, or if image-specific methods are
 * called and the imageKey is not currently mounted.
 *
 * @param imageKey - The imageKey prop of the TiledImage whose coordinate space
 *   to use. Omit for viewport-only conversions.
 *
 * @example
 * // Inside an overlay child component that draws in image pixels:
 * const coords = useCoordinates('primary');
 * const vp = coords.imageToViewport(shape.x, shape.y);
 *
 * @example
 * // Viewport/pixel conversion without a specific image:
 * const coords = useCoordinates();
 * const vp = coords.pixelToViewport(mousePoint);
 */
export function useCoordinates(imageKey?: string): CoordinateAdapter {
  const { viewer, worldItems } = useViewerContext();

  const tiledImage = imageKey ? worldItems.find((e) => e.key === imageKey)?.tiledImage : undefined;

  return useMemo(() => {
    const getViewport = () => {
      if (!viewer) throw new Error('useCoordinates: viewer is not yet initialized.');
      return viewer.viewport;
    };

    const getTiledImage = () => requireTiledImage(tiledImage, imageKey);

    return {
      imageToViewport(x: number, y: number): Point {
        return getTiledImage().imageToViewportCoordinates(x, y);
      },
      viewportToImage(point: Point): Point {
        return getTiledImage().viewportToImageCoordinates(point.x, point.y);
      },
      imageToViewportRect(x: number, y: number, width: number, height: number): Rect {
        return getTiledImage().imageToViewportRectangle(
          new OpenSeadragon.Rect(x, y, width, height)
        );
      },
      viewportToImageRect(rect: Rect): Rect {
        return getTiledImage().viewportToImageRectangle(rect);
      },
      pixelToViewport(point: Point): Point {
        return getViewport().pointFromPixel(point);
      },
      viewportToPixel(point: Point): Point {
        return getViewport().pixelFromPoint(point);
      },
      pixelToImage(point: Point): Point {
        const vp = getViewport().pointFromPixel(point);
        return getTiledImage().viewportToImageCoordinates(vp.x, vp.y);
      },
      tiledImage,
      zoom: viewer?.viewport.getZoom(true) ?? 1,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, tiledImage]);
}
