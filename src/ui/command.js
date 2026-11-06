import {burmeseText,lessonSearchText,ensureBurmese,localizeTree} from '../i18n/core.js';
import {lessons,labCatalog,areas} from '../../data.js';
import {details} from '../content/index.js';
import {searchIndex} from '../engine/learning.js';
import {esc,icon} from './shared.js';
const entries=()=>[
  ...lessons.map(l=>({title:l.title,localizedTitle:burmeseText(l.title),tag:'LESSON '+l.id,path:'/lesson/'+l.id,keywords:l.id+' '+l.why+' '+lessonSearchText(l.id)+' '+details[l.id].symbols.map(s=>s.join(' ')).join(' ')})),
  ...labCatalog.map(l=>({title:l.title,localizedTitle:burmeseText(l.title),tag:'VISUAL LAB',path:'/labs/'+l.id,keywords:l.topic+' '+l.subtitle+' '+burmeseText(l.topic)+' '+burmeseText(l.subtitle)})),
  ...areas.map(a=>({title:a.name,localizedTitle:burmeseText(a.name),tag:'APPLICATION',path:'/applications/'+a.id,keywords:a.description+' '+a.question+' '+burmeseText(a.description)+' '+burmeseText(a.question)})),
  {title:'Concept atlas',tag:'STUDIO',path:'/atlas',keywords:'prerequisites dependency map relationships'},
  {title:'Learning insights',tag:'STUDIO',path:'/insights',keywords:'progress mastery mistakes confidence'},
  {title:'Formula library',tag:'STUDIO',path:'/glossary',keywords:'reference equations flashcards recall'},
  {title:'Mathematical terminology',tag:'STUDIO',path:'/terminology',keywords:'terms notation meanings usages definitions အဓိပ္ပာယ် ဝေါဟာရ သင်္ချာ'},
];
export function openCommand(){
  if(document.querySelector('.command-dialog'))return;
  const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='command-dialog';dialog.setAttribute('aria-labelledby','command-title');
  dialog.innerHTML=`<div class="command-input">${icon('search')}<label class="sr-only" id="command-title" for="command-query">Search lessons, labs and applications</label><input id="command-query" type="search" placeholder="What do you want to understand?" autocomplete="off" aria-controls="command-results"><button class="text-button" data-close-command aria-label="Close search">Esc</button></div><div class="command-results" id="command-results" role="list"></div><p class="sr-only" data-command-status role="status" aria-live="polite" aria-atomic="true"></p><div class="command-footer"><span>↑ ↓ to move · Enter to open</span><span>Search your entire studio</span></div>`;
  let current=0,results=[];
  const input=dialog.querySelector('input');
  const close=()=>dialog.close();
  dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus();},{once:true});
  const paint=()=>{
    results=searchIndex(input.value,entries());current=0;
    dialog.querySelector('.command-results').innerHTML=results.length?results.map((r,i)=>`<div role="listitem"><a class="command-result ${i===0?'command-current':''}" href="#${r.path}"><span><small>${r.tag}</small><strong>${esc(r.title)}</strong></span>${icon('arrow')}</a></div>`).join(''):'<p class="command-empty">No matches. Try a term such as “growth”, “cost” or “integral”.</p>';
    dialog.querySelector('[data-command-status]').textContent=results.length+' search results';
    localizeTree(dialog);
  };
  dialog.querySelector('input').addEventListener('input',async()=>{const query=dialog.querySelector('input').value;if(/[\u1000-\u109f]/.test(query))try{await ensureBurmese();}catch{}if(dialog.isConnected)paint();});
  dialog.querySelector('[data-close-command]').addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target.closest('.command-result'))close();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('focusin',e=>{const links=[...dialog.querySelectorAll('.command-result')],index=links.indexOf(e.target);if(index<0)return;current=index;links.forEach((a,i)=>a.classList.toggle('command-current',i===current));});
  dialog.addEventListener('keydown',e=>{
    if(e.isComposing)return;
    const links=[...dialog.querySelectorAll('.command-result')],index=links.indexOf(e.target);
    if((e.key==='ArrowDown'||e.key==='ArrowUp')&&(e.target===input||index>=0)&&links.length){
      e.preventDefault();
      current=e.target===input?(e.key==='ArrowDown'?0:links.length-1):(index+(e.key==='ArrowDown'?1:-1)+links.length)%links.length;
      links.forEach((a,i)=>a.classList.toggle('command-current',i===current));
      links[current].focus();links[current].scrollIntoView({block:'nearest'});
    }
    if(e.key==='Enter'&&e.target===input&&results[current]){e.preventDefault();location.hash=results[current].path;close();}
  });
  document.body.append(dialog);paint();dialog.showModal();input.focus();
}
