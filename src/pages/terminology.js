import {terminology} from '../content/terminology.js';
import {shell} from '../ui/shell.js';
import {esc,icon,lessonFor,sectionHead} from '../ui/shared.js';
import {matchesSearch,normalizeSearch} from '../engine/text.js';

const categoryNames={
  foundations:'Foundations & notation',change:'Change & derivatives',
  accumulation:'Accumulation & integration',models:'Applied models',
  multivariable:'Several variables',trigonometry:'Trigonometry',statistics:'Data & statistics'
};
const searchable=term=>[term.symbol,term.id,...Object.values(term.en),...Object.values(term.my),...(term.aliases||[])].join(' ');
export function filterTerminology(query='',category='all',lesson=''){
  const matches=terminology.filter(term=>(category==='all'||term.category===category)&&(!lesson||term.lessons.includes(lesson))&&matchesSearch(query,searchable(term)));
  const needle=normalizeSearch(query);if(!needle)return matches;
  const score=term=>{const names=[term.en.term,term.my.term.replace(/\([^)]*\)/g,'').trim(),...(term.aliases||[])].map(normalizeSearch);return names.some(name=>name===needle)?100:normalizeSearch(term.symbol)===needle?90:names.some(name=>name.includes(needle))?50:0;};
  return matches.sort((a,b)=>score(b)-score(a));
}
function termCard(term,open=false){
  return `<details class="term-card" id="term-${term.id}" data-term-id="${term.id}" ${open?'open':''}><summary><span class="term-summary-copy"><small>${esc(categoryNames[term.category]||term.category)}</small><strong>${esc(term.en.term)}</strong><span class="term-native" lang="my" data-no-translate>${esc(term.my.term)}</span><span class="term-english" lang="en" data-no-translate>${esc(term.en.term)}</span></span><span class="term-symbol" data-no-translate>${esc(term.symbol)}</span><span class="term-expand" aria-hidden="true">+</span></summary><div class="term-explanation"><dl><div><dt>What it means</dt><dd>${esc(term.en.meaning)}</dd></div><div><dt>When and why you use it</dt><dd>${esc(term.en.usage)}</dd></div><div class="term-example"><dt>A concrete example</dt><dd>${esc(term.en.example)}</dd></div></dl><div class="term-lessons"><strong>Learn it in context</strong>${term.lessons.map(id=>`<a href="#/lesson/${id}"><span>${id}</span>${esc(lessonFor(id)?.title||id)} ${icon('arrow')}</a>`).join('')}</div><a class="term-permalink" href="#/terminology?term=${term.id}">Link to this term ${icon('arrow')}</a></div></details>`;
}
export function terminologyPage(params){
  const selected=terminology.find(term=>term.id===params.get('term'));
  const lesson=lessonFor(params.get('lesson')),categories=[...new Set(terminology.map(term=>term.category))];
  return shell(`${sectionHead('A LANGUAGE FOR UNDERSTANDING','Mathematical terminology & usage.','Look up a symbol, understand a term, and see when to use it. This reference covers the concepts and notation used in the book’s eight chapters. Search in English or Burmese.')}<div class="terminology-intro"><p>Knowing a formula is easier when its words make sense. Open a term for its meaning, its practical purpose, and an example.</p><div class="term-quick-start" role="group" aria-label="Start with a mathematical idea"><button data-term-suggest="derivative"><span data-no-translate>dy/dx</span>Understand a rate</button><button data-term-suggest="integral"><span data-no-translate>∫</span>Understand a total</button><button data-term-suggest="partial"><span data-no-translate>∂</span>Isolate one input</button><button data-term-suggest="domain"><span data-no-translate>x ∈ D</span>Check allowed inputs</button></div></div><section class="terminology-workspace" aria-label="Mathematical reference"><div class="terminology-tools"><label class="search-box">${icon('search')}<input type="search" id="term-search" data-term-search placeholder="Search a word or symbol: derivative, ∫, ဆင်းသက်ကိန်း…" aria-label="Search mathematical terms" value="${esc(params.get('search')||'')}"></label><label class="term-category-filter" for="term-category">Topic<select id="term-category" data-term-category><option value="all">All mathematical topics</option>${categories.map(category=>`<option value="${category}">${esc(categoryNames[category]||category)}</option>`).join('')}</select></label></div>${lesson?`<div class="term-lesson-scope"><span>Terms connected to ${lesson.id} · ${esc(lesson.title)}</span><a class="text-link" href="#/terminology">Show every term ${icon('arrow')}</a></div>`:''}<div class="term-results-heading"><span data-term-count role="status" aria-live="polite"></span><span>Open a term to explore it</span></div><div class="term-list" data-term-list>${(lesson?filterTerminology('','all',lesson.id):terminology).map(term=>termCard(term,term.id===selected?.id)).join('')}</div><div class="empty-state" data-term-empty hidden><h2>No matching terms yet.</h2><p>Try an English term, its Burmese explanation, or a symbol such as ∫ or ∂. You can also choose all mathematical topics.</p></div></section><section class="terminology-language-note"><strong>Connect the languages, keep the mathematics.</strong><p>Burmese explanations use Unicode text and retain English technical anchors. Formula notation, original numerical values and textbook section numbers stay consistent when you switch language.</p><p>This is a book-focused learning reference, not an official or exhaustive Burmese mathematics dictionary.</p></section>`,'Mathematical terminology','terminology');
}
export function mountTerminology(root,params,signal){
  const search=root.querySelector('[data-term-search]'),category=root.querySelector('[data-term-category]'),lesson=lessonFor(params.get('lesson'))?.id||'';
  function filter(){
    const ordered=filterTerminology(search.value,category.value,lesson),matches=new Set(ordered.map(term=>term.id));
    root.querySelectorAll('[data-term-id]').forEach(card=>{card.hidden=!matches.has(card.dataset.termId);});
    const list=root.querySelector('[data-term-list]');for(const term of ordered)list.append(root.querySelector('[data-term-id="'+term.id+'"]'));
    root.querySelector('[data-term-count]').textContent=matches.size+' of '+root.querySelectorAll('[data-term-id]').length+' terms';
    root.querySelector('[data-term-empty]').hidden=matches.size>0;
  }
  search.addEventListener('input',filter,{signal});category.addEventListener('change',filter,{signal});
  root.querySelectorAll('[data-term-suggest]').forEach(button=>button.addEventListener('click',()=>{
    search.value=button.dataset.termSuggest;category.value='all';filter();
    const first=[...root.querySelectorAll('[data-term-id]')].find(card=>!card.hidden);if(first){first.open=true;first.scrollIntoView({block:'start',behavior:'instant'});}else search.focus();
  },{signal}));
  filter();
  const selected=root.querySelector('#term-'+CSS.escape(params.get('term')||''));
  if(selected)requestAnimationFrame(()=>{if(!signal.aborted)selected.scrollIntoView({block:'start',behavior:'instant'});});
}
