import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons,areas} from '../data.js';
import {details} from '../src/content/index.js';
import {missions,characters} from '../src/content/missions.js';
import {normalizeGuided,activityStatus,initialOrder,moveOrder,checkOrder,recommendForInterest} from '../src/engine/engagement.js';
import {PALETTES,READING_SIZES,nextReadingSize} from '../src/ui/design-tokens.js';
import {emptyState,validateState} from '../store.js';

globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.document=Object.assign(new EventTarget(),{compatMode:'CSS1Compat'});
const session=await import('../src/core/session.js');
const activities=await import('../src/ui/activities.js');
const {lessonPage}=await import('../src/pages/lesson.js');

test('Every lesson has an authored prediction and an investigation for its actual model',()=>{
  assert.equal(Object.keys(missions).length,45);
  for(const l of lessons){
    const m=missions[l.id];
    assert.ok(characters[l.area],l.id);
    assert.ok(m.scene.includes('@'),l.id);
    assert.equal(m.options.length,3);
    assert.ok(m.options[m.correct]);
    assert.ok(m.explanation.length>80,l.id);
    assert.equal(activities.observationTasks[l.lab].length,2,l.id);
  }
});
test('All 45 complete lesson workspaces render their activities and mathematical content',()=>{
  for(const l of lessons){
    const html=lessonPage(l,new URLSearchParams());
    assert.equal((html.match(/data-prediction="/g)||[]).length,3,l.id);
    assert.equal((html.match(/data-question="/g)||[]).length,4,l.id);
    assert.equal((html.match(/role="tabpanel"/g)||[]).length,4,l.id);
    assert.ok(html.includes('data-order-list')&&html.includes('data-recap-content')&&html.includes('data-lesson-guide'),l.id);
    assert.ok(!html.includes('>undefined<')&&!html.includes('katex-error'),l.id);
  }
});
test('Matching feedback rejects a shuffled or invalid mapping and accepts correctly paired explanations',()=>{
  let order=initialOrder(3);assert.equal(checkOrder(order).correct,false);
  const original=[...order];
  order=moveOrder(order,2,-1);order=moveOrder(order,1,-1);
  assert.deepEqual(order,[0,1,2]);assert.deepEqual(original,[1,2,0]);
  assert.deepEqual(checkOrder(order),{correct:true,prefix:3});
  assert.deepEqual(moveOrder(order,0,-1),order);
  assert.equal(checkOrder([0,0,2]).correct,false);
  assert.equal(checkOrder([0,1,8]).correct,false);
  assert.equal(checkOrder([0,2,1]).prefix,1);
});
test('An incorrect prediction still records participation without inventing independent mastery',()=>{
  const s=emptyState(),id='1.1';s.studio=session.normalizeStudio();
  s.studio.guided[id]={prediction:0,reasoned:true,observed:true,practised:true};
  session.replaceState(s);
  assert.equal(activityStatus(session.guidedRecord(id)).completed,4);
  assert.equal(session.lessonMastery(id),0);
  assert.equal(s.completed.length,0);
  assert.equal(Object.keys(s.attempts).length,0);
});
test('Interest routes include unmet foundations, honor a resume, and advance after exploration',()=>{
  for(const area of areas){
    const s=emptyState();s.studio={interest:area.id};const target=lessons.find(l=>l.area===area.id);
    let next=recommendForInterest(lessons,details,s,true),iterations=0;
    while(next.id!==target.id){
      assert.ok(details[next.id].prerequisites.every(id=>s.completed.includes(id)));
      s.completed.push(next.id);next=recommendForInterest(lessons,details,s,true);assert.ok(++iterations<45);
    }
    assert.ok(details[next.id].prerequisites.every(id=>s.completed.includes(id)));
    s.lastLesson='4.6';assert.equal(recommendForInterest(lessons,details,s).id,'4.6');
  }
});
test('Old backups and new guided records preserve notes, question mastery, and preferences safely',()=>{
  const old=emptyState();old.notes['1.1']='My saved explanation.';old.attempts['1.1-3']={total:1,correct:1,last:123,mastered:true};
  const loaded=validateState(JSON.parse(JSON.stringify(old)));session.replaceState(loaded);
  assert.equal(session.state.notes['1.1'],old.notes['1.1']);assert.equal(session.lessonMastery('1.1'),20);
  assert.equal(session.state.studio.textSize,'comfortable');
  const normalized=session.normalizeStudio({schema:2,textSize:'extra',interest:'life',guided:{'1.1':{prediction:2,reasoned:true,observed:'yes'},'99.9':{prediction:0}}});
  assert.equal(normalized.schema,3);assert.equal(normalized.textSize,'extra');assert.equal(normalized.interest,'life');
  assert.equal(normalized.guided['1.1'].observed,false);assert.ok(!normalized.guided['99.9']);
  loaded.studio=normalized;session.replaceState(validateState(JSON.parse(JSON.stringify(loaded))));
  assert.equal(session.guidedRecord('1.1').prediction,2);
  assert.equal(session.lessonMastery('1.1'),20);
  assert.equal(normalizeGuided({prediction:-1,practised:1}).prediction,null);
});
function luminance(hex){
  const values=hex.match(/[a-f0-9]{2}/gi).map(h=>parseInt(h,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return values[0]*.2126+values[1]*.7152+values[2]*.0722;
}
function contrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);}
test('Both reading palettes exceed WCAG AA contrast for normal text on every reading surface',()=>{
  for(const [theme,palette] of Object.entries(PALETTES)){
    for(const foreground of ['ink','muted','green','accent'])for(const background of ['paper','white','surface-soft']){
      assert.ok(contrast(palette[foreground],palette[background])>=4.5,theme+' '+foreground+'/'+background);
    }
  }
  assert.ok(contrast('#fffef5','#285e40')>=4.5);
  assert.ok(contrast('#e6eddc','#214e43')>=4.5);
});
test('Reading preferences offer three increasing sizes without losing the saved choice',()=>{
  assert.deepEqual(Object.values(READING_SIZES).map(v=>v.pixels),[20,23,26]);
  assert.equal(nextReadingSize('comfortable'),'large');assert.equal(nextReadingSize('large'),'extra');assert.equal(nextReadingSize('extra'),'comfortable');
});
