'use strict';
// Independent sRGB Canvas compositor oracle. No product/GPU quality claim.
const {chromium}=require('playwright'),{execFileSync}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict');
const vectors=JSON.parse(execFileSync('python',['-c',`
import sys,json
sys.path.insert(0,'experiments/stage3-reference')
from numeric_color_v1 import compose
modes='normal multiply screen overlay darken lighten color-dodge color-burn hard-light soft-light difference exclusion hue saturation color luminosity'.split()
rows=[]
for mode in modes:
 for b,s in [((64,128,192,255),(192,77,26,255)),((32,240,128,255),(225,128,64,128)),((255,0,128,255),(0,255,128,255)),((0,0,0,255),(255,255,255,128))]:
  rows.append(dict(mode=mode,back=b,src=s,expected=[round(v*255) for v in compose(tuple(v/255 for v in b),tuple(v/255 for v in s),mode)]))
print(json.dumps(rows))
`],{encoding:'utf8'}));
(async()=>{const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();const rows=await page.evaluate(vectors=>vectors.map(r=>{const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d',{colorSpace:'srgb',willReadFrequently:true});ctx.putImageData(new ImageData(new Uint8ClampedArray(r.back),1,1),0,0);const src=document.createElement('canvas');src.width=src.height=1;src.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(r.src),1,1),0,0);const mode=r.mode==='normal'?'source-over':r.mode;ctx.globalCompositeOperation=mode;if(ctx.globalCompositeOperation!==mode)throw Error('unsupported mode '+mode);ctx.drawImage(src,0,0);const actual=[...ctx.getImageData(0,0,1,1).data];return {...r,actual,error:Math.max(...actual.map((v,i)=>Math.abs(v-r.expected[i])))};}),vectors);for(const r of rows)assert(r.error<=2,JSON.stringify(r));fs.mkdirSync('test-results',{recursive:true});const result={kind:'independent-Chromium-sRGB-Canvas-oracle',browser:browser.version(),cases:rows.length,tolerance_codes:2,max_error:Math.max(...rows.map(r=>r.error)),rows,limits:['Opaque backdrop; RGBA8 upload/output. Quantization budget fixed at two code values before execution.','No extended artistic modes, linear-light, arbitrary ICC or product renderer claim.']};fs.writeFileSync('test-results/blend-canvas-oracle.json',JSON.stringify(result,null,2));console.log(JSON.stringify({cases:result.cases,max_error:result.max_error,tolerance:2}));}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
