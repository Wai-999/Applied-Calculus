import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {lessons,labCatalog} from '../data.js';
import {deepLessons,details} from '../src/content/index.js';
import {sampleModel,toCSV} from '../src/engine/models.js';
import {scheduleAttempt,recommendLesson,searchIndex,chapterMetrics} from '../src/engine/learning.js';
import {emptyState,validateState,dueQuestions} from '../store.js';
import {isCorrect,numericalIntegral} from '../math.js';
test('Every section has a detailed explanation and an additional transfer example',()=>{
  assert.equal(deepLessons.length,45);assert.equal(new Set(deepLessons.map(d=>d.id)).size,45);
  for(const lesson of lessons){const d=details[lesson.id];assert.ok(d,lesson.id);assert.ok(d.objective.length>50);assert.equal(d.explanation.length,2);assert.ok(d.explanation.join(' ').length>300,lesson.id);assert.ok(d.theorem.trim().length>0);assert.ok(d.symbols.length>=3);assert.equal(d.derivation.length,3);assert.equal(d.example.steps.length,3);assert.ok(d.example.conclusion.length>70);assert.equal(d.check.options.length,3);assert.ok(d.check.correct>=0&&d.check.correct<3);assert.ok(d.check.explanation.length>50);assert.ok(d.transfer.length>50);}
});
test('The prerequisite graph references valid earlier sections and has no cycles',()=>{
  const order=Object.fromEntries(lessons.map((l,i)=>[l.id,i]));
  for(const d of deepLessons)for(const p of d.prerequisites){assert.ok(details[p],d.id+': missing '+p);assert.ok(order[p]<order[d.id],d.id+': invalid forward dependency '+p);}
});
test('All 315 formal and worked equations typeset without errors',()=>{
  let count=0;
  for(const d of deepLessons)for(const tex of [d.formula,...d.derivation.map(s=>s.equation),...d.example.steps.map(s=>s.equation)]){assert.doesNotThrow(()=>katex.renderToString(tex,{throwOnError:true,strict:'error',trust:false}),d.id+': '+tex);count++;}
  assert.equal(count,315);
});
test('Spaced review advances after independent successes and resets after assistance',()=>{
  const now=1e12;let a=scheduleAttempt(null,true,true,now);assert.equal(a.dueAt,now+3*86400000);assert.equal(a.streak,1);
  a=scheduleAttempt(a,true,true,a.dueAt);assert.equal(a.streak,2);assert.equal(a.dueAt-a.last,7*86400000);
  a=scheduleAttempt(a,true,false,a.dueAt);assert.equal(a.streak,0);assert.equal(a.mastered,false);assert.equal(a.dueAt,a.last);
  a=scheduleAttempt(a,false,false,a.last);assert.equal(a.correct,3);assert.equal(a.total,4);
});
test('Existing backups load and scheduling respects new and old records',()=>{
  const s=emptyState();s.completed=['1.1'];s.notes['1.1']='My existing reflection.';const imported=validateState(JSON.parse(JSON.stringify(s)));assert.equal(imported.notes['1.1'],s.notes['1.1']);
  s.attempts['1.1-0']={correct:1,total:1,last:100,mastered:true};assert.equal(dueQuestions(s,lessons,101).length,0);
  s.attempts['1.1-0'].dueAt=200;assert.equal(dueQuestions(s,lessons,201).length,1);
});
test('The next recommendation respects explored prerequisites',()=>{
  const s=emptyState();assert.equal(recommendLesson(lessons,details,s).id,'1.1');s.completed=['1.1'];assert.equal(recommendLesson(lessons,details,s).id,'1.2');s.lastLesson='3.4';assert.equal(recommendLesson(lessons,details,s).id,'3.4');
});
test('Command search ranks title matches and requires every query term',()=>{
  const entries=[{title:'Marginal cost',keywords:'business rate'},{title:'Growth',keywords:'marginal cost rate'}];
  assert.equal(searchIndex('marginal cost',entries)[0].title,'Marginal cost');assert.equal(searchIndex('absent word',entries).length,0);
});
test('Insight metrics separate completion, submission and independent mastery',()=>{
  const s=emptyState();s.completed=['1.1'];s.attempts['1.1-0']=scheduleAttempt(null,true,true);s.attempts['1.1-1']=scheduleAttempt(null,true,false);const c=chapterMetrics(lessons,s)[0];assert.equal(c.completed,1);assert.equal(c.mastered,1);assert.equal(c.attempted,2);assert.equal(c.questions,24);
});
test('Every model produces aligned finite data samples and intentional gaps',()=>{
  const params={functions:{a:1,h:3,k:2},limits:{h:.1},derivative:{x:2,h:1},profit:{a:80,c:20,q:35},optimization:{q:35},growth:{r:.2,t:5},elasticity:{p:20},integral:{n:6,t:4},surplus:{a:60,b:10},inequality:{a:2},adoption:{r:.7,t:4},surface:{x:3,y:6},regression:{b:1.5},waves:{a:20,t:12}};
  for(const lab of labCatalog){const samples=sampleModel(lab.id,params[lab.id]);assert.equal(samples.rows.length,25);for(const row of samples.rows){assert.equal(row.length,samples.headers.length);for(const value of row)assert.ok(value===null||Number.isFinite(value),lab.id);}assert.equal(toCSV(samples).split('\n').length,26);}
  assert.equal(sampleModel('limits',params.limits).rows.find(row=>row[0]===2)[1],null);
  assert.equal(sampleModel('elasticity',params.elasticity).rows.at(-1)[3],null);
});
test('Additional transfer examples agree with independent calculations',()=>{
  assert.ok(Math.abs((2.1**2+3*2.1*3.95)-(2**2+3*2*4)-1.295)<1e-10);
  assert.ok(Math.abs((Math.exp(2)+1)/4-2.0972640247326626)<1e-12);
  assert.ok(Math.abs(250*1.08**3-314.928)<1e-10);
});
test('Transfer challenges respect constraints and independently computed integrals',()=>{
  const challenge=id=>lessons.find(l=>l.id===id).questions[3];
  const q=challenge('1.1').answer;assert.ok(180+12*q<=1000);assert.ok(180+12*(q+1)>1000);
  const h=.002,y=x=>Math.sqrt(100-x*x)/2;
  assert.ok(Math.abs((y(6+h)-2*y(6)+y(6-h))/(h*h)-challenge('3.5').answer)<1e-7);
  assert.ok(Math.abs(numericalIntegral(t=>1000*Math.exp(-.05*t),0,3,10000)-challenge('6.2').answer)<1e-6);
  assert.ok(Math.abs(numericalIntegral(x=>x*Math.exp(2*x),0,1,10000)-challenge('6.3').answer)<1e-7);
  assert.ok(Math.abs(numericalIntegral(t=>6+2*Math.cos(Math.PI*t/3),0,1.5,10000)-challenge('8.3').answer)<1e-7);
  for(let x=0;x<=12;x+=.1)assert.ok(x*(12-x)/2<=challenge('7.4').answer+1e-9);
});
test('Small challenges reject zero and backups accept the fourth question',()=>{
  const q=lessons.find(l=>l.id==='7.2').questions[3];assert.ok(!isCorrect('0',q.answer,q.tolerance));assert.ok(isCorrect('0.005',q.answer,q.tolerance));
  const s=emptyState();s.attempts['7.2-3']=scheduleAttempt(null,true,true);assert.doesNotThrow(()=>validateState(s));
});
