/** Alpha zero may still contain RGB data; only all-zero RGBA is absent. */
export function hasPixelData(bytes:Uint8Array){
 if(bytes.byteOffset%4===0&&bytes.byteLength%4===0){const words=new Uint32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);for(const word of words)if(word!==0)return true;}
 else for(const byte of bytes)if(byte!==0)return true;
 return false;
}
