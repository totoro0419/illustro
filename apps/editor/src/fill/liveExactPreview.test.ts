import {describe,expect,it} from 'vitest';
import {ExactColorFillPreview,type LiveFillContext} from './liveExactPreview';
import {colorMask,type FillSettings} from './pixels';

const settings:FillSettings={method:'color',tolerance:0,alphaTolerance:0,gap:0,opacity:1,
 color:'#ff0000',erase:false,contiguous:true,closedOnly:false};
function image(width:number,height:number){
 const source=new Uint8Array(width*height*4).fill(255);
 return {source,target:null,width,height,selection:null,alphaLocked:false,asSelection:false} satisfies LiveFillContext;
}
describe('C08-003 exact color-fill gesture range',()=>{
 it('keeps a one-pixel divider before reducing the display and adds crossed regions',()=>{
  const input=image(1025,3);
  for(let y=0;y<3;y++)input.source.set([0,0,0,255],(y*1025+512)*4);
  const live=new ExactColorFillPreview(input);
  const first=live.render(settings,[{x:0,y:1}],64);
  expect(first.mask.alpha[511]).toBe(255);expect(first.mask.alpha[512]).toBe(0);
  expect(first.mask.alpha[513]).toBe(0);expect(first.preview.width).toBe(64);
  expect(first.preview.pixels[(63)*4+3]).toBe(0);
  const crossed=live.render(settings,[{x:0,y:1},{x:1024,y:1}],64);
  expect(crossed.mask.alpha[513]).toBe(255);expect(crossed.mask.alpha[512]).toBe(0);
 });
 it('applies soft selection, destination conditions, expansion and antialias at full resolution',()=>{
  const base=image(7,5),target=new Uint8Array(7*5*4);
  target.set([0,0,255,255],(2*7+2)*4);
  const alpha=new Uint8Array(35);alpha[2*7+1]=128;alpha[2*7+2]=255;
  const live=new ExactColorFillPreview({...base,target,selection:{width:7,height:5,alpha}});
  const result=live.render({...settings,condition:'transparent',edge:2,edgeShape:'round',antialias:true},[{x:1,y:2}]);
  expect(result.mask.alpha[2*7+1]).toBe(128);expect(result.mask.alpha[2*7+2]).toBe(0);
  expect(result.mask.alpha.filter(Boolean)).toHaveLength(1);
  const painted=colorMask(target,result.mask,settings,false);
  expect(painted[(2*7+1)*4+3]).toBe(128);expect(painted[(2*7+2)*4+2]).toBe(255);
  expect(result.preview.pixels[(2*7+1)*4+3]).toBe(56);
  const selected=new ExactColorFillPreview({...base,asSelection:true,selection:{width:7,height:5,alpha}})
   .render(settings,[{x:1,y:2}]);
  expect(selected.mask.alpha.every(value=>value===255)).toBe(true);
 });
 it('shows only paintable alpha-locked pixels and hides impossible erasing',()=>{
  const base=image(2,1),target=new Uint8Array([0,0,255,128,0,0,0,0]);
  const live=new ExactColorFillPreview({...base,target,alphaLocked:true});
  const paint=live.render({...settings,opacity:.5},[{x:0,y:0}]);
  expect([...paint.preview.pixels.filter((_,i)=>i%4===3)]).toEqual([56,0]);
  const erase=live.render({...settings,erase:true},[{x:0,y:0}]);
  expect(erase.preview.pixels.filter((_,i)=>i%4===3).every(value=>!value)).toBe(true);
 });
});
