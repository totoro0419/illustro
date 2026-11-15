import {normalizeSymmetry,type SymmetrySettings} from '../strokeSymmetry';
import {button,labelledField,locate,numberField,selectField,type ArtworkActions} from './tools';

export function installSymmetryPanel(host:HTMLElement,api:ArtworkActions,apply:(settings:SymmetrySettings)=>void){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const heading=document.createElement('summary');heading.textContent='対称描画';
  const rows=document.createElement('div');rows.className='c06-clipboard-grid';
  const status=document.createElement('output');status.setAttribute('role','status');
  const kind=selectField(rows,'反映方法',[['off','使わない'],['mirror','鏡写し'],['radial','放射'],['kaleidoscope','万華鏡']] as const);
  const x=numberField(rows,'中心 X（px）',0,-16384,16384,.5),y=numberField(rows,'中心 Y（px）',0,-16384,16384,.5);
  const angle=numberField(rows,'基準の角度（°）',0,-360,360,.5),count=numberField(rows,'分割数',4,2,12);
  const erase=document.createElement('input');erase.type='checkbox';labelledField(rows,'消しゴムにも使う',erase);
  const confirm=()=>{
    const value=normalizeSymmetry({mode:kind.value as SymmetrySettings['mode'],x:x.valueAsNumber,y:y.valueAsNumber,
      angle:angle.valueAsNumber,count:count.valueAsNumber,erase:erase.checked});
    count.disabled=value.mode==='mirror'||value.mode==='off';
    apply(value);
  };
  rows.addEventListener('change',confirm);
  panel.append(heading,rows,button('キャンバスで軸を置く',()=>{
    const current=api.context();
    if(!current)throw Error('作品を開いてください。');
    status.textContent='中心をタップするか、軸の向きへドラッグします。';
    locate(current.drawing,points=>{
      const start=points[0]!,end=points.at(-1)!;
      x.value=String(Math.round(start.x));y.value=String(Math.round(start.y));
      if(Math.hypot(end.x-start.x,end.y-start.y)>1)
        angle.value=String(Math.round(Math.atan2(end.y-start.y,end.x-start.x)*180/Math.PI));
      if(kind.value==='off')kind.value='mirror';
      confirm();status.textContent='次の一筆から反映します。Shiftを押して描き始めると、その一筆だけ解除できます。';
    });
  },status),status);
  host.append(panel);
  return {restore(settings:SymmetrySettings){
    kind.value=settings.mode;x.value=String(settings.x);y.value=String(settings.y);angle.value=String(settings.angle);
    count.value=String(settings.count);count.disabled=settings.mode==='mirror'||settings.mode==='off';erase.checked=settings.erase;
  }};
}
