import {button,labelledField,locate,numberField,selectField,type ArtworkActions} from './tools';
import {normalizeGuideSettings,type GuideSettings} from '../strokeGuide';

const STORAGE='illustro.ruler-presets.v1';
export function installRulerPanel(host:HTMLElement,api:ArtworkActions,apply:(guide:GuideSettings)=>void){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const heading=document.createElement('summary');heading.textContent='定規・ガイド';
  const fields=document.createElement('div');fields.className='c06-clipboard-grid';
  const status=document.createElement('output');status.setAttribute('role','status');
  const family=selectField(fields,'定規の種類',[
    ['straight','直線'],['parallel','平行線'],['circle','円'],['ellipse','楕円'],
    ['grid','格子'],['isometric','等角図'],['perspective','一点透視']
  ] as const);
  const enabled=document.createElement('input');enabled.type='checkbox';labelledField(fields,'定規を使う',enabled);
  const angle=numberField(fields,'角度（°）',0,-360,360);
  const strength=numberField(fields,'吸着の強さ（%）',100,0,100);
  const x=numberField(fields,'中心・消失点 X',0,-16384,16384),y=numberField(fields,'中心・消失点 Y',0,-16384,16384);
  const rx=numberField(fields,'横の半径（px）',120,1,8192),ry=numberField(fields,'縦の半径（px）',72,1,8192);
  const step=numberField(fields,'平行線の間隔（px）',32,1,4096);
  const erase=document.createElement('input');erase.type='checkbox';labelledField(fields,'消しゴムにも使う',erase);
  const name=document.createElement('input');name.type='text';name.maxLength=50;labelledField(fields,'保存する名前',name);
  const preset=selectField(fields,'保存済みの定規',[]);
  let saved:Record<string,Partial<GuideSettings>>={};
  try{const data=JSON.parse(localStorage.getItem(STORAGE)??'{}');if(data&&typeof data==='object')saved=data;}catch{}
  const settings=()=>normalizeGuideSettings({
    enabled:enabled.checked,angle:angle.valueAsNumber,strength:strength.valueAsNumber/100,applyEraser:erase.checked,
    kind:family.value as NonNullable<GuideSettings['kind']>,x:x.valueAsNumber,y:y.valueAsNumber,rx:rx.valueAsNumber,
    ry:ry.valueAsNumber,step:step.valueAsNumber
  });
  const reflect=(guide:GuideSettings)=>{
    family.value=guide.kind??'straight';enabled.checked=guide.enabled;angle.value=String(guide.angle);
    strength.value=String(guide.strength*100);erase.checked=guide.applyEraser;
    x.value=String(guide.x??0);y.value=String(guide.y??0);rx.value=String(guide.rx??120);
    ry.value=String(guide.ry??72);step.value=String(guide.step??32);
    apply(guide);
  };
  function list(){preset.replaceChildren(...Object.keys(saved).sort().map(item=>new Option(item,item)));}
  fields.addEventListener('change',event=>{if(event.target!==preset&&event.target!==name)apply(settings());});
  panel.append(heading,fields,
    button('絵の上で定規を置く',()=>{
      const current=api.context();
      if(!current)throw Error('作品を開いてください。');
      status.textContent='中心をタップするか、定規の方向へドラッグしてください。';
      locate(current.drawing,points=>{
        const start=points[0]!,end=points.at(-1)!;
        x.value=String(Math.round(start.x));y.value=String(Math.round(start.y));
        const dx=end.x-start.x,dy=end.y-start.y;
        if(Math.hypot(dx,dy)>1){
          angle.value=String(Math.round(Math.atan2(dy,dx)*180/Math.PI));rx.value=String(Math.round(Math.hypot(dx,dy)));
          ry.value=String(Math.max(1,Math.round(Math.abs(dy))));
        }
        enabled.checked=true;apply(settings());status.textContent='定規を配置しました。Shiftを押しながら描くと一時的に吸着を解除できます。';
      });
    },status),
    button('定規を保存',()=>{
      const label=name.value.trim();
      if(!label)throw Error('定規の名前を入力してください。');
      if(Object.hasOwn(saved,label)&&!confirm(label+'を上書きしますか？'))return;
      saved={...saved,[label]:settings()};localStorage.setItem(STORAGE,JSON.stringify(saved));list();preset.value=label;
      status.textContent='定規を保存しました。別作品でも読み込めます。';
    },status),
    button('選んだ定規を読み込む',()=>{
      if(!Object.hasOwn(saved,preset.value))throw Error('先に定規を保存してください。');
      reflect(normalizeGuideSettings(saved[preset.value]!));
      status.textContent='定規の座標と方向を読み込みました。';
    },status),status
  );
  list();host.append(panel);
}
