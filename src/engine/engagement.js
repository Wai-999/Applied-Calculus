import {recommendLesson} from './learning.js';
export const ACTIVITY_STAGES=[
  {key:'prediction',label:'Make a prediction',view:'understand'},
  {key:'reasoned',label:'Build the reasoning',view:'reason'},
  {key:'observed',label:'Try the experiment',view:'experiment'},
  {key:'practised',label:'Test your understanding',view:'practice'}
];
export function normalizeGuided(record){
  if(!record||typeof record!=='object'||Array.isArray(record))record={};
  return {
    prediction:Number.isInteger(record.prediction)&&record.prediction>=0&&record.prediction<3?record.prediction:null,
    reasoned:record.reasoned===true,assisted:record.assisted===true,
    observed:record.observed===true,practised:record.practised===true,recap:record.recap===true
  };
}
export function activityStatus(record){
  const value=normalizeGuided(record);
  const stages=ACTIVITY_STAGES.map(stage=>({...stage,done:stage.key==='prediction'?value.prediction!==null:value[stage.key]}));
  return {stages,completed:stages.filter(s=>s.done).length,next:stages.find(s=>!s.done)?.view||'practice'};
}
export function initialOrder(count){return count<2?Array.from({length:count},(_,i)=>i):[...Array.from({length:count-1},(_,i)=>i+1),0];}
export function moveOrder(order,index,delta){
  const target=index+delta,result=[...order];
  if(index<0||index>=order.length||target<0||target>=order.length)return result;
  [result[index],result[target]]=[result[target],result[index]];
  return result;
}
export function checkOrder(order){
  const valid=Array.isArray(order)&&new Set(order).size===order.length&&order.every(n=>Number.isInteger(n)&&n>=0&&n<order.length);
  let prefix=0;if(valid)while(prefix<order.length&&order[prefix]===prefix)prefix++;
  return {correct:valid&&prefix===order.length,prefix};
}
export function recommendForInterest(lessons,details,state,ignoreResume=false){
  const interest=state.studio?.interest;
  if(!interest||interest==='all')return recommendLesson(lessons,details,state);
  const last=lessons.find(l=>l.id===state.lastLesson);
  if(!ignoreResume&&last&&!state.completed.includes(last.id))return last;
  const target=lessons.find(l=>l.area===interest&&!state.completed.includes(l.id));
  const visited=new Set();
  function unmet(id){
    if(visited.has(id)||state.completed.includes(id))return null;
    visited.add(id);
    for(const prerequisite of details[id]?.prerequisites||[]){const found=unmet(prerequisite);if(found)return found;}
    return lessons.find(l=>l.id===id)||null;
  }
  return target?unmet(target.id)||target:recommendLesson(lessons,details,state);
}
