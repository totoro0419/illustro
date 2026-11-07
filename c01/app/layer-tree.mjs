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
