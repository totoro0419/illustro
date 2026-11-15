import type {Point} from './canvasView';

/** BRU-010: guide locking is captured at pen-down, never changed mid-stroke. */
export type GuideSettings=Readonly<{enabled:boolean;angle:number;strength:number;applyEraser:boolean}>;
export type LockedGuide=Readonly<{origin:Point;angle:number;strength:number}>;
export const DEFAULT_GUIDE_SETTINGS:GuideSettings={enabled:false,angle:0,strength:1,applyEraser:false};

export function normalizeGuideSettings(value:Partial<GuideSettings>):GuideSettings{
 const angle=typeof value.angle==='number'&&Number.isFinite(value.angle)?((value.angle%360)+360)%360:0;
 const strength=typeof value.strength==='number'&&Number.isFinite(value.strength)?Math.max(0,Math.min(1,value.strength)):1;
 return {enabled:value.enabled===true,angle,strength,applyEraser:value.applyEraser===true};
}

/** Anchor to each stroke's first document point, regardless of zoom or rotation. */
export function lockStraightGuide(origin:Point,settings:GuideSettings,erasing:boolean,bypass=false):LockedGuide|null{
 if(!settings.enabled||settings.strength===0||(erasing&&!settings.applyEraser)||bypass)return null;
 return {origin:{x:origin.x,y:origin.y},angle:settings.angle*Math.PI/180,strength:settings.strength};
}
export function snapToStraightGuide(point:Point,guide:LockedGuide|null):Point{
 if(!guide)return point;
 const c=Math.cos(guide.angle),s=Math.sin(guide.angle);
 const dot=(point.x-guide.origin.x)*c+(point.y-guide.origin.y)*s;
 const snappedX=guide.origin.x+dot*c,snappedY=guide.origin.y+dot*s;
 return {x:point.x+(snappedX-point.x)*guide.strength,y:point.y+(snappedY-point.y)*guide.strength};
}
