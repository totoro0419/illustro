export type EditorRendererBackend='auto'|'webgpu'|'webgl2';

export function chooseEditorRendererBackend(search:string,userAgent:string):EditorRendererBackend{
  const requested=new URLSearchParams(search).get('backend');
  if(requested==='webgpu'||requested==='webgl2')return requested;
  // Android WebGPU presentation differs across device/driver combinations.
  // Until representative Android hardware is accepted, use the already-supported
  // WebGL2 GPU path for the automatic production choice. Explicit QA overrides remain.
  if(/Android/i.test(userAgent))return 'webgl2';
  return 'auto';
}
