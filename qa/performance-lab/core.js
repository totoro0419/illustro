/* Illustro independent performance lab. No app-code dependencies. */
(function (root, make) {
  const core = make();
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (root) root.IllustroBenchCore = core;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function now() { return performance.now(); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function image(w, h, data) { return {w, h, data: data || new Uint8ClampedArray(w*h*4)}; }
  function clone(a) { return image(a.w, a.h, new Uint8ClampedArray(a.data)); }
  function fixture(w, h, seed=2037) {
    const out=image(w,h), p=out.data;
    let v=seed >>> 0;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
      const i=4*(y*w+x);
      v=(Math.imul(1664525,v)+1013904223)>>>0;
      const cx=Math.floor(x/(Math.max(8,Math.floor(w/7))));
      const cy=Math.floor(y/(Math.max(8,Math.floor(h/7))));
      const band=(((cx*11+cy*17)%7)+7)%7;
      p[i]=clamp(18+band*33+((v>>>24)&7),0,255);
      p[i+1]=clamp(34+(band*19)%179+((v>>>21)&3),0,255);
      p[i+2]=clamp(50+(band*23)%155+((v>>>19)&3),0,255);
      p[i+3]=255;
    }
    return out;
  }
  function strokePoints(w,h,count=800) {
    const pts=[];
    for(let i=0;i<count;i++) {
      const t=i/Math.max(1,count-1);
      pts.push({x:Math.round(w*(.08+.84*t)),y:Math.round(h*(.52+.34*Math.sin(t*24))) });
    }
    return pts;
  }
  function paintStampRows(dst, point, radius, fromY, toY, rgb, alpha) {
    const w=dst.w,h=dst.h,d=dst.data,r2=radius*radius;
    const left=clamp(Math.floor(point.x-radius),0,w-1),right=clamp(Math.ceil(point.x+radius),0,w-1);
    const a=clamp(alpha|0,0,255),ina=255-a;
    for(let y=fromY;y<toY;y++) for(let x=left;x<=right;x++) {
      const dx=x+.5-point.x,dy=y+.5-point.y;
      if(dx*dx+dy*dy>r2)continue;
      const i=4*(y*w+x);
      d[i]=Math.floor((d[i]*ina+rgb[0]*a+127)/255);
      d[i+1]=Math.floor((d[i+1]*ina+rgb[1]*a+127)/255);
      d[i+2]=Math.floor((d[i+2]*ina+rgb[2]*a+127)/255);
      d[i+3]=255;
    }
  }
  function strokeSync(dst,pts,radius=16,rgb=[240,72,44],alpha=170) {
    for(const p of pts) {
      const low=clamp(Math.floor(p.y-radius),0,dst.h);
      const high=clamp(Math.ceil(p.y+radius)+1,0,dst.h);
      if(low<high)paintStampRows(dst,p,radius,low,high,rgb,alpha);
    }
    return dst;
  }
  function yieldTask() {return new Promise(r=>setTimeout(r,0));}
  async function strokeChunked(dst,pts,radius=16,rgb=[240,72,44],alpha=170,budgetMs=5,stop) {
    let ticks=0,deadline=now()+Math.max(.1,budgetMs);
    for(let n=0;n<pts.length;n++) {
      const p=pts[n],low=clamp(Math.floor(p.y-radius),0,dst.h);
      const high=clamp(Math.ceil(p.y+radius)+1,0,dst.h);
      for(let y=low;y<high;y++) {
        if(stop && stop())return {dst,cancelled:true,yields:ticks};
        paintStampRows(dst,p,radius,y,y+1,rgb,alpha);
        if(now()>=deadline) {ticks++;await yieldTask();deadline=now()+Math.max(.1,budgetMs);}
      }
    }
    return {dst,cancelled:false,yields:ticks};
  }
  function match(d,index,base,threshold) {
    return Math.abs(d[index]-base[0])<=threshold&&Math.abs(d[index+1]-base[1])<=threshold&&Math.abs(d[index+2]-base[2])<=threshold&&Math.abs(d[index+3]-base[3])<=threshold;
  }
  function fillBfs(src,sx,sy,threshold=10) {
    const {w,h,data:d}=src,mask=new Uint8Array(w*h);
    sx=Math.floor(sx);sy=Math.floor(sy);if(sx<0||sy<0||sx>=w||sy>=h)return mask;
    const base=Array.from(d.subarray(4*(sy*w+sx),4*(sy*w+sx)+4));
    const queue=new Int32Array(w*h),seen=new Uint8Array(w*h);
    let head=0,tail=0;const start=sy*w+sx;queue[tail++]=start;seen[start]=1;
    while(head<tail){const i=queue[head++];if(!match(d,4*i,base,threshold))continue;
      mask[i]=255;const x=i%w,y=(i-x)/w;
      if(x>0&&!seen[i-1]){seen[i-1]=1;queue[tail++]=i-1;}
      if(x+1<w&&!seen[i+1]){seen[i+1]=1;queue[tail++]=i+1;}
      if(y>0&&!seen[i-w]){seen[i-w]=1;queue[tail++]=i-w;}
      if(y+1<h&&!seen[i+w]){seen[i+w]=1;queue[tail++]=i+w;}
    }
    return mask;
  }
  function fillScanline(src,sx,sy,threshold=10) {
    const {w,h,data:d}=src,mask=new Uint8Array(w*h);
    sx=Math.floor(sx);sy=Math.floor(sy);if(sx<0||sy<0||sx>=w||sy>=h)return mask;
    const base=Array.from(d.subarray(4*(sy*w+sx),4*(sy*w+sx)+4));
    const seen=new Uint8Array(w*h),queue=[];let head=0;
    const first=sy*w+sx;queue.push(first);seen[first]=1;
    while(head<queue.length){const index=queue[head++],y=Math.floor(index/w),x=index%w;
      if(mask[index]||!match(d,index*4,base,threshold))continue;
      let lo=x,hi=x;
      while(lo>0&&!mask[y*w+lo-1]&&match(d,4*(y*w+lo-1),base,threshold))lo--;
      while(hi+1<w&&!mask[y*w+hi+1]&&match(d,4*(y*w+hi+1),base,threshold))hi++;
      for(let a=lo;a<=hi;a++)mask[y*w+a]=255;
      for(const ny of [y-1,y+1]){
        if(ny<0||ny>=h)continue;
        for(let a=lo;a<=hi;a++){
          const i=ny*w+a;
          if(mask[i]||seen[i]||!match(d,4*i,base,threshold))continue;
          seen[i]=1;queue.push(i);
        }
      }
    }
    return mask;
  }
  function blurDirect(src,radius=8) {
    const {w,h,data:s}=src,d=new Uint8ClampedArray(s.length),r=Math.max(0,radius|0),diam=2*r+1,den=diam*diam;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
      const sums=[0,0,0,0];
      for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        const j=4*(clamp(y+dy,0,h-1)*w+clamp(x+dx,0,w-1));
        for(let c=0;c<4;c++)sums[c]+=s[j+c];
      }
      const i=4*(y*w+x);for(let c=0;c<4;c++)d[i+c]=Math.round(sums[c]/den);
    }
    return image(w,h,d);
  }
  function blurSeparable(src,radius=8) {
    const {w,h,data:s}=src,d=new Uint8ClampedArray(s.length),r=Math.max(0,radius|0),diam=2*r+1;
    const rows=new Float64Array(s.length);
    for(let y=0;y<h;y++)for(let c=0;c<4;c++){
      let sum=0;
      for(let k=-r;k<=r;k++)sum+=s[4*(y*w+clamp(k,0,w-1))+c];
      for(let x=0;x<w;x++){
        rows[4*(y*w+x)+c]=sum;
        if(x+1<w)sum+=s[4*(y*w+clamp(x+r+1,0,w-1))+c]-s[4*(y*w+clamp(x-r,0,w-1))+c];
      }
    }
    for(let x=0;x<w;x++)for(let c=0;c<4;c++){
      let sum=0;
      for(let k=-r;k<=r;k++)sum+=rows[4*(clamp(k,0,h-1)*w+x)+c];
      for(let y=0;y<h;y++){
        d[4*(y*w+x)+c]=Math.round(sum/(diam*diam));
        if(y+1<h)sum+=rows[4*(clamp(y+r+1,0,h-1)*w+x)+c]-rows[4*(clamp(y-r,0,h-1)*w+x)+c];
      }
    }
    return image(w,h,d);
  }
  function polygonPath(w,h,count=320){
    const points=[];for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2;
      const r=.32+.1*Math.cos(7*a)+.045*Math.sin(13*a);
      points.push({x:w*(.5+r*Math.cos(a)),y:h*(.5+r*Math.sin(a))});
    }return points;
  }
  function lassoPoint(srcW,srcH,poly){
    const mask=new Uint8Array(srcW*srcH);
    for(let y=0;y<srcH;y++)for(let x=0;x<srcW;x++){
      const cx=x+.5,cy=y+.5;let inside=false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const a=poly[i],b=poly[j];
        if((a.y>cy)!==(b.y>cy) && cx<(b.x-a.x)*(cy-a.y)/(b.y-a.y)+a.x)inside=!inside;
      }
      if(inside)mask[y*srcW+x]=255;
    }return mask;
  }
  function lassoScanline(w,h,poly){
    const mask=new Uint8Array(w*h);
    for(let y=0;y<h;y++){
      const cy=y+.5,ints=[];
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const a=poly[i],b=poly[j];
        if((a.y>cy)!==(b.y>cy))ints.push((b.x-a.x)*(cy-a.y)/(b.y-a.y)+a.x);
      }
      ints.sort((a,b)=>a-b);
      for(let n=0;n+1<ints.length;n+=2){
        const lo=clamp(Math.ceil(ints[n]-.5),0,w),hi=clamp(Math.ceil(ints[n+1]-.5),0,w);
        for(let x=lo;x<hi;x++)mask[y*w+x]=255;
      }
    }return mask;
  }
  function sample(src,x,y,c){
    const {w,h,data}=src;
    const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
    const xA=clamp(x0,0,w-1),xB=clamp(x0+1,0,w-1),yA=clamp(y0,0,h-1),yB=clamp(y0+1,0,h-1);
    const a=data[4*(yA*w+xA)+c],b=data[4*(yA*w+xB)+c];
    const cc=data[4*(yB*w+xA)+c],dd=data[4*(yB*w+xB)+c];
    return Math.round((a*(1-fx)+b*fx)*(1-fy)+(cc*(1-fx)+dd*fx)*fy);
  }
  function warpAt(src,out,outY0,outY1,strength=24,scale=1){
    const {w,h}=src;
    for(let y=outY0;y<outY1;y++)for(let x=0;x<out.w;x++){
      const fx=(x+.5)*scale-.5,fy=(y+.5)*scale-.5;
      const dx=strength*Math.sin((fy/h)*Math.PI*4)*Math.sin((fx/w)*Math.PI*2);
      const dy=strength*.65*Math.sin((fx/w)*Math.PI*3)*Math.sin((fy/h)*Math.PI*2);
      const idx=4*(y*out.w+x);
      for(let c=0;c<4;c++)out.data[idx+c]=sample(src,fx+dx,fy+dy,c);
    }
  }
  function warpFull(src,strength=24){const out=image(src.w,src.h);warpAt(src,out,0,out.h,strength,1);return out;}
  function warpPreview(src,strength=24,factor=4){
    const f=Math.max(1,Math.floor(factor)),out=image(Math.ceil(src.w/f),Math.ceil(src.h/f));warpAt(src,out,0,out.h,strength,f);return out;
  }
  async function warpChunked(src,strength=24,budgetMs=5,stop){
    const out=image(src.w,src.h);let cursor=0,yields=0,deadline=now()+Math.max(.1,budgetMs);
    while(cursor<out.h){if(stop&&stop())return {dst:out,cancelled:true,yields};
      warpAt(src,out,cursor,cursor+1,strength,1);cursor++;
      if(now()>=deadline){yields++;await yieldTask();deadline=now()+Math.max(.1,budgetMs);}
    }return {dst:out,cancelled:false,yields};
  }
  function compare(a,b){const da=a.data||a,db=b.data||b;if(da.length!==db.length)return {equal:false,different:Math.max(da.length,db.length),maxDifference:255};
    let diff=0,max=0,sum=0;for(let i=0;i<da.length;i++){const d=Math.abs(da[i]-db[i]);if(d){diff++;if(d>max)max=d;sum+=d;}}
    return {equal:diff===0,different:diff,maxDifference:max,meanAbsoluteDifference:sum/da.length};
  }
  return {image,clone,fixture,strokePoints,strokeSync,strokeChunked,fillBfs,fillScanline,blurDirect,blurSeparable,polygonPath,lassoPoint,lassoScanline,warpFull,warpPreview,warpChunked,compare,now};
});
