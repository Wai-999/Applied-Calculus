import {profit,population,logistic,elasticity,flow,accumulated,surface} from '../../math.js';
export function sampleModel(id,p,count=25){
  let max=10,headers=['Input','Output'],fn;
  switch(id){
    case 'functions': fn=x=>[p.a*(x-p.h)**2+p.k]; break;
    case 'limits': max=4;fn=x=>[x===2?null:x+2];break;
    case 'derivative':max=6;headers=['x','f(x)=x²','Tangent','Secant'];fn=x=>[x*x,p.x*p.x+2*p.x*(x-p.x),p.x*p.x+(2*p.x+p.h)*(x-p.x)];break;
    case 'profit':case 'optimization':max=120;headers=['Quantity','Profit ($)','Marginal profit ($/unit)'];fn=x=>[profit(x,p.a??80,p.c??20),(p.a??80)-(p.c??20)-x];break;
    case 'growth':headers=['Time (hours)','Population','Growth/hour'];fn=x=>[population(x,p.r),p.r*population(x,p.r)];break;
    case 'elasticity':max=60;headers=['Price ($)','Demand','Revenue ($)','Elasticity'];fn=x=>[120-2*x,x*(120-2*x),x===60?null:elasticity(x)];break;
    case 'integral':max=p.t;headers=['Time (minutes)','Flow (L/min)','Exact total (L)'];fn=x=>[flow(x),accumulated(x)];break;
    case 'surplus':max=100;headers=['Quantity','Demand price','Supply price','Equilibrium price'];fn=x=>[p.a-0.5*x,p.b+0.5*x,(p.a+p.b)/2];break;
    case 'inequality':max=1;headers=['Population share','Income share','Equality line'];fn=x=>[x**p.a,x];break;
    case 'adoption':max=15;headers=['Time (weeks)','Adopters','New adopters/week'];fn=x=>{const n=logistic(x,p.r);return [n,p.r*n*(1-n/1000)];};break;
    case 'surface':headers=['Resource x','Score (y held fixed)','Partial in x'];fn=x=>[surface(x,p.y),-2*(x-5)];break;
    case 'regression':max=4;headers=['x','Predicted y'];fn=x=>[1/3+p.b*x];break;
    case 'waves':max=24;headers=['Time (months)','Demand','Rate/month'];fn=x=>[50+p.a*Math.sin(2*Math.PI*x/p.t),p.a*2*Math.PI/p.t*Math.cos(2*Math.PI*x/p.t)];break;
    default:throw new Error('Unknown model: '+id);
  }
  return {headers,rows:Array.from({length:count},(_,i)=>{const x=max*i/(count-1);return [x,...fn(x)];})};
}
export function toCSV(sample){
  return [sample.headers.join(','),...sample.rows.map(row=>row.map(value=>value===null?'':Number(value.toFixed(6))).join(','))].join('\n');
}
