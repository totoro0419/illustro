import {describe,it,expect} from 'vitest';
import {ForegroundColor,exportPalette,fromHex,hex,hslToRgb,hsvToRgb,parsePalette,rgb,rgbToHsl,rgbToHsv} from './model';

describe('M09 RGB, HSV, HSL and exact input',()=>{
 it('round trips HSV and HSL without accumulated drift',()=>{
  for(let n=0;n<3000;n++){
   const r=(n%61)/60,g=(Math.floor(n/61)%49)/48,b=(Math.floor(n/299)%19)/18;
   const color=rgb(r,g,b),hsv=rgbToHsv(color),hsl=rgbToHsl(color);
   const a=hsvToRgb(hsv.h,hsv.s,hsv.v),d=hslToRgb(hsl.h,hsl.s,hsl.l);
   for(const channel of ['r','g','b'] as const){expect(Math.abs(a[channel]-color[channel])).toBeLessThan(2e-12);expect(Math.abs(d[channel]-color[channel])).toBeLessThan(2e-12);}
  }
 });
 it('supports all RGB corners and HEX exact values',()=>{
  for(const code of ['#FF0000','#00FF00','#0000FF','#FFFFFF','#000000','#ABCDEF']){
   const c=fromHex(code)!;expect(c).toBeTruthy();expect(hex(c)).toBe(code);
  }
  expect(fromHex('#ABC')).toBeNull();expect(fromHex('#12QQ89')).toBeNull();
  expect(hex(hsvToRgb(360,1,1))).toBe('#FF0000');
  expect(hex(hsvToRgb(120,0,0))).toBe('#000000');
 });
});

describe('M09 one foreground state and workspace palette',()=>{
 it('previews then commits once, previous and history do not enter artwork revision',()=>{
  const s=new ForegroundColor(false),initial=s.current;
  s.begin();for(let n=0;n<100;n++)s.preview(hsvToRgb(n,1,1));
  expect(s.history).toHaveLength(0);s.commit();expect(s.history).toHaveLength(1);
  expect(s.previous).toEqual(initial);
  s.begin();s.preview(rgb(0,0,0));s.cancel();expect(s.current).toEqual(s.history[0]);
  s.clearHistory();expect(s.history).toHaveLength(0);
 });
 it('caps 24 history colors, de-duplicates the same selection',()=>{
  const s=new ForegroundColor(false);
  for(let n=0;n<100;n++)s.choose(rgb(n/100,0,0));
  expect(s.history).toHaveLength(24);
  const c=s.history[5]!;s.choose(c);
  expect(s.history.filter(x=>hex(x)===hex(c))).toHaveLength(1);
  expect(hex(s.current)).toBe(hex(c));
 });
 it('adds/removes/reorders color swatches and selects them',()=>{
  const s=new ForegroundColor(false);
  s.createPalette('テスト');
  s.choose(rgb(1,0,0));s.addSwatch();
  s.choose(rgb(0,0,1));s.addSwatch();
  const first=s.palette.swatches[0]!.id,second=s.palette.swatches[1]!.id;
  s.moveSwatch(first,1);expect(s.palette.swatches.map(x=>x.id)).toEqual([second,first]);
  s.removeSwatch(first);expect(s.palette.swatches).toHaveLength(1);
 });
 it('imports the exported palette with exact name, order and channel values',()=>{
  const a=new ForegroundColor(false);a.createPalette('往復検証');
  for(const code of ['#FF0000','#804020','#0000FF']){a.choose(fromHex(code)!);a.addSwatch();}
  const exported=exportPalette(a.palette),b=new ForegroundColor(false);b.importPalette(exported);
  expect(b.palette.name).toBe('往復検証');
  expect(b.palette.swatches.map(s=>hex(s.color))).toEqual(['#FF0000','#804020','#0000FF']);
  expect(b.palette.swatches.map(s=>s.id)).toEqual(a.palette.swatches.map(s=>s.id));
 });
 it('rejects malformed, enormous, duplicate-ID and invalid-channel payloads',()=>{
  const x={format:'illustro-palette',version:1,name:'Test',swatches:[{id:'1',color:{space:'srgb',channels:[1,0,0]}}]};
  expect(()=>parsePalette('bad json')).toThrow();
  expect(()=>parsePalette(' '.repeat(270000))).toThrow();
  expect(()=>parsePalette(JSON.stringify({...x,version:2}))).toThrow();
  expect(()=>parsePalette(JSON.stringify({...x,swatches:[x.swatches[0],x.swatches[0]]}))).toThrow();
  expect(()=>parsePalette(JSON.stringify({...x,swatches:[{id:'1',color:{space:'srgb',channels:[2,0,0]}}]}))).toThrow();
  expect(()=>parsePalette(JSON.stringify({...x,swatches:Array.from({length:257},(_,i)=>({id:String(i),color:{space:'srgb',channels:[1,0,0]}}))}))).toThrow();
 });
});
