"""Rebuild audit tables from pinned sources and separately authored review notes.
Run at repository root. Writes ONLY docs/audits; never updates product validators.
The presence checks below are NOT semantic quality or performance passes.
"""
import collections, hashlib, json, re, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'docs/audits'; E=Path(__file__).resolve().parent
def read(p): return json.loads((ROOT/p).read_text())
def dump(p,x): (E/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
source=read('docs/product-planning/features.json')
scope=read('docs/product-planning/FINAL_PRODUCT_SCOPE.json')['feature_rows']
ledger=read('docs/product-architecture/FEATURE_ACCESS_LEDGER.json')['features']
research=read('docs/performance-research/feature_integration.json')['features']
notes=json.loads((E/'review-notes.json').read_text())
findings=json.loads((E/'findings.json').read_text())
browser=json.loads((E/'browser/routes-desktop.json').read_text())
phone=json.loads((E/'browser/routes-phone.json').read_text())
S={f['id']:f for f in source}; L={f['id']:f for f in ledger}; P={f['id']:f for f in scope}; B={f['id']:f for f in browser}
assert len(S)==len(L)==len(P)==len(B)==247
assert set(S)==set(L)==set(P)==set(B)
assert len(source)==len(ledger)==len(scope)==len(browser)==247
assert len({f['category']for f in source})==30
issues=[]; checks=[]
for i,f in S.items():
 a=L[i];p=P[i];n=int(i.split('-')[1]); c=f['category']; note=notes['FX_DETAIL'][n-101] if c=='FX' and n>=101 else notes[c][n-1]
 assert f['name']==a['name']==p['name'] and f['category']==a['category']==p['category']
 assert a['final_scope']==p['final_scope']
 assert all(f['detail'].get(k) for k in ['scene','parameters','direct_preview','persistence_undo','failure_quality','context','devices','comparison','open','state_contract'])
 path=ROOT/'docs/product-planning'/f['spec'].split('#')[0]
 assert ('## '+i+' — '+f['name']) in path.read_text(),i
 assert set(a['related_features'])<=set(S)
 assert B[i]['visible'] and (B[i]['start']>0)==a['availability']['executable']
 ids=[x['id']for x in findings if i in x['features']]
 active=p['final_scope'] in ('included','included_limited')
 dims={
  'C01_goal':{'status':'記載確認','evidence':f['purpose'],'capability':f['capability']},
  'C02_operation':{'status':'設計記載・処理本体未検証','evidence':f['detail']['direct_preview'],'parameters':a['parameters']},
  'C03_access':{'status':'PC検索DOM到達確認','primary':a['primary_entry'],'auxiliary':a['auxiliary_entries'],'phone':'代表分野DOM到達確認' if i in {x['id']for x in phone} else '個別DOM未試験'},
  'C04_discovery':{'status':'課題成功率未検証','terms':a['discovery'],'findings':[x for x in ids if x=='AUD-008']},
  'C05_effort':{'status':'宣言値・実制作手数未測定','declared_steps':a['steps'],'note':'AUD-010の直接入口反例あり。視線/ペン移動の実測ではない'},
  'C06_interaction':{'status':'設計と反例の机上審査','related':a['related_features'],'review':note},
  'C07_states':{'status':'記載・交錯の完全性未証明','source':f['detail']['state_contract'],'owner':a['architecture']['ownership'],'source_contract':a['architecture']['source_contract']},
  'C08_history_save':{'status':'製品統合未検証','current':a['current_persistence'],'undo':a['undo_unit'],'canonical':a['architecture']['canonical'],'regenerable':a['architecture']['regenerable']},
  'C09_performance':{'status':'製品測定未実施' if active else '現行必須処理対象外','research':a['research'],'note':'単独CPU Labの時間/一致を製品性能へ流用しない'},
  'C10_boundaries':{'status':'受入条件記載・実行未完','source':a['evaluation']['risk'],'audit_counterexample_or_test':note},
  'C11_competition':{'status':'個別同条件の実測比較未実施','source_evidence_ids':f['detail']['comparison'],'note':'既存出典IDの存在は同能力/優越の証明ではない。総合報告の公式資料比較は限定操作のみ'},
  'C12_feasibility':{'status':'候補・採用試験待ち' if active else '保留/対象外の境界維持','open':f['detail']['open'],'gate':'T01–T08/U01–U08の該当部分。保留を実装TODOへ変換しない'}
 }
 issues.append({'id':i,'name':f['name'],'category':c,'final_scope':p['final_scope'],'source_spec':a['source']['spec'],'source_operation':f['operation'],'current_operation':a['operation'],'review':note,'findings':ids,'result':'要是正/要判断' if ids else ('設計記載あり・品質未判定' if active else '範囲境界確認・処理評価対象外'),'dimensions':dims})
dump('feature-audit.json',issues)
protected=read('docs/audits/evidence/2026-10-31/target-manifest.json')['protected_files']
changed=[p for p,h in protected.items() if hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h]
assert not changed,changed
counts=dict(collections.Counter(f['final_scope']for f in issues));sev={s:sum(f['severity']==s for f in findings)for s in ['P0','P1','P2','P3']}
stats={'target':'fc14afdde2d25ee61e2f05e4d89a387ab5ca3c04','features':len(issues),'categories':30,'missing_ids':[],'duplicate_ids':[],'name_or_scope_mismatch':[],'scope_counts':counts,'desktop_search_dom':len(browser),'desktop_not_visible':[x['id']for x in browser if not x['visible']],'phone_category_dom':len(phone),'untested_phone_individual_features':247-len(phone),'findings_by_severity':sev,'features_linked_to_findings':sum(bool(f['findings'])for f in issues),'protected_files':len(protected),'changed_protected_files':changed,'declared_step_counts':dict(collections.Counter(f['step_count_to_entry']for f in ledger)),'identical_pc_tablet_step_arrays':sum(f['devices']['pc']['steps']==f['devices']['tablet']['steps']for f in ledger),'unique_cancel_strings':len({f['apply_cancel']['cancel']for f in ledger}),'interpretation':'Counts/presence assertions only. No product usability, pixels, GPU or storage guarantee.'}
dump('static-results.json',stats)

md=['# 全247機能の独立監査台帳','', '監査日：2026-10-31 UTC。対象：`fc14afdde2d25ee61e2f05e4d89a387ab5ca3c04`（PR #7）。原仕様のID・名称・分野を保持し、現行スコープはPR #5を優先した。','',
'**247/247件、30/30分野。欠落0・重複0・名称/採否不一致0。通常234、限定2、保留10、対象外1。** PCのID検索→詳細表示は247件を実操作し、236件の試行入口と11件の説明限定を照合した。Phoneは30分野代表30件であり、残る217件をPhone実操作済みとは扱わない。','',
'この一覧の「設計記載あり」は合格ではない。個別の目的・操作・保持・異常系を原仕様/現行台帳と照合し、各行に独自の反例/追加試験を付けた。反例の案は実際に不具合が起きたとの主張ではない。確定指摘にはAUD番号を付け、観測と設計欠落を[問題一覧](findings.md)で分離する。','',
'## 12監査軸と証拠の読み方','',
'各IDの12軸の全文、固有パラメータ、正本/派生物、関連ID、現行Undo/保存条件は[機械可読台帳](evidence/2026-10-31/feature-audit.json)に収録。原仕様の能力を単純な文字数/項目存在だけで合格にしていない。','',
'|軸|確認したもの|判定限界|','|---|---|---|',
'|C01 目的|原仕様purpose/capability/制作場面|目的達成率は未測定|',
'|C02 操作|直接操作・固有制御・現行範囲|generic試行欄は固有UIの実証ではない|',
'|C03 導線|主/補助/PC検索DOM・Phone代表|全入口/全端末の実行等価性は未証明|',
'|C04 発見|検索索引と主要操作語反例|初見参加者の探索試験なし|',
'|C05 手数|宣言手順と直接入口反例|視線・ペン移動は実測なし|',
'|C06 競合|関連機能・行固有の反例|全組合せ試験ではない|',
'|C07 状態|分野状態契約/所有先|失敗出口等の不足を別指摘|',
'|C08 履歴/保存|現行保持条件/正本/派生|模擬操作ID固定はNative耐久証明ではない|',
'|C09 性能|研究対応・T01–T08|製品構成の数値達成なし|',
'|C10 異常/境界|固有失敗条件と追加試験|実行した反例のみ確認済み|',
'|C11 比較|原仕様の出典ID、限定公式操作比較|247件の同条件競合実測は未実施|',
'|C12 実現/検証|残る判断と試験ゲート|未実装自体を欠陥としない|','',
'[全件DOM記録](evidence/2026-10-31/browser/routes-desktop.json) · [Phone代表記録](evidence/2026-10-31/browser/routes-phone.json) · [独立照合結果](evidence/2026-10-31/static-results.json)。各行の仕様リンクは監査対象ブランチ内の原典。状態/Undo/性能を含む12軸は上記JSONの同じIDで追跡できる。','']
for cat in dict.fromkeys(f['category']for f in issues):
 rows=[f for f in issues if f['category']==cat]
 md += ['## '+cat+' — '+L[rows[0]['id']]['category_label']+'（'+str(len(rows))+'件）','','|正式ID・名称 / 仕様|現行範囲・操作入口|判定・指摘|個別の反例・追加検証（未実施を含む）|','|---|---|---|---|']
 for f in rows:
  a=L[f['id']]; link='../'+f['source_spec'].removeprefix('docs/')
  status={'included':'対象','included_limited':'限定','deferred':'保留','excluded_suite':'対象外'}[f['final_scope']]
  refs=' / '.join('[%s](findings.md#%s)'%(i,i.lower())for i in f['findings']) or '個別欠陥未確認'
  md.append('|[%s %s](%s)|%s / %s。検索DOM到達%s|%s。%s|%s|'%(f['id'],f['name'],link,status,a['primary_entry']['label'],'（説明のみ）' if not a['availability']['executable'] else '',f['result'],refs,f['review']))
 md.append('')
(OUT/'feature-audit-matrix.md').write_text('\n'.join(md).rstrip()+'\n')

fm=['# 問題・改善提案一覧','','対象：PR #7 `fc14afdde2d25ee61e2f05e4d89a387ab5ca3c04`。2026-10-31 UTC。P0=0 / P1=7 / P2=11 / P3=1、計19件。P1は製品出荷時の実損失を実測した意味ではなく、主要制作導線または実装前契約に対する影響の重大度。複数機能へ波及しても原因単位で一件として数える。','',
'観測された試作不整合、コード/数学上の反例、設計上の不足を各項に明記した。技術方式未採用・実機未検証そのものは欠陥件数へ加えていない。特にAUD-006は単純overlayを採用済みと批判するものではなく、消去/下地依存筆の期待結果を先に決める必要があるという指摘。','',
'[総合報告](illustro-design-audit.md) · [247機能台帳](feature-audit-matrix.md) · [再現用モデル](evidence/2026-10-31/adversarial-model.cjs) · [機械可読指摘](evidence/2026-10-31/findings.json)','']
for f in findings:
 fm += ['<a id="'+f['id'].lower()+'"></a>','## '+f['id']+' — '+f['severity']+' '+f['title'],'', '**確認段階：** '+f['kind']+'。**対象ID：** '+', '.join(f['features'])+'。','', '**操作・反例：** '+f['scenario'],'', '**影響：** '+f['impact'],'','**根拠：** '+f['evidence'],'','**原因/原因候補：** '+f['cause'],'','**改善方向：** '+f['remedy'],'','**副作用・トレードオフ：** '+f['tradeoff'],'','**追加検証・閉鎖条件：** '+f['test'],'']
fm+=['## 再現と証跡の注意','','`node docs/audits/evidence/2026-10-31/adversarial-model.cjs` は対象モデルを読み込むだけで変更しない。M01/M02は期待契約と異なる結果を記録する。M03/M04は保存時点固定と独立編集保持の肯定確認。M05/M06は数学反例、M07は容量算術であり、GPU/実機の測定ではない。ブラウザー証跡は原HTMLのbyteコピーを起動して取得した。','',
'![スマートフォン横画面のSessionがシートの背後に入る](evidence/2026-10-31/browser/landscape-session.jpg)','',
'![800px幅のCanvas圧迫](evidence/2026-10-31/browser/intermediate-800.jpg)','',
'![FocusのQuickから色を開いた後も色Panelが表示されない](evidence/2026-10-31/browser/focus-color-hidden.jpg)','']
(OUT/'findings.md').write_text('\n'.join(fm))

inventory=[]
for name in protected:
 if name.startswith('docs/') or name.startswith('qa/') or name.startswith('tools/') or name=='README.md':
  kind='原仕様/現行スコープ' if name.startswith('docs/product-planning/') else '最新設計/導線' if name.startswith('docs/product-architecture/') else '研究/統合設計' if name.startswith('docs/performance-research/') else 'プロトタイプ/試験' if name.startswith('qa/') else '開発/生成・検査'
  inventory.append({'path':name,'kind':kind,'sha256':protected[name],'authority':'主張されたPASSは監査対象。ファイルの存在を品質証明にしない'})
dump('source-inventory.json',inventory)
print(json.dumps(stats,ensure_ascii=False,indent=2))
