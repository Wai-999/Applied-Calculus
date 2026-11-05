import {details} from '../content/index.js';
import {esc,icon,lessonFor} from './shared.js';
import {math} from './math.js';

export function guideButton(){
  return `<button class="lesson-guide-button" data-lesson-guide>${icon('spark')}<span>Help me understand</span></button>`;
}
export function mountLessonGuide(root,l,signal,switchView){
  let dialog;
  root.querySelector('[data-lesson-guide]').addEventListener('click',()=>{
    if(dialog?.open)return;
    const d=details[l.id];
    const topics=[
      ['meaning','Say it in plain words',`<p class="guide-lead">${esc(l.idea)}</p>${d.explanation.map(p=>`<p>${esc(p)}</p>`).join('')}<div class="guide-takeaway"><strong>Why you are learning this</strong><p>${esc(l.why)}</p></div>`],
      ['example','Show a concrete example',`<h3>${esc(d.example.title)}</h3><p>${esc(d.example.given)}</p>${d.example.steps.map((step,i)=>`<article class="guide-example"><strong>Step ${i+1}</strong>${math(step.equation)}<p>${esc(step.reason)}</p></article>`).join('')}<div class="guide-takeaway"><strong>Interpret the result</strong><p>${esc(d.example.conclusion)}</p></div>`],
      ['symbols','Help me read the symbols',`${math(d.formula)}<dl class="symbol-guide">${d.symbols.map(([symbol,meaning])=>`<div><dt>${esc(symbol)}</dt><dd>${esc(meaning)}</dd></div>`).join('')}</dl><p>${esc(d.theorem)}</p>`],
      ['stuck','I am stuck. Where do I begin?',`<h3>Start with one small move.</h3><ol class="guide-checklist"><li>Name the quantity you want to find and its units.</li><li>Write the known values and choose the relationship that connects them.</li><li>Check the domain and the rule’s conditions.</li><li>Do one operation, then say why it is allowed.</li><li>Compare the result with a graph, a simple case, or a nearby value.</li></ol><div class="guide-takeaway"><strong>A common trap in this lesson</strong><p>${esc(l.trap)}</p></div>${d.prerequisites.length?`<h3>Revisit a foundation</h3>${d.prerequisites.map(id=>`<a class="guide-foundation" href="#/lesson/${id}">${id} · ${esc(lessonFor(id).title)} ${icon('arrow')}</a>`).join('')}`:'<p>A quick refresh of linear equations and coordinates is enough to begin.</p>'}<button class="button primary" data-guide-reason>Walk through the reasoning ${icon('arrow')}</button>`]
    ];
    dialog=document.createElement('dialog');dialog.className='lesson-guide-dialog';dialog.setAttribute('aria-labelledby','guide-heading');
    dialog.innerHTML=`<header class="guide-header"><div><span class="eyebrow">YOUR LESSON GUIDE · ${l.id}</span><h2 id="guide-heading">Let’s make it clearer.</h2></div><button class="icon-button" data-close-guide aria-label="Close lesson guide">${icon('close')}</button></header><p class="guide-description">Prepared explanations for this lesson. Choose the kind of help you need.</p><nav class="guide-topics" aria-label="Kinds of lesson help">${topics.map(([id,label],i)=>`<button data-guide-topic="${id}" aria-pressed="${i===0}">${label}</button>`).join('')}</nav><div class="guide-body">${topics.map(([id,,html],i)=>`<section data-guide-panel="${id}" ${i?'hidden':''}>${html}</section>`).join('')}</div>`;
    document.body.append(dialog);dialog.showModal();
    dialog.querySelector('[data-close-guide]').addEventListener('click',()=>dialog.close());
    dialog.querySelectorAll('[data-guide-topic]').forEach(button=>button.addEventListener('click',()=>{
      dialog.querySelectorAll('[data-guide-topic]').forEach(b=>b.setAttribute('aria-pressed',b===button));
      dialog.querySelectorAll('[data-guide-panel]').forEach(p=>p.hidden=p.dataset.guidePanel!==button.dataset.guideTopic);
      dialog.querySelector('.guide-body').scrollTop=0;
    }));
    dialog.querySelector('[data-guide-reason]').addEventListener('click',()=>{dialog.close();switchView('reason');});
    dialog.addEventListener('close',()=>{dialog.remove();root.querySelector('[data-lesson-guide]')?.focus();},{once:true});
  },{signal});
  signal.addEventListener('abort',()=>dialog?.remove(),{once:true});
}
