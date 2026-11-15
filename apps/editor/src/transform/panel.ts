import type {LiquifyStroke,TransformBounds,TransformMesh,TransformPoint,TransformQuad} from '@illustro/core';
import type {BrushSurface} from '../brushSurface';
import type {MaskData} from '../selection/mask';
import {cornerMode,initialTransform,inverseTransform,meshMode,type Transform} from './geometry';
import {runTransform} from './run';
import {makeLiquifyStroke} from './liquify';
import {cornersTowardVanishingPoint,rectCorners} from './quadrilateral';
import {addCagePoint,cageMesh,changeGrid,gridMesh,meshEdges} from './mesh';

export type TransformSource={
  width:number;height:number;name:string;pixels:Uint8Array;selection:MaskData|null;
  drawing:BrushSurface;valid:()=>boolean;bounds:TransformBounds;initial?:Transform;maskLink?:boolean;
  apply:(settings:Transform,pixels:Uint8ClampedArray)=>Promise<void>;
};
type Target='layer'|'selected'|'boundary';

export function installTransformPanel(host:HTMLElement,capture:(target:Target)=>Promise<TransformSource>,bake:()=>Promise<void>){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='変形';
  const target=document.createElement('select');target.setAttribute('aria-label','変形する対象');
  target.add(new Option('レイヤー全体','layer'));target.add(new Option('選択した絵','selected'));target.add(new Option('選択の枠だけ','boundary'));
  const status=document.createElement('output');status.setAttribute('role','status');
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const tools=document.createElement('div');tools.className='c06-clipboard-grid';
  const cornerFields=document.createElement('fieldset');cornerFields.hidden=true;
  const cornerLegend=document.createElement('legend');cornerLegend.textContent='四隅の位置（px）';cornerFields.append(cornerLegend);
  const pointsGrid=document.createElement('div');pointsGrid.className='c06-clipboard-grid';cornerFields.append(pointsGrid);
  const meshFields=document.createElement('fieldset');meshFields.hidden=true;meshFields.disabled=true;
  const meshLegend=document.createElement('legend');meshLegend.textContent='網と囲いの制御点';meshFields.append(meshLegend);
  const meshTools=document.createElement('div');meshTools.className='c06-clipboard-grid';meshFields.append(meshTools);
  const preview=document.createElement('canvas');preview.hidden=true;preview.style.cssText='max-width:100%;border:1px solid currentColor';
  const comparison=document.createElement('label'),compare=document.createElement('input');
  compare.type='checkbox';comparison.append(compare,' 変形前を見る');comparison.hidden=true;
  let source:TransformSource|null=null,settings=initialTransform,undo:Transform[]=[],redo:Transform[]=[],previewId=0,busy=false;
  let ownedGesture:BrushSurface|null=null,editingHandles=false,placingPoints=false,previewAbort:AbortController|null=null;
  const inputs=new Map<keyof Omit<Transform,'quadrilateral'|'mesh'|'liquify'>,HTMLSelectElement|HTMLInputElement>();

  function button(label:string,handler:()=>void|Promise<void>){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.onclick=async()=>{try{await handler();}catch(error){status.textContent=error instanceof Error?error.message:String(error);}};
    return button;
  }
  function field(key:keyof Omit<Transform,'quadrilateral'|'mesh'|'liquify'>,label:string,control:HTMLInputElement|HTMLSelectElement){
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
  function number(key:keyof Omit<Transform,'quadrilateral'|'mesh'|'liquify'>,label:string,min:number,max:number,step=1){
    const input=document.createElement('input');
    input.type='number';input.min=String(min);input.max=String(max);input.step=String(step);
    field(key,label,input);
  }
  options('mode','変形の方法',[
    ['affine','移動・回転・拡縮・傾斜'],['free','自由変形・四隅'],['projective','遠近・四隅'],
    ['skew','傾斜・辺をずらす'],['perspective','遠近・強さで指定'],['mesh-grid','網で曲げる'],['cage','囲いで曲げる'],['mesh','中央を曲げる'],
    ['liquify','ゆがみブラシ']
  ]);
  options('interpolation','変形後の画素',[['bilinear','なめらか'],['nearest','ドット絵向け'],['area','縮小向け']]);
  number('dx','横の移動（px）',-8192,8192,.5);number('dy','縦の移動（px）',-8192,8192,.5);
  number('sx','横の倍率',-16,16,.01);number('sy','縦の倍率',-16,16,.01);
  number('angle','角度（°）',-360,360,.1);number('shear','傾き',-4,4,.01);
  number('perspective','遠近の強さ',-.79,.79,.01);
  number('warpX','曲げる方向・横（px）',-8192,8192,1);number('warpY','曲げる方向・縦（px）',-8192,8192,1);
  number('cx','中心 X（px）',0,8192,.5);number('cy','中心 Y（px）',0,8192,.5);
  number('radius','ゆがみの半径（px）',1,4096);number('strength','ゆがみの強さ',0,.85,.01);

  const pointInputs=['左上','右上','右下','左下'].flatMap((name,index)=>['x','y'].map(axis=>{
    const input=document.createElement('input');input.type='number';input.step='.5';
    const label=document.createElement('label');label.append(name+' '+axis.toUpperCase(),input);pointsGrid.append(label);
    input.onchange=()=>{
      const point=settings.quadrilateral?.corners[index];
      if(point&&Number.isFinite(input.valueAsNumber))moveCorner(index,{...point,[axis]:input.valueAsNumber});
      else sync();
    };
    return input;
  }));

  function moveCorner(index:number,point:TransformPoint){
    if(!settings.quadrilateral||!cornerMode(settings.mode))return;
    const corners=[...settings.quadrilateral.corners] as [TransformPoint,TransformPoint,TransformPoint,TransformPoint];
    const previous=corners[index]!;
    corners[index]=point;
    if(settings.mode==='skew'){
      const next=(index+1)%4,adjacent=corners[next]!;
      corners[next]={x:adjacent.x+point.x-previous.x,y:adjacent.y+point.y-previous.y};
    }
    setCorners(corners);
  }
  function setCorners(corners:TransformQuad){
    if(settings.quadrilateral)change({...settings,quadrilateral:{...settings.quadrilateral,corners}});
  }
  const usesHandles=(mode:Transform['mode'])=>cornerMode(mode)||meshMode(mode);
  const pointSelect=document.createElement('select');
  const pointLabel=document.createElement('label');pointLabel.append('制御点',pointSelect);
  const lockPoint=document.createElement('input');lockPoint.type='checkbox';
  const lockLabel=document.createElement('label');lockLabel.append(lockPoint,' この点を固定');
  const positionX=document.createElement('input'),positionY=document.createElement('input');
  for(const input of [positionX,positionY]){input.type='number';input.step='.5';}
  const labelX=document.createElement('label'),labelY=document.createElement('label');
  labelX.append('X（px）',positionX);labelY.append('Y（px）',positionY);
  const gridCols=document.createElement('select'),gridRows=document.createElement('select');
  for(let i=2;i<=6;i++){gridCols.add(new Option(String(i),String(i)));gridRows.add(new Option(String(i),String(i)));}
  const colsLabel=document.createElement('label'),rowsLabel=document.createElement('label');
  colsLabel.append('横方向の点の数',gridCols);rowsLabel.append('縦方向の点の数',gridRows);
  const meshIndex=()=>Number(pointSelect.value);
  function updateMesh(controls:TransformMesh){
    if(!settings.mesh)return;
    change({...settings,mesh:{...settings.mesh,controls}});
  }
  function moveMeshPoint(index:number,p:TransformPoint){
    const mesh=settings.mesh?.controls;
    if(!mesh||placingPoints||busy||!mesh.points[index]||mesh.points[index]!.fixed)return;
    pointSelect.value=String(index);
    updateMesh({...mesh,points:mesh.points.map((point,i)=>i===index?{x:p.x,y:p.y,fixed:false}:point)});
  }
  function selectMeshPoint(){
    const point=settings.mesh?.controls.points[meshIndex()];
    if(!point)return;
    lockPoint.checked=point.fixed;
    lockPoint.disabled=!placingPoints||busy;
    positionX.value=String(Math.round(point.x*10)/10);positionY.value=String(Math.round(point.y*10)/10);
    positionX.disabled=positionY.disabled=point.fixed||placingPoints||busy;
  }
  pointSelect.onchange=selectMeshPoint;
  const moveWithNumbers=()=>{
    const x=positionX.valueAsNumber,y=positionY.valueAsNumber;
    if(Number.isFinite(x)&&Number.isFinite(y))moveMeshPoint(meshIndex(),{x,y});
    else selectMeshPoint();
  };
  positionX.onchange=positionY.onchange=moveWithNumbers;
  lockPoint.onchange=()=>{
    const mesh=settings.mesh?.controls;
    if(mesh)updateMesh({...mesh,points:mesh.points.map((point,index)=>index===meshIndex()?{...point,fixed:lockPoint.checked}:point)});
  };
  const resizeGrid=()=>{
    const mesh=settings.mesh;
    if(mesh?.controls.kind==='grid'){
      try{updateMesh(changeGrid(mesh.bounds,mesh.controls,Number(gridCols.value),Number(gridRows.value)));}
      catch(error){status.textContent=error instanceof Error?error.message:String(error);sync();}
    }
  };
  gridCols.onchange=gridRows.onchange=resizeGrid;
  const addPoint=button('この点の次に追加',()=>{
    const mesh=settings.mesh?.controls;
    if(mesh?.kind==='cage'&&mesh.points.length<36)updateMesh(addCagePoint(mesh,meshIndex()));
  });
  const removePoint=button('追加した点を削除',()=>{
    const mesh=settings.mesh;
    if(mesh?.controls.kind!=='cage')return;
    const index=meshIndex(),point=mesh.controls.source[index];
    if(!point||rectCorners(mesh.bounds).some(p=>p.x===point.x&&p.y===point.y))throw Error('元の範囲を保つため、四隅は削除できません。');
    updateMesh({...mesh.controls,source:mesh.controls.source.filter((_,i)=>i!==index),
      points:mesh.controls.points.filter((_,i)=>i!==index)});
  });
  const pointMode=button('点の配置・固定',()=>{
    placingPoints=!placingPoints;sync();refreshHandles();
    status.textContent=placingPoints?'点の数や固定する点を選べます。':'キャンバス上の点を動かせます。';
  });
  meshTools.append(pointMode,pointLabel,lockLabel,labelX,labelY,colsLabel,rowsLabel,addPoint,removePoint);

  function refreshHandles(){
    if(!usesHandles(settings.mode)){if(editingHandles)stopGesture();return;}
    if(!source||!editingHandles)return;
    const mesh=meshMode(settings.mode)?settings.mesh?.controls:null;
    const points=mesh?.points??settings.quadrilateral?.corners;
    if(!points)return;
    ownedGesture=source.drawing;
    ownedGesture.setCanvasEditGesture({path:true,width:2,color:'#ffb742',complete:()=>{},pointEdit:mesh?
      {points,edges:meshEdges(mesh),fixed:mesh.points.map(point=>placingPoints||point.fixed),closed:false,commit:moveMeshPoint}
      :{points,commit:moveCorner}});
  }
  function stopGesture(){
    ownedGesture?.setCanvasEditGesture(null);ownedGesture=null;editingHandles=false;
  }
  const start=button('変形を始める',async()=>{
    busy=true;sync();
    try{
      source=await capture(target.value as Target);undo=[];redo=[];
      settings=source.initial??{...initialTransform,cx:source.width/2,cy:source.height/2};
      status.textContent=source.name+'を変形します。'+(source.maskLink===undefined?'':source.maskLink?' マスクも一緒に変形します。':' マスクは現在の位置に残ります。');
      editingHandles=usesHandles(settings.mode);placingPoints=false;refreshHandles();compare.checked=false;
    }finally{busy=false;sync();}
    void refreshPreview();
  });
  const back=button('直前の調整を戻す',()=>{const prior=undo.pop();if(prior){redo.push(settings);settings=prior;editingHandles=usesHandles(settings.mode)||editingHandles;sync();refreshHandles();void refreshPreview();}});
  const forward=button('調整をやり直す',()=>{const next=redo.pop();if(next){undo.push(settings);settings=next;editingHandles=usesHandles(settings.mode)||editingHandles;sync();refreshHandles();void refreshPreview();}});
  const flipX=button('左右反転',()=>change({...settings,sx:-settings.sx}));
  const flipY=button('上下反転',()=>change({...settings,sy:-settings.sy}));
  const direct=button('絵の上で位置を指定',()=>{
    if(!source?.valid())throw Error('作品が変更されました。変形を開始し直してください。');
    stopGesture();
    if(settings.mode==='liquify'){armLiquify();return;}
    if(usesHandles(settings.mode)){
      editingHandles=true;placingPoints=false;sync();refreshHandles();status.textContent='キャンバス上の点をドラッグできます。';return;
    }
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
  const liquifyFields=document.createElement('fieldset');
  const liquifyTitle=document.createElement('legend');liquifyTitle.textContent='ゆがみブラシ';liquifyFields.append(liquifyTitle);
  const brushMode=document.createElement('select');
  for(const [mode,label] of [
    ['push','押す'],['expand','膨らませる'],['pinch','縮める'],['twist','回す'],['restore','なぞった場所を戻す'],
    ['protect','なぞった場所を保護'],['unprotect','保護を消す']
  ])brushMode.add(new Option(label,mode));
  const modeLabel=document.createElement('label');modeLabel.append('作用',brushMode);
  const protectionVisible=document.createElement('input');protectionVisible.type='checkbox';protectionVisible.checked=true;
  const protectionLabel=document.createElement('label');protectionLabel.append(protectionVisible,' 仮表示に保護した範囲を表示');
  liquifyFields.append(modeLabel,protectionLabel);
  protectionVisible.onchange=()=>void refreshPreview();
  brushMode.onchange=()=>{if(ownedGesture)armLiquify();};
  function armLiquify(){
    const current=source;
    if(!current)return;
    stopGesture();
    const mode=brushMode.value as LiquifyStroke['mode'];
    ownedGesture=current.drawing;
    status.textContent='キャンバスをなぞると一筆ずつ反映します。';
    ownedGesture.setCanvasEditGesture({path:false,width:settings.radius*2,color:mode==='protect'||mode==='unprotect'?'#3c99e8':'#ffb742',complete:points=>{
      if(busy||!current.valid())return;
      try{
        const stroke=makeLiquifyStroke(mode,settings.radius,mode==='protect'||mode==='unprotect'?1:settings.strength,points);
        if(!stroke)return;
        const prior=settings.liquify??[];
        if(prior.length>=512||prior.reduce((total,item)=>total+item.points.length,stroke.points.length)>32_768)
          throw Error('ゆがみの操作数が上限に達しました。');
        change({...settings,liquify:[...prior,stroke]});
      }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
    }});
  }
  const vanishing=button('消失点を置く',()=>{
    if(!source?.valid()||settings.mode!=='projective')throw Error('遠近・四隅モードで変形を始めてください。');
    stopGesture();ownedGesture=source.drawing;
    status.textContent='上辺の奥に、線が集まる位置をタップしてください。';
    ownedGesture.setCanvasEditGesture({path:false,width:2,color:'#ffb742',complete:points=>{
      stopGesture();editingHandles=true;
      try{if(points[0]&&settings.quadrilateral)setCorners(cornersTowardVanishingPoint(settings.quadrilateral.corners,points[0]));}
      catch(error){status.textContent=error instanceof Error?error.message:String(error);}
      refreshHandles();
    }});
  });
  const bakeButton=button('適用済みの変形を画像に焼き込む',async()=>{
    await bake();status.textContent='変形を画像に焼き込みました。直前のUndoで編集できる状態に戻せます。';
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
    stopGesture();source=null;previewId++;previewAbort?.abort();
    preview.hidden=true;status.textContent=message;sync();
  }
  function change(next:Transform){
    if(!source||busy)return;
    const prior=settings;
    if(next.mode!==prior.mode){
      stopGesture();
      if(cornerMode(next.mode)){
        if(!next.quadrilateral||next.mode==='skew')next={...next,quadrilateral:{bounds:source.bounds,corners:rectCorners(source.bounds)}};
      }
      if(meshMode(next.mode)&&(!next.mesh||
        (next.mode==='mesh-grid'&&next.mesh.controls.kind!=='grid')||
        (next.mode==='cage'&&next.mesh.controls.kind!=='cage'))){
        next={...next,mesh:{bounds:source.bounds,controls:next.mode==='mesh-grid'?gridMesh(source.bounds):cageMesh(source.bounds)}};
      }
      editingHandles=usesHandles(next.mode);placingPoints=false;
    }
    undo.push(prior);redo=[];settings=next;sync();refreshHandles();
    if(next.mode==='liquify'&&ownedGesture&&prior.radius!==next.radius)armLiquify();
    void refreshPreview();
  }
  function sync(){
    const usingCorners=!!source&&cornerMode(settings.mode),liquify=!!source&&settings.mode==='liquify';
    liquifyFields.hidden=!liquify;liquifyFields.disabled=busy;
    const mesh=source&&meshMode(settings.mode)?settings.mesh?.controls:undefined;
    meshFields.hidden=!mesh;meshFields.disabled=busy;
    if(mesh){
      const before=meshIndex();
      pointSelect.replaceChildren(...mesh.points.map((point,index)=>new Option(
        '点 '+(index+1)+(point.fixed?'（固定）':''),String(index))));
      pointSelect.value=String(Math.max(0,Math.min(mesh.points.length-1,before||0)));
      pointMode.textContent=placingPoints?'点を動かす':'点の配置・固定';
      colsLabel.hidden=rowsLabel.hidden=mesh.kind!=='grid'||!placingPoints;
      if(mesh.kind==='grid'){gridCols.value=String(mesh.columns);gridRows.value=String(mesh.rows);}
      addPoint.hidden=removePoint.hidden=mesh.kind!=='cage'||!placingPoints;
      addPoint.disabled=mesh.points.length>=36;
      selectMeshPoint();
    }
    cornerFields.hidden=!usingCorners;
    for(let i=0;i<pointInputs.length;i++){
      const point=settings.quadrilateral?.corners[Math.floor(i/2)];
      pointInputs[i]!.value=point?String(Math.round((i%2?point.y:point.x)*100)/100):'';
      pointInputs[i]!.disabled=busy;
    }
    for(const [key,input] of inputs){
      input.value=String(settings[key]);
      input.disabled=!source||busy;
      if(input.parentElement)input.parentElement.hidden=
        ((usingCorners||!!mesh)&&key!=='mode'&&key!=='interpolation')||
        (liquify&&!['mode','interpolation','radius','strength'].includes(key));
    }
    start.disabled=busy||!!source;target.disabled=busy||!!source;cancel.disabled=!source||busy;
    apply.disabled=!source||busy;back.disabled=!source||busy||!undo.length;forward.disabled=!source||busy||!redo.length;
    direct.disabled=!source||busy;direct.textContent=liquify?'キャンバスでゆがみブラシを使う':'絵の上で位置を指定';
    flipX.hidden=flipY.hidden=usingCorners||!!mesh||liquify;
    flipX.disabled=flipY.disabled=!source||busy;
    vanishing.hidden=settings.mode!=='projective'||!source;vanishing.disabled=busy;
    bakeButton.disabled=!!source||busy;
    comparison.hidden=!source;
  }
  async function refreshPreview(){
    const current=source,id=++previewId;
    if(!current)return;
    previewAbort?.abort();const controller=new AbortController();previewAbort=controller;
    try{
      const scale=Math.min(1,280/Math.max(current.width,current.height));
      const outputWidth=Math.max(1,Math.round(current.width*scale)),outputHeight=Math.max(1,Math.round(current.height*scale));
      const pixels=await runTransform({pixels:current.pixels,width:current.width,height:current.height,
        settings:compare.checked?{...initialTransform,cx:settings.cx,cy:settings.cy}:settings,
        selection:current.selection,outputWidth,outputHeight,showProtection:!compare.checked&&protectionVisible.checked},controller.signal);
      if(id!==previewId)return;
      preview.width=outputWidth;preview.height=outputHeight;
      preview.getContext('2d')?.putImageData(new ImageData(pixels,outputWidth,outputHeight),0,0);
      preview.hidden=false;
    }catch(error){if(id===previewId&&!controller.signal.aborted){preview.hidden=true;status.textContent=error instanceof Error?error.message:String(error);}}
  }
  compare.onchange=()=>void refreshPreview();
  tools.append(start,direct,vanishing,flipX,flipY,back,forward,apply,cancel,bakeButton);
  panel.append(summary,target,status,tools,controls,cornerFields,meshFields,liquifyFields,comparison,preview);host.append(panel);
  panel.ontoggle=()=>{if(!panel.open&&!busy&&source)reset('候補を取り消しました。');};
  sync();
}
