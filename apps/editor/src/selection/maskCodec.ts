/** Lossless, bounded run/literal mask codec for native .illustro sections.
 * Control 0..127: 1..128 literal alpha samples.
 * Control 128..255: 1..128 repeats of the following alpha sample.
 */
export type PackedMask=Readonly<{bytes:Uint8Array;compressed:boolean}>;
export function packSelectionMask(alpha:Uint8Array):PackedMask{
  if(!alpha.length)return {bytes:alpha,compressed:false};
  // Worst case (all literals): one control byte per 128 samples.
  const buffer=new Uint8Array(alpha.length+Math.ceil(alpha.length/128)),n=alpha.length;
  let read=0,write=0;
  const repeats=(start:number)=>{
    const value=alpha[start],limit=Math.min(n,start+128);
    let end=start+1;
    while(end<limit&&alpha[end]===value)end++;
    return end-start;
  };
  while(read<n){
    const run=repeats(read);
    if(run>=3){
      buffer[write++]=127+run;
      buffer[write++]=alpha[read]!;
      read+=run;
    }else{
      const begin=read;
      read+=run;
      while(read<n&&read-begin<128){
        const next=repeats(read);
        if(next>=3)break;
        read+=Math.min(next,128-(read-begin));
      }
      const count=read-begin;
      buffer[write++]=count-1;
      buffer.set(alpha.subarray(begin,read),write);
      write+=count;
    }
  }
  return write<alpha.length?{bytes:buffer.slice(0,write),compressed:true}
    :{bytes:alpha,compressed:false};
}
/** Reject malformed input and excess/short output; never allocate based on
 * an untrusted count embedded in the compressed stream. */
export function unpackSelectionMask(source:Uint8Array,expectedLength:number):Uint8Array{
  if(!Number.isSafeInteger(expectedLength)||expectedLength<1||expectedLength>64_000_000)
    throw Error('選択範囲の展開後の大きさが正しくありません。');
  const output=new Uint8Array(expectedLength);
  let read=0,write=0;
  while(read<source.length){
    const control=source[read++]!;
    const count=control<128?control+1:control-127;
    if(write+count>expectedLength)throw Error('選択範囲の圧縮データが範囲外です。');
    if(control<128){
      if(read+count>source.length)throw Error('選択範囲の圧縮データが途中で欠けています。');
      output.set(source.subarray(read,read+count),write);
      read+=count;
    }else{
      if(read>=source.length)throw Error('選択範囲の圧縮データが途中で欠けています。');
      output.fill(source[read++]!,write,write+count);
    }
    write+=count;
  }
  if(write!==expectedLength)throw Error('選択範囲の圧縮データが不足しています。');
  return output;
}
