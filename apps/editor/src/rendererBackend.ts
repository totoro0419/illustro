export type EditorRendererBackend='auto'|'webgpu'|'webgl2';

export function chooseEditorRendererBackend(search:string,userAgent:string):EditorRendererBackend{
  const requested=new URLSearchParams(search).get('backend');
  if(requested==='webgpu'||requested==='webgl2')return requested;
  // M02 user report: the automatic renderer produced a black canvas on an Android phone.
  // Until Android hardware is accepted again, use the already-supported WebGL2 GPU path
  // for Android's automatic production choice. Explicit QA overrides remain.
  if(/Android/i.test(userAgent))return 'webgl2';
  return 'auto';
}
