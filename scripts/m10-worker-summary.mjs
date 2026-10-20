import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Publish a small, readable index of the raw evidence. Keep regressions and
// physical-device limits visible; a functional assertion is not a latency gate.
const root=process.env.WORKER_EVIDENCE??'/tmp/m10-worker-evidence';
const read=async name=>JSON.parse(await fs.readFile(path.join(root,name,'report.json'),'utf8'));
const matrix=await read(''),gated=await read('gated'),short=await read('short'),sustained=await read('sustained'),formal=await read('formal');
const histories=await Promise.all(['history','history-512','history-2000'].map(read));
for(const r of [matrix,gated,short,sustained,formal,...histories]){assert.equal(r.source,matrix.source);assert.equal(r.status,'AUTOMATED_CHECKS_PASSED');assert.deepEqual(r.errors,[]);}
assert.equal(matrix.cases.length,432);assert.equal(gated.cases.length,12);assert.equal(formal.formal.length,2);
const all=[...matrix.cases,...gated.cases,...short.cases,...sustained.cases];
assert.ok(all.every(c=>c.initial.phase==='before-release'&&Number.isFinite(c.metrics.releaseToGestureEventMs)),'source images must precede release, with the native gap measured');
const pct=(a,p)=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y);return a.length?a[Math.min(a.length-1,Math.ceil(a.length*p)-1)]:null;};
const maximum=a=>pct(a,1),median=a=>pct(a,.5),key=c=>[c.backend,c.route,c.brush,c.width,c.delay].join('/');
const summary={source:matrix.source,baseline:matrix.baseline,browser:matrix.browser,
 status:'AUTOMATED_FUNCTIONAL_CHECKS_PASSED; PHYSICAL_ACCEPTANCE_PENDING',userReview:'REQUIRED',
 method:'Source PNG and screencast start BEFORE release. The requested delay is the only inserted wait before the next native touch. Actual native release-to-gesture timestamps are reported. Composed PNGs and distinct screencast images confirm visible movement; rAF is only a scheduling proxy.',
 counts:{matrix:matrix.cases.length,gated:gated.cases.length,short:short.cases.length,sustained:sustained.cases.length,history:histories.reduce((n,r)=>n+r.cases.length,0)},
 groups:[],regressions:[],formal:formal.formal.map(c=>({backend:c.backend,records:c.matchedRecords,layerImages:c.matchedLayerImages})),
 minMappedInkFraction:Math.min(...all.map(c=>c.visual.fraction)),
 limits:['Software GPU and emulated touch/CPU load, not a physical smartphone.','GPU execution time, physical scanout/input-to-photon time, VRAM and thermal/power behavior are unmeasured.','Worker, image transfer and compositor may share the same physical GPU.','Completion acknowledgement holding is a lifecycle test; it does not simulate physical GPU occupancy.','Each matrix condition is one sample; the case-p95 median is not a pooled input percentile.']};
for(const backend of ['webgl2','webgpu'])for(const version of ['before','after']){
 const cases=matrix.cases.filter(c=>c.backend===backend&&c.version===version),instant=cases.filter(c=>c.delay===0),metric=k=>cases.map(c=>c.metrics[k]);
 summary.groups.push({backend,version,cases:cases.length,inputCaseP95MedianMs:median(metric('inputReceiptP95Ms')),inputMaxMs:maximum(metric('inputReceiptMaxMs')),
  frameCaseP95MedianMs:median(metric('frameIntervalP95Ms')),frameMaxMs:maximum(metric('frameIntervalMaxMs')),mainLongTaskMaxMs:maximum(metric('mainLongTaskMaxMs')),
  viewComputeP95MaxMs:maximum(cases.map(c=>c.early.diag.viewComputeP95Ms)),formalCpuMaxMs:maximum(metric('formalCpuMaxMs')),
  formalCompletionMedianMs:median(cases.flatMap(c=>c.final.diagnostics.handoff.traces.map(t=>t.gpuMs))),formalCompletionMaxMs:maximum(cases.flatMap(c=>c.final.diagnostics.handoff.traces.map(t=>t.gpuMs))),
  requestedZero:{inputMaxMs:maximum(instant.map(c=>c.metrics.inputReceiptMaxMs)),nativeGapMinMs:pct(instant.map(c=>c.metrics.releaseToGestureEventMs),0),nativeGapMaxMs:maximum(instant.map(c=>c.metrics.releaseToGestureEventMs))}});
}
for(const b of matrix.cases.filter(c=>c.version==='before')){const a=matrix.cases.find(c=>c.version==='after'&&key(c)===key(b));for(const metric of ['inputReceiptP95Ms','frameIntervalP95Ms'])if(a.metrics[metric]-b.metrics[metric]>5)summary.regressions.push({condition:key(a),metric,beforeMs:b.metrics[metric],afterMs:a.metrics[metric]});}
summary.outliers=matrix.cases.filter(c=>c.version==='after'&&(c.metrics.inputReceiptMaxMs>50||c.metrics.frameIntervalMaxMs>50)).map(c=>({condition:key(c),...c.metrics}));
await fs.writeFile(path.join(root,'summary.json'),JSON.stringify(summary,null,2));
const escape=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const ms=x=>Number.isFinite(x)?x.toFixed(1):'未観測';
const rows=summary.groups.map(g=>`<tr><th>${g.backend} ${g.version==='before'?'修正前':'修正後'}</th><td>${ms(g.inputCaseP95MedianMs)}</td><td>${ms(g.frameCaseP95MedianMs)}</td><td>${ms(g.inputMaxMs)}</td><td>${ms(g.frameMaxMs)}</td><td>${ms(g.mainLongTaskMaxMs)}</td></tr>`).join('');
const work=summary.groups.map(g=>`<tr><th>${g.backend} ${g.version==='before'?'修正前':'修正後'}</th><td>${ms(g.formalCpuMaxMs)}</td><td>${ms(g.formalCompletionMedianMs)}</td><td>${ms(g.formalCompletionMaxMs)}</td></tr>`).join('');
const gap=summary.groups.map(g=>`<tr><th>${g.backend} ${g.version==='before'?'修正前':'修正後'}</th><td>${ms(g.requestedZero.nativeGapMinMs)}〜${ms(g.requestedZero.nativeGapMaxMs)}</td><td>${ms(g.requestedZero.inputMaxMs)}</td></tr>`).join('');
const regressions=summary.regressions.map(g=>`<tr><td>${escape(g.condition)}</td><td>${g.metric==='inputReceiptP95Ms'?'入力受付p95':'rAF間隔p95'}</td><td>${ms(g.beforeMs)}</td><td>${ms(g.afterMs)}</td></tr>`).join('');
const examples=gated.cases.filter(c=>c.route==='auto').map(c=>{const name=Object.values({version:c.version,backend:c.backend,route:c.route,brush:c.brush,width:c.width,delay:c.delay,points:c.points,strokes:c.strokes,cpuRate:c.cpuRate,gated:c.gated}).join('-');return `<figure><figcaption>${c.backend}・${c.brush==='gpen'?'Gペン':'鉛筆'}512px・正式通知保留中</figcaption><div class="images"><img loading="lazy" src="gated/${name}-before.png" alt="筆離し前の線"><img loading="lazy" src="gated/${name}-during.png" alt="2本指で移動・拡大・回転した線"></div></figure>`;}).join('');
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M10 太い線と画面操作の検査</title><style>body{font:16px/1.75 system-ui,sans-serif;color:#253044;background:#f5f7ff;margin:0;padding:24px}main{max-width:1000px;margin:auto}h1{font-size:28px}h2{font-size:21px;margin-top:32px}a{color:#304ea8}table{border-collapse:collapse;background:white;width:100%;font-size:14px}td,th{text-align:left;border:1px solid #ccd5ea;padding:8px}.table{overflow-x:auto}.notice{background:#fff3d9;border-left:5px solid #b77913;padding:16px}.images{display:flex;gap:12px}.images img{width:calc(50% - 6px);max-width:390px}figure{margin:24px 0}code{overflow-wrap:anywhere}small{color:#526179}</style><main>
<p><a href="../../">← M10の実機確認へ戻る</a></p><h1>太い線を残したまま画面を動かす</h1>
<p class="notice"><strong>👤 USER REVIEW REQUIRED</strong><br>生成と自動検査・公開の記録です。実機不具合の全面解決・M10の合格は未判定です。遅延の外れ値と悪化条件も下に示します。</p>
<p>対象 <code>${escape(summary.source)}</code>。修正前 <code>${escape(summary.baseline)}</code>。Chromium ${escape(summary.browser)}、SwiftShader、390×844 CSS、DPR2。4000×4000px、Gペンと鉛筆128/256/512px、CPU仮線・GPU直接・自動、0/16/50/100/250/500ms指定、両GPUです。</p>
<h2>どこを分離したか</h2><p>指の入力と最新の画面位置はメイン側、仮線の計算と正式画素・128px履歴は描画worker側に置きました。表示済み画像は共通の最新位置へすぐ動かし、正式画像が使える時に仮線とまとめて交換します。操作中のGPU再表示要求、120ms/80msの待機、worker経路の移行保護画像取得を除去しました。正式なmodel・shader・筆跡形式は維持しています。</p>
<h2>受付・画面更新の修正前後</h2><p>すべてms。各backend/版108条件。「p95の中央値」は各条件のpointermove/rAF p95の中央値で、全入力をまとめたp95とは異なります。最大値は外れ値を含みます。long taskは線の開始から正式完了までの窓です。rAFは処理周期であり、画面の発光時刻ではありません。</p>
<div class="table"><table><tr><th>版</th><th>入力p95の中央値</th><th>rAF p95の中央値</th><th>入力最大</th><th>rAF最大</th><th>main long task最大</th></tr>${rows}</table></div>
<h2>「0ms指定」の実際の間隔</h2><p>比較PNGと録画開始は筆離し前に済ませました。筆離しから次の2本指入力まで画像採取・評価・準備完了待ちは挟みません。指定0msもCDPとブラウザーの配送時間を含み、物理的な0ms同時入力を保証しません。下はネイティブイベントtimestampの実間隔です。</p>
<div class="table"><table><tr><th>版</th><th>実間隔の最小〜最大</th><th>操作中の入力遅延最大</th></tr>${gap}</table></div>
<h2>正式処理の費用</h2><p>描画CPUは一送信の最大値。正式完了はアプリの筆離し→GPU完了通知で、画像反映確認・履歴処理の待ちも含む代理値です。GPUだけの実行時間ではありません。正式完了の速さと操作性を別に扱います。</p>
<div class="table"><table><tr><th>版</th><th>正式命令CPU最大</th><th>正式完了中央値</th><th>正式完了最大</th></tr>${work}</table></div>
<h2>悪化・未確認事項</h2><p>同条件の入力p95またはrAF p95が5msを超えて悪化した指標は${summary.regressions.length}件。修正後に入力またはrAF最大が50msを超えた条件は${summary.outliers.length}件です。単発標本であり原因の断定や安定した分位値の保証には使いません。詳細は<a href="summary.json">小さな集計JSON</a>にすべて残しています。</p>
<div class="table"><table><tr><th>backend/表示/ブラシ/太さ/指定間隔</th><th>指標</th><th>前</th><th>後</th></tr>${regressions||'<tr><td colspan="4">今回の標本では該当なし</td></tr>'}</table></div>
<p>正式描画、画像転送、ブラウザーの画面合成は同じ物理GPUを共有する可能性があります。worker化や1タイル送信を別GPUの保証とは扱いません。実機のペン・指、GPU実占有、発光までの遅延、VRAM、発熱・電力、GPU喪失後の完全復旧は未確認です。</p>
<h2>画素と操作の確認</h2><p>太い線の対比較432条件、正式通知保留12条件、4倍CPU負荷の短線8条件・12筆連続8条件で、変換後の検査対象画素は最小${(summary.minMappedInkFraction*100).toFixed(2)}%一致。PNGの移動先と操作中の異なる連続録画画像も検査します。正式通知保留は表示の独立性を調べるもので、物理GPUを占有させる試験とは区別します。</p>
<p>両GPUで同じ13筆・3レイヤーのStrokeRecordと12枚ずつの全レイヤーRGBAが修正前と完全一致。Undo/Redo/再構成、確定前Undo、指・ペンから操作への切替、実際の.illustro保存・再読込は18条件で画素一致を確認します。ブラシ品質を落とした合格ではありません。</p>
${examples}<h2>生の記録</h2><p><a href="report.json">432条件</a> · <a href="gated/report.json">正式通知保留・連続画像</a> · <a href="short/report.json">短い線・4倍CPU</a> · <a href="sustained/report.json">12筆連続・4倍CPU</a> · <a href="formal/report.json">正式画質・履歴・再構成</a> · <a href="history/report.json">4000px Undoと保存</a> · <a href="history-512/report.json">512px</a> · <a href="history-2000/report.json">2000px</a></p>
<p><a href="https://github.com/totoro0419/illustro/pull/39">Draft PR #39</a> · <a href="https://github.com/totoro0419/illustro/actions">CI</a>。M01〜M09を維持し、M11には進みません。</p></main></html>`;
await fs.writeFile(path.join(root,'summary.html'),html);
console.log(JSON.stringify({source:summary.source,counts:summary.counts,regressions:summary.regressions.length,outliers:summary.outliers.length,userReview:summary.userReview}));
