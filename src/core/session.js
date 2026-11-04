import { loadState, STORAGE_KEY } from '../../store.js';
import { lessons } from '../../data.js';

const defaultStudio = () => ({ schema: 2, theme: 'light', textSize: 'comfortable', focus: false, goal: 20, concepts: {}, reading: {}, confidence: {}, experiments: {}, events: [] });
export let state = loadState(localStorage);
export function normalizeStudio(value) {
  const base = defaultStudio();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  for (const key of ['concepts', 'reading', 'confidence', 'experiments']) {
    if (value[key] && typeof value[key] === 'object' && !Array.isArray(value[key])) base[key] = value[key];
  }
  base.theme = value.theme === 'dark' ? 'dark' : 'light';
  base.textSize = value.textSize === 'large' ? 'large' : 'comfortable';
  base.focus = value.focus === true;
  base.goal = [10, 20, 30, 45].includes(value.goal) ? value.goal : 20;
  base.events = Array.isArray(value.events) ? value.events.filter(e => e && typeof e.lesson === 'string' && Number.isFinite(e.at)).slice(-500) : [];
  return base;
}
state.studio = normalizeStudio(state.studio);
export function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { document.dispatchEvent(new CustomEvent('studio:notice', { detail: 'Storage is full or unavailable. Export your notes and progress to keep them.' })); }
}
export function replaceState(value) { state = value; state.studio = normalizeStudio(value.studio); save(); }
export function touch(lesson, kind = 'study') {
  const day = new Date().toLocaleDateString('en-CA');
  if (!state.activeDays.includes(day)) state.activeDays.push(day);
  if (lesson) state.studio.events.push({ lesson, kind, at: Date.now() });
  state.studio.events = state.studio.events.slice(-500);
}
export const mastered = () => Object.values(state.attempts).filter(a => a.mastered).length;
export const progress = () => Math.round(state.completed.filter(id => lessons.some(l => l.id === id)).length / lessons.length * 100);
export function lessonMastery(id) {
  const numeric = [0, 1, 2, 3].filter(i => state.attempts[`${id}-${i}`]?.mastered).length;
  return (numeric + (state.studio.concepts[id]?.independent ? 1 : 0)) * 20;
}
export function applyPreferences() {
  document.documentElement.dataset.theme = state.studio.theme;
  document.documentElement.dataset.text = state.studio.textSize;
  document.body.classList.toggle('focus-mode', state.studio.focus && document.body.dataset.page==='lesson');
}
