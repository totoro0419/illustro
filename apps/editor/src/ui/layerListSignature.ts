/** Snapshot only metadata that controls the layer list UI, not raster pixel contents. */
export function layerListSignature(state:Readonly<{
  documentId:string;selectedId:string;documentReady:boolean;
  batchMode:boolean;batchIds:readonly string[];collapsedGroups:readonly string[];
  query:string;tagFilter:string;kindFilter:string;
  groups:readonly unknown[];rows:readonly unknown[];
}>):string{
  return JSON.stringify([
    state.documentId,state.selectedId,state.documentReady,
    state.batchMode,state.batchIds,state.collapsedGroups,
    state.query,state.tagFilter,state.kindFilter,state.groups,state.rows,
  ]);
}
