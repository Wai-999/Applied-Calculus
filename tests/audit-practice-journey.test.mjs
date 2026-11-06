import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons,diagnostic} from '../data.js';
import {emptyState,dueQuestions} from '../store.js';

const persisted=new Map();
globalThis.localStorage={getItem:key=>persisted.get(key)||null,setItem:(key,value)=>persisted.set(key,value)};
globalThis.document={dispatchEvent(){}};
const session=await import('../src/core/session.js');
const practice=await import('../src/pages/practice.js');
const {bindQuestions,diagnosticResults}=await import('../src/ui/questions.js');
const params=new URLSearchParams({section:'1.1'});

class Element{
  constructor(){this.nodes=new Map();this.handlers=new Map();this.value='';this.disabled=false;this.readOnly=false;this.textContent='';this.innerHTML='';this.events=[];}
  addEventListener(type,handler){const handlers=this.handlers.get(type)||[];handlers.push(handler);this.handlers.set(type,handlers);}
  querySelector(selector){return this.nodes.get(selector)||null;}
  querySelectorAll(selector){const value=this.nodes.get(selector);return value?[value]:[];}
  fire(type){for(const handler of this.handlers.get(type)||[])handler({preventDefault(){},target:this,currentTarget:this});}
  dispatchEvent(event){this.events.push(event);return true;}
  select(){}
}
function question(key,onAnswer=()=>{}){
  const root=new Element(),form=new Element();form.dataset={question:key};
  for(const selector of ['input','.question-feedback','.question-status','[type=submit]','[data-hint]','[data-solution]'])form.nodes.set(selector,new Element());
  root.nodes.set('[data-question]',form);bindQuestions(root,onAnswer);
  return {form,input:form.querySelector('input'),feedback:form.querySelector('.question-feedback'),submit(value){this.input.value=String(value);form.fire('submit');},hint(){form.querySelector('[data-hint]').fire('click');},solution(){form.querySelector('[data-solution]').fire('click');}};
}
function fresh(){session.replaceState(emptyState());practice.resetPractice();diagnosticResults.clear();}
function currentQuestion(html){return html.match(/data-question="([^"]+)"/)?.[1];}

test('A focused session counts independent success once and cannot skip an unanswered question on repeated Next',()=>{
  fresh();assert.equal(currentQuestion(practice.practicePage(params)),'1.1-0');
  practice.nextQuestion();assert.equal(currentQuestion(practice.practicePage(params)),'1.1-0');
  const q=question('1.1-0',practice.registerSessionAnswer);
  q.submit(lessons[0].questions[0].answer);q.submit(lessons[0].questions[0].answer);
  // Simulate the old visible Next button receiving two clicks before the async route mounts.
  practice.nextQuestion();practice.nextQuestion();
  const second=practice.practicePage(params);
  assert.equal(currentQuestion(second),'1.1-1');assert.match(second,/1 independent answers/);
  assert.equal(session.state.attempts['1.1-0'].total,1);
  assert.ok(!session.state.attempts['1.1-1']);
});

test('A complete mixed practice journey separates independent, corrected, hinted and revealed answers',()=>{
  fresh();practice.practicePage(params);
  const questions=lessons[0].questions;
  const independent=question('1.1-0',practice.registerSessionAnswer);
  independent.submit(questions[0].answer);practice.nextQuestion();practice.practicePage(params);
  const corrected=question('1.1-1',practice.registerSessionAnswer);
  corrected.submit(questions[1].answer+100);corrected.submit(questions[1].answer);practice.nextQuestion();practice.practicePage(params);
  const hinted=question('1.1-2',practice.registerSessionAnswer);
  hinted.hint();hinted.submit(questions[2].answer);practice.nextQuestion();practice.practicePage(params);
  const revealed=question('1.1-3',practice.registerSessionAnswer);
  revealed.solution();practice.nextQuestion();
  const summary=practice.practicePage(params);
  assert.match(summary,/1 of 4 questions solved independently this session/);
  assert.equal(session.state.attempts['1.1-0'].mastered,true);
  assert.equal(session.state.attempts['1.1-0'].dueAt-session.state.attempts['1.1-0'].last,3*86400000);
  assert.deepEqual(['1.1-1','1.1-2','1.1-3'].map(key=>session.state.attempts[key].mastered),[false,false,false]);
  assert.equal(session.state.attempts['1.1-1'].total,2);
  assert.equal(session.state.attempts['1.1-2'].correct,1);
  assert.equal(session.state.attempts['1.1-3'].correct,0);
  assert.deepEqual(dueQuestions(session.state,lessons).map(q=>q.key).sort(),['1.1-1','1.1-2','1.1-3']);
  // Stale completion callbacks cannot inflate the final score.
  practice.registerSessionAnswer(true);assert.match(practice.practicePage(params),/1 of 4 questions/);
});

test('Review snapshots only due questions and a restart has fresh counters',()=>{
  fresh();const now=Date.now();
  session.state.attempts['1.1-0']={correct:1,total:1,mastered:true,last:now,dueAt:now+86400000};
  session.state.attempts['1.1-1']={correct:0,total:1,mastered:false,last:now-10,dueAt:now-10};
  const review=new URLSearchParams({mode:'review'});
  assert.equal(currentQuestion(practice.practicePage(review)),'1.1-1');
  const due=question('1.1-1',practice.registerSessionAnswer);due.submit(lessons[0].questions[1].answer);practice.nextQuestion();
  assert.match(practice.practicePage(review),/1 of 1 questions solved independently/);
  practice.resetPractice();const restarted=practice.practicePage(review);
  assert.match(restarted,/You’re up to date/);assert.ok(!currentQuestion(restarted));
  practice.resetPractice();const focused=practice.practicePage(params);
  assert.match(focused,/0 independent answers/);assert.equal(currentQuestion(focused),'1.1-0');
});

test('Invalid numeric input neither creates an attempt nor makes a later independent answer assisted',()=>{
  fresh();const q=question('1.1-0');
  for(const value of ['not a number','1/0',''])q.submit(value);
  assert.ok(!session.state.attempts['1.1-0']);assert.equal(q.form.events.length,0);
  q.submit(lessons[0].questions[0].answer);
  assert.equal(session.state.attempts['1.1-0'].mastered,true);assert.equal(session.state.attempts['1.1-0'].total,1);
});

test('Revealing reasoning records assisted participation, emits evidence, and disables completed controls',()=>{
  fresh();const completions=[],q=question('1.1-0',independent=>completions.push(independent));
  q.solution();q.solution();q.submit(lessons[0].questions[0].answer);
  assert.deepEqual(completions,[false]);assert.equal(session.state.attempts['1.1-0'].total,1);assert.equal(session.state.attempts['1.1-0'].mastered,false);
  assert.equal(q.form.events.length,1);assert.equal(q.form.events[0].type,'studio:attempt');assert.equal(q.form.events[0].bubbles,true);
  assert.deepEqual(q.form.events[0].detail,{lesson:'1.1',correct:false});
  assert.equal(q.input.readOnly,true);
  for(const selector of ['[type=submit]','[data-hint]','[data-solution]'])assert.equal(q.form.querySelector(selector).disabled,true,selector);
});

test('Readiness answers stay outside mastery and distinguish help from independent answers',()=>{
  fresh();const first=question('diagnostic-0');first.hint();first.submit(diagnostic[0].answer);
  const second=question('diagnostic-1');second.submit(diagnostic[1].answer);
  assert.deepEqual(diagnosticResults.get('diagnostic-0'),{correct:true,independent:false});
  assert.deepEqual(diagnosticResults.get('diagnostic-1'),{correct:true,independent:true});
  assert.deepEqual(session.state.attempts,{});
});

test('Readiness feedback explains its starting-point role without promising spaced review',()=>{
  fresh();const independent=question('diagnostic-0');independent.submit(diagnostic[0].answer);
  assert.match(independent.feedback.innerHTML,/Correct — a useful foundation/);
  assert.match(independent.feedback.innerHTML,/readiness check records whether you answered without help/);
  assert.doesNotMatch(independent.feedback.innerHTML,/next review|in review|master it/);
  const assisted=question('diagnostic-1');assisted.hint();assisted.submit(diagnostic[1].answer);
  assert.doesNotMatch(assisted.feedback.innerHTML,/next review|in review|master it/);
  const revealed=question('diagnostic-2');revealed.solution();
  assert.doesNotMatch(revealed.feedback.innerHTML,/next review|in review|master it/);
  const lesson=question('1.1-0');lesson.submit(lessons[0].questions[0].answer);
  assert.match(lesson.feedback.innerHTML,/Your next review adapts/);
});
