export type GuidePoint=Readonly<{x:number;y:number}>;
export type ArtworkGuide=Readonly<{
  id:string;name:string;
  kind:'straight'|'parallel'|'circle'|'ellipse'|'grid'|'isometric'|'perspective'|'perspective2'|'perspective3';
  origin:GuidePoint;vanishing:readonly GuidePoint[];activeAxis:number;
  angle:number;rx:number;ry:number;spacing:number;strength:number;range:number;enabled:boolean;locked:boolean;applyEraser:boolean;
}>;

export function validateArtworkGuides(value:unknown):readonly ArtworkGuide[]{
  const error=()=>Error('保存された定規の設定が正しくありません。');
  if(!Array.isArray(value)||value.length>48)throw error();
  const ids=new Set<string>();
  const within=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  const point=(p:GuidePoint)=>{
    if(!p||!within(p.x,-100000,100000)||!within(p.y,-100000,100000))throw error();
    return Object.freeze({x:p.x,y:p.y});
  };
  return Object.freeze(value.map((guide:ArtworkGuide)=>{
    if(!guide||typeof guide.id!=='string'||!guide.id||guide.id.length>100||ids.has(guide.id)||
      typeof guide.name!=='string'||!guide.name.trim()||guide.name.length>80||
      !['straight','parallel','circle','ellipse','grid','isometric','perspective','perspective2','perspective3'].includes(guide.kind)||
      !within(guide.angle,-360,360)||!within(guide.rx,1,8192)||!within(guide.ry,1,8192)||!within(guide.spacing,1,4096)||
      !within(guide.strength,0,1)||!within(guide.range,0,1024)||
      !Array.isArray(guide.vanishing)||guide.vanishing.length!==2||
      !Number.isInteger(guide.activeAxis)||guide.activeAxis<0||guide.activeAxis>(guide.kind==='perspective3'?2:guide.kind==='perspective2'?1:0)||
      typeof guide.enabled!=='boolean'||typeof guide.locked!=='boolean'||typeof guide.applyEraser!=='boolean')throw error();
    ids.add(guide.id);
    return Object.freeze({
      id:guide.id,name:guide.name.trim(),kind:guide.kind,origin:point(guide.origin),
      vanishing:Object.freeze(guide.vanishing.map(point)),activeAxis:guide.activeAxis,
      angle:guide.angle,rx:guide.rx,ry:guide.ry,spacing:guide.spacing,strength:guide.strength,range:guide.range,
      enabled:guide.enabled,locked:guide.locked,applyEraser:guide.applyEraser
    });
  }));
}
