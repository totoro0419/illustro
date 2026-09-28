import { EvidenceGrid, rect, line } from './region.js';

function erase(g,x,y){g.set(x,y,0);return g;}
function eraseRunH(g,x0,x1,y){for(let x=x0;x<=x1;x++)erase(g,x,y);return g;}
function noisyRect(size=64,seed=1){const g=new EvidenceGrid(size,size);let s=seed>>>0;const rnd=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/0x100000000);for(let i=0;i<g.data.length;i++)g.data[i]=rnd()*0.28;rect(g,12,12,size-13,size-13,0.9);return g;}

export function staticRegionFixtures(){
  const fs=[];
  {const g=new EvidenceGrid(64,64);rect(g,12,12,50,50,1);fs.push({name:'clean-closed',class:'clean closed lineart',grid:g,expectFaces:1,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,12,12,50,50,.66);fs.push({name:'antialiased',class:'anti-aliased lineart',grid:g,expectFaces:1,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,12,12,50,50,.70);fs.push({name:'colored-line',class:'colored lineart evidence',grid:g,expectFaces:1,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,12,12,50,50,.9,1);line(g,12,50,50,50,.9,3);fs.push({name:'varied-width',class:'varied line width',grid:g,expectFaces:1,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,12,12,50,50,1);eraseRunH(g,30,31,12);fs.push({name:'small-gap',class:'very small gaps',grid:g,expectFaces:1,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,12,12,50,50,1);eraseRunH(g,28,33,12);fs.push({name:'intentional-opening',class:'intentional openings',grid:g,expectFaces:0,expectStatus:'Current'});}
  {const g=new EvidenceGrid(80,64);rect(g,8,12,35,50,1);rect(g,39,12,70,50,1);fs.push({name:'near-touching',class:'near-touching lines',grid:g,expectFaces:2,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,8,8,55,55,1);line(g,31,8,31,55,1);line(g,8,31,31,31,1);fs.push({name:'t-junction',class:'crossings/T-junctions',grid:g,expectFaces:3,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,10,10,54,54,1);line(g,32,10,32,54,1);line(g,10,32,54,32,1);erase(g,32,32);fs.push({name:'false-bridge',class:'false bridge candidates',grid:g,expectFaces:5,expectStatus:'Ambiguous'});}
  {const g=new EvidenceGrid(72,72);rect(g,6,6,65,65,1);rect(g,24,24,47,47,1);fs.push({name:'nested',class:'nested loops/holes',grid:g,expectFaces:2,expectStatus:'Current'});}
  {const g=new EvidenceGrid(32,32);rect(g,14,14,16,16,1);fs.push({name:'tiny',class:'tiny regions',grid:g,expectFaces:1,expectStatus:'Current'});}
  {const g=new EvidenceGrid(512,512);rect(g,240,240,270,270,1);fs.push({name:'large-sparse',class:'large sparse canvas',grid:g,expectFaces:1,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,10,10,54,54,1);fs.push({name:'vector-boundary',class:'vector boundaries rasterized as evidence',grid:g,expectFaces:1,expectStatus:'Current'});}
  {const a=new EvidenceGrid(64,64);line(a,12,12,50,12,1);line(a,12,50,50,50,1);const b=new EvidenceGrid(64,64);line(b,12,12,12,50,1);line(b,50,12,50,50,1);a.combine(b);fs.push({name:'multi-reference',class:'multiple reference layers',grid:a,expectFaces:1,expectStatus:'Current'});}
  {fs.push({name:'noisy-background',class:'noisy/background image source',grid:noisyRect(80,77),expectFaces:1,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,12,12,50,50,.35);for(let x=12;x<=50;x++)g.pin(x,12,true);for(let x=12;x<=50;x++)g.pin(x,50,true);for(let y=12;y<=50;y++)g.pin(12,y,true).pin(50,y,true);fs.push({name:'user-pinned',class:'user pinned boundary',grid:g,expectFaces:1,expectStatus:'Current'});}
  {const g=new EvidenceGrid(64,64);rect(g,12,12,50,50,.54);fs.push({name:'weak-boundary',class:'low-confidence boundary',grid:g,expectFaces:1,expectStatus:'Unresolved'});}
  return fs;
}

function baseRect(x0=12,y0=12,x1=52,y1=52,size=72){const g=new EvidenceGrid(size,size);rect(g,x0,y0,x1,y1,1);return g;}

export function regionTransitions(){
  const out=[];
  {const a=baseRect(),b=baseRect(13,12,53,52);out.push({name:'one-to-one-edit',class:'one-to-one edit',oldGrid:a,newGrid:b,check:(oldR,newR,rec)=>newR.faces.length===1&&newR.faces[0].id===oldR.faces[0].id&&rec.decisions.some(d=>d.kind==='retain')});}
  {const a=baseRect(),b=baseRect();line(b,32,12,32,52,1);out.push({name:'split',class:'split',oldGrid:a,newGrid:b,check:(oldR,newR,rec)=>newR.faces.length===2&&newR.faces.every(f=>f.id!==oldR.faces[0].id)&&rec.decisions.filter(d=>d.kind==='split').length>=2});}
  {const a=baseRect();line(a,32,12,32,52,1);const b=baseRect();out.push({name:'merge',class:'merge',oldGrid:a,newGrid:b,check:(oldR,newR,rec)=>newR.faces.length===1&&oldR.faces.length===2&&newR.faces[0].id!==oldR.faces[0].id&&newR.faces[0].id!==oldR.faces[1].id&&rec.decisions.some(d=>d.kind==='merge')});}
  {const a=baseRect(8,12,30,50),b=baseRect(40,12,62,50);out.push({name:'delete-create',class:'delete/create',oldGrid:a,newGrid:b,check:(oldR,newR,rec)=>newR.faces.length===1&&newR.faces[0].id!==oldR.faces[0].id&&rec.decisions.some(d=>d.kind==='create')});}
  {const a=baseRect(12,12,40,40),b=baseRect(24,20,52,48);out.push({name:'affine-transform',class:'affine transform',oldGrid:a,newGrid:b,options:{transformLineage:{kind:'translate',dx:12,dy:8}},check:(oldR,newR,rec)=>newR.faces[0].id===oldR.faces[0].id&&rec.decisions.some(d=>d.kind==='transform-retain')});}
  {const a=baseRect(),b=baseRect();for(let y=24;y<=30;y++)b.set(52,y,0);line(b,53,24,53,30,1);out.push({name:'partial-redraw',class:'partial erase/redraw',oldGrid:a,newGrid:b,check:(oldR,newR,rec)=>newR.faces.length===1&&newR.faces[0].id===oldR.faces[0].id});}
  {const a=new EvidenceGrid(80,64);rect(a,8,12,38,50,1);const b=new EvidenceGrid(80,64);rect(b,20,12,50,50,1);out.push({name:'ambiguous-identity',class:'ambiguous identity',oldGrid:a,newGrid:b,check:(oldR,newR,rec)=>rec.status==='Ambiguous'&&rec.decisions.some(d=>d.kind==='ambiguous')});}
  {const a=baseRect();line(a,32,12,32,52,1);const b=baseRect();const assignments=new Map();out.push({name:'merge-conflicting-assignment',class:'merge conflicting assignments',oldGrid:a,newGrid:b,options:{get assignments(){return assignments;}},check:(oldR,newR,rec)=>{assignments.set(oldR.faces[0].id,'red');assignments.set(oldR.faces[1].id,'blue');const rr=rec;return true;}});}
  return out;
}

export function transitionWithConflictingAssignments(policy,resolveRegion,assignInitialIds,reconcileRegions,resetPrototypeIds){
  resetPrototypeIds();const a=baseRect();line(a,32,12,32,52,1);const b=baseRect();const oldR=assignInitialIds(resolveRegion(a,policy));const newR=resolveRegion(b,policy);const assignments=new Map([[oldR.faces[0].id,'red'],[oldR.faces[1].id,'blue']]);const rec=reconcileRegions(oldR,newR,policy,{assignments});return {oldR,newR,rec};
}

export function incrementalFixture(){
  const oldGrid=new EvidenceGrid(384,384);rect(oldGrid,150,150,230,230,1);rect(oldGrid,20,20,80,80,1);
  const newGrid=oldGrid.clone();line(newGrid,190,150,190,230,1);
  return {oldGrid,newGrid,dirty:{x0:190,y0:151,x1:190,y1:229}};
}
