import { targetKey } from './endpoint-connectivity.js';

// Group connection sites, never whole strokes: two independent junctions on
// one stroke must keep different colors. Group identity is exported with notes.
export function buildReviewDisplay(graph) {
  const nodes=new Map(graph.endpoints.map((e,i)=>[e.endpointId,{kind:'endpoint',key:e.endpointId,endpointId:e.endpointId,strokeId:e.strokeId,position:e.position,label:String(i+1),order:i}]));
  const parent=new Map();
  const root=k=>{if(!parent.has(k))parent.set(k,k);let r=k;while(parent.get(r)!==r)r=parent.get(r);while(parent.get(k)!==k){const n=parent.get(k);parent.set(k,r);k=n;}return r;};
  const union=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent.set(b,a);};
  const segmentNode=t=>{
    const key=targetKey(t);
    if(!nodes.has(key))nodes.set(key,{kind:'segment',key,strokeId:t.strokeId,position:t.position,arcFraction:t.arcFraction,label:`線${t.strokeId.replace('stroke-','')}の途中 ${Math.round(t.arcFraction*100)}%`,order:Infinity});
    return key;
  };
  for(const edge of graph.edges){
    const a=edge.from.endpointId, b=edge.to.kind==='endpoint'?edge.to.endpointId:segmentNode(edge.to);
    union(a,b);
    if(edge.geometry?.kind==='one-sided-extension'&&edge.geometry.target.arcFraction>1e-6&&edge.geometry.target.arcFraction<1-1e-6)union(a,segmentNode(edge.geometry.target));
  }
  const groups=new Map();
  for(const key of parent.keys()){const r=root(key);if(!groups.has(r))groups.set(r,{members:[],edges:[]});groups.get(r).members.push(nodes.get(key));}
  for(const edge of graph.edges)groups.get(root(edge.from.endpointId)).edges.push(edge);
  const sorted=[...groups.values()].sort((a,b)=>Math.min(...a.members.map(m=>m.order))-Math.min(...b.members.map(m=>m.order)));
  const palette=['#66d9ef','#ffa76b','#c4a0ff','#6ee7a0','#ff8bb8','#e6d36b','#80b8ff','#dfb38a'];
  return {schema:'illustro.connectivity-display.v1',algorithmVersion:graph.algorithmVersion,geometryPolicy:'one-sided-extension-v1',groups:sorted.map((g,i)=>({...g,groupId:`group-${i+1}`,number:i+1,color:i<palette.length?palette[i]:`hsl(${(i*137.508)%360} 75% 70%)`})),endpoints:[...nodes.values()].filter(n=>n.kind==='endpoint'),ambiguous:graph.candidates.filter(c=>c.decision==='ambiguous').map(c=>({endpointA:c.endpointA,target:c.target,candidateId:c.candidateId,reason:c.decisionReason}))};
}

export function recordReview(record,note,display) {
  return {...record,feedback:{schema:'illustro.connectivity-feedback.v1',kind:'qualitative-review',severity:'blocking',note,display:structuredClone(display),scope:'Notes describe reported defects only; absence of a note is not a correctness label.'}};
}
