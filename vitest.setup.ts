// Browser-mode test setup. Runs once per test file in the page context, before
// any test code. Currently used to drop noisy OpenSeadragon tile-lifecycle
// warnings before they reach the test reporter.
//
// OSD calls `console.warn('Ignoring tile', tile)` (and similar) when a tile
// resolves after its TiledImage has been reset or removed. This is correct
// behavior -- TiledImage cleanly cancels in-flight tiles on unmount and on
// tileSource change -- but each call dumps the entire tile object, which back-
// references the viewer/world (circular), so the test reporter renders ~40 KB
// of JSON per warning. They are non-deterministic (race-dependent) and add
// hundreds of KB of noise to CI logs without signaling anything actionable.

const ignoredWarningSubstrings = ['Ignoring tile', 'loaded before reset', 'failed to load'];

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string' && ignoredWarningSubstrings.some((s) => first.includes(s))) {
    return;
  }
  originalWarn(...args);
};
