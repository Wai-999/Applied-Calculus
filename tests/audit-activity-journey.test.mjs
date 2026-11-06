import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons,areas} from '../data.js';
import {details} from '../src/content/index.js';
import {missions} from '../src/content/missions.js';
import {emptyState,validateState} from '../store.js';
import {activityStatus,recommendForInterest} from '../src/engine/engagement.js';

globalThis.localStorage={getItem:()=>null,setItem(){}};
globalThis.document=Object.assign(new EventTarget(),{compatMode:'CSS1Compat'});
const session=await import('../src/core/session.js');
const {mountActivities}=await import('../src/ui/activities.js');
const {bindQuestions}=await import('../src/ui/questions.js');

// The real activity and question modules share this controlled event tree.
// Native bubbling is represented explicitly so the integration contract is tested.
class Element{
  constructor(selectors=[]){this.selectors=new Set(selectors);this.nodes=new Map();this.handlers=new Map();this.dataset={};this.value='';this.textContent='';this.innerHTML='';this.attributes={};this.disabled=false;const classes=new Set();this.classList={toggle(name,on){if(on)classes.add(name);else classes.delete(name);},contains:name=>classes.has(name)};}
  querySelector(selector){const found=this.nodes.get(selector);return Array.isArray(found)?found[0]:found||null;}
  querySelectorAll(selector){const found=this.nodes.get(selector);return Array.isArray(found)?found:found?[found]:[];}
  closest(selector){return this.selectors.has(selector)?this:this.parent?.closest(selector)||null;}
  matches(selector){return this.selectors.has(selector);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  addEventListener(type,fn,{signal}={}){if(signal?.aborted)return;const handlers=this.handlers.get(type)||[];handlers.push(fn);this.handlers.set(type,handlers);signal?.addEventListener('abort',()=>this.handlers.set(type,(this.handlers.get(type)||[]).filter(f=>f!==fn)),{once:true});}
  fire(type,values={}){const event={type,target:this,currentTarget:this,bubbles:false,preventDefault(){},...values};for(const fn of this.handlers.get(type)||[])fn(event);if(event.bubbles&&this.parent)this.parent.fire(type,{...event,currentTarget:this.parent});return true;}
  dispatchEvent(event){return this.fire(event.type,{bubbles:event.bubbles,detail:event.detail});}
  select(){}
  focus(){}
}
function fixture(lesson){
  const root=new Element(),count=new Element(),recap=new Element();
  root.nodes.set('[data-activity-count]',count);root.nodes.set('[data-recap-content]',recap);
  for(const selector of ['[data-order-list]','[data-order-feedback]','[data-prediction-feedback]','[data-observation-status]'])root.nodes.set(selector,new Element());
  for(const stage of activityStatus({}).stages){const button=new Element();button.nodes.set('.trail-marker',new Element());root.nodes.set('[data-trail-key="'+stage.key+'"]',button);}
  const predictions=missions[lesson.id].options.map((_value,i)=>{const button=new Element(['[data-prediction]']);button.dataset.prediction=String(i);button.parent=root;return button;});
  root.nodes.set('[data-prediction]',predictions);
  const check=new Element(['[data-check-order]']),show=new Element(['[data-show-order]']),range=new Element(['.lab input[type=range]']);
  for(const control of [check,show,range])control.parent=root;
  const form=new Element();form.dataset.question=lesson.id+'-0';form.parent=root;root.nodes.set('[data-question]',form);
  for(const selector of ['input','.question-feedback','.question-status','[type=submit]','[data-hint]','[data-solution]']){const element=new Element();element.parent=form;form.nodes.set(selector,element);}
  const signal=new AbortController().signal;mountActivities(root,lesson,signal,()=>{});bindQuestions(root);
  return {root,count,recap,predictions,check,show,range,form,input:form.querySelector('input'),hint:form.querySelector('[data-hint]'),solution:form.querySelector('[data-solution]')};
}

test('A complete assisted lesson journey records four activities without inventing independent mastery',()=>{
  const lesson=lessons[0];session.replaceState(emptyState());const h=fixture(lesson);
  h.predictions[(missions[lesson.id].correct+1)%3].fire('click',{bubbles:true});
  assert.equal(activityStatus(session.guidedRecord(lesson.id)).completed,1);
  h.check.fire('click',{bubbles:true});assert.equal(session.guidedRecord(lesson.id).reasoned,false);
  h.show.fire('click',{bubbles:true});h.check.fire('click',{bubbles:true});
  assert.equal(session.guidedRecord(lesson.id).assisted,true);
  h.range.fire('input',{bubbles:true});
  assert.equal(activityStatus(session.guidedRecord(lesson.id)).completed,3);
  // Seeing a worked solution is an assisted recorded attempt, and must reach the trail.
  h.solution.fire('click',{bubbles:true});
  assert.equal(h.count.textContent,'4 of 4 activities tried');
  assert.match(h.recap.innerHTML,/4\/4 activities tried/);assert.match(h.recap.innerHTML,/0% evidence from independent checks/);
  assert.equal(session.state.attempts[lesson.id+'-0'].mastered,false);
  assert.equal(session.state.completed.length,0);assert.equal(session.lessonMastery(lesson.id),0);
  const restored=validateState(JSON.parse(JSON.stringify(session.state)));session.replaceState(restored);
  assert.equal(activityStatus(session.guidedRecord(lesson.id)).completed,4);assert.equal(session.lessonMastery(lesson.id),0);
});

test('Invalid numeric text and a hint alone do not record a submitted practice activity',()=>{
  const lesson=lessons[0];session.replaceState(emptyState());const h=fixture(lesson);
  h.input.value='not a number';h.form.fire('submit');h.hint.fire('click',{bubbles:true});
  assert.equal(activityStatus(session.guidedRecord(lesson.id)).completed,0);
  assert.deepEqual(session.state.attempts,{});
  h.solution.fire('click',{bubbles:true});
  assert.equal(session.guidedRecord(lesson.id).practised,true);assert.equal(activityStatus(session.guidedRecord(lesson.id)).completed,1);
  assert.equal(session.lessonMastery(lesson.id),0);
});

test('Every application interest can traverse all lessons once while satisfying prerequisites',()=>{
  for(const interest of ['all',...areas.map(area=>area.id)]){
    const state=emptyState();state.studio={interest};const visited=new Set();
    for(let count=0;count<lessons.length;count++){
      const next=recommendForInterest(lessons,details,state,true);
      assert.ok(next&&!visited.has(next.id),interest+' repeats a completed lesson');
      assert.ok(details[next.id].prerequisites.every(id=>visited.has(id)),interest+' skips a foundation before '+next.id);
      visited.add(next.id);state.completed.push(next.id);state.lastLesson=next.id;
    }
    assert.equal(visited.size,45);
  }
});
