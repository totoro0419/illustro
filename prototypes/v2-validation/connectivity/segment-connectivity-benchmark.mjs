import { fileURLToPath } from 'node:url';
import {resolveStrokeConnectivity,evaluateConnectivity,aggregateConnectivityEvaluations,CONNECTIVITY_ALGORITHM_VERSION} from './endpoint-connectivity.js';
const line=(strokeId,x0,y0,x1,y1,width=1,cap='round',count=11)=>({strokeId,width,cap,points:Array.from({length:count},(_,i)=>({x:x0+(x1-x0)*i/(count-1),y:y0+(y1-y0)*i/(count-1),width,timestamp:i*6}))});
const es=(endpointA,strokeId,arcFraction=.5)=>({endpointA,target:{kind:'segment',strokeId,arcFraction}});
export function buildSegmentScenes(){
  const scenes=[];
  for(const cap of ['round','butt','square']) {
    scenes.push({name:`T-contact-${cap}`,category:'T',strokes:[line('bar',0,0,40,0,2,cap),line('stem',20,0,20,20,2,cap)],truth:[es('stem:start','bar')]});
    // Center endpoint offset so each declared footprint has an actual positive .1w gap.
    const y=cap==='butt'?1.2:2.2;
    scenes.push({name:`T-separated-${cap}`,category:'separated',strokes:[line('bar',0,0,40,0,2,cap),line('stem',20,y,20,20,2,cap)],truth:[]});
    scenes.push({name:`T-unequal-width-${cap}`,category:'width-ratio',strokes:[line('bar',0,0,60,0,8,cap),line('stem',30,0,30,25,1,cap)],truth:[es('stem:start','bar')]});
    scenes.push({name:`Y-${cap}`,category:'Y',strokes:[line('trunk',0,0,0,40,2,cap),line('left',-15,0,0,20,2,cap),line('right',15,0,0,20,2,cap)],truth:[es('left:end','trunk'),es('right:end','trunk'),['left:end','right:end']]});
    scenes.push({name:`crossing-near-endpoint-${cap}`,category:'crossing-near',strokes:[line('h',-20,0,20,0,2,cap),line('v',0,-20,0,20,2,cap),line('stem',0,0,12,12,1,cap)],truth:[es('stem:start','h'),es('stem:start','v')]});
  }
  scenes.push({name:'interior-crossing-no-endpoint',category:'interior-crossing',strokes:[line('h',-20,0,20,0),line('v',0,-20,0,20)],truth:[]});
  const arcPoints=Array.from({length:31},(_,i)=>{const t=i*Math.PI/30;return {x:20*Math.cos(t),y:20*Math.sin(t),width:2};});
  scenes.push({name:'curve-T-at-vertex',category:'curve',strokes:[{strokeId:'arc',width:2,points:arcPoints},line('stem',0,20,0,40,2)],truth:[es('stem:start','arc')]});
  const taperedBar=line('bar',0,0,40,0,8);taperedBar.points=taperedBar.points.map((p,i)=>({...p,width:i===5?1:8}));
  scenes.push({name:'width-change-thin-notch-separated',category:'variable-width',strokes:[taperedBar,line('stem',20,2.5,20,20,1)],truth:[]});
  scenes.push({name:'width-change-thin-notch-contact',category:'variable-width',strokes:[taperedBar,line('stem',20,0,20,20,1)],truth:[es('stem:start','bar')]});
  scenes.push({name:'dense-separated-lines',category:'dense',strokes:[line('bar',0,0,60,0,1),line('near',0,3,60,3,1),line('stem',30,1.5,30,20,1)],truth:[es('near:end','stem',.08108108108108109)]});
  // The near bar crosses the stem interior: neither has an endpoint at that crossing.
  scenes.at(-1).truth=[];
  scenes.push({name:'dense-contact-and-false-neighbor',category:'dense',strokes:[line('bar',0,0,60,0,1),line('near',0,-3,60,-3,1),line('stem',30,0,30,20,1)],truth:[es('stem:start','bar')]});
  scenes.push({name:'very-thin-T',category:'thin',strokes:[line('bar',0,0,30,0,.3),line('stem',15,0,15,12,.3)],truth:[es('stem:start','bar')]});
  scenes.push({name:'thick-T',category:'thick',strokes:[line('bar',0,0,100,0,20),line('stem',50,0,50,60,16)],truth:[es('stem:start','bar')]});
  scenes.push({name:'parallel-side-contact',category:'parallel',strokes:[line('bar',0,0,60,0,2),line('stem',20,1.5,40,1.5,2)],truth:[es('stem:start','bar',1/3),es('stem:end','bar',2/3)]});
  return scenes;
}
function transform(scene,scale,angle,reverseOrder,reversePoints){
 const strokes=scene.strokes.map(s=>({...s,width:s.width*scale,points:s.points.map(p=>({...p,x:300+scale*(p.x*Math.cos(angle)-p.y*Math.sin(angle)),y:-40+scale*(p.x*Math.sin(angle)+p.y*Math.cos(angle)),width:(p.width??s.width)*scale}))}));if(reverseOrder)strokes.reverse();if(reversePoints)for(const s of strokes)s.points.reverse();
 const flip=id=>id.endsWith(':start')?id.slice(0,-6)+':end':id.slice(0,-4)+':start';
 const truth=scene.truth.map(t=>!reversePoints?t:Array.isArray(t)?t.map(flip):({...t,endpointA:flip(t.endpointA),target:{...t.target,arcFraction:1-t.target.arcFraction}}));
 return {...scene,name:`${scene.name}/s${scale}/a${angle}/o${reverseOrder}/p${reversePoints}`,strokes,truth};
}
export function runSegmentBenchmark(){
 const scenes=buildSegmentScenes(),rows=[],variantRows=[];
 const measure=(s,options={})=>{const graph=resolveStrokeConnectivity(s.strokes,options),metrics=evaluateConnectivity(graph,s.truth);return {name:s.name,category:s.category,metrics,diagnostics:graph.candidates.filter(c=>!c.connected||c.target.kind==='segment').map(c=>({id:c.candidateId,target:c.target,model:c.connectionModel,confidence:c.confidence,effectiveGap:c.effectiveGap,decision:c.decision,reason:c.decisionReason}))};};
 for(const s of scenes)rows.push(measure(s));
 for(const s of scenes)for(const scale of [.1,1,12])for(const angle of [0,.7,2.3])for(const reverseOrder of [false,true])for(const reversePoints of [false,true])variantRows.push(measure(transform(s,scale,angle,reverseOrder,reversePoints)));
 const before=scenes.map(s=>measure(s,{endpointToSegment:false}));
 return {schema:'illustro.stroke-segment-connectivity-synthetic.v1',algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,generatedAt:new Date().toISOString(),note:'Declared synthetic vector-tube geometry labels only. Variants are correlated. Human input accuracy remains unverified. Interior crossings without endpoints are intentionally not resolved.',beforeEndpointOnly:aggregateConnectivityEvaluations(before.map(r=>r.metrics)),after:aggregateConnectivityEvaluations(rows.map(r=>r.metrics)),transforms:aggregateConnectivityEvaluations(variantRows.map(r=>r.metrics)),failures:[...rows,...variantRows].filter(r=>!r.metrics.graphExactMatch),scenes:rows};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])console.log(JSON.stringify(runSegmentBenchmark(),null,2));
