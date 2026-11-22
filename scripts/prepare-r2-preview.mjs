import {readFileSync,writeFileSync} from 'node:fs';

// Only used in the isolated R2 preview workflow; never changes the normal build.
function replaceExactlyOnce(path, from, to) {
  const source = readFileSync(path, 'utf8');
  const first = source.indexOf(from);
  if (first < 0 || source.indexOf(from, first + from.length) >= 0) {
    throw new Error('R2 preview isolation cannot safely patch ' + path);
  }
  writeFileSync(path, source.slice(0, first) + to + source.slice(first + from.length));
}

replaceExactlyOnce(
  'apps/editor/src/persistence/workLibrary.ts',
  "indexedDB.open('illustro-work-library-v1',1)",
  "indexedDB.open('illustro-r2-preview-work-library-v1',1)",
);
replaceExactlyOnce(
  'apps/editor/src/persistence/persistence.worker.ts',
  "indexedDB.open('illustro-m05-working',1)",
  "indexedDB.open('illustro-r2-preview-working',1)",
);
replaceExactlyOnce(
  'apps/editor/src/persistence/persistence.worker.ts',
  'value.root=await storage.getDirectory();',
  "value.root=await (await storage.getDirectory()).getDirectoryHandle('illustro-r2-preview',{create:true});",
);
// IndexedDB names are origin-scoped just like localStorage.
for (const [path, name] of [
  ['assets/library.ts', 'illustro-c05-assets-v1'],
  ['assets/referenceBoardStore.ts', 'illustro-c05-reference-boards-v1'],
  ['assets/assetImportRecovery.ts', 'illustro-c05-import-recovery-v1'],
  ['assets/linkedImages.ts', 'illustro-linked-images-v1'],
  ['selection/store.ts', 'illustro-c06-selections-v1'],
]) {
  replaceExactlyOnce('apps/editor/src/' + path, "'" + name + "'", "'illustro-r2-preview-" + name.slice(9) + "'");
}
replaceExactlyOnce(
  'apps/editor/public/sw.js',
  "const CACHE_PREFIX='illustro-m05-';",
  "const CACHE_PREFIX='illustro-r2-preview-';",
);
replaceExactlyOnce(
  'apps/editor/index.html',
  '<title>Illustro</title>',
  '<meta name="robots" content="noindex,nofollow"><title>Illustro R2 preview — 開発中</title>',
);
replaceExactlyOnce(
  'apps/editor/index.html',
  '<script type="module" src="/src/main.ts"></script>',
  '<script type="module" src="/src/r2-preview-bootstrap.js"></script>',
);

// Local/session storage are origin-scoped, not URL-path-scoped.
// Prefix preview keys before any application module is imported, and fail closed.
const bootstrap = `
const app = document.getElementById('app');
try {
  const local = window.localStorage;
  const session = window.sessionStorage;
  const proto = Storage.prototype;
  const raw = {
    getItem: proto.getItem,
    setItem: proto.setItem,
    removeItem: proto.removeItem,
    clear: proto.clear,
    key: proto.key,
  };
  const namespace = (store) => store === local
    ? 'illustro-r2-preview:local:'
    : store === session ? 'illustro-r2-preview:session:' : null;
  const scopedKeys = (store, prefix) => {
    const result = [];
    for (let i = 0; i < store.length; i++) {
      const key = raw.key.call(store, i);
      if (key?.startsWith(prefix)) result.push(key);
    }
    return result;
  };
  Object.defineProperties(proto, {
    getItem: {configurable:true,writable:true,value:function(key){
      const prefix=namespace(this);
      return raw.getItem.call(this, prefix===null?key:prefix+String(key));
    }},
    setItem: {configurable:true,writable:true,value:function(key,value){
      const prefix=namespace(this);
      return raw.setItem.call(this, prefix===null?key:prefix+String(key), value);
    }},
    removeItem: {configurable:true,writable:true,value:function(key){
      const prefix=namespace(this);
      return raw.removeItem.call(this, prefix===null?key:prefix+String(key));
    }},
    key: {configurable:true,writable:true,value:function(index){
      const prefix=namespace(this);
      return prefix===null?raw.key.call(this,index):scopedKeys(this,prefix)[Number(index)]?.slice(prefix.length)??null;
    }},
    clear: {configurable:true,writable:true,value:function(){
      const prefix=namespace(this);
      if(prefix===null)return raw.clear.call(this);
      for(const key of scopedKeys(this,prefix))raw.removeItem.call(this,key);
    }},
  });
  const key='illustro-preview-storage-probe';
  local.setItem(key,'ok');
  if(local.getItem(key)!=='ok')throw new Error('Preview storage key isolation failed');
  local.removeItem(key);
  await import('./main.ts');
} catch (error) {
  console.error('R2 preview safe storage setup failed', error);
  if(app) app.textContent='R2プレビューを安全に開始できませんでした。ブラウザーの保存設定をご確認ください。';
}
`;
writeFileSync('apps/editor/src/r2-preview-bootstrap.js', bootstrap);
console.log('R2 preview isolation applied to build workspace only');
