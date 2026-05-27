# Test fixtures

These files are test-only assets served at the site root by Vitest's browser
mode (Vite serves `public/` at `/`). They are not part of the published npm
package (`files` in `package.json` ships only `dist/`).

## `test.dzi` + `test_files/` and `test-image.jpg`

A Deep Zoom (DZI) tile pyramid and its single-image counterpart, used by the
browser tests to open a real OpenSeadragon viewer.

- `test.dzi` / `test_files/` - DZI descriptor and tile pyramid (256px tiles,
  1px overlap), consumed by the default OpenSeadragon DZI tile source.
- `test-image.jpg` - the same picture as a single image, consumed by the
  `{ type: 'image' }` simple tile source.

### Source and license

Derived from "A cat and dog" by Gottfried Mind / Joseph Brodtmann
(ca. 1820-60), lithograph.

- Source: Library of Congress, https://www.loc.gov/pictures/item/2012645549/
- Rights: Public domain ("no known restrictions"); also catalogued at
  https://pdimagearchive.org/images/c791e9bc-1bae-48af-993e-7dc6e943d1bb/

The original was downscaled to 1536px on the long edge and tiled into the DZI
pyramid. As a public-domain work it carries no usage restrictions.
