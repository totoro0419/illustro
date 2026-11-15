import type {Point} from './canvasView';

/** BRU-010: guide locking is captured at pen-down, never changed mid-stroke. */
export type RulerKind='straight'|'parallel'|'circle'|'ellipse'|'grid'|'isometric'|'perspective';
export type GuideSettings=Readonly<{enabled:boolean;angle:number;strength:number;applyEraser:boolean;
 kind?:RulerKind;x?:number;y?:number;rx?:number;ry?:number;step?:number;
}>;
export type LockedGuide=Readonly<{origin:Point;angle:number;strength:number;ellipse?:Readonly<{rx:number;ry:number}>}>;
export const DEFAULT_GUIDE_SETTINGS:GuideSettings={enabled:false,angle:0,strength:1,applyEraser:false};

export function normalizeGuideSettings(value:Partial<GuideSettings>):GuideSettings{
 const angle=typeof value.angle==='number'&&Number.isFinite(value.angle)?((value.angle%360)+360)%360:0;
 const strength=typeof value.strength==='number'&&Number.isFinite(value.strength)?Math.max(0,Math.min(1,value.strength)):1;
 const basic={enabled:value.enabled===true,angle,strength,applyEraser:value.applyEraser===true};
 const kind=value.kind;
 if(!kind||!['straight','parallel','circle','ellipse','grid','isometric','perspective'].includes(kind))return basic;
 const finite=(n:number|undefined,fallback:number,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)
   ?Math.max(min,Math.min(max,n)):fallback;
 return {...basic,kind,x:finite(value.x,0,-16384,16384),y:finite(value.y,0,-16384,16384),
   rx:finite(value.rx,120,1,8192),ry:finite(value.ry,72,1,8192),step:finite(value.step,32,1,4096)};
}

/** Anchor to each stroke's first document point, regardless of zoom or rotation. */
export function lockStraightGuide(origin:Point,settings:GuideSettings,erasing:boolean,bypass=false):LockedGuide|null{
 if(!settings.enabled||settings.strength===0||(erasing&&!settings.applyEraser)||bypass)return null;
 const center={x:settings.x??0,y:settings.y??0},angle=settings.angle*Math.PI/180,strength=settings.strength;
 const x=origin.x-center.x,y=origin.y-center.y;
 if(settings.kind==='circle'||settings.kind==='ellipse'){
   const rx=settings.rx??120,ry=settings.kind==='circle'?rx:settings.ry??72;
   return {origin:center,angle,strength,ellipse:{rx,ry}};
 }
 if(settings.kind==='perspective')return {origin:center,angle:Math.atan2(y,x),strength};
 const possible=settings.kind==='grid'?[angle,angle+Math.PI/2]:
   settings.kind==='isometric'?[angle,angle+Math.PI/3,angle-Math.PI/3]:[angle];
 if(settings.kind==='parallel'||settings.kind==='grid'||settings.kind==='isometric'){
   const step=settings.step??32;
   const candidates=possible.map(a=>{
     const nx=-Math.sin(a),ny=Math.cos(a),distance=x*nx+y*ny,offset=Math.round(distance/step)*step;
     return {origin:{x:center.x+nx*offset,y:center.y+ny*offset},angle:a,strength,error:Math.abs(distance-offset)};
   });
   candidates.sort((a,b)=>a.error-b.error);
   return candidates[0]!;
 }
 return {origin:settings.kind==='straight'?center:{x:origin.x,y:origin.y},angle,strength};
}
export function snapToStraightGuide(point:Point,guide:LockedGuide|null):Point{
 if(!guide)return point;
 const c=Math.cos(guide.angle),s=Math.sin(guide.angle);
 const x=point.x-guide.origin.x,y=point.y-guide.origin.y;
 const dot=x*c+y*s,lateral=-x*s+y*c;
 let snappedX=guide.origin.x+dot*c,snappedY=guide.origin.y+dot*s;
 if(guide.ellipse){
   const {rx,ry}=guide.ellipse,t=Math.atan2(lateral/ry,dot/rx),ex=Math.cos(t)*rx,ey=Math.sin(t)*ry;
   snappedX=guide.origin.x+ex*c-ey*s;snappedY=guide.origin.y+ex*s+ey*c;
 }
 return {x:point.x+(snappedX-point.x)*guide.strength,y:point.y+(snappedY-point.y)*guide.strength};
}
