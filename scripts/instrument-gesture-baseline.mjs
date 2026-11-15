// Read-only comparison instrumentation in an isolated 6f18011 worktree.
// Only counters are added; cancellation/reset/replay algorithms are unchanged.
import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[2];if(!root)throw Error('baseline worktree required');
const replace=(file,from,to)=>{const target=path.join(root,file),text=fs.readFileSync(target,'utf8');if(text.split(from).length!==2)throw Error('baseline source mismatch: '+file);fs.writeFileSync(target,text.replace(from,to));};
replace('packages/brush-rt/src/session.mjs','export class RealtimeSession {','globalThis.__gestureCancelProbe={rebuilds:0,replayedStrokes:0};\nexport class RealtimeSession {');
replace('packages/brush-rt/src/session.mjs','async rebuild(){await this.renderer.reset();this.tileRecords.clear();for(const r of this.records){','async rebuild(){globalThis.__gestureCancelProbe.rebuilds++;await this.renderer.reset();this.tileRecords.clear();for(const r of this.records){globalThis.__gestureCancelProbe.replayedStrokes++;');
replace('apps/editor/src/brushSurface.ts','inflight:r?.inflight,needsFrame:r?.needsFrame','inflight:r?.inflight,viewPending:r?.viewPending,needsFrame:r?.needsFrame');
