import {cpuReference,TILE,type StrokeRecord} from '@illustro/brush-rt';

type Job={width:number;height:number;pixels:Uint8Array;alpha:Uint8Array;records:readonly StrokeRecord[]};

self.onmessage=({data}:MessageEvent<Job>)=>{
  try{
    const {width,height,pixels,alpha,records}=data;
    let changed=false;
    for(const record of records){
      const commandsByTile=new Map<number,Array<StrokeRecord['commands'][number]>>();
      const columns=Math.ceil(width/TILE);
      for(const command of record.commands){
        const [x=0,y=0,size=0]=command;
        const connected=(command[19]??0)>0;
        const ax=connected?(command[16]??x):x,ay=connected?(command[17]??y):y;
        const radius=Math.max(size/2,command[18]??0)*(connected?1:Math.SQRT2)+2;
        const left=Math.max(0,Math.floor((Math.min(x,ax)-radius)/TILE));
        const top=Math.max(0,Math.floor((Math.min(y,ay)-radius)/TILE));
        const right=Math.min(columns,Math.ceil((Math.max(x,ax)+radius)/TILE));
        const bottom=Math.min(Math.ceil(height/TILE),Math.ceil((Math.max(y,ay)+radius)/TILE));
        for(let row=top;row<bottom;row++)for(let col=left;col<right;col++){
          const key=row*columns+col,commands=commandsByTile.get(key);
          if(commands)commands.push(command);else commandsByTile.set(key,[command]);
        }
      }
      for(const [key,commands] of commandsByTile){
        const x=(key%columns)*TILE,y=Math.floor(key/columns)*TILE;
        const w=Math.min(TILE,width-x),h=Math.min(TILE,height-y),mask=new Uint8Array(w*h);
        for(let row=0;row<h;row++){
          const offset=(y+row)*width+x;
          mask.set(alpha.subarray(offset,offset+w),row*w);
        }
        if(!mask.some(Boolean))continue;
        const base=new Uint8ClampedArray(w*h*4);
        for(let row=0;row<h;row++){
          const offset=((y+row)*width+x)*4;
          base.set(pixels.subarray(offset,offset+w*4),row*w*4);
        }
        const rendered=cpuReference({...record,commands},w,h,base,mask,x,y);
        if(!rendered.some((value,index)=>value!==base[index]))continue;
        changed=true;
        for(let row=0;row<h;row++)pixels.set(rendered.subarray(row*w*4,(row+1)*w*4),((y+row)*width+x)*4);
      }
    }
    (self as unknown as Worker).postMessage({pixels:changed?pixels:null},changed?[pixels.buffer as ArrayBuffer]:[]);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
