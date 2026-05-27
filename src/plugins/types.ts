import type { Viewer } from 'openseadragon';

/**
 * A plugin that extends OpenSeadragon.Viewer.prototype with new methods,
 * applied once globally (e.g. canvas-overlay, svg-overlay, scalebar).
 *
 * Use createPrototypePlugin() to get automatic idempotency guarding.
 * The apply function may only run once per plugin name across the entire
 * page lifetime, even if multiple ViewerProvider instances exist.
 */
export interface OsdPrototypePlugin {
  kind: 'prototype';
  /** Unique name used as the idempotency guard key. */
  name: string;
  /** Receives the OpenSeadragon default export (constructor + namespace). */
  apply(OpenSeadragon: typeof import('openseadragon')): void;
}

/**
 * A plugin that runs per-viewer instance. Called after the Viewer is
 * constructed and before any tile sources are opened. Used for per-viewer
 * setup that cannot live on the prototype (e.g. image-job tracking).
 */
export interface OsdInstancePlugin {
  kind: 'instance';
  name: string;
  /** Called immediately after OpenSeadragon() constructs a new Viewer. */
  init(viewer: Viewer): void;
  /** Called immediately before viewer.destroy(). Use to clean up DOM or listeners. */
  destroy?(viewer: Viewer): void;
}

/** A plugin for use with ViewerProvider. */
export type OsdPlugin = OsdPrototypePlugin | OsdInstancePlugin;
