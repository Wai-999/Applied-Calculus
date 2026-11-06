import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons} from '../data.js';
import {isCorrect, numericalIntegral, profit} from '../math.js';
import {sampleModel} from '../src/engine/models.js';
import {updateLab} from '../labs.js';

const question=(id,index)=>lessons.find(lesson=>lesson.id===id).questions[index];
const accepts=(id,index,value)=>{
  const q=question(id,index);
  assert.ok(isCorrect(String(value),q.answer,q.tolerance),`${id} question ${index+1}: ${value} versus ${q.answer}`);
};
const derivative=(fn,x)=>{
  const h=1e-5;
  return (fn(x+h)-fn(x-h))/(2*h);
};

// This stub exercises the actual lab renderer without duplicating its formulas.
function labRoot(id,parameters){
  const inputs=Object.entries(parameters).map(([name,value])=>({name,value:String(value)}));
  const nodes={'.lab-chart':{},'.lab-results':{},'.lab-caption':{}};
  return {dataset:{lab:id},inputs,nodes,
    querySelectorAll:selector=>selector==='input'?inputs:[],
    querySelector:selector=>nodes[selector]};
}

test('Small-answer grading rejects distinct rates and retains fractions and rounded answers',()=>{
  const rate=question('3.1',1),change=question('2.6',0);
  assert.equal(isCorrect('0.05',rate.answer,rate.tolerance),false);
  assert.equal(isCorrect('0.07',rate.answer,rate.tolerance),false);
  assert.equal(isCorrect('0.11',change.answer,change.tolerance),false);
  accepts('3.1',1,6/100);
  accepts('6.1',0,'1/6');
  accepts('7.2',3,'0.005');
  for(const id of ['1.6','5.3'])accepts(id,id==='1.6'?1:2,Math.log(2)/.2);
});

test('Profit and surplus graphs and samples enforce a nonnegative modeled price',()=>{
  for(const a of [40,50,60,80,100]){
    const root=labRoot('profit',{q:120,a,c:20});
    updateLab(root);
    const quantity=root.inputs.find(input=>input.name==='q');
    assert.ok(a-.5*Number(quantity.value)>=0);
    assert.equal(Number(quantity.max),Math.min(120,2*a));
    const table=sampleModel('profit',{a,c:20});
    assert.equal(table.rows.at(-1)[0],Number(quantity.max));
    for(const [q,value] of table.rows){
      assert.ok(a-.5*q>=0);
      assert.equal(value,profit(q,a,20));
    }
    const surplus=sampleModel('surplus',{a,b:10});
    assert.ok(surplus.rows.every(row=>row[1]>=0));
    // The model's market equilibrium is still inside the displayed domain.
    assert.ok(a-10<=surplus.rows.at(-1)[0]);
  }
  const root=labRoot('profit',{q:120,a:40,c:20});
  updateLab(root);
  root.inputs.find(input=>input.name==='a').value='80';
  updateLab(root);
  assert.equal(root.inputs.find(input=>input.name==='q').max,'120');
});

test('Plot clipping preserves off-screen curvature without drawing a false horizontal segment',()=>{
  const root=labRoot('functions',{a:3,h:8,k:2});
  updateLab(root);
  const html=root.nodes['.lab-chart'].innerHTML;
  assert.match(html,/<clipPath id="([^"]+)">/);
  assert.match(html,/<g clip-path="url\(#[^)]+\)">/);
  // f(0)=194 is above the viewport (maximum 100). The path keeps its true
  // screen coordinate; SVG clipping hides it rather than replacing it by 100.
  assert.match(html,/<path d="M62\.00,-201\.60 /);
});

test('Derivative answers agree with independent centered finite differences',()=>{
  const cases=[
    ['2.4',0,x=>x*x,4],['2.4',2,t=>3*t*t,2],
    ['2.5',0,x=>3*x**3,2],['2.5',2,q=>200+6*q+.1*q*q,30],
    ['3.2',0,t=>100*Math.exp(.2*t),0],['3.2',1,Math.log,5],['3.2',2,x=>Math.exp(3*x),0],
    ['3.3',0,x=>x*x*(x+1),2],['3.3',1,x=>x/(x+1),1],['3.3',2,p=>p*(120-2*p),20],
    ['3.4',0,x=>(3*x+1)**2,1],['3.4',1,x=>Math.log(2*x+1),0],['3.4',2,x=>Math.exp(-.5*x),0],
    ['3.5',0,x=>Math.sqrt(25-x*x),3],['3.5',1,x=>12/x,3],['3.5',2,x=>Math.sqrt(10-x),6],
    ['4.1',1,x=>x*x,-3],['4.1',2,x=>x**3,0],
    ['5.2',2,x=>x*x+5,3],['5.5',1,x=>x**3/3,3],
    ['6.3',1,x=>x*x,3],['7.2',0,x=>x*x+3*x*4,2],['7.2',1,y=>4+6*y,4],
    ['7.2',2,y=>100-2*(y-4)**2,6],
    ['8.2',0,t=>10*Math.sin(2*t),0],['8.2',1,t=>3*Math.cos(t),Math.PI/2],['8.2',2,Math.sin,Math.PI/2],
    ['2.5',3,x=>2*Math.sqrt(x)+3/x,4],['3.3',3,x=>x*x/(x+1),2],
    ['3.4',3,x=>Math.log(1+3*x*x),1],['5.5',3,x=>x**4/2+x*x,2],
    ['8.2',3,t=>80+15*Math.cos(Math.PI*t/6),3]
  ];
  for(const [id,index,fn,x] of cases)accepts(id,index,derivative(fn,x));
});

test('Accumulation answers agree with independent numerical quadrature',()=>{
  const cases=[
    ['5.1',0,q=>6+.2*q,0,10,200],
    ['5.2',0,x=>2*x*(x*x+1),0,1],['5.2',1,x=>3*Math.exp(3*x),0,1],
    ['5.4',0,t=>2*t+4,0,4],['5.4',1,()=>3,0,5],['5.4',2,()=>-3,0,2],
    ['5.5',0,q=>2*q+5,2,6],['6.1',0,x=>x-x*x,0,1],['6.1',2,x=>4-x,0,2],
    ['6.2',2,q=>60-.5*q-35,0,50],['6.3',0,x=>x*Math.exp(x),0,1],['6.3',2,Math.log,1,Math.E],
    ['7.6',0,()=>3*2,0,4],['7.6',1,()=>2,0,1],['7.6',2,y=>.5+y,0,2],
    ['7.7',0,x=>x,0,1],['7.7',1,x=>2*x,0,1],['7.7',2,x=>x*x/2,0,1],
    ['8.3',0,Math.sin,0,Math.PI],['8.3',1,Math.sin,0,2*Math.PI],['8.3',2,t=>5+2*Math.sin(t),0,2*Math.PI],
    ['5.1',3,q=>5+.4*q,0,40,350],['5.2',3,x=>6*x*(1+3*x*x)**2,0,1],
    ['6.1',3,x=>Math.abs(x-x*x),0,2],['6.2',3,t=>1000*Math.exp(-.05*t),0,3],
    ['6.3',3,x=>x*Math.exp(2*x),0,1],['7.6',3,y=>2+2*y,0,1,0,.5],
    ['7.7',3,x=>x*x,0,1],['8.3',3,t=>6+2*Math.cos(Math.PI*t/3),0,1.5]
  ];
  for(const [id,index,fn,a,b,initial=0,scale=1] of cases)
    accepts(id,index,initial+scale*numericalIntegral(fn,a,b,20000));
});
