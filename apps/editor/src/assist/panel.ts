import {readReferencePalette} from './referencePalette';
import type {SelectionExample} from './exampleSelection';
import type {LayerId} from '@illustro/core';
import {button,labelledField,numberField,paintPreview,selectField} from '../artwork/tools';
import {resizeImagePixels} from '../canvasGeometry';
import {combineSelection,type CombineMode,type MaskData} from '../selection/mask';
import {type AssistRequest,type AssistResult,type ColorStyle,type RGB,type Speck} from './analyze';

type Kind=AssistRequest['kind'];
type NameProposal=Readonly<{id:LayerId;current:string;next:string}>;
type GroupProposal=Readonly<{name:string;layers:readonly {id:LayerId;name:string}[]}>;
type AssistFrame=Readonly<{
  width:number;height:number;source:Uint8Array;selection:MaskData|null;name:string;
  palettes:readonly {name:string;colors:readonly RGB[]}[];names:readonly NameProposal[];writable:boolean;
  organize:readonly GroupProposal[]; adoptGroup:(proposal:GroupProposal)=>Promise<void>;
  valid:()=>boolean;select:(mask:MaskData)=>void;
  adoptColor:(pixels:Uint8ClampedArray)=>Promise<void>;
  adoptRepair:(removed:Speck[],names:NameProposal[])=>Promise<void>;
}>;
type RequestSettings=AssistRequest extends infer T?T extends AssistRequest?Omit<T,'width'|'height'|'source'|'coverage'>:never:never;

export function installImageAssist(host:HTMLElement,capture:(kind:Kind)=>Promise<AssistFrame>){
  const open=document.createElement('button');open.type='button';open.textContent='画像から候補を出す';host.append(open);
  const show=()=>{
    const dialog=document.createElement('dialog');dialog.className='export-dialog';dialog.setAttribute('aria-label','画像から候補を出す');
    const panel=document.createElement('section');panel.className='c06-clipboard-grid';
    const title=document.createElement('h2');title.textContent='画像から候補を出す';
    const intro=document.createElement('p');intro.textContent='色や透明な部分をこの端末だけで調べます。案を選ぶまでは作品に反映されません。';
    const activeLayer=document.createElement('p');panel.append(title,intro,activeLayer);
    const mode=selectField(panel,'補助の内容',[['area','範囲の候補'],['color','パレットから色の候補'],['specks','ごみ取り・名前の候補']]);
    const target=selectField(panel,'解析する範囲',[['whole','対象全体'],['selected','現在の選択範囲内']]);
    const area=document.createElement('div'),color=document.createElement('div'),repair=document.createElement('div');
    const tolerance=numberField(area,'色を拾う幅',32,1,160),combine=selectField(area,'選択への反映',[
      ['replace','置き換える'],['add','追加する'],['subtract','引く']
    ]);
    const palette=selectField(color,'使うパレット',[] as [string,string][]);
    const reference=document.createElement('input');reference.type='file';reference.accept='image/png,image/jpeg,image/webp,image/avif';
    labelledField(color,'資料画像から色を取り出す（任意）',reference);
    const chips=document.createElement('div');chips.setAttribute('aria-label','使用するパレットの色');chips.className='box-actions';
    color.append(chips);
    const strength=numberField(color,'強さ（%）',70,1,100);
    const size=numberField(repair,'ごみ候補の最大の画素数',6,1,48);
    const cleanup=selectField(repair,'ごみの背景',[['transparent','透明'],['opaque','ほぼ均一な色の背景']]);
    const names=document.createElement('div'),spots=document.createElement('div'),groups=document.createElement('div');repair.append(spots,names,groups);
    const images=document.createElement('div');images.className='assist-previews';
    const before=document.createElement('canvas'),after=document.createElement('canvas');
    before.hidden=after.hidden=true;
    before.setAttribute('aria-label','解析前。範囲を選ぶ起点を指定できます。');
    after.setAttribute('aria-label','採用前の候補。');
    function figure(canvas:HTMLCanvasElement,label:string){
      const figure=document.createElement('figure'),caption=document.createElement('figcaption');
      caption.textContent=label;figure.append(canvas,caption);return figure;
    }
    images.append(figure(before,'元の画像'),figure(after,'候補'));
    const areaMode=selectField(area,'範囲の出し方',[['connected','似た色でつながる範囲'],['examples','残す部分と外す部分の例から学習']]);
    const x=numberField(area,'起点・例の位置 X',0,0,8191),y=numberField(area,'起点・例の位置 Y',0,0,8191);
    const exampleOptions=document.createElement('div');exampleOptions.className='c06-clipboard-grid';exampleOptions.hidden=true;
    const sampleType=selectField(exampleOptions,'次に追加する例',[['include','残す'],['exclude','外す']]);
    const confidence=numberField(exampleOptions,'残す判断の厳しさ（%）',50,0,100);
    const exampleCount=document.createElement('output');exampleCount.setAttribute('role','status');
    area.append(exampleOptions);
    const status=document.createElement('output');status.setAttribute('role','status');
    const variants=document.createElement('div');variants.className='box-actions';color.append(variants);
    const gallery=document.createElement('div');gallery.className='assist-previews';color.append(gallery);
    const styles=[['tone','明暗に合わせる'],['accent','中間色を強める'],['shadow','陰影を深める'],['light','光を強調する']] as const;
    let colorSession=0;
    panel.append(area,color,repair,images);
    let generation=0,frame:AssistFrame|null=null,result:AssistResult|null=null;
    let worker:Worker|null=null,stopJob:(()=>void)|null=null;
    let spotChecks:HTMLInputElement[]=[],nameChecks:HTMLInputElement[]=[];
    let examples:SelectionExample[]=[];
    let referenceSet:Awaited<ReturnType<typeof readReferencePalette>>|null=null;
    const available=()=>[...(frame?.palettes??[]),...(referenceSet?[referenceSet]:[])];
    function paletteChips(){
      chips.replaceChildren(...(available()[Number(palette.value)]?.colors??[]).slice(0,18).map(rgb=>{
        const color=document.createElement('span'),label='#'+rgb.map(c=>Math.round(c).toString(16).padStart(2,'0')).join('');
        color.style.cssText='display:inline-block;width:20px;height:20px;border:1px solid currentColor;background:'+label;
        color.title=label;color.setAttribute('aria-label',label);return color;
      }));
    }
    const learning=()=>areaMode.value==='examples';
    const current=()=>mode.value as Kind;
    const visible=(kind:Kind)=>{area.hidden=kind!=='area';color.hidden=kind!=='color';repair.hidden=kind!=='specks';};
    const cancelJob=()=>{worker?.terminate();worker=null;stopJob?.();stopJob=null;};
    const invalidate=()=>{generation++;cancelJob();result=null;after.hidden=true;spots.replaceChildren();spotChecks=[];apply.disabled=true;};

    function clearGallery(){colorSession++;gallery.replaceChildren();}
    function render(image:HTMLCanvasElement,data:Uint8ClampedArray<ArrayBuffer>,f:AssistFrame){
      const scale=Math.min(1,350/Math.max(f.width,f.height)),w=Math.max(1,Math.round(f.width*scale)),h=Math.max(1,Math.round(f.height*scale));
      const pixels=w===f.width&&h===f.height?data:new Uint8ClampedArray(resizeImagePixels(data,f.width,f.height,w,h,'auto'));
      paintPreview(image,pixels,w,h);
    }
    function drawExamples(){
      if(!frame||current()!=='area')return;
      const f=frame;render(before,new Uint8ClampedArray(f.source),f);
      exampleCount.textContent=examples.filter(p=>p.include).length+'個を残す例、'+examples.filter(p=>!p.include).length+'個を外す例に指定済み。';
      if(!learning())return;
      const context=before.getContext('2d');if(!context)return;
      for(const example of examples){
        const x=(example.x+.5)*before.width/f.width,y=(example.y+.5)*before.height/f.height;
        context.beginPath();context.arc(x,y,4,0,Math.PI*2);
        context.fillStyle=example.include?'#1eb992':'#e25a59';context.fill();
        context.strokeStyle='#fff';context.stroke();
      }
    }
    function addExample(){
      if(!frame?.valid())throw Error('解析する絵を読み込んでください。');
      const px=field(x),py=field(y),at=examples.findIndex(p=>p.x===px&&p.y===py);
      const value={x:px,y:py,include:sampleType.value==='include'};
      if(at>=0)examples[at]=value;
      else{
        if(examples.length>=16)throw Error('例は16箇所まで指定できます。');
        examples.push(value);
      }
      invalidate();drawExamples();
    }
    exampleOptions.append(button('入力した位置を例に追加',addExample,status),
      button('例を消す',()=>{examples=[];invalidate();drawExamples();},status),exampleCount);
    function paintResult(){
      const f=frame,r=result;if(!f||!r)return;
      const pixels=new Uint8ClampedArray(f.source);
      if(r.kind==='area'){
        for(let i=0;i<r.alpha.length;i++){
          const a=r.alpha[i]!/255*.55;if(!a)continue;
          const p=i*4;pixels[p]=pixels[p]!*(1-a)+30*a;pixels[p+1]=pixels[p+1]!*(1-a)+180*a;
          pixels[p+2]=pixels[p+2]!*(1-a)+255*a;pixels[p+3]=Math.max(pixels[p+3]!,255*a);
        }
      }else if(r.kind==='color'){
        for(let i=0;i<pixels.length;i+=4){
          const a=r.pixels[i+3]!/255,base=pixels[i+3]!/255*(1-a),out=a+base;
          if(!out)continue;
          for(let ch=0;ch<3;ch++)pixels[i+ch]=(pixels[i+ch]!*base+r.pixels[i+ch]!*a)/out;
          pixels[i+3]=out*255;
        }
      }
      if(r.kind==='specks')r.spots.forEach((spot,i)=>{
        if(spotChecks[i]?.checked)for(const pixel of spot.pixels)pixels.set(spot.fill??[0,0,0,0],pixel*4);
      });
      render(after,pixels,f);
      if(r.kind==='specks'){
        const context=after.getContext('2d');if(!context)return;
        context.strokeStyle='#ec6e21';context.lineWidth=1.5;
        for(const [i,spot] of r.spots.entries()){
          if(!spotChecks[i]?.checked)continue;
          const sx=(spot.x+.5)*after.width/f.width,sy=(spot.y+.5)*after.height/f.height;
          context.beginPath();context.arc(sx,sy,5,0,Math.PI*2);context.stroke();
        }
      }
    }
    function checks(host:HTMLElement,labels:readonly string[],update:()=>void){
      const inputs=labels.map(text=>{
        const field=document.createElement('input');field.type='checkbox';field.onchange=update;labelledField(host,text,field);return field;
      });return inputs;
    }
    function refreshApply(){
      apply.disabled=!frame||!frame.valid()||(
        current()==='specks'?!nameChecks.some(c=>c.checked)&&!spotChecks.some(c=>c.checked):
        !result||(result.kind!=='specks'&&result.count===0));
    }
    async function load(){
      invalidate();clearGallery();frame=null;before.hidden=true;examples=[];spotChecks=[];nameChecks=[];names.replaceChildren();groups.replaceChildren();
      const ticket=generation,kind=current();
      activeLayer.textContent='対象を読み込んでいます。';
      const snapshot=await capture(kind);
      if(!dialog.open||generation!==ticket)return;
      frame=snapshot;activeLayer.textContent=kind==='area'?'対象は表示中の絵です。':'対象は「'+snapshot.name+'」です。';
      target.querySelector<HTMLOptionElement>('option[value="selected"]')!.disabled=!snapshot.selection;
      if(!snapshot.selection)target.value='whole';
      x.max=String(snapshot.width-1);y.max=String(snapshot.height-1);
      x.value=String(Math.floor(snapshot.width/2));y.value=String(Math.floor(snapshot.height/2));
      palette.replaceChildren(...available().map((p,i)=>new Option(p.name,String(i))));paletteChips();
      nameChecks=checks(names,snapshot.names.map(n=>n.current+' → '+n.next),refreshApply);
      for(const proposal of snapshot.organize){
        const row=document.createElement('div'),members=document.createElement('p');
        members.textContent=proposal.layers.map(layer=>layer.name).join('、')+'（重なり順を保持）';
        row.append(members,button('「'+proposal.name+'」にまとめる',async()=>{
          await snapshot.adoptGroup(proposal);dialog.close();
        },status));
        groups.append(row);
      }
      analyze.disabled=kind!=='area'&&!snapshot.writable;
      for(const variant of Array.from(variants.querySelectorAll('button')))variant.disabled=!snapshot.writable||!snapshot.palettes.length;
      render(before,new Uint8ClampedArray(snapshot.source),snapshot);
      if(kind==='area'&&learning())drawExamples();
      status.textContent=kind==='area'?(learning()?'残す部分と外す部分の例を1箇所ずつ以上指定してください。':'画像をタップして起点を決め、候補を計算してください。'):
        !snapshot.writable?'ごみ取りや彩色には、編集可能な描画レイヤーを選んでください。':'候補を計算してください。';
    }
    function field(input:HTMLInputElement){
      if(!input.validity.valid||!input.value)throw Error('数値を指定範囲内で入力してください。');
      return input.valueAsNumber;
    }
    async function run(style:ColorStyle='tone'){
      invalidate();const f=frame;
      if(!f||!f.valid())throw Error('作品が変わりました。対象を読み込み直してください。');
      let settings:RequestSettings;
      const kind=current();
      if(kind==='area')settings={kind,x:field(x),y:field(y),tolerance:learning()?32:field(tolerance),
        ...(learning()?{examples:[...examples],confidence:field(confidence)}:{})};
      else if(kind==='color')settings={kind,style,strength:field(strength)/100,palette:available()[Number(palette.value)]?.colors??[]};
      else settings={kind,maxArea:field(size),background:cleanup.value==='opaque'};
      const source=f.source.slice(),coverage=target.value==='selected'?f.selection?.alpha.slice():undefined,ticket=generation;
      status.textContent='候補を計算しています。';
      const device=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});worker=device;
      const next=await new Promise<AssistResult|null>((resolve,reject)=>{
        stopJob=()=>resolve(null);
        device.onmessage=event=>event.data.error?reject(Error(event.data.error)):resolve(event.data.result as AssistResult);
        device.onerror=()=>reject(Error('画像解析をこの端末で開始できません。'));
        device.postMessage({...settings,width:f.width,height:f.height,source,...(coverage?{coverage}:{})},
          coverage?[source.buffer,coverage.buffer]:[source.buffer]);
      }).finally(()=>{if(worker===device){device.terminate();worker=null;stopJob=null;}});
      if(!next||generation!==ticket||!dialog.open)return;
      if(!f.valid())throw Error('候補の計算中に作品が変わりました。対象を読み込み直してください。');
      result=next;
      if(next.kind==='specks'){
        spotChecks=checks(spots,next.spots.map(spot=>'ごみ候補 '+spot.x+', '+spot.y+'（'+spot.pixels.length+'画素）'),()=>{
          paintResult();refreshApply();
        });
        status.textContent=next.spots.length+'箇所を検出しました。目印を確認して、取り除く項目を選んでください。'+
          (next.capped?' 先頭の32件を表示しています。':'');
      }else status.textContent=next.count?(next.kind==='area'?'青い部分が選択の候補です。':'明暗とパレットの色から作った案です。'):'該当する画素がありません。';
      paintResult();refreshApply();
      if(next.kind==='color'&&next.count){
        const label=styles.find(([id])=>id===style)![1];
        const card=button(label,()=>{colorSession++;return run(style);},status),thumb=document.createElement('canvas');
        thumb.width=Math.round(after.width*.34);thumb.height=Math.round(after.height*.34);
        if(thumb.width&&thumb.height)thumb.getContext('2d')?.drawImage(after,0,0,thumb.width,thumb.height);
        thumb.style.maxWidth='100%';thumb.setAttribute('aria-hidden','true');card.prepend(thumb);
        card.dataset.style=style;
        const previous=Array.from(gallery.children).find(item=>(item as HTMLElement).dataset.style===style);
        if(previous)previous.replaceWith(card);else gallery.append(card);
      }
    }
    async function compareVariants(limit:number){
      const ticket=++colorSession;gallery.replaceChildren();
      for(const [style] of styles.slice(0,limit)){
        if(ticket!==colorSession||!dialog.open||current()!=='color')return;
        await run(style);
      }
    }
    before.onclick=event=>{
      if(current()!=='area'||!frame)return;
      const rect=before.getBoundingClientRect();
      x.value=String(Math.min(frame.width-1,Math.max(0,Math.floor((event.clientX-rect.left)*frame.width/rect.width))));
      y.value=String(Math.min(frame.height-1,Math.max(0,Math.floor((event.clientY-rect.top)*frame.height/rect.height))));
      if(learning()){
        try{addExample();}catch(error){status.textContent=error instanceof Error?error.message:String(error);}
      }else void run().catch(error=>{status.textContent=String(error.message??error);});
    };
    const variantCount=numberField(color,'比較する案の数',4,2,4);
    const analyze=button('候補を計算',()=>current()==='color'?compareVariants(field(variantCount)):run(),status);
    for(const [style,label] of styles)variants.append(button(label,()=>{colorSession++;return run(style);},status));
    const apply=button('選んだ内容を採用する',async()=>{
      const f=frame,r=result;if(!f||!f.valid())throw Error('作品が変わりました。対象を読み込み直してください。');
      if(current()==='specks')await f.adoptRepair(r?.kind==='specks'?r.spots.filter((_,i)=>spotChecks[i]?.checked):[],
        f.names.filter((_,i)=>nameChecks[i]?.checked));
      else if(r?.kind==='color'&&r.count)await f.adoptColor(r.pixels);
      else if(r?.kind==='area'&&r.count)f.select(combineSelection(f.selection,{width:f.width,height:f.height,alpha:r.alpha},combine.value as CombineMode));
      else return;
      dialog.close();
    },status);
    const reload=button('対象を読み込み直す',load,status),close=button('閉じる',()=>dialog.close(),status);
    const actions=document.createElement('div');actions.className='box-actions';actions.append(analyze,apply,reload,close);
    panel.append(actions,status);dialog.append(panel);document.body.append(dialog);dialog.showModal();
    mode.onchange=()=>{visible(current());void load().catch(error=>{status.textContent=String(error.message??error);});};
    reference.onchange=async()=>{
      const file=reference.files?.[0];
      if(!file)return;
      try{
        const extracted=await readReferencePalette(file);
        if(!dialog.open||reference.files?.[0]!==file)return;
        referenceSet=extracted;invalidate();clearGallery();
        palette.replaceChildren(...available().map((p,i)=>new Option(p.name,String(i))));
        palette.value=String(available().length-1);paletteChips();
        status.textContent=extracted.colors.length+'色を資料の色分布から取り出しました。色の候補を計算できます。';
      }catch(error){status.textContent=error instanceof Error?error.message:String(error);}
    };
    areaMode.onchange=()=>{
      invalidate();exampleOptions.hidden=!learning();tolerance.parentElement!.hidden=learning();drawExamples();
      status.textContent=learning()?'画像で残す例と外す例を指定し、候補を計算してください。':'画像をタップして、つながる範囲を確認できます。';
    };
    for(const input of [target,tolerance,palette,strength,size,cleanup,variantCount,x,y,confidence])input.onchange=()=>{invalidate();clearGallery();if(input===palette)paletteChips();refreshApply();};
    dialog.onclose=()=>{generation++;cancelJob();dialog.remove();};
    visible(current());void load().catch(error=>{status.textContent=String(error.message??error);});
  };
  open.onclick=show;
  return {open:show};
}
