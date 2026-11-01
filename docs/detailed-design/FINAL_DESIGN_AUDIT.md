# 第③段階 最終統合監査

## 判定：NOT COMPLETE

PR9の開始HEAD `17a5ff778e4643d71d2d72798f0966baff40755a`を取得し、その上で継続。依存は#1→#2→#3→#5→#6→#7→#8→#9。#4は別分岐。mainの更新・merge・第④段階の製品実装は行っていない。READMEを読み、当該checkoutにAGENTS.mdがないことも確認した。

P1はAUD006の設計閉鎖で0件となった。ただし未解決P2/P3、機能固有の受入・別のUI判断が残るため、設計完成は宣言しない。実機性能の未測定だけを理由にした判定ではない。

## 1. 4工程の実績

| 工程 | 実施したこと | 到達状態 |
|---|---|---|
| 監査19件 | 原指摘/PR9修正を再評価、Undo/Layer/Session/Focus/Intent/Sheet/色/焦点を修正、AUD006の後段編集意味を本人決定・参照実験で確定 | Stage③閉鎖14、未閉鎖5 |
| 重要技術 | CPU Fraction期待画素、atomic Handoff、順序/分岐/保存/失敗注入、実CMM精度、採否比較と数値/資源契約 | 限定参照成立。全Warp/Effect/ICC条件は未閉鎖 |
| UI/UX | 8フロー、端末幅/文字拡大、hit/focus、模擬新規/保存再読込/出力、比較可能なFocus案、別プレビュー配置 | 自動DOM/手動Chromium確認。実端末/初見評価/正式承認は未実施 |
| 247機能統合 | 原典scopeと15観点の対応、固有failure条件・複数action例外を補強、988の実DOM詳細導線 | scope保持。全機能の意味/全交差受入は未完了 |

## 2. 19指摘と新規問題

| 重要度 | 元件数 | Stage③閉鎖 | 未閉鎖 |
|---|---:|---:|---:|
| P0 | 0 | 0 | 0 |
| P1 | 7 | 7 | 0 |
| P2 | 11 | 7 | 4 |
| P3 | 1 | 0 | 1 |

[台帳](AUDIT_REMEDIATION.md)／[JSON](AUDIT_REMEDIATION.json)が原因、修正、original scenario、before/after、回帰、残余を保持。閉鎖は設計原因とレビュー試作の範囲であり、製品実装済みを意味しない。旧実装が存在しない仕様欠落を「製品before試験でFAIL」と捏造しない。

新規3件：対象削除後のSession確定（P1）、旧α固定Alpha Lockの透明部への描画（P2）、SV表示色相と実採用色相の不一致（P2）。原因を修正しモデル/画素/DOM試験へ接続した。再監査でQuick等の閉鎖後に焦点が消える経路も修正し追加検査する。全組合せについて新規問題0を証明したとは主張しない。

未閉鎖：

- AUD008/P2：名称を教えない課題と同義語集合の発見性。
- AUD010/P2：全247機能の主入口・スクロール・候補開始までの実測。既知ID検索988件と名目手数を区別。
- AUD016/P2：Pad/資料/Session/作品を含む実UIとUndo作用先の利用者理解。
- AUD017/P2：中間幅で同じ制作課題の遮蔽/開閉/探索時間比較。
- AUD019/P3：全標的の例外評価と実指誤タップ。

## 3. 重要技術の実験と限界

- **30 CPU参照試験**：期待画素は手計算Fraction。Paint/Erase/半透明/Smudge/Alpha Lock/Selection/Mask/Clip/Blend/変形再編集/Undo/Save/Reloadを小規模条件で比較。全体連成のfold fragment＋後段全演算＋Multiply＋保存往復も含む。
- Handoffは24通りのtile完了順で同一画素/αと排他責任を比較。split公開の二重/欠落を反例化。実GPUへの転送と大規模Effect依存の実証ではない。
- A→B→Undo→Save→A完了→Redo→Reloadの期待は保存A、現表示A+B。旧枝pin、逆順複数Save、Quota/途中終了のモデル、依存失敗Bと独立C、device epoch、writer枯渇を検査。
- **実CMM限定比較**：Little CMSと独立CSS行列、6色×DBL/8U/16U/16F/ICC保存再読込。ローカル2.14で事前上限内。任意ICC LUT/Proof/CMYK/GPU/全色域は未検証。
- `SYSTEM_CONTRACTS.md`に数値丸め/誤差上限、sample時刻とViewPose、資源式、Cache依存、Clip循環拒否、保存先sequenceを追加。`TECHNICAL_DECISIONS.md`に10軸比較と採否。

選択した数値上限は達成した製品性能ではない。tile寸法、GPU dispatch上限、peak RAM、thermal、各Effect kernel・任意ICC参照は確定済みとしない。正確性に反例のあるoverlay/加算差分/無言Bakeは採用しない。

## 4. 247機能と横断監査

**30分野247件、通常234・限定2・保留10・対象外1を維持。** 原仕様のID/名称/分類/現行scopeを1対1照合。保留/対象外を実行機能へ昇格していない。

[対応表](FEATURE_CONTRACT_CROSSWALK_247.json)の15観点を原典へ接続し、個別のfailure/quality条件を追加。LAY add/select、CLP copy/cut/paste、ICC assign/convert、紙選択/reapply、資料/試筆/作品管理の別scopeを具体化。表の空欄解消や既知IDの到達を、全機能の意味検証と同一視しない。

Brush×Transform、Fill×Selection×Layer、Mask×Clip×Blend、Effect×Cache、Save×Undo×Recovery、ICC×Export等の版・作用順・障害境界は`SYSTEM_CONTRACTS.md`§10へ統合。ただし全Effectの演算参照、任意ICC/Proof、Pad/資料の操作試作、全247固有の受入には草案が残る。後続AUD006の三角形Warp CPU参照は全Effect kernelの数値契約完了ではない。これを実装者が決める前提で完成扱いしない。

## 5. UI/UX・公開

[UI検証台帳](UI_UX_REVIEW.md)に8制作フロー、実装済み試作状態と未実装画像処理を分離。主要な文字/色/焦点/Sheet干渉を修正。320/390/740/760/800/960/1180px、Tablet縦820×1180、文字200%、キーボード相当geometry、合成二指の検査。これはAndroid/iPad/Windows実機ではない。

Pages失敗は[元run](https://github.com/totoro0419/illustro/actions/runs/41192510066)のAnnotationsで、設計ブランチに対する`github-pages` Environment保護による拒否と確認。保護規則は変更せず、Performance Labも維持。

[代替プレビュー](https://illustro-stage3-review-c2c1.ibukioike2009.chatgpt.site/)をSitesにowner-privateで配置。デプロイ成功はネイティブ結果で確認。クラウドブラウザーはログイン要求のためデプロイ版の操作は未確認。管理ローカルプレビューで表示・Undo・Focus色Panelを操作確認した。

ユーザー判断待ち：Focus一時Panel/標準復帰、候補Undoと作品Undoの提示、横持ちスマホ帯。非破壊変形後の後段描画・消去・混色をDocument座標固定とする製品意味は2026-11-01に本人が同意（実画面の初見UX試験ではない）。

## 6. 再現とCI

確認済のコードHEAD `ce98f6c5bd805b5055cdfcaec98e3e5adba6111d`：[Actions 41206428072](https://github.com/totoro0419/illustro/actions/runs/41206428072)全工程成功。後続の証拠更新commitは文書/台帳のみ。

- Node既存12＋追加12、既存Chromium11、追加Chromium32、実DOM247×4=988、TypeScript型検査、runtime no-document oracle、資料照合7、単体HTML生成一致。
- 同じ追加DOM期待をPR7に適用し30失敗/2成功。新要素不在も含むので「26個の不具合」とは数えない。共通DOMを使ったLayer反例とSVキー/focus、重心四隅も回帰に含め、現版で成功した。
- 原Intent型では現在のno-document例がコンパイル失敗、現型では成功。
- CPU参照30件、実CMM 6色×DBL/8U/16U/16F/保存ICC再読込、runtime/型境界も同じコードHEADのCIで成功。実CMM版は2.14。結果と実行版は[evidence/ci-2026-10-31.json](evidence/ci-2026-10-31.json)へ保存。未実行の実機/GPU/Native耐久へ一般化しない。

ローカルはブラウザーbinary取得が失敗したため、ブラウザー自動検査はGitHub runnerで実行。管理ブラウザー手動確認と混同しない。実端末/実GPU負荷/Native・OPFS物理耐久/読上げ/初見利用者は未実施。

## 7. 引渡し判定

無条件の第④段階移行は**不可**。AUD006の設計意味は閉鎖しP1=0となったが、機能固有の数値/受入、残るUI判断・P2/P3と最終監査が未完了。確定した境界契約と参照資産は[引渡し仕様](STAGE4_HANDOFF.md)に整理した。

同じAIによる反例・再監査であり、完全に独立した第三者監査ではない。

## 8. AUD006追補（初回監査より後のコミット）

初回監査のCI集計30件はその時点の記録として維持する。後続変更で追加された三角形メッシュWarp、折返し、bilinear/cubic B-spline、固定Smudge、二つのlive Effect、Save根の13件は [AUD006専用契約](AUD006_WARP_REFERENCE_REVIEW.md) に詳細を記載。CIの後続結果はその実行commitと共に評価する。いずれも製品GPUの動作保証ではない。

2026-11-01の対話で、後段の線・消去・確定混色を旧Transformの再編集に自動追従させずDocument座標固定とする意味に本人が同意。既存30件＋追加13件のCPU参照、折返し/半透明/Mask/Clip/再編集/Undo/保存再開の複合試験を含むCI全工程の成功（[run 41214784305](https://github.com/totoro0419/illustro/actions/runs/41214784305)、HEAD 7d74e92）と合わせAUD006を**Stage③の設計指摘として閉鎖**。本人の判断は実画面の初見UI試験や製品GPU実装検証とは異なる。それらは④段階の試験へ引き継ぐ。未閉鎖P2=4/P3=1のため全体判定NOT COMPLETEは維持する。

## 9. 残存UI/UX 5件への第③段階追加修正（2026-11-01）

[追加の修正・受入境界](STAGE3_UI_REMEDIATION_5.md)を参照。AUD008は目的語検索と表示候補、AUD010は直接入口とカテゴリ既知247 DOM経路、AUD016は3つの独立履歴の明示Undo、AUD017は中間幅のCanvas列420px下限、AUD019はcoarse標的と320px/200%文字の可視hitを試作に追加した。

- 追加のNodeテストは16種類の「機能名を教えない制作目的」と3 scopeの履歴/Redo枝、作品・Session・Save不干渉、新規作品時の寿命を検証する。
- 追加のChromium DOMテストは制作目的の候補選択、Clip/Mask/入り抜きの直接入口、scope別Undo、740/760/761/800/960/1180pxのCanvas/Sheet、320/390/740/800pxのcoarse可視ヘッダー標的を測定する。
- 全247件のカテゴリ既知経路は既存988件のID既知経路と**別の試験**。初見利用者が自力でカテゴリを選べることを示すものではなく、真の最短経路を測った意味でもない。
- screenshotsとDOM矩形はCIのtest-resultsに保存する。ブラウザ試験の成功は実ペン・実指・初見利用者の誤押下率や探索時間の合格証明にならない。

**判定：上記5件は設計試作を改善したが、元の閉鎖条件にある利用者試験・全入口/全標的の例外計測が残るため、監査上は未閉鎖のまま。** Stage③全体は14/19閉鎖、P1=0・P2=4・P3=1、NOT COMPLETE。ユーザーのFocus・Undo提示・スマホ横画面の判断も未承認。今後の品質判断は「実施した試験」と「要求されているが未実施の試験」を混同せず更新する。

**実行済みの回帰根拠**：コードHEAD `f958f3eedab5abb1a819852f0d55d527ff33a3b0` の [GitHub Actions 41259682637](https://github.com/totoro0419/illustro/actions/runs/41259682637) で全工程SUCCESSを確認。16目的語のNode索引テスト、Pad/資料/作品管理Undo、14件の追加Chromium操作/寸法、既知ID988＋既知カテゴリ247（合計1,235）の実DOM詳細経路、既存型/CPU/ICC/旧版回帰、単一HTMLの生成一致を含む。各経路のスクロール・機能本体・初見到達の合格は意味しない。
