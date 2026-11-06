import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {emptyState,validateState} from '../store.js';

// Exercise actual action handlers while controlling failed persistence and files.
const source=(await readFile(new URL('../src/core/actions.js',import.meta.url),'utf8'))
  .replace(/^import .*;\n/gm,'').replace('export function bindActions','function bindActions');
function harness({recovery=null,saved=true}={}){
  class Element{
    constructor(){this.listeners=new Map();this.nodes=new Map();this.dataset={};this.value='';this.disabled=false;this.markup='';this.textContent='';const classes=new Set();this.classList={contains:n=>classes.has(n),remove:n=>classes.delete(n)};}
    addEventListener(type,fn){const handlers=this.listeners.get(type)||[];handlers.push(fn);this.listeners.set(type,handlers);}
    async fire(type,event={}){for(const fn of this.listeners.get(type)||[])await fn({target:this,currentTarget:this,preventDefault(){},...event});}
    querySelector(selector){const found=this.nodes.get(selector);return Array.isArray(found)?found[0]:found||null;}
    querySelectorAll(selector){const found=this.nodes.get(selector);return Array.isArray(found)?found:found?[found]:[];}
    insertAdjacentHTML(_position,html){this.markup+=html;}
    append(){}
    setAttribute(){}
    focus(){}
    select(){}
    remove(){}
  }
  const h={state:emptyState(),notices:[],downloads:[],urls:new Map(),raw:recovery,saved,attachments:0,attachmentError:null,renders:0};
  h.state.studio={goal:20,language:'en',theme:'light',textSize:'comfortable'};
  h.root=new Element();h.grid=new Element();h.root.nodes.set('.settings-grid',h.grid);h.root.nodes.set('.settings-grid>.path-card',[new Element(),new Element()]);
  for(const selector of ['[data-note]','#book-upload','[data-export]','[data-download-recovery]','[data-import-text]','#import-text','[data-reset]'])h.root.nodes.set(selector,new Element());
  h.note=h.root.querySelector('[data-note]');h.note.dataset.note='1.1';h.note.nextElementSibling=new Element();
  h.file=h.root.querySelector('#book-upload');
  const document={body:new Element(),activeElement:null,createElement(){const link=new Element();link.click=()=>h.downloads.push({name:link.download,url:link.href});return link;}};
  const location={hash:'#/settings'},history={replaceState(_a,_b,url){location.hash=url;}};
  let context;
  context=vm.createContext({document,window:new Element(),location,history,matchMedia:()=>({matches:false}),
    state:h.state,save:()=>h.saved,touch(){},emptyState,validateState,loadRecoveryBackup:()=>h.raw,
    replaceState(value){h.state=value;context.state=value;return h.saved;},applyPreferences(){},
    icon:()=>'',esc:String,lessonFor:()=>({id:'1.1'}),openCommand(){},toast:message=>h.notices.push(message),confirmation:async()=>true,
    languageControl:()=>'',READING_SIZES:{comfortable:{label:'Comfortable',pixels:20}},
    bookFile:{},async attachBook(){h.attachments++;if(h.attachmentError)throw h.attachmentError;},
    Blob,URLSearchParams,URL:{createObjectURL(blob){const url='blob:audit-'+h.urls.size;h.urls.set(url,blob);return url;},revokeObjectURL(){}},setTimeout(){},
  });
  const bind=vm.runInContext(source+'\n;bindActions;',context);
  bind(h.root,{path:'/settings',params:new URLSearchParams(),render(){h.renders++;},navigate(){},signal:new AbortController().signal});
  return h;
}

test('Failed note persistence is disclosed and a later successful save updates the status',async()=>{
  const h=harness({saved:false});h.note.value='My reasoning stays available in this session.';
  await h.note.fire('input');
  assert.equal(h.state.notes['1.1'],h.note.value);
  assert.equal(h.note.nextElementSibling.textContent,'Not saved. Export a backup before leaving this page.');
  h.saved=true;await h.note.fire('input');
  assert.equal(h.note.nextElementSibling.textContent,'Saved on this browser');
});

test('Recovery download preserves the exact unreadable original without rendering it as markup',async()=>{
  const raw='{"notes":{"1.1":"<script>private original</script>"}, broken';
  const h=harness({recovery:raw});
  assert.match(h.grid.markup,/Download original record/);assert.ok(!h.grid.markup.includes(raw));assert.ok(!h.grid.markup.includes('<script>'));
  await h.root.querySelector('[data-download-recovery]').fire('click');
  const download=h.downloads[0];assert.equal(download.name,'applied-original-record.json');
  assert.equal(await h.urls.get(download.url).text(),raw);assert.equal(h.raw,raw);
  const clean=harness();assert.ok(!clean.grid.markup.includes('recovery-card'));
});

test('Restoring or resetting with unavailable storage reports session-only results',async()=>{
  const h=harness({saved:false}),backup=emptyState();backup.notes['1.1']='Imported reasoning';
  h.root.querySelector('#import-text').value=JSON.stringify(backup);
  await h.root.querySelector('[data-import-text]').fire('click');
  assert.equal(h.state.notes['1.1'],'Imported reasoning');
  assert.match(h.notices.at(-1),/session.*browser storage is unavailable/);
  await h.root.querySelector('[data-reset]').fire('click');
  assert.match(h.notices.at(-1),/session only.*could not be updated/);
});

test('A failed book attachment releases the input so the same file can be retried',async()=>{
  const h=harness();h.file.files=[{name:'my-book.pdf'}];h.file.value='my-book.pdf';h.attachmentError=new Error('Book storage is full or unavailable.');
  await h.file.fire('change');
  assert.equal(h.file.disabled,false);assert.equal(h.file.value,'');assert.equal(h.renders,0);
  assert.match(h.notices.at(-1),/storage is full/);
  h.attachmentError=null;h.file.value='my-book.pdf';await h.file.fire('change');
  assert.equal(h.attachments,2);assert.equal(h.renders,1);assert.equal(h.file.disabled,false);assert.equal(h.file.value,'');
});
