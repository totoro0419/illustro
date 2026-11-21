import {afterEach,describe,expect,it,vi} from 'vitest';
import {nextLinkedImageFileKey,readLinkedFile,rememberImageHandle} from './linkedImages';

afterEach(()=>{vi.unstubAllGlobals();});

describe('C07-005/006 external image references',()=>{
 it('keeps the same key for an automatic check so existing saved access works',()=>{
  const make=vi.fn(()=> 'new-key');
  expect(nextLinkedImageFileKey('update','old-key',make)).toBe('old-key');
  expect(make).not.toHaveBeenCalled();
  expect(()=>nextLinkedImageFileKey('update',null,make)).toThrow(/参照先/);
 });
 it('rotates the key for manual re-selection even if the previous file has the same name',()=>{
  const make=vi.fn(()=> 'fresh-key');
  expect(nextLinkedImageFileKey('reselect','old-key',make)).toBe('fresh-key');
  expect(make).toHaveBeenCalledOnce();
  expect(nextLinkedImageFileKey('link',null,make)).toBe('fresh-key');
  expect(()=>nextLinkedImageFileKey('reselect','old-key',()=> 'old-key')).toThrow(/新しい参照先/);
 });
 it('reads newly selected file, not the previous handle, after source-key rotation',async()=>{
  // Simulate a browser that allows the file handle during this session but
  // refuses its IndexedDB persistence. Either way, a reselected layer points
  // only at the new key and can never load the old file on update.
  vi.stubGlobal('indexedDB',{open:()=>{throw Error('storage blocked');}});
  const old={name:'prior.png'} as File,newFile={name:'replacement.png'} as File;
  const oldHandle={getFile:vi.fn(async()=>old)},newHandle={getFile:vi.fn(async()=>newFile)};
  await rememberImageHandle('old-c07-006',oldHandle);
  const current=nextLinkedImageFileKey('reselect','old-c07-006',()=> 'new-c07-006');
  expect(await rememberImageHandle(current,newHandle)).toBe(false);
  expect(await readLinkedFile(current)).toBe(newFile);
  expect(await readLinkedFile('old-c07-006')).toBe(old);
  expect(oldHandle.getFile).toHaveBeenCalledOnce();
  expect(newHandle.getFile).toHaveBeenCalledOnce();
 });
});
