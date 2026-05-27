import type { OsdInstancePlugin, OsdPrototypePlugin } from './types';
import type { Viewer } from 'openseadragon';

/** Tracks which prototype plugins have already been applied, by name. */
const appliedPlugins = new Set<string>();

/**
 * Creates an OsdPrototypePlugin with automatic idempotency guarding.
 * The apply function runs at most once per plugin name per JS process.
 *
 * Use this to wrap any plain-JS OSD plugin. Most plugins are distributed as
 * a function that accepts the OSD namespace:
 *
 *   import myPlugin from './my-osd-plugin.js';
 *   export const myOsdPlugin = createPrototypePlugin('my-plugin', (OSD) => myPlugin(OSD));
 *
 * For plugins that self-execute as side-effects on import, import them once at
 * the app entry point before rendering any ViewerProvider, then create a no-op
 * shim so the plugin is registered in the appliedPlugins set:
 *
 *   import './self-executing-plugin.js'; // side effect
 *   export const myShim = createPrototypePlugin('my-plugin', () => {});
 */
export function createPrototypePlugin(
  name: string,
  apply: (OSD: typeof import('openseadragon')) => void
): OsdPrototypePlugin {
  return {
    kind: 'prototype',
    name,
    apply(OSD) {
      if (appliedPlugins.has(name)) return;
      apply(OSD);
      appliedPlugins.add(name);
    },
  };
}

/**
 * Creates an OsdInstancePlugin from init/destroy callbacks.
 * Prefer this over implementing OsdInstancePlugin directly for conciseness.
 */
export function createInstancePlugin(
  name: string,
  init: (viewer: Viewer) => void,
  destroy?: (viewer: Viewer) => void
): OsdInstancePlugin {
  return { kind: 'instance', name, init, destroy };
}
