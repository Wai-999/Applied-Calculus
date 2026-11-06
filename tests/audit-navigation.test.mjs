import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Run the production event handlers with viewport and focus under test control.
// Other action dependencies are unused in these navigation-only scenarios.
const source=(await readFile(new URL('../src/core/actions.js',import.meta.url),'utf8'))
  .replace(/^import .*;\n/gm,'').replace('export function bindActions','function bindActions');

function harness(){
  let mobile=true;
  const document={activeElement:null};
  class Element{
    constructor(){this.listeners=new Map();this.nodes=new Map();this.attributes={};this.inert=false;this.offsetParent={};const classes=new Set();this.classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle:name=>{if(classes.has(name)){classes.delete(name);return false;}classes.add(name);return true;}};}
    addEventListener(type,fn,{signal}={}){const handlers=this.listeners.get(type)||[];handlers.push(fn);this.listeners.set(type,handlers);signal?.addEventListener('abort',()=>this.listeners.set(type,handlers.filter(f=>f!==fn)),{once:true});}
    fire(type,event={}){const e={target:this,currentTarget:this,prevented:false,preventDefault(){this.prevented=true;},...event};for(const fn of this.listeners.get(type)||[])fn(e);return e;}
    querySelector(selector){const found=this.nodes.get(selector);return Array.isArray(found)?found[0]:found||null;}
    querySelectorAll(selector){const found=this.nodes.get(selector);return Array.isArray(found)?found:found?[found]:[];}
    setAttribute(name,value){this.attributes[name]=String(value);}
    insertAdjacentHTML(){}
    contains(element){return this===element||this.controls?.includes(element)||false;}
    focus(){document.activeElement=this;}
  }
  const root=new Element(),window=new Element(),sidebar=new Element(),workspace=new Element(),opener=new Element(),closer=new Element(),firstLink=new Element(),lastLink=new Element();
  document.body=new Element();
  sidebar.controls=[closer,firstLink,lastLink];sidebar.nodes.set('[data-close-menu]',closer);sidebar.nodes.set('a',firstLink);sidebar.nodes.set('a,button',sidebar.controls);
  root.nodes.set('#sidebar',sidebar);root.nodes.set('.workspace',workspace);root.nodes.set('[data-menu]',opener);root.nodes.set('[data-close-menu],.sidebar a',[closer,firstLink,lastLink]);
  const context=vm.createContext({document,window,matchMedia:()=>({matches:mobile}),icon:()=>'',openCommand(){},state:{studio:{goal:20}}});
  const bind=vm.runInContext(source+'\n;bindActions;',context),controller=new AbortController();
  bind(root,{path:'/lesson/1.1',params:new URLSearchParams(),render(){},navigate(){},signal:controller.signal});
  return {root,window,document,sidebar,workspace,opener,closer,firstLink,lastLink,controller,resize(value){mobile=value;closer.offsetParent=value?{}:null;window.fire('resize');}};
}

test('An open phone menu releases focus and keyboard trapping when resized to desktop',()=>{
  const h=harness();
  h.opener.fire('click');
  assert.equal(h.document.activeElement,h.closer);assert.equal(h.workspace.inert,true);
  h.resize(false);
  assert.equal(h.document.body.classList.contains('menu-open'),false);
  assert.equal(h.sidebar.inert,false);assert.equal(h.workspace.inert,false);
  assert.equal(h.opener.attributes['aria-expanded'],'false');
  assert.equal(h.document.activeElement,h.firstLink);
  h.lastLink.focus();
  assert.equal(h.root.fire('keydown',{target:h.lastLink,key:'Tab'}).prevented,false);
  assert.equal(h.document.activeElement,h.lastLink);
  h.resize(true);
  assert.equal(h.sidebar.inert,true);assert.equal(h.workspace.inert,false);
});

test('Phone navigation still contains Tab focus and Escape returns to its opener',()=>{
  const h=harness();
  assert.equal(h.sidebar.inert,true);
  h.opener.fire('click');
  assert.equal(h.sidebar.inert,false);assert.equal(h.opener.attributes['aria-expanded'],'true');
  h.lastLink.focus();
  assert.equal(h.root.fire('keydown',{target:h.lastLink,key:'Tab'}).prevented,true);
  assert.equal(h.document.activeElement,h.closer);
  assert.equal(h.root.fire('keydown',{target:h.closer,key:'Tab',shiftKey:true}).prevented,true);
  assert.equal(h.document.activeElement,h.lastLink);
  h.root.fire('keydown',{target:h.lastLink,key:'Escape'});
  assert.equal(h.document.body.classList.contains('menu-open'),false);
  assert.equal(h.sidebar.inert,true);assert.equal(h.workspace.inert,false);
  assert.equal(h.document.activeElement,h.opener);
});

test('A pane transition moves focus from its now-hidden action to the selected lesson tab',async()=>{
  const lessonSource=await readFile(new URL('../src/pages/lesson.js',import.meta.url),'utf8');
  const switchSource=lessonSource.match(/  function switchView\(view\)\{[\s\S]*?\n  \}/)?.[0];
  assert.ok(switchSource,'The lesson must provide a view transition handler.');
  const document={activeElement:{name:'Continue action in the previous pane'}};
  const modes=['understand','reason','experiment','practice'];
  const tabs=modes.map(mode=>({dataset:{lessonTab:mode},attributes:{},setAttribute(name,value){this.attributes[name]=value;},focus(options){document.activeElement=this;this.focusOptions=options;}}));
  const panels=modes.map(mode=>({id:'panel-'+mode,hidden:mode!=='understand'}));
  const sections={hidden:false},tablist={scrollIntoView(){}};
  const root={querySelectorAll:selector=>selector==='[data-lesson-tab]'?tabs:panels,querySelector:selector=>selector==='.section-navigation'?sections:selector==='.lesson-tabs'?tablist:tabs.find(tab=>selector==='[data-lesson-tab="'+tab.dataset.lessonTab+'"]')};
  const switchView=vm.runInNewContext(switchSource+'\n;switchView;',{root,history:{replaceState(){}},l:{id:'1.1'}});
  switchView('reason');
  assert.equal(document.activeElement,tabs[1]);assert.equal(document.activeElement.attributes['aria-selected'],true);
  assert.equal(document.activeElement.focusOptions.preventScroll,true);
  assert.equal(panels[0].hidden,true);assert.equal(panels[1].hidden,false);
  switchView('experiment');assert.equal(document.activeElement,tabs[2]);
});

async function guideHarness(){
  const guideSource=(await readFile(new URL('../src/ui/lesson-guide.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replaceAll('export function ','function ');
  const document={activeElement:null},queued=[];
  class Control{
    constructor(){this.handlers=new Map();this.nodes=new Map();}
    addEventListener(type,fn){const handlers=this.handlers.get(type)||[];handlers.push(fn);this.handlers.set(type,handlers);}
    fire(type){for(const fn of this.handlers.get(type)||[])fn();}
    querySelector(selector){return this.nodes.get(selector)||null;}
    querySelectorAll(){return [];}
    setAttribute(){}
    focus(){document.activeElement=this;}
    remove(){this.removed=true;}
  }
  const trigger=new Control(),reasonTab=new Control(),root=new Control(),dialog=new Control(),closer=new Control(),reasonAction=new Control(),controller=new AbortController(),switches=[];
  root.nodes.set('[data-lesson-guide]',trigger);dialog.nodes.set('[data-close-guide]',closer);dialog.nodes.set('[data-guide-reason]',reasonAction);
  dialog.showModal=()=>{dialog.open=true;closer.focus();};
  // Native dialogs restore focus before dispatching their queued close event.
  dialog.close=()=>{dialog.open=false;trigger.focus();queued.push(()=>dialog.fire('close'));};
  document.createElement=()=>dialog;document.body={append(){}};
  const context=vm.createContext({document,details:{'1.1':{explanation:[],example:{steps:[]},symbols:[],prerequisites:[]}},localizeTree(){},esc:String,icon:()=>'',math:()=>''});
  const mount=vm.runInContext(guideSource+'\n;mountLessonGuide;',context);
  mount(root,{id:'1.1'},controller.signal,view=>{switches.push(view);reasonTab.focus();});
  trigger.fire('click');
  return {document,trigger,reasonTab,dialog,closer,reasonAction,switches,controller,flush(){for(const fn of queued.splice(0))fn();}};
}

test('The guide reasoning action focuses the requested lesson mode after native dialog focus restoration',async()=>{
  const h=await guideHarness();h.reasonAction.fire('click');
  assert.equal(h.document.activeElement,h.trigger);assert.deepEqual(h.switches,[]);
  h.flush();
  assert.equal(h.dialog.removed,true);assert.deepEqual(h.switches,['reason']);
  assert.equal(h.document.activeElement,h.reasonTab);
});

test('Closing the guide normally restores help focus and an obsolete guide cannot change a later page',async()=>{
  const h=await guideHarness();h.closer.fire('click');h.flush();
  assert.equal(h.document.activeElement,h.trigger);assert.deepEqual(h.switches,[]);
  const obsolete=await guideHarness();obsolete.reasonAction.fire('click');obsolete.controller.abort();obsolete.flush();
  assert.deepEqual(obsolete.switches,[]);
});
