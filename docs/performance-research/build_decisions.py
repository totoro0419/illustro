#!/usr/bin/env python3
import json,re
from pathlib import Path
R=Path(__file__).resolve().parent
roots=json.loads((R/'roots.json').read_text()); records=[]
recommend={
'R01':('A+CとBを比較','表示姿勢だけでpixel更新を待たない経路と、小分け厳密評価の実機比較。接地継続/休止はユーザー発案と比較待ち。'),
'R02':('B+Cを優先試作、Aをoracle','依存順の受理済編集と、隔離した未適用sessionを分ける。E01は限定成立で実依存の宣言は未検証。'),
'R03':('Aを基準にB/Cを筆別比較','被覆集約や有限再評価が同値な筆だけ仕事を省く。全筆へ一般化しない。'),
'R04':('B+CとAを比較','位相構造と人の制約を別に保持。局所性と手修正対応は未検証。'),
'R05':('B+CとAを比較','必要入力域と恒等/共有で不要passを減らす。E04は有限1Dのみ。'),
'R06':('B+CとAを比較','予算と疎保持、容量予約で全体制御。E02/E05は実端末性能ではない。'),
'R07':('B+CとAを比較','保存境界と世代公開。E07はローカル機能検査で耐電断未検証。'),
'R08':('B+CとAを比較','共有正本と復元checkpointの交換条件を測る。再演だけで同像は保証しない。'),
'R09':('A/B/Cを操作課題で比較','対象探索/再指定削減の仮説。実利用者の直感性評価が必要。'),
'R10':('Bを軸、A基準、Cを追加比較','精度と色契約を閉じる。Cの表示近似は許容誤差未確定。'),
'R11':('A+C、Bは作業体験と比較','逆写像不能や層増加を作者へ押付けない。基本文字と高度組版は原承認範囲維持。'),
'R12':('A+BとCを表現比較','進行と停止の正本。Cが必要表現を満たすか未検証。'),
'R13':('B+CとAを形式別比較','能力graphの過剰共通化を避け、形式別保持検証。'),
'R14':('A+C、必要時B','未使用負荷とcold待ちの交換を実測。将来候補の採用は別判断。')}
lines=['# 方式選定・判断台帳','', '**正式採用0件。** 42案は検証待ちの比較候補。推奨は次に比較する価値の判断であり製品採用ではない。原PRの6方針承認を内部方式へ拡張しない。ユーザー案は全R未回答、自由発案の機会を保持する。','',
'| 判断 | 比較推奨 | 状態・理由 |','|---|---|---|']
for r in roots:
    rid=r['id'];rec,reason=recommend[rid];lines.append(f'| {rid} | {rec} | 検証待ち。{reason} |')
    for alt in 'ABC':
        records.append({'id':rid+'-'+alt,'research':rid,'state':'verification_pending',
        'formal_adoption':False,'user_ideation':'open_unanswered',
        'principle_conditions_and_limits':f'AI_INDEPENDENT_PROPOSALS.md#{rid.lower()}',
        'tests':['T'+rid[1:]],'comparison_recommendation':rec,'reason':reason,
        'technical_feasibility':'条件付き設計評価。個別の原理/成立条件を独立案表に記載。実装検証は未完了。',
        'measurements':{m:'not_executed_on_product_or_device' for m in ['input_response','tracking','completion_time','cpu_load','gpu_load','peak_memory','battery','temperature','large_artwork','pixel_color_pressure_correctness','undo_save_non_destructive','simultaneous_interference','interaction_steps_intuitiveness','implementation_maintenance']}})
lines += ['', '## 条件付きの却下/保留','',
'| 方針 | 判断 | 理由・範囲 |','|---|---|---|',
'| 最新版と異なる結果を全て破棄 | 受理済編集への適用を却下 | 古い表示候補の置換には使えるが、遅い一筆を無言で落とす用途は原要求違反 |',
'| 全処理を一つの直列待ちで停止 | 製品の唯一方式として却下 | 正解oracleには保持。指ナビ/独立操作まで停止させる採用は不可 |',
'| 領域修正は常に半径固定で更新 | 一般方式として却下 | E03の反例。局所性を検証できる条件内の最適化は残す |',
'| 出力Maskだけをblur入力に使う | 一般方式として却下 | E04で全域oracleと不一致。入力制限を明示した別効果は別仕様 |',
'| 全機能を縮小途中像へ統一 | 保留・汎用正解とはしない | S03の制約、湿式/粒/高倍率/精度の品質比較が必要 |',
'| 旧128/256 Tile、GPU/Worker構造 | 未採用の比較候補 | 過去要件ではなくE05と実試作から決める |',
'| 色深度や重要表現の自動削減 | 却下 | 低資源で動作したという理由では原能力保持を代替できない |',
'| 固定Quickの機能を自動再配置 | 標準として却下 | 位置記憶/原仕様と衝突。任意編集は保持 |',
'| Native HDR32/CMYK、高度組版、拡張/共同/3D | 原仕様どおり保留/比較枠 | 本研究で勝手に削除/正式採用しない |',
'', '## 確認済みの資料上の問題（実装不具合ではない）','',
'1. 元仕様のREC-001/REC-004固有設定にはDEC-14「未承認」の語が残る一方、DECISION_REGISTERと分野冒頭では2026-10-27承認済み。本研究は承認済みOFF/ONを正とし、原文を変更しない。',
'2. 共通操作仕様の分野末尾にDEC-01/02/07/10/14/16を未承認とする古い定型記載がある。最新の判断台帳と個別承認範囲を優先。これを新たな承認依頼の理由にしない。',
'3. 「全247機能を研究対象」と「全247機能が正式採用済み」は異なる。EXTの範囲外/保留、FX群入口と個別効果の関係を維持した。IDは分割/水増ししない。',
'', '## 今回閉じない判断','',
'接地中の筆の意味、境界更新の手修正対応、変形後の上描きの扱い、低資源時の停止/救出体験はユーザー共同発案を待つ。実機応答/色誤差/資源予算/保存API耐久性は客観検証を待つ。ユーザー回答だけで実現性を合格にせず、計測だけで作者の意味選択を確定もしない。']
(R/'DECISIONS.md').write_text('\n'.join(lines)+'\n');(R/'candidate_decisions.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
# Explicit mapping of all 25 existing experience ideas to new technical work.
maprows=[
('01','02,07','受付から保存までの状態/時点境界。受理済編集はlatest-wins不可。'),
('02','01,03,11','時刻付き表示変換と筆の局所性、接地意味の二案比較。'),
('03','09,02','対象解決をCommandと受理レコードへ接続しUI表示と一致。'),
('04','02,09','依存競合の判定とsession差分取消、独立編集保持。'),
('05','04,02','塗り再評価の参照版と同Undoへ統合できる期限。'),
('06','05,08,10','候補が参照する同一版と色/表示条件、比較cacheの予算。'),
('07','04,11','同版区分照会と独立濃度Mask、面IDと手修正制約の比較。'),
('08','09,14','軽い検索宣言と固定Command入口、初回実行の準備境界。'),
('09','02,08','session意図列と作品履歴の異なる根、取消寄与の分離。'),
('10','09,12,10','実行器の共有と文書/Undoの独立、紙/色条件の同一化。'),
('11','05,09,10','効果ごとの必要入力域、画像上操作と数値契約。'),
('12','04,09','位相差分と判断が必要な制約の局所提示、確認総時間。'),
('13','09,05','安い候補絞込と正確な被覆照会、GPU同期を含むhit費用。'),
('14','09,01','一時窓の入力所有と安定復帰、遮蔽/指領域を測る。'),
('15','11,08,04','凍結Maskと生成元の別版、範囲を共有しても自動追従させない。'),
('16','11,09','逆写像の成立検査と元内容/新層/焼込の局所的な入口。'),
('17','08,06','不変根の共有と保持範囲、GCと保護pinの競合。'),
('18','07,09','保存成功request IDと後続変更の区別、誤解の実利用者検査。'),
('19','13,10','形式能力graphと損失/色/編集性の往復oracle。'),
('20','02,13,14','意味的対象の束縛、隔離マクロと外部副作用の分離。'),
('21','07,02,08','保存fenceと全依存の固定、prefixと後続根の別評価。'),
('22','01,02,07','cancel/upを別状態にし観測済部分の救出と保留復元。'),
('23','09,13,10','不能理由をCommand能力判定から返し無断代替を防止。'),
('24','02,08','対象Identity/生存世代/表示epochを分離、受理済と候補を別処理。'),
('25','14,06','宣言/実行/活動依存の分離、cold/warm/未使用/熱の予算。')]
lines=['# 既存改善案・品質・非待機契約との対応','',
'25案を単に言い換えたものとは区別し、各体験案が必要とする内部の比較課題を示す。原案の採否は変更しない。新しい性能達成報告ではない。','',
'| 既存案 | 研究先 | 今回踏み込んだ比較/検証 |','|---|---|---|']
for exp,rs,why in maprows:lines.append(f"| EXP-{exp} | {', '.join('R'+i for i in rs.split(','))} | {why} |")
lines+=['','## 品質要求の対応','','| 品質 | 研究先 |','|---|---|']
for i in range(1,23):lines.append(f"| QR-{i:02} | {', '.join(r['id'] for r in roots if i in r['quality'])} |")
lines+=['','## 非待機契約の対応','','| 契約 | 研究先 |','|---|---|']
for i in range(1,13):lines.append(f"| NB-{i:02} | {', '.join(r['id'] for r in roots if i in r['nb'])} |")
lines+=['','機能→Rの全625関係は[台帳](root_coverage.json)。QRの具体的試験は[検証計画](VALIDATION_PLAN.md)へ、原要求は[QUALITY_REQUIREMENTS](../product-planning/QUALITY_REQUIREMENTS.md)、処理別契約は[NB原文](../product-planning/NONBLOCKING_OPERATION_CONTRACTS.md)へ。']
(R/'REQUIREMENT_CROSSWALK.md').write_text('\n'.join(lines)+'\n')
print('42 candidate records; 25 EXP, 22 QR, 12 NB mappings written')
