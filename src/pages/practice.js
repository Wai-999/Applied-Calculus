import {QUESTION_COUNT,lessons} from '../../data.js';
import {dueQuestions} from '../../store.js';
import {state,mastered} from '../core/session.js';
import {shell} from '../ui/shell.js';
import {icon,primaryLink,sectionHead} from '../ui/shared.js';
import {questionForm} from '../ui/questions.js';
let practiceQueue=[],practiceIndex=0,sessionCorrect=0,sessionAnswered=0,activeSession=false;
export function resetPractice(){activeSession=false;}
export function nextQuestion(){practiceIndex++;}
export function registerSessionAnswer(independent){sessionAnswered++;if(independent)sessionCorrect++;}
function startSession(mode,section) {
  practiceIndex=0;sessionAnswered=0;sessionCorrect=0;activeSession=true;
  const all=lessons.flatMap(l=>l.questions.map((q,i)=>({...q,lesson:l,key:`${l.id}-${i}`})));
  if(mode==='review'){practiceQueue=dueQuestions(state,lessons).slice(0,6);}else if(section){practiceQueue=all.filter(q=>q.lesson.id===section);}else{const recent=lessons.filter(l=>state.completed.includes(l.id));const source=recent.length?all.filter(q=>recent.includes(q.lesson)):all.filter(q=>q.lesson.id===state.lastLesson);practiceQueue=[...source].sort((a,b)=>(state.attempts[a.key]?.mastered?1:0)-(state.attempts[b.key]?.mastered?1:0)||((state.attempts[a.key]?.last||0)-(state.attempts[b.key]?.last||0))).slice(0,6);}
}
export function practicePage(params) {
  const mode=params.get('mode')||'learn',section=params.get('section');
  if(!activeSession)startSession(mode,section);
  const done=practiceIndex>=practiceQueue.length;
  const current=practiceQueue[practiceIndex];
  let panel;
  if(done){panel=`<section class="session-finish"><span class="round-icon">${icon(practiceQueue.length?'check':'spark')}</span><h2>${practiceQueue.length?'A little stronger than before.':mode==='review'?'You’re up to date.':'Start with a lesson.'}</h2><p>${practiceQueue.length?`${sessionCorrect} of ${sessionAnswered} questions solved independently this session. Review intervals grow as you answer independently: 3, 7, 14, 30 and 60 days.`:mode==='review'?'No questions are due. Missed or assisted questions appear here immediately; independently solved questions return on an adaptive schedule.':'Complete a lesson or choose a section below to begin.'}</p><div class="button-row">${primaryLink('/learn','Explore the learning path')}<button class="button secondary" data-restart>Start a new session</button></div></section>`;}
  else panel=`<div class="practice-progress"><span>QUESTION ${practiceIndex+1} OF ${practiceQueue.length}</span><span>${sessionCorrect} independent answers</span></div><div class="progress-track"><span style="width:${practiceIndex/practiceQueue.length*100}%"></span></div><a class="practice-lesson-link" href="#/lesson/${current.lesson.id}">${icon('book')} ${current.lesson.id} · ${current.lesson.title}</a>${questionForm(current,current.key)}<button class="button secondary next-question" data-next hidden>Next question ${icon('arrow')}</button>`;
  return shell(`${sectionHead('MAKE IT STICK','A little practice, a lasting connection.','Use what you know. Get clear feedback. Revisit the ideas that need another look.')}<div class="practice-layout"><section class="practice-panel"><div class="tab-row"><a href="#/practice" class="${mode!=='review'?'selected':''}" ${mode!=='review'?'aria-current="page"':''}>Focused practice</a><a href="#/practice?mode=review" class="${mode==='review'?'selected':''}">Review due <span>${dueQuestions(state,lessons).length}</span></a></div>${panel}</section><aside class="practice-aside"><div class="path-card"><p class="eyebrow">PICK A FOCUS</p><h2>Practise a specific section.</h2><label for="practice-section">Book section</label><select id="practice-section">${lessons.map(l=>`<option value="${l.id}" ${l.id===(section||state.lastLesson)?'selected':''}>${l.id} · ${l.title}</option>`).join('')}</select><button class="button primary full" data-focus-practice>Practise this section ${icon('arrow')}</button></div><div class="model-note"><strong>How review works</strong><p>A correct answer without help marks a question mastered. An incorrect or assisted answer stays in your review list. Independent successes extend review intervals from 3 to 7, 14, 30 and 60 days. Progress is saved on this browser.</p></div><div class="practice-total"><strong>${mastered()}</strong><span>of ${QUESTION_COUNT} questions mastered</span></div></aside></div>`,'Practice & review','practice');
}
