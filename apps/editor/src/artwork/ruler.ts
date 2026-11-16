import {validateArtworkGuides,type ArtworkGuide,type GuidePoint} from '@illustro/core';
import type {BrushSurface} from '../brushSurface';
import {button,labelledField,locate,numberField,selectField,type ArtworkActions} from './tools';

const kinds:readonly [ArtworkGuide['kind'],string][]=[
  ['straight','直線'],['parallel','平行線'],['circle','円'],['ellipse','楕円'],
  ['grid','格子'],['isometric','等角図'],['perspective','一点透視'],
  ['perspective2','二点透視'],['perspective3','三点透視']
];

export function installRulerPanel(host:HTMLElement,api:ArtworkActions,store:Readonly<{
  read:()=>readonly ArtworkGuide[];
  save:(guides:readonly ArtworkGuide[],label:string)=>Promise<void>;
}>){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const heading=document.createElement('summary');heading.textContent='定規・ガイド';
  const fields=document.createElement('div');fields.className='c06-clipboard-grid';
  const output=document.createElement('output');output.setAttribute('role','status');
  const target=document.createElement('output');target.setAttribute('aria-live','polite');
  const selected=selectField(fields,'作品の定規',[] as [string,string][]);
  const name=document.createElement('input');name.type='text';name.maxLength=80;labelledField(fields,'名前',name);
  const kind=selectField(fields,'種類',kinds);
  const check=(label:string,checked:boolean)=>{
    const field=document.createElement('input');field.type='checkbox';field.checked=checked;labelledField(fields,label,field);
    return field;
  };
  const enabled=check('描くときに使う',true),locked=check('位置をロック',false);
  const visible=check('定規を表示',true),eraser=check('消しゴムにも使う',false);
  const preferred=check('選んだ定規を優先',false);
  const angle=numberField(fields,'角度（°）',0,-360,360,.1);
  const rx=numberField(fields,'横の半径（px）',120,1,8192),ry=numberField(fields,'縦の半径（px）',72,1,8192);
  const spacing=numberField(fields,'線の間隔（px）',32,1,4096);
  const strength=numberField(fields,'吸着の強さ（%）',100,0,100);
  const range=numberField(fields,'吸着の範囲（px）',24,0,1024);
  const axis=selectField(fields,'透視で使う方向',[['0','第1消失点'],['1','第2消失点'],['2','第3消失点']] as const);
  const position=['中心・第1消失点','第2消失点','第3消失点'].map((label,index)=>{
    const x=numberField(fields,label+' X',index*240,-100000,100000,.1);
    const y=numberField(fields,label+' Y',index===2?320:0,-100000,100000,.1);
    return {x,y};
  });
  let last=store.read(),drawing:BrushSurface|undefined;
  let draftId=crypto.randomUUID();
  const current=()=>last.find(item=>item.id===selected.value);
  const px=(value:number)=>Math.round(value*10)/10;
  const setPosition=(index:number,point:GuidePoint)=>{
    const row=position[index]!;
    row.x.value=String(px(point.x));row.y.value=String(px(point.y));
  };
  const axisCount=()=>kind.value==='perspective3'?3:kind.value==='perspective2'?2:1;
  const defaultGuide=():ArtworkGuide=>{
    const {width=480,height=320}=api.context()??{};
    return {id:draftId,name:'定規 '+(last.length+1),kind:'straight',origin:{x:width/2,y:height/2},
      vanishing:[{x:width*1.5,y:height/2},{x:width/2,y:-height}],activeAxis:0,angle:0,
      rx:120,ry:72,spacing:32,strength:1,range:24,enabled:true,locked:false,applyEraser:false};
  };
  function preview(){
    const point=(index:number)=>({x:position[index]!.x.valueAsNumber,y:position[index]!.y.valueAsNumber});
    const original=current();
    const edit:ArtworkGuide={
      id:original?.id??draftId,name:name.value.trim()||defaultGuide().name,
      kind:kind.value as ArtworkGuide['kind'],origin:point(0),vanishing:[point(1),point(2)],activeAxis:Math.min(+axis.value,axisCount()-1),
      angle:angle.valueAsNumber,rx:rx.valueAsNumber,ry:ry.valueAsNumber,spacing:spacing.valueAsNumber,
      strength:strength.valueAsNumber/100,range:range.valueAsNumber,enabled:enabled.checked,locked:locked.checked,applyEraser:eraser.checked
    };
    return validateArtworkGuides([...last.filter(item=>item.id!==edit.id),edit]);
  }
  function selectGuide(){
    const item=current()??defaultGuide();
    name.value=item.name;kind.value=item.kind;enabled.checked=item.enabled;locked.checked=item.locked;eraser.checked=item.applyEraser;
    angle.value=String(item.angle);rx.value=String(item.rx);ry.value=String(item.ry);spacing.value=String(item.spacing);
    strength.value=String(item.strength*100);range.value=String(item.range);axis.value=String(item.activeAxis);
    [item.origin,...item.vanishing].forEach((point,index)=>setPosition(index,point));
    drawing?.setCanvasEditGesture(null);drawing?.previewArtworkGuides(null);drawing?.setPreferredGuide(preferred.checked?current()?.id??null:null);
    updateFields();
  }
  const pick=button('キャンバスで配置',()=>{
    const ctx=api.context();
    if(!ctx)throw Error('作品を開いてください。');
    if(locked.checked)throw Error('位置のロックを解除してください。');
    const index=kind.value.startsWith('perspective')?Math.min(+axis.value,axisCount()-1):0;
    output.textContent=index>0||kind.value.startsWith('perspective')?'消失点をタップしてください。画面外へは座標を入力できます。':'中心をタップするか、方向・大きさをドラッグしてください。';
    locate(ctx.drawing,points=>{
      const start=points[0]!,end=points.at(-1)!;setPosition(index,start);
      const dx=end.x-start.x,dy=end.y-start.y;
      if(!kind.value.startsWith('perspective')&&Math.hypot(dx,dy)>1){
        angle.value=String(px(Math.atan2(dy,dx)*180/Math.PI));rx.value=String(Math.min(8192,px(Math.hypot(dx,dy))));
        if(kind.value==='ellipse'&&Math.abs(dy)>1)ry.value=String(Math.min(8192,px(Math.abs(dy))));
      }
      ctx.drawing.previewArtworkGuides(preview());
      output.textContent='定規の位置を確認してから確定できます。';
    });
  },output);
  function moveHandles(){
    const ctx=api.context();
    if(!ctx||locked.checked)throw Error('作品を開き、定規の位置のロックを解除してください。');
    const item=preview().at(-1)!;
    const angleRad=item.angle*Math.PI/180,ellipse=item.kind==='ellipse';
    const handleLength=item.kind==='circle'||ellipse?item.rx:72;
    const radial={x:item.origin.x+Math.cos(angleRad)*handleLength,y:item.origin.y+Math.sin(angleRad)*handleLength};
    const perpendicular={x:item.origin.x-Math.sin(angleRad)*item.ry,y:item.origin.y+Math.cos(angleRad)*item.ry};
    const perspective=item.kind.startsWith('perspective');
    const points=perspective?[item.origin,...item.vanishing].slice(0,axisCount()):ellipse?[item.origin,radial,perpendicular]:[item.origin,radial];
    ctx.drawing.setCanvasEditGesture({path:false,width:2,color:'#ffb742',complete:()=>{},
      pointEdit:{points,closed:false,commit:(index,point)=>{
        if(index===0||perspective)setPosition(index,point);
        else{
          const dx=point.x-item.origin.x,dy=point.y-item.origin.y,distance=Math.hypot(dx,dy);
          if(distance>1){
            if(index===1){angle.value=String(px(Math.atan2(dy,dx)*180/Math.PI));rx.value=String(Math.min(8192,px(distance)));}
            else ry.value=String(Math.min(8192,px(distance)));
          }
        }
        ctx.drawing.previewArtworkGuides(preview());moveHandles();
      }}});
    output.textContent='丸いハンドルを動かし、位置を確認してから確定してください。';
  }
  function updateFields(){
    for(const [index,row] of position.entries()){
      row.x.parentElement!.hidden=index>=axisCount();row.y.parentElement!.hidden=index>=axisCount();
      row.x.disabled=row.y.disabled=locked.checked;
    }
    for(const [index,option] of [...axis.options].entries())option.disabled=index>=axisCount();
    if(+axis.value>=axisCount())axis.value='0';
    axis.parentElement!.hidden=axisCount()===1;
    const round=kind.value==='circle'||kind.value==='ellipse';
    rx.parentElement!.hidden=!round;ry.parentElement!.hidden=kind.value!=='ellipse';
    spacing.parentElement!.hidden=!['parallel','grid','isometric'].includes(kind.value);
    angle.parentElement!.hidden=kind.value.startsWith('perspective')||kind.value==='circle';
    pick.disabled=locked.checked;
    angle.disabled=rx.disabled=ry.disabled=spacing.disabled=locked.checked;
  }
  function refresh(){
    const latest=store.read(),surface=api.context()?.drawing;
    if(surface&&drawing!==surface){
      drawing=surface;
      drawing.onArtworkGuideTarget=label=>{target.textContent=label;};
      drawing.showArtworkGuideLines(visible.checked);
      drawing.setPreferredGuide(preferred.checked?current()?.id??null:null);
    }
    if(latest===last&&selected.options.length)return;
    const prior=selected.value;
    last=latest;
    selected.replaceChildren(new Option('新しい定規',''),...last.map(item=>new Option(item.name,item.id)));
    selected.value=last.some(item=>item.id===prior)?prior:'';
    selectGuide();
  }
  selected.onchange=selectGuide;
  visible.onchange=()=>drawing?.showArtworkGuideLines(visible.checked);
  preferred.onchange=()=>drawing?.setPreferredGuide(preferred.checked?current()?.id??null:null);
  fields.addEventListener('change',event=>{
    if([selected,visible,preferred].some(field=>field===event.target))return;
    updateFields();
    try{drawing?.previewArtworkGuides(preview());}catch(error){output.textContent=(error as Error).message;}
  });
  panel.addEventListener('toggle',()=>{
    if(panel.open)refresh();else{drawing?.setCanvasEditGesture(null);drawing?.previewArtworkGuides(null);}
  });
  panel.append(heading,fields,pick,button('位置・向きのハンドルを動かす',moveHandles,output),
    button('定規を確定',async()=>{
      const id=current()?.id??draftId;
      await store.save(preview(),'定規・ガイドを配置');
      draftId=crypto.randomUUID();refresh();selected.value=id;selectGuide();output.textContent='作品に定規を保存しました。';
    },output),
    button('配置を取り消す',()=>{drawing?.setCanvasEditGesture(null);selectGuide();},output),
    button('定規を削除',async()=>{
      const id=current()?.id;
      if(!id)throw Error('削除する定規を選んでください。');
      await store.save(last.filter(item=>item.id!==id),'定規・ガイドを削除');
      refresh();
    },output),
    button('次の一筆だけ吸着を解除',()=>{
      drawing?.bypassNextGuide();target.textContent='次の一筆は吸着を解除します。';
    },output),
    target,output
  );
  host.append(panel);refresh();
  return {refresh};
}
