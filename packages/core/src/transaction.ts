import {validateVectorLayerMask,type VectorLayerMask} from './layerMask';
import type {LayerComp} from './layerComps';
import {validateLayerGroups,type LayerGroup} from './layerGroups';
import {operationKey,type LayerId,type OperationKey,type RasterSurfaceId,type TransactionId,type RevisionId} from './ids';
import {rasterLayer,parseLayerColorTag,validateDocumentInfo,type DocumentInfo,type LayerNode} from './model';
import {RasterWorkingSet} from './raster/working';
import type {CoreDocument} from './coreDocument';
import {commitTransaction,type CommitReceipt} from './commit';
import {CORE_INTERNAL,type CoreInternalToken} from './internal';
import type {SemanticOperationDraft} from './history';
import {CANONICAL_TILE_SIZE,pixelToTile,tileKey,RasterSurfaceManifest,type DirtyTileHint} from './raster/surface';

export type DocumentGeometryKind='document.crop'|'document.canvas-resize'|'document.image-resize';
type OperationSlot=Readonly<{type:'document-info';info:DocumentInfo}>|Readonly<{type:'dimensions';kind:DocumentGeometryKind;width:number;height:number;parameters:Readonly<Record<string,unknown>>}>|Readonly<{type:'working';layerId:LayerId;initial?:true}>|Readonly<{type:'metadata';layerId:LayerId}>|Readonly<{type:'structure';layerId:LayerId;surfaceId:RasterSurfaceId;insertIndex:number;name:string}>|Readonly<{type:'reorder';layerId:LayerId;fromIndex:number;toIndex:number}>|Readonly<{type:'groups';action:string;id:LayerId}>|Readonly<{type:'delete';ids:readonly LayerId[]}>|Readonly<{type:'comps';id:LayerId;action:string}>|Readonly<{type:'restore-revision';revisionId:RevisionId}>|Readonly<{type:'pin-revision';name:string;note:string}>|Readonly<{type:'semantic';draft:SemanticOperationDraft;layerId:LayerId;key:OperationKey;dirtyTiles:readonly DirtyTileHint[]}>;
export type RasterSemanticMutation=Readonly<{kind:string;schemaVersion:number;parameters:Readonly<Record<string,unknown>>;algorithmVersionRefs?:readonly string[];resourceRefs?:SemanticOperationDraft['resourceRefs'];sourceRevisionIds?:readonly RevisionId[];selectionSnapshotRefs?:readonly string[];resultValueRefs?:readonly string[]}>;

export class DocumentTransaction{
  private readonly baseValue:RevisionId;private readonly rootValue;private readonly idValue:TransactionId;private readonly workingValue=new Map<LayerId,RasterWorkingSet>();
  private readonly updatesValue=new Map<LayerId,LayerNode>();private readonly slotsValue:OperationSlot[]=[];private rootOrderValue:LayerId[]|null=null;private groupsValue:readonly LayerGroup[]|null=null;private compsValue:readonly LayerComp[]|null=null;private deletedValue=new Set<LayerId>();private closed=false;private failed=false;private dimensionUpdate:{width:number;height:number}|null=null;
  constructor(private readonly doc:CoreDocument,readonly label:string){if(!label.trim())throw new Error('empty transaction label');this.baseValue=doc.head;this.rootValue=doc.root;this.idValue=doc._internal(CORE_INTERNAL).ids.transaction();}
  get transactionId(){return this.idValue;}get baseRevision(){return this.baseValue;}
  addRasterLayerAbove(referenceId:LayerId,inheritGroup=true):LayerId{
    this.open();const reference=this.updatesValue.get(referenceId)??this.rootValue.layers.get(referenceId);if(!reference)throw new Error('missing reference layer');if(reference.kind!=='raster')throw new Error('reference layer is not raster');
    const order=this.rootOrderValue??[...this.rootValue.rootLayerIds],index=order.indexOf(referenceId);if(index<0)throw new Error('reference layer is not in root order');
    const ids=this.doc._internal(CORE_INTERNAL).ids,layerId=ids.layer(),surfaceId=ids.surface();
    if(this.rootValue.layers.get(layerId)||this.updatesValue.has(layerId))throw new Error('duplicate layer id');
    for(const id of order){const layer=this.updatesValue.get(id)??this.rootValue.getLayer(id);if(layer.surface.descriptor.surfaceId===surfaceId)throw new Error('duplicate raster surface id');}
    const name=`Layer ${order.length+1}`,layer=rasterLayer(layerId,surfaceId,reference.surface.descriptor.workingColorSpaceRef,reference.surface.descriptor.sampleEncoding,name),insertIndex=index+1;
    const next=[...order];next.splice(insertIndex,0,layerId);this.rootOrderValue=next;
    const groups=this.groupsValue??this.rootValue.layerGroups;
    if(inheritGroup&&groups.some(group=>group.members.includes(referenceId))){
      this.editGroups('insert',layerId,groups.map(group=>group.members.includes(referenceId)?{...group,members:[...group.members,layerId]}:group));
    }
    this.updatesValue.set(layerId,layer);this.slotsValue.push(Object.freeze({type:'structure' as const,layerId,surfaceId,insertIndex,name}));return layerId;
  }
  addRasterSnapshotAbove(referenceId:LayerId,pixels:Uint8Array|Uint8ClampedArray,name:string,copyStyle=false,inheritGroup=true){
    const root=this.rootValue;
    if(pixels.length!==root.width*root.height*4)throw new Error('画像の大きさが作品と一致しません。');
    const source=root.getLayer(referenceId),id=this.addRasterLayerAbove(referenceId,inheritGroup);
    this.renameLayer(id,name);
    if(copyStyle){
      this.setLayerOpacity(id,source.opacity);
      this.setLayerVisibility(id,source.visible);
      if(source.colorTag)this.setLayerColorTag(id,source.colorTag);
      if(source.clipSourceId)this.meta(id,{clipSourceId:source.clipSourceId});
      if(source.vectorMask)this.meta(id,{vectorMask:source.vectorMask});
    }
    const layer=this.updatesValue.get(id)!;
    if(layer.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1')throw new Error('対応していない画素形式です。');
    const working=new RasterWorkingSet(layer.surface,this.doc._internal(CORE_INTERNAL).store);
    const size=CANONICAL_TILE_SIZE;
    for(let tileY=0;tileY*size<root.height;tileY++){
      for(let tileX=0;tileX*size<root.width;tileX++){
        const width=Math.min(size,root.width-tileX*size),height=Math.min(size,root.height-tileY*size);
        const tile=new Uint8Array(size*size*4);
        for(let row=0;row<height;row++){
          const offset=((tileY*size+row)*root.width+tileX*size)*4;
          tile.set(pixels.subarray(offset,offset+width*4),row*size*4);
        }
        if(tile.some(value=>value!==0))working.editTile(tileX,tileY,bytes=>bytes.set(tile));
      }
    }
    if(working.changedTileCount){
      this.workingValue.set(id,working);
      this.slotsValue.push(Object.freeze({type:'working',layerId:id,initial:true}));
    }
    return id;
  }
  deleteRasterLayers(ids:ReadonlySet<LayerId>){
    this.open();
    if(this.slotsValue.length)throw new Error('Layer deletion must start its own transaction');
    return this.removeRasterLayers(ids);
  }
  bakeVectorLayerMask(id:LayerId,pixels:Uint8Array){
    this.open();
    if(this.slotsValue.length)throw new Error('Apply the mask as its own transaction');
    const layer=this.rootValue.getLayer(id);
    if(!layer.vectorMask?.enabled||this.rootValue.isLayerLocked(id))throw new Error('有効なマスクが付いた、ロックされていないレイヤーを選んでください。');
    const replacement=this.addRasterSnapshotAbove(id,pixels,layer.name,true);
    this.meta(replacement,{vectorMask:null,...(layer.positionLocked?{positionLocked:true}:{}),...(layer.alphaLocked?{alphaLocked:true}:{})});
    for(const otherId of this.rootValue.rootLayerIds){
      if(this.rootValue.getLayer(otherId).clipSourceId===id)this.meta(otherId,{clipSourceId:replacement});
    }
    this.removeRasterLayers(new Set([id]));
    return replacement;
  }
  replaceRasterLayers(ids:ReadonlySet<LayerId>,referenceId:LayerId,pixels:Uint8ClampedArray,name:string){
    if(!ids.size||!ids.has(referenceId)||this.slotsValue.length)throw new Error('結合するレイヤーを選んでください。');
    const id=this.addRasterSnapshotAbove(referenceId,pixels,name);
    this.removeRasterLayers(ids);
    return id;
  }
  private removeRasterLayers(ids:ReadonlySet<LayerId>){
    if(!ids.size)return false;
    const root=this.rootValue;
    for(const id of ids){
      if(root.isLayerLocked(id))throw new Error('ロックを解除してから削除してください。');
    }
    const order=(this.rootOrderValue??root.rootLayerIds).filter(id=>!ids.has(id));
    if(!order.some(id=>(this.updatesValue.get(id)??root.getLayer(id)).baseColor!=='white'))throw new Error('描画用レイヤーは一枚以上残してください。');
    const originalGroups=this.groupsValue??root.layerGroups;
    const groups=originalGroups.map(group=>({...group,members:group.members.filter(id=>!ids.has(id))})).filter(group=>group.members.length);
    this.rootOrderValue=order;
    this.deletedValue=new Set(ids);
    if(originalGroups.length)this.groupsValue=validateLayerGroups(groups,order);
    this.slotsValue.push(Object.freeze({type:'delete',ids:Object.freeze([...ids])}));
    return true;
  }
  pinRevision(name:string,note:string){
    this.open();
    if(this.slotsValue.length)throw new Error('Save snapshot as a standalone operation');
    name=name.trim();
    note=note.trim();
    if(!name||name.length>160||note.length>2000)throw new Error('名前は160文字以内、メモは2000文字以内で入力してください。');
    this.slotsValue.push(Object.freeze({type:'pin-revision',name,note}));
    return true;
  }
  restoreRevision(revisionId:RevisionId){
    this.open();
    if(this.slotsValue.length)throw new Error('History restore must be its own transaction');
    if(revisionId===this.baseValue)return false;
    this.doc.revision(revisionId);
    this.slotsValue.push(Object.freeze({type:'restore-revision',revisionId}));
    return true;
  }
  saveLayerComp(name:string,saveVisibility:boolean,saveOpacity:boolean,existingId?:LayerId){
    this.open();
    const title=name.trim(),root=this.rootValue,existing=root.layerComps;
    if(!title||title.length>4096||(!saveVisibility&&!saveOpacity))throw new Error('名前と保存する項目を指定してください。');
    if(existingId&&!existing.some(comp=>comp.id===existingId))throw new Error('表示案が見つかりません。');
    const id=existingId??this.doc._internal(CORE_INTERNAL).ids.layer();
    const layers=root.rootLayerIds.map(layerId=>{
      const layer=root.getLayer(layerId);
      return Object.freeze({id:layerId,...(saveVisibility?{visible:layer.visible}:{}),...(saveOpacity?{opacity:layer.opacity}:{})});
    });
    const groups=saveVisibility?root.layerGroups.map(group=>Object.freeze({id:group.id,visible:group.visible})):[];
    const comp=Object.freeze({id,name:title,saveVisibility,saveOpacity,layers:Object.freeze(layers),groups:Object.freeze(groups)});
    return this.editComps(id,existingId?'update':'create',existingId?existing.map(old=>old.id===id?comp:old):[...existing,comp]);
  }
  deleteLayerComp(id:LayerId){
    this.open();
    const comps=this.rootValue.layerComps;
    if(!comps.some(comp=>comp.id===id))return false;
    return this.editComps(id,'delete',comps.filter(comp=>comp.id!==id));
  }
  applyLayerComp(id:LayerId){
    this.open();
    const root=this.rootValue,comp=root.layerComps.find(item=>item.id===id);
    if(!comp)throw new Error('表示案が見つかりません。');
    let changed=false;
    for(const state of comp.layers){
      if(!root.hasLayer(state.id))continue;
      if(state.visible!==undefined)changed=this.setLayerVisibility(state.id,state.visible)||changed;
      if(state.opacity!==undefined)changed=this.setLayerOpacity(state.id,state.opacity)||changed;
    }
    const groupStates=new Map(comp.groups.map(group=>[group.id,group.visible]));
    const groups=root.layerGroups.map(group=>{
      const visible=groupStates.get(group.id);
      return visible===undefined||visible===group.visible?group:{...group,visible};
    });
    if(groups.some((group,index)=>group!==root.layerGroups[index]))return this.editGroups('apply-comp',id,groups);
    return changed;
  }
  private editComps(id:LayerId,action:string,comps:readonly LayerComp[]){
    this.compsValue=Object.freeze(comps);
    this.slotsValue.push(Object.freeze({type:'comps',id,action}));
    return true;
  }
  createLayerGroup(ids:ReadonlySet<LayerId>,name:string){
    this.open();
    const members=this.rootValue.rootLayerIds.filter(id=>ids.has(id));
    if(members.length!==ids.size||!members.length)throw new Error('まとめるレイヤーを選んでください。');
    if(members.some(id=>this.rootValue.getLayer(id).baseColor==='white'||this.rootValue.isLayerLocked(id)))throw new Error('白背景やロック中のレイヤーはグループ化できません。');
    const id=this.doc._internal(CORE_INTERNAL).ids.layer();
    try{
      return this.editGroups('create',id,[...this.rootValue.layerGroups,{id,name:name.trim(),members,visible:true,locked:false}]);
    }catch(error){
      if(error instanceof Error&&(error.message.includes('stay together')||error.message.includes('overlapping')))throw new Error('隣り合うレイヤーを、既存のグループを途中で分けないように選んでください。');
      throw error;
    }
  }
  updateLayerGroup(id:LayerId,patch:Partial<Pick<LayerGroup,'name'|'visible'|'locked'>>){
    const groups=this.rootValue.layerGroups;
    if(!groups.some(group=>group.id===id))throw new Error('グループが見つかりません。');
    return this.editGroups('update',id,groups.map(group=>group.id===id?{...group,...patch}:group));
  }
  dissolveLayerGroup(id:LayerId){
    const groups=this.rootValue.layerGroups;
    if(!groups.some(group=>group.id===id))return false;
    return this.editGroups('dissolve',id,groups.filter(group=>group.id!==id));
  }
  moveLayersIntoGroup(ids:ReadonlySet<LayerId>,destination:LayerId|null){
    return this.moveGroupMembers(ids,destination,null);
  }
  moveGroupIntoGroup(id:LayerId,destination:LayerId|null){
    const group=this.rootValue.layerGroups.find(candidate=>candidate.id===id);
    if(!group)throw new Error('グループが見つかりません。');
    return this.moveGroupMembers(new Set(group.members),destination,group);
  }
  private moveGroupMembers(ids:ReadonlySet<LayerId>,destination:LayerId|null,sourceGroup:LayerGroup|null){
    this.open();
    if(this.slotsValue.length)throw new Error('Layer move must start its own transaction');
    const root=this.rootValue;
    const members=root.rootLayerIds.filter(id=>ids.has(id));
    if(!members.length||members.length!==ids.size)return false;
    const groups=root.layerGroups;
    const target=destination===null?null:groups.find(group=>group.id===destination);
    if(destination!==null&&!target)throw new Error('移動先のグループが見つかりません。');
    if(members.some(id=>root.getLayer(id).baseColor==='white'||root.isLayerPositionLocked(id)))throw new Error('白背景や位置をロックしたレイヤーは移動できません。');
    const targetRemaining=target?.members.filter(id=>!ids.has(id));
    if(target&&(!targetRemaining?.length||(sourceGroup&&target.members.every(id=>ids.has(id)))))throw new Error('移動するグループの内部は移動先にできません。');
    const targetPath=target?root.groupsForLayer(target.members[0]!):[];
    const targetAncestors=new Set(targetPath.slice(0,targetPath.findIndex(group=>group.id===target?.id)+1).map(group=>group.id));
    if(groups.some(group=>targetAncestors.has(group.id)&&group.locked))throw new Error('ロック中のグループには移動できません。');
    if(members.every(id=>root.groupsForLayer(id).at(-1)?.id===(target?.id))&&!sourceGroup)return false;
    const remaining=root.rootLayerIds.filter(id=>!ids.has(id));
    const insertion=targetRemaining?.length?remaining.indexOf(targetRemaining.reduce((top,id)=>remaining.indexOf(id)>remaining.indexOf(top)?id:top))+1:remaining.length;
    const order=[...remaining.slice(0,insertion),...members,...remaining.slice(insertion)];
    const updated:LayerGroup[]=[];
    const sourceIndex=sourceGroup?groups.indexOf(sourceGroup):-1;
    for(const [index,group] of groups.entries()){
      if(sourceIndex>=0&&index>=sourceIndex&&group.members.every(id=>ids.has(id))){
        updated.push(group);
        continue;
      }
      const retained=group.members.filter(id=>!ids.has(id));
      if(targetAncestors.has(group.id))retained.push(...members);
      if(retained.length)updated.push({...group,members:retained});
    }
    this.rootOrderValue=order;
    return this.editGroups('move',sourceGroup?.id??members[0]!,updated);
  }
  moveLayerGroup(id:LayerId,direction:-1|1){
    this.open();
    if(this.slotsValue.length)throw new Error('Layer move must start its own transaction');
    if(direction!==1&&direction!==-1)throw new Error('invalid layer move direction');
    const root=this.rootValue,group=root.layerGroups.find(candidate=>candidate.id===id);
    if(!group)return false;
    if(group.members.some(member=>root.isLayerPositionLocked(member)))throw new Error('位置をロックしたレイヤーを含むグループは移動できません。');
    const order=[...root.rootLayerIds],ids=new Set(group.members);
    const first=order.findIndex(member=>ids.has(member)),last=first+ids.size-1;
    const adjacent=order[direction===1?last+1:first-1];
    if(!adjacent||root.getLayer(adjacent).baseColor==='white')return false;
    const depth=root.groupsForLayer(order[first]!).findIndex(candidate=>candidate.id===id);
    const adjacentPath=root.groupsForLayer(adjacent);
    const sourcePath=root.groupsForLayer(order[first]!);
    if(depth<0||sourcePath.slice(0,depth).some((parent,index)=>adjacentPath[index]?.id!==parent.id))return false;
    const siblingLength=adjacentPath[depth]?.members.length??1;
    const moved=order.splice(first,ids.size);
    order.splice(first+direction*siblingLength,0,...moved);
    this.rootOrderValue=order;
    return this.editGroups('reorder',id,root.layerGroups);
  }
  private editGroups(action:string,id:LayerId,groups:readonly LayerGroup[]){
    this.open();
    this.groupsValue=validateLayerGroups(groups,this.rootOrderValue??this.rootValue.rootLayerIds);
    this.slotsValue.push(Object.freeze({type:'groups',action,id}));
    return true;
  }
  canReorderRasterLayers(first:LayerId,second:LayerId){
    return this.rootValue.groupsForLayer(first).map(group=>group.id).join(' ')===this.rootValue.groupsForLayer(second).map(group=>group.id).join(' ');
  }
  moveRasterLayer(id:LayerId,direction:-1|1){
    if(direction!==-1&&direction!==1)throw new Error('invalid layer move direction');
    const fromIndex=this.rootValue.rootLayerIds.indexOf(id);
    if(fromIndex<0)throw new Error('missing layer');
    return this.moveRasterLayerTo(id,fromIndex+direction);
  }
  moveRasterLayerTo(id:LayerId,toIndex:number){
    this.open();
    if(this.slotsValue.length)throw new Error('Layer move must start its own transaction');
    const order=[...this.rootValue.rootLayerIds],fromIndex=order.indexOf(id);
    if(fromIndex<0)throw new Error('missing layer');
    if(!Number.isInteger(toIndex)||toIndex<0||toIndex>=order.length||toIndex===fromIndex)return false;
    const affected=order.slice(Math.min(fromIndex,toIndex),Math.max(fromIndex,toIndex)+1);
    if(this.rootValue.isLayerPositionLocked(id)||affected.some(layerId=>this.rootValue.getLayer(layerId).baseColor==='white'||!this.canReorderRasterLayers(id,layerId)))return false;
    order.splice(fromIndex,1);
    order.splice(toIndex,0,id);
    this.rootOrderValue=order;
    this.slotsValue.push(Object.freeze({type:'reorder',layerId:id,fromIndex,toIndex}));
    return true;
  }
  moveRasterLayers(ids:ReadonlySet<LayerId>,direction:-1|1){
    this.open();
    if(this.slotsValue.length)throw new Error('Layer move must start its own transaction');
    if(direction!==-1&&direction!==1)throw new Error('invalid layer move direction');
    const order=[...this.rootValue.rootLayerIds];
    if(!ids.size)return false;
    for(const id of ids){
      const layer=this.rootValue.getLayer(id);
      if(this.rootValue.isLayerPositionLocked(id)||layer.baseColor==='white')throw new Error('ロック中のレイヤーまたは白背景はまとめて移動できません。');
    }
    const original=new Map(order.map((id,index)=>[id,index]));
    for(let index=direction===1?order.length-2:1;index>=0&&index<order.length;index-=direction){
      const id=order[index]!,adjacent=order[index+direction];
      if(!ids.has(id)||!adjacent||ids.has(adjacent)||this.rootValue.getLayer(adjacent).baseColor==='white'||!this.canReorderRasterLayers(id,adjacent))continue;
      order[index]=adjacent;
      order[index+direction]=id;
    }
    for(const [toIndex,id] of order.entries()){
      const fromIndex=original.get(id)!;
      if(ids.has(id)&&fromIndex!==toIndex)this.slotsValue.push(Object.freeze({type:'reorder',layerId:id,fromIndex,toIndex}));
    }
    if(!this.slotsValue.length)return false;
    this.rootOrderValue=order;
    return true;
  }
  editTile(layerId:LayerId,x:number,y:number,edit:(b:Uint8Array)=>void){this.open();tileKey(x,y);let w=this.workingValue.get(layerId);
    if(!w){const l=this.editableRaster(layerId);if(l.baseColor==='white')throw new Error('Materialize the white background before direct pixel editing');if(l.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1')throw new Error('direct byte edit requires rgba.unorm8.v1');w=new RasterWorkingSet(l.surface,this.doc._internal(CORE_INTERNAL).store);this.workingValue.set(layerId,w);this.slotsValue.push(Object.freeze({type:'working' as const,layerId}));}
    try{w.editTile(x,y,edit);}catch(e){this.failed=true;throw e;}}
  setPixel(layerId:LayerId,x:number,y:number,rgba:readonly [number,number,number,number]){this.open();if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))throw new Error('invalid pixel coordinate');for(const v of rgba)if(!Number.isInteger(v)||v<0||v>255)throw new Error('invalid channel');
    const tx=pixelToTile(x),ty=pixelToTile(y),p=(ty.local*CANONICAL_TILE_SIZE+tx.local)*4;this.editTile(layerId,tx.tile,ty.tile,b=>{b[p]=rgba[0];b[p+1]=rgba[1];b[p+2]=rgba[2];b[p+3]=rgba[3];});}
  recordRasterOperation(layerId:LayerId,mutation:RasterSemanticMutation,dirtyTiles:readonly DirtyTileHint[]):OperationKey{this.open();const layer=this.editableRaster(layerId);if(layer.baseColor==='white')throw new Error('Materialize the white background before brush editing');if(!dirtyTiles.length)throw new Error('semantic raster operation has no dirty tiles');for(const hint of dirtyTiles){tileKey(hint.tileX,hint.tileY);if(!Number.isSafeInteger(hint.workUnits)||hint.workUnits<=0)throw new Error('invalid raster work estimate');}
    const ordinal=this.slotsValue.length,key=operationKey(this.idValue,ordinal),footprint=Object.freeze(dirtyTiles.map(x=>Object.freeze({layerId,tileX:x.tileX,tileY:x.tileY,bounds:Object.freeze({...x.bounds})})));
    const draft:SemanticOperationDraft=Object.freeze({kind:mutation.kind,schemaVersion:mutation.schemaVersion,targetEntityIds:Object.freeze([layer.id]),parameters:Object.freeze({...mutation.parameters}),
      algorithmVersionRefs:Object.freeze([...(mutation.algorithmVersionRefs??[])]),resourceRefs:Object.freeze([...(mutation.resourceRefs??[])]),sourceRevisionIds:Object.freeze([...(mutation.sourceRevisionIds??[this.baseValue])]),
      selectionSnapshotRefs:Object.freeze([...(mutation.selectionSnapshotRefs??[])]),resultValueRefs:Object.freeze([...(mutation.resultValueRefs??[])]),dirtyFootprint:footprint});
    this.slotsValue.push(Object.freeze({type:'semantic' as const,draft,layerId,key,dirtyTiles:Object.freeze(dirtyTiles.map(x=>Object.freeze({...x,bounds:Object.freeze({...x.bounds}),...(x.commandIndices?{commandIndices:Object.freeze([...x.commandIndices])}:{})})))}));return key;}
  /** One atomic artwork revision. All layers are rebased onto their exact new pixel tiles. */
  resizeDocument(width:number,height:number,kind:DocumentGeometryKind,layerPixels:ReadonlyMap<LayerId,Uint8Array|Uint8ClampedArray>,parameters:Readonly<Record<string,unknown>>={}){
    this.open();if(this.slotsValue.length)throw new Error('geometry must be the only action in this transaction');
    if(!['document.crop','document.canvas-resize','document.image-resize'].includes(kind))throw new Error('unknown geometry action');
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>8192||height>8192)throw new Error('invalid canvas dimensions');
    if(layerPixels.size!==this.rootValue.rootLayerIds.length)throw new Error('each raster layer must be rebased');
    const byteLength=width*height*4,T=CANONICAL_TILE_SIZE;
    for(const id of this.rootValue.rootLayerIds){
      const layer=this.rootValue.getLayer(id),rgba=layerPixels.get(id);
      if(layer.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1')throw new Error('unsupported direct raster sample encoding');
      if(!rgba||rgba.length!==byteLength)throw new Error('rebased raster dimensions mismatch');
      const empty=new RasterSurfaceManifest(layer.surface.descriptor);
      // Geometry rebase writes exact full pixels; it no longer needs a virtual fill.
      const {baseColor:_baseColor,...materialized}=layer;
      const mask=layer.vectorMask;
      let vectorMask=mask;
      if(mask){
        if(kind==='document.image-resize'){
          const scaleX=width/this.rootValue.width,scaleY=height/this.rootValue.height;
          vectorMask=validateVectorLayerMask({...mask,x:mask.x*scaleX,y:mask.y*scaleY,width:mask.width*scaleX,height:mask.height*scaleY});
        }else{
          const deltaX=width-this.rootValue.width,deltaY=height-this.rootValue.height,anchor=parameters.anchor;
          const shiftX=kind==='document.crop'?-Number(parameters.x??0):anchor==='center'?Math.floor(deltaX/2):anchor==='top-right'||anchor==='bottom-right'?deltaX:0;
          const shiftY=kind==='document.crop'?-Number(parameters.y??0):anchor==='center'?Math.floor(deltaY/2):anchor==='bottom-left'||anchor==='bottom-right'?deltaY:0;
          vectorMask=validateVectorLayerMask({...mask,x:mask.x+shiftX,y:mask.y+shiftY});
        }
      }
      this.updatesValue.set(id,Object.freeze({...materialized,surface:empty,...(vectorMask?{vectorMask}:{})}));
      const working=new RasterWorkingSet(empty,this.doc._internal(CORE_INTERNAL).store);
      for(let ty=0;ty<Math.ceil(height/T);ty++)for(let tx=0;tx<Math.ceil(width/T);tx++){
        const tile=new Uint8Array(T*T*4),copyW=Math.min(T,width-tx*T),copyH=Math.min(T,height-ty*T);let filled=false;
        for(let row=0;row<copyH;row++){const segment=rgba.subarray(((ty*T+row)*width+tx*T)*4,((ty*T+row)*width+tx*T+copyW)*4);tile.set(segment,row*T*4);
          if(!filled){for(let i=0;i<segment.length;i++){if(segment[i]!==0){filled=true;break;}}}
        }
        if(filled)working.editTile(tx,ty,b=>b.set(tile));
      }
      if(working.changedTileCount){this.workingValue.set(id,working);this.slotsValue.push(Object.freeze({type:'working' as const,layerId:id}));}
    }
    this.dimensionUpdate={width,height};
    this.slotsValue.push(Object.freeze({type:'dimensions' as const,kind,width,height,parameters:Object.freeze({...parameters,fromWidth:this.rootValue.width,fromHeight:this.rootValue.height,toWidth:width,toHeight:height})}));
  }
  setDocumentInfo(input:DocumentInfo){
    this.open();
    if(this.slotsValue.length)throw new Error('Document info must start its own transaction');
    const info=validateDocumentInfo(input),old=this.rootValue.info;
    if(info.name===old.name&&info.author===old.author&&info.description===old.description&&info.dpi===old.dpi)return false;
    this.slotsValue.push({type:'document-info',info});
    return true;
  }
  renameLayer(id:LayerId,name:string){return this.meta(id,{name:name.trim()});}
  setLayerVisibility(id:LayerId,visible:boolean){return this.meta(id,{visible});}
  setLayerLocked(id:LayerId,locked:boolean){return this.meta(id,{locked});}
  setVectorLayerMask(id:LayerId,mask:VectorLayerMask|null){
    const layer=this.updatesValue.get(id)??this.rootValue.getLayer(id);
    if(layer.baseColor==='white')throw new Error('白背景は描画できるレイヤーに変えてからマスクを設定してください。');
    if(this.rootValue.isLayerLocked(id))throw new Error('マスクを変える前にロックを解除してください。');
    const value=validateVectorLayerMask(mask);
    if(JSON.stringify(value)===JSON.stringify(layer.vectorMask??null))return false;
    return this.meta(id,{vectorMask:value});
  }
  setLayerClipping(id:LayerId,enabled:boolean){
    const layer=this.rootValue.getLayer(id);
    if(layer.baseColor==='white')throw new Error('白背景にはクリッピングを設定できません。');
    const source=enabled?this.rootValue.availableClippingSource(id):null;
    if(enabled&&!source)throw new Error('同じグループにクリッピング元となる下のレイヤーがありません。');
    if((layer.clipSourceId??null)===(source?.id??null))return false;
    return this.meta(id,{clipSourceId:source?.id??null});
  }
  setLayerAlphaLocked(id:LayerId,alphaLocked:boolean){
    const layer=this.updatesValue.get(id)??this.rootValue.getLayer(id);
    if((layer.alphaLocked??false)===alphaLocked)return false;
    return this.meta(id,{alphaLocked});
  }
  setLayerPositionLocked(id:LayerId,positionLocked:boolean){
    const layer=this.updatesValue.get(id)??this.rootValue.getLayer(id);
    if((layer.positionLocked??false)===positionLocked)return false;
    return this.meta(id,{positionLocked});
  }
  setLayerColorTag(id:LayerId,colorTag:LayerNode['colorTag']){
    this.open();
    const tag=parseLayerColorTag(colorTag),layer=this.updatesValue.get(id)??this.rootValue.getLayer(id);
    if((layer.colorTag??null)===tag)return false;
    return this.meta(id,{colorTag:tag});
  }
  setLayerOpacity(id:LayerId,opacity:number){
    if(!Number.isFinite(opacity)||opacity<0||opacity>1)throw new Error('invalid layer opacity');
    return this.meta(id,{opacity});
  }
  commit():CommitReceipt{this.open();try{return commitTransaction(this);}catch(e){this.failed=true;throw e;}}
  cancel(){if(this.closed)throw new Error('transaction closed');this.workingValue.clear();this.updatesValue.clear();this.slotsValue.length=0;this.rootOrderValue=null;this.dimensionUpdate=null;this.closed=true;}
  _internal(token:CoreInternalToken){if(token!==CORE_INTERNAL)throw new Error('invalid internal capability');return {doc:this.doc,base:this.baseValue,root:this.rootValue,id:this.idValue,working:this.workingValue,updates:this.updatesValue,slots:this.slotsValue,rootLayerIds:this.rootOrderValue,groups:this.groupsValue,comps:this.compsValue,deleted:this.deletedValue,dimensions:this.dimensionUpdate,hasChanges:()=>this.hasChanges(),close:()=>{this.closed=true;}};}
  private open(){if(this.closed)throw new Error('transaction closed');if(this.failed)throw new Error('transaction failed');}
  private editableRaster(id:LayerId){const layer=this.updatesValue.get(id)??this.rootValue.getLayer(id);if(layer.kind!=='raster')throw new Error('drawing target is not raster');if(layer.locked||this.rootValue.groupsForLayer(id).some(group=>group.locked))throw new Error('drawing target is locked');return layer;}
  private hasChanges(){return this.slotsValue.length>0&&((this.updatesValue.size>0)||[...this.workingValue.values()].some(w=>w.changedTileCount>0)||this.slotsValue.some(x=>x.type==='semantic'||x.type==='structure'||x.type==='reorder'||x.type==='groups'||x.type==='comps'||x.type==='restore-revision'||x.type==='pin-revision'||x.type==='delete'||x.type==='dimensions'||x.type==='document-info'));}
  private meta(id:LayerId,patch:Partial<Pick<LayerNode,'name'|'visible'|'locked'|'opacity'|'colorTag'|'positionLocked'|'alphaLocked'|'clipSourceId'|'vectorMask'>>){
    this.open();
    const layer=this.updatesValue.get(id)??this.rootValue.getLayer(id);
    if(patch.name!==undefined&&(!patch.name||patch.name.length>4096))throw new Error('invalid layer name');
    const keys=Object.keys(patch) as (keyof typeof patch)[];
    if(keys.every(key=>patch[key]===layer[key]))return false;
    if(!this.slotsValue.some(slot=>slot.type==='metadata'&&slot.layerId===id)){
      this.slotsValue.push(Object.freeze({type:'metadata' as const,layerId:id}));
    }
    this.updatesValue.set(id,Object.freeze({...layer,...patch}));
    return true;
  }
}
