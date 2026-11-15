import type {Sample} from '@illustro/brush-rt';
import type {Point} from './canvasView';

export type SymmetrySettings=Readonly<{mode:'off'|'mirror'|'radial'|'kaleidoscope';x:number;y:number;angle:number;count:number;erase:boolean}>;
export const DEFAULT_SYMMETRY:SymmetrySettings={mode:'off',x:0,y:0,angle:0,count:4,erase:false};
export const SYMMETRY_SECTION='c09.guide.symmetry';
export const SYMMETRY_TYPE='guide.symmetry.v1';

export function normalizeSymmetry(value:Partial<SymmetrySettings>):SymmetrySettings{
  const number=(value:number|undefined,fallback:number,min:number,max:number)=>
    typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
  const mode=value.mode==='mirror'||value.mode==='radial'||value.mode==='kaleidoscope'?value.mode:'off';
  return {mode,x:number(value.x,0,-16384,16384),y:number(value.y,0,-16384,16384),
    angle:number(value.angle,0,-360,360),count:Math.round(number(value.count,4,2,12)),erase:value.erase===true};
}

type Transform=Readonly<{angle:number;mirror:boolean}>;
export function symmetryCopies(settings:SymmetrySettings):readonly Transform[]{
  if(settings.mode==='off')return [];
  const axis=settings.angle*Math.PI/180;
  if(settings.mode==='mirror')return [{angle:2*axis,mirror:true}];
  const copies:Transform[]=[];
  for(let i=0;i<settings.count;i++){
    const angle=i*2*Math.PI/settings.count;
    if(i)copies.push({angle,mirror:false});
    if(settings.mode==='kaleidoscope')copies.push({angle:angle+2*axis,mirror:true});
  }
  return copies;
}
export function symmetryPoint(point:Point,settings:SymmetrySettings,transform:Transform):Point{
  const dx=point.x-settings.x,dy=(point.y-settings.y)*(transform.mirror?-1:1);
  const c=Math.cos(transform.angle),s=Math.sin(transform.angle);
  return {x:settings.x+c*dx-s*dy,y:settings.y+s*dx+c*dy};
}
export function symmetrySample(sample:Sample,settings:SymmetrySettings,transform:Transform):Sample{
  const flip=transform.mirror?-1:1;
  return {...sample,...symmetryPoint(sample,settings,transform),
    ...(sample.azimuth!==undefined?{azimuth:sample.azimuth*flip+transform.angle}:{}),
    ...(sample.twist!==undefined?{twist:sample.twist*flip}:{}),
  };
}
