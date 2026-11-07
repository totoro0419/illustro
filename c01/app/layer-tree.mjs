/** C03 layer-tree primitives. No raster mutation or UI side effects. */
export function createLayerTree() {
  return {layers: [], selectedId: null, nextId: 1};
}
export function addRasterLayer(tree, name = 'レイヤー') {
  const id = 'layer-' + tree.nextId++;
  const selected = tree.layers.findIndex(layer => layer.id === tree.selectedId);
  const layer = {id, lifetime: 1, type: 'raster', name, parentId: null,
    visible: true, opacity: 1, blendMode: 'normal', locks: {position:false, pixels:false, all:false}};
  tree.layers.splice(selected < 0 ? tree.layers.length : selected + 1, 0, layer);
  tree.selectedId = id;
  return layer;
}
export function selectLayer(tree, id) {
  if (!tree.layers.some(layer => layer.id === id)) throw new RangeError('Layer not found');
  tree.selectedId = id;
}
export function freezeDrawTarget(tree) {
  const layer = tree.layers.find(item => item.id === tree.selectedId);
  if (!layer) throw new Error('No drawing layer selected');
  if (layer.type !== 'raster') throw new Error('Selected layer is not raster');
  if (layer.locks.all || layer.locks.pixels) throw new Error('Layer is locked');
  return Object.freeze({id:layer.id, lifetime:layer.lifetime});
}
export function assertDrawTarget(tree, target) {
  const layer = tree.layers.find(item => item.id === target.id && item.lifetime === target.lifetime);
  if (!layer) throw new Error('Drawing target no longer exists');
  if (layer.locks.all || layer.locks.pixels) throw new Error('Drawing target is locked');
  return layer;
}
export function setLayerVisibility(tree, id, visible) {
  const layer = tree.layers.find(item => item.id === id);
  if (!layer) throw new RangeError('Layer not found');
  const previous = layer.visible;
  layer.visible = Boolean(visible);
  return {id, previous, next:layer.visible};
}
export function setLayerOpacity(tree, id, opacity) {
  const layer = tree.layers.find(item => item.id === id);
  if (!layer) throw new RangeError('Layer not found');
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new RangeError('Opacity must be in [0,1]');
  const previous = layer.opacity;
  layer.opacity = opacity;
  return {id, previous, next:opacity};
}

/** Reordering is limited to siblings; no layer pixels are touched. */
export function moveLayer(tree,id,delta){
 const layer=tree.layers.find(l=>l.id===id);
 if(!layer)throw Error('Layer not found');
 const siblings=tree.layers.filter(l=>(l.parentId??null)===(layer.parentId??null));
 const index=siblings.indexOf(layer),other=siblings[index+delta];
 if(!other)return false;
 const a=tree.layers.indexOf(layer),b=tree.layers.indexOf(other);
 [tree.layers[a],tree.layers[b]]=[tree.layers[b],tree.layers[a]];
 return true;
}
export function addGroupLayer(tree,name='グループ'){
 const selected=tree.layers.find(l=>l.id===tree.selectedId);
 const id='layer-'+tree.nextId++;
 const group={id,type:'group',name,lifetime:1,parentId:selected?.parentId??null,visible:true,opacity:1,blendMode:'normal',locks:{}};
 const index=tree.layers.indexOf(selected);
 tree.layers.splice(index<0?tree.layers.length:index+1,0,group);tree.selectedId=id;
 return group;
}
export function groupLayers(tree,ids){
 const members=tree.layers.filter(l=>ids.includes(l.id));
 if(!members.length)throw Error('Select layers to group');
 const parentId=members[0].parentId??null;
 if(members.some(l=>(l.parentId??null)!==parentId))throw Error('Only sibling layers can be grouped');
 const group=addGroupLayer(tree,'グループ');
 group.parentId=parentId;
 const old=tree.layers.indexOf(group);
 tree.layers.splice(old,1);
 tree.layers.splice(Math.max(...members.map(l=>tree.layers.indexOf(l)))+1,0,group);
 for(const layer of members)layer.parentId=group.id;
 tree.selectedId=group.id;
 return group;
}
export function setLayerParent(tree,id,parentId){
 const layer=tree.layers.find(l=>l.id===id);
 const parent=parentId==null?null:tree.layers.find(l=>l.id===parentId&&l.type==='group');
 if(!layer||(parentId!=null&&!parent))throw Error('Invalid layer destination');
 let cursor=parent;
 while(cursor){if(cursor.id===id)throw Error('Cannot move layer into itself or a descendant');cursor=tree.layers.find(l=>l.id===cursor.parentId);}
 layer.parentId=parentId??null;
}
export function duplicateRasterLayer(tree,id){
 const source=tree.layers.find(l=>l.id===id);
 if(!source||source.type!=='raster')throw Error('Only raster layers can be duplicated');
 const result=structuredClone(source);
 result.id='layer-'+tree.nextId++;result.name=source.name+' のコピー';result.lifetime=1;
 tree.layers.splice(tree.layers.indexOf(source)+1,0,result);
 tree.selectedId=result.id;return result;
}
