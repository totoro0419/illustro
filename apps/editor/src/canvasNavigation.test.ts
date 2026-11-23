import {expect,it,vi} from 'vitest';
import {CanvasNavigation} from './canvasNavigation';
import {CanvasView} from './canvasView';

it('moves a shared canvas point with a touch gesture while the document coordinates stay fixed',()=>{
  const view=new CanvasView(500,400);view.resize(600,500);
  const begin=vi.fn(),change=vi.fn(),finish=vi.fn(),navigation=new CanvasNavigation(view,begin,change,finish);
  const anchor=view.document({x:250,y:250});
  navigation.touchDown(1,{x:200,y:250},true);
  navigation.touchDown(2,{x:300,y:250},true);
  navigation.touchMove(2,{x:360,y:300});
  const now=view.screen(anchor);
  expect(now.x).toBeCloseTo(280);
  expect(now.y).toBeCloseTo(275);
  expect(view.rotation).toBeGreaterThan(0);
  expect(view.zoom).toBeGreaterThan(1.2);
  expect(view.document(now)).toMatchObject({x:expect.closeTo(anchor.x),y:expect.closeTo(anchor.y)});
  navigation.touchUp(2);navigation.touchUp(1);
  expect(begin).toHaveBeenCalledOnce();
  expect(change).toHaveBeenCalledOnce();
  expect(finish).toHaveBeenCalledOnce();
});
