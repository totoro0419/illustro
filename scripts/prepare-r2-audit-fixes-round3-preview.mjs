import {readFileSync,writeFileSync} from 'node:fs';
// Transform the disposable CI checkout only. The original R2 workflow and
// its publicly deployed files remain untouched.
import './prepare-r2-preview.mjs';

const oldNamespace='illustro-r2-preview';
const fixedNamespace='illustro-r2-audit-fixes-round3';
const paths=[
  'apps/editor/src/persistence/workLibrary.ts',
  'apps/editor/src/persistence/persistence.worker.ts',
  'apps/editor/src/export/rasterPresets.ts',
  'apps/editor/src/assets/library.ts',
  'apps/editor/src/assets/referenceBoardStore.ts',
  'apps/editor/src/assets/assetImportRecovery.ts',
  'apps/editor/src/assets/linkedImages.ts',
  'apps/editor/src/selection/store.ts',
  'apps/editor/public/sw.js',
  'apps/editor/src/r2-preview-bootstrap.js',
];
for(const path of paths){
  const content=readFileSync(path,'utf8');
  if(!content.includes(oldNamespace))throw Error('Missing preview isolation marker in '+path);
  writeFileSync(path,content.replaceAll(oldNamespace,fixedNamespace));
}
const html='apps/editor/index.html';
const body=readFileSync(html,'utf8');
if(!body.includes('Illustro R2 preview — 開発中'))throw Error('R2 title marker missing');
writeFileSync(html,body.replace('Illustro R2 preview — 開発中','Illustro R2 — 第3回修正専用'));
console.log('Isolated Round 3 fix preview storage, OPFS, caches and service worker.');

// Round 1 deletes every cache beginning with illustro-r2-audit-fixes-.
// The requested Round 3 namespace begins with that prefix. Use an independent
// cache-family prefix so the two service workers can never delete each other.
const sw='apps/editor/public/sw.js';
const swSource=readFileSync(sw,'utf8');
const oldCache="const CACHE_PREFIX='illustro-r2-audit-fixes-round3-';";
if(!swSource.includes(oldCache))throw Error('Round 3 cache marker missing');
writeFileSync(sw,swSource.replace(oldCache,"const CACHE_PREFIX='illustro-preview-cache:illustro-r2-audit-fixes-round3:';"));
