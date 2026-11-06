import {correctSample,evaluateDab} from './brush-engine.mjs';
export function previewDabs(candidate,budget){
 const {stroke:s,ink}=candidate;
 while(budget.remaining>0&&performance.now()<budget.until){
  if(!candidate.dabs){
   if(candidate.previewIndex>=s.points.length){
    // Formal raster adds a terminal dab. Do likewise after the stroke ends,
    // without emitting a second dab when the sampled spacing already landed there.
    if(!candidate.active&&!candidate.endStamped&&candidate.previewPoint){
     candidate.endStamped=true;
     const end={...candidate.previewPoint},raw=s.points.at(-1);
     end.x=raw.x;end.y=raw.y;
     if(s.guide)end[s.guide.axis]+=(s.guide.coordinate-end[s.guide.axis])*s.guide.strength;
     if(end.distance>0&&Math.abs((candidate.lastDabDistance??-1)-end.distance)>1e-5){
      ink.stamp(evaluateDab(s,end,end.distance,candidate.previewCount++));budget.remaining--;
     }
    }
    return;
   }
   const current=s.points[candidate.previewIndex++];
   const filtered=correctSample(current,candidate.raw,candidate.filtered,s.correction);
   candidate.raw=current;candidate.filtered=filtered;
   const guide=s.guide,point={...filtered};
   if(guide)point[guide.axis]+=(guide.coordinate-point[guide.axis])*guide.strength;
   const from=candidate.previewPoint;
   point.distance=from?from.distance+Math.hypot(point.x-from.x,point.y-from.y):0;
   candidate.previewPoint=point;
   candidate.dabs=(function*(){
    if(!from){
     const dab=evaluateDab(s,point,null,candidate.previewCount++);
     candidate.nextDab=dab.spacing;candidate.lastDabDistance=0;yield dab;return;
    }
    while(candidate.nextDab<=point.distance&&point.distance>from.distance){
     const f=(candidate.nextDab-from.distance)/(point.distance-from.distance);
     const sample={...point,distance:candidate.nextDab,x:from.x+(point.x-from.x)*f,y:from.y+(point.y-from.y)*f,p:from.p+(point.p-from.p)*f};
     const dab=evaluateDab(s,sample,null,candidate.previewCount++);
     // The quarter-diameter shortcut removed most graphite and eraser dabs,
      // visibly changing opacity and edge coverage at handoff.
      const faithful=s.brush.id==='pencil'||s.brush.blend==='erase';
      candidate.nextDab+=faithful?dab.spacing:Math.max(.5,dab.spacing,dab.size*.25);
      candidate.lastDabDistance=sample.distance;yield dab;
    }
   })();
  }
  const next=candidate.dabs.next();
  if(next.done)candidate.dabs=null;
  else{ink.stamp(next.value);budget.remaining--}
 }
}
