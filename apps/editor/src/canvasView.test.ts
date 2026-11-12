import {describe,it,expect} from 'vitest';
import {CanvasView} from './canvasView';
describe('M08 Canvas View',()=>{
 it('keeps document pixels independent of screen density',()=>{const v=new CanvasView(3000,2000);v.resize(900,600);expect(v.zoom).toBeCloseTo(.3);expect(v.documentWidth).toBe(3000);expect(v.uniform(2250,1500)[0]).toBe(2250);});
 it('round trips non-integer zoom, rotation, pan and dual flip',()=>{const v=new CanvasView(2560,1440);v.resize(789,531);v.pan(17.25,-33.5);v.setZoom(1.37);v.rotateAt(Math.PI/7,{x:90,y:247});v.toggleFlip('x');v.toggleFlip('y');const p={x:1321.25,y:735.75},q=v.document(v.screen(p));expect(q.x).toBeCloseTo(p.x,8);expect(q.y).toBeCloseTo(p.y,8);});
 it('holds the fingertip anchor through zoom and rotation',()=>{const v=new CanvasView(2048,1536);v.resize(700,530);const focus={x:183.25,y:77.75},before=v.document(focus);v.zoomAt(2.43,focus);v.rotateAt(.8,focus);const after=v.document(focus);expect(after.x).toBeCloseTo(before.x,8);expect(after.y).toBeCloseTo(before.y,8);});
 it('does not mutate artwork when fitting or flipping',()=>{const v=new CanvasView(512,384);v.resize(240,180);const before=v.documentWidth*v.documentHeight;v.toggleFlip('y');v.fit();expect(v.documentWidth*v.documentHeight).toBe(before);expect(v.flipY).toBe(true);});
 it('maps full-size document pixels sharply on integer device pixel grids',()=>{
  const v=new CanvasView(512,384);v.resize(800,600);v.setZoom(1);
  expect(v.uniform(1600,1200)[13]).toBe(1);
  v.setZoom(1.37);expect(v.uniform(1600,1200)[13]).toBe(0);
  v.setZoom(1);v.setRotation(Math.PI/6);expect(v.uniform(1600,1200)[13]).toBe(0);
 });
});
