import {missions,characters} from '../content/missions.js';
import {details} from '../content/index.js';
import {activityStatus,initialOrder,moveOrder,checkOrder} from '../engine/engagement.js';
import {guidedRecord,saveGuided,lessonMastery} from '../core/session.js';
import {esc,icon} from './shared.js';
import {math} from './math.js';

export const observationTasks={
  functions:['Keep a and k fixed. Move h from 3 to 5.','Compare the vertex coordinates before and after. Explain why the graph moves right.'],
  limits:['Move the distance control toward 0.01.','Compare the left and right values. Distinguish a nearby value from the missing value at x = 2.'],
  derivative:['Keep x fixed. Reduce the interval h.','Compare secant and tangent slopes. Explain what shrinking the interval changes.'],
  profit:['Pin a result, then change only quantity. Try values on both sides of the best quantity.','Compare profit and marginal profit. Explain why more production can reduce profit.'],
  optimization:['Move quantity below, to, and above 60.','Connect the sign of marginal profit with the direction profit changes.'],
  growth:['Keep time fixed. Compare a positive rate, zero, and a negative rate.','Describe population and current growth separately. Include the units.'],
  elasticity:['Compare prices below 30, at 30, and above 30.','Connect elasticity with the direction revenue changes when price rises.'],
  integral:['Pin a result. Hold duration fixed and increase the number of slices.','Compare the rectangle estimate with the exact total. Explain the sign of the error.'],
  surplus:['Pin a result. Raise only the demand intercept.','Compare the equilibrium and the shaded areas. Distinguish price from total surplus.'],
  inequality:['Move the Lorenz exponent toward 1.','Compare the curve, bottom-half income share, and Gini index. Explain what equality means here.'],
  adoption:['Hold spread rate fixed. Move time through the fastest-growth point.','Compare adopters with new adopters per week. Explain how a rising total can have a falling growth rate.'],
  surface:['Hold y fixed and move x toward 5; then hold x fixed and move y toward 4.','Compare the score and both partial derivatives. Explain what is being held constant.'],
  regression:['Move the fitted slope toward and then away from 1.5.','Compare the residual segments and their squared sum. Explain what the fit does and does not establish.'],
  waves:['Pin a result. Change period while keeping amplitude fixed.','Compare the time between peaks with peak height. Explain which feature each control changes.']
};
function predictionFeedback(l,record){
  if(record.prediction===null)return '';
  const m=missions[l.id],correct=record.prediction===m.correct;
  return `<div class="feedback ${correct?'success':'hint'}"><strong>${correct?'Your prediction matches the model.':'Here is the distinction to look for.'}</strong><p>${esc(m.explanation)}</p><small>A starting prediction is a way to think, and is not graded.</small></div>`;
}
export function renderMission(l){
  const m=missions[l.id],person=characters[l.area],record=guidedRecord(l.id);
  return `<section class="mission-card" aria-labelledby="mission-title"><div class="mission-person"><span class="person-avatar" aria-hidden="true">${person.name[0]}</span><div><span class="eyebrow">START WITH A HUMAN QUESTION</span><span>Meet ${person.name} · a fictional learning scenario</span></div></div><h2 id="mission-title">Before the formula, make a prediction.</h2><p class="mission-scene">${esc(m.scene.replaceAll('@',person.name))}</p><fieldset class="prediction-group"><legend>${esc(m.prompt)}</legend><div class="prediction-options">${m.options.map((text,i)=>`<button type="button" data-prediction="${i}" aria-pressed="${record.prediction===i}" ${record.prediction!==null?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${esc(text)}</button>`).join('')}</div></fieldset><div data-prediction-feedback aria-live="polite">${predictionFeedback(l,record)}</div><p class="mission-invitation">Choose what you think first. Then use the explanation and experiment to find out why.</p><button class="text-button" data-start-reading>Explore the idea ${icon('arrow')}</button></section>`;
}
export function renderTrail(l){
  const status=activityStatus(guidedRecord(l.id));
  return `<section class="activity-trail" aria-label="Your learning activities"><div class="trail-heading"><strong>Your learning trail</strong><span data-activity-count>${status.completed} of 4 activities tried</span></div><div class="trail-stages">${status.stages.map((stage,i)=>`<button class="${stage.done?'activity-done':''}" data-trail-view="${stage.view}" data-trail-key="${stage.key}" aria-label="${stage.label}${stage.done?', tried':''}"><span class="trail-marker">${stage.done?icon('check'):i+1}</span><span>${stage.label}</span></button>`).join('')}</div><p>Participation helps you explore. Independent answers measure understanding.</p></section>`;
}
function orderItems(l,order){
  return order.map((step,index)=>`<li class="order-step"><span class="order-position">${index+1}</span><div class="order-content">${math(details[l.id].derivation[index].equation)}<div class="matched-explanation"><span>Your explanation</span><p>${esc(details[l.id].derivation[step].reason)}</p></div></div><div class="order-buttons"><button class="icon-button" data-move="${index}" data-direction="-1" aria-label="Move explanation ${index+1} earlier" ${index===0?'disabled':''}>↑</button><button class="icon-button" data-move="${index}" data-direction="1" aria-label="Move explanation ${index+1} later" ${index===order.length-1?'disabled':''}>↓</button></div></li>`).join('');
}
export function renderReasoning(l){
  return `<section class="reasoning-activity" aria-labelledby="order-title"><span class="eyebrow">YOUR TURN · CONNECT SYMBOLS TO MEANING</span><h2 id="order-title">Which explanation fits each equation?</h2><p>The equations stay in place, but their explanations are mixed up. Use the arrows to move the explanations until each one describes the equation above it.</p><ol class="order-list" data-order-list>${orderItems(l,initialOrder(details[l.id].derivation.length))}</ol><div class="activity-actions"><button class="button primary" data-check-order>Check my connections</button><button class="text-button" data-show-order>Walk me through it</button></div><div data-order-feedback aria-live="polite"></div></section>`;
}
export function renderExperimentTask(l){
  const steps=observationTasks[l.lab];
  return `<section class="experiment-mission"><span class="eyebrow">A SMALL INVESTIGATION</span><h2>Change one thing. Notice the consequence.</h2><ol>${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><span class="observation-status" data-observation-status>${guidedRecord(l.id).observed?'You have changed this model. Put what you noticed into words below.':'Move a model control to start your investigation.'}</span></section>`;
}
function recapContent(l){
  const record=guidedRecord(l.id),status=activityStatus(record),m=missions[l.id];
  return `<div class="recap-summary"><strong>${status.completed}/4 activities tried</strong><span>${lessonMastery(l.id)}% evidence from independent checks</span></div>${record.prediction!==null?`<div class="recap-connection"><span class="eyebrow">RETURN TO YOUR FIRST THOUGHT</span><p>You predicted: “${esc(m.options[record.prediction])}”</p><p><strong>The model tells us:</strong> ${esc(m.explanation)}</p></div>`:'<p>Start with a prediction in Understand, then come back to connect it to the mathematics.</p>'}<p><strong>Take it into the world:</strong> ${esc(details[l.id].transfer)}</p><button class="button secondary" data-trail-view="${status.next}">${status.completed===4?'Revisit the practice':'Continue your next activity'} ${icon('arrow')}</button>`;
}
export function renderRecap(l){
  return `<section class="session-recap"><span class="eyebrow">CLOSE THE LOOP</span><h2>What changed in your thinking?</h2><div data-recap-content>${recapContent(l)}</div></section>`;
}
export function renderExplainPrompts(){
  return `<div class="explain-prompts"><strong>Explain it to a friend.</strong><p>Use your own words. These starters can help you begin.</p><div>${['I would use this when…','The graph tells me…','The units matter because…','This model could fail when…'].map(text=>`<button class="starter-button" data-note-starter="${esc(text)}">${text}</button>`).join('')}</div><small>This is your reflection space. Your writing is saved, and is not automatically graded.</small></div>`;
}
export function mountActivities(root,l,signal,switchView){
  let order=initialOrder(details[l.id].derivation.length);
  const update=patch=>{
    const record=saveGuided(l.id,patch),status=activityStatus(record);
    root.querySelector('[data-activity-count]').textContent=`${status.completed} of 4 activities tried`;
    status.stages.forEach((stage,i)=>{const button=root.querySelector('[data-trail-key="'+stage.key+'"]');button.classList.toggle('activity-done',stage.done);button.setAttribute('aria-label',stage.label+(stage.done?', tried':''));button.querySelector('.trail-marker').innerHTML=stage.done?icon('check'):i+1;});
    root.querySelector('[data-recap-content]').innerHTML=recapContent(l);
  };
  root.addEventListener('click',e=>{
    const trail=e.target.closest('[data-trail-view]');if(trail){switchView(trail.dataset.trailView);return;}
    if(e.target.closest('[data-start-reading]'))root.querySelector('#big-picture').scrollIntoView({block:'start',behavior:'instant'});
    const prediction=e.target.closest('[data-prediction]');
    if(prediction&&guidedRecord(l.id).prediction===null){
      const record=saveGuided(l.id,{prediction:Number(prediction.dataset.prediction)});
      root.querySelectorAll('[data-prediction]').forEach(button=>{button.disabled=true;button.setAttribute('aria-pressed',button===prediction);});
      root.querySelector('[data-prediction-feedback]').innerHTML=predictionFeedback(l,record);update({});
    }
    const move=e.target.closest('[data-move]');
    if(move){
      const position=Number(move.dataset.move),direction=Number(move.dataset.direction);order=moveOrder(order,position,direction);
      root.querySelector('[data-order-list]').innerHTML=orderItems(l,order);
      root.querySelector('[data-order-feedback]').textContent=`Explanation moved to position ${position+direction+1}.`;
      const preferred=root.querySelector(`[data-move="${position+direction}"][data-direction="${direction}"]:not(:disabled)`);
      (preferred||root.querySelector(`[data-move="${position+direction}"]:not(:disabled)`))?.focus();
    }
    if(e.target.closest('[data-check-order]')){
      const result=checkOrder(order);
      root.querySelector('[data-order-feedback]').innerHTML=`<div class="feedback ${result.correct?'success':'hint'}"><strong>${result.correct?'Every equation has its meaning.':'Read what the equation actually does.'}</strong><p>${result.correct?'You matched each equation with its explanation. Now read the argument aloud and explain why each move is valid.':result.prefix?`Your first ${result.prefix} pair${result.prefix===1?' is':'s are'} connected. Check what operation or relationship the next equation expresses.`:'Look for a word or operation in each explanation that matches the equation: a substitution, a limit, an integral, or a transformation.'}</p></div>`;
      if(result.correct)update({reasoned:true});
    }
    if(e.target.closest('[data-show-order]')){
      order=Array.from({length:details[l.id].derivation.length},(_,i)=>i);
      root.querySelector('[data-order-list]').innerHTML=orderItems(l,order);
      root.querySelector('[data-order-feedback]').innerHTML='<div class="feedback hint"><strong>Connect each operation with its meaning.</strong><p>Each explanation is now beside the equation it describes. Read the equation first, cover its explanation, and say the reason in your own words.</p></div>';
      update({reasoned:true,assisted:true});
    }
    const starter=e.target.closest('[data-note-starter]');
    if(starter){const field=root.querySelector('#lesson-note');field.value+=(field.value?'\n\n':'')+starter.dataset.noteStarter+' ';field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();field.setSelectionRange(field.value.length,field.value.length);}
    if(e.target.closest('[data-choice]'))update({practised:true});
  },{signal});
  root.addEventListener('input',e=>{
    if(e.target.matches('.lab input[type=range]')){
      if(!guidedRecord(l.id).observed)update({observed:true});
      root.querySelector('[data-observation-status]').textContent='Model changed. Compare the graph and numbers, then explain what you noticed below.';
    }
  },{signal});
  root.addEventListener('studio:attempt',()=>update({practised:true}),{signal});
  root.addEventListener('studio:evidence',()=>{root.querySelector('[data-recap-content]').innerHTML=recapContent(l);},{signal});
}
