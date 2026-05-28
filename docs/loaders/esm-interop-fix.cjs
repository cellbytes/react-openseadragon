// Patches @docusaurus/core's ComponentCreator.js to skip non-writable keys
// when merging non-`default` module exports onto a chunk. Without this,
// chunks whose default export is a *function* (the pattern used by
// docusaurus-plugin-typedoc-api's `ApiPage`, `ApiItem`, etc.) crash at
// render time: webpack's CJS-to-ESM interop spreads the function's own
// `length` / `name` / `prototype` properties onto the import namespace,
// and Docusaurus tries to copy `length` back onto the function, which
// is non-writable on a Function instance.
//
// We change the filter callback to also reject keys whose target
// descriptor is non-writable. This is a no-op for normal modules
// (regular object properties stay writable).
module.exports = function patchComponentCreator(source) {
  return source.replace(
    /Object\.keys\(loadedModule\)\s*\.filter\(\(k\) => k !== 'default'\)/,
    `Object.keys(loadedModule)
      .filter((k) => {
        if (k === 'default') return false;
        const desc = Object.getOwnPropertyDescriptor(chunk, k);
        return !desc || desc.writable !== false;
      })`
  );
};
