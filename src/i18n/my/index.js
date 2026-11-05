import {lessons,areas,chapters,labCatalog,diagnostic} from '../../../data.js';
import {details} from '../../content/index.js';
import {missions,characters} from '../../content/missions.js';
import {terminology} from '../../content/terminology.js';
import {lessonTranslations as first} from './chapters-1-3.js';
import {lessonTranslations as middle} from './chapters-4-6.js';
import {lessonTranslations as last} from './chapters-7-8.js';
import {applicationTranslations,chapterTranslations,labTranslations,diagnosticTranslations} from './context.js';
import {uiStrings} from './ui.js';
import {interfaceStrings} from './interface.js';
import {dynamicMessage} from './messages.js';

export const lessonTranslations={...first,...middle,...last};
const key=value=>String(value).normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase();
const exact=new Map();
const notation=new Set(lessons.flatMap(lesson=>[lesson.formula,details[lesson.id].formula,...details[lesson.id].derivation.map(step=>step.equation),...details[lesson.id].example.steps.map(step=>step.equation)]));
function add(source,target,overwrite=false){
  if(typeof source!=='string'||typeof target!=='string'||!source.trim()||source===target)return;
  const normalized=key(source);
  if(overwrite||!exact.has(normalized))exact.set(normalized,target);
}
function pairs(source,target){
  if(typeof target==='string'){add(source,target);return;}
  if(target&&typeof target==='object')for(const [name,value] of Object.entries(target))pairs(source?.[name],value);
}
const search={};
function flatten(value){return typeof value==='string'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(flatten):[];}
for(const lesson of lessons){
  const translated=lessonTranslations[lesson.id];if(!translated)continue;
  const {detail,mission,...base}=translated;
  pairs(lesson,base);pairs(details[lesson.id],detail);pairs(missions[lesson.id],mission);
  const name=characters[lesson.area].name;
  add(missions[lesson.id].scene.replaceAll('@',name),mission.scene.replaceAll('@',name));
  search[lesson.id]=flatten(translated).join(' ');
}
for(const area of areas){
  const translated=applicationTranslations[area.id];pairs(area,translated);
  add(area.name+': '+area.question,translated.name+' — '+translated.question);
}
for(const chapter of chapters)pairs(chapter,chapterTranslations[chapter.number]);
for(const lab of labCatalog)pairs(lab,labTranslations[lab.id]);
diagnostic.forEach((question,i)=>pairs(question,diagnosticTranslations[i]));
for(const term of terminology)pairs(term.en,term.my);
for(const [source,target] of Object.entries(uiStrings))add(source,target,true);
for(const [source,target] of Object.entries(interfaceStrings))add(source,target,true);

function translate(source){
  if(notation.has(source))return source;
  const match=String(source).match(/^(\s*)([\s\S]*?)(\s*)$/),text=match[2];
  if(!text)return source;
  let result=exact.get(key(text));
  if(!result)result=dynamicMessage(text,translate);
  if(!result&&text.includes(' · ')){
    const parts=text.split(' · '),translated=parts.map(translate);
    if(translated.some((part,i)=>part!==parts[i]))result=translated.join(' · ');
  }
  return result?match[1]+result+match[3]:source;
}
export const burmese={translate,exact,search,lessons:lessonTranslations};
