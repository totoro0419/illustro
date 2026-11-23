import {readFileSync,writeFileSync} from 'node:fs';
// Transform the disposable CI checkout only. The original R2 workflow and
// its publicly deployed files remain untouched.
import './prepare-r2-preview.mjs';

const oldNamespace='illustro-r2-preview';
const fixedNamespace='illustro-r2-audit-fixes';
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
writeFileSync(html,body.replace('Illustro R2 preview — 開発中','Illustro R2 — 修正専用・検査版とは独立'));
console.log('Isolated Round 1 fix preview storage, OPFS, caches and service worker.');
