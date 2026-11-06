import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lessons,diagnostic,book} from '../data.js';
import {emptyState,validateState,dueQuestions} from '../store.js';

// Exercise the production modules with controlled DOM and network boundaries.
// Deferred page modules make navigation races deterministic without a browser.
let moduleId=0;
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
async function isolatedModule(path,dependencies){
  let source=await readFile(new URL('../'+path,import.meta.url),'utf8');
  for(const [specifier,url] of Object.entries(dependencies)){
    source=source.replaceAll("'"+specifier+"'",JSON.stringify(url)).replaceAll('"'+specifier+'"',JSON.stringify(url));
  }
  return import(moduleURL(source+'\n// isolated '+(++moduleId)));
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function waitFor(check){for(let i=0;i<100;i++){if(check())return;await new Promise(setImmediate);}assert.fail('The expected asynchronous transition did not finish.');}
class Element {
  constructor(){this.handlers=new Map();this.nodes=new Map();this.dataset={};this.value='';this.hidden=false;this.textContent='';this.attributes={};this.classList={add(){},remove(){},toggle(){return false;},contains(){return false;}};}
  addEventListener(type,fn,{signal}={}){if(signal?.aborted)return;const handlers=this.handlers.get(type)||[];handlers.push(fn);this.handlers.set(type,handlers);signal?.addEventListener('abort',()=>{this.handlers.set(type,(this.handlers.get(type)||[]).filter(f=>f!==fn));},{once:true});}
  async fire(type,event={}){return Promise.all([...(this.handlers.get(type)||[])].map(fn=>fn({target:this,currentTarget:this,preventDefault(){},...event})));}
  querySelector(selector){return this.nodes.get(selector)||null;}
  querySelectorAll(selector){const value=this.nodes.get(selector);return value?(Array.isArray(value)?value:[value]):[];}
  setAttribute(name,value){this.attributes[name]=String(value);}
  insertAdjacentHTML(){}
  focus(){}
  select(){}
  scrollIntoView(){this.scrolled=true;}
  dispatchEvent(){return true;}
}
function environment(hash='#/learn'){
  const app=new Element(),body=new Element(),skip=new Element(),window=new Element(),document=new Element();
  document.body=body;document.documentElement={dataset:{},style:{setProperty(){}}};
  document.querySelector=selector=>selector==='#app'?app:selector==='.skip-link'?skip:null;
  window.scrollTo=()=>{};
  let currentHash=hash;
  const location={get hash(){return currentHash;},set hash(value){currentHash=value.startsWith('#')?value:'#'+value;}};
  const replacements=[];
  const history={replaceState(_state,_title,url){replacements.push(url);location.hash=url;}};
  Object.assign(globalThis,{document,window,location,history,matchMedia:()=>({matches:false}),localStorage:{getItem:()=>null,setItem(){}}});
  return {app,body,document,window,location,history,replacements};
}
async function routerHarness(gates={}){
  const h={...environment(),state:{studio:{language:'en'},lastLesson:'1.1'},lessonCalls:[],practiceCalls:0,resets:0,index:0,diagnosticResults:new Map(),...gates};
  const key='__routeAudit'+(++moduleId);globalThis[key]=h;
  const mock=source=>moduleURL(`const h=globalThis[${JSON.stringify(key)}];\n`+source);
  const page=(name,source)=>mock(`h.${name}Entered=true;await h.${name}Gate?.promise;\n`+source);
  const router=await isolatedModule('src/core/router.js',{
    '../../data.js':mock("export const lessons=[{id:'1.1'}],areas=[];"),
    '../../labs.js':mock('export function bindLabs(){}'),
    '../ui/questions.js':mock('export const diagnosticResults=h.diagnosticResults;export function bindQuestions(){}'),
    '../ui/lab-tools.js':mock('export function enhanceLabs(){}'),
    './actions.js':mock('export function bindActions(){}'),
    './session.js':mock('export const state=h.state;export function save(){}export function applyPreferences(){}'),
    '../services/book.js':mock('export const loadBook=()=>new Promise(()=>{});'),
    '../ui/command.js':mock('export function openCommand(){}'),
    '../i18n/core.js':mock("export const setLocale=async language=>language;export function startLocalization(){}export function localizeTree(){}export const validLocale=value=>value==='my'?'my':'en';"),
    '../pages/terminology.js':page('terminology',"export const terminologyPage=()=>'<h1>Terminology</h1>';export function mountTerminology(){}"),
    '../pages/explore.js':page('explore',"export const workspacePage=()=>'<h1>Workspace</h1>';export const atlasPage=workspacePage,glossaryPage=workspacePage,insightsPage=workspacePage;"),
    '../pages/lesson.js':page('lesson',"export function lessonPage(lesson){h.lessonCalls.push(lesson.id);h.state.lastLesson=lesson.id;return '<h1>Lesson</h1>';}export function mountLesson(){}export function updateEvidence(){}"),
    '../pages/practice.js':page('practice',"export function resetPractice(){h.resets++;h.index=0;}export function practicePage(){h.practiceCalls++;return '<h1>Question '+(h.index+1)+'</h1>';}export function nextQuestion(){h.index++;}export function registerSessionAnswer(){}"),
    '../pages/standard.js':page('standard',"export const learn=()=>'<h1>Learning path</h1>';export const diagnosticPage=()=>'<h1>Readiness</h1>';export const notFound=learn,applicationPage=learn,labsPage=learn,notebook=learn,resources=learn,settings=learn;"),
  });
  await waitFor(()=>h.app.innerHTML?.includes('Learning path'));
  return Object.assign(h,{router});
}

test('A superseded lesson import cannot change saved resume state after navigation',async()=>{
  const lessonGate=deferred(),h=await routerHarness({lessonGate});
  h.location.hash='#/lesson/1.1';const stale=h.router.render();
  await waitFor(()=>h.lessonEntered);
  h.location.hash='#/practice';await h.router.render();
  h.state.lastLesson='3.4';lessonGate.resolve();await stale;
  assert.deepEqual(h.lessonCalls,[]);
  assert.equal(h.state.lastLesson,'3.4');
  assert.match(h.app.innerHTML,/Question 1/);
});

test('A superseded practice import cannot reset practice or clear readiness work',async()=>{
  const practiceGate=deferred(),h=await routerHarness({practiceGate});
  h.location.hash='#/practice';const stale=h.router.render();
  await waitFor(()=>h.practiceEntered);
  h.location.hash='#/diagnostic';await h.router.render();
  h.diagnosticResults.set('diagnostic-0',{correct:true,independent:true});
  practiceGate.resolve();await stale;
  assert.equal(h.resets,0);assert.equal(h.practiceCalls,0);
  assert.equal(h.diagnosticResults.size,1);assert.match(h.app.innerHTML,/Readiness/);
});

test('Changing language during practice retains the session on the next question',async()=>{
  const h=await routerHarness();
  const next=new Element();h.app.nodes.set('[data-next]',next);
  h.location.hash='#/practice?section=1.1';await h.router.render();
  // Language controls update the URL without remounting the current form.
  h.location.hash='#/practice?section=1.1&lang=my';
  await next.fire('click');await waitFor(()=>h.app.innerHTML.includes('Question 2'));
  assert.equal(h.resets,1);assert.match(h.app.innerHTML,/Question 2/);
  h.location.hash='#/practice?mode=review&lang=my';await h.router.render();
  assert.equal(h.resets,2);assert.match(h.app.innerHTML,/Question 1/);
});

async function actionsHarness(){
  const h={...environment('#/settings?lang=my&keep=1'),state:emptyState(),lessons,diagnostic,book,emptyState,validateState,notices:[],copies:[],renders:[],confirm:true};
  h.state.studio={language:'my'};
  const key='__actionsAudit'+(++moduleId);globalThis[key]=h;
  const mock=source=>moduleURL(`const h=globalThis[${JSON.stringify(key)}];\n`+source);
  const module=await isolatedModule('src/core/actions.js',{
    '../../data.js':mock('export const {lessons,diagnostic,book}=h;'),
    '../../store.js':mock('export const {emptyState,validateState}=h;export const loadRecoveryBackup=()=>null;'),
    './session.js':mock("export let state=h.state;export function save(){h.saved=JSON.stringify(state);}export function touch(){}export function replaceState(value){state=value;state.studio??={language:'en'};h.state=state;save();}export function applyPreferences(){}"),
    '../ui/shared.js':mock('export const icon=()=>"",esc=String,lessonFor=()=>null;'),
    '../ui/feedback.js':mock('export const toast=message=>h.notices.push(message),confirmation=async()=>h.confirm;'),
    '../ui/questions.js':mock('export const diagnosticResults=new Map();'),
    '../ui/command.js':mock('export function openCommand(){}'),
    '../services/book.js':mock('export const bookFile={};export function attachBook(){}export function removeBook(){}'),
    '../content/index.js':mock('export const details={};'),
    '../engine/engagement.js':mock('export function recommendForInterest(){}'),
    '../ui/design-tokens.js':mock('export const READING_SIZES={comfortable:{label:"Comfortable",pixels:20}};'),
    '../i18n/core.js':mock('export const setLocale=async value=>h.localeGate?await h.localeGate.promise:value;export const languageControl=()=>"",lessonSearchText=()=>"";export function ensureBurmese(){}'),
    '../engine/text.js':mock('export function matchesSearch(){}'),
    '../pages/standard.js':mock('export function chapterList(){}'),
  });
  h.bind=(path='/settings',params=new URLSearchParams(),chapters=[])=>{
    const root=new Element(),controller=new AbortController();
    root.nodes.set('.settings-grid>.path-card',[new Element(),new Element()]);root.nodes.set('.settings-grid',new Element());
    const selectors=['[data-reset]','#progress-upload','[data-copy-backup]','#backup-text','[data-import-text]','#import-text'];
    for(const selector of selectors)root.nodes.set(selector,new Element());
    root.nodes.set('#lesson-search',new Element());root.nodes.set('#chapter-list',new Element());root.nodes.set('.chapter',chapters);
    for(const chapter of chapters)root.nodes.set('.chapter[data-chapter="'+chapter.number+'"]',chapter);
    module.bindActions(root,{path,params,render:()=>h.renders.push({language:h.state.studio.language,hash:h.location.hash}),navigate(){},signal:controller.signal});
    return {root,controller};
  };
  return h;
}

test('Restore and reset honor their own language preferences instead of the prior URL override',async()=>{
  const h=await actionsHarness(),{root}=h.bind(),backup=emptyState();
  backup.notes['1.1']='Keep my reasoning.';backup.bookmarks=['1.1'];backup.studio={language:'en'};
  root.querySelector('#import-text').value=JSON.stringify(backup);
  await root.querySelector('[data-import-text]').fire('click');
  assert.deepEqual(h.renders.at(-1),{language:'en',hash:'#/settings?keep=1'});
  assert.equal(h.state.notes['1.1'],'Keep my reasoning.');assert.deepEqual(h.state.bookmarks,['1.1']);
  h.location.hash='#/settings?lang=my&keep=1';h.state.studio.language='my';
  await root.querySelector('[data-reset]').fire('click');
  assert.deepEqual(h.renders.at(-1),{language:'en',hash:'#/settings?keep=1'});
});

test('Cancelled restore and invalid backup leave notes and stored data intact',async()=>{
  const h=await actionsHarness(),{root}=h.bind();h.state.notes['1.1']='Original note';h.confirm=false;
  const before=JSON.stringify(h.state);
  root.querySelector('#import-text').value=JSON.stringify(emptyState());
  await root.querySelector('[data-import-text]').fire('click');
  assert.equal(JSON.stringify(h.state),before);assert.equal(h.saved,undefined);
  root.querySelector('#import-text').value='{invalid';
  await root.querySelector('[data-import-text]').fire('click');
  assert.equal(JSON.stringify(h.state),before);assert.equal(h.saved,undefined);assert.equal(h.renders.length,0);
});

test('An obsolete language request cannot rewrite the next route or its preferences',async()=>{
  const h=await actionsHarness(),{root,controller}=h.bind('/learn'),select=new Element();
  h.state.studio.language='en';select.value='my';select.matches=selector=>selector==='[data-language]';h.localeGate=deferred();
  const changing=root.fire('change',{target:select});controller.abort();h.location.hash='#/learn';h.localeGate.resolve('my');await changing;
  assert.equal(h.state.studio.language,'en');assert.equal(h.location.hash,'#/learn');assert.equal(h.replacements.length,0);assert.equal(h.saved,undefined);
});

test('Copied backup text reflects preferences changed since settings was opened',async()=>{
  const h=await actionsHarness(),{root}=h.bind();
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async value=>h.copies.push(value)}}});
  root.querySelector('#backup-text').value=JSON.stringify(h.state);
  h.state.studio.language='en';h.state.notes['1.1']='The current note';
  await root.querySelector('[data-copy-backup]').fire('click');
  assert.deepEqual(JSON.parse(h.copies[0]),h.state);
});

test('A chapter deep link opens the requested chapter after application filtering changes its position',async()=>{
  const h=await actionsHarness(),chapters=[2,3,4,6,7].map(number=>Object.assign(new Element(),{number,open:false}));
  h.bind('/learn',new URLSearchParams('area=economics&chapter=3'),chapters);
  await waitFor(()=>chapters.some(c=>c.open));
  assert.equal(chapters[1].open,true);assert.equal(chapters[1].scrolled,true);assert.equal(chapters[2].open,false);
});

test('Invalid optional review metadata recovers without discarding notes or older mastery records',()=>{
  const source=emptyState();source.notes['1.1']='My saved explanation';
  source.attempts['1.1-0']={total:1,correct:1,last:100,mastered:true,dueAt:'never',streak:{}};
  source.attempts['1.1-1']={total:2,correct:2,last:200,mastered:true,dueAt:500,streak:2};
  source.attempts['1.1-2']={total:1,correct:1,last:300,mastered:true};
  const loaded=validateState(JSON.parse(JSON.stringify(source)));
  assert.equal(loaded.notes['1.1'],source.notes['1.1']);assert.equal(loaded.attempts['1.1-0'].mastered,true);
  assert.equal(loaded.attempts['1.1-0'].dueAt,undefined);assert.equal(loaded.attempts['1.1-0'].streak,undefined);
  assert.deepEqual(loaded.attempts['1.1-1'],source.attempts['1.1-1']);assert.deepEqual(loaded.attempts['1.1-2'],source.attempts['1.1-2']);
  assert.deepEqual(dueQuestions(loaded,lessons,100+3*86400000).map(q=>q.key),['1.1-0','1.1-1']);
  assert.equal(source.attempts['1.1-0'].dueAt,'never');
});

test('Question mastery badges update when independent evidence is earned or revoked',async()=>{
  environment();const session=await import('../src/core/session.js'),{bindQuestions}=await import('../src/ui/questions.js');
  session.replaceState(emptyState());const key='1.1-0',q=lessons[0].questions[0];
  session.state.attempts[key]={total:1,correct:1,last:100,mastered:true};
  const root=new Element(),form=new Element(),input=new Element(),feedback=new Element(),status=new Element();
  form.dataset.question=key;root.nodes.set('[data-question]',form);form.nodes.set('input',input);form.nodes.set('.question-feedback',feedback);form.nodes.set('.question-status',status);
  for(const selector of ['[type=submit]','[data-hint]','[data-solution]'])form.nodes.set(selector,new Element());
  status.textContent='✓ Independently solved';bindQuestions(root);
  input.value=String(q.answer+100);await form.fire('submit');
  assert.equal(session.state.attempts[key].mastered,false);assert.equal(status.textContent,'');
  input.value=String(q.answer);await form.fire('submit');
  assert.equal(session.state.attempts[key].mastered,false);assert.equal(status.textContent,'');
  // A fresh attempt without assistance earns both the saved evidence and badge.
  bindQuestions(root);await form.fire('submit');
  assert.equal(session.state.attempts[key].mastered,true);assert.equal(status.textContent,'✓ Independently solved');
});
