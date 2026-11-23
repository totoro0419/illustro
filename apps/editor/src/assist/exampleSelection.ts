type Example=Readonly<{x:number;y:number;include:boolean}>;
type Feature=[number,number,number,number];
type Model=Readonly<{mean:Feature;variance:Feature}>;
const feature=(source:Uint8Array,index:number):Feature=>{
  const i=index*4,alpha=source[i+3]!/255,r=source[i]!*alpha,g=source[i+1]!*alpha,b=source[i+2]!*alpha;
  return [(.2126*r+.7152*g+.0722*b),.7*(r-g),.7*(b-g),alpha*255];
};

function train(source:Uint8Array,width:number,height:number,example:Example):Model{
  const center=feature(source,example.y*width+example.x),sum:Feature=[0,0,0,0],squares:Feature=[0,0,0,0];
  let total=0;
  for(let y=Math.max(0,example.y-3);y<=Math.min(height-1,example.y+3);y++){
    for(let x=Math.max(0,example.x-3);x<=Math.min(width-1,example.x+3);x++){
      const point=feature(source,y*width+x),distance=point.reduce((d,value,i)=>d+(value-center[i]!)**2,0);
      // Samples across a strong edge contribute very little to this example.
      const weight=Math.exp(-distance/1500)/(1+(x-example.x)**2+(y-example.y)**2);
      total+=weight;
      for(let i=0;i<4;i++){sum[i]=sum[i]!+weight*point[i]!;squares[i]=squares[i]!+weight*point[i]!**2;}
    }
  }
  const mean=sum.map(value=>value/total) as Feature;
  return {mean,variance:squares.map((value,i)=>Math.max(64,value/total-mean[i]!**2)) as Feature};
}

function distance(point:Feature,models:Model[]){
  let best=Infinity;
  for(const {mean,variance} of models){
    let score=0;
    for(let i=0;i<4;i++)score+=(point[i]!-mean[i]!)**2/variance[i]!+Math.log(variance[i]!);
    best=Math.min(best,score);
  }
  return best;
}

/** Learn foreground/background color distributions from user-labelled examples in this work. */
export function selectFromExamples(source:Uint8Array,width:number,height:number,samples:readonly Example[],
  confidence:number,coverage?:Uint8Array):{alpha:Uint8Array<ArrayBuffer>;count:number}{
  const foreground:Model[]=[],background:Model[]=[];
  if(samples.length<2||samples.length>16||!Number.isFinite(confidence))throw Error('残す例と外す例を1つずつ指定してください。');
  for(const sample of samples){
    const {x,y,include}=sample;
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=width||y<0||y>=height||
      typeof include!=='boolean'||coverage?.[y*width+x]===0)throw Error('解析する範囲の内側に例を指定してください。');
    (include?foreground:background).push(train(source,width,height,sample));
  }
  if(!foreground.length||!background.length)throw Error('残す例と外す例を1つずつ指定してください。');
  const margin=(Math.min(100,Math.max(0,confidence))-50)/4;
  const result=new Uint8Array(width*height);
  let count=0;
  const stride=Math.max(1,Math.ceil(Math.sqrt(width*height/1000000)));
  // Fit at full resolution, then reuse classification for nearly uniform cells.
  // Edge cells keep individual pixels and never inherit an unrelated tile color.
  const gridDistance=(a:Feature,b:Feature)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2])+Math.abs(a[3]-b[3]);
  function selected(value:Feature){
    return distance(value,background)-distance(value,foreground)>margin;
  }
  for(let y=0;y<height;y+=stride)for(let x=0;x<width;x+=stride){
    const endX=Math.min(x+stride,width),endY=Math.min(y+stride,height);
    const center=feature(source,((y+endY)>>1)*width+((x+endX)>>1));
    const chosen=selected(center);
    for(let py=y;py<endY;py++)for(let px=x;px<endX;px++){
      const at=py*width+px,value=feature(source,at),a=coverage?.[at]??255;
      if(a&&(stride>1&&gridDistance(value,center)>8?selected(value):chosen)){result[at]=a;count++;}
    }
  }
  // Explicit corrections take precedence over any uncertain classification.
  for(const sample of samples){
    const at=sample.y*width+sample.x,a=sample.include?coverage?.[at]??255:0;
    count+=Number(!!a)-Number(!!result[at]);result[at]=a;
  }
  return {alpha:result,count};
}
export type SelectionExample=Example;
