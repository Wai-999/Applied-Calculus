import { profit, optimalQuantity, population, logistic, elasticity, flow, accumulated, surface, fmt } from './math.js';
const green = '#285e50', coral = '#c4745f', blue = '#4d7d9a';
const config = {
  functions: { formula:'y = a(x − h)² + k', prompt:'Predict which way the vertex will move before changing h.', controls:[['a','Vertical scale',0.5,3,0.5,1],['h','Horizontal shift',0,8,0.5,3],['k','Vertical shift',0,10,1,2]] },
  limits: { formula:'f(x) = (x² − 4)/(x − 2), x ≠ 2', prompt:'The point at x = 2 is missing. What do both sides approach?',controls:[['h','Distance from 2',0.01,1,0.01,0.7]] },
  derivative: { formula:'f(x) = x²   ·   f′(x) = 2x', prompt:'Shrink h. What happens to the secant slope as the points move together?', controls:[['x','Starting input x',0.5,4,0.5,2],['h','Interval h',0.05,2,0.05,1.5]] },
  profit: { formula:'P(q) = (a − c)q − 0.5q² − 400   ·   p(q) = a − 0.5q ≥ 0',prompt:'Predict: is producing one more unit always better?',controls:[['q','Quantity produced',0,120,1,35],['a','Starting price a ($)',40,100,5,80],['c','Unit cost c ($)',5,35,5,20]] },
  optimization: { formula:'P(q) = 60q − 0.5q² − 400   ·   P′(q) = 60 − q',prompt:'Find where the slope changes from positive to negative.',controls:[['q','Quantity produced',0,120,1,35]] },
  growth: { formula:'N(t) = 100eʳᵗ',prompt:'Try a negative rate. Compare the direction of change with the size of the population.', controls:[['r','Continuous rate r (per hour)',-0.3,0.4,0.01,0.2],['t','Time (hours)',0,10,0.25,5]] },
  elasticity: { formula:'D(p) = 120 − 2p   ·   R(p) = pD(p)',prompt:'Find the price where elasticity is 1. What happens to revenue on either side?', controls:[['p','Price ($)',1,59,1,20]] },
  integral: { formula:'r(t) = 2t + 4   ·   A(T) = T² + 4T',prompt:'These are left-endpoint rectangles. Predict whether their sum is too small or too large.', controls:[['n','Number of slices',2,40,2,6],['t','Duration (minutes)',1,8,0.5,4]] },
  surplus: { formula:'D(q) = a − 0.5q   ·   S(q) = b + 0.5q',prompt:'The shaded triangles measure value at the equilibrium price. Raise the demand intercept and compare.',controls:[['a','Demand intercept a ($)',40,90,5,60],['b','Supply intercept b ($)',5,30,5,10]] },
  inequality: { formula:'L(x) = xᵅ   ·   Gini = 1 − 2/(α + 1)',prompt:'Move α toward 1. Which curve represents a more equal distribution?',controls:[['a','Lorenz exponent α',1,5,0.1,2]] },
  adoption: { formula:'A(t) = 1000 / (1 + 19e⁻ʳᵗ)',prompt:'Move time past half the population. Adoption still rises, but does the rate keep rising?',controls:[['r','Spread rate r (per week)',0.2,1,0.05,0.7],['t','Time (weeks)',0,15,0.25,4]] },
  surface: { formula:'S(x,y) = 100 − (x − 5)² − 2(y − 4)²',prompt:'Change one resource at a time. Find where neither direction can improve the score.',controls:[['x','Resource x',0,10,0.25,3],['y','Resource y',0,8,0.25,6]] },
  regression: { formula:'ŷ = ⅓ + bx   ·   data: (1,2), (2,3), (3,5)',prompt:'Adjust the slope to minimize the sum of squared residuals. The intercept is held at ⅓.',controls:[['b','Fitted slope b',0.5,2.5,0.05,1]] },
  waves: { formula:'D(t) = 50 + A sin(2πt/T)',prompt:'Change the period. Does the amplitude change, too?',controls:[['a','Amplitude A',5,40,5,20],['t','Period T (months)',4,24,2,12]] }
};
export function renderLab(id, instance = 'lab') {
  const c = config[id];
  return `<section class="lab" data-lab="${id}"><div class="lab-top"><span class="eyebrow">LIVE EXPERIMENT</span><span class="live-dot">Interactive model</span></div><p class="lab-formula">${c.formula}</p><div class="lab-chart"></div><div class="lab-controls">${c.controls.map(([name,label,min,max,step,value])=>`<div class="slider-row"><label for="${instance}-${name}">${label}<output for="${instance}-${name}" data-value="${name}">${value}</output></label><input type="range" id="${instance}-${name}" name="${name}" min="${min}" max="${max}" step="${step}" value="${value}"></div>`).join('')}</div><div class="lab-results" aria-live="polite" aria-atomic="true"></div><p class="lab-prompt"><strong>Notice & wonder</strong> ${c.prompt}</p></section>`;
}
let chartSequence=0;
function chart({curves=[],xmax=10,xmin=0,ymax=100,ymin=0,xlabel='Input',ylabel='Output',areas=[],points=[],extra='',description=''}) {
  const W=640,H=310,l=62,r=23,t=24,b=46;
  const clipId=`lab-plot-${++chartSequence}`;
  const X=x=>l+(x-xmin)/(xmax-xmin)*(W-l-r),Y=y=>H-b-(y-ymin)/(ymax-ymin)*(H-t-b);
  const path = fn => Array.from({length:161},(_,i)=>{const x=xmin+(xmax-xmin)*i/160; return `${i?'L':'M'}${X(x).toFixed(2)},${Y(fn(x)).toFixed(2)}`;}).join(' ');
  const areaPath=(fn,lower,a,b)=>{const xs=Array.from({length:81},(_,i)=>a+(b-a)*i/80);return [...xs.map((x,i)=>`${i?'L':'M'}${X(x)},${Y(fn(x))}`),...xs.reverse().map(x=>`L${X(x)},${Y(lower(x))}`),'Z'].join(' ');};
  let grid='';
  for(let i=0;i<=4;i++){let x=xmin+(xmax-xmin)*i/4,y=ymin+(ymax-ymin)*i/4;grid+=`<line x1="${X(x)}" y1="${t}" x2="${X(x)}" y2="${H-b}" stroke="#e0e6dc"/><line x1="${l}" y1="${Y(y)}" x2="${W-r}" y2="${Y(y)}" stroke="#e0e6dc"/><text x="${X(x)}" y="${H-b+20}" text-anchor="middle">${fmt(x,2)}</text><text x="${l-10}" y="${Y(y)+4}" text-anchor="end">${fmt(y,1)}</text>`;}
  return `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${description}"><title>${description}</title><defs><clipPath id="${clipId}"><rect x="${l}" y="${t}" width="${W-l-r}" height="${H-t-b}"/></clipPath></defs>${grid}<g clip-path="url(#${clipId})">${areas.map(a=>`<path d="${areaPath(a.fn,a.lower||(()=>0),a.a??xmin,a.b??xmax)}" fill="${a.color||green}" opacity=".14"/>`).join('')}${extra ? extra({X,Y}) : ''}${curves.map(c=>`<path d="${path(c.fn)}" fill="none" stroke="${c.color||green}" stroke-width="${c.dashed?2:3}" ${c.dashed?'stroke-dasharray="6 5"':''} stroke-linecap="round"/>`).join('')}${points.map(p=>`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.open?6:5}" fill="${p.open?'#f9faf4':p.color||green}" stroke="${p.color||green}" stroke-width="${p.open?3:2}"/>`).join('')}</g><text x="${(W+l-r)/2}" y="${H-3}" text-anchor="middle" class="axis-label">${xlabel}</text><text x="${l}" y="13" class="axis-label">${ylabel}</text></svg>`;
}
const stat=(label,value)=>`<div><span>${label}</span><strong>${value}</strong></div>`;
export function updateLab(root) {
  const id=root.dataset.lab,inputs=[...root.querySelectorAll('input')],p=Object.fromEntries(inputs.map(e=>[e.name,Number(e.value)]));
  if(id==='profit'){
    const quantity=inputs.find(input=>input.name==='q'),maximum=Math.min(120,2*p.a);
    quantity.max=String(maximum);
    p.q=Math.min(p.q,maximum);
    quantity.value=String(p.q);
  }
  root.querySelectorAll('output').forEach(e=>{e.value=fmt(p[e.dataset.value],2);});
  let plot='',stats='',insight='';
  if(id==='functions') {
    const f=x=>p.a*(x-p.h)**2+p.k;
    plot=chart({curves:[{fn:f}],xmax:10,ymax:100,points:[{x:p.h,y:p.k}],xlabel:'x',ylabel:'y',description:`Quadratic with vertex at (${p.h}, ${p.k}) and vertical scale ${p.a}`});
    stats=stat('Vertex',`(${p.h}, ${p.k})`)+stat('Value at x = 5',fmt(f(5)))+stat('Opening','Upward'); insight='The marked point is the minimum. A larger a makes the curve narrower.';
  } else if(id==='limits') {
    plot=chart({curves:[{fn:x=>x+2}],xmin:0,xmax:4,ymax:8,points:[{x:2-p.h,y:4-p.h,color:blue},{x:2+p.h,y:4+p.h,color:coral},{x:2,y:4,open:true}],xlabel:'x (input)',ylabel:'f(x)',description:`An open circle at (2,4); nearby values are ${fmt(4-p.h,2)} and ${fmt(4+p.h,2)}`});
    stats=stat('From the left',fmt(4-p.h,2))+stat('From the right',fmt(4+p.h,2))+stat('Limit at x = 2','4'); insight='Both sides approach 4, although the original function has no value at x = 2.';
  } else if(id==='derivative') {
    const f=x=>x*x,m=2*p.x+p.h;
    plot=chart({curves:[{fn:f},{fn:x=>f(p.x)+m*(x-p.x),color:coral,dashed:true},{fn:x=>f(p.x)+2*p.x*(x-p.x),color:blue,dashed:true}],xmax:6,ymax:36,ymin:-4,points:[{x:p.x,y:f(p.x)},{x:p.x+p.h,y:f(p.x+p.h),color:coral}],xlabel:'x',ylabel:'f(x) = x²',description:`Green curve x squared, coral secant slope ${fmt(m,2)}, blue tangent slope ${2*p.x}`});
    stats=stat('Secant slope',fmt(m,2))+stat('Tangent slope',fmt(2*p.x,2))+stat('Slope difference',fmt(p.h,2)); insight='Coral is the secant through two points; blue is the tangent at the starting point.';
  } else if(id==='profit'||id==='optimization') {
    const a=p.a??80,c=p.c??20,fn=x=>profit(x,a,c),maximum=Math.min(120,2*a),best=optimalQuantity(a,c),peak=fn(best),slope=a-c-p.q;
    plot=chart({curves:[{fn},{fn:x=>fn(p.q)+slope*(x-p.q),color:coral,dashed:true}],xmax:maximum,ymax:Math.max(peak+200,100),ymin:Math.min(fn(0),fn(maximum))-100,points:[{x:p.q,y:fn(p.q)},{x:best,y:peak,color:coral}],xlabel:'Quantity (units)',ylabel:'Profit ($)',description:`Profit curve; chosen quantity ${p.q} yields ${fmt(fn(p.q))} dollars, maximum ${fmt(peak)} at ${best} units`});
    stats=stat('Your profit',`$${fmt(fn(p.q))}`)+stat('Marginal profit',`$${fmt(slope)}/unit`)+stat('Best quantity',`${fmt(best)} units`); insight=`The coral point is the optimum (${fmt(best)} units, $${fmt(peak)}). The dashed line is the slope at your quantity. Fixed cost is $400.`;
  } else if(id==='growth') {
    const f=x=>population(x,p.r);
    plot=chart({curves:[{fn:f}],xmax:10,ymax:Math.max(f(10)*1.1,120),points:[{x:p.t,y:f(p.t)}],xlabel:'Time (hours)',ylabel:'Population (organisms)',description:`Population at ${p.t} hours is ${fmt(f(p.t))}, continuous rate ${p.r} per hour`});
    stats=stat('Population',fmt(f(p.t)))+stat('Current growth',`${fmt(p.r*f(p.t))}/hour`)+stat(p.r>0?'Doubling time':p.r<0?'Half-life':'Time to double',p.r===0?'Never':`${fmt(Math.log(2)/Math.abs(p.r),2)} h`); insight='The initial population is 100. A constant relative rate produces a changing absolute rate. This idealized model omits resource limits.';
  } else if(id==='elasticity') {
    const f=x=>x*(120-2*x),e=elasticity(p.p);
    plot=chart({curves:[{fn:f}],xmax:60,ymax:2000,points:[{x:p.p,y:f(p.p)},{x:30,y:1800,color:coral}],xlabel:'Price ($)',ylabel:'Revenue ($)',description:`Revenue versus price; at price ${p.p}, demand is ${120-2*p.p} and elasticity ${fmt(e,2)}`});
    stats=stat('Demand',`${120-2*p.p} units`)+stat('Revenue',`$${fmt(f(p.p))}`)+stat('Elasticity',`${fmt(e,2)} · ${Math.abs(e-1)<0.001?'unit elastic':e<1?'inelastic':'elastic'}`); insight=e<1?'Here a small price increase raises revenue because demand is inelastic.':e>1?'Here a small price increase lowers revenue because demand is elastic.':'Unit elasticity occurs at the peak of this model’s revenue curve.';
  } else if(id==='integral') {
    const n=p.n,h=p.t/n,sum=h*Array.from({length:n},(_,i)=>flow(i*h)).reduce((a,b)=>a+b,0),exact=accumulated(p.t);
    plot=chart({curves:[{fn:flow}],xmax:8,ymax:22,xlabel:'Time (minutes)',ylabel:'Flow (liters/minute)',extra:({X,Y})=>Array.from({length:n},(_,i)=>`<rect x="${X(i*h)}" y="${Y(flow(i*h))}" width="${X(h)-X(0)}" height="${Y(0)-Y(flow(i*h))}" fill="${green}" opacity=".18" stroke="${green}" stroke-width="1"/>`).join(''),description:`${n} left rectangles estimate ${fmt(sum,2)} liters; exact integral is ${fmt(exact,2)} liters over ${p.t} minutes`});
    stats=stat('Rectangle estimate',`${fmt(sum,2)} L`)+stat('Exact total',`${fmt(exact,2)} L`)+stat('Underestimate',`${fmt(exact-sum,2)} L`); insight='Flow is increasing, so left-endpoint rectangles miss some area. More slices reduce this underestimate.';
  } else if(id==='surplus') {
    const d=x=>p.a-0.5*x,s=x=>p.b+0.5*x,q=p.a-p.b,price=(p.a+p.b)/2,surplus=q*q/4;
    plot=chart({curves:[{fn:d},{fn:s,color:blue},{fn:()=>price,color:coral,dashed:true}],areas:[{fn:d,lower:()=>price,a:0,b:q},{fn:()=>price,lower:s,a:0,b:q,color:blue}],xmax:Math.min(100,2*p.a),ymax:100,points:[{x:q,y:price}],xlabel:'Quantity (units)',ylabel:'Price ($)',description:`Green demand and blue supply intersect at ${q} units and ${price} dollars; each surplus is ${surplus} dollars`});
    stats=stat('Equilibrium',`${q} units · $${fmt(price)}`)+stat('Consumer surplus',`$${fmt(surplus)}`)+stat('Producer surplus',`$${fmt(surplus)}`); insight='Green shades consumer surplus above price; blue shades producer surplus below price. Their equality here comes from the model’s equal and opposite slopes.';
  } else if(id==='inequality') {
    plot=chart({curves:[{fn:x=>x,color:blue,dashed:true},{fn:x=>x**p.a}],areas:[{fn:x=>x,lower:x=>x**p.a}],xmax:1,ymax:1,xlabel:'Cumulative population share',ylabel:'Cumulative income share',description:`Lorenz curve x to power ${p.a}, with Gini index ${fmt(1-2/(p.a+1),3)}`});
    stats=stat('Gini index',fmt(1-2/(p.a+1),3))+stat('Bottom 50% income',`${fmt(100*0.5**p.a)}%`)+stat('Equality exponent','α = 1'); insight='The dashed blue line represents equality. A larger shaded gap means a higher Gini index in this idealized distribution.';
  } else if(id==='adoption') {
    const f=x=>logistic(x,p.r),v=f(p.t),rate=p.r*v*(1-v/1000),inflect=Math.log(19)/p.r;
    plot=chart({curves:[{fn:f}],xmax:15,ymax:1100,points:[{x:p.t,y:v},...(inflect<=15?[{x:inflect,y:500,color:coral}]:[])],xlabel:'Time (weeks)',ylabel:'Adopters (people)',description:`Adoption at ${p.t} weeks is ${fmt(v)} people, rate ${fmt(rate)} people/week; fastest at ${fmt(inflect,2)} weeks`});
    stats=stat('Adopters',fmt(v))+stat('New adopters/week',fmt(rate))+stat('Fastest growth at',`${fmt(inflect,2)} weeks`); insight='The coral point is the inflection, at half capacity. The ceiling is 1,000 people and the initial count is 50. This is a simulated scenario.';
  } else if(id==='surface') {
    let cells='';for(let x=0;x<20;x++)for(let y=0;y<16;y++){const v=surface((x+0.5)/2,(y+0.5)/2);cells+=`<rect x="${90+x*23}" y="${30+(15-y)*14}" width="23.5" height="14.5" fill="hsl(${100+v*0.45} 28% ${91-v*0.5}%)"/>`;}
    plot=`<svg class="plot" viewBox="0 0 640 310" role="img" aria-label="Heatmap of a two-input score. Darker green is higher. Score at (${p.x}, ${p.y}) is ${fmt(surface(p.x,p.y),2)}"><title>Score surface as a heatmap</title>${cells}<circle cx="${90+p.x*46}" cy="${254-p.y*28}" r="7" fill="${coral}" stroke="white" stroke-width="3"/><text x="320" y="300" text-anchor="middle">Resource x (0 to 10) →</text><text x="90" y="17">Resource y (0 at bottom, 8 at top)</text><text x="90" y="275">0</text><text x="550" y="275">10</text></svg>`;
    stats=stat('Score',fmt(surface(p.x,p.y),2))+stat('Partial ∂S/∂x',fmt(-2*(p.x-5),2))+stat('Partial ∂S/∂y',fmt(-4*(p.y-4),2)); insight='Darker cells have higher scores. The highest score is 100 at (5,4). Each partial derivative holds the other resource fixed.';
  } else if(id==='regression') {
    const points=[{x:1,y:2},{x:2,y:3},{x:3,y:5}],f=x=>1/3+p.b*x,sse=points.reduce((s,v)=>s+(v.y-f(v.x))**2,0);
    plot=chart({curves:[{fn:f}],points,xmax:4,ymax:9,xlabel:'Measured input x',ylabel:'Observed y',extra:({X,Y})=>points.map(v=>`<line x1="${X(v.x)}" x2="${X(v.x)}" y1="${Y(v.y)}" y2="${Y(f(v.x))}" stroke="${coral}" stroke-width="3" stroke-dasharray="4 3"/>`).join(''),description:`Three observations and a fitted line of slope ${p.b}. Sum of squared residuals is ${fmt(sse,3)}`});
    stats=stat('Sum of squares',fmt(sse,3))+stat('Best slope','1.5')+stat('Best sum of squares',fmt(1/6,3)); insight='Coral segments are vertical residuals. At slope 1.5 their squared sum is smallest. These three illustrative points do not establish causation.';
  } else if(id==='waves') {
    const f=x=>50+p.a*Math.sin(2*Math.PI*x/p.t);
    plot=chart({curves:[{fn:f},{fn:()=>50,color:blue,dashed:true}],xmax:24,ymax:100,xlabel:'Time (months)',ylabel:'Seasonal demand (units)',description:`Seasonal demand with midline 50, amplitude ${p.a}, period ${p.t} months`});
    stats=stat('Peak demand',`${50+p.a} units`)+stat('Minimum demand',`${50-p.a} units`)+stat('Cycles in 24 months',fmt(24/p.t,2)); insight='The dashed line is the baseline of 50. Amplitude changes the height; period changes how quickly the pattern repeats.';
  }
  root.querySelector('.lab-chart').innerHTML=plot;
  root.querySelector('.lab-results').innerHTML=stats;
  let caption=root.querySelector('.lab-caption');if(!caption){caption=document.createElement('p');caption.className='lab-caption';root.querySelector('.lab-chart').after(caption);}caption.textContent=insight;
}
export function bindLabs(container) { container.querySelectorAll('[data-lab]').forEach(root=>{updateLab(root);root.addEventListener('input',()=>updateLab(root));}); }
