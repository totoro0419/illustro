import {describe,expect,it} from 'vitest';
import {ORBIT_WHEEL,orbitHueRegion,orbitHuePaths,orbitHueAtPoint} from './orbitGeometry';

describe('Orbit painted wheel hit geometry',()=>{
 const r=ORBIT_WHEEL;
 it('uses one wheel geometry for render and SVG hit paths',()=>{
  const {top,front}=orbitHuePaths();
  expect(top).toContain(String(r.outerX));
  expect(front).toContain('L '+(r.cx+r.outerX)+' '+(r.cy+r.depth));
 });
 it('accepts the upper colored band throughout its ellipse',()=>{
  for(let angle=185;angle<=355;angle+=5){
   const a=angle*Math.PI/180;
   for(const t of [.02,.08,.5,.92,.98]){
    const x=r.cx+(r.innerX+(r.outerX-r.innerX)*t)*Math.cos(a);
    const y=r.cy+(r.innerY+(r.outerY-r.innerY)*t)*Math.sin(a);
    expect(orbitHueRegion(x,y)).toBe('rotate');
   }
  }
 });
 it('accepts the lower colored band and visible outer face',()=>{
  for(let angle=5;angle<=175;angle+=5){
   const a=angle*Math.PI/180;
   for(const t of [.02,.5,.98]){
    const x=r.cx+(r.innerX+(r.outerX-r.innerX)*t)*Math.cos(a);
    const y=r.cy+(r.innerY+(r.outerY-r.innerY)*t)*Math.sin(a);
    expect(orbitHueRegion(x,y)).toBe('slide');
   }
   const x=r.cx+r.outerX*Math.cos(a);
   // The actual outer visible face continues below the ellipse.
   const atX=r.cy+r.outerY*Math.sqrt(1-((x-r.cx)/r.outerX)**2);
   expect(orbitHueRegion(x,atX+r.depth*.5)).toBe('slide');
  }
 });
 it('leaves the visible SV hole and blank workspace unclaimed',()=>{
  for(const [x,y] of [
   [r.cx,r.cy],[r.cx,r.cy-r.innerY*.5],
   [r.cx,r.cy+r.innerY*.5],[r.cx,r.cy-r.outerY-4],
   [r.cx+r.outerX+6,r.cy],[r.cx,r.cy+r.outerY+r.depth+3],
   [0,0],[r.width,r.height]
  ] as const) expect(orbitHueRegion(x,y)).toBeNull();
 });
 it('short taps select the painted hue on every radius, without distorting the ellipse',()=>{
  for(const current of [0,67,280])for(const angle of [-160,-135,-90,-45,0,30,65,90,145,180]){
   const radians=angle*Math.PI/180;
   for(const t of [.05,.45,.95]){
    const x=r.cx+(r.innerX+(r.outerX-r.innerX)*t)*Math.cos(radians);
    const y=r.cy+(r.innerY+(r.outerY-r.innerY)*t)*Math.sin(radians);
    const expected=((current+angle-90)%360+360)%360;
    const actual=orbitHueAtPoint(current,x,y);
    const error=Math.abs(((actual-expected+540)%360)-180);
    expect(error).toBeLessThan(.02);
   }
  }
 });
 it('short taps on the near outer side select its drawn hue, not its depth-shifted Y angle',()=>{
  for(const degrees of [15,50,90,135,165]){
   const a=degrees*Math.PI/180;
   const x=r.cx+r.outerX*Math.cos(a);
   const outerBottom=r.cy+r.outerY*Math.sin(a);
   const actual=orbitHueAtPoint(0,x,outerBottom+r.depth*.5);
   const expected=((degrees-90)%360+360)%360;
   expect(Math.abs(((actual-expected+540)%360)-180)).toBeLessThan(.01);
  }
 });
});
