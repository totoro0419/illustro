# Illustro 本番実装基準 — 2026-10-05

本番実装はこの文書と `CANONICAL_INDEX.json` を入口に開始する。旧設計の「全実装停止」はこの依頼で解除された。解除はCore Drawing Sliceと必要な基盤整合を開始する意味であり、アプリ完成・全機能合格・mainへのmergeを意味しない。

## 優先順位

一枚絵の制作体験を主要ペイントアプリより良くする。直感的操作 → 使いやすさ・軽さ・追従 → 多機能。公開された優れた方式は積極的に採用する。内部実装は推測しない。機能名だけの実装を完成扱いにしない。

## 各マイルストーン開始時の必須確認

すべてのマイルストーン実装は、コード変更より先に次の順序で開始する。

1. `docs/IMPLEMENTATION_BASELINE.md` を読む。
2. `docs/CANONICAL_INDEX.md` を読む。
3. 対象分野について `CANONICAL_INDEX.md` が示す **CANONICAL（正本）owner** を特定する。
4. その正本設計を読んで、今回の実装範囲・既存仕様・変更禁止事項を確認する。
5. 正本と現行コードに差がある場合、現行の仮実装を最終仕様とみなさず、正本との整合方法を決めてから実装する。

対象の正本設計を確認せず、現行コードや仮UIだけを見て独自解釈で仕様を変更してはならない。正本同士に重大な矛盾がある場合は推測で補完せず、矛盾箇所を明示する。

特にUIでは、現在のEditor skeleton / QA UI / 仮配置を最終仕様として扱わない。対象に応じて少なくとも以下の確定済み正本を確認し、最終統合時に反映する。

- Left UI: `docs/ui/LEFT_UI_SPEC.md`
- Right UI: `docs/ui/RIGHT_UI_SPEC.md`
- Layer Page: `docs/ui/RIGHT_LAYER_PAGE_SPEC.md`
- Input Control: `docs/ui/UI_INPUT_CONTROL_STANDARD.md`
- Workspace Customization: `docs/ui/WORKSPACE_VISUAL_CUSTOMIZATION_SPEC.md`
- Compact UI: `docs/ui/COMPACT_IMPLEMENTATION_BASELINE.md`

マイルストーンが上記UI全体の完成を対象にしていない場合、未対象機能を先取りして全面実装する必要はない。ただし、今回作るUIやデータ境界が正本の最終統合を妨げる構造にならないようにする。

各実装チャット用プロンプトには、必ず **「`IMPLEMENTATION_BASELINE.md` と `CANONICAL_INDEX.md` を最初に確認し、対象分野のCANONICAL設計を読み、独自解釈で変更しない」** という要件を含める。

## 正式ロードマップ

本番実装のマイルストーン番号・名称・順序は、`docs/IMPLEMENTATION_CHECKLIST.md` の **M01〜M47** を正本とする。

- M01〜M03は合格・固定済み。
- 現在の実装対象はM04「Eraser正式統合」。
- M05以降は、M05 Save基盤 → M06 基本Export → M07 本番PC/Tablet UI骨格 … → M46 v1 Release Candidate → M47 Illustro v1.0 Release Gate の順で進める。
- 過去のM05〜M40ロードマップは廃止する。過去文書内に旧番号が残っていても、現在の実装順序の根拠にはしない。
- Managerや実装チャットは、ユーザー承認なしにM01〜M47を改番・統合・順序変更しない。内部サブタスクへ分解しても外側のマイルストーンIDは維持する。
- **M47の合格をv1.0最終完成判定とする。** M46まで完了しても自動的にv1.0完成とは扱わない。

## 正本と優先関係

この文書 → 分野別正本（[一覧](CANONICAL_INDEX.md)）→ 採用試作 → 過去の検査資料。矛盾はこの順で解決する。カタログのInvestigateや水彩物理・高度な自動化等は今回の必須範囲へ昇格させない。

- Product / Featureの目的を維持し、1–12統合仕様を具体的な機能挙動に使う。
- Architecture V2のIdentity / Raster / Brush境界 / Persistence / Region責務を採用する。
- Brush Foundationは採用試作として固定。Renderer・補正・入力保持・シェーダーを理由なく作り直さない。ただし、実機で確認された共通表示不具合は端末別回避で隠さず、作品データを変えない表示段だけを根本修正し、source lock更新・Brush回帰・WebGL2/WebGPU・実機QAをやり直して昇格する。
- PC/Tablet UIは承認されたLeft / Right / Layer Page / 入力標準 / カスタマイズ仕様を維持する。
- Compactは[実装骨格](ui/COMPACT_IMPLEMENTATION_BASELINE.md)で未決事項のみ解消する。最終見た目の承認とは区別する。
- LineartはRaster入力から太さなし境界・接続・領域構造を得る。[統合境界](architecture/REGION_ADOPTION.md)を守る。旧ADR-0005は移植しない。

## 最初に作る一連の操作

UIの固定骨格: 左にBrush/Eraser/Smudge/Eyedropper/Fill/Selection/Transform/Moveと固定All Features、右は12Box、上はHome/Save。Undo/Redoを上に置かない。右下固定はLayer Page/Undo/Redo/左右反転/上下反転。Boxは折畳み・並べ替え、PCでは切離し/再ドック、Workspace幅はドラッグと数値/直接操作で変更。Layer Pageは同じLayerモデルを読む。

Quick Controllerはpen-up後に現れ描画中は隠れる半透明ドーナツと6ボタン。左Undo/右Redo、全slotをカスタム可能。承認済みPC/Tabletの見た目は112px footprint、外径100/穴44/ボタン径28/中心配置半径36を維持。Auroraを基準とする明るいUI、オレンジ寄り黄色のアクセント、控えめな色相変化とグラデーション。色は色相環+HSV、数値系は直感操作と正確な数値入力を併用する。Skeletonの仮ボタン/未実装Colorを最終UIへ昇格しない。

起動 → 新規キャンバス → Brush選択 → 描画 → Eraser → Layer追加・選択 → Undo → Redo → Save → 再読み込み → 復元 → PNG Export。

マイルストーンの正式な実装順は `IMPLEMENTATION_CHECKLIST.md` のM01〜M47に従う。以下は番号とは独立した技術上の順序原則であり、ロードマップを上書きしない。

1. **文書・履歴・保存形式のV2整合**。既存Coreの疎な格納、変更部分だけの複製、取消、古い操作の拒否は再利用する。数値Revision / Blockの永続ID、max Revision方式のRecovery、RGBA8・正座標限定、可変canonical tileは本番ファイルに固定しない。UUIDと独立CommitSequence、256pxの論理区画、Surface形式、依存データ付き操作記録へ段階的に合わせる。
2. **描画・Layer・Historyを同じ正式Document経路へ通す**。既存Foundationの実入力と最終StrokeRecordを使い、一筆一Transactionを発行する。128pxの描画処理区画を256pxの保存区画へdirty範囲のみ変換する。入力中に全体読出し・全画面コピーを行わない。
3. **Save系はM05、基本画像ExportはM06で分離する**。M05では `.illustro`、Autosave、Reload、Recovery、Offline、Document Metadataを扱い、M06ではPNG/JPEG/WebPと保存・書き出しUIを扱う。保存時点のRevision固定、依存データの書込み検証、途中失敗で前の保存を壊さない原則を維持する。
4. **各後続機能は既存の正式Document / History / Save境界へ接続する**。Selection、Transform、Fill、Region、Effects、Liquify、Layer、Asset等を別系統の作品正本にしない。
5. **実機確認を各段階で行う**。CIを実機合格の代用にしない。各機能は[Feature Delivery Gate](FEATURE_DELIVERY_GATE.md)で実操作・Undo/Redo・保存/復元など対象範囲に応じて検証する。

## 実装境界

| 担当 | 所有するもの | 他へ直接行わないこと |
|---|---|---|
| UI | Tool選択、数値入力、Workspace配置、状態表示 | GPU命令や保存データの直接変更 |
| Document / Layer | 文書Root、Layer構造、選択対象、Transactionの公開 | Previewを正式画素として採用 |
| Raster | 不変画素、Surface、疎な256px論理区画、dirty範囲 | UIやBrushプリセットの管理 |
| Brush | 実入力整形、設定、確定StrokeRecord、描画命令 | Layer / Save / Region解析 |
| Renderer | 表示・dirty合成・一時GPU資源 | 文書の正本、保存済み判定 |
| History | 一操作一Revision、Undo/Redo、分岐 | Renderer専用履歴を文書履歴として公開 |
| Save | 固定Revisionと依存データの書込み・検証 | 書込み開始だけでSavedを更新 |
| Recovery | WriterEpoch/CommitSequence順の連続保護 | RevisionIdの大小で最新判定 |
| Selection | 範囲のcoverageと編集寿命 | Region identityとの同一視 |
| Region | 太さなし境界、Topology、訂正、世代・曖昧さ | 通常描画を待たせる常時解析 |
| Effects | 非破壊設定、必要区画の派生計算 | 元画素の暗黙破壊 |

UIは小さなController/Portを介して操作する。巨大ファイルや全機能共通の万能Event Busを作らない。既存Coreは[V2修正対象一覧](implementation/CORE_SLICE_001_FINAL_DISPOSITION.md)を持つ暫定基盤として再利用する。

## 軽さを守る実装規則

入力と最新先端の表示を最優先。見える範囲・変更区画・依存区画だけ処理する。全Layer再計算・毎stroke全画面readback・不要な全体コピーを禁止。Previewは古い仕事を捨てられるが実入力と確定精度は捨てない。GPUの送信待ちを増やさない。256pxは保存の論理区画でありBrushの128pxを変更する理由にしない。

Region、Effects、Asset scan、縮小プレビュー、PSD codecは必要時だけ動かす。サムネイルとNavigatorは同じdirty通知から低優先で更新。Workerは入力を待たせる理由にせず、重い独立処理へ使う。キャッシュは上限を持ち、追い出しても作品を失わない。Group Transform/Liquifyはグループ構造と各Layerを保ち、共有座標変換/変位を対象子へ適用して一括Undo可能にする。対象外・locked・非対応Layerを事前表示し、暗黙mergeしない。

## マイルストーン専用QA Pages

各マイルストーンのユーザー実機確認は、GitHub Pages上の**固定URL**を持つ。M01は `/qa/m01/`、M02は `/qa/m02/`、以降も同じ規則とする。標準URLは `https://totoro0419.github.io/illustro/qa/mNN/`。

- 各実装チャットは、そのマイルストーン専用QAページの作成・公開・実URL到達確認までを作業範囲に含める。
- `?qa=1`だけの一時的な確認方法は補助手段であり、固定QA URLの代用にはしない。
- 新しいマイルストーンを公開するとき、過去のQAページを削除・別内容で上書きしない。過去ページは「どの段階から壊れたか」を比較する回帰基準として残す。
- 同じマイルストーンのユーザー確認中は修正版へ更新してよいが、そのマイルストーンが✅合格・固定になった後は、Managerが明示しない限りそのQAページの内容を変更しない。
- QAページには今回確認する内容だけを普通の日本語で表示し、後続マイルストーンの未実装機能を混ぜない。
- Pages公開方式を変更する場合は既存公開物を先に確認し、単一artifact deployで既存ページを消さない構成にする。新しいdeployは、公開済みの過去QAページを保持した状態で行う。
- マイルストーン完了判定では、コード・テスト・CIに加え、専用QA URLへ実際に到達できることを確認する。到達未確認なら最大でも🧪であり、👤ユーザー確認待ちへ進めない。
- 各実装プロンプトには、対象ID、予定QA URL、そこで確認する内容、公開までが作業範囲であること、過去QAを壊さないこと、Pages反映確認を完了条件に含めることを明記する。

## 実装開始条件

| 確認項目 | 根拠 |
|---|---|
| 何を正本として読めばよいか一つに決まっている | CANONICAL_INDEXとこの文書 |
| 古い線画設計を取り込んでいない | mainから選別移植、旧ADR不在、source lock検査 |
| 合格したブラシを保存できている | 固定commitとHTML hash、既存回帰検査 |
| ボタンの主な場所が決まっている | Left / Right / Compact正本 |
| 文書・Layer・取消・保存の担当が明確 | 上の表とV2契約 |
| 最初の一連の操作と作る順番が明確 | Core Drawing Slice順序 |
| 実装を始める土台がある | apps/editor、既存CoreとFoundationを再利用 |
| できていないことを完成と表示しない | 未接続保存等を無効化、STATUSと検証記録 |

これらが検証できれば**本番実装を開始してよい**。Region全精度、Compact最終配色、全大手との品質優位性は各機能の出荷条件であり、Core実装を停止する条件ではない。
