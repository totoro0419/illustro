import {performance} from 'node:perf_hooks';
import {resolveStrokeConnectivity,CONNECTIVITY_ALGORITHM_VERSION,connectionSet} from './endpoint-connectivity.js';
const results=[];
for(const layout of ['spaced','dense'])for(const n of [20,100,300]){
 const strokes=Array.from({length:n},(_,i)=>({strokeId:`s${i}`,width:2,points:Array.from({length:80},(_,j)=>({x:j*2,y:i*(layout==='dense'?.6:20)+Math.sin(j/10),width:2}))}));
 const row={layout,strokes:n,pointsPerStroke:80};
 for(const spatialFilter of [false,true]){
  const times=[];let graph;
  for(let repeat=0;repeat<4;repeat++){const start=performance.now();graph=resolveStrokeConnectivity(strokes,{disableSpatialFilter:!spatialFilter});const elapsed=performance.now()-start;if(repeat)times.push(elapsed);}
  const key=spatialFilter?'filtered':'unfiltered';row[key]={medianMs:[...times].sort((a,b)=>a-b)[1],samplesMs:times,candidates:graph.candidates.length,edges:graph.edges.length};row[`${key}Keys`]=[...connectionSet(graph)].sort();
 }
 row.sameGraph=JSON.stringify(row.filteredKeys)===JSON.stringify(row.unfilteredKeys);delete row.filteredKeys;delete row.unfilteredKeys;results.push(row);
}
console.log(JSON.stringify({schema:'illustro.stroke-connectivity-performance.v1',algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,environment:{node:process.version,platform:process.platform,arch:process.arch},note:'CPU wall time in this execution environment, not an Android device or frame-time claim. Three warm samples per layout; dense worst-case remains important.',results},null,2));
