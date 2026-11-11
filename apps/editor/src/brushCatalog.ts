import type {FoundationPreset} from '@illustro/brush-rt';

/** Display-only grouping: does not alter saved brush presets or stroke records. */
export type BrushCatalogGroup='all'|'ink'|'sketch'|'paint'|'eraser'|'user'|'other';
const foundationGroups:Readonly<Record<string,BrushCatalogGroup>>={
 'foundation-g-pen':'ink',
 'foundation-round-pen':'ink',
 'foundation-technical':'ink',
 'foundation-pencil':'sketch',
 'foundation-marker':'paint',
 'foundation-hard-eraser':'eraser',
 'foundation-soft-eraser':'eraser',
 'illustro-fine-liner-v1':'ink',
 'illustro-soft-pencil-v1':'sketch',
 'illustro-opaque-marker-v1':'paint'
};
export function brushCatalogGroup(preset:FoundationPreset,isUser:(id:string)=>boolean):BrushCatalogGroup{
 if(isUser(preset.id))return 'user';
 return foundationGroups[preset.id]??'other';
}
export function filterBrushCatalog(
 presets:readonly FoundationPreset[],
 {query='',group='all',isUser}:{query?:string;group?:BrushCatalogGroup;isUser:(id:string)=>boolean}
):FoundationPreset[]{
 const term=query.trim().normalize('NFKC').toLocaleLowerCase('ja');
 return presets.filter(p=>{
  if(group!=='all'&&brushCatalogGroup(p,isUser)!==group)return false;
  if(!term)return true;
  return [p.name,p.category,p.purpose,p.id]
    .some(value=>value.normalize('NFKC').toLocaleLowerCase('ja').includes(term));
 });
}
