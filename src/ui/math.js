import katex from '../../vendor/katex.js';
import { esc } from './shared.js';
const cache = new Map();
export function math(tex, display = true) {
  const key = `${display}:${tex}`;
  if (!cache.has(key)) cache.set(key, katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false, strict: 'warn', output: 'htmlAndMathml' }));
  return `<span class="typeset ${display ? 'display-math' : 'inline-math'}" data-equation="${esc(tex)}">${cache.get(key)}</span>`;
}
