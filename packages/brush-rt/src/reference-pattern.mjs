export function makeReferencePattern(){
 const n=512,a=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const cx=x>>7,cy=y>>7,xx=x&127,yy=y&127;let red=255,green=255,blue=255,alpha=255;
  if(cy===0&&cx===0){const v=(xx^yy)&1?20:245;red=green=blue=v;}
  else if(cy===0&&cx===1){const v=Math.abs(xx-yy)<=0?0:255;red=green=blue=v;}
  else if(cy===0&&cx===2){const v=(xx%4<2)?0:255;red=green=blue=v;}
  else if(cy===0&&cx===3){red=xx*2;green=255-xx*2;blue=128;}
  else if(cy===1&&cx===0){const v=((xx+yy)%6<2)?20:245;red=green=blue=v;}
  else if(cy===1&&cx===1){const d=Math.hypot(xx-64,yy-64);const v=(Math.floor(d/2)%2===0)?30:240;red=green=blue=v;}
  else if(cy===1&&cx===2){red=255;green=xx<64?32:244;blue=yy<64?28:244;}
  else if(cy===1&&cx===3){alpha=xx<64?128:255;red=alpha;green=0;blue=alpha/2;}
  else if(cy===2){const v=((xx+2*yy)%7<2)?0:255;red=green=blue=v;}
  else {const v=Math.min(255,Math.max(0,Math.round(xx*2)));red=v;green=(yy*2)&255;blue=255-v;}
  const i=(y*n+x)*4;a[i]=red;a[i+1]=green;a[i+2]=blue;a[i+3]=alpha;
 }
 return a;
}
