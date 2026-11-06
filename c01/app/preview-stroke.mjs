import {correctSample,evaluateDab} from './brush-engine.mjs';
export function previewDabs(candidate,budget){
 const {stroke:s,ink}=candidate;
 while(budget.remaining>0&&performance.now()<budget.until){
  if(!candidate.dabs){
   if(candidate.previewIndex>=s.points.length)return;
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
     candidate.nextDab=dab.spacing;yield dab;return;
    }
    while(candidate.nextDab<=point.distance&&point.distance>from.distance){
     const f=(candidate.nextDab-from.distance)/(point.distance-from.distance);
     const sample={...point,distance:candidate.nextDab,x:from.x+(point.x-from.x)*f,y:from.y+(point.y-from.y)*f,p:from.p+(point.p-from.p)*f};
     const dab=evaluateDab(s,sample,null,candidate.previewCount++);
     candidate.nextDab+=Math.max(.5,dab.spacing,dab.size*.25);yield dab;
    }
   })();
  }
  const next=candidate.dabs.next();
  if(next.done)candidate.dabs=null;
  else{ink.stamp(next.value);budget.remaining--}
 }
}
