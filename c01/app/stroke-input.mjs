import {clamp, screenToDoc} from './model.mjs';

const analog=['x','y','p','tiltX','tiltY','azimuth','twist'];
/** Coalesced samples are already ordered by the browser. Equal-time samples
 * replace the previous sample; reversed or invalid events are ignored.
 */
export function admit(points,sample){
 if(!sample||!Number.isFinite(sample.t)||!Number.isFinite(sample.x)||!Number.isFinite(sample.y)) return false;
 const last=points.at(-1);
 if(last && sample.t<last.t)return false;
 if(last && sample.t===last.t){
  if(analog.every(key=>last[key]===sample[key]))return false;
  // Coalesced pen events may share the pointerdown timestamp. Never discard
  // the sole contact anchor just because the following position has equal t.
  if(points.length===1&&(last.x!==sample.x||last.y!==sample.y)){
   points.push(sample);return true;
  }
  points[points.length-1]=sample;return true;
 }
 points.push(sample);
 return true;
}

/** Preserve the last physical release point as a new sample when a batched
 * pointerup shares (or precedes) the previous coalesced timestamp. A preview
 * worker may already have consumed the old last sample by its index. */
export function admitTerminal(points,sample){
 if(!sample)return false;
 const last=points.at(-1);
 if(last&&sample.t<=last.t){
  if(analog.every(key=>last[key]===sample[key]))return false;
  return admit(points,{...sample,t:last.t+.001});
 }
 return admit(points,sample);
}

export class PoseTimeline {
 entries=[];
 record(time,view,rect){
  this.entries.push({time,view:{...view},left:rect.left,top:rect.top});
  const first=this.entries.findIndex(item=>item.time>=time-2000);
  if(first>1)this.entries.splice(0,first-1);
 }
 get(time){
  let lo=0,hi=this.entries.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(this.entries[mid].time<=time)lo=mid+1;else hi=mid}
  return this.entries[lo-1];
 }
 sample(event,sensors,finalPressure){
  const pose=this.get(event.timeStamp);
  if(!pose)return null;
  const {x,y}=screenToDoc({x:event.clientX-pose.left,y:event.clientY-pose.top},pose.view);
  const pen=event.pointerType==='pen';
  if(pen){
   if(event.tiltX||event.tiltY)sensors.tilt=true;
   if(event.twist)sensors.barrel=true;
  }
  return {x,y,t:event.timeStamp,p:pen?clamp(finalPressure??event.pressure,0,1):1,
   tiltX:pen&&sensors.tilt?event.tiltX:null,tiltY:pen&&sensors.tilt?event.tiltY:null,
   azimuth:pen&&sensors.tilt&&Number.isFinite(event.azimuthAngle)?event.azimuthAngle*180/Math.PI:null,
   twist:pen&&sensors.barrel?event.twist:null};
 }
}

export const defaultInput={
 touch:'pan',mouse:'draw',pen:'draw',palm:true,side:'erase',sideMode:'hold',
 eraser:'hardEraser',independent:false,eraserSize:36
};
