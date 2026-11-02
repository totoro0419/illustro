import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {orbitRegion,orbitHueAtPoint,ORBIT} from '../app/color-pickers.mjs';
import {flipAtDocumentCenter,docToScreen,screenToDoc} from '../app/model.mjs';
const eq=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,JSON.stringify({a,b,tolerance}));
test('Old Orbit ring painted geometry: back, front and hole',()=>{
 const r=ORBIT;
 assert.equal(orbitRegion(r.cx,r.cy),null);
 assert.equal(orbitRegion(r.cx,r.cy-(r.outerY+r.innerY)/2), 'rotate');
 assert.equal(orbitRegion(r.cx,r.cy+(r.outerY+r.innerY)/2), 'slide');
 const color=orbitHueAtPoint(45,r.cx+r.outerX,r.cy);
 eq(color,315,.02);
});
test('Flip anchor is document centre regardless of rotation and scale',()=>{
 const v={x:185.5,y:20.25,scale:.85,rotation:37,flipX:false,flipY:false},point={x:800,y:600};
 const anchor=docToScreen(point,v);
 const x=flipAtDocumentCenter(v,1600,1200,{flipX:true}),xy=flipAtDocumentCenter(x,1600,1200,{flipY:true});
 for(const w of [x,xy]){const same=docToScreen(point,w);eq(same.x,anchor.x);eq(same.y,anchor.y);const recovered=screenToDoc(anchor,w);eq(recovered.x,point.x);eq(recovered.y,point.y);}
 const back=flipAtDocumentCenter(xy,1600,1200,{flipX:false,flipY:false});
 eq(back.x,v.x);eq(back.y,v.y);assert.equal(back.flipX,false);assert.equal(back.flipY,false);
});
