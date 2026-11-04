import { cp, mkdir, rm } from 'node:fs/promises';
export async function prepareVendor() {
  const root = new URL('../', import.meta.url);
  await rm(new URL('vendor/', root), { recursive: true, force: true });
  await mkdir(new URL('vendor/', root), { recursive: true });
  for (const name of ['katex.mjs', 'katex.min.css', 'fonts']) await cp(new URL(`node_modules/katex/dist/${name}`, root), new URL(`vendor/${name === 'katex.mjs' ? 'katex.js' : name}`, root), { recursive: true });
  await cp(new URL('node_modules/katex/LICENSE',root),new URL('vendor/KATEX-LICENSE.txt',root));
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) await prepareVendor();
