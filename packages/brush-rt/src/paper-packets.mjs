/** Coalesce image state, never drop a required tile to cap a message queue.
 * A merged packet does not impersonate a per-stroke history journal entry. */
export function mergePaperPackets(a,b){
 if(a.epoch!==b.epoch)return a.epoch>b.epoch?a:b;
 if(a.serial>b.serial)[a,b]=[b,a];
 const tiles=new Map;
 if(!b.replace)for(const tile of a.tiles)tiles.set(tile.surfaceId+'\u0000'+tile.key,tile);
 for(const tile of b.tiles)tiles.set(tile.surfaceId+'\u0000'+tile.key,tile);
 return {...b,replace:!!(a.replace||b.replace),id:null,ids:[...new Set([...(a.ids??[]),...(b.ids??[])])],tiles:[...tiles.values()]};
}
export function queueFuturePaperPacket(queue,packet){
 queue.push(packet);
 while(queue.length>2){const first=queue.shift(),second=queue.shift();queue.unshift(mergePaperPackets(first,second));}
}
