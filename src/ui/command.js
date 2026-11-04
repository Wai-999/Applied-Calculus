import {lessons,labCatalog,areas} from '../../data.js';
import {details} from '../content/index.js';
import {searchIndex} from '../engine/learning.js';
import {esc,icon} from './shared.js';
const entries=[
  ...lessons.map(l=>({title:l.title,tag:'LESSON '+l.id,path:'/lesson/'+l.id,keywords:l.id+' '+l.why+' '+details[l.id].symbols.map(s=>s.join(' ')).join(' ')})),
  ...labCatalog.map(l=>({title:l.title,tag:'VISUAL LAB',path:'/labs/'+l.id,keywords:l.topic+' '+l.subtitle})),
  ...areas.map(a=>({title:a.name,tag:'APPLICATION',path:'/applications/'+a.id,keywords:a.description+' '+a.question})),
  {title:'Concept atlas',tag:'STUDIO',path:'/atlas',keywords:'prerequisites dependency map relationships'},
  {title:'Learning insights',tag:'STUDIO',path:'/insights',keywords:'progress mastery mistakes confidence'},
  {title:'Formula library',tag:'STUDIO',path:'/glossary',keywords:'reference equations flashcards recall'},
];
export function openCommand(){
  if(document.querySelector('.command-dialog'))return;
  const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='command-dialog';dialog.setAttribute('aria-labelledby','command-title');
  dialog.innerHTML=`<div class="command-input">${icon('search')}<label class="sr-only" id="command-title" for="command-query">Search lessons, labs and applications</label><input id="command-query" type="search" placeholder="What do you want to understand?" autocomplete="off"><button class="text-button" data-close-command aria-label="Close search">Esc</button></div><div class="command-results" role="list"></div><div class="command-footer"><span>↑ ↓ to move · Enter to open</span><span>Search your entire studio</span></div>`;
  let current=0,results=[];
  const close=()=>{dialog.close();dialog.remove();previous?.focus();};
  const paint=()=>{results=searchIndex(dialog.querySelector('input').value,entries);current=0;dialog.querySelector('.command-results').innerHTML=results.length?results.map((r,i)=>`<a role="listitem" class="command-result ${i===0?'command-current':''}" href="#${r.path}"><span><small>${r.tag}</small><strong>${esc(r.title)}</strong></span>${icon('arrow')}</a>`).join(''):'<p class="command-empty">No matches. Try a term such as “growth”, “cost” or “integral”.</p>';};
  dialog.querySelector('input').addEventListener('input',paint);
  dialog.querySelector('[data-close-command]').addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target.closest('.command-result'))close();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();current=(current+(e.key==='ArrowDown'?1:-1)+results.length)%Math.max(1,results.length);dialog.querySelectorAll('.command-result').forEach((a,i)=>a.classList.toggle('command-current',i===current));dialog.querySelectorAll('.command-result')[current]?.scrollIntoView({block:'nearest'});}if(e.key==='Enter'&&results[current]){e.preventDefault();location.hash=results[current].path;close();}});
  document.body.append(dialog);dialog.showModal();paint();dialog.querySelector('input').focus();
}
