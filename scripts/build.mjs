import { cp, mkdir, rm } from 'node:fs/promises';
import { prepareVendor } from './vendor.mjs';
await prepareVendor();
const root = new URL('../', import.meta.url);
await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/', root), { recursive: true });
for (const file of ['index.html', 'styles.css', 'studio.css', 'app.js', 'data.js', 'math.js', 'store.js', 'labs.js', 'assets', 'src', 'vendor']) {
  await cp(new URL(file, root), new URL(`dist/${file}`, root), { recursive: true });
}
console.log('Built static site in dist/');
