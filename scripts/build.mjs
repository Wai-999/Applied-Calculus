import { cp, mkdir, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await rm(new URL('dist/', root), { recursive: true, force: true });
await mkdir(new URL('dist/', root), { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'data.js', 'math.js', 'store.js', 'labs.js', 'assets']) {
  await cp(new URL(file, root), new URL(`dist/${file}`, root), { recursive: true });
}
console.log('Built static site in dist/');
