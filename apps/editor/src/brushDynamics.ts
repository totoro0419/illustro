import {compilePreset,validateFoundation,type FoundationPreset,type Mapping, type Source, type Target} from '@illustro/brush-rt';

export const simpleSources=['pressure','velocity','tilt','azimuth','twist','direction','distance','time','random'] as const satisfies readonly Source[];
export const simpleTargets=['size','opacity','flow','spacing','rotation','aspect','scatter','density','grain','hue','saturation','value'] as const satisfies readonly Target[];
export type SimpleSource=typeof simpleSources[number];
export type SimpleTarget=typeof simpleTargets[number];
const contains=<T extends string>(values:readonly T[],value:string):value is T=>values.includes(value as T);
export function isAngularTarget(target:Target){return target==='hue'||target==='rotation';}
export function mappingOutputLimit(target:Target){return target==='rotation'?Math.PI*2:1;}
export const isSimpleMapping=(m:Mapping)=>(m.mode===(isAngularTarget(m.target)?'add':'multiply'))&&contains(simpleSources,m.source)
 &&contains(simpleTargets,m.target)&&m.min>=0&&m.max<=mappingOutputLimit(m.target)&&!m.repeat
 &&m.input===undefined;
function guard(p:FoundationPreset){
 validateFoundation(p);compilePreset(p,{forceFadeGeometry:'adaptive-v1'});return p;
}
export function addSimpleMapping(original:FoundationPreset,source:SimpleSource,target:SimpleTarget):FoundationPreset{
 if(!contains(simpleSources,source)||!contains(simpleTargets,target))throw Error('未対応の設定です');
 if(original.dynamics.length>=16)throw Error('設定の数が多すぎます');
 const p=structuredClone(original);
 const additive=isAngularTarget(target);
 p.dynamics.push({source,target,min:additive?0:.35,max:target==='rotation'?Math.PI/4:target==='hue'?1/6:1,mode:additive?'add':'multiply',curve:[[0,0],[1,1]]});
 return guard(p);
}
export function changeSimpleMapping(original:FoundationPreset,index:number,patch:Partial<Pick<Mapping,'source'|'target'|'min'|'max'|'curve'>>):FoundationPreset{
 const before=original.dynamics[index];
 if(!before||!isSimpleMapping(before))throw Error('この設定は詳細編集に対応していません');
 const p=structuredClone(original),m=p.dynamics[index]!;
 const source=patch.source??m.source,target=patch.target??m.target;
 if(!contains(simpleSources,source)||!contains(simpleTargets,target))throw Error('未対応の設定です');
 Object.assign(m,patch);
 if(patch.target&&patch.target!==before.target){
  m.mode=isAngularTarget(target)?'add':'multiply';
  if(patch.min===undefined)m.min=Math.min(m.min,mappingOutputLimit(target));
  if(patch.max===undefined)m.max=Math.min(m.max,mappingOutputLimit(target));
 }
 if(m.min<0||m.max>mappingOutputLimit(target)||m.min>m.max)throw Error('範囲は0〜100%で、最小は最大以下にしてください');
 return guard(p);
}
export function removeSimpleMapping(original:FoundationPreset,index:number):FoundationPreset{
 const m=original.dynamics[index];
 if(!m||!isSimpleMapping(m))throw Error('この設定は削除できません');
 const p=structuredClone(original);p.dynamics.splice(index,1);return guard(p);
}
