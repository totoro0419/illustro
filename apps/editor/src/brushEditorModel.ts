import type {Curve,FoundationPreset} from '@illustro/brush-rt';

/** UI-only helpers. These never modify artwork or a stored preset in place. */
export function sameEditableBrush(a:FoundationPreset,b:FoundationPreset):boolean {
 const left=structuredClone(a),right=structuredClone(b);
 // The foreground color belongs to the Color panel, not the selected brush preset.
 left.color=[0,0,0];right.color=[0,0,0];
 return JSON.stringify(left)===JSON.stringify(right);
}
export function curveAt(curve:Curve,x:number):number {
 if(!Number.isFinite(x))throw Error('invalid curve input');
 const t=Math.max(0,Math.min(1,x));
 for(let i=1;i<curve.length;i++){
  const a=curve[i-1]!,b=curve[i]!;
  if(t<=b[0])return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]);
 }
 return curve[curve.length-1]?.[1]??1;
}
export function addCurvePoint(curve:Curve,x:number,y=curveAt(curve,x)):Curve{
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<=0||x>=1||y<0||y>1||curve.length>=128)throw Error('invalid curve point');
 if(curve.some(pair=>Math.abs(pair[0]-x)<.001))throw Error('制御点が近すぎます');
 return [...curve,[x,y] as const].sort((a,b)=>a[0]-b[0]);
}
export function moveCurvePoint(curve:Curve,index:number,x:number,y:number):Curve{
 if(index<0||index>=curve.length||!Number.isFinite(x)||!Number.isFinite(y)||y<0||y>1)throw Error('invalid curve point');
 const points=curve.map(pair=>[pair[0],pair[1]] as [number,number]);
 // Endpoint input positions are fixed by Foundation v2.
 if(index>0&&index<curve.length-1){
  if(x<=points[index-1]![0]+.0001||x>=points[index+1]![0]-.0001)throw Error('制御点の順番は入れ替えられません');
  points[index]![0]=x;
 }
 points[index]![1]=y;
 return points;
}
export function removeCurvePoint(curve:Curve,index:number):Curve{
 if(index<=0||index>=curve.length-1)throw Error('始点と終点は削除できません');
 return curve.filter((_,i)=>i!==index);
}
