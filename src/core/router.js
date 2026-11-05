import {lessons,areas} from '../../data.js';
import {bindLabs} from '../../labs.js';
import {bindQuestions,diagnosticResults} from '../ui/questions.js';
import {enhanceLabs} from '../ui/lab-tools.js';
import {bindActions} from './actions.js';
import {applyPreferences} from './session.js';
import {loadBook} from '../services/book.js';
import {openCommand} from '../ui/command.js';
import {setLocale,startLocalization,localizeTree,validLocale} from '../i18n/core.js';
import {state,save} from './session.js';
const app=document.querySelector('#app');
let lifecycle=new AbortController(),sequence=0,previous='';
export function readRoute(){const [path,query]=(location.hash.slice(1)||'/').split('?');return {path,params:new URLSearchParams(query)};}
export function navigate(path){if(location.hash==='#'+path)render();else location.hash=path;}
export async function render(){
  const ticket=++sequence,{path,params}=readRoute(),parts=path.split('/').filter(Boolean),key=path+'?'+params.toString();
  lifecycle.abort();lifecycle=new AbortController();const signal=lifecycle.signal;
  document.body.dataset.page=parts[0]||'home';document.body.classList.remove('menu-open');applyPreferences();
  try{
    if(params.has('lang')){state.studio.language=validLocale(params.get('lang'));save();}
    await setLocale(state.studio.language);
    if(ticket!==sequence)return;
    let html,mount=()=>{},answer=()=>{};
    if(parts[0]==='terminology'){
      const page=await import('../pages/terminology.js');html=page.terminologyPage(params);mount=()=>page.mountTerminology(app,params,signal);
    }else if(path==='/'||['atlas','glossary','insights'].includes(parts[0])){
      const page=await import('../pages/explore.js');html=path==='/'?page.workspacePage():parts[0]==='atlas'?page.atlasPage(params):parts[0]==='glossary'?page.glossaryPage():page.insightsPage();
    }else if(parts[0]==='lesson'&&lessons.some(l=>l.id===parts[1])){
      const page=await import('../pages/lesson.js'),lesson=lessons.find(l=>l.id===parts[1]);html=page.lessonPage(lesson,params);mount=()=>page.mountLesson(app,lesson,signal);answer=()=>page.updateEvidence(app,lesson.id);
    }else if(parts[0]==='practice'){
      const page=await import('../pages/practice.js');if(key!==previous)page.resetPractice();html=page.practicePage(params);
      mount=()=>{app.querySelector('[data-next]')?.addEventListener('click',()=>{page.nextQuestion();render();},{signal});app.querySelector('[data-restart]')?.addEventListener('click',()=>{page.resetPractice();render();},{signal});app.querySelector('[data-focus-practice]')?.addEventListener('click',()=>{page.resetPractice();navigate('/practice?section='+app.querySelector('#practice-section').value);},{signal});};
      answer=independent=>{page.registerSessionAnswer(independent);const next=app.querySelector('[data-next]');if(next)next.hidden=false;};
    }else{
      const page=await import('../pages/standard.js');
      if(parts[0]==='learn')html=page.learn(params);
      else if(parts[0]==='applications'&&areas.some(a=>a.id===parts[1]))html=page.applicationPage(areas.find(a=>a.id===parts[1]));
      else if(parts[0]==='labs')html=page.labsPage(parts[1]);
      else if(parts[0]==='notebook')html=page.notebook();
      else if(parts[0]==='resources')html=page.resources();
      else if(parts[0]==='settings')html=page.settings();
      else if(parts[0]==='diagnostic'){diagnosticResults.clear();html=page.diagnosticPage();}
      else html=page.notFound();
    }
    if(ticket!==sequence)return;
    app.innerHTML=html;previous=key;
    bindLabs(app);enhanceLabs(app,signal);bindQuestions(app,answer);bindActions(app,{path,params,render,navigate,signal});mount();
    localizeTree(app);
    document.title=(app.querySelector('h1')?.textContent||'Your studio')+' · Applied';
    document.body.classList.remove('menu-open');window.scrollTo({top:0,behavior:'instant'});app.querySelector('#main')?.focus({preventScroll:true});
  }catch(error){
    console.error(error);
    if(ticket===sequence)app.innerHTML='<main class="route-error"><h1>This connection needs another try.</h1><p>Your saved progress is still in this browser. Reload to try again.</p><button class="button primary" id="retry-route">Try again</button></main>';
    app.querySelector('#retry-route')?.addEventListener('click',()=>render(),{once:true});
  }
}
window.addEventListener('hashchange',render);
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand();}});
document.querySelector('.skip-link').addEventListener('click',e=>{e.preventDefault();app.querySelector('#main')?.focus();});
window.addEventListener('storage',e=>{if(e.key==='applied-studio-v1')document.dispatchEvent(new CustomEvent('studio:notice',{detail:'Progress changed in another tab. Reload to use the latest saved state.'}));});
startLocalization();
render();
loadBook().then(()=>{if(readRoute().path==='/resources')render();}).catch(()=>{});
