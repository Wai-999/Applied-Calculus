import {normalizeDigits} from './src/engine/text.js';
export const profit = (q, price = 80, cost = 20, fixed = 400, demand = 0.5) => (price - cost) * q - demand * q * q - fixed;
export const optimalQuantity = (price = 80, cost = 20, demand = 0.5) => Math.max(0, (price - cost) / (2 * demand));
export const population = (time, rate = 0.2, initial = 100) => initial * Math.exp(rate * time);
export const logistic = (time, rate = 0.7, capacity = 1000) => capacity / (1 + 19 * Math.exp(-rate * time));
export const elasticity = (p, intercept = 120, slope = 2) => slope * p / (intercept - slope * p);
export const flow = time => 2 * time + 4;
export const accumulated = time => time * time + 4 * time;
export const surface = (x, y) => 100 - (x - 5) ** 2 - 2 * (y - 4) ** 2;
export const numericalIntegral = (fn, a, b, n = 200) => {
  const h = (b - a) / n;
  let sum = (fn(a) + fn(b)) / 2;
  for (let i = 1; i < n; i++) sum += fn(a + i * h);
  return sum * h;
};
export function parseAnswer(input) {
  const value = normalizeDigits(input).trim().replaceAll(',', '');
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return Number(value);
  const fraction = value.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
  return fraction && Number(fraction[2]) !== 0 ? Number(fraction[1]) / Number(fraction[2]) : NaN;
}
export const isCorrect = (input, answer, tolerance = 0.01) => Number.isFinite(parseAnswer(input)) && Math.abs(parseAnswer(input) - answer) <= tolerance;
export const fmt = (n, digits = 1) => Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
