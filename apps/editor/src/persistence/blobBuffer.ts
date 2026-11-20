/** Return the exact bytes of a native save as a Blob input.
 * A Worker-owned full ArrayBuffer needs no extra 64MB-scale duplicate; a
 * subarray must be copied to avoid accidentally writing unrelated bytes.
 */
export function exactBlobBuffer(bytes:Uint8Array):ArrayBuffer{
  const original=bytes.buffer;
  if(original instanceof ArrayBuffer&&bytes.byteOffset===0&&bytes.byteLength===original.byteLength)
    return original;
  return Uint8Array.from(bytes).buffer;
}
