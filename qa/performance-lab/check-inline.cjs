'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
let count=0;
for(const filename of ['index.html','handoff.html','history.html']){
  const file=path.join(__dirname,filename);
  const html=fs.readFileSync(file,'utf8');
  if(!/^\uFEFF?\s*<!doctype\s+html\s*>/i.test(html))throw new Error(filename+': malformed HTML prefix');
  const blocks=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script\s*>/gi)];
  if(blocks.length===0)throw new Error(filename+': missing scripts');
  for(const block of blocks)if(block[1].trim()){new vm.Script(block[1],{filename});count++;}
  if(filename==='history.html'){
    if(!html.includes('window.__historyLab='))throw new Error('missing history public test API');
    if(!html.includes('status(verify=false)')||!html.includes('live:live.status(true)'))
      throw new Error('History Lab must keep fast UI and independently verified export');
    if(/function frame\(t\)\{[^}]*sync\(\);requestAnimationFrame\(frame\)/.test(html))
      throw new Error('History Lab must not perform expensive status checks every rAF frame');
  }
  if(filename==='handoff.html'&&!html.includes('window.__handoffTest='))throw new Error('missing handoff test API');
}
console.log('Inline JavaScript parse OK, blocks:',count);
