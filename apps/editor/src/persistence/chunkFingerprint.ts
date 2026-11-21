/** Content fingerprint built from 4 MiB SHA-256 chunks.
 * Unlike file.arrayBuffer(), reads at most one chunk from disk at a time.
 * Both the expected bytes and actual file use exactly the same algorithm.
 */
const CHUNK_BYTES=4*1024*1024;
async function chunksFingerprint(size:number,read:(from:number,to:number)=>Promise<Uint8Array>):Promise<string>{
  if(!Number.isSafeInteger(size)||size<0)throw new Error('保存データのサイズが正しくありません。');
  const count=Math.ceil(size/CHUNK_BYTES),digests=new Uint8Array(count*32);
  for(let index=0;index<count;index++){
    const start=index*CHUNK_BYTES,end=Math.min(size,start+CHUNK_BYTES),chunk=await read(start,end);
    if(chunk.byteLength!==end-start)throw new Error('保存データの一部分を読み込めませんでした。');
    // WebCrypto has no incremental SHA-256 API. Hash each bounded part, then
    // hash the ordered list of part digests (including count via its length).
    const block=new Uint8Array(await crypto.subtle.digest('SHA-256',chunk as Uint8Array<ArrayBuffer>));
    digests.set(block,index*32);
  }
  const fingerprint=new Uint8Array(await crypto.subtle.digest('SHA-256',digests));
  return 'sha256-chunks-v1:'+Array.from(fingerprint,byte=>byte.toString(16).padStart(2,'0')).join('');
}
export function fingerprintOwnedBytes(bytes:Uint8Array):Promise<string>{
  return chunksFingerprint(bytes.byteLength,async(start,end)=>bytes.slice(start,end));
}
export function fingerprintFileChunks(file:Blob):Promise<string>{
  return chunksFingerprint(file.size,async(start,end)=>new Uint8Array(await file.slice(start,end).arrayBuffer()));
}
