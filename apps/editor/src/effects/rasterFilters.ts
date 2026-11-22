import {applyColorTable,applyDisplacement,readEffectImageChannels} from './imageEffectResources';
import {readEffectSteps,type EffectStep} from './rasterSettings';

type Bytes=Uint8Array|Uint8ClampedArray;
const clip=(value:number,min=0,max=255)=>Math.min(max,Math.max(min,value));
const luminance=(r:number,g:number,b:number)=>.2126*r+.7152*g+.0722*b;
const wrap=(v:number,n:number)=>((v%n)+n)%n;
const byte=(values:Bytes,i:number)=>values[i]??0;
const rgb24=(color:number)=>[color>>16&255,color>>8&255,color&255];

function writeAverage(out:Uint8ClampedArray,i:number,r:number,g:number,b:number,a:number,count:number,alpha?:number){
  out[i+3]=alpha??a/count;
  if(a>0&&out[i+3]){
    out[i]=r/a;out[i+1]=g/a;out[i+2]=b/a;
  }
}

function blurAxis(source:Bytes,width:number,height:number,radius:number,vertical:boolean,gaussian:boolean){
  if(radius===0)return source;
  const out=new Uint8ClampedArray(source.length);
  const length=vertical?height:width,lines=vertical?width:height,stride=vertical?width*4:4,advance=vertical?4:width*4;
  const range=gaussian?Math.max(1,Math.ceil(radius)):radius;
  const weights=gaussian?Array.from({length:range*2+1},(_,i)=>Math.exp(-.5*((i-range)/(radius/3))**2)):null;
  const total=weights?.reduce((sum,w)=>sum+w,0)??range*2+1;
  for(let line=0;line<lines;line++){
    const base=line*advance;
    let r=0,g=0,b=0,a=0;
    const add=(position:number,weight:number)=>{
      const i=base+clip(position,0,length-1)*stride,w=byte(source,i+3)*weight;
      r+=byte(source,i)*w;g+=byte(source,i+1)*w;b+=byte(source,i+2)*w;a+=w;
    };
    if(!weights)for(let d=-range;d<=range;d++)add(d,1);
    for(let pos=0;pos<length;pos++){
      if(weights){
        r=g=b=a=0;
        for(let d=-range;d<=range;d++)add(pos+d,weights[d+range]!);
      }
      writeAverage(out,base+pos*stride,r,g,b,a,total);
      if(!weights){add(pos-range,-1);add(pos+range+1,1);}
    }
  }
  return out;
}
function blur(source:Bytes,width:number,height:number,rx:number,ry:number,gaussian:boolean){
  return blurAxis(blurAxis(source,width,height,rx,false,gaussian),width,height,ry,true,gaussian);
}
function keepAlpha(result:Bytes,source:Bytes){
  const out=new Uint8ClampedArray(result);
  for(let i=0;i<out.length;i+=4){
    out[i+3]=byte(source,i+3);
    if(!out[i+3])out.fill(0,i,i+3);
  }
  return out;
}
function sampledBlur(source:Bytes,width:number,height:number,step:EffectStep){
  const [amount=0,p1=0,p2=0,mode=0,protect=0]=step.values;
  if(!amount)return source;
  const out=new Uint8ClampedArray(source.length),motion=step.kind==='motion';
  const angle=p1*Math.PI/180,dx=Math.cos(angle)*amount,dy=Math.sin(angle)*amount;
  const cx=p1/100*(width-1),cy=p2/100*(height-1),protection=protect/100*Math.min(width,height)/2;
  const count=motion?Math.min(65,Math.ceil(amount)+1):25;
  const taps=Array.from({length:count},(_,j)=>{
    const position=j/(count-1)-(motion&&p2?0:.5);
    const angle=position*amount/100*Math.PI,scale=1+position*amount/100;
    return {position,cos:Math.cos(angle),sin:Math.sin(angle),scale};
  });
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,ox=x-cx,oy=y-cy;
    if(!motion&&ox*ox+oy*oy<=protection*protection){out.set(source.subarray(i,i+4),i);continue;}
    let r=0,g=0,b=0,a=0;
    for(const tap of taps){
      const sx=motion?x+dx*tap.position:cx+(mode?ox*tap.cos-oy*tap.sin:ox*tap.scale);
      const sy=motion?y+dy*tap.position:cy+(mode?ox*tap.sin+oy*tap.cos:oy*tap.scale);
      const at=(clip(Math.round(sy),0,height-1)*width+clip(Math.round(sx),0,width-1))*4;
      const alpha=byte(source,at+3);
      r+=byte(source,at)*alpha;g+=byte(source,at+1)*alpha;b+=byte(source,at+2)*alpha;a+=alpha;
    }
    writeAverage(out,i,r,g,b,a,count,motion&&mode?byte(source,i+3):undefined);
  }
  return out;
}
function lensBlur(source:Bytes,width:number,height:number,step:EffectStep){
  const [radius=12,focus=50,band=20,blades=6,angle=0]=step.values;
  if(blades===1||blades===2)throw Error('絞りは0（円）または3〜12辺を指定してください。');
  if(!radius)return source;
  const center=focus/100*Math.max(1,height-1),sharpBand=band/200*height;
  const falloff=Math.max(1,Math.max(center,height-1-center)-sharpBand);
  const out=new Uint8ClampedArray(source.length),taps=[{x:0,y:0}];
  const rotation=angle*Math.PI/180,sector=blades?Math.PI*2/blades:0;
  for(let k=1;k<=24;k++){
    const direction=k*Math.PI*(3-Math.sqrt(5)),u=Math.sqrt(k/24);
    const aperture=sector?Math.cos(sector/2)/Math.cos(wrap(direction+sector/2,sector)-sector/2):1;
    taps.push({x:u*aperture*Math.cos(direction+rotation),y:u*aperture*Math.sin(direction+rotation)});
  }
  const map=step.resource?.kind==='displacement'?step.resource:null,depth=map?readEffectImageChannels(map):null;
  if(map&&depth){
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const from=(Math.floor(y*map.height/height)*map.width+Math.floor(x*map.width/width))*2;
      const z=depth[from]!/255*100;
      const scale=radius*clip((Math.abs(z-focus)-band/2)/Math.max(1,Math.max(focus,100-focus)-band/2),0,1);
      const at=(y*width+x)*4;
      if(scale<.5){out.set(source.subarray(at,at+4),at);continue;}
      let r=0,g=0,b=0,a=0;
      for(const tap of taps){
        const i=(clip(Math.round(y+tap.y*scale),0,height-1)*width+clip(Math.round(x+tap.x*scale),0,width-1))*4;
        const alpha=byte(source,i+3);
        r+=byte(source,i)*alpha;g+=byte(source,i+1)*alpha;b+=byte(source,i+2)*alpha;a+=alpha;
      }
      writeAverage(out,at,r,g,b,a,taps.length);
    }
    return out;
  }
  for(let y=0;y<height;y++){
    const scale=radius*clip((Math.abs(y-center)-sharpBand)/falloff,0,1);
    const start=y*width*4,end=start+width*4;
    if(scale<.5){out.set(source.subarray(start,end),start);continue;}
    const offsets=taps.map(p=>({dx:Math.round(p.x*scale),row:clip(y+Math.round(p.y*scale),0,height-1)*width}));
    for(let x=0;x<width;x++){
      let r=0,g=0,b=0,a=0;
      for(const tap of offsets){
        const i=(tap.row+clip(x+tap.dx,0,width-1))*4,alpha=byte(source,i+3);
        r+=byte(source,i)*alpha;g+=byte(source,i+1)*alpha;b+=byte(source,i+2)*alpha;a+=alpha;
      }
      writeAverage(out,start+x*4,r,g,b,a,taps.length);
    }
  }
  return out;
}
function detailFilter(source:Bytes,width:number,height:number,step:EffectStep){
  const [a=0,b=0,c=0,d=0]=step.values,high=step.kind==='highPass',sharp=step.kind==='sharpen';
  if(!high&&!a)return source;
  const radius=high?a:b,blurred=blur(source,width,height,radius,radius,true);
  const out=new Uint8ClampedArray(source);
  for(let i=0;i<source.length;i+=4){
    if(!source[i+3])continue;
    const dr=byte(source,i)-byte(blurred,i),dg=byte(source,i+1)-byte(blurred,i+1),db=byte(source,i+2)-byte(blurred,i+2);
    const edge=Math.max(Math.abs(dr),Math.abs(dg),Math.abs(db));
    if(!high&&!sharp&&edge<c)continue;
    const amount=high?1:a/100*(sharp?1-(edge/255)*(c/100):1);
    const gray=luminance(dr,dg,db),delta=[dr,dg,db];
    for(let channel=0;channel<3;channel++)
      out[i+channel]=(high&&!c?b:byte(source,i+channel))+(d?gray:delta[channel]!)*amount;
  }
  return out;
}
function noiseFilter(source:Bytes,width:number,step:EffectStep){
  const [amount=0,colored=0,normal=0,grain=1,seed=1]=step.values;
  const out=new Uint8ClampedArray(source);
  const random=(x:number,y:number,offset:number)=>{
    let n=Math.imul(x+seed,0x9e3779b1)^Math.imul(y+offset,0x85ebca77);
    n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);
    return ((n^(n>>>16))>>>0)/4294967296;
  };
  for(let i=0;i<out.length;i+=4){
    if(!out[i+3])continue;
    const x=Math.floor((i/4%width)/grain),y=Math.floor(i/4/width/grain);
    for(let c=0;c<3;c++){
      const k=colored?c*11:0,r=random(x,y,k);
      const v=normal?(r+random(x,y,k+3)+random(x,y,k+7)-1.5)/1.5:2*r-1;
      out[i+c]=byte(source,i+c)+v*amount*2.55;
    }
  }
  return out;
}
function medianFilter(source:Bytes,width:number,height:number,step:EffectStep){
  const [radius=1,threshold=18,isolated=1]=step.values;
  const out=new Uint8ClampedArray(source);
  const values:Array<{tone:number;index:number}>=Array.from({length:(radius*2+1)**2},()=>({tone:0,index:0}));
  const difference=(i:number,j:number)=>{
    const ai=byte(source,i+3)/255,aj=byte(source,j+3)/255;
    return Math.max(Math.abs(ai-aj)*255,Math.abs(byte(source,i)*ai-byte(source,j)*aj),
      Math.abs(byte(source,i+1)*ai-byte(source,j+1)*aj),Math.abs(byte(source,i+2)*ai-byte(source,j+2)*aj));
  };
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    if(isolated){
      let connected=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy;
        if((dx||dy)&&nx>=0&&nx<width&&ny>=0&&ny<height&&difference(i,(ny*width+nx)*4)<=threshold)connected++;
      }
      if(connected>0)continue;
    }
    let k=0;
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
      const at=(clip(y+dy,0,height-1)*width+clip(x+dx,0,width-1))*4,value=values[k++]!;
      value.index=at;
      value.tone=luminance(byte(source,at),byte(source,at+1),byte(source,at+2))*byte(source,at+3)/255;
    }
    values.sort((a,b)=>a.tone-b.tone||byte(source,a.index+3)-byte(source,b.index+3));
    const mid=values[Math.floor(values.length/2)]!.index;
    if(!isolated||difference(i,mid)>threshold)out.set(source.subarray(mid,mid+4),i);
  }
  return out;
}
function geometryFilter(source:Bytes,width:number,height:number,step:EffectStep){
  const [a=1,b=1,c=0,ox=0,oy=0,center=0]=step.values;
  const out=new Uint8ClampedArray(source.length);
  if(step.kind==='offset'){
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      let sx=x-(ox?Math.floor(width/2):a),sy=y-(ox?Math.floor(height/2):b);
      if(c===0){sx=wrap(sx,width);sy=wrap(sy,height);}
      if(c===2){sx=clip(sx,0,width-1);sy=clip(sy,0,height-1);}
      if(sx<0||sx>=width||sy<0||sy>=height)continue;
      const at=(sy*width+sx)*4;out.set(source.subarray(at,at+4),(y*width+x)*4);
    }
    return out;
  }
  const bw=a,bh=c?a:b;
  for(let top=-wrap(-oy,bh);top<height;top+=bh)for(let left=-wrap(-ox,bw);left<width;left+=bw){
    const x0=Math.max(0,left),x1=Math.min(width,left+bw),y0=Math.max(0,top),y1=Math.min(height,top+bh);
    let r=0,g=0,b=0,a=0,count=(x1-x0)*(y1-y0);
    if(center){
      const i=(Math.floor((y0+y1-1)/2)*width+Math.floor((x0+x1-1)/2))*4;
      a=byte(source,i+3);r=byte(source,i)*a;g=byte(source,i+1)*a;b=byte(source,i+2)*a;count=1;
    }else{
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const i=(y*width+x)*4,w=byte(source,i+3);a+=w;r+=byte(source,i)*w;g+=byte(source,i+1)*w;b+=byte(source,i+2)*w;
      }
    }
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)writeAverage(out,(y*width+x)*4,r,g,b,a,count);
  }
  return out;
}
function hsl(r:number,g:number,b:number){
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/510;
  if(!d)return {h:0,s:0,l};
  const angle=max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4;
  return {h:wrap(angle*60,360),s:d/(255*(1-Math.abs(2*l-1))),l};
}
function fromHsl(h:number,s:number,l:number){
  const a=clip(s,0,1)*Math.min(l,1-l);
  return [0,8,4].map(n=>{
    const k=wrap(n+h/30,12);
    return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)));
  });
}
function emboss(source:Bytes,width:number,height:number,step:EffectStep){
  const [degrees=45,radius=2,depth=100,color=0]=step.values;
  if(!depth)return source;
  const dx=Math.round(radius*Math.cos(degrees*Math.PI/180)),dy=Math.round(radius*Math.sin(degrees*Math.PI/180));
  const out=new Uint8ClampedArray(source);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;if(!source[i+3])continue;
    const sample=(x:number,y:number)=>{
      const at=(clip(y,0,height-1)*width+clip(x,0,width-1))*4;
      return luminance(byte(source,at),byte(source,at+1),byte(source,at+2))*byte(source,at+3)/255;
    };
    const bump=(sample(x-dx,y-dy)-sample(x+dx,y+dy))*.5*depth/100;
    for(let c=0;c<3;c++)out[i+c]=(color?byte(source,i+c):128)+bump;
  }
  return out;
}
function toneFilter(source:Bytes,width:number,step:EffectStep){
  const [a=0,b=0,c=0,d=0,e=0,f=0]=step.values;
  if(step.kind==='levels'&&b<=a)throw Error('入力レベルの白は黒より大きくしてください。');
  const curve=step.kind==='curves'?[0,b,d,f,255]:null;
  const curveValues=step.kind==='curves'?[0,c,e,step.values[6]!,255]:null;
  if(curve&&!(b<d&&d<f))throw Error('トーンカーブの入力値を暗部、中間、明部の順に指定してください。');
  const curveTable=curve&&curveValues?Uint8ClampedArray.from({length:256},(_,v)=>{
    const hi=curve.findIndex(x=>x>=v),lo=Math.max(0,hi-1);
    return hi===lo?curveValues[hi]!:curveValues[lo]!+(curveValues[hi]!-curveValues[lo]!)*(v-curve[lo]!)/(curve[hi]!-curve[lo]!);
  }):null;
  const dark=rgb24(c),light=rgb24(d);
  const out=new Uint8ClampedArray(source),slope=(a:number)=>a<0?1+a/100:1/(1-Math.min(99,a)/100);
  const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const quantize=(v:number,offset:number)=>Math.round(clip(v+offset)/255*(a-1))*255/(a-1);
  for(let i=0;i<source.length;i+=4){
    if(!source[i+3]&&!(step.kind==='invert'&&b))continue;
    const r=byte(source,i),g=byte(source,i+1),bl=byte(source,i+2),y=luminance(r,g,bl);
    let rgb=[r,g,bl];
    switch(step.kind){
      case 'brightness':{
        const change=(v:number)=>(v-127.5)*slope(b)+127.5+a*2.55;
        rgb=rgb.map(v=>c?v+change(y)-y:change(v));break;
      }
      case 'levels':rgb=rgb.map((v,k)=>f&&f!==k+1?v:d+(e-d)*clip((v-a)/(b-a),0,1)**(1/c));break;
      case 'curves':rgb=rgb.map((v,k)=>a&&a!==k+1?v:curveTable![v]!);break;
      case 'exposure':rgb=rgb.map(v=>{
        const u=v/255,linear=u<=.04045?u/12.92:((u+.055)/1.055)**2.4;
        const adjusted=clip(linear*2**a+b,0,1)**(1/c);
        return 255*(adjusted<=.0031308?adjusted*12.92:1.055*adjusted**(1/2.4)-.055);
      });break;
      case 'hue':{
        const color=hsl(r,g,bl);
        rgb=fromHsl(d?a:color.h+a,d?clip(b/100,0,1):clip(color.s+b/100,0,1),clip(color.l+c/100,0,1));break;
      }
      case 'vibrance':{
        const color=hsl(r,g,bl);
        rgb=fromHsl(color.h,clip(color.s+(a/100)*(1-color.s)*Math.min(color.s*4,1)+color.s*b/100,0,1),color.l);break;
      }
      case 'balance':{
        const l=y/255,weight=a===1?(1-l)**2:a===2?1-(2*l-1)**2:l*l;
        rgb=[r+b*weight*2.55,g+c*weight*2.55,bl+d*weight*2.55];
        if(e){const shift=y-luminance(rgb[0]!,rgb[1]!,rgb[2]!);rgb=rgb.map(v=>v+shift);}
        break;
      }
      case 'temperature':rgb=[r+a*1.35-b*.65,g+b*1.25,bl-a*1.35-b*.65];break;
      case 'grayscale':{
        const {h,s}=hsl(r,g,bl),sector=h/60,k=Math.floor(sector),t=sector-k;
        const weight=step.values[k]!*(1-t)+step.values[(k+1)%6]!*t,gray=clip(y+weight*s*2.55);
        const tint=rgb24(step.values[7]!);
        rgb=tint.map(v=>step.values[6]?gray+(v-128)*Math.min(gray,255-gray)/128:gray);
        break;
      }
      case 'mixer':{
        const original=rgb,monochrome=step.values[12];
        rgb=original.map((_,k)=>{
          const offset=monochrome?0:k*4;
          return (step.values[offset]!*r+step.values[offset+1]!*g+step.values[offset+2]!*bl)/100+step.values[offset+3]!*2.55;
        });break;
      }
      case 'selective':{
        const {h,s,l}=hsl(r,g,bl);
        const hz=(a-1)*60,dist=Math.abs(wrap(h-hz+180,360)-180);
        const weight=a<=6?s*Math.max(0,1-dist/85):a===7?(1-s)*(1-Math.abs(2*l-1)):
          a===8?(1-s)*l*l:(1-s)*(1-l)**2;
        rgb=rgb.map((v,k)=>{
          const delta=-(step.values[k+1]!+e)/100;
          return v+delta*(f?255:delta<0?v:255-v)*weight;
        });break;
      }
      case 'recolor':rgb=rgb24(a);if(b)out[i+3]=byte(source,i+3)*clip((c-y)/Math.max(1,c),0,1);break;
      case 'invert':rgb=rgb.map(v=>a?v+255-2*y:255-v);if(b)out[i+3]=255-byte(source,i+3);break;
      case 'posterize':{
        const offset=c?((bayer[(Math.floor(i/4/width)%4)*4+(i/4%width)%4]??0)+.5-8)/16*255/(a-1):0;
        rgb=rgb.map(v=>b?v+quantize(y,offset)-y:quantize(v,offset));break;
      }
      case 'threshold':rgb=(b?rgb[b-1]!:y)>=a?light:dark;break;
    }
    for(let channel=0;channel<3;channel++)out[i+channel]=rgb[channel]!;
  }
  return out;
}

function alphaExtrema(source:Bytes,width:number,height:number,radius:number,inside:boolean){
  const original=Uint8Array.from({length:width*height},(_,i)=>byte(source,i*4+3));
  function axis(input:Uint8Array,vertical:boolean){
    const out=new Uint8Array(input.length),length=vertical?height:width,lines=vertical?width:height;
    const advance=vertical?1:width,stride=vertical?width:1,queue=new Int32Array(length+2*radius);
    for(let line=0;line<lines;line++){
      const start=line*advance;
      const sample=(i:number)=>i<0||i>=length?0:input[start+i*stride]!;
      let head=0,tail=0;
      for(let i=-radius;i<length+radius;i++){
        while(head<tail&&queue[head]!<i-2*radius)head++;
        while(head<tail&&(inside?sample(queue[tail-1]!)>=sample(i):sample(queue[tail-1]!)<=sample(i)))tail--;
        queue[tail++]=i;
        if(i>=radius)out[start+(i-radius)*stride]=sample(queue[head]!);
      }
    }
    return out;
  }
  return axis(axis(original,false),true);
}
function alphaStyle(source:Bytes,width:number,height:number,step:EffectStep){
  const shadow=step.kind==='shadow',outline=step.kind==='outline';
  const [a=0,b=0,c=0,d=0,e=0,f=0]=step.values;
  const radius=shadow?c:a,color=rgb24(shadow?d:b),inner=shadow?e:c,opacity=(shadow?f:d)/100;
  if(!opacity)return source;
  const outlineAlpha=outline?alphaExtrema(source,width,height,radius,!!inner):null;
  const smooth=outline?null:blur(source,width,height,radius,radius,false);
  const out=new Uint8ClampedArray(source);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,original=byte(source,i+3)/255;
    const sx=x-(shadow?a:0),sy=y-(shadow?b:0);
    const coverage=outlineAlpha?(outlineAlpha[i/4]??0)/255:sx<0||sy<0||sx>=width||sy>=height?0:byte(smooth!,(sy*width+sx)*4+3)/255;
    if(inner){
      if(!original)continue;
      const mix=(1-coverage)*opacity;
      for(let c=0;c<3;c++)out[i+c]=byte(source,i+c)*(1-mix)+color[c]!*mix;
    }else{
      const lower=coverage*opacity*(1-original),alpha=original+lower;
      if(!lower||!alpha)continue;
      for(let c=0;c<3;c++)out[i+c]=(byte(source,i+c)*original+color[c]!*lower)/alpha;
      out[i+3]=alpha*255;
    }
  }
  return out;
}
function patternFilter(source:Bytes,width:number,height:number,step:EffectStep){
  const [a=0,b=0,c=0,d=0,e=0,f=0]=step.values,out=new Uint8ClampedArray(source);
  const mode=step.kind==='overlay',angle=(mode?d:b)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  const first=rgb24(mode?b:c),second=rgb24(c);
  const length=Math.abs(width*cos)+Math.abs(height*sin),strength=f/100;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;if(!source[i+3])continue;
    const sx=(x-width/2)*cos+(y-height/2)*sin;
    if(mode){
      const t=a===0?0:a===1?clip(sx/Math.max(length,1)+.5,0,1):Math.floor(wrap(sx,2*e)/e);
      for(let channel=0;channel<3;channel++)
        out[i+channel]=byte(source,i+channel)*(1-strength)+(first[channel]!*(1-t)+second[channel]!*t)*strength;
    }else{
      const sy=-(x-width/2)*sin+(y-height/2)*cos;
      const dx=wrap(sx,a)-a/2,dy=wrap(sy,a)-a/2;
      const ink=1-luminance(byte(source,i),byte(source,i+1),byte(source,i+2))/255;
      const radius=Math.sqrt(ink/Math.PI)*a;
      const covered=clip(.5+radius-Math.hypot(dx,dy),0,1);
      for(let channel=0;channel<3;channel++)out[i+channel]=d?first[channel]!:255+(first[channel]!-255)*covered;
      if(d)out[i+3]=byte(source,i+3)*covered;
    }
  }
  return out;
}
function edgeFilter(source:Bytes,width:number,height:number,step:EffectStep){
  const [threshold=30,strength=100,ink=0,transparent=1]=step.values,color=rgb24(ink);
  const out=new Uint8ClampedArray(source.length);
  const sample=(x:number,y:number)=>{
    const i=(clip(y,0,height-1)*width+clip(x,0,width-1))*4,alpha=byte(source,i+3)/255;
    return 255*(1-alpha)+alpha*luminance(byte(source,i),byte(source,i+1),byte(source,i+2));
  };
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const gx=sample(x+1,y-1)+2*sample(x+1,y)+sample(x+1,y+1)-sample(x-1,y-1)-2*sample(x-1,y)-sample(x-1,y+1);
    const gy=sample(x-1,y+1)+2*sample(x,y+1)+sample(x+1,y+1)-sample(x-1,y-1)-2*sample(x,y-1)-sample(x+1,y-1);
    const amount=clip((Math.hypot(gx,gy)/4-threshold)/(255-threshold)*strength/100,0,1),i=(y*width+x)*4;
    for(let c=0;c<3;c++)out[i+c]=transparent?color[c]!:255+(color[c]!-255)*amount;
    out[i+3]=transparent?amount*255:255;
  }
  return out;
}

export function applyRasterEffects(source:Bytes,width:number,height:number,recipe:readonly EffectStep[],mask:Uint8Array|null,alphaLocked=false){
  const steps=readEffectSteps(recipe);
  if(!steps||source.length!==width*height*4||mask&&mask.length!==width*height)throw Error('効果の設定を確認してください。');
  let result:Bytes=source;
  for(const step of steps){
    if(!step.enabled||!step.strength)continue;
    const [a=0,b=0,c=0,d=0]=step.values;
    let filtered:Bytes;
    switch(step.kind){
      case 'gaussian':filtered=blur(result,width,height,a,a,true);if(b)filtered=keepAlpha(filtered,result);break;
      case 'box':filtered=blur(result,width,height,a,c?a:b,false);if(d)filtered=keepAlpha(filtered,result);break;
      case 'motion':case 'radial':filtered=sampledBlur(result,width,height,step);break;
      case 'lens':filtered=lensBlur(result,width,height,step);break;
      case 'sharpen':case 'unsharp':case 'highPass':filtered=detailFilter(result,width,height,step);break;
      case 'noise':filtered=noiseFilter(result,width,step);break;
      case 'median':filtered=medianFilter(result,width,height,step);break;
      case 'halftone':case 'overlay':filtered=patternFilter(result,width,height,step);break;
      case 'outline':case 'glow':case 'shadow':filtered=alphaStyle(result,width,height,step);break;
      case 'edges':filtered=edgeFilter(result,width,height,step);break;
      case 'emboss':filtered=emboss(result,width,height,step);break;
      case 'lut':filtered=step.resource?.kind==='colorTable'?applyColorTable(result,step.resource):result;break;
      case 'displace':filtered=step.resource?.kind==='displacement'?applyDisplacement(result,width,height,step.resource,a,b,c,!!d):result;break;
      case 'mosaic':case 'offset':filtered=geometryFilter(result,width,height,step);break;
      default:filtered=toneFilter(result,width,step);
    }
    if(filtered===result)continue;
    if(step.strength===100&&!mask&&!alphaLocked){result=filtered;continue;}
    const blended=new Uint8ClampedArray(result.length),strength=step.strength/100;
    for(let i=0;i<blended.length;i+=4){
      const w=strength*(mask?byte(mask,i/4)/255:1),oldA=byte(result,i+3),newA=byte(filtered,i+3);
      if(w===0||alphaLocked&&oldA===0){blended.set(result.subarray(i,i+4),i);continue;}
      const amount=alphaLocked?w:((1-w)*oldA+w*newA)>0?w*newA/((1-w)*oldA+w*newA):0;
      for(let k=0;k<3;k++)blended[i+k]=byte(result,i+k)*(1-amount)+byte(filtered,i+k)*amount;
      blended[i+3]=alphaLocked?oldA:oldA*(1-w)+newA*w;
    }
    result=blended;
  }
  return new Uint8ClampedArray(result);
}
