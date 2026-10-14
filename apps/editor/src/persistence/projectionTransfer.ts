import type {ProjectionTileDeltaV2} from './projectionCache';

const copyBudget=1024*1024;
/** Keep retained checkpoint pixels owned by the editor, with an input opportunity per MiB. */
export async function cloneProjectionTiles(tiles:readonly ProjectionTileDeltaV2[],valid:()=>boolean,yieldTask:()=>Promise<void>=()=>new Promise(resolve=>setTimeout(resolve,0))){
 const copies:ProjectionTileDeltaV2[]=[];let bytes=0;
 for(const tile of tiles){
  if(tile.pixels.byteLength>copyBudget)throw new Error('Projection tile exceeds transfer copy budget');
  if(bytes&&bytes+tile.pixels.byteLength>copyBudget){await yieldTask();bytes=0;}
  if(!valid())return null;
  copies.push({surfaceId:tile.surfaceId,key:tile.key,pixels:tile.pixels.slice()});bytes+=tile.pixels.byteLength;
 }
 return valid()?copies:null;
}
