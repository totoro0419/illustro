import {compilePreset,validateFoundation,type FoundationPreset,type Mapping, type Source, type Target} from '@illustro/brush-rt';

export const simpleSources=['pressure','velocity','tilt'] as const satisfies readonly Source[];
export const simpleTargets=['size','opacity','flow'] as const satisfies readonly Target[];
export type SimpleSource=typeof simpleSources[number];
export type SimpleTarget=typeof simpleTargets[number];
const contains=<T extends string>(values:readonly T[],value:string):value is T=>values.includes(value as T);
export const isSimpleMapping=(m:Mapping)=>m.mode==='multiply'&&contains(simpleSources,m.source)
 &&contains(simpleTargets,m.target)&&m.min>=0&&m.max<=1&&!m.repeat
 &&m.input===undefined;
function guard(p:FoundationPreset){
 validateFoundation(p);compilePreset(p,{forceFadeGeometry:'adaptive-v1'});return p;
}
export function addSimpleMapping(original:FoundationPreset,source:SimpleSource,target:SimpleTarget):FoundationPreset{
 if(!contains(simpleSources,source)||!contains(simpleTargets,target))throw Error('未対応の設定です');
 if(original.dynamics.length>=16)throw Error('設定の数が多すぎます');
 const p=structuredClone(original);
 p.dynamics.push({source,target,min:.35,max:1,mode:'multiply',curve:[[0,0],[1,1]]});
 return guard(p);
}
export function changeSimpleMapping(original:FoundationPreset,index:number,patch:Partial<Pick<Mapping,'source'|'target'|'min'|'max'>>):FoundationPreset{
 const before=original.dynamics[index];
 if(!before||!isSimpleMapping(before))throw Error('この設定は詳細編集に対応していません');
 const p=structuredClone(original),m=p.dynamics[index]!;
 const source=patch.source??m.source,target=patch.target??m.target;
 if(!contains(simpleSources,source)||!contains(simpleTargets,target))throw Error('未対応の設定です');
 Object.assign(m,patch);
 if(m.min<0||m.max>1||m.min>m.max)throw Error('範囲は0〜100%で、最小は最大以下にしてください');
 return guard(p);
}
export function removeSimpleMapping(original:FoundationPreset,index:number):FoundationPreset{
 const m=original.dynamics[index];
 if(!m||!isSimpleMapping(m))throw Error('この設定は削除できません');
 const p=structuredClone(original);p.dynamics.splice(index,1);return guard(p);
}
