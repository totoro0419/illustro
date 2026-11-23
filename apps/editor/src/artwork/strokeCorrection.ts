import {toolConfirmation} from '../ui/toolConfirmation';
import {validateEditableArtwork,type ArtPoint,type EditablePath,type LayerId,type RevisionId} from '@illustro/core';
import type {StrokeRecord} from '@illustro/brush-rt';
import type {MaskData} from '../selection/mask';
import {renderArtwork} from './render';
import {button,labelledField,numberField,paintPreview,selectField} from './tools';

export type CorrectionStroke=Readonly<{record:StrokeRecord;layer:LayerId;revision:RevisionId;selection:MaskData|null}>;
export type CorrectionHold=Readonly<{delay:number;show:()=>void;released:()=>void}>;
const shapes=[['polyline','直線'],['ellipse','楕円'],['rectangle','長方形']] as const;
type CandidateShape=typeof shapes[number][0];

/** The held-pen guide and the final correction use identical shape geometry. */
export function correctionSuggestedShape(points:readonly ArtPoint[]):CandidateShape{
  if(points.length<3)return 'polyline';
  const first=points[0]!,last=points.at(-1)!,middle=points[Math.floor(points.length/2)]!;
  return Math.hypot(first.x-last.x,first.y-last.y)<
    Math.hypot(first.x-middle.x,first.y-middle.y)*.7?'ellipse':'polyline';
}
export function correctionGeometry(points:readonly ArtPoint[],shape:CandidateShape):ArtPoint[]{
  if(points.length<2)return [];
  const first=points[0]!,last=points.at(-1)!;
  if(shape==='polyline')return [{x:first.x,y:first.y},{x:last.x,y:last.y}];
  let minX=first.x,maxX=first.x,minY=first.y,maxY=first.y;
  for(const {x,y} of points){
    minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);
  }
  if(shape==='rectangle')return [
    {x:minX,y:minY},{x:maxX,y:minY},{x:maxX,y:maxY},{x:minX,y:maxY}
  ];
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2,w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY);
  return Array.from({length:64},(_,i)=>{
    const angle=2*Math.PI*i/64;
    return {x:cx+w/2*Math.cos(angle),y:cy+h/2*Math.sin(angle)};
  });
}

function fit(record:StrokeRecord,shape:CandidateShape,width:number,angle:number,scale:number):EditablePath{
  const first=record.raw[0]!,last=record.raw.at(-1)!;
  let minX=first.x,maxX=first.x,minY=first.y,maxY=first.y;
  for(const {x,y} of record.raw){
    minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);
  }
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2,w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY);
  const stroke='#'+record.preset.color.map(value=>Math.round(value*255).toString(16).padStart(2,'0')).join('');
  const rotate=({x,y}:ArtPoint):ArtPoint=>{
    const u=(x-cx)*scale,v=(y-cy)*scale,a=angle*Math.PI/180;
    return {x:cx+u*Math.cos(a)-v*Math.sin(a),y:cy+u*Math.sin(a)+v*Math.cos(a)};
  };
  const points=correctionGeometry(record.raw,shape);
  const result:EditablePath['shape']='polyline';
  return validateEditableArtwork({kind:'path',shape:result,points:points.map(rotate),closed:shape!=='polyline',
    stroke,fill:null,width,opacity:record.preset.opacity}) as EditablePath;
}

export function installStrokeCorrection(host:HTMLElement,api:{
  latest:()=>CorrectionStroke|null;
  size:()=>{width:number;height:number};
  apply:(source:CorrectionStroke,path:EditablePath)=>Promise<void>;
  restore:()=>Promise<void>;
}){
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const heading=document.createElement('summary');heading.textContent='手描き線の形状補正';
  const fields=document.createElement('div');fields.className='c06-clipboard-grid';
  const enabled=document.createElement('input'),hold=document.createElement('input');
  enabled.type=hold.type='checkbox';enabled.checked=true;
  labelledField(fields,'形状補正を使う',enabled);labelledField(fields,'ペンを止めて候補を出す',hold);
  const delay=numberField(fields,'候補が出るまで（ミリ秒）',650,250,2000,50);
  const editor=document.createElement('div');editor.className='c06-clipboard-grid';editor.hidden=true;
  const shape=selectField(editor,'候補の形',shapes);
  const width=numberField(editor,'線幅（px）',5,0.1,4096,.1);
  const angle=numberField(editor,'回転（度）',0,-360,360);
  const scale=numberField(editor,'大きさ（%）',100,1,400);
  const status=document.createElement('output');status.setAttribute('role','status');
  const preview=document.createElement('canvas');preview.hidden=true;preview.style.maxWidth='100%';
  let source:CorrectionStroke|null=null;
  const close=()=>{source=null;editor.hidden=true;preview.hidden=true;};
  const data=()=>fit(source!.record,shape.value as CandidateShape,width.valueAsNumber,angle.valueAsNumber,scale.valueAsNumber/100);
  const refresh=()=>{
    if(!source)return;
    try{
      const {width:w,height:h}=api.size(),factor=Math.min(1,260/Math.max(w,h));
      const outputWidth=Math.max(1,Math.round(w*factor)),outputHeight=Math.max(1,Math.round(h*factor));
      const pixels=renderArtwork(data(),{width:w,height:h,outputWidth,outputHeight},document.createElement('canvas'));
      paintPreview(preview,pixels,outputWidth,outputHeight);
    }catch(error){status.textContent=String(error);}
  };
  const open=(latest:CorrectionStroke)=>{
    source=latest;panel.open=true;editor.hidden=false;
    const {raw,preset}=latest.record;
    shape.value=correctionSuggestedShape(raw);
    width.value=String(Math.min(4096,preset.size));angle.value='0';scale.value='100';
    status.textContent='候補を選び、適用すると直前の一筆が置き換わります。';refresh();
  };
  const show=()=>{
    if(!enabled.checked)throw Error('形状補正を有効にしてください。');
    const latest=api.latest();
    if(!latest)throw Error('補正できる手描き線を1本描いてください。');
    open(latest);
  };
  const newCandidate=button('直前の線を補正',show,status);
  const restore=button('選んだ補正を元の手描き線に戻す',async()=>{await api.restore();close();status.textContent='元の手描き線に戻しました。';},status);
  enabled.onchange=()=>{if(!enabled.checked){close();status.textContent='形状補正をオフにしました。';}newCandidate.disabled=!enabled.checked;};
  editor.addEventListener('change',refresh);
  editor.append(toolConfirmation(button('この形を適用',async()=>{
    if(!source)throw Error('補正する線を選び直してください。');
    await api.apply(source,data());close();status.textContent='形状補正を反映しました。';
  },status),'apply'),toolConfirmation(button('取り消す',()=>{close();status.textContent='手描き線を残しました。';},status),'cancel'));
  panel.append(heading,fields,newCandidate,restore,editor,preview,status);host.append(panel);
  return {
    panel,show,
    hold:():CorrectionHold|null=>enabled.checked&&hold.checked&&delay.checkValidity()&&Number.isFinite(delay.valueAsNumber)?{
      delay:delay.valueAsNumber,
      show:()=>{panel.open=true;status.textContent='ペンを離すと形状補正の候補を表示します。';},
      released:()=>{
        const latest=api.latest();
        if(enabled.checked&&latest)open(latest);
        else status.textContent='補正できる手描き線がありません。';
      }
    }:null
  };
}
