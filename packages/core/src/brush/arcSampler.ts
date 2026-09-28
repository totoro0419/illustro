import type { OpaqueRoundBrushV1 } from './style';

const MAX_DABS_PER_SEGMENT=1_000_000;

export class ArcLengthDabSampler{
  private initialized=false;
  private lastX=0;
  private lastY=0;
  private lastDiameter=0;
  private untilNext=0;

  constructor(readonly style:OpaqueRoundBrushV1){}

  push(x:number,y:number,diameter:number,emit:(x:number,y:number,diameter:number)=>void):number{
    if(!this.initialized){
      this.initialized=true;
      this.lastX=x;this.lastY=y;this.lastDiameter=diameter;this.untilNext=this.style.spacingPx;
      emit(x,y,diameter);
      return 1;
    }

    const startX=this.lastX,startY=this.lastY,startDiameter=this.lastDiameter;
    const dx=x-startX,dy=y-startY,length=Math.hypot(dx,dy);
    let emitted=0;

    if(length>0){
      let consumed=0;
      while(length-consumed+Number.EPSILON>=this.untilNext){
        if(emitted>=MAX_DABS_PER_SEGMENT)throw new Error('dab budget exceeded for one segment');
        const distance=consumed+this.untilNext;
        const t=Math.min(1,distance/length);
        emit(
          startX+dx*t,
          startY+dy*t,
          startDiameter+(diameter-startDiameter)*t,
        );
        emitted++;
        consumed=distance;
        this.untilNext=this.style.spacingPx;
      }
      this.untilNext-=length-consumed;
      if(this.untilNext<=Number.EPSILON)this.untilNext=this.style.spacingPx;
    }

    this.lastX=x;this.lastY=y;this.lastDiameter=diameter;
    return emitted;
  }
}
