import {describe,expect,it} from 'vitest';
import type {EditableArtwork,EditableText} from '@illustro/core';
import {canRenderTextInArtworkWorker} from './textWorkerSafety';
const base:EditableText={
 kind:'text',text:'試験 Test',family:'sans-serif',size:24,color:'#121212',
 origin:{x:2,y:3},align:'left',vertical:false,spacing:0,lineHeight:1.2
};
describe('C10-011 compatibility-preserving worker text policy',()=>{
 it('requires every imported partial font and supports generic text with imported ranges',()=>{
  const mixed={...base,fontAsset:'a',family:'IllustroFont-a',styleRanges:[{start:0,end:1,fontAsset:'b'}]};
  expect(canRenderTextInArtworkWorker(mixed,['IllustroFont-a'])).toBe(false);
  expect(canRenderTextInArtworkWorker(mixed,['IllustroFont-a','IllustroFont-b'])).toBe(true);
  expect(canRenderTextInArtworkWorker({...base,styleRanges:[{start:0,end:1,fontAsset:'b'}]},['IllustroFont-b'])).toBe(true);
 });
 it('allows only standard system-generic families without imported font attachments',()=>{
  expect(canRenderTextInArtworkWorker(base)).toBe(true);
  expect(canRenderTextInArtworkWorker({...base,family:'serif'})).toBe(true);
  expect(canRenderTextInArtworkWorker({...base,family:'monospace'})).toBe(true);
 });
 it('keeps imported fonts and names that may differ between worker and document on the main thread',()=>{
  expect(canRenderTextInArtworkWorker({...base,fontAsset:'asset-1'})).toBe(false);
  expect(canRenderTextInArtworkWorker({...base,family:'Noto Sans CJK JP'})).toBe(false);
  expect(canRenderTextInArtworkWorker({...base,family:'Arial'})).toBe(false);
 });
 it('never sends vector shapes or gradients through the text-specific font path',()=>{
  const vector:EditableArtwork={kind:'path',shape:'polyline',points:[{x:0,y:0},{x:1,y:1}],
   stroke:'#000000',fill:null,width:2,closed:false};
  expect(canRenderTextInArtworkWorker(vector)).toBe(false);
 });
 it('allows an imported font only after its exact family has been prepared',()=>{
  const imported={...base,fontAsset:'asset-1',family:'IllustroFont-asset-1'};
  expect(canRenderTextInArtworkWorker(imported,'IllustroFont-asset-1')).toBe(true);
  expect(canRenderTextInArtworkWorker(imported,'IllustroFont-other')).toBe(false);
  expect(canRenderTextInArtworkWorker({...imported,family:'serif'},'IllustroFont-asset-1')).toBe(false);
 });
});
