import test from 'node:test';
import assert from 'node:assert/strict';
import {publishDocumentGroupsAtomically} from '../src/atomic-document-groups.mjs';

// Minimal DOM model: visibility is the parent group's attached children.
// A detached canvas may receive bitmaps without changing the current image.
class FakeElement {
 constructor(kind){this.kind=kind;this.style={};this.width=0;this.height=0;this.children=[];this.parent=null;this.image=null;}
 getContext(type){
  assert.equal(type,'bitmaprenderer');
  return {transferFromImageBitmap:bitmap=>{this.image=bitmap.id;bitmap.close();}};
 }
 append(element){element.parent=this;this.children.push(element);}
 replaceWith(element){
  assert.ok(this.parent,'Only attached groups may be replaced');
  const siblings=this.parent.children,i=siblings.indexOf(this);
  assert.ok(i>=0);siblings[i]=element;element.parent=this.parent;this.parent=null;
 }
}
globalThis.document={createElement:kind=>new FakeElement(kind)};
const snapshot=owner=>owner.element.children.map(item=>item.image);
const group=(key,image,x=0)=>({key,x,y:0,w:64,h:64,bitmap:{id:image,width:64,height:64,closed:false,close(){this.closed=true;}}});
const createOwner=()=>({tiles:new Map,element:new FakeElement('div'),bytes:0,peakBytes:0});

test('Undo/Redo never exposes per-group intermediate images across cooperative yields',async()=>{
 const owner=createOwner();
 await publishDocumentGroupsAtomically(owner,[group('a','old-a'),group('b','old-b'),group('c','old-c')]);
 assert.deepEqual(snapshot(owner),['old-a','old-b','old-c']);
 const publish=publishDocumentGroupsAtomically(owner,[group('a','new-a'),group('b','new-b'),group('c','new-c')]);
 await Promise.resolve(); // the first new bitmap has been staged, never displayed
 assert.deepEqual(snapshot(owner),['old-a','old-b','old-c']);
 await publish;
 assert.deepEqual(snapshot(owner),['new-a','new-b','new-c']);
 assert.equal(owner.tiles.size,3);
 assert.equal(owner.bytes,3*64*64*4);
});

test('Stale history revision is discarded with no partial DOM update',async()=>{
 const owner=createOwner();
 await publishDocumentGroupsAtomically(owner,[group('a','old-a'),group('b','old-b')]);
 let valid=true;
 const publish=publishDocumentGroupsAtomically(owner,[group('a','stale-a'),group('b','stale-b')],()=>valid);
 await Promise.resolve();valid=false;
 assert.equal(await publish,false);
 assert.deepEqual(snapshot(owner),['old-a','old-b']);
});

test('Failed staging leaves every old tile visible',async()=>{
 const owner=createOwner();
 await publishDocumentGroupsAtomically(owner,[group('a','old-a'),group('b','old-b')]);
 const invalid=group('b','wrong-size');invalid.bitmap.width=65;
 await assert.rejects(
  publishDocumentGroupsAtomically(owner,[group('a','new-a'),invalid]),
  /bitmap size changed/
 );
 assert.deepEqual(snapshot(owner),['old-a','old-b']);
 assert.equal(invalid.bitmap.closed,true);
});

test('New tiles appear together with the replaced tiles and preserve accounting',async()=>{
 const owner=createOwner();
 await publishDocumentGroupsAtomically(owner,[group('a','old-a')]);
 const update=publishDocumentGroupsAtomically(owner,[group('a','new-a'),group('b','new-b')]);
 await Promise.resolve();assert.deepEqual(snapshot(owner),['old-a']);
 assert.equal(await update,true);
 assert.deepEqual(snapshot(owner),['new-a','new-b']);
 assert.equal(owner.bytes,2*64*64*4);
});
