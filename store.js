export const STORAGE_KEY = 'applied-studio-v1';
export const emptyState = () => ({ version: 1, completed: [], attempts: {}, notes: {}, bookmarks: [], lastLesson: '1.1', activeDays: [], diagnostic: null });
export function validateState(data) {
  const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const section = v => { if (typeof v !== 'string' || !/^[1-8]\.[1-7]$/.test(v)) return false; const [c,s] = v.split('.').map(Number); return s <= [6,7,7,6,5,4,7,3][c-1]; };
  if (!object(data) || data.version !== 1 || !Array.isArray(data.completed) || !Array.isArray(data.bookmarks) || !Array.isArray(data.activeDays) || !object(data.attempts) || !object(data.notes)) throw new Error('This is not an Applied progress file.');
  if ([...data.completed, ...data.bookmarks].some(x => !section(x)) || data.activeDays.some(x => typeof x !== 'string')) throw new Error('Invalid progress lists.');
  if (data.lastLesson !== undefined && !section(data.lastLesson)) throw new Error('Invalid last lesson.');
  if (data.diagnostic != null && (!object(data.diagnostic) || !Number.isInteger(data.diagnostic.score) || data.diagnostic.score < 0 || data.diagnostic.score > 5 || !Number.isFinite(data.diagnostic.date))) throw new Error('Invalid readiness check.');
  if (Object.values(data.notes).some(x => typeof x !== 'string')) throw new Error('Invalid notes.');
  const attempts = {};
  for (const [key,a] of Object.entries(data.attempts)) {
    if (!section(key.split('-')[0]) || !/^[1-8]\.[1-7]-[0-3]$/.test(key)) throw new Error('Invalid practice question.');
    if (!a || !Number.isInteger(a.correct) || !Number.isInteger(a.total) || a.correct < 0 || a.total < a.correct || !Number.isFinite(a.last) || typeof a.mastered !== 'boolean') throw new Error('Invalid practice records.');
    const record = { ...a };
    if (record.dueAt !== undefined && !Number.isFinite(record.dueAt)) delete record.dueAt;
    if (record.streak !== undefined && (!Number.isInteger(record.streak) || record.streak < 0)) delete record.streak;
    attempts[key] = record;
  }
  return { ...emptyState(), ...data, attempts, completed: [...new Set(data.completed)], bookmarks: [...new Set(data.bookmarks)], activeDays: [...new Set(data.activeDays)] };
}
export function loadState(storage) {
  try { const raw = storage.getItem(STORAGE_KEY); return raw ? validateState(JSON.parse(raw)) : emptyState(); }
  catch { return emptyState(); }
}
export function dueQuestions(state, lessons, now = Date.now()) {
  const all = lessons.flatMap(l => l.questions.map((q, i) => ({ ...q, key: `${l.id}-${i}`, lesson: l })));
  return all.filter(q => { const a = state.attempts[q.key]; return a && (!a.mastered || now >= (a.dueAt ?? a.last + 3 * 86400000)); }).sort((a, b) => (state.attempts[a.key].last - state.attempts[b.key].last));
}
