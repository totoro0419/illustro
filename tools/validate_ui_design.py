"""Independent static audit. It does not import the route generator."""
import json,re,hashlib,subprocess,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/product-architecture'
checks=[];failures=[]
def check(name,condition,evidence):
 row=dict(name=name,passed=bool(condition),evidence=evidence);checks.append(row)
 if not condition:failures.append(name)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
scope=json.loads((ROOT/'docs/product-planning/FINAL_PRODUCT_SCOPE.json').read_text())
source=json.loads((ROOT/'docs/product-planning/features.json').read_text())
r=json.loads((OUT/'FEATURE_ACCESS_LEDGER.json').read_text());rows=r['features']
expected={x['id']:x for x in scope['feature_rows']};actual={x['id']:x for x in rows}
check('247 IDの完全一致・重複なし',len(rows)==247 and len(actual)==247 and set(actual)==set(expected),len(rows))
check('名称・カテゴリ・採否・元採否一致',all(all(a[k]==expected[i][k] for k in ['name','category','final_scope','source_policy']) for i,a in actual.items()),'FINAL_PRODUCT_SCOPEを独立パース')
orig=json.loads(subprocess.check_output(['git','show','origin/docs/product-planning-2026-10-27:docs/product-planning/features.json'],cwd=ROOT))
check('PR #1の全ID・名称・カテゴリを保持',{(x['id'],x['name'],x['category']) for x in orig}=={(x['id'],x['name'],x['category']) for x in rows},'原仕様git blobとの比較')
counts={}
for a in rows:counts[a['final_scope']]=counts.get(a['final_scope'],0)+1
check('234/2/10/1の採否件数',counts==scope['counts']['statuses'],counts)
check('全30カテゴリ・12Panelへ接続',len({a['category'] for a in rows})==30 and {a['panel'][6:] for a in rows}==set(r['panels']),list(r['panels']))
required=['primary_entry','auxiliary_entries','surface','steps','operation','parameters','while_operating','settings_change','apply_cancel','undo_unit','current_persistence','devices','discovery','related_features','architecture','evaluation']
check('全件に指定された導線項目',all(all(a.get(k) for k in required) for a in rows),required)
check('全件PC/Tablet/Phoneの手順',all(set(a['devices'])=={'pc','tablet','phone'} and all(a['devices'][d]['steps'] for d in a['devices']) for a in rows),'各247件')
check('全件の主入口・カテゴリ・検索を識別',all(len(a['auxiliary_entries'])==2 and a['primary_entry']['id'] and all(e['id'].endswith(a['id']) for e in a['auxiliary_entries']) for a in rows),'1主＋2補助')
check('関連機能に無効IDなし',all(set(a['related_features'])<=set(actual) for a in rows),'関連参照全件')
check('保留/対象外は説明のみ',all(a['availability']['executable']==(a['final_scope'] in ['included','included_limited']) for a in rows),'236実行導線＋11範囲説明')
check('全14研究へ接続',{v for a in rows for v in a['research']}=={f'R{n:02}' for n in range(1,15)},'既存研究対応を継承')
check('WET現行範囲を補正',actual['WET-002']['current_persistence']!=actual['WET-002']['source_persistence'] and '時間拡散なし' in actual['WET-002']['parameters'] and '時間進行する水分場は現行必須にしない' in actual['WET-001']['surface']['context'],'PR #5優先')
check('CMYK/高度文字の交差能力維持',set(['COL-008','IO-007','IO-009'])<=set(actual['COL-010']['related_features']) and 'VEC-005' in actual['VEC-008']['related_features'],'対応機能へ案内')
check('全件のステップ数と配列が一致',all(a['step_count_to_entry']==len(a['steps']) and 1<=len(a['steps'])<=3 for a in rows),'入口まで。制作完了手数ではない')
md=(OUT/'FEATURE_ACCESS_MAP.md').read_text()
check('Markdown対応表に247 ID各一回',all(len(re.findall(r'^\| '+re.escape(i)+r' \|',md,re.M))==1 for i in actual),'表行だけを独立集計')
source_by_id={x['id']:x for x in source}
check('原仕様の機能hash照合',all(a['source']['feature_sha256']==hashlib.sha256(json.dumps(source_by_id[i],ensure_ascii=False,sort_keys=True).encode()).hexdigest() for i,a in actual.items()),'元の全フィールドに対するSHA256')
baseline=json.loads((OUT/'SOURCE_BASELINE.json').read_text())
changed=[f for f,h in baseline['protected_files'].items() if not (ROOT/f).exists() or sha(ROOT/f)!=h]
check('基点の全155ファイルをbyte保護',not changed,dict(files=len(baseline['protected_files']),changed=changed))
html=(ROOT/'qa/ui-prototype/index.html').read_text()
check('単体HTMLの全生成箇所を置換','/* STYLE */' not in html and '/* ROUTES */' not in html and '/* APP */' not in html and '/* MODEL */' not in html,'未置換markerなし')
check('外部JS/CSS依存なし',not re.search(r'<script[^>]+src=|<link[^>]+stylesheet',html,re.I),'ローカル単体実行。外部リンクは通常のrepositoryリンクのみ')
check('試作を製品保存・画像処理と混同しない',all(s in html for s in ['模擬保存','処理本体は未実装','人工待機','保留／対象外']), 'UIの表示文言')
check('通常状態表示に画素演算なし',all(s not in (ROOT/'qa/ui-prototype/model.js').read_text() for s in ['getImageData','putImageData','readPixels','render(']),'状態モデルは画素バッファを持たない。製品実装の保証ではない')
broken=[];links=0
for path in OUT.glob('*.md'):
 for url in re.findall(r'\]\(([^)]+)\)',path.read_text()):
  if '://' in url or url.startswith('#'):continue
  links+=1
  target=url.split('#')[0]
  if target and not (path.parent/target).exists():broken.append(str(path.name)+':'+url)
check('設計文書の相対リンクに欠落なし',not broken,dict(count=links,broken=broken))
result=dict(date_jst='2026-10-31',generated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),kind='static-design-audit',checks=checks,failed_checks=failures,scope='ID/metadata/contracts/source-preservation; not usability/performance',files={str(p.relative_to(ROOT)):sha(p) for p in sorted(OUT.iterdir()) if p.is_file() and p.suffix in ['.md','.json','.ts'] and p.name!='validation.json'})
(OUT/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(checks=len(checks),failed_checks=failures),ensure_ascii=False))
raise SystemExit(bool(failures))
