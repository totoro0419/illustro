"""Rebuild the review-only access ledger from immutable product sources."""
import json, re, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/product-architecture'
SCOPE = json.loads((ROOT/'docs/product-planning/FINAL_PRODUCT_SCOPE.json').read_text())
FEATURES = json.loads((ROOT/'docs/product-planning/features.json').read_text())
INTEGRATION = json.loads((ROOT/'docs/performance-research/feature_integration.json').read_text())
PANELS = dict(layers='レイヤー', color='色', brush='ブラシ', inspector='プロパティ', reference='資料', assets='素材', effects='効果', navigator='表示', history='履歴', automation='自動化', document='作品', workspace='Workspace')
CATS = {
 'CAN':('キャンバス・文書','document'), 'INP':('入力・ペン','workspace'),
 'BRU':('ブラシ・消しゴム','brush'), 'WET':('混色・画材','brush'),
 'COL':('色・色管理','color'), 'FIL':('塗りつぶし','inspector'),
 'LIN':('線画・領域','inspector'), 'LAY':('レイヤー・合成','layers'),
 'SEL':('選択範囲','inspector'), 'TRN':('変形','inspector'),
 'VEC':('ベクター・文字','inspector'), 'GUI':('定規・図形','inspector'),
 'GRA':('グラデーション','inspector'), 'FX':('補正・フィルター','effects'),
 'NDE':('非破壊編集','layers'), 'REF':('資料・全体表示','reference'),
 'HIS':('履歴・別案','history'), 'SAV':('作品管理・保存','document'),
 'IO':('読み込み・書き出し','document'), 'AST':('素材管理','assets'),
 'AUT':('自動化','automation'), 'UI':('画面・Workspace','workspace'),
 'GST':('ジェスチャー・キー','workspace'), 'DEV':('端末・環境','workspace'),
 'REC':('記録・作業時間','history'), 'A11':('操作支援・言語','workspace'),
 'AI':('制作補助','inspector'), 'EXT':('将来候補・対象外','workspace'),
 'CLP':('コピー・貼り付け','document'), 'PIX':('ピクセル制作','inspector')}

# Explicit semantic classifications; categories alone cannot determine Undo ownership.
VIEW = 'CAN-002 CAN-003 CAN-004 CAN-008 COL-008 SEL-008 REF-002 REF-003 REF-005 LAY-009'.split()
PREF = 'INP-001 INP-002 INP-003 INP-004 INP-006 INP-007 BRU-002 BRU-003 BRU-004 BRU-005 BRU-006 BRU-007 BRU-008 BRU-009 BRU-010 BRU-012 WET-005 WET-006 COL-001 COL-002 COL-003 COL-004 COL-005 COL-011 FIL-003 FIL-004 FIL-010 TRN-005 TRN-006 GUI-006 GUI-007 AST-001 AST-002 AST-003 AST-004 AST-005 AUT-005 UI-001 UI-002 UI-003 UI-004 UI-005 UI-006 UI-007 UI-008 GST-001 GST-002 GST-003 GST-004 GST-005 DEV-001 DEV-002 DEV-003 DEV-004 DEV-005 REC-001 REC-003 REC-004 A11-001 A11-002 A11-003 A11-004 A11-005 A11-006 PIX-001'.split()
SERVICE = 'INP-005 INP-008 BRU-011 LAY-012 SAV-004 SAV-005 SAV-006 SAV-007 SAV-008 VEC-006 HIS-006'.split()
EXTERNAL = 'SAV-001 SAV-002 SAV-003 CAN-001 CAN-007 CAN-009 IO-001 IO-002 IO-003 IO-004 IO-005 IO-006 IO-007 IO-008 IO-009 AUT-004 REC-002 CLP-002 CLP-003 CLP-004 AI-004'.split()
STROKE = 'BRU-001 WET-001 WET-002 WET-007 FX-007 HIS-005'.split()
SESSION = 'CAN-005 CAN-006 COL-006 COL-007 COL-009 FIL-002 FIL-005 FIL-006 FIL-008 FIL-009 LIN-001 LIN-003 LIN-005 LIN-006 LIN-008 SEL-001 SEL-002 SEL-003 SEL-005 SEL-007 TRN-001 TRN-002 TRN-003 TRN-004 TRN-007 TRN-008 VEC-001 VEC-002 VEC-003 VEC-004 VEC-005 VEC-007 GUI-001 GUI-002 GUI-003 GUI-004 GUI-005 GRA-001 GRA-002 GRA-003 GRA-004 NDE-002 NDE-003 NDE-004 NDE-005 AUT-001 AUT-002 AUT-003 AI-001 AI-002 AI-003'.split()
DIRECT = {
 'BRU-001':('rail.brush','左ツール「ブラシ」／「消しゴム」','brush'),
 'BRU-012':('rail.eraser','左ツール「消しゴム」','eraser'),
 'WET-001':('rail.smudge','左ツール「混色」','smudge'),
 'COL-003':('rail.eyedropper','左ツール「スポイト」','eyedropper'),
 'FIL-001':('rail.fill','左ツール「塗り」','fill'),
 'SEL-001':('rail.selection','左ツール「選択」','selection'),
 'TRN-001':('rail.transform','左ツール「変形」','transform'),
 'LAY-010':('rail.move','左ツール「移動・層選択」','move'),
 'HIS-001':('fixed.undo','右下固定「Undo／Redo」',None),
 'CAN-003':('fixed.flip','表示帯／右下固定「表示反転」',None),
 'SAV-003':('top.save','上部「保存」',None),
 'CAN-001':('home.new','ホーム「新規」',None),
 'UI-005':('top.search','上部「機能検索」',None),
 'UI-004':('canvas.quick','Canvas近傍「Quick」',None),
 'COL-001':('context.color','対象帯の現在色',None),
 'BRU-002':('context.size','対象帯の太さ／不透明度',None),
 'LAY-001':('panel.layers.add','レイヤー欄「＋」／行選択',None),
 'REF-001':('panel.reference.add','資料欄「追加」',None),
 'UI-007':('top.focus','上部「Focus」',None),
 'UI-008':('top.home','上部「ホーム」',None),
 'SAV-004':('top.saveStatus','上部の保存状態',None),
 'IO-002':('top.export','上部「書き出し」',None),
}
OVERRIDE = {
 'WET-002':dict(parameters='水彩風プリセット・混色量・エッジ・粒状感・筆触。水分場や時間拡散なし', operation='ブラシ欄→水彩風プリセット→試筆→描画',direct_preview='筆触と粒状感を試筆。時間進行する濡れ状態は表示しない',persistence_undo='一筆一Undo。確定画素とブラシ版を保持。濡れ場・再開状態の保存は必須にしない'),
 'WET-005':dict(parameters='紙目・テクスチャ・粒状感・適用先（筆／素材）。時間吸収モデルなし', operation='ブラシの質感→紙素材→適用先を確認',direct_preview='紙目サンプルと作用範囲を比較。筆設定だけの変更と既存作品への適用を別に選択',persistence_undo='筆設定変更は作品Undo外。既存作品への明示再適用は一Transactionで元絵保持。紙版と適用範囲を保存'),
 'TRN-008':dict(parameters='変形後の見た目へ描く（既定）／元内容を編集／独立レイヤー／明示焼込', operation='対象帯の描画先→見た目／元内容を選ぶ。以前の変形だけを再編集しても後段筆跡は自動追従しない'),
 'COL-007':dict(parameters='sRGB／Display P3、8U／16U／16F。安全な前回条件、なければsRGB8。32F/HDRは将来比較枠', operation='新規または作品の色設定→色空間・精度→変換条件を確認'),
}
GROUPS = [
 ('描く',['BRU','WET','INP']),('塗り・色',['FIL','LIN','COL','GRA']),
 ('選択・変形',['SEL','TRN','CLP']),('レイヤー・表現',['LAY','NDE','VEC','GUI','FX','PIX']),
 ('資料・素材',['REF','AST']),('履歴・保存・出力',['HIS','SAV','IO','CAN','REC','AUT']),
 ('操作・設定',['UI','GST','DEV','A11','AI','EXT'])]
PANEL_BY_ID = dict.fromkeys(['CAN-002','CAN-003','CAN-004','CAN-008','REF-005'],'navigator')
PANEL_BY_ID.update({'WET-006':'reference','COL-009':'effects','GRA-004':'effects','REC-002':'document'})

def semantics(f):
 i,c=f['id'],f['category']
 if i in VIEW: return 'view'
 if i in PREF: return 'preference'
 if i in SERVICE: return 'system'
 if i in EXTERNAL: return 'lifecycle'
 if i in STROKE: return 'stroke'
 if i in SESSION or c=='FX' and i!='FX-009': return 'session'
 return 'command'

def build():
 rows=[]; integration={r['feature_id']:r for r in INTEGRATION['features']}
 for src,s in zip(FEATURES,SCOPE['feature_rows']):
  assert src['id']==s['id'] and src['name']==s['name']
  i,c=src['id'],src['category']; label,panel=CATS[c]; panel=PANEL_BY_ID.get(i,panel); kind=semantics(src)
  d=src['detail']; override=OVERRIDE.get(i,{})
  current_preview=override.get('direct_preview',d['direct_preview'])
  persistence=override.get('persistence_undo',d['persistence_undo'])
  active=s['final_scope'] in ('included','included_limited')
  context=d['context']
  state_contract=d['state_contract']
  if c=='WET' and active:
   context='現在層または明示した混色参照、選択／保護Maskを尊重。試筆パッドは作品と独立。時間進行する水分場は現行必須にしない。'
   state_contract='通常筆は離筆で受理、一筆一Undo。紙設定は次筆用と既存作品への明示再適用を区別。加水／乾燥／時間拡散は現行の必須UIにしない。'
  primary = DIRECT.get(i,(f'panel.{panel}.{i}',f'Workspace「{PANELS[panel]}」→{label}→{src["name"]}',None))
  if not active: primary=(f'scope.{i}',f'全機能→{label}→{src["name"]}の範囲説明',None)
  steps = [primary[1]] if i in DIRECT else [f'Workspace「{PANELS[panel]}」を開く',f'「{label}」を選ぶ',f'「{src["name"]}」を選ぶ']
  if not active: steps=['全機能を開く',f'「{label}」を選ぶ',f'「{src["name"]}」の範囲を読む']
  undo = {
   'view':'View履歴のみ。作品Undoへ入れない。変更前の表示へ戻す入口を保持',
   'preference':'設定／素材／Workspaceの所有者へ保存。作品Undoへ混入させない。作品へ適用した派生操作は別Transaction',
   'system':'自動挙動または状態確認。画素変更コマンドを新設しない。回復操作は明示して別に記録',
   'lifecycle':'作品Undoとは別の要求。保存・出力は固定版を読み、作品を巻き戻さない。取込・貼付等の編集部分のみ一Transaction',
   'stroke':'接地から離筆まで一Transaction。一筆の受理順と対象を固定。確定待ちでも最新受理筆からUndo',
   'session':'候補の間はSession内Undo。適用一回で一作品Transaction。取消で独立対象の編集を残す',
   'command':'対象と作用範囲を固定して一意図一Transaction。作品を変更しない参照操作は履歴外',
  }[kind]
  params=override.get('parameters',d['parameters']); op=override.get('operation',src['operation'])
  related=list(dict.fromkeys(re.findall(r'[A-Z]{2,3}-\d{3}',src['relation']) + integration[i]['dependencies']['original_related_features']))
  if i=='COL-010':related=['COL-008','IO-007','IO-009']
  if i=='VEC-008':related=['VEC-005','VEC-006']
  rows.append(dict(id=i,name=src['name'],category=c,category_label=label,panel='right.'+panel,
    final_scope=s['final_scope'],scope_note=s['final_scope_note'],source_policy=s['source_policy'],
    primary_entry=dict(id=primary[0],label=primary[1]),
    auxiliary_entries=[dict(id='catalog.'+i,label=f'全機能→{label}→{src["name"]}'),dict(id='search.'+i,label=f'機能検索→{src["name"]}')],
    surface=dict(screen='editor' if active else 'scope-information',panel='right.'+panel,tool=primary[2],context=context),
    steps=steps,step_count_to_entry=len(steps),operation=op,parameters=params,
    while_operating=current_preview,settings_change=f'{params}。値編集は対象名を保持し、候補と確定値を区別',
    apply_cancel=dict(kind=kind,apply='現行対象外のため実行しない' if not active else ('適用して一操作確定' if kind in ('session','command','stroke') else '設定／表示／要求の所有者へ反映。作品への架空の適用はしない'),cancel='今回の候補だけ破棄。前のツール／Focusへ戻す。既受理の別操作を消さない'),
    undo_unit=undo,current_persistence=persistence,source_persistence=d['persistence_undo'],
    devices=dict(pc=dict(steps=steps,projection='左Rail＋右Workspace。キーは補助入口。'),tablet=dict(steps=steps,projection='同じRailとWorkspace。指ナビ／ペンを共存。閉じたWorkspaceは明示ボタンで開く。'),phone=dict(steps=['左の全機能／対応常用ボタンを開く',f'「{label}」→「{src["name"]}」'] if i not in DIRECT else steps,projection='同じ意味ID。詳細は下部シート。対象名と閉じる／適用／取消を固定し、縦にスクロール。長押し必須なし。')),
    discovery=[label,src['purpose'],op,'カテゴリ一覧／現在の対象帯／検索結果の通常位置表示'],
    related_features=related,research=[x['id'] for x in integration[i]['research']],
    availability=dict(executable=active,prerequisites=context,unavailable_reason=None if active else s['final_scope_note']),
    architecture=dict(command_id='feature.'+i,ownership=kind,source_contract=state_contract,canonical=integration[i]['data']['canonical'],regenerable=integration[i]['data']['regenerable'],save_policy=persistence),
    source=dict(spec='docs/product-planning/'+src['spec'],final='docs/product-planning/FINAL_PRODUCT_SPEC.md',feature_sha256=hashlib.sha256(json.dumps(src,ensure_ascii=False,sort_keys=True).encode()).hexdigest()),
    evaluation=dict(clicks_to_entry=len(steps),movement='常用は固定Rail／対象帯／右下。詳細は右Workspace；Quick登録でCanvas近接可',risk=d['failure_quality'],canvas='常設はRail＋Workspace＋上部。選択／変形／効果の候補だけCanvas上',discovery_test='名前を伝えず目的だけでカテゴリ→機能へ到達できるか。初見ユーザー未検証',interruption='ナビ／資料／別対象操作を維持。同対象の矛盾する未適用Sessionだけ局所解決')))
 data=dict(schema_version=1,date_jst='2026-10-31',status='design-proposal-awaiting-user-ui-review',scope_counts=SCOPE['counts'],panels=PANELS,categories={k:dict(label=v[0],panel='right.'+v[1]) for k,v in CATS.items()},groups=[dict(label=l,categories=c) for l,c in GROUPS],features=rows)
 OUT.mkdir(exist_ok=True)
 (OUT/'FEATURE_ACCESS_LEDGER.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 lines=['# 全247機能のアクセス対応表','', '機能名・採否は現行スコープと一致。詳細な端末別手順・表示・設定・適用取消・Undo・依存・リスクは [JSON台帳](FEATURE_ACCESS_LEDGER.json) の同じIDを参照。クリック数は入口までであり、設定入力・対象選択・制作完了までの回数ではない。','', '| ID | 名称 | 現行範囲 | 主入口 | 補助入口 | 操作所有者 | 入口まで |','|---|---|---|---|---|---|---|']
 for r in rows:lines.append(f'| {r["id"]} | {r["name"]} | {r["final_scope"]} | {r["primary_entry"]["label"]} | 全機能 / 検索 | {r["apply_cancel"]["kind"]} | {r["step_count_to_entry"]} |')
 (OUT/'FEATURE_ACCESS_MAP.md').write_text('\n'.join(lines)+'\n')
 # Standalone file works over file:// as well as HTTP. No runtime fetch or framework.
 (ROOT/'qa/ui-prototype/routes.js').write_text('globalThis.ILLUSTRO_ROUTES = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
 print('built',len(rows),'feature routes')

if __name__=='__main__':build()
