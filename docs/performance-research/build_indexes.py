#!/usr/bin/env python3
"""Build reviewable indexes from individually authored notes; no risk inference by keyword."""
import hashlib,json,re,subprocess
from collections import Counter
from pathlib import Path
R=Path(__file__).resolve().parent;P=R.parent/'product-planning';REPO=R.parents[1]
BASE='92daaf5ac23a015a834141f7d08275d903711404'
def write(name,x): (R/name).write_text(x.rstrip()+'\n')
def js(name,x):write(name,json.dumps(x,ensure_ascii=False,indent=2))
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
features=json.loads((P/'features.json').read_text());src={f['id']:f for f in features}
roots=json.loads((R/'roots.json').read_text());rootby={r['id']:r for r in roots}
notes={}
for ln in (R/'feature_notes.tsv').read_text().splitlines():
    if not ln or ln.startswith('#'):continue
    fid,topics,priority,work,problem,question,test=ln.split('|')
    assert fid not in notes
    notes[fid]=(topics.split(','),priority,work,problem,question,test)
assert set(notes)==set(src) and len(src)==247
allsections={};inputs={}
for path in sorted(P.glob('features/*.md')):
    content=path.read_text();inputs[str(path.relative_to(REPO))]=sha(content)
    header=content.split('<a id=')[0]
    for m in re.finditer(r'## ([A-Z0-9]+-\d+) — ([^\n]+)\n(.*?)(?=\n<a id=|\Z)',content,re.S):
        fid,title,body=m.groups();allsections[fid]={'title':title,'body':body,'sha':sha(m.group()),'shared_sha':sha(header)}
assert set(allsections)==set(src)
records=[]
# Japanese resource review text, kept separate from feature-specific authored findings.
resource_notes={
'01':'入力配送・主スレッド・表示提出・変換履歴。OS/GPU/アプリの停止を別計測。',
'02':'操作列・依存記録・保留差分と待機量。依存のない操作まで待たせない。',
'03':'先端作用数・被覆/混色の読書き・入力保持量。未使用変調は別評価。',
'04':'参照画素・辺/面・修正制約・探索範囲。一点変更でも全域影響の可能性。',
'05':'評価pass・中間像・halo・cache・転送。下地/遠方参照の省略は不可。',
'06':'全常駐量・一時peak・転送量・保存pin。電池/熱は未実測。',
'07':'保存I/O・圧縮・検証・旧世代保持。耐久性の保証は環境別に検査。',
'08':'版依存・履歴根・共有と回収。固定案は破棄可能cacheではない。',
'09':'探索・配置・hit判定・状態更新・画面面積。確認/探し直しも操作コスト。',
'10':'色変換・深度・α・表示変換と帯域。無言の降格では削減しない。',
'11':'原本・座標/変位場・字形/Mask。再標本化や全物体再構築の繰返しを比較。',
'12':'媒体状態・進行回数・相互参照域。停止中/未使用時の仕事も測る。',
'13':'decode/encode・依存graph・一時buffer。取込/出力を描画資源と競合させない。',
'14':'初回準備・周期処理・候補/記録容量。未使用/cold/warmを別比較。'}
for f in features:
    fid=f['id'];topics,pri,work,problem,question,test=notes[fid];rs=['R'+i for i in topics]
    related=[]
    for rid in rs:
        related+=rootby[rid]['focal']
    related+=re.findall(r'[A-Z0-9]+-\d+',f['relation'])
    related=list(dict.fromkeys(x for x in related if x!=fid and x in src))[:10]
    records.append({'feature_id':fid,'name':f['name'],'category':f['category'],
        'source_spec':'../product-planning/'+f['spec'],'source_section_sha256':allsections[fid]['sha'],
        'source_json_sha256':sha(json.dumps(f,ensure_ascii=False,sort_keys=True)),
        'spec_status':f['policy'],'goal':f['purpose'],'required_capability':f['capability'],
        'operation':f['operation'],'spec_parameters':f['detail']['parameters'],
        'spec_direct_interaction':f['detail']['direct_preview'],'spec_persistence':f['detail']['persistence_undo'],
        'spec_constraint':f['detail']['failure_quality'],
        'necessary_work':work,'issue_id':'P-'+fid+'-01','issue':problem,
        'evidence_class':'technical_risk','evidence_reason':'当該個別仕様の制約と必要処理から導く条件付きリスク。新Illustro/競合での発生を確認した記録ではない。',
        'confirmed_product_issue':False,'priority':pri,'research':rs,
        'related_features':related,'resource_and_wait_review':[resource_notes[t] for t in topics],
        'unnecessary_work_or_premise_question':question,'discriminating_test':test,
        'feature_unique_issue_scope':'仕様から上記固有リスクを発見。実装/実機/利用者の発生率は未確認。',
        'additional_issue_status':'上記以外の固有問題は今回の仕様読解範囲では未確認。不存在の証明ではない。'})
js('problem_map.json',records)
index=['# 全247機能の問題マップ','',f'基準：PR #1 `{BASE}`。30分野、247固有ID。各行の問題は**技術的リスク**であり、現行製品での実測不具合ではない。個別記録の目的/計算/操作負担/資源/連携/前提の問い/試験を確認する。原仕様の採否は変更しない。','',
       '[根本問題](ROOT_PROBLEMS.md) · [課題カード](USER_RESEARCH_CARDS.md) · [機械可読台帳](problem_map.json)','',
       '| ID・個別記録 | 優先 | 問題候補 | 研究先 |','|---|---|---|---|']
for v in records:
    index.append(f"| [{v['feature_id']} {v['name']}](features/{v['category']}.md#{v['feature_id'].lower()}) | {v['priority']} | {v['issue']} | {', '.join(v['research'])} |")
write('FEATURE_PROBLEM_MAP.md','\n'.join(index))
for cat in dict.fromkeys(f['category'] for f in features):
    lines=[f'# {cat} — 個別問題分析','', '[全機能索引](../FEATURE_PROBLEM_MAP.md) · [根本問題](../ROOT_PROBLEMS.md)','',
           '全項目は個別仕様を起点とした条件付き技術的リスク。実機の存在確認・重要度の頻度実測は未実施。原仕様の品質条件を維持し、性能都合の機能削除を提案しない。']
    for v in records:
        if v['category']!=cat:continue
        fid=v['feature_id'];topics=','.join(v['research'])
        rel=', '.join(f"[{i} {src[i]['name']}]({src[i]['category']}.md#{i.lower()})" for i in v['related_features'])
        lines += ['',f'<a id="{fid.lower()}"></a>',f'## {fid} — {v["name"]}','',
          f"- **原仕様**：[{fid}](../../product-planning/{src[fid]['spec']})。原採否：{v['spec_status']}。読解対象節hash：`{v['source_section_sha256']}`。",
          f"- **1 目的**：{v['goal']}。{v['required_capability']}。",
          f"- **2 必要操作・計算**：{v['operation']}。計算：{v['necessary_work']}。",
          f"- **3〜5 負荷・応答・不要待ちの問題候補**：{v['issue']}。",
          f"- **6 不要仕事・繰返し、10 前提の問い**：{v['unnecessary_work_or_premise_question']}。",
          f"- **7 資源/待機の確認観点**：{' / '.join(v['resource_and_wait_review'])}",
          f"- **8 操作の複雑さ**：直接操作の要求は「{v['spec_direct_interaction']}」。上の問題と併せて、確認/対象探索/やり直しを含む総タスク時間を比較。現時点で初見直感性を判定しない。",
          f"- **維持する固有条件**：{v['spec_constraint']}。再編集/Undo：{v['spec_persistence']}。",
          f"- **根拠区分**：技術的リスク。{v['evidence_reason']} 優先度：{v['priority']}（影響の判断、頻度は未計測）。",
          f"- **9 連携と研究先**：{topics}。関連：{rel}。詳細方式・共通副作用・出典・検証は各Rの[根本問題](../ROOT_PROBLEMS.md)を参照。",
          f"- **識別できる試験**：{v['discriminating_test']}。",
          f"- **確認範囲の限界**：{v['additional_issue_status']}"]
    write('features/'+cat+'.md','\n'.join(lines))
# Roots maintain exact feature links, priority vectors are judgments not measured frequencies.
lines=['# 共通・根本問題と優先順位','',
'P0は入力喪失・誤結果・保存/復元破壊を防ぐ研究、P1は制作全体の品質/手数を大きく左右する研究、P2は用途限定/将来枠を含む個別項目。P0を安易な低速化防止へ置き換えない。R順の番号は実装順ではない。',
'', 'スコアは悪影響/頻度/横断性/重大事故/改善効果/革新余地/検証可能性の7軸、各1〜5の**研究者による暫定判断**。発生率の実測ではない。合計だけで採否を自動決定せず、重大損失を先に扱う。頻度は最も不確かで実利用者調査後に更新。','',
'| 研究 | 優先 | 7軸スコア | 対応機能数 | 判断理由 |','|---|---|---|---|---|']
for r in roots:
    rr=[v for v in records if r['id'] in v['research']];r['features']=[v['feature_id'] for v in rr]
    lines.append(f"| [{r['id']} {r['name']}](#{r['id'].lower()}) | {r['priority']} | {'/'.join(map(str,r['scores']))} | {len(rr)} | {r['why']} |")
lines += ['', '## 原因関係と研究上の依存','',
'R01の独立表示はR02の正しい状態境界とR06の実行余裕があって初めて成立する。R03/R05/R12はR02へ本当の読書き依存を返す。R04の位相結果はR08へ手修正を含む版として保持する。R07はR02の保存境界とR08の到達資源を固定する。R10の色契約とR11の座標は全評価へ渡す。R09はこれらを作者に過剰な状態語を覚えさせず操作へ接続する。R13/R14は重い/任意の仕事を通常制作から隔離する。','',
'重要な前提の反証：Workerを分けただけではGPU/転送/帯域を分けたことにならない。別層でも下地を読む効果は独立ではない。局所編集でも領域の接続は全域へ変わる。cache再利用と正本保持は同義ではない。']
for r in roots:
    lines += ['',f'<a id="{r["id"].lower()}"></a>',f'## {r["id"]} — {r["name"]}','',r['why'],
        '',f"品質：{', '.join(f'QR-{i:02}' for i in r['quality'])}。非待機：{', '.join(f'NB-{i:02}' for i in r['nb'])}。外部根拠：{', '.join(r['sources'])}（[出典](SOURCES.md)）。",
        '',f"[自由発案カード](USER_RESEARCH_CARDS.md#{r['id'].lower()}) · [AI別案](AI_INDEPENDENT_PROPOSALS.md#{r['id'].lower()}) · [試験](VALIDATION_PLAN.md) · [判断](DECISIONS.md)",
        '', '**全対応機能**：'+ '、'.join(f"[{i} {src[i]['name']}](features/{src[i]['category']}.md#{i.lower()})" for i in r['features'])+'。']
write('ROOT_PROBLEMS.md','\n'.join(lines));js('root_coverage.json',roots)
card=json.loads((R/'card_content.json').read_text());lines=['# 自由に発想するための研究課題カード','',
'**最初はこの資料だけで考えられる。** 技術的な正解を答える必要はなく、制作中にどう振る舞ってほしいか、途中の思いつきでも研究の入力になる。返答は任意。未回答で他研究は止めない。AI案は別資料に記録済みだが、この資料に候補一覧を混ぜない。','',
'最初に読みやすい順はR01（指と線）、R04（直した境界）、R02（途中の次操作）。どれも一つだけ発案してもよい。全Rを一度に回答する必要はない。']
for r in roots:
    c=card[r['id']];lines += ['',f'<a id="{r["id"].lower()}"></a>',f'## {r["id"]} — {r["name"]}','',
      '**① 対象機能**：'+'、'.join(f"{i} {src[i]['name']}" for i in r['focal'])+f"。全関連機能は[対応表](ROOT_PROBLEMS.md#{r['id'].lower()})。",
      '', '**② 理想の制作体験**：'+c['ideal'],'','**③ 現在考えられる問題**：'+c['problem'],'',
      '**④ 一般的な解決方法（参考）**：'+c['usual'],'','**⑤ 根本的な問い**：'+c['question'],'',
      '**⑥ 技術上の制約**：'+c['constraints'],'','発案状態：**ユーザー未回答・自由発案の機会を保持**。AI案の有無と方式採用は別。']
write('USER_RESEARCH_CARDS.md','\n'.join(lines))
# Source manifest is an immutable baseline check, not a claim of independent human approval.
required=['FEATURE_MASTER_CATALOG.md','features.json','REQUIREMENT_TRACEABILITY.md','PRODUCT_INTERACTION_SPEC.md','EXPERIENCE_INNOVATION.md','NONBLOCKING_OPERATION_CONTRACTS.md','QUALITY_REQUIREMENTS.md','PRODUCT_VISION.md','COMPETITOR_RESEARCH.md','RESEARCH_SOURCES.md','DECISION_REGISTER.md']
for fn in required:inputs[str((P/fn).relative_to(REPO))]=sha((P/fn).read_text())
js('baseline_manifest.json',{'base_commit':BASE,'source_hashes':inputs,'feature_ids':list(src),'categories':dict(Counter(f['category'] for f in features)),
    'scope':'個別仕様の固有目的/設定/操作/失敗/再編集、分野共通契約、全ID/参照を点検。原文を再生成せず保持。','product_code_present_in_tree':False,
    'feature_section_count':len(allsections),'research_mutation_scope':'docs/performance-research/ only'})
print(json.dumps({'features':len(records),'categories':len({f['category'] for f in features}),'roots':len(roots),'cards':len(card),'map_relations':sum(len(r['features']) for r in roots)},ensure_ascii=False))
