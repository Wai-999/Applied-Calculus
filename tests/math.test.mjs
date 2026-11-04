import test from 'node:test';
import assert from 'node:assert/strict';
import { profit, optimalQuantity, population, logistic, elasticity, flow, accumulated, surface, numericalIntegral, parseAnswer, isCorrect } from '../math.js';
import { lessons, chapters, areas, labCatalog, book } from '../data.js';
import { emptyState, validateState, dueQuestions, loadState } from '../store.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);
test('The curriculum covers all 45 sections of the eight chapters',()=>{
  const counts=[6,7,7,6,5,4,7,3];
  assert.equal(lessons.length,45);assert.equal(chapters.length,8);assert.equal(new Set(lessons.map(l=>l.id)).size,45);
  for(let c=1;c<=8;c++){assert.equal(lessons.filter(l=>l.id.startsWith(c+'.')).length,counts[c-1]);for(let s=1;s<=counts[c-1];s++)assert.ok(lessons.some(l=>l.id===`${c}.${s}`));}
  assert.equal(lessons.flatMap(l=>l.questions).length,180);
  for(const l of lessons){assert.ok(labCatalog.some(x=>x.id===l.lab));assert.ok(areas.some(a=>a.id===l.area));assert.equal(l.steps.length,3);assert.equal(l.questions.length,4);assert.ok(l.page>0);for(const q of l.questions){assert.ok(Number.isFinite(q.answer));assert.ok(q.hint&&q.solution&&q.prompt);assert.ok(isCorrect(String(q.answer),q.answer));}}
  for(const a of areas)for(const id of a.lessons)assert.ok(lessons.some(l=>l.id===id));
});
test('Printed page references map correctly to the supplied PDF',()=>{assert.equal(book.pageOffset+3,23);assert.equal(book.pageOffset+226,246);assert.equal(book.pageOffset+382,402);});
test('Profit optimum is feasible and beats surrounding quantities and endpoints',()=>{
  for(const a of [40,60,80,100])for(const c of [5,20,35]){const best=optimalQuantity(a,c);assert.ok(best>=0&&best<=120);assert.ok(profit(best,a,c)>=profit(0,a,c));assert.ok(profit(best,a,c)>=profit(120,a,c));assert.ok(profit(best,a,c)>profit(best+1,a,c));}
  assert.equal(optimalQuantity(),60);assert.equal(profit(60),1400);
});
test('Marginal profit matches the numerical derivative',()=>{const h=1e-4;for(const q of [0,30,60,100])near((profit(q+h)-profit(q-h))/(2*h),60-q,1e-6);});
test('Continuous growth, doubling and half-life use consistent units',()=>{near(population(0),100);near(population(Math.log(2)/0.2),200);near(population(Math.log(2)/0.2,-0.2),50);near(population(5,0.2),100*Math.E);});
test('Logistic adoption begins at 50 and accelerates until half capacity',()=>{near(logistic(0),50);near(logistic(Math.log(19)/0.7),500);assert.ok(logistic(100)<1000.00001);const rate=t=>0.7*logistic(t)*(1-logistic(t)/1000);assert.ok(rate(4.206)>rate(1));assert.ok(rate(4.206)>rate(8));});
test('Elasticity correctly identifies the revenue turning point',()=>{near(elasticity(20),0.5);near(elasticity(30),1);near(elasticity(40),2);});
test('Accumulation is the integral of flow; more left rectangles reduce the error',()=>{let prior=Infinity;for(const n of [2,4,8,16,32]){const h=4/n;const sum=Array.from({length:n},(_,i)=>flow(i*h)*h).reduce((a,b)=>a+b);const error=accumulated(4)-sum;assert.ok(error>0&&error<prior);prior=error;}near(numericalIntegral(flow,0,4),32);});
test('Lorenz area and Gini relation agree numerically',()=>{for(const a of [1,2,3,5])near(2*numericalIntegral(x=>x-x**a,0,1,10000),1-2/(a+1),1e-7);});
test('Multivariable partials match finite differences',()=>{const h=1e-4;near((surface(3+h,6)-surface(3-h,6))/(2*h),4,1e-6);near((surface(3,6+h)-surface(3,6-h))/(2*h),-8,1e-6);assert.equal(surface(5,4),100);});
test('Practice accepts decimals, exponents and fractions without evaluating code',()=>{assert.equal(parseAnswer('1/6'),1/6);assert.equal(parseAnswer('1,400'),1400);assert.equal(parseAnswer('-2.5e-2'),-0.025);for(const bad of ['1/0','Infinity','NaN','','0x10','1+1','alert(1)'])assert.ok(Number.isNaN(parseAnswer(bad)));assert.ok(isCorrect('3.47',Math.log(2)/0.2));assert.ok(!isCorrect('3.4',Math.log(2)/0.2));});
test('Review prioritizes missed and assisted questions and waits 3 days for mastery',()=>{const s=emptyState(),now=Date.now();s.attempts['1.1-0']={correct:0,total:1,last:now-5000,mastered:false};s.attempts['1.1-1']={correct:1,total:1,last:now-1000,mastered:true};assert.deepEqual(dueQuestions(s,lessons,now).map(q=>q.key),['1.1-0']);assert.equal(dueQuestions(s,lessons,now+3*86400000).length,2);});
test('Backups preserve notes and attempts; corrupted records fail safely',()=>{const s=emptyState();s.notes['1.1']='Cost has a fixed part.';assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);assert.throws(()=>validateState({version:2}));const bad=emptyState();bad.attempts.x={correct:9,total:1,last:0,mastered:true};assert.throws(()=>validateState(bad));assert.deepEqual(loadState({getItem:()=>'{invalid'}),emptyState());assert.deepEqual(loadState({getItem:()=>{throw new Error('blocked');}}),emptyState());});
test('Selected worked answers are independently checked by quadrature',()=>{
  const get=(id,i)=>lessons.find(l=>l.id===id).questions[i].answer;
  near(get('5.2',0),numericalIntegral(x=>2*x*(x*x+1),0,1,10000),1e-7);
  near(get('6.3',0),numericalIntegral(x=>x*Math.exp(x),0,1,10000),1e-7);
  near(get('7.7',2),numericalIntegral(x=>x*x/2,0,1,10000),1e-7);
  near(get('7.6',2),numericalIntegral(y=>0.5+y,0,2),1e-7);
  near(get('8.3',0),numericalIntegral(Math.sin,0,Math.PI,10000),1e-7);
});
