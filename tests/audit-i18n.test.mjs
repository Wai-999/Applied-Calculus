import test from 'node:test';
import assert from 'node:assert/strict';
import {burmese} from '../src/i18n/my/index.js';

// A small DOM adapter exercises the real event handlers without adding a browser
// dependency to the test suite. Browser focus trapping and announcements are also
// checked manually in the audit; this adapter covers handler decisions and state.
class Element {
  constructor(tag='div',parent=null){this.tagName=tag.toUpperCase();this.nodeType=1;this.parentElement=parent;this.childNodes=[];this.attributes={};this.events={};this.isConnected=false;this.value='';this.links=[];}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  hasAttribute(name){return name in this.attributes;}
  get className(){return this.getAttribute('class')||'';}
  set className(value){this.setAttribute('class',value);}
  get classList(){return {toggle:(name,on)=>{const classes=new Set(this.className.split(' ').filter(Boolean));on?classes.add(name):classes.delete(name);this.className=[...classes].join(' ');}};}
  closest(selector){if(selector==='.command-result'&&this.className.split(' ').includes('command-result'))return this;return this.protected||this.parentElement?.closest(selector)||null;}
  matches(){return false;}
  addEventListener(type,callback){(this.events[type]||=[]).push(callback);}
  emit(type,event={}){event.target??=this;event.preventDefault??=()=>{event.defaultPrevented=true;};for(const callback of this.events[type]||[])callback(event);return event;}
  focus(){document.activeElement=this;this.dialog?.emit('focusin',{target:this});}
  scrollIntoView(){}
  close(){this.open=false;this.emit('close');}
  remove(){this.isConnected=false;if(document.dialog===this)document.dialog=null;}
  showModal(){this.open=true;}
  set innerHTML(html){
    this.html=html;
    if(this.tagName==='DIALOG'){
      this.parts=new Map();
      for(const [selector,tag] of [['input','input'],['[data-close-command]','button'],['.command-results','div'],['[data-command-status]','p']]){
        const element=new Element(tag,this);element.dialog=this;this.parts.set(selector,element);
      }
    }else if(this===this.dialog?.querySelector('.command-results')){
      this.links=[...html.matchAll(/<a class="([^"]*)" href="([^"]*)"/g)].map(([,classes,href])=>{const element=new Element('a',this);element.dialog=this.dialog;element.className=classes;element.setAttribute('href',href);return element;});
    }
  }
  get innerHTML(){return this.html||'';}
  querySelector(selector){return this.parts?.get(selector)||null;}
  querySelectorAll(selector){return selector==='.command-result'?this.querySelector('.command-results').links:[];}
}
globalThis.document={
  activeElement:null,dialog:null,
  createElement:tag=>new Element(tag),
  createTreeWalker:()=>({nextNode:()=>false}),
  querySelector:selector=>selector==='.command-dialog'?document.dialog:null,
  body:{append:element=>{element.isConnected=true;document.dialog=element;}}
};
globalThis.NodeFilter={SHOW_ELEMENT:1,SHOW_TEXT:4,FILTER_REJECT:2,FILTER_ACCEPT:1};
globalThis.location={hash:''};
const locale=await import('../src/i18n/core.js');
const {openCommand}=await import('../src/ui/command.js');
const textNode=(value,parent=new Element())=>({nodeType:3,data:value,parentElement:parent});

test('Repeated locale changes preserve source text, math, notes and editable values',async()=>{
  const generated=textNode('Functions'),formula=textNode('Functions'),note=textNode('Functions'),input=new Element('input');
  formula.parentElement.protected=true;note.parentElement.protected=true;
  input.value='၁/၂';input.setAttribute('placeholder','Number or fraction');
  await locale.setLocale('my');
  for(const node of [generated,formula,note,input])locale.localizeTree(node);
  assert.equal(generated.data,burmese.translate('Functions'));
  assert.equal(locale.sourceText(generated),'Functions');
  assert.equal(formula.data,'Functions');assert.equal(note.data,'Functions');assert.equal(input.value,'၁/၂');
  assert.equal(input.getAttribute('placeholder'),burmese.translate('Number or fraction'));
  await locale.setLocale('en');
  for(const node of [generated,formula,note,input])locale.localizeTree(node);
  assert.equal(generated.data,'Functions');assert.equal(input.getAttribute('placeholder'),'Number or fraction');assert.equal(input.value,'၁/၂');
});

test('Canonical result text follows synchronous updates before the mutation observer runs',async()=>{
  await locale.setLocale('my');
  const result=textNode('12 units');locale.localizeTree(result);
  assert.equal(locale.sourceText(result),'12 units');
  result.data='18 units';
  assert.equal(locale.sourceText(result),'18 units');
  locale.localizeTree(result);assert.equal(locale.sourceText(result),'18 units');
  result.data='';assert.equal(locale.sourceText(result),'');
  locale.localizeTree(result);await locale.setLocale('en');locale.localizeTree(result);assert.equal(result.data,'');
});

test('Palette Enter honors the focused button and native result link',async()=>{
  await locale.setLocale('en');location.hash='';
  const trigger=new Element('button');trigger.isConnected=true;document.activeElement=trigger;
  openCommand();const dialog=document.dialog,close=dialog.querySelector('[data-close-command]'),input=dialog.querySelector('input');
  const closeEnter=dialog.emit('keydown',{key:'Enter',target:close});
  assert.equal(closeEnter.defaultPrevented,undefined);assert.equal(dialog.open,true);assert.equal(location.hash,'');
  const links=dialog.querySelectorAll('.command-result'),last=links.at(-1);
  const linkEnter=dialog.emit('keydown',{key:'Enter',target:last});
  assert.equal(linkEnter.defaultPrevented,undefined);assert.equal(location.hash,'');
  assert.doesNotMatch(dialog.querySelector('.command-results').innerHTML,/<a[^>]+role="listitem"/);
  assert.match(dialog.querySelector('.command-results').innerHTML,/<div role="listitem"><a/);
  dialog.emit('keydown',{key:'Enter',target:input,isComposing:true});assert.equal(dialog.open,true);
  close.emit('click');assert.equal(document.dialog,null);assert.equal(document.activeElement,trigger);
});

test('Palette arrows move real focus and input Enter opens the selected route',()=>{
  location.hash='';document.activeElement=new Element('button');openCommand();
  const dialog=document.dialog,input=dialog.querySelector('input'),links=dialog.querySelectorAll('.command-result');
  dialog.emit('keydown',{key:'ArrowDown',target:input});assert.equal(document.activeElement,links[0]);
  dialog.emit('keydown',{key:'ArrowUp',target:links[0]});assert.equal(document.activeElement,links.at(-1));
  dialog.emit('keydown',{key:'Enter',target:input});assert.equal(location.hash,links.at(-1).getAttribute('href').slice(1));assert.equal(document.dialog,null);
});

test('Palette result announcements retain the same count in Burmese',()=>{
  for(const count of [0,1,12]){const source=count+' search results',translated=burmese.translate(source);assert.notEqual(translated,source);assert.ok(translated.includes(String(count)));}
});
