import {sampleModel,toCSV} from '../engine/models.js';
import {updateLab} from '../../labs.js';
import {state,save} from '../core/session.js';
import {esc,icon} from './shared.js';
import {fmt} from '../../math.js';
import {toast} from './feedback.js';
export function enhanceLabs(container,signal){
  container.querySelectorAll('[data-lab]').forEach(root=>{
    const chart=root.querySelector('.lab-chart');
    chart.insertAdjacentHTML('beforebegin',`<div class="experiment-toolbar"><div class="segmented-control" role="group" aria-label="Experiment representation"><button data-lab-view="graph" aria-pressed="true">${icon('trending')}Graph</button><button data-lab-view="data" aria-pressed="false">${icon('grid')}Data table</button></div><div><button class="text-button" data-pin-result>${icon('bookmark')}Pin result</button><button class="text-button" data-reset-lab>Reset</button></div></div>`);
    chart.insertAdjacentHTML('afterend','<div class="experiment-data" hidden><div class="data-scroll"></div><button class="text-button" data-copy-data>Copy table as CSV</button><textarea class="csv-fallback" aria-label="CSV data" hidden readonly></textarea></div>');
    root.querySelector('.lab-results').insertAdjacentHTML('afterend','<div class="pinned-comparison" hidden></div>');
    let pinned=null;
    function parameters(){return Object.fromEntries([...root.querySelectorAll('input[type=range]')].map(el=>[el.name,Number(el.value)]));}
    function refresh(){
      const samples=sampleModel(root.dataset.lab,parameters());
      root.querySelector('.data-scroll').innerHTML=`<table><caption>25 sampled points from the current model. A dash indicates an undefined value.</caption><thead><tr>${samples.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${samples.rows.map(row=>`<tr>${row.map(value=>`<td>${value===null?'—':fmt(value,4)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      root.querySelector('.csv-fallback').value=toCSV(samples);
      if(pinned){
        const now=[...root.querySelectorAll('.lab-results strong')].map(el=>el.textContent);
        const comparison=root.querySelector('.pinned-comparison');comparison.hidden=false;
        comparison.innerHTML=`<span class="eyebrow">PINNED RESULT → CURRENT RESULT</span><div>${pinned.map((value,i)=>`<span>${esc(value)} <b>→</b> ${esc(now[i])}</span>`).join('')}</div>`;
      }
    }
    root.querySelectorAll('[data-lab-view]').forEach(button=>button.addEventListener('click',()=>{const data=button.dataset.labView==='data';chart.hidden=data;root.querySelector('.experiment-data').hidden=!data;root.querySelectorAll('[data-lab-view]').forEach(b=>b.setAttribute('aria-pressed',b===button));},{signal}));
    root.querySelector('[data-pin-result]').addEventListener('click',()=>{pinned=[...root.querySelectorAll('.lab-results strong')].map(el=>el.textContent);state.studio.experiments[root.dataset.lab]={parameters:parameters(),result:pinned,at:Date.now()};save();refresh();toast('Result pinned. Change a control to compare it with your baseline.');},{signal});
    root.querySelector('[data-reset-lab]').addEventListener('click',()=>{root.querySelectorAll('input[type=range]').forEach(input=>input.value=input.defaultValue);updateLab(root);refresh();},{signal});
    root.querySelector('[data-copy-data]').addEventListener('click',async()=>{const field=root.querySelector('.csv-fallback');try{await navigator.clipboard.writeText(field.value);toast('Model data copied as CSV.');}catch{field.hidden=false;field.focus();field.select();toast('CSV is selected. Copy it into your own file.');}},{signal});
    root.addEventListener('input',refresh,{signal});refresh();
  });
}
