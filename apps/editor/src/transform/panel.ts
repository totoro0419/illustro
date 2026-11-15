import type {BrushSurface} from '../brushSurface';
import type {MaskData} from '../selection/mask';
import {initialTransform,inverseTransform,type Transform} from './geometry';
import {runTransform} from './run';

export type TransformSource={
  width:number;height:number;name:string;pixels:Uint8Array;selection:MaskData|null;
  drawing:BrushSurface;valid:()=>boolean;
  apply:(settings:Transform,pixels:Uint8ClampedArray)=>Promise<void>;
};
type Target='layer'|'selected'|'boundary';

export function installTransformPanel(host:HTMLElement,capture:(target:Target)=>Promise<TransformSource>){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='変形';
  const target=document.createElement('select');target.setAttribute('aria-label','変形する対象');
  target.add(new Option('レイヤー全体','layer'));target.add(new Option('選択した絵','selected'));target.add(new Option('選択の枠だけ','boundary'));
  const status=document.createElement('output');status.setAttribute('role','status');
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const tools=document.createElement('div');tools.className='c06-clipboard-grid';
  const preview=document.createElement('canvas');preview.hidden=true;preview.style.cssText='max-width:100%;border:1px solid currentColor';
  const comparison=document.createElement('label'),compare=document.createElement('input');
  compare.type='checkbox';comparison.append(compare,' 変形前を見る');comparison.hidden=true;
  let source:TransformSource|null=null,settings=initialTransform,undo:Transform[]=[],redo:Transform[]=[],previewId=0,busy=false;
  let ownedGesture:BrushSurface|null=null;
  const inputs=new Map<keyof Transform,HTMLSelectElement|HTMLInputElement>();

  function button(label:string,handler:()=>void|Promise<void>){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.onclick=async()=>{try{await handler();}catch(error){status.textContent=error instanceof Error?error.message:String(error);}};
    return button;
  }
  function field(key:keyof Transform,label:string,control:HTMLInputElement|HTMLSelectElement){
    const wrapper=document.createElement('label');wrapper.append(label,control);controls.append(wrapper);
    inputs.set(key,control);
    control.onchange=()=>{
      const value=control instanceof HTMLInputElement?control.valueAsNumber:control.value;
      if(typeof value==='number'&&!Number.isFinite(value)){sync();return;}
      change({...settings,[key]:value});
    };
  }
  function options<K extends 'mode'|'interpolation'>(key:K,label:string,items:readonly [Transform[K],string][]){
    const select=document.createElement('select');
    for(const [value,name] of items)select.add(new Option(name,value));
    field(key,label,select);
  }
  function number(key:keyof Transform,label:string,min:number,max:number,step=1){
    const input=document.createElement('input');
    input.type='number';input.min=String(min);input.max=String(max);input.step=String(step);
    field(key,label,input);
  }
  options('mode','変形の方法',[
    ['affine','移動・回転・拡縮・傾斜'],['perspective','遠近'],['mesh','中央を曲げる'],
    ['push','ゆがみ・押す'],['expand','ゆがみ・膨らませる'],['pinch','ゆがみ・縮める'],
    ['twist','ゆがみ・回す'],['restore','ゆがみを戻す']
  ]);
  options('interpolation','変形後の画素',[['bilinear','なめらか'],['nearest','ドット絵向け'],['area','縮小向け']]);
  number('dx','横の移動（px）',-8192,8192,.5);number('dy','縦の移動（px）',-8192,8192,.5);
  number('sx','横の倍率',-16,16,.01);number('sy','縦の倍率',-16,16,.01);
  number('angle','角度（°）',-360,360,.1);number('shear','傾き',-4,4,.01);
  number('perspective','遠近の強さ',-.79,.79,.01);
  number('warpX','曲げる方向・横（px）',-8192,8192,1);number('warpY','曲げる方向・縦（px）',-8192,8192,1);
  number('cx','中心 X（px）',0,8192,.5);number('cy','中心 Y（px）',0,8192,.5);
  number('radius','ゆがみの半径（px）',1,4096);number('strength','ゆがみの強さ',0,.85,.01);

  const start=button('変形を始める',async()=>{
    busy=true;sync();
    try{
      source=await capture(target.value as Target);undo=[];redo=[];
      settings={...initialTransform,cx:source.width/2,cy:source.height/2};
      status.textContent=source.name+'を変形します。';compare.checked=false;
    }finally{busy=false;sync();}
    void refreshPreview();
  });
  const back=button('直前の調整を戻す',()=>{const prior=undo.pop();if(prior){redo.push(settings);settings=prior;sync();void refreshPreview();}});
  const forward=button('調整をやり直す',()=>{const next=redo.pop();if(next){undo.push(settings);settings=next;sync();void refreshPreview();}});
  const flipX=button('左右反転',()=>change({...settings,sx:-settings.sx}));
  const flipY=button('上下反転',()=>change({...settings,sy:-settings.sy}));
  const direct=button('絵の上で位置を指定',()=>{
    if(!source?.valid())throw Error('作品が変更されました。変形を開始し直してください。');
    ownedGesture=source.drawing;
    status.textContent='絵をタップして中心を指定するか、ドラッグして移動します。';
    ownedGesture.setCanvasEditGesture({path:true,width:2,color:'#ffb742',complete:points=>{
      ownedGesture?.setCanvasEditGesture(null);ownedGesture=null;
      const first=points[0],last=points.at(-1);
      if(!first||!last||!source?.valid())return;
      const dx=last.x-first.x,dy=last.y-first.y;
      if(settings.mode==='mesh'||settings.mode==='push')change({...settings,cx:first.x,cy:first.y,warpX:dx,warpY:dy});
      else if(Math.hypot(dx,dy)<1||settings.mode!=='affine')change({...settings,cx:first.x,cy:first.y});
      else change({...settings,dx:settings.dx+dx,dy:settings.dy+dy});
    }});
  });
  const cancel=button('取り消す',()=>reset('変形を取り消しました。'));
  const apply=button('変形を適用',async()=>{
    const current=source;
    if(!current?.valid())throw Error('作品が変更されました。変形を開始し直してください。');
    const choice=settings;
    inverseTransform(choice,current.width,current.height);
    busy=true;sync();status.textContent='変形を計算しています。';
    try{
      const pixels=await runTransform({pixels:current.pixels,width:current.width,height:current.height,
        settings:choice,selection:current.selection,outputWidth:current.width,outputHeight:current.height});
      if(!current.valid())throw Error('計算中に作品が変更されました。');
      await current.apply(choice,pixels);
      reset('変形を適用しました。');
    }finally{busy=false;sync();}
  });
  function reset(message:string){
    ownedGesture?.setCanvasEditGesture(null);ownedGesture=null;source=null;previewId++;
    preview.hidden=true;status.textContent=message;sync();
  }
  function change(next:Transform){
    if(!source||busy)return;
    undo.push(settings);redo=[];settings=next;sync();void refreshPreview();
  }
  function sync(){
    for(const [key,input] of inputs){
      input.value=String(settings[key]);
      input.disabled=!source||busy;
    }
    start.disabled=busy||!!source;target.disabled=busy||!!source;cancel.disabled=!source||busy;
    apply.disabled=!source||busy;back.disabled=!source||busy||!undo.length;forward.disabled=!source||busy||!redo.length;
    direct.disabled=flipX.disabled=flipY.disabled=!source||busy;
    comparison.hidden=!source;
  }
  async function refreshPreview(){
    const current=source,id=++previewId;
    if(!current)return;
    try{
      const scale=Math.min(1,280/Math.max(current.width,current.height));
      const outputWidth=Math.max(1,Math.round(current.width*scale)),outputHeight=Math.max(1,Math.round(current.height*scale));
      const pixels=await runTransform({pixels:current.pixels,width:current.width,height:current.height,
        settings:compare.checked?{...initialTransform,cx:settings.cx,cy:settings.cy}:settings,
        selection:current.selection,outputWidth,outputHeight});
      if(id!==previewId)return;
      preview.width=outputWidth;preview.height=outputHeight;
      preview.getContext('2d')?.putImageData(new ImageData(pixels,outputWidth,outputHeight),0,0);
      preview.hidden=false;
    }catch(error){if(id===previewId)status.textContent=error instanceof Error?error.message:String(error);}
  }
  compare.onchange=()=>void refreshPreview();
  tools.append(start,direct,flipX,flipY,back,forward,apply,cancel);
  panel.append(summary,target,tools,controls,comparison,preview,status);host.append(panel);
  sync();
}
