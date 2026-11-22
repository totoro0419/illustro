export type CurvePoint=Readonly<{x:number;y:number}>;
export const MAX_CURVE_POINTS=16;

export function readCurve(input:unknown):CurvePoint[]|null{
  if(!Array.isArray(input)||input.length<2||input.length>MAX_CURVE_POINTS)return null;
  const points:CurvePoint[]=[];
  for(const point of input){
    if(!point||!Number.isInteger(point.x)||!Number.isInteger(point.y)||
      point.x<0||point.x>255||point.y<0||point.y>255||(points.at(-1)?.x??-1)>=point.x)return null;
    points.push({x:point.x,y:point.y});
  }
  return points[0]!.x===0&&points.at(-1)!.x===255?points:null;
}

export function curveFromLegacy(values:readonly number[]){
  return readCurve([{x:0,y:0},{x:values[1],y:values[2]},{x:values[3],y:values[4]},{x:values[5],y:values[6]},{x:255,y:255}]);
}

export function curveTable(points:readonly CurvePoint[]){
  let right=1;
  return Uint8ClampedArray.from({length:256},(_,x)=>{
    while(x>points[right]!.x)right++;
    const a=points[right-1]!,b=points[right]!;
    return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
  });
}
