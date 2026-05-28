import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../node_modules/openseadragon/build/openseadragon/images');
const dest = resolve(here, '../static/openseadragon-images');

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log(`Copied OpenSeadragon UI icons to ${dest}`);
