import { performance } from 'node:perf_hooks';

export class EvidenceGrid {
  constructor(width,height){this.width=width;this.height=height;this.data=new Float32Array(width*height);this.userPinned=new Uint8Array(width*height);}
  index(x,y){return y*this.width+x;}
  inBounds(x,y){return x>=0&&y>=0&&x<this.width&&y<this.height;}
  set(x,y,v=1){if(this.inBounds(x,y))this.data[this.index(x,y)]=v;return this;}
  pin(x,y,on=true){if(this.inBounds(x,y))this.userPinned[this.index(x,y)]=on?1:0;return this;}
  get(x,y){return this.inBounds(x,y)?this.data[this.index(x,y)]:0;}
  clone(){const g=new EvidenceGrid(this.width,this.height);g.data.set(this.data);g.userPinned.set(this.userPinned);return g;}
  combine(other){if(other.width!==this.width||other.height!==this.height)throw new Error('grid size mismatch');for(let i=0;i<this.data.length;i++){this.data[i]=Math.max(this.data[i],other.data[i]);this.userPinned[i]=this.userPinned[i]||other.userPinned[i];}return this;}
}

export function line(g,x0,y0,x1,y1,v=1,width=1){
  const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy,x=x0,y=y0;
  while(true){for(let oy=-Math.floor((width-1)/2);oy<=Math.ceil((width-1)/2);oy++)for(let ox=-Math.floor((width-1)/2);ox<=Math.ceil((width-1)/2);ox++)g.set(x+ox,y+oy,v);if(x===x1&&y===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x+=sx;}if(e2<=dx){err+=dx;y+=sy;}}
  return g;
}
export function rect(g,x0,y0,x1,y1,v=1,width=1){line(g,x0,y0,x1,y0,v,width);line(g,x1,y0,x1,y1,v,width);line(g,x1,y1,x0,y1,v,width);line(g,x0,y1,x0,y0,v,width);return g;}

function buildBaseMask(grid,threshold){
  const mask=new Uint8Array(grid.data.length);for(let i=0;i<mask.length;i++)mask[i]=(grid.data[i]>=threshold||grid.userPinned[i])?1:0;return mask;
}
function degree(mask,w,h,x,y){let n=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<w&&ny<h&&mask[ny*w+nx])n++;}return n;}

function bridgeCandidates(base,w,h,gapMax,scanRect=null){
  const cellCandidates=new Map();const add=(cells,orientation,endpoints)=>{const id=`${orientation}:${endpoints.join(',')}`;for(const idx of cells){let a=cellCandidates.get(idx);if(!a){a=[];cellCandidates.set(idx,a);}a.push({id,cells,orientation,endpoints});}};
  const minY=scanRect?Math.max(0,scanRect.y0):0,maxY=scanRect?Math.min(h-1,scanRect.y1):h-1;
  const minX=scanRect?Math.max(0,scanRect.x0):0,maxX=scanRect?Math.min(w-1,scanRect.x1):w-1;
  for(let y=minY;y<=maxY;y++){
    let x=0;while(x<w){if(!base[y*w+x]){x++;continue;}let e=x+1;while(e<w&&!base[y*w+e]&&e-x-1<=gapMax)e++;const gap=e-x-1;if(e<w&&gap>0&&gap<=gapMax&&base[y*w+e]){const cells=[];for(let gx=x+1;gx<e;gx++)cells.push(y*w+gx);add(cells,'h',[y*w+x,y*w+e]);}x=Math.max(x+1,e);}
  }
  for(let x=minX;x<=maxX;x++){
    let y=0;while(y<h){if(!base[y*w+x]){y++;continue;}let e=y+1;while(e<h&&!base[e*w+x]&&e-y-1<=gapMax)e++;const gap=e-y-1;if(e<h&&gap>0&&gap<=gapMax&&base[e*w+x]){const cells=[];for(let gy=y+1;gy<e;gy++)cells.push(gy*w+x);add(cells,'v',[y*w+x,e*w+x]);}y=Math.max(y+1,e);}
  }
  return cellCandidates;
}

function applyBridges(base,w,h,gapMax,scanRect=null){
  const bridge=new Uint8Array(base.length);const candidates=bridgeCandidates(base,w,h,gapMax,scanRect);const ambiguousCells=[];const seen=new Set();
  for(const [idx,arr] of candidates){
    const unique=[...new Map(arr.map(a=>[a.id,a])).values()];
    const valid=[];
    for(const c of unique){
      const [a,b]=c.endpoints;const ax=a%w,ay=Math.floor(a/w),bx=b%w,by=Math.floor(b/w);
      const directional = c.orientation==='h'
        ? (ax-1>=0 && bx+1<w && base[ay*w+(ax-1)] && base[by*w+(bx+1)])
        : (ay-1>=0 && by+1<h && base[(ay-1)*w+ax] && base[(by+1)*w+bx]);
      if(!directional) continue;
      valid.push({c,branchy:degree(base,w,h,ax,ay)>2||degree(base,w,h,bx,by)>2});
    }
    if(valid.length>1||valid.some(v=>v.branchy)){ambiguousCells.push(idx);continue;}
    if(valid.length===0)continue;
    const c=valid[0].c;
    if(!seen.has(c.id)){for(const ci of c.cells)bridge[ci]=1;seen.add(c.id);}
  }
  const mask=base.slice();for(let i=0;i<mask.length;i++)if(bridge[i])mask[i]=1;
  return {bridge,mask,ambiguousCells,candidateCount:seen.size};
}

function topology(mask,w,h){
  const labels=new Int32Array(mask.length);labels.fill(-2);
  for(let i=0;i<mask.length;i++)if(mask[i])labels[i]=-1;
  const components=[];let label=0;const q=[];
  for(let start=0;start<mask.length;start++){
    if(labels[start]!==-2)continue;let head=0;q.length=0;q.push(start);labels[start]=label;let area=0,sx=0,sy=0,touchesEdge=false;const cells=[];let minX=w,minY=h,maxX=-1,maxY=-1;
    while(head<q.length){const idx=q[head++],x=idx%w,y=Math.floor(idx/w);cells.push(idx);area++;sx+=x;sy+=y;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(x===0||y===0||x===w-1||y===h-1)touchesEdge=true;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const ni=ny*w+nx;if(labels[ni]===-2){labels[ni]=label;q.push(ni);}}
    }
    components.push({label,area,centroid:[sx/area,sy/area],bounds:[minX,minY,maxX,maxY],touchesEdge,cells});label++;
  }
  const faces=components.filter(c=>!c.touchesEdge).map((c,i)=>({...c,faceIndex:i,id:null}));
  return {labels,components,faces,visited:mask.length-mask.reduce((a,b)=>a+b,0)};
}

function boundaryConfidence(grid,base,bridge,policy){
  let min=1,sum=0,n=0,bridgeCount=0;
  for(let i=0;i<base.length;i++)if(base[i]){const v=grid.userPinned[i]?1:grid.data[i];min=Math.min(min,v);sum+=v;n++;}
  for(const b of bridge)if(b)bridgeCount++;
  const evidence=n?sum/n:1;
  const bridgePenalty=bridgeCount?Math.min(0.25,bridgeCount/(grid.width+grid.height)*0.5):0;
  const score=Math.max(0,Math.min(1,0.65*evidence+0.35*min-bridgePenalty));
  return {score,evidenceMean:evidence,evidenceMin:min,bridgeCount,accepted:score>=policy.confidenceThreshold};
}

export function resolveRegion(grid,policy){
  const base=buildBaseMask(grid,policy.evidenceThreshold);const b=applyBridges(base,grid.width,grid.height,policy.gapMax);const topo=topology(b.mask,grid.width,grid.height);const confidence=boundaryConfidence(grid,base,b.bridge,policy);
  let status='Current';const reasons=[];
  if(b.ambiguousCells.length){status='Ambiguous';reasons.push('competing-gap-bridge');}
  else if(!confidence.accepted){status='Unresolved';reasons.push('low-boundary-confidence');}
  return {gridWidth:grid.width,gridHeight:grid.height,baseMask:base,bridgeMask:b.bridge,mask:b.mask,ambiguousCells:b.ambiguousCells,topology:topo,faces:topo.faces,confidence,status,reasons,policy:{...policy}};
}

function cellSet(face){return new Set(face.cells);}
function overlapCount(a,b){const sb=cellSet(b);let n=0;for(const x of a.cells)if(sb.has(x))n++;return n;}
function iou(a,b){const ov=overlapCount(a,b);return ov/(a.area+b.area-ov);}

function boundsNear(a,b,pad){
  return !(a[2]+pad < b[0] || b[2]+pad < a[0] || a[3]+pad < b[1] || b[3]+pad < a[1]);
}

let nextId=1;
export function resetPrototypeIds(){nextId=1;}
function freshId(){return `region-${String(nextId++).padStart(4,'0')}`;}

export function assignInitialIds(result){for(const f of result.faces)f.id=freshId();return result;}

export function reconcileRegions(oldResult,newResult,policy,{transformLineage=null,assignments=new Map()}={}){
  const decisions=[];let ambiguous=false;
  const oldFaces=oldResult.faces,newFaces=newResult.faces;
  if(transformLineage){
    for(let i=0;i<Math.min(oldFaces.length,newFaces.length);i++){newFaces[i].id=oldFaces[i].id;decisions.push({kind:'transform-retain',oldIds:[oldFaces[i].id],newIds:[newFaces[i].id]});}
    return {decisions,ambiguous:false,status:'Current'};
  }
  const overlaps=oldFaces.map(o=>newFaces.map(n=>boundsNear(o.bounds,n.bounds,policy.candidateSearchPx)?overlapCount(o,n):0));
  const significant=(ov,a)=>ov/Math.max(1,a)>=policy.lineageOverlapFraction;
  const oldChildren=oldFaces.map((o,oi)=>newFaces.map((n,ni)=>({ni,ov:overlaps[oi][ni]})).filter(x=>significant(x.ov,o.area)));
  const newParents=newFaces.map((n,ni)=>oldFaces.map((o,oi)=>({oi,ov:overlaps[oi][ni]})).filter(x=>significant(x.ov,n.area)));

  const claimedNew=new Set();
  oldChildren.forEach((children,oi)=>{
    if(children.length>1){for(const {ni} of children){if(!newFaces[ni].id)newFaces[ni].id=freshId();claimedNew.add(ni);decisions.push({kind:'split',oldIds:[oldFaces[oi].id],newIds:[newFaces[ni].id],lineageParents:[oldFaces[oi].id]});}}
  });
  newParents.forEach((parents,ni)=>{
    if(parents.length>1){if(!newFaces[ni].id)newFaces[ni].id=freshId();claimedNew.add(ni);const pids=parents.map(p=>oldFaces[p.oi].id);const vals=pids.map(id=>assignments.get(id)).filter(v=>v!==undefined);const conflict=new Set(vals).size>1;if(conflict)ambiguous=true;decisions.push({kind:'merge',oldIds:pids,newIds:[newFaces[ni].id],lineageParents:pids,assignmentConflict:conflict});}
  });
  for(let ni=0;ni<newFaces.length;ni++){
    if(claimedNew.has(ni))continue;
    const scored=oldFaces.map((o,oi)=>({oi,score:iou(o,newFaces[ni])})).sort((a,b)=>b.score-a.score);
    const best=scored[0]??{score:0,oi:-1},second=scored[1]??{score:0,oi:-1};const margin=best.score-second.score;
    if(best.oi>=0&&best.score>=policy.retainIou&&margin>=policy.identityMargin&&oldChildren[best.oi].length<=1&&newParents[ni].length<=1){newFaces[ni].id=oldFaces[best.oi].id;decisions.push({kind:'retain',oldIds:[oldFaces[best.oi].id],newIds:[newFaces[ni].id],score:best.score,margin});}
    else if(best.score>0&&best.score>=policy.ambiguousIouFloor){newFaces[ni].id=freshId();ambiguous=true;decisions.push({kind:'ambiguous',oldIds:best.oi>=0?[oldFaces[best.oi].id]:[],newIds:[newFaces[ni].id],score:best.score,margin});}
    else {newFaces[ni].id=freshId();decisions.push({kind:'create',oldIds:[],newIds:[newFaces[ni].id]});}
  }
  return {decisions,ambiguous,status:ambiguous?'Ambiguous':'Current'};
}

export function faceSignature(result){return result.faces.map(f=>f.cells.slice().sort((a,b)=>a-b).join(',')).sort();}

export function incrementalResolve(prev,grid,dirty,policy){
  const expand=policy.gapMax+2;const r={x0:Math.max(0,dirty.x0-expand),y0:Math.max(0,dirty.y0-expand),x1:Math.min(grid.width-1,dirty.x1+expand),y1:Math.min(grid.height-1,dirty.y1+expand)};
  const base=prev.baseMask.slice();
  for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++){const i=y*grid.width+x;base[i]=(grid.data[i]>=policy.evidenceThreshold||grid.userPinned[i])?1:0;}
  const bridge=prev.bridgeMask.slice();
  for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++)bridge[y*grid.width+x]=0;
  const local=applyBridges(base,grid.width,grid.height,policy.gapMax,r);
  for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++){const i=y*grid.width+x;if(local.bridge[i])bridge[i]=1;}
  const mask=base.slice();for(let i=0;i<mask.length;i++)if(bridge[i])mask[i]=1;

  const affectedLabels=new Set();const changed=[];
  for(let y=r.y0;y<=r.y1;y++)for(let x=r.x0;x<=r.x1;x++){
    const i=y*grid.width+x;if(mask[i]!==prev.mask[i])changed.push(i);
  }
  for(const i of changed){
    const x=i%grid.width,y=Math.floor(i/grid.width);const l=prev.topology.labels[i];if(l>=0)affectedLabels.add(l);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<grid.width&&ny<grid.height){const nl=prev.topology.labels[ny*grid.width+nx];if(nl>=0)affectedLabels.add(nl);}}
  }
  let affectedCells=0;for(const c of prev.topology.components)if(affectedLabels.has(c.label))affectedCells+=c.area;
  affectedCells+=changed.length;
  const full=topology(mask,grid.width,grid.height);
  const confidence=boundaryConfidence(grid,base,bridge,policy);let status='Current';const reasons=[];
  if(local.ambiguousCells.length){status='Ambiguous';reasons.push('competing-gap-bridge');} else if(!confidence.accepted){status='Unresolved';reasons.push('low-boundary-confidence');}
  return {gridWidth:grid.width,gridHeight:grid.height,baseMask:base,bridgeMask:bridge,mask,ambiguousCells:local.ambiguousCells,topology:full,faces:full.faces,confidence,status,reasons,policy:{...policy},incremental:{dirty:r,changedMaskCells:changed.length,affectedOldCells:affectedCells,fullDomainCells:grid.width*grid.height}};
}

export class TopologyGenerationController {
  constructor(){this.next=1;this.latestRequested=0;this.current=null;}
  begin(){const id=this.next++;this.latestRequested=id;return {generationId:id,state:'Updating'};}
  publish(job,result){
    if(job.generationId!==this.latestRequested)return {generationId:job.generationId,state:'Retired',result:null};
    this.current={generationId:job.generationId,state:result.status==='Current'?'Current':result.status,result};return this.current;
  }
}

export function calibrateRegion(fixtures,transitions){
  const topologyRows=[];
  for(const evidenceThreshold of [0.4,0.45,0.5,0.55]) for(const gapMax of [1,2,3]) for(const confidenceThreshold of [0.55,0.6,0.65]){
    const policy={evidenceThreshold,gapMax,confidenceThreshold,retainIou:0.7,identityMargin:0.15,ambiguousIouFloor:0.3,lineageOverlapFraction:0.18,candidateSearchPx:16};
    let pass=0,ambiguityFalsePositive=0;
    for(const f of fixtures){const r=resolveRegion(f.grid,policy);if(r.status===f.expectStatus&&r.faces.length===f.expectFaces)pass++;if(r.status==='Ambiguous'&&f.expectStatus!=='Ambiguous')ambiguityFalsePositive++;}
    const score=pass/fixtures.length-ambiguityFalsePositive*0.02-gapMax*0.0001;
    topologyRows.push({policy,pass,total:fixtures.length,score,ambiguityFalsePositive});
  }
  topologyRows.sort((a,b)=>b.score-a.score||a.policy.gapMax-b.policy.gapMax||b.policy.evidenceThreshold-a.policy.evidenceThreshold||b.policy.confidenceThreshold-a.policy.confidenceThreshold);
  const top=topologyRows[0].policy;

  const identityRows=[];
  for(const retainIou of [0.6,0.7,0.8]) for(const identityMargin of [0.1,0.15,0.2]) for(const candidateSearchPx of [4,8,16,32]){
    const policy={...top,retainIou,identityMargin,candidateSearchPx};let pass=0;
    resetPrototypeIds();
    for(const tr of transitions){const a=assignInitialIds(resolveRegion(tr.oldGrid,policy));const b=resolveRegion(tr.newGrid,policy);const rec=reconcileRegions(a,b,policy,tr.options??{});if(tr.check(a,b,rec))pass++;}
    const score=pass/transitions.length-candidateSearchPx*0.000001;
    identityRows.push({policy,pass,total:transitions.length,score});
  }
  identityRows.sort((a,b)=>b.score-a.score||a.policy.candidateSearchPx-b.policy.candidateSearchPx||b.policy.retainIou-a.policy.retainIou||b.policy.identityMargin-a.policy.identityMargin);
  const bestPolicy=identityRows[0].policy;

  const candidates=[];
  for(const row of identityRows){
    let pass=0,total=0,ambiguityFalsePositive=0;
    for(const f of fixtures){const r=resolveRegion(f.grid,row.policy);total++;if(r.status===f.expectStatus&&r.faces.length===f.expectFaces)pass++;if(r.status==='Ambiguous'&&f.expectStatus!=='Ambiguous')ambiguityFalsePositive++;}
    resetPrototypeIds();
    for(const tr of transitions){const a=assignInitialIds(resolveRegion(tr.oldGrid,row.policy));const b=resolveRegion(tr.newGrid,row.policy);const rec=reconcileRegions(a,b,row.policy,tr.options??{});total++;if(tr.check(a,b,rec))pass++;}
    candidates.push({policy:row.policy,pass,total,score:pass/total-ambiguityFalsePositive*0.02-row.policy.candidateSearchPx*0.000001,ambiguityFalsePositive,topologyCalibration:topologyRows[0],identityCalibration:row});
  }
  candidates.sort((a,b)=>b.score-a.score||a.policy.candidateSearchPx-b.policy.candidateSearchPx||b.policy.retainIou-a.policy.retainIou||b.policy.identityMargin-a.policy.identityMargin);
  if(JSON.stringify(candidates[0].policy)!==JSON.stringify(bestPolicy)) throw new Error('calibration ranking mismatch');
  return candidates;
}

export function benchmarkRegion(fixtures,policy){
  const times=[];let cells=0;
  for(let rep=0;rep<10;rep++)for(const f of fixtures){const t0=performance.now();resolveRegion(f.grid,policy);times.push(performance.now()-t0);cells+=f.grid.width*f.grid.height;}
  times.sort((a,b)=>a-b);const pct=p=>times[Math.min(times.length-1,Math.floor((times.length-1)*p))];
  return {p50Ms:pct(.5),p95Ms:pct(.95),p99Ms:pct(.99),maxMs:times.at(-1),runs:times.length,totalCells:cells};
}
