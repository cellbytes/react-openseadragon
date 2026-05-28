import { createInstancePlugin, createPrototypePlugin } from '@cellbytes/react-openseadragon';

// Importing the library above exposes OpenSeadragon on globalThis as a side
// effect, which is what this script needs.
import './openseadragon-scalebar.js';

const prototype = createPrototypePlugin('openseadragon-scalebar', () => {
  // The IIFE in openseadragon-scalebar.js already attached scalebar() to
  // OpenSeadragon.Viewer.prototype when the side-effect import ran.
});

export function scalebarPlugin(options: any) {
  return [
    prototype,
    createInstancePlugin('openseadragon-scalebar-config', (viewer: any) => {
      viewer.scalebar(options);
    }),
  ];
}
