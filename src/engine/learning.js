export function scheduleAttempt(previous, correct, independent, now = Date.now()) {
  const mastered = correct && independent;
  const streak = mastered ? (previous?.streak || 0) + 1 : 0;
  const intervals = [3, 7, 14, 30, 60];
  return {
    correct: (previous?.correct || 0) + (correct ? 1 : 0),
    total: (previous?.total || 0) + 1,
    last: now,
    mastered,
    streak,
    dueAt: mastered ? now + intervals[Math.min(streak - 1, intervals.length - 1)] * 86400000 : now,
  };
}
export function recommendLesson(lessons, details, state) {
  const last = lessons.find(l => l.id === state.lastLesson);
  if (last && !state.completed.includes(last.id)) return last;
  return lessons.find(l => !state.completed.includes(l.id) && (details[l.id]?.prerequisites || []).every(id => state.completed.includes(id))) || lessons.find(l => !state.completed.includes(l.id)) || lessons[0];
}
export function searchIndex(query, entries) {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return entries.slice(0, 10);
  return entries.map(entry => {
    const title = entry.title.toLocaleLowerCase();
    const text = `${entry.title} ${entry.keywords || ''}`.toLocaleLowerCase();
    const score = terms.every(t => text.includes(t)) ? terms.reduce((sum, t) => sum + (title.includes(t) ? 5 : 1), 0) : 0;
    return { ...entry, score };
  }).filter(e => e.score > 0).sort((a, b) => b.score - a.score).slice(0, 16);
}
export function chapterMetrics(lessons, state) {
  return Array.from({ length: 8 }, (_, i) => {
    const list = lessons.filter(l => l.id.startsWith(`${i + 1}.`));
    const numeric = list.flatMap(l => l.questions.map((_, j) => state.attempts[`${l.id}-${j}`]));
    return { chapter: i + 1, total: list.length, completed: list.filter(l => state.completed.includes(l.id)).length, mastered: numeric.filter(a => a?.mastered).length, questions: list.reduce((sum,l)=>sum+l.questions.length,0), attempted: numeric.filter(Boolean).length };
  });
}
