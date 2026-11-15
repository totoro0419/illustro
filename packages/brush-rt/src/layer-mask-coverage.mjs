const MASK_TILE=64;
const COVERAGE_TILE=128;
const decodedTiles=new WeakMap();
const coverageTiles=new WeakMap();

export function decodeMaskTile(tiles,key){
 const value=tiles[key];
 if(value===undefined)return null;
 let cache=decodedTiles.get(tiles);
 if(!cache){cache=new Map();decodedTiles.set(tiles,cache);}
 if(cache.has(key))return cache.get(key);
 const bytes=value.length===2
  ?new Uint8Array(MASK_TILE*MASK_TILE).fill(parseInt(value,16))
  :Uint8Array.from(atob(value),character=>character.charCodeAt(0));
 if(cache.size>=64)cache.delete(cache.keys().next().value);
 cache.set(key,bytes);
 return bytes;
}

function pixelTile(mask,left,top){
 const alpha=new Uint8Array(COVERAGE_TILE*COVERAGE_TILE);
 const columns=Array.from({length:COVERAGE_TILE},(_,x)=>{
  const column=Math.floor((left+x+.5-mask.x)/mask.scaleX),tile=Math.floor(column/MASK_TILE);
  return [tile,column-tile*MASK_TILE];
 });
 for(let y=0;y<COVERAGE_TILE;y++){
  const row=Math.floor((top+y+.5-mask.y)/mask.scaleY),tileY=Math.floor(row/MASK_TILE);
  const offset=(row-tileY*MASK_TILE)*MASK_TILE;
  let previousTile,bytes;
  for(let x=0;x<COVERAGE_TILE;x++){
   const [tileX,column]=columns[x];
   if(previousTile!==tileX){previousTile=tileX;bytes=decodeMaskTile(mask.tiles,tileX+','+tileY);}
   alpha[y*COVERAGE_TILE+x]=bytes?.[offset+column]??255;
  }
 }
 return alpha;
}

export function traceMaskPath(context,mask){
 context.beginPath();
 if(mask.shape==='path'){
  const [first,...rest]=mask.points;
  context.moveTo(first.x,first.y);
  for(const {x,y} of rest)context.lineTo(x,y);
  context.closePath();
 }else if(mask.shape==='ellipse'){
  context.ellipse(mask.x+mask.width/2,mask.y+mask.height/2,mask.width/2,mask.height/2,0,0,2*Math.PI);
 }else context.rect(mask.x,mask.y,mask.width,mask.height);
}

const pathBounds=new WeakMap();
function vectorTile(mask,left,top){
 let bounds=pathBounds.get(mask);
 if(!bounds){
  if(mask.shape==='path'){
   const xs=mask.points.map(p=>p.x),ys=mask.points.map(p=>p.y);
   bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  }else bounds=[mask.x,mask.y,mask.x+mask.width,mask.y+mask.height];
  pathBounds.set(mask,bounds);
 }
 if(left>=bounds[2]||top>=bounds[3]||left+COVERAGE_TILE<=bounds[0]||top+COVERAGE_TILE<=bounds[1])return 0;
 if(mask.shape==='rectangle'&&left>=bounds[0]&&top>=bounds[1]&&left+COVERAGE_TILE<=bounds[2]&&top+COVERAGE_TILE<=bounds[3])return 255;
 const canvas=typeof OffscreenCanvas==='function'
  ?new OffscreenCanvas(COVERAGE_TILE,COVERAGE_TILE)
  :Object.assign(document.createElement('canvas'),{width:COVERAGE_TILE,height:COVERAGE_TILE});
 const context=canvas.getContext('2d',{willReadFrequently:true});
 if(!context)throw Error('Unable to rasterize layer mask');
 context.translate(-left,-top);
 traceMaskPath(context,mask);
 context.fill('evenodd');
 const rgba=context.getImageData(0,0,COVERAGE_TILE,COVERAGE_TILE).data;
 const alpha=new Uint8Array(COVERAGE_TILE*COVERAGE_TILE);
 for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];
 return alpha;
}

const adjusted=(mask,value)=>Math.round(255-(mask.inverted?value:255-value)*mask.density);

export function samplePixelMask(mask,x,y){
 const column=Math.floor((x-mask.x)/mask.scaleX),row=Math.floor((y-mask.y)/mask.scaleY);
 const tx=Math.floor(column/MASK_TILE),ty=Math.floor(row/MASK_TILE);
 const bytes=decodeMaskTile(mask.tiles,tx+','+ty);
 return adjusted(mask,bytes?.[(row-ty*MASK_TILE)*MASK_TILE+column-tx*MASK_TILE]??255);
}

/** A number denotes a uniform tile. Nonuniform tiles store straight alpha in document order. */
export function layerMaskTile(mask,key){
 if(!mask?.enabled||!mask.density)return 255;
 let cache=coverageTiles.get(mask);
 if(!cache){cache=new Map();coverageTiles.set(mask,cache);}
 if(cache.has(key))return cache.get(key);
 const [x,y]=key.split(',').map(value=>Number(value)*COVERAGE_TILE);
 const alpha=mask.shape==='pixels'?pixelTile(mask,x,y):vectorTile(mask,x,y);
 let result;
 if(typeof alpha==='number')result=adjusted(mask,alpha);
 else{
  if(mask.inverted||mask.density!==1)for(let i=0;i<alpha.length;i++)alpha[i]=adjusted(mask,alpha[i]);
  result=alpha.every(value=>value===alpha[0])?alpha[0]:alpha;
 }
 if(cache.size>=32)cache.delete(cache.keys().next().value);
 cache.set(key,result);
 return result;
}

export function layerMaskCoverage(mask,x,y){
 if(!mask?.enabled||!mask.density)return 1;
 x=Math.floor(x);y=Math.floor(y);
 const tx=Math.floor(x/COVERAGE_TILE),ty=Math.floor(y/COVERAGE_TILE);
 const alpha=layerMaskTile(mask,tx+','+ty);
 return (typeof alpha==='number'?alpha:alpha[(y-ty*COVERAGE_TILE)*COVERAGE_TILE+x-tx*COVERAGE_TILE])/255;
}
