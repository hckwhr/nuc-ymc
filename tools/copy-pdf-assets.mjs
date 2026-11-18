import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const root = dirname(require.resolve('pdfjs-dist/package.json'));
const { version } = require('pdfjs-dist/package.json');
const target = new URL(`../public/pdfjs/${version}/`, import.meta.url);
mkdirSync(target, { recursive: true });
for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  const destination = new URL(`${folder}/`, target);
  mkdirSync(destination, { recursive: true });
  for (const file of readdirSync(join(root, folder))) {
    copyFileSync(join(root, folder, file), new URL(file, destination));
  }
}
