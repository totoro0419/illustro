# Stage③ — 247機能の受入草案と13個の複合作用ID

**状態：設計上の検査候補。製品のPASSや全247件受入確定ではない。** 原典PR #5の247件とスコープ（通常234・限定2・保留10・対象外1）はそのまま。構造検証と製品実装試験を混同しない。

## 1. 247機能の共通「6契約」マトリックス

`FEATURE_CONTRACT_CROSSWALK_247.json`の247行すべてに、`entry`、`behavior`、`history`、`persistence`、`cross_feature`、`failure`の6項目が存在し、ID・名称・scope・30分野と関連feature参照は原典と一致する。機械的な形式の整合は[専用監査スクリプト](../../tools/audit_stage3_acceptance.cjs)で確認する。

ただし現在、**247行すべての `verification.design_review` は草案を含む状態**、`device`は未検証、`formal_engine`は未実装。六つの文章が存在するだけで個別の合格条件が**測れる精度で完成した**とは言えない。正式実装へ渡す際は、機能ごとに以下を追加する。

- 入力・初期状態・対象のDocument/Layer/Selection/Mask/ICC/Session版
- 一連の具体的なユーザー操作と、完了/取消/Undo/Redo/中断/保存復帰時の比較対象
- 期待する正本・表示・残る候補/独立編集・cacheキー
- 数値Kernelを持つ機能の誤差限界・境界条件・golden・色計算空間/alpha/精度
- 制約外の入力や失敗時の回復/表示/保護要件
- ③の契約試験と④の正式エンジン/実端末試験の証拠を**別欄**に記録

## 2. 13機能・33変種の特に重要な契約

同一feature IDが多数の異なる`action`を持つ場合、名前から自動的にDocument Undoへ帰属させない。各行の`action_variants`の`owner`が作用先の正本。

| ID | 操作ID | 作用scope／受入で検査する分岐 |
|---|---|---|
| CAN-003 | fit, oneToOne, flipH, flipV | Viewのみ。作品History/保存画素を変えない。反転の対象が作品/表示/Workspaceで異なることを提示 |
| WET-005 | selectPaper, reapply | 前者はSettingsで選択するだけ。後者は明示Document編集。Paperを選ぶ操作だけで既存絵が変わらない |
| WET-006 | padStroke, clear | Test Padの独立History。作品UndoとNativeの正式画素へ無断混入しない |
| COL-006 | assign, convert | いずれもDocumentコマンドだがAssignは値の再解釈、Convertは所定の色変換。Undo/保存後もICCの版を保持。誤差閾値は専用数値契約を要する |
| COL-008 | proof | Viewの色校正表示のみ。通常の採色・正本画素・作品Undo・PNG出力へ焼き込まない |
| LAY-001 | add, select | AddはLayer treeのDocument Undo、Selectは現在のUI対象変更のみ。選択をUndoで誤って過去に戻さない |
| LAY-002 | visibility, opacity, blend | Document中の各操作を一意図一Transactionとして戻す。Clip/Mask/Effect/表示との関係を保つ |
| TRN-008 | paintAppearance, editOriginal, newOuterTransform, bakeExplicit | 後段描画はDocument座標固定、旧Transform変更だけでは後段は動かない。後段もまとめて動かす新Transformと明示Bakeを別アクションにし、無言Raster化しない |
| REF-002 | move, scale, rotate | Reference専用History。画面上の資料配置は作品の画像出力から除外。元資料が消えても文書履歴を誤Undoしない |
| HIS-001 | undo, redo, candidateUndo | 先の2つはDocument History、候補UndoだけはSession内。試筆/資料/作品管理は専用ボタン。Focus・検索・Quickでも作用先は変えない |
| SAV-002 | trash, restore | Document Manager専用History。開いている作品の筆跡Undoではない。削除/復元の確認とデータ保護を別契約へ |
| SAV-003 | save, saveAs | Lifecycle SaveFence。要求時点の受理済み根を固定。保存要求そのものはDocument Historyを追加しない。名前変更と保存先競合を別試験 |
| CLP-001 | copy, cut, paste | CopyはClipboardだけ。Cut/PasteはDocumentで対象版を確認し各Transaction。候補中/旧Clipboard/権限拒否に反例を置く |

上記は設計の責務と期待動作を明文化するもの。**個別UI試作や正式描画エンジンに33変種すべてが実装済みとは主張しない。** 数値精度・物理保存・実指の試験は④と分離する。

## 3. 優先して詳細な数値契約が必要な領域

- **FX 45件**：Effectごとに数式/Kernel・範囲・端処理・Halo・色空間・premul alpha・順序・精度を数値契約へ固定。現時点でAUD006の3×3 blur/gainだけを全FX共通の実証と見なさない。
- **Warp/Liquify/Transform**：高解像度・fold・補間縮小・境界/移動/ペンとの同時操作について、③では意味・参照期待を設計し④では正式GPU/CPUで比較する。
- **Color/ICC・Print/Export**：任意LUT ICC/Proof/CMYKのAssign/Convert/Export条件と計算/出力/保存を分離。
- **Clip/Mask/Layer Blend/Selection/Fill**：依存順・循環禁止・版の固定・半透明境界の正本評価。
- **History/SaveFence/Recovery**：未完了筆・独立Session・分岐、失敗した書込みと古い正常版の扱い。

## 4. 検証の読み方

`node tools/audit_stage3_acceptance.cjs` は247件の元仕様との一致、6草案の存在、関連ID、端末別入口表、13複合作用機能の33個のaction ownerを確認し、`test-results/stage3-feature-audit.json`へ出力する。**構造がPASSでも機能の受入や画質がPASSした意味ではない。**

最後に `docs/detailed-design/UI_DECISION_PROPOSALS.md` の3件が本人に承認されたか区別し、AUD008/010/016/017/019の初見課題・実操作の残義務と併せて最終監査する。**第③段階の完了はまだ宣言しない。**
