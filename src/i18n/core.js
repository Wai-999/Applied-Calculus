import {normalizeSearch,matchesSearch} from '../engine/text.js';

export const LANGUAGES=[
  {id:'en',name:'English',native:'English'},
  {id:'my',name:'Burmese (Burma)',native:'မြန်မာဘာသာ · Burma'}
];
let locale='en',pack,loading,revision=0,observer;
const texts=new WeakMap(),attributes=new WeakMap();
const ignored='script,style,math,.katex,.formula-block,.lab-formula,.formula-list dd,[data-no-translate],[data-user-content]';
export const getLocale=()=>locale;
export const validLocale=value=>LANGUAGES.some(language=>language.id===value)?value:'en';
export function ensureBurmese(){
  return pack?Promise.resolve(pack):(loading||=(import('./my/index.js').then(module=>(pack=module.burmese)).catch(error=>{loading=null;throw error;})));
}
export function burmeseText(source){return pack?.translate(String(source))||String(source);}
export function translate(source){return locale==='my'?burmeseText(source):String(source);}
export function lessonSearchText(id){return pack?.search[id]||'';}
export function matchesLesson(query,lesson){
  const normalized=normalizeSearch(query);if(/^[1-8]\.[1-7]$/.test(normalized))return lesson.id===normalized;
  return matchesSearch(query,lesson.id,lesson.title,lesson.why,lesson.formula,lessonSearchText(lesson.id));
}
export const normalizeQuery=normalizeSearch;
export function sourceText(element){
  if(element.nodeType===3){
    const previous=texts.get(element);
    return previous&&element.data===previous.output?previous.source:element.data;
  }
  return [...element.childNodes].map(sourceText).join('');
}

function translateNode(node){
  const parent=node.nodeType===3?node.parentElement:node;
  if(!parent||parent.closest(ignored))return;
  if(node.nodeType===3){
    if(parent.closest('textarea,input'))return;
    const current=node.data,previous=texts.get(node);
    const source=previous&&current===previous.output?previous.source:current;
    const output=translate(source);
    texts.set(node,{source,output});if(current!==output)node.data=output;
    return;
  }
  if(node.nodeType!==1)return;
  let stored=attributes.get(node);if(!stored){stored={};attributes.set(node,stored);}
  for(const name of ['aria-label','placeholder','title','alt']){
    if(!node.hasAttribute(name))continue;
    const current=node.getAttribute(name),previous=stored[name];
    const source=previous&&current===previous.output?previous.source:current;
    const output=translate(source);stored[name]={source,output};
    if(current!==output)node.setAttribute(name,output);
  }
}
export function localizeTree(root){
  if(!root)return;
  translateNode(root);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:node=>node.nodeType===1&&node.matches(ignored)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  while(walker.nextNode())translateNode(walker.currentNode);
}
function observe(){
  observer?.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title','alt']});
}
export function startLocalization(){
  if(observer)return;
  observer=new MutationObserver(records=>{
    observer.disconnect();
    const roots=new Set();
    for(const record of records){
      if(record.type==='childList')for(const node of record.addedNodes)roots.add(node);
      else roots.add(record.target);
    }
    for(const root of roots)if(root.isConnected)localizeTree(root);
    observe();
  });
  localizeTree(document.body);observe();
}
export async function setLocale(value){
  const next=validLocale(value),ticket=++revision;
  if(next==='my')await ensureBurmese();
  if(ticket!==revision)return locale;
  locale=next;
  if(typeof document!=='undefined'&&document.documentElement){
    observer?.disconnect();
    document.documentElement.lang=locale;
    document.documentElement.dataset.language=locale;
    localizeTree(document.body);
    document.querySelectorAll('[data-language]').forEach(select=>{select.value=locale;});
    const heading=document.querySelector('main h1');
    if(heading)document.title=heading.textContent+' · Applied';
    observe();
    document.dispatchEvent(new CustomEvent('studio:language',{detail:locale}));
  }
  return locale;
}
export function languageControl(id='language-select'){
  return `<label class="language-control" for="${id}"><span>Language</span><select id="${id}" data-language aria-label="Learning language">${LANGUAGES.map(language=>`<option value="${language.id}" lang="${language.id}" data-no-translate ${locale===language.id?'selected':''}>${language.native}</option>`).join('')}</select></label>`;
}
