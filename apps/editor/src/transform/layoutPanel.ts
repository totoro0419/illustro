import type {LayerId} from '@illustro/core';
import {button,selectField} from '../artwork/tools';
import {alignLayers,type Arrangement,type LayoutItem,type LayoutMove} from './layout';
import {groupTransformPlan,type GroupTransformOptions} from './groupTransform';

export type LayoutSource=Readonly<{
  items:readonly LayoutItem[];reference:LayoutItem;width:number;height:number;valid:()=>boolean;
  apply:(moves:readonly LayoutMove[])=>Promise<void>;
  applyGroup?:(options:GroupTransformOptions)=>Promise<void>;
}>;
export function installLayoutPanel(host:HTMLElement,capture:()=>Promise<LayoutSource>){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const heading=document.createElement('summary');heading.textContent='レイヤーの整列・均等配置';
  const controls=document.createElement('div');controls.className='c06-clipboard-grid';
  const mode=selectField(controls,'並べ方',[
    ['left','左端をそろえる'],['center-x','横の中心をそろえる'],['right','右端をそろえる'],
    ['top','上端をそろえる'],['center-y','縦の中心をそろえる'],['bottom','下端をそろえる'],
    ['spread-x','横に等間隔'],['spread-y','縦に等間隔']
  ] as const);
  const reference=selectField(controls,'動かさない基準',[]);
  const status=document.createElement('output');status.setAttribute('role','status');
  const preview=document.createElement('canvas');preview.hidden=true;preview.style.maxWidth='100%';
  const groupFields=document.createElement('fieldset'),groupLegend=document.createElement('legend');
  groupLegend.textContent='選択したレイヤーをまとめて変形';groupFields.append(groupLegend);
  const groupControls=document.createElement('div');groupControls.className='c06-clipboard-grid';
  const numeric=(label:string,initial:number,min:number,max:number,step:number)=>{
    const field=document.createElement('label'),input=document.createElement('input');
    input.type='number';input.value=String(initial);input.min=String(min);input.max=String(max);input.step=String(step);
    field.append(label,input);groupControls.append(field);return input;
  };
  const dx=numeric('横へ移動（px）',0,-8192,8192,1),dy=numeric('縦へ移動（px）',0,-8192,8192,1);
  const sx=numeric('横の倍率',1,-16,16,.01),sy=numeric('縦の倍率',1,-16,16,.01);
  const angle=numeric('回転角度（°）',0,-360,360,.5);
  const interp=document.createElement('select');
  for(const [key,label] of [['bilinear','なめらか'],['nearest','ドット絵'],['area','縮小向け']] as const)
    interp.add(new Option(label,key));
  const interpolation=document.createElement('label');interpolation.append('画像の補間方法',interp);
  groupControls.append(interpolation);
  const groupPreview=document.createElement('canvas');groupPreview.hidden=true;
  groupPreview.style.maxWidth='100%';
  const groupHelp=document.createElement('p');
  groupHelp.textContent='1回の操作でまとめて移動・拡縮・回転します。破線は変更前、実線は変更後の位置です。文字・画像リンク・編集中の変形があるレイヤーには適用できません。';
  groupFields.append(groupControls,groupHelp);
  preview.setAttribute('aria-label','青は移動先、破線は現位置');
  let source:LayoutSource|null=null,moves:readonly LayoutMove[]=[];
  function render(){
    if(!source?.valid()){moves=[];preview.hidden=true;apply.disabled=true;return;}
    const active=source.items.find(item=>item.id===reference.value as LayerId)??source.reference;
    moves=alignLayers(source.items,active,mode.value as Arrangement);
    const ratio=Math.min(1,380/Math.max(source.width,source.height));
    preview.width=Math.max(1,Math.round(source.width*ratio));preview.height=Math.max(1,Math.round(source.height*ratio));
    const ctx=preview.getContext('2d');
    if(ctx){
      ctx.scale(ratio,ratio);ctx.fillStyle='#252a32';ctx.fillRect(0,0,source.width,source.height);
      ctx.lineWidth=1.5/ratio;
      for(const {item,dx,dy} of moves){
        const {x,y,width,height}=item.bounds;
        ctx.setLineDash([4/ratio,3/ratio]);ctx.strokeStyle='#a0a8b6';ctx.strokeRect(x,y,width,height);
        ctx.setLineDash([]);ctx.strokeStyle=item.id===active.id?'#ffb64e':'#66c8ee';ctx.strokeRect(x+dx,y+dy,width,height);
      }
    }
    preview.hidden=false;apply.disabled=!moves.some(move=>Math.abs(move.dx)+Math.abs(move.dy)>.01);
    status.textContent=(mode.value.startsWith('spread')?'両端を固定。':'基準は「'+active.name+'」。')+'破線は現在の位置、実線は移動先です。';
  }
  const groupOptions=():GroupTransformOptions=>({
    dx:dx.valueAsNumber,dy:dy.valueAsNumber,
    sx:sx.valueAsNumber,sy:sy.valueAsNumber,angle:angle.valueAsNumber,
    interpolation:interp.value as GroupTransformOptions['interpolation']
  });
  const groupShow=button('まとめて変形する位置を確認',()=>{
    if(!source?.valid()||!source.applyGroup)throw Error('複数レイヤーを確認してください。');
    const planned=groupTransformPlan(source.items,source.width,source.height,groupOptions());
    const ratio=Math.min(1,380/Math.max(source.width,source.height));
    groupPreview.width=Math.max(1,Math.round(source.width*ratio));
    groupPreview.height=Math.max(1,Math.round(source.height*ratio));
    const ctx=groupPreview.getContext('2d');
    if(ctx){
      ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.fillStyle='#222934';ctx.fillRect(0,0,source.width,source.height);
      ctx.lineWidth=1.5/ratio;
      planned.outlines.forEach((line,index)=>{
        ctx.strokeStyle='#aaaeb8';ctx.setLineDash([4/ratio,3/ratio]);
        const {x,y,width,height}=line.before;ctx.strokeRect(x,y,width,height);
        ctx.setLineDash([]);ctx.strokeStyle=index%2?'#ffbd66':'#63d3f4';
        ctx.beginPath();line.after.forEach((pt,i)=>{
          if(!i)ctx.moveTo(pt.x,pt.y);else ctx.lineTo(pt.x,pt.y);
        });ctx.closePath();ctx.stroke();
      });
    }
    groupPreview.hidden=false;
    status.textContent='破線が現在の範囲、実線が変形後の範囲です。複数レイヤーを統合せず、一回の操作で確定します。';
  },status);
  const groupApply=button('選択したレイヤーをまとめて変形する',async()=>{
    if(!source?.valid()||!source.applyGroup)throw Error('複数レイヤーを確認してください。');
    groupTransformPlan(source.items,source.width,source.height,groupOptions());
    await source.applyGroup(groupOptions());
    source=null;moves=[];preview.hidden=true;groupPreview.hidden=true;
    status.textContent='複数レイヤーの変形を反映しました。1回のUndoでまとめて元へ戻せます。';
  },status);
  groupFields.append(groupShow,groupApply,groupPreview);
  const start=button('複数選択したレイヤーを確認',async()=>{
    source=await capture();
    const refs=source.items.some(item=>item.id===source!.reference.id)?source.items:[source.reference,...source.items];
    reference.replaceChildren(...refs.map(item=>new Option(item.name,item.id)));
    reference.value=source.reference.id;groupPreview.hidden=true;render();
  },status);
  const apply=button('この位置に適用',async()=>{
    if(!source?.valid())throw Error('作品が変わりました。レイヤーを選び直してください。');
    await source.apply(moves);source=null;moves=[];preview.hidden=true;status.textContent='整列を反映しました。一回のUndoで元の位置に戻せます。';
  },status);
  const cancel=button('候補を取り消す',()=>{source=null;moves=[];preview.hidden=true;apply.disabled=true;status.textContent='整列を取り消しました。';},status);
  controls.onchange=()=>{try{render();}catch(error){moves=[];apply.disabled=true;status.textContent=error instanceof Error?error.message:String(error);}};
  apply.disabled=true;
  panel.ontoggle=()=>{if(!panel.open){source=null;moves=[];preview.hidden=true;groupPreview.hidden=true;apply.disabled=true;}};
  panel.append(heading,controls,start,apply,cancel,preview,groupFields,status);host.append(panel);
}
