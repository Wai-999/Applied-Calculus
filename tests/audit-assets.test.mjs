import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {lessons,areas,labCatalog,chapters} from '../data.js';
import {terminology} from '../src/content/terminology.js';
import {emptyState} from '../store.js';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
async function filesUnder(path){
  if((await stat(path)).isFile())return [path];
  return (await Promise.all((await readdir(path)).map(name=>filesUnder(resolve(path,name))))).flat();
}
// Follow the build's actual copy manifest so the test also works before dist exists.
const build=await readFile(resolve(project,'scripts/build.mjs'),'utf8');
const manifest=JSON.parse(build.match(/for \(const file of (\[[^\]]+\])/)[1].replaceAll("'",'"'));
const published=(await Promise.all(manifest.map(name=>filesUnder(resolve(project,name))))).flat();
const publishedNames=new Set(published.map(path=>relative(project,path)));
const localTarget=(file,specifier)=>relative(project,resolve(dirname(file),specifier.split(/[?#]/)[0]));

test('Every published local module, stylesheet and HTML asset resolves inside the build manifest',async()=>{
  let references=0;
  for(const file of published){
    const extension=extname(file);
    if(!['.js','.css','.html'].includes(extension))continue;
    const source=await readFile(file,'utf8'),specifiers=[];
    if(extension==='.js'){
      const imports=/\b(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      for(const match of source.matchAll(imports))specifiers.push(match[1]||match[2]);
    }
    if(extension==='.css')for(const match of source.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g))specifiers.push(match[1]);
    if(extension==='.html')for(const match of source.matchAll(/\b(?:src|href)\s*=\s*['"]([^'"]+)['"]/g))specifiers.push(match[1]);
    for(const specifier of specifiers){
      if(/^(?:data:|https?:|#)/.test(specifier))continue;
      if(extension==='.js')assert.ok(specifier.startsWith('.'),`${relative(project,file)}: unsupported browser specifier ${specifier}`);
      const target=localTarget(file,specifier);
      assert.ok(publishedNames.has(target),`${relative(project,file)}: missing published dependency ${specifier}`);
      references++;
    }
  }
  assert.ok(references>100,'The check must cover the module graph and bundled font references.');
});

test('The public build manifest contains web assets without textbook, credential or learner-backup payloads',async()=>{
  for(const file of published){
    const name=relative(project,file),bytes=await readFile(file);
    assert.ok(!name.split('/').some(part=>part.startsWith('.')),name);
    assert.ok(!/(?:^|\/)(?:credentials|id_rsa|id_ed25519|.*backup.*|applied-learning-progress)(?:\.|\/|$)/i.test(name),name);
    assert.ok(['.html','.css','.js','.svg','.ttf','.woff','.woff2','.txt','.md','.json'].includes(extname(file)),name);
    assert.notEqual(bytes.subarray(0,5).toString(),'%PDF-',name);
    if(['.js','.json','.md','.txt','.html'].includes(extname(file))){
      const source=bytes.toString();
      assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source),name);
      assert.ok(!/\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/.test(source),name);
      if(extname(file)==='.json'){
        const value=JSON.parse(source);
        assert.ok(!(value&&typeof value==='object'&&'notes' in value&&'attempts' in value&&'completed' in value),name);
      }
    }
  }
});

globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.document=Object.assign(new EventTarget(),{compatMode:'CSS1Compat'});
const session=await import('../src/core/session.js');
const standard=await import('../src/pages/standard.js');
const explore=await import('../src/pages/explore.js');
const practice=await import('../src/pages/practice.js');
const {lessonPage}=await import('../src/pages/lesson.js');
const {terminologyPage}=await import('../src/pages/terminology.js');
const lessonIds=new Set(lessons.map(l=>l.id)),areaIds=new Set(areas.map(a=>a.id));
const labIds=new Set(labCatalog.map(l=>l.id)),termIds=new Set(terminology.map(t=>t.id));
function checkRoute(href){
  const route=new URL(href.slice(1),'https://applied.example'),parts=route.pathname.split('/').filter(Boolean),params=route.searchParams;
  if(parts[0]==='lesson'){assert.equal(parts.length,2,href);assert.ok(lessonIds.has(parts[1]),href);}
  else if(parts[0]==='applications'){assert.equal(parts.length,2,href);assert.ok(areaIds.has(parts[1]),href);}
  else if(parts[0]==='labs'&&parts.length>1){assert.equal(parts.length,2,href);assert.ok(labIds.has(parts[1]),href);}
  else {assert.ok(parts.length<=1,href);assert.ok(['','learn','labs','practice','notebook','resources','settings','diagnostic','atlas','glossary','insights','terminology'].includes(parts[0]||''),href);}
  for(const key of ['lesson','section'])if(params.has(key))assert.ok(lessonIds.has(params.get(key)),href);
  if(params.has('area'))assert.ok(areaIds.has(params.get('area')),href);
  if(params.has('term'))assert.ok(termIds.has(params.get('term')),href);
  if(params.has('chapter'))assert.ok(chapters.some(c=>String(c.number)===params.get('chapter')),href);
  if(params.has('view'))assert.ok(['understand','reason','experiment','practice'].includes(params.get('view')),href);
  if(params.has('mode'))assert.equal(params.get('mode'),'review',href);
}

test('Generated lessons, applications, labs, references and saved-note links target real routes and IDs',()=>{
  const state=emptyState();
  state.bookmarks=lessons.map(l=>l.id);
  for(const l of lessons){state.notes[l.id]='Synthetic audit reflection';state.notes['experiment-'+l.id]='Synthetic audit observation';}
  for(const a of areas)state.notes['project-'+a.id]='Synthetic audit recommendation';
  session.replaceState(state);
  const pages=[standard.learn(new URLSearchParams()),standard.labsPage(),standard.notebook(),standard.resources(),standard.settings(),standard.diagnosticPage(),
    explore.workspacePage(),explore.glossaryPage(),explore.insightsPage(),terminologyPage(new URLSearchParams())];
  for(const a of areas){pages.push(standard.applicationPage(a),standard.learn(new URLSearchParams({area:a.id})));}
  for(const lab of labCatalog)pages.push(standard.labsPage(lab.id));
  for(const l of lessons){
    for(const view of ['understand','reason','experiment','practice'])pages.push(lessonPage(l,new URLSearchParams({view})));
    pages.push(explore.atlasPage(new URLSearchParams({lesson:l.id})),terminologyPage(new URLSearchParams({lesson:l.id})));
    practice.resetPractice();pages.push(practice.practicePage(new URLSearchParams({section:l.id})));
  }
  for(const term of terminology)pages.push(terminologyPage(new URLSearchParams({term:term.id})));
  const links=new Set();
  for(const html of pages)for(const match of html.matchAll(/\bhref=['"](#\/[^'"]*)['"]/g))links.add(match[1].replaceAll('&amp;','&'));
  for(const href of links)checkRoute(href);
  assert.ok(links.size>300,'Coverage includes every lesson, laboratory and terminology permalink.');
});
