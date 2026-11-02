# Stage③ — 247機能の受入定義と検証の境界

**247件の操作契約をAIが再監査。実製品の受入合格・実人の承認ではない。** 元30分野247件、通常234/限定2/保留10/対象外1を維持。原仕様・固有入力/操作/結果・作用先・端末入口・失敗・履歴・保存を[対応表](FEATURE_CONTRACT_CROSSWALK_247.json)で参照する。

## 1. 定義と実行結果を分離する

各行の固有`acceptance_case`、`parameters / prerequisites / during_operation / apply_cancel / undo_contract / native_persistence / failure_recovery_contract / action_variants`を一組の受入定義とする。共通のIdentity・版・取消・SaveFence・再読込・クラッシュ保護はルート`acceptance_inheritance`からシステム契約へ接続する。77行の式は[数値契約v1](NUMERIC_CONTRACTS_V1.json)で特殊化し、残るフィルターの既存式は各固有例に保持。ランチャーは選んだ子機能の式を用い、汎用の架空処理にしない。

`contract_review`は2026-11-02のAIによる原典/状態/算法整合レビューの記録で、人の承認を意味しない。元の6項目`acceptance_test_draft`は履歴互換のため残すが、同じ文型の存在を完成根拠にしない。`formal_engine=not-implemented`、`device=unverified`、`human_verified=false`を維持する。

再監査でCanvas外保持の例をリンク素材から本来の範囲保持へ修正。FX107の重みと期待画素、FX109の係数/Tint、LIN001の「空」と「非空透明面の外側領域」、TRN004の半径0の扱いも数値正本と一致させた。まだ人が説明なしで理解できたという結果はない。

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


## 3. 数値定義とCPU参照

旧追加P1が列挙した21件の未定義欄を式・変種・境界へ接続した。さらに、レビューで曖昧だった選択集合・磁気経路・修復境界・ベクター幾何・グラデーション・細線/影/光彩などを補強。すべての数値式に製品コードがあるという意味ではない。113 CPU試験と独立Canvas64条件の適用範囲は`TECHNICAL_DECISIONS.md`と参照manifestで特定する。式を固定してから必要な正式エンジン/実機の受入試験を行う。

`tools/audit_stage3_acceptance.cjs`は構造と参照リンクを検査する。文章の長さ、同じ実装から生成した値、CI成功だけを全画質の証明にしない。全変種のGPU誤差・物理保存・コードック互換・任意ICCは第④段階で初めて実行できる試験として未実施。初見の発見性/Undo説明/レイアウト探索/実指誤タップは**第③段階の未閉鎖条件のまま**残す。

## 4. 完成ゲート

定義済み、限定CPUで参照成立、試作DOMで操作可能、製品エンジンで検証済み、初見実人で検証済みを別々に記録する。247件の定義整合だけで第③段階全体を完成としない。最終HEAD CIと元監査の閉鎖条件、未実施の人による評価を[最終監査](FINAL_DESIGN_AUDIT.md)で判定する。
