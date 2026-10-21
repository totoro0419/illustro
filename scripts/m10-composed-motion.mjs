// Browser-composited pixels, measured after the timed interaction. This is a
// capture-time observation, not physical scanout or event-to-photon latency.
export function inkCentroid(image,box){
 let count=0,xTotal=0,yTotal=0;
 for(let y=Math.max(0,Math.ceil(box.y));y<Math.min(image.height,box.y+box.height);y++)for(let x=Math.max(0,Math.ceil(box.x));x<Math.min(image.width,box.x+box.width);x++){
  const i=(y*image.width+x)*4;if(image.data[i]<90&&image.data[i+1]<90&&image.data[i+2]<105){count++;xTotal+=x;yTotal+=y;}
 }
 return {count,x:count?xTotal/count:null,y:count?yTotal/count:null};
}
export function composedMotion(frames,source,box,timeOrigin,events,decode){
 const baseline=inkCentroid(source,box),firstMove=events.find(e=>e.type==='pointermove'),samples=[];
 for(const frame of [...frames].sort((a,b)=>a.at-b.at)){const at=frame.at*1000-timeOrigin;if(!firstMove||at<firstMove.at)continue;
  const image=decode(frame.buffer);if(image.width!==source.width||image.height!==source.height)throw Error('Screencast and reference CSS dimensions differ');
  const ink=inkCentroid(image,box);samples.push({at,...ink,distance:ink.count&&baseline.count?Math.hypot(ink.x-baseline.x,ink.y-baseline.y):null});
 }
 const changed=[];let previous=baseline;
 for(const sample of samples)if(sample.count&&previous.count&&Math.hypot(sample.x-previous.x,sample.y-previous.y)>=.5){changed.push(sample);previous=sample;}
 const first=samples.find(s=>s.distance>=2),intervals=changed.slice(1).map((s,i)=>s.at-changed[i].at);
 return {method:'Observed ink centroid movement >=2 CSS px after first native move receipt; distinct movement >=0.5 CSS px. Capture timestamps, not scanout.',baseline,firstMoveAt:firstMove?.at??null,firstMotionMs:first?first.at-firstMove.at:null,changedFrames:changed.length,intervals,samples};
}
