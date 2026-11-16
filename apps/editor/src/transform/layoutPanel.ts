import type {LayerId} from '@illustro/core';
import {button,selectField} from '../artwork/tools';
import {alignLayers,type Arrangement,type LayoutItem,type LayoutMove} from './layout';

export type LayoutSource=Readonly<{
  items:readonly LayoutItem[];reference:LayoutItem;width:number;height:number;valid:()=>boolean;
  apply:(moves:readonly LayoutMove[])=>Promise<void>;
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
  const start=button('複数選択したレイヤーを確認',async()=>{
    source=await capture();
    const refs=source.items.some(item=>item.id===source!.reference.id)?source.items:[source.reference,...source.items];
    reference.replaceChildren(...refs.map(item=>new Option(item.name,item.id)));
    reference.value=source.reference.id;render();
  },status);
  const apply=button('この位置に適用',async()=>{
    if(!source?.valid())throw Error('作品が変わりました。レイヤーを選び直してください。');
    await source.apply(moves);source=null;moves=[];preview.hidden=true;status.textContent='整列を反映しました。一回のUndoで元の位置に戻せます。';
  },status);
  const cancel=button('候補を取り消す',()=>{source=null;moves=[];preview.hidden=true;apply.disabled=true;status.textContent='整列を取り消しました。';},status);
  controls.onchange=()=>{try{render();}catch(error){moves=[];apply.disabled=true;status.textContent=error instanceof Error?error.message:String(error);}};
  apply.disabled=true;
  panel.ontoggle=()=>{if(!panel.open){source=null;moves=[];preview.hidden=true;apply.disabled=true;}};
  panel.append(heading,controls,start,apply,cancel,preview,status);host.append(panel);
}
