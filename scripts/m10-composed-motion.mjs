// Browser-composited pixels, measured after the timed interaction. This is a
// capture-time observation, not physical scanout or event-to-photon latency.
export function inkCentroid(image,box){
 let count=0,xTotal=0,yTotal=0;
 for(let y=Math.max(0,Math.ceil(box.y));y<Math.min(image.height,box.y+box.height);y++)for(let x=Math.max(0,Math.ceil(box.x));x<Math.min(image.width,box.x+box.width);x++){
  const i=(y*image.width+x)*4;if(image.data[i]<90&&image.data[i+1]<90&&image.data[i+2]<105){count++;xTotal+=x;yTotal+=y;}
 }
 return {count,x:count?xTotal/count:null,y:count?yTotal/count:null};
}
export function composedMotion(frames,source,box,timeOrigin,events,decode,initialView,presentations=[]){
 const baseline=inkCentroid(source,box),firstMove=events.find(e=>e.type==='pointermove'),samples=[];
 for(const frame of [...frames].sort((a,b)=>a.at-b.at)){const at=frame.at*1000-timeOrigin;if(!firstMove||at<firstMove.at)continue;
  const image=decode(frame.buffer);if(image.width!==source.width||image.height!==source.height)throw Error('Screencast and reference CSS dimensions differ');
  const ink=inkCentroid(image,box);samples.push({at,...ink,distance:ink.count&&baseline.count?Math.hypot(ink.x-baseline.x,ink.y-baseline.y):null});
 }
 const changed=[];let previous=baseline;
 for(const sample of samples)if(sample.count&&previous.count&&Math.hypot(sample.x-previous.x,sample.y-previous.y)>=.5){changed.push(sample);previous=sample;}
 // A 100-step slow gesture takes longer than a 12-step gesture to travel two
 // pixels. Start the latency clock only once the requested transform itself
 // can move this feature by that amount, retaining the raw first-input value.
 let sufficientMoveAt=firstMove?.at??null;
 if(initialView&&baseline.count){const from=initialView,dx=(baseline.x-box.x-from[2]/2-from[8])/from[6],dy=(baseline.y-box.y-from[3]/2-from[9])/from[6],c=Math.cos(from[7]),s=Math.sin(from[7]),docX=(dx*c+dy*s)*from[10]+from[4]/2,docY=(-dx*s+dy*c)*from[11]+from[5]/2;
  sufficientMoveAt=presentations.filter(p=>p.kind==='view-transform').find(p=>{const v=p.view,x=(docX-v[4]/2)*v[10],y=(docY-v[5]/2)*v[11],cc=Math.cos(v[7]),ss=Math.sin(v[7]);return Math.hypot(v[2]/2+v[8]+v[6]*(x*cc-y*ss)+box.x-baseline.x,v[3]/2+v[9]+v[6]*(x*ss+y*cc)+box.y-baseline.y)>=2;})?.at??null;
 }
 const first=samples.find(s=>s.distance>=2&&sufficientMoveAt!==null&&s.at>=sufficientMoveAt),rawFirst=samples.find(s=>s.distance>=2),intervals=changed.slice(1).map((s,i)=>s.at-changed[i].at);
 return {method:'Capture of ink centroid movement >=2 CSS px after the requested view first moves that feature >=2 CSS px; distinct movement >=0.5 CSS px. Capture timestamps, not scanout.',baseline,firstMoveAt:firstMove?.at??null,sufficientMoveAt,rawFirstInputToMotionMs:rawFirst?rawFirst.at-firstMove.at:null,firstMotionMs:first?first.at-sufficientMoveAt:null,changedFrames:changed.length,intervals,samples};
}
