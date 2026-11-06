import { diagnostic } from '../../data.js';
import { fmt, parseAnswer, isCorrect } from '../../math.js';
import { state, save, touch } from '../core/session.js';
import { scheduleAttempt } from '../engine/learning.js';
import { icon, esc, lessonFor } from './shared.js';
export const diagnosticResults = new Map();
export function questionForm(q, key, i = 0) {
  return `<form class="question-card ${q.stage?'challenge-card':''}" data-question="${key}"><div class="question-heading"><span class="eyebrow">${q.stage ? esc(q.stage) : i ? `QUESTION ${i}` : 'YOUR TURN'}</span><span class="question-status">${state.attempts[key]?.mastered ? '✓ Independently solved' : ''}</span></div><h3>${esc(q.prompt)}</h3><label class="answer-label" for="answer-${key}">Your answer${q.unit ? ` (${q.unit})` : ''}</label><small class="answer-tolerance">Accepted absolute error: ±${q.tolerance ?? 0.01}</small><div class="answer-row"><input class="answer-input" id="answer-${key}" name="answer" type="text" inputmode="decimal" placeholder="Number or fraction" autocomplete="off" required><button class="button primary" type="submit">Check answer ${icon('check')}</button></div><div class="question-tools"><button class="text-button" type="button" data-hint>Need a hint?</button><button class="text-button" type="button" data-solution>See the reasoning</button></div><div class="question-feedback" aria-live="polite"></div></form>`;
}
export function bindQuestions(root, onAnswer = () => {}) {
  root.querySelectorAll('[data-question]').forEach(form => {
    const key = form.dataset.question;
    const [id, index] = key.split('-');
    const q = id === 'diagnostic' ? diagnostic[Number(index)] : lessonFor(id)?.questions[Number(index)];
    if (!q) return;
    const input = form.querySelector('input'), feedback = form.querySelector('.question-feedback');
    let assisted = false, complete = false;
    function record(correct, independent) {
      if (id === 'diagnostic') diagnosticResults.set(key, { correct, independent });
      else { state.attempts[key] = scheduleAttempt(state.attempts[key], correct, independent); form.querySelector('.question-status').textContent=state.attempts[key].mastered?'✓ Independently solved':''; touch(id, 'practice'); save(); }
    }
    function finish(independent) { complete = true; input.readOnly = true; form.querySelector('[type=submit]').disabled = true; onAnswer(independent); }
    form.addEventListener('submit', e => {
      e.preventDefault(); if (complete) return;
      if (!Number.isFinite(parseAnswer(input.value))) { feedback.innerHTML = '<p class="feedback error">Use a number or fraction, such as 0.5 or 1/2.</p>'; return; }
      const correct = isCorrect(input.value, q.answer, q.tolerance ?? 0.01); record(correct, !assisted);
      form.dispatchEvent(new CustomEvent('studio:attempt',{bubbles:true,detail:{lesson:id,correct}}));
      if (correct) {
        feedback.innerHTML = `<div class="feedback success"><strong>${assisted ? 'Now explain why that works.' : 'Correct — and ready to revisit later.'}</strong><p>${esc(q.solution)}</p><small>${assisted ? 'Try independently in review to strengthen recall.' : 'Your next review adapts to your sequence of independent answers.'}</small></div>`;
        finish(!assisted);
      } else { assisted = true; feedback.innerHTML = `<div class="feedback error"><strong>Check your reasoning.</strong><p>${esc(q.hint)}</p><small>Check the operation, sign, domain and units. You can try again.</small></div>`; input.select(); }
    });
    form.querySelector('[data-hint]').addEventListener('click', () => { if (complete) return; assisted = true; feedback.innerHTML = `<div class="feedback hint"><strong>A hint</strong><p>${esc(q.hint)}</p></div>`; });
    form.querySelector('[data-solution]').addEventListener('click', () => { if (complete) return; assisted = true; record(false, false); feedback.innerHTML = `<div class="feedback hint"><strong>Follow the reasoning.</strong><p>${esc(q.solution)}</p><small>Target: ${fmt(q.answer, 4)} ${esc(q.unit)}. Revisit without help to master it.</small></div>`; finish(false); });
  });
}
