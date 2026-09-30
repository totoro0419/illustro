import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const htmlPath=path.join(here,'interactive-connectivity.html');
const resolverPath=path.join(here,'endpoint-connectivity.js');
const uiPath=path.join(here,'interactive-connectivity.js');
const displayPath=path.join(here,'review-display.js');
const outPath=path.join(here,'interactive-connectivity-standalone.html');

export async function buildStandalone(){
  const [html,resolver,ui,display]=await Promise.all([readFile(htmlPath,'utf8'),readFile(resolverPath,'utf8'),readFile(uiPath,'utf8'),readFile(displayPath,'utf8')]);
  const marker='<script type="module" src="./interactive-connectivity.js"></script>';
  if(!html.includes(marker))throw new Error('module script marker not found');
  const bootstrap=`<script type="module">\nconst resolverSource = ${JSON.stringify(resolver)};\nconst resolverUrl = URL.createObjectURL(new Blob([resolverSource], { type: 'text/javascript' }));\nconst displaySource = ${JSON.stringify(display)}.replaceAll("'./endpoint-connectivity.js'", JSON.stringify(resolverUrl));\nconst displayUrl = URL.createObjectURL(new Blob([displaySource], { type: 'text/javascript' }));\nconst uiSource = ${JSON.stringify(ui)}.replaceAll("'./review-display.js'", JSON.stringify(displayUrl)).replaceAll("'./endpoint-connectivity.js'", JSON.stringify(resolverUrl));\nconst uiUrl = URL.createObjectURL(new Blob([uiSource], { type: 'text/javascript' }));\nawait import(uiUrl);\nwindow.addEventListener('pagehide', () => { URL.revokeObjectURL(uiUrl); URL.revokeObjectURL(resolverUrl); URL.revokeObjectURL(displayUrl); }, { once: true });\n</script>`;
  const output=html.replace(marker,bootstrap).replace('<title>Illustro つながり試験</title>','<title>Illustro つながり試験 — Standalone</title>');
  await writeFile(outPath,output);
  return output;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=await buildStandalone();console.log(`wrote ${path.basename(outPath)} (${output.length} chars)`);
}
