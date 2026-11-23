type Point=Readonly<{x:number;y:number}>;

/** Bresenham cells, visited once per stroke. Integer-aligned without smoothing. */
export function pixelStroke(points:readonly Point[],width:number,height:number,limit=500000){
  const pixels=new Set<number>();
  const add=(x:number,y:number)=>{
    if(x>=0&&x<width&&y>=0&&y<height)pixels.add(y*width+x);
  };
  const coords=(point:Point)=>({
    x:Math.floor(Math.max(-width,Math.min(2*width,point.x))),
    y:Math.floor(Math.max(-height,Math.min(2*height,point.y))),
  });
  let previous:Point|null=null,walked=0;
  for(const point of points){
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
    const next=coords(point);
    if(!previous){add(next.x,next.y);previous=next;continue;}
    let {x,y}=previous;
    const dx=Math.abs(next.x-x),dy=-Math.abs(next.y-y),sx=x<next.x?1:-1,sy=y<next.y?1:-1;
    let error=dx+dy;
    while(x!==next.x||y!==next.y){
      const doubled=error*2;
      if(doubled>=dy){error+=dy;x+=sx;}
      if(doubled<=dx){error+=dx;y+=sy;}
      add(x,y);
      if(++walked>limit)throw Error('一筆が長すぎます。線を分けて描いてください。');
    }
    previous=next;
  }
  return pixels;
}

export function applyPixelCell(bytes:Uint8Array|Uint8ClampedArray,at:number,
  color:readonly number[],coverage:number,erase:boolean,alphaLocked:boolean){
  const previous=bytes[at+3]!/255;
  if(coverage<=0||alphaLocked&&(erase||!previous))return false;
  const opacity=alphaLocked?previous:erase?previous*(1-coverage):coverage+previous*(1-coverage);
  const mix=alphaLocked?coverage:opacity?coverage/opacity:0;
  const values=erase
    ?[...(Math.round(opacity*255)?bytes.slice(at,at+3):[0,0,0]),Math.round(opacity*255)]
    :[...color.map((c,i)=>Math.round(c*mix+bytes[at+i]!*(1-mix))),Math.round(opacity*255)];
  if(values.every((value,index)=>value===bytes[at+index]))return false;
  bytes.set(values,at);
  return true;
}
