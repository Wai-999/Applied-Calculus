import {lessons,diagnostic,book} from '../../data.js';
import {emptyState,validateState} from '../../store.js';
import {state,save,touch,replaceState,applyPreferences} from './session.js';
import {icon,esc,lessonFor} from '../ui/shared.js';
import {toast,confirmation} from '../ui/feedback.js';
import {diagnosticResults} from '../ui/questions.js';
import {openCommand} from '../ui/command.js';
import {bookFile,attachBook,removeBook} from '../services/book.js';
import {details} from '../content/index.js';
import {recommendForInterest} from '../engine/engagement.js';
import {READING_SIZES} from '../ui/design-tokens.js';
import {setLocale,languageControl,lessonSearchText,ensureBurmese} from '../i18n/core.js';
import {matchesSearch} from '../engine/text.js';

export function bindActions(root,{path,params,render,navigate,signal}){
  const on=(selector,event,fn)=>root.querySelectorAll(selector).forEach(el=>el.addEventListener(event,fn,{signal}));
  const sidebar=root.querySelector('#sidebar'),workspace=root.querySelector('.workspace');
  if(sidebar)sidebar.insertAdjacentHTML('afterbegin','<button class="icon-button mobile-nav-close" data-close-menu aria-label="Close navigation">'+icon('close')+'</button>');
  function syncMenu(){const mobile=matchMedia('(max-width:760px)').matches,open=document.body.classList.contains('menu-open');if(sidebar)sidebar.inert=mobile&&!open;if(workspace)workspace.inert=mobile&&open;root.querySelector('[data-menu]')?.setAttribute('aria-expanded',mobile&&open);}
  window.addEventListener('resize',syncMenu,{signal});syncMenu();
  on('[data-command]','click',openCommand);
  root.addEventListener('change',async e=>{if(!e.target.matches('[data-language]'))return;const select=e.target,next=select.value;select.disabled=true;try{const selected=await setLocale(next);if(signal.aborted)return;state.studio.language=selected;const [currentPath,currentQuery]=location.hash.slice(1).split('?'),languageParams=new URLSearchParams(currentQuery);languageParams.set('lang',selected);history.replaceState(null,'','#'+currentPath+'?'+languageParams.toString());save();}catch{if(signal.aborted)return;select.value=state.studio.language;toast('The language pack could not load. Check your connection and try again.');}finally{select.disabled=false;}},{signal});
  on('[data-theme]','click',()=>{state.studio.theme=state.studio.theme==='dark'?'light':'dark';save();applyPreferences();});
  on('[data-menu]','click',()=>{const open=document.body.classList.toggle('menu-open');syncMenu();if(open)sidebar.querySelector('[data-close-menu]')?.focus();});
  on('[data-close-menu],.sidebar a','click',()=>{document.body.classList.remove('menu-open');syncMenu();root.querySelector('[data-menu]')?.focus();});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('menu-open')){document.body.classList.remove('menu-open');syncMenu();root.querySelector('[data-menu]')?.focus();}if(e.key==='Tab'&&document.body.classList.contains('menu-open')&&sidebar?.contains(e.target)){const controls=[...sidebar.querySelectorAll('a,button')].filter(el=>el.offsetParent!==null),first=controls[0],last=controls.at(-1);if(e.shiftKey&&e.target===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&e.target===last){e.preventDefault();first.focus();}}},{signal});
  on('[data-note]','input',e=>{state.notes[e.target.dataset.note]=e.target.value;touch(lessonFor(e.target.dataset.note)?.id);save();if(e.target.nextElementSibling)e.target.nextElementSibling.textContent='Saved on this browser';});
  on('[data-bookmark]','click',e=>{const b=e.currentTarget,id=b.dataset.bookmark;state.bookmarks=state.bookmarks.includes(id)?state.bookmarks.filter(x=>x!==id):[...state.bookmarks,id];save();b.setAttribute('aria-pressed',state.bookmarks.includes(id));b.classList.toggle('saved',state.bookmarks.includes(id));toast(state.bookmarks.includes(id)?'Saved to your notebook.':'Removed from saved lessons.');});
  on('[data-complete]','click',e=>{const b=e.currentTarget,id=b.dataset.complete;if(!state.completed.includes(id))state.completed.push(id);touch(id);save();b.innerHTML=icon('check')+'Lesson explored';toast('Exploration recorded. Independent practice measures understanding separately.');});
  on('[data-book-page]','click',e=>{if(bookFile.url)window.open(bookFile.url+'#page='+(Number(e.currentTarget.dataset.bookPage)+book.pageOffset),'_blank','noopener');else{navigate('/resources');toast('Attach your own PDF once to open this textbook page.');}});
  on('#book-upload','change',async e=>{if(!e.target.files[0])return;try{await attachBook(e.target.files[0]);render();toast('Book attached privately on this browser.');}catch(error){toast(error.message);}});
  on('[data-remove-book]','click',async()=>{try{await removeBook();render();toast('Local book attachment removed.');}catch(error){toast(error.message);}});
  on('[data-export]','click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='applied-learning-progress.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);if(root.querySelector('.backup-text-panel'))root.querySelector('.backup-text-panel').open=true;toast('Backup prepared. You can also copy backup text in settings.');});
  function clearLanguageOverride(){const [currentPath,currentQuery]=location.hash.slice(1).split('?'),languageParams=new URLSearchParams(currentQuery);languageParams.delete('lang');const query=languageParams.toString();history.replaceState(null,'','#'+currentPath+(query?'?'+query:''));}
  async function restore(raw){if(raw.length>5e6)throw new Error('Choose a backup smaller than 5 MB.');let parsed;try{parsed=JSON.parse(raw);}catch{throw new Error('The backup text is not valid JSON. Paste an exported Applied backup.');}const imported=validateState(parsed);if(await confirmation('Replace progress, notes and preferences on this browser with this backup?','Restore this backup')){replaceState(imported);clearLanguageOverride();applyPreferences();render();toast('Learning progress restored.');}}
  on('#progress-upload','change',async e=>{if(!e.target.files[0])return;try{await restore(await e.target.files[0].text());}catch(error){toast(error.message||'Invalid backup.');}});
  on('[data-reset]','click',async()=>{if(await confirmation('Clear learning progress, notes, bookmarks and preferences on this browser? Export a backup first to keep them.','Reset progress')){replaceState(emptyState());clearLanguageOverride();applyPreferences();render();toast('Learning progress reset.');}});
  on('[data-atlas-select]','change',e=>navigate('/atlas?lesson='+e.target.value));
  function centerAtlas(){const view=root.querySelector('.atlas-scroll'),node=root.querySelector('.selected-node');if(!view||!node||signal.aborted)return;const box=node.getBoundingClientRect(),frame=view.getBoundingClientRect();view.scrollLeft+=box.left-frame.left+box.width/2-view.clientWidth/2;view.scrollTop+=box.top-frame.top+box.height/2-view.clientHeight/2;}
  on('[data-atlas-zoom]','change',e=>{root.querySelector('.concept-atlas').style.setProperty('--atlas-scale',Number(e.target.value));centerAtlas();});
  if(path==='/atlas')requestAnimationFrame(centerAtlas);
  on('[data-formula-search]','input',async e=>{if(/[\u1000-\u109f]/.test(e.target.value))try{await ensureBurmese();}catch{}if(signal.aborted)return;let count=0;root.querySelectorAll('[data-reference]').forEach(card=>{card.hidden=!matchesSearch(e.target.value,card.dataset.reference,lessonSearchText(card.dataset.referenceId));if(!card.hidden)count++;});root.querySelector('[data-reference-count]').textContent=count+' connections';root.querySelector('.reference-empty').hidden=count>0;});
  on('[data-retrieval]','click',e=>{const active=root.querySelector('.formula-library').classList.toggle('retrieval-active');e.currentTarget.setAttribute('aria-pressed',active);});
  on('[data-reveal-formula]','click',e=>{const active=e.currentTarget.closest('.formula-entry').classList.toggle('formula-revealed');e.currentTarget.textContent=active?'Hide formula':'Reveal formula';});
  function updatePlan(){const n=state.studio.goal,parts=[Math.round(n*.3),Math.round(n*.35)];parts.push(n-parts[0]-parts[1]);root.querySelectorAll('[data-plan-time]').forEach(el=>el.textContent=parts[Number(el.dataset.planTime)]+' min');}
  on('[data-goal]','change',e=>{state.studio.goal=Number(e.target.value);save();updatePlan();});updatePlan();
  on('[data-interest]','click',e=>{state.studio.interest=e.currentTarget.dataset.interest;state.lastLesson=recommendForInterest(lessons,details,state,true).id;save();render();});
  if(path==='/learn'){
    const ready=import('../pages/standard.js'),input=root.querySelector('#lesson-search'),list=root.querySelector('#chapter-list');
    async function updateLessons(){
      list.setAttribute('aria-busy','true');
      const module=await ready;
      if(/[\u1000-\u109f]/.test(input.value))try{await ensureBurmese();}catch{}
      if(signal.aborted)return;
      list.innerHTML=module.chapterList(input.value,module.courseFilter);list.setAttribute('aria-busy','false');
    }
    on('#lesson-search','input',updateLessons);
    on('[data-filter]','click',async e=>{const button=e.currentTarget,module=await ready;if(signal.aborted)return;module.setCourseFilter(button.dataset.filter);root.querySelectorAll('[data-filter]').forEach(b=>{const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});updateLessons();});
    ready.then(()=>{
      if(signal.aborted)return;
      if(params.get('search')){input.value=params.get('search');updateLessons();}
      if(params.get('chapter')){const c=root.querySelectorAll('.chapter')[Number(params.get('chapter'))-1];if(c){c.open=true;c.scrollIntoView({block:'start'});}}
    });
  }
  if(path==='/settings'){
    const cards=root.querySelectorAll('.settings-grid>.path-card');
    cards[0].insertAdjacentHTML('beforeend',`<details class="backup-text-panel"><summary>Use backup text instead</summary><label for="backup-text">Your progress, notes and preferences</label><textarea id="backup-text" rows="7" readonly>${esc(JSON.stringify(state,null,2))}</textarea><button class="text-button" data-copy-backup>Copy backup text</button></details>`);
    cards[1].insertAdjacentHTML('beforeend','<details class="backup-text-panel"><summary>Paste a text backup</summary><label for="import-text">Applied backup JSON</label><textarea id="import-text" rows="7"></textarea><button class="button secondary" data-import-text>Restore from text</button></details>');
    on('[data-copy-backup]','click',async()=>{const f=root.querySelector('#backup-text');f.value=JSON.stringify(state,null,2);try{await navigator.clipboard.writeText(f.value);toast('Backup copied.');}catch{f.focus();f.select();toast('Backup selected. Copy it to keep it.');}});
    on('[data-import-text]','click',async()=>{try{await restore(root.querySelector('#import-text').value);}catch(error){toast(error.message||'Invalid backup.');}});
    root.querySelector('.settings-grid').insertAdjacentHTML('beforeend',`<section class="path-card preference-card"><span class="eyebrow">READING PREFERENCES</span><h2>Make room for how you learn.</h2>${languageControl('settings-language')}<label for="theme-preference">Color theme</label><select id="theme-preference"><option value="light" ${state.studio.theme==='light'?'selected':''}>Daylight</option><option value="dark" ${state.studio.theme==='dark'?'selected':''}>Night studio</option></select><label for="size-preference">Lesson text size</label><select id="size-preference">${Object.entries(READING_SIZES).map(([key,value])=>`<option value="${key}" ${state.studio.textSize===key?'selected':''}>${value.label} · ${value.pixels}px</option>`).join('')}</select><p class="fine-print">High-contrast text, three reading sizes, and your existing progress in one place.</p></section>`);
    on('#theme-preference','change',e=>{state.studio.theme=e.target.value;save();applyPreferences();});
    on('#size-preference','change',e=>{state.studio.textSize=e.target.value;save();applyPreferences();});
  }
  on('[data-diagnostic-result]','click',()=>{if(diagnosticResults.size<diagnostic.length){toast('Check all five answers first.');return;}const score=[...diagnosticResults.values()].filter(v=>v.correct&&v.independent).length;state.diagnostic={score,date:Date.now()};touch();save();root.querySelector('.readiness-result').innerHTML=`<strong>${score}/5 answered independently.</strong><p>${score>=4?'Begin with functions, keeping Appendix A nearby.':'Refresh linear equations, exponents and graphs in Appendix A, then begin with functions.'}</p><a class="text-link" href="#/lesson/1.1">Begin Section 1.1 →</a>`;});
}
