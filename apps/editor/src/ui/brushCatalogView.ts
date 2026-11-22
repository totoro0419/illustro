import {CanonicalBuilder,cpuReference,type FoundationPreset} from '@illustro/brush-rt';
import {installWorkspaceDetails} from './workspaceDetails';

const width=116,height=36;
export function installBrushCatalogView(picker:HTMLSelectElement){
  const basic=picker.closest('.m10-presets')!;
  const catalog=document.createElement('div');catalog.className='brush-catalog';
  catalog.setAttribute('role','group');catalog.setAttribute('aria-label','ブラシ一覧');
  const opener=document.createElement('button');opener.type='button';opener.className='brush-detail-open';
  opener.textContent='ブラシ設定';
  const {body:settings,show}=installWorkspaceDetails('ブラシ設定','brushBox',opener);
  picker.closest('label')!.after(catalog,opener);
  picker.closest('label')!.setAttribute('hidden','');
  const search=basic.querySelector('details');
  if(search)search.open=true;
  // The detailed controls are direct siblings of .m10-presets, not children of it.
  const brushSettings=Array.from(basic.parentElement!.querySelectorAll<HTMLDetailsElement>(':scope > details.brush-disclosure'));
  for(const disclosure of brushSettings)settings.append(disclosure);
  const opacity=document.getElementById('brushOpacity')!.closest('label');
  if(opacity)opener.before(opacity);
  if(brushSettings[0] instanceof HTMLDetailsElement)brushSettings[0].open=true;

  const cache=new Map<FoundationPreset,ImageData>(),waiting=new Map<HTMLCanvasElement,FoundationPreset>();
  let idle=0;
  const queue=()=>{
    if(idle||!waiting.size)return;
    idle=window.requestIdleCallback ? window.requestIdleCallback(draw,{timeout:200}) : window.setTimeout(()=>draw(),16);
  };
  const draw=(deadline?:IdleDeadline)=>{
    idle=0;
    const next=waiting.entries().next();
    if(next.done)return;
    const [canvas,preset]=next.value;
    waiting.delete(canvas);
    if(canvas.isConnected){
      let image=cache.get(preset);
      if(!image){
        const sample={...preset,size:Math.min(23,Math.max(2,preset.size)),color:[.15,.18,.26] as [number,number,number]};
        const builder=new CanonicalBuilder(sample,[371,552],0,{forceFadeGeometry:'adaptive-v1'});
        for(let i=0;i<=22;i++){
          const k=i/22;
          builder.accept({x:7+102*k,y:18+6*Math.sin(k*Math.PI*2),t:i*9,
            pressure:.18+Math.sin(k*Math.PI)*.76,pointerType:'pen'});
        }
        builder.finish();
        const base=preset.blend==='erase'?new Uint8ClampedArray(width*height*4):undefined;
        if(base)for(let i=0;i<base.length;i+=4)base.set([59,67,91,255],i);
        image=new ImageData(new Uint8ClampedArray(cpuReference(builder.record(),width,height,base)),width,height);
        cache.set(preset,image);
        if(cache.size>72)cache.delete(cache.keys().next().value!);
      }
      canvas.getContext('2d')?.putImageData(image,0,0);
    }
    if((deadline?.timeRemaining()??0)>5&&waiting.size)draw(deadline);
    else queue();
  };
  const presets=new WeakMap<HTMLCanvasElement,FoundationPreset>();
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      const canvas=entry.target as HTMLCanvasElement,preset=presets.get(canvas);
      if(entry.isIntersecting&&preset){waiting.set(canvas,preset);observer.unobserve(canvas);}
    }
    queue();
  });
  return (brushes:readonly FoundationPreset[])=>{
    const focused=document.activeElement instanceof HTMLButtonElement&&catalog.contains(document.activeElement)
      ?document.activeElement.dataset.brushId:undefined;
    observer.disconnect();waiting.clear();
    const byId=new Map(brushes.map(brush=>[brush.id,brush]));
    catalog.replaceChildren(...[...picker.options].flatMap(option=>{
      const preset=byId.get(option.value);
      if(!preset)return [];
      const button=document.createElement('button');button.type='button';button.dataset.brushId=option.value;
      button.setAttribute('aria-pressed',String(picker.value===option.value));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.setAttribute('aria-hidden','true');
      presets.set(canvas,preset);observer.observe(canvas);
      const label=document.createElement('span');label.textContent=option.label;
      button.append(canvas,label);
      button.onclick=()=>{
        picker.value=option.value;picker.dispatchEvent(new Event('change',{bubbles:true}));show(true);
      };
      return [button];
    }));
    if(focused)[...catalog.querySelectorAll('button')].find(button=>button.dataset.brushId===focused)?.focus({preventScroll:true});
  };
}
