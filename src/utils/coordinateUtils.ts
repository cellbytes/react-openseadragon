import OpenSeadragon from 'openseadragon';

/** An object with x, y, width, height fields. */
export interface Rectable {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Converts a plain object with x, y, width, height into an OpenSeadragon Rect.
 * Useful when building rect arguments for OSD APIs from plain data objects.
 */
export function toRect<T extends Rectable>(obj: T): OpenSeadragon.Rect {
  return new OpenSeadragon.Rect(obj.x, obj.y, obj.width, obj.height);
}
