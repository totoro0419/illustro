import {mkdir,readFile,writeFile,readdir,copyFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
const ids='SAV-006 SAV-007 REF-006 GST-005 IO-006 FIL-005 LIN-007 TRN-005 VEC-004 LAY-005 COL-008 FX-007 HIS-005 AUT-002 AUT-003 AUT-004 AUT-005'.split(' ');
const names=['容量不足・外部変更・保存競合','オフライン制作','参考資料の保存・欠損・復元','ショートカット設定の移行','EXR・AVIF・HEIF','囲って塗る・消す','未解決・低信頼・無効の扱い','吸着・整列・等間隔配置','簡略化・平滑化・図形合成','ピクセル・ベクターマスク','出力色・色域警告','修復・パッチ・クローン','履歴ブラシ・部分復元','実行時の対象・数値指定','比較・失敗・取消','複数作品の一括出力','高速呼び出し・共有'];
const specs=JSON.parse(await readFile(new URL('./manifest.json',import.meta.url),'utf8'));
const out=process.env.R2_AUDIT_OUT??'r2-audit-evidence',dest='docs/device-audit/03-chat-evidence';
const sha=process.env.EXPECTED_COMMIT_SHA??'unknown',url=process.env.GITHUB_SERVER_URL+'/'+process.env.GITHUB_REPOSITORY+'/actions/runs/'+process.env.GITHUB_RUN_ID;
const stamp=new Date().toISOString();
const csv=v=>'"'+String(v??'').replaceAll('"','""')+'"';
await mkdir(dest,{recursive:true});
const rows=[];
const json=async p=>JSON.parse(await readFile(p,'utf8'));
for(const [i,id] of ids.entries()){
 const spec=specs.find(s=>s.id===id),src=join(out,id),target=join(dest,id);
 let result=null,browser=null;
 try{result=await json(join(src,'result.json'));}catch{}
 try{browser=await json(join(src,'browser.json'));}catch{}
 await mkdir(target,{recursive:true});
 for(const f of await readdir(src).catch(()=>[])){
  const path=join(src,f);
  if(/\.(json|log|png|avif|exr)$/.test(f)&&(await stat(path)).size<2000000)await copyFile(path,join(target,f));
 }
 const checks=browser?.checks??[];
 const verdict=result?.status==='PASS'?'使える':'未判定';
 const missing=result?.pending??spec.pending;
 const cause=result?.status??'NOT_RUN';
 const mismatch=checks.filter(c=>JSON.stringify(c.actual)!==JSON.stringify(c.expected));
 rows.push({id,name:names[i],verdict,operation:checks.map(c=>c.name).join(' / '),expected:checks.map(c=>c.name+': '+JSON.stringify(c.expected)).join(' / '),actual:checks.map(c=>c.name+': '+JSON.stringify(c.actual)).join(' / '),problem:mismatch.length?'計測不一致（アプリ側か検査側か要確認）: '+mismatch.map(c=>c.name).join(' / '):'',improvement:'',pending:[...missing,...(cause==='PASS'?[]:[cause,browser?.reason??result?.reason??'実行結果なし'])].join(' / '),environment:'GitHub Actions Ubuntu / headless Chrome / localhost',sha,url,evidence:'03-chat-evidence/'+id+'/',stamp,result,browser});
}
const header=['機能ID','機能名','判定','実施した操作','期待結果','実際の結果','発見した問題','改善案','未確認条件','検査環境','対象コミット','Actions実行URL','証拠の参照先','検査日時'];
const data=rows.map(r=>[r.id,r.name,r.verdict,r.operation,r.expected,r.actual,r.problem,r.improvement,r.pending,r.environment,r.sha,r.url,r.evidence,r.stamp]);
await writeFile('docs/device-audit/03-CHAT-REMAINING17.csv',[header,...data].map(r=>r.map(csv).join(',')).join('\n')+'\n');
await writeFile(join(dest,'actual-results.json'),JSON.stringify(rows,null,2));
const summary=['# R2 チャット検査17件（実行結果・未判定を含む）','対象: '+sha,'Actions: '+url,'判定済み: '+rows.filter(r=>r.verdict!=='未判定').length+'/17','未判定: '+rows.filter(r=>r.verdict==='未判定').length,'既存記録 #113 と分離。未確認条件が残るものや計測不一致は合格にしない。物理キー・OS固有動作は人間の追加確認対象。','','|ID|判定|自動検査状態|','|---|---|---|',...rows.map(r=>'|'+r.id+'|'+r.verdict+'|'+(r.result?.status??'NOT_RUN')+'|')].join('\n')+'\n';
await writeFile('docs/device-audit/03-CHAT-REMAINING17-SUMMARY.md',summary);
for(const r of rows)console.log('CHAT_RESULT',r.id,r.verdict,r.result?.status??'NOT_RUN',r.browser?.status??'NO_BROWSER',r.browser?.checks?.length??0);
