import { fileURLToPath } from 'node:url';
import { buildSyntheticScenes } from './synthetic-connectivity-benchmark.mjs';
import { resolveStrokeConnectivity, evaluateConnectivity, aggregateConnectivityEvaluations, CONNECTIVITY_ALGORITHM_VERSION } from './endpoint-connectivity.js';
const line=(strokeId,x0,y0,x1,y1,width=1,cap='round',count=11)=>({strokeId,width,cap,points:Array.from({length:count},(_,i)=>({x:x0+(x1-x0)*i/(count-1),y:y0+(y1-y0)*i/(count-1),width,timestamp:i*4}))});
const curve=(strokeId,points,width=1)=>({strokeId,width,points:points.map(([x,y],i)=>({x,y,width,timestamp:i*4}))});
export function buildAdversarialScenes(){
  const taper=line('a',0,0,20,0,10);taper.points.at(-1).width=1;
  const scenes=[
    {name:'terminal-taper-no-contact',category:'taper',strokes:[taper,line('b',25,0,45,0)],truth:[]},
    {name:'high-score-tied-gap',category:'competition-near-contact',strokes:[line('a',0,0,20,0),line('b',21.03,-.1,40,-.1),line('c',21.03,.1,40,.1)],truth:[['b:start','c:start'],['b:end','c:end']]},
    {name:'third-stroke-blocks-virtual-bridge',category:'graph-obstacle',strokes:[line('a',0,0,20,0),line('b',22,0,42,0),line('bar',21,-15,21,15)],truth:[]},
    {name:'sparse-fast-continuation',category:'fast-sparse',strokes:[line('a',0,0,20,0,1,'round',2),line('b',21.8,0,42,0,1,'round',2)],truth:[['a:end','b:start']]},
    {name:'curves-positive-gap',category:'curves',strokes:[curve('a',[[0,4],[3,4],[6,3.7],[8,3],[9.5,2]],1.5),curve('b',[[11,1],[12,.2],[14,-.4],[17,-.5]],1.5)],truth:[['a:end','b:start']]},
    {name:'rough-finger-positive-gap',category:'finger-jitter',strokes:[curve('a',[[0,0],[3,.2],[6,-.15],[8,.25],[9.2,-.18],[10,.1]],1),curve('b',[[11.6,-.05],[13,.18],[15,-.2],[18,.1],[22,0]],1)],truth:[['a:end','b:start']]},
    {name:'single-stroke-closed-loop',category:'same-stroke',strokes:[curve('loop',[[0,0],[8,0],[8,8],[0,8],[0,0]],1)],truth:[['loop:start','loop:end']]},
    {name:'single-stroke-short-open',category:'same-stroke-negative',strokes:[line('a',0,0,4,0)],truth:[]},
    {name:'coincident-endpoint-junction',category:'junction',strokes:[line('a',0,0,20,0),line('b',20,0,40,0),line('c',20,0,20,20)],truth:[['a:end','b:start'],['a:end','c:start'],['b:start','c:start']]},
    {name:'unequal-widths-contact',category:'width-ratio',strokes:[line('a',0,0,20,0,8),line('b',24,0,50,0,1)],truth:[['a:end','b:start']]},
    {name:'subpixel-line-continuation',category:'very-thin',strokes:[line('a',0,0,10,0,.25),line('b',10.4,0,20,0,.25)],truth:[['a:end','b:start']]},
  ];
  for(const cap of ['butt','square']) {
    scenes.push({name:`${cap}-real-contact`,category:'cap-footprint',strokes:[line('a',0,0,20,0,2,cap),line('b',20,0,40,0,2,cap)],truth:[['a:end','b:start']]});
    scenes.push({name:`${cap}-gap-continuation`,category:'cap-footprint',strokes:[line('a',0,0,20,0,1,cap),line('b',cap==='butt'?20.7:21.7,0,40,0,1,cap)],truth:[['a:end','b:start']]});
  }
  for(const angle of [20,70,150]) {
    const theta=angle*Math.PI/180,g={x:Math.cos(theta/2)*1.65,y:Math.sin(theta/2)*1.65};
    scenes.push({name:`corner-turn-${angle}`,category:'corner-adversarial',strokes:[line('a',0,0,20,0),line('b',20+g.x,g.y,20+g.x+20*Math.cos(theta),g.y+20*Math.sin(theta))],truth:[['a:end','b:start']]});
  }
  return scenes;
}
function measure(scenes){return scenes.map(scene=>{const graph=resolveStrokeConnectivity(scene.strokes,{endpointToSegment:false}),metrics=evaluateConnectivity(graph,scene.truth);return {name:scene.name,category:scene.category,metrics,falsePairs:metrics.falseConnectionPairs,missedPairs:metrics.missedConnectionPairs,candidates:graph.candidates.filter(c=>metrics.falseConnectionPairs.concat(metrics.missedConnectionPairs).includes([c.endpointA,c.endpointB].sort().join('|')))};});}
export function runExpandedBenchmark(){
  const baseline=measure(buildSyntheticScenes()),adversarial=measure(buildAdversarialScenes()),variants=[];
  for(const scene of [...buildSyntheticScenes(),...buildAdversarialScenes()]) for(const scale of [.1,1,13]) for(const angle of [.31,1.57,2.6]) for(const reversed of [false,true]) {
    const strokes=scene.strokes.map(s=>({...s,width:s.width*scale,points:s.points.map(p=>({...p,x:100+scale*(p.x*Math.cos(angle)-p.y*Math.sin(angle)),y:-80+scale*(p.x*Math.sin(angle)+p.y*Math.cos(angle)),width:(p.width??s.width)*scale}))}));
    if(reversed)strokes.reverse();variants.push({...scene,name:`${scene.name}/scale${scale}/rotation${angle}/order${reversed}`,strokes});
  }
  const metamorphic=measure(variants);
  const summary=rows=>aggregateConnectivityEvaluations(rows.map(r=>r.metrics));
  return {schema:'illustro.stroke-connectivity-expanded-synthetic.v2',algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,generatedAt:new Date().toISOString(),note:'Synthetic fixture labels are declared geometry conventions, not observed human ground truth. Transformed scenes are correlated and not independent samples. T-junction/crossing only test absence of invented endpoint pairs; segment connectivity is not measured.',baseline:summary(baseline),adversarial:summary(adversarial),metamorphic:summary(metamorphic),failures:[...baseline,...adversarial,...metamorphic].filter(r=>!r.metrics.graphExactMatch),baseScenes:[...baseline,...adversarial]};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])console.log(JSON.stringify(runExpandedBenchmark(),null,2));
