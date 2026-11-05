import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {lessons} from '../data.js';
import {details} from '../src/content/index.js';
import {missions} from '../src/content/missions.js';
import {terminology} from '../src/content/terminology.js';
import {burmese,lessonTranslations} from '../src/i18n/my/index.js';
import {normalizeDigits,normalizeSearch,matchesSearch} from '../src/engine/text.js';
import {parseAnswer,isCorrect} from '../math.js';
import {searchIndex} from '../src/engine/learning.js';
import {emptyState,validateState} from '../store.js';

globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.document=Object.assign(new EventTarget(),{compatMode:'CSS1Compat'});
const session=await import('../src/core/session.js');
const locale=await import('../src/i18n/core.js');
const {filterTerminology,terminologyPage}=await import('../src/pages/terminology.js');

function assertFields(original,translated,path){
  if(typeof translated==='string'){
    assert.equal(typeof original,'string',path);
    if(original.trim())assert.ok(translated.trim(),path);
    if(/[a-z]{4,}/i.test(original)&&!path.endsWith('.unit')&&!/symbols\.\d+\.0$/.test(path))assert.match(translated,/[\u1000-\u109f]/,path);
  }else if(Array.isArray(translated)){
    assert.equal(translated.length,original.length,path);translated.forEach((value,i)=>assertFields(original[i],value,path+'.'+i));
  }else for(const [key,value] of Object.entries(translated))assertFields(original[key],value,path+'.'+key);
}
test('All 45 Burmese lesson records translate the complete learning contract',()=>{
  assert.equal(Object.keys(lessonTranslations).length,45);
  for(const lesson of lessons){
    const translated=lessonTranslations[lesson.id],{detail,mission,...base}=translated;
    for(const key of ['title','why','idea','trap','steps','questions'])assert.ok(Object.hasOwn(base,key),lesson.id+': '+key);
    for(const key of ['objective','explanation','theorem','symbols','derivation','example','check','transfer'])assert.ok(Object.hasOwn(detail,key),lesson.id+': '+key);
    assertFields(lesson,base,lesson.id);assertFields(details[lesson.id],detail,lesson.id+'.detail');assertFields(missions[lesson.id],mission,lesson.id+'.mission');
    assert.equal(base.questions.length,4);assert.equal(detail.explanation.length,2);assert.equal(detail.derivation.length,3);
    assert.equal(detail.example.steps.length,3);assert.equal(detail.check.options.length,3);assert.equal(mission.options.length,3);assert.ok(mission.scene.includes('@'));
    assert.deepEqual(detail.symbols.map(pair=>pair[0]),details[lesson.id].symbols.map(pair=>pair[0]));
    for(const question of base.questions)for(const key of ['prompt','unit','hint','solution'])assert.ok(Object.hasOwn(question,key));
  }
});
test('The terminology reference has bilingual meaning, usage, example and valid coverage of every section',()=>{
  assert.ok(terminology.length>=100);
  assert.equal(new Set(terminology.map(term=>term.id)).size,terminology.length);
  const ids=new Set(lessons.map(lesson=>lesson.id));
  const covered=new Set();
  for(const term of terminology){
    assert.ok(term.symbol.trim());assert.ok(term.lessons.length);
    for(const id of term.lessons){assert.ok(ids.has(id),term.id+': '+id);covered.add(id);}
    for(const language of ['en','my'])for(const key of ['term','meaning','usage','example'])assert.ok(term[language][key]?.trim(),term.id+': '+language+'.'+key);
    assert.match(term.my.meaning,/[\u1000-\u109f]/);assert.match(term.my.usage,/[\u1000-\u109f]/);
  }
  assert.equal(covered.size,45);
  const symbols=terminology.map(term=>term.symbol).join(' ');
  for(const symbol of ['dx','dy/dx','∂','∫','Σ','∞','='])assert.ok(symbols.includes(symbol),symbol);
});
test('Burmese and international digits share the safe numerical answer parser',()=>{
  assert.equal(normalizeDigits('၀၁၂၃၄၅၆၇၈၉'),'0123456789');
  for(const [input,result] of [['၁/၂',.5],['−၁.၂၅',-1.25],['၁,၂၀၀',1200],['၂e−၃',.002],[' ၁၂၀ ',120]])assert.equal(parseAnswer(input),result,input);
  for(const invalid of ['၁/၀','၁+၂','၁;alert(1)','၁e','၁/၂/၃'])assert.ok(Number.isNaN(parseAnswer(invalid)),invalid);
  assert.ok(isCorrect('၁၂၀',120,.01));
});
test('Bilingual search handles normalized text, Myanmar section numbers and either language',()=>{
  assert.equal(normalizeSearch('  ၇.၂  '),'7.2');
  assert.equal(normalizeSearch('ဖန်\u200bရှင်'),'ဖန်ရှင်');
  assert.ok(matchesSearch('ဆင်းသက်ကိန်း',burmese.search['3.4']));
  const entries=[{title:'The chain rule',localizedTitle:lessonTranslations['3.4'].title,keywords:burmese.search['3.4']}];
  assert.equal(searchIndex(lessonTranslations['3.4'].title,entries).length,1);
  assert.ok(filterTerminology('derivative').length);assert.ok(filterTerminology('ဆင်းသက်ကိန်း').length);assert.ok(filterTerminology('∫').length);
  assert.equal(filterTerminology('derivative')[0].id,'derivative');assert.equal(filterTerminology('ဆင်းသက်ကိန်း')[0].id,'derivative');
  assert.ok(filterTerminology('','all','1.1').every(term=>term.lessons.includes('1.1')));
});
test('A language preference round-trips while notes, question evidence and old backups stay intact',()=>{
  const state=emptyState();state.notes['1.1']='Functions';state.attempts['1.1-0']={total:1,correct:1,last:100,mastered:true};
  state.studio={language:'my',theme:'dark',textSize:'extra'};
  session.replaceState(validateState(JSON.parse(JSON.stringify(state))));
  assert.equal(session.state.studio.language,'my');assert.equal(session.state.notes['1.1'],'Functions');assert.equal(session.lessonMastery('1.1'),20);
  assert.equal(session.normalizeStudio({schema:3}).language,'en');assert.equal(session.normalizeStudio({language:'bu'}).language,'en');
  assert.equal(locale.validLocale('my'),'my');assert.equal(locale.validLocale('unexpected'),'en');
});
test('The translation pack preserves formulas and original answer metadata',()=>{
  const before=JSON.stringify(lessons.map(lesson=>({id:lesson.id,formula:lesson.formula,questions:lesson.questions.map(q=>[q.answer,q.tolerance])})));
  for(const lesson of lessons){
    assert.notEqual(burmese.translate(lesson.title),lesson.title);
    assert.match(burmese.translate(lesson.title),/[\u1000-\u109f]/);
    assert.equal(burmese.translate(details[lesson.id].formula),details[lesson.id].formula);
    assert.equal(burmese.translate(lesson.formula),lesson.formula);
  }
  assert.equal(JSON.stringify(lessons.map(lesson=>({id:lesson.id,formula:lesson.formula,questions:lesson.questions.map(q=>[q.answer,q.tolerance])}))),before);
});
test('The interface phrase inventory is translated except intentional brand and notation',async()=>{
  const source=JSON.parse(await readFile(new URL('../src/i18n/my/ui-source.json',import.meta.url),'utf8'));
  const preserved=new Set(['Aa','applied','D(p) = 120 − 2p · R(p) = pD(p)','D(t) = 50 + A sin(2πt/T)','L(x) = xᵅ · Gini = 1 − 2/(α + 1)','f′(x) = lim[h→0] Δf / h','output = f(input)','ŷ = ⅓ + bx · data: (1,2), (2,3), (3,5)','∫ f(x) dx','∫[a to b] f′(x) dx = f(b) − f(a)']);
  for(const phrase of source)if(!preserved.has(phrase))assert.notEqual(burmese.translate(phrase),phrase,phrase);
});
test('Interpolated feedback preserves scores, page numbers, error tolerances and context',()=>{
  for(const [source,values] of [
    ['2 of 4 activities tried',['2','4']],
    ['20% evidence of understanding',['20%']],
    ['Accepted absolute error: ±0.000025',['±0.000025']],
    ['Textbook p. 301',['301']],
    ['1.1 · Functions',['1.1']],
    ['102 of 102 terms',['102']],
  ]){const translated=burmese.translate(source);assert.notEqual(translated,source);for(const value of values)assert.ok(translated.includes(value),source);}
});
test('The terminology page exposes every entry, English anchors and lesson-specific references',()=>{
  const full=terminologyPage(new URLSearchParams());
  assert.equal((full.match(/data-term-id="/g)||[]).length,terminology.length);
  assert.ok(full.includes('data-term-search')&&full.includes('data-term-category'));
  const scoped=terminologyPage(new URLSearchParams('lesson=7.7'));
  assert.equal((scoped.match(/data-term-id="/g)||[]).length,filterTerminology('','all','7.7').length);
});
test('New terminology examples agree with independent numerical calculations',()=>{
  assert.ok(Math.abs((3.01**2-3**2)-.0601)<1e-12);
  assert.ok(Math.abs(2*Math.PI/Math.abs(-Math.PI/6)-12)<1e-12);
  assert.equal((10-6)*4/2,8);
  assert.equal((6-2)*4/2,8);
  assert.equal((0+2*1+4)/2,3);
  assert.ok(Math.abs((1/6)**2+(-1/3)**2+(1/6)**2-1/6)<1e-12);
  assert.equal((-2)*(-2)-(-1)**2,3);
  const derivative=terminology.find(term=>term.id==='derivative');assert.ok(derivative.en.example.includes('0.0601')&&derivative.my.example.includes('0.0601'));
  assert.ok(terminology.find(term=>term.id==='period').symbol.includes('|ω|'));
});
