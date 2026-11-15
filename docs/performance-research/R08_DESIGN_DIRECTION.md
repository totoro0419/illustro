# R08 — 差分画像履歴＋共有不変ブロックと旧Illustroの歴史管理原則

日付：2026-10-29 JST
状態：**基本方針確定（ユーザー承認）**。詳細アルゴリズム・保持容量・実機性能・物理ファイル形式は後工程。

## 決定した基本方針

- **描画済み画像の差分を基本とするUndo/Redo**：変更した画素タイル（必要ならタイル内の変更範囲）について変更前後の正確な内容または不変Revision参照を保持し、通常のUndo/Redoで全筆跡を初めから再演しない。R07の「完成済み画像主体の差分保存」と整合させる。
- **不変な画素データの共有**：変更がなかったタイル・ブロック・素材データをRevisionや複数の分岐で共有する。作品全体を毎操作コピーしない。変更単位だけ新しいデータを確保する候補。
- **ユーザー意図単位のTransaction**：一筆は一Undo、塗り操作・変形の確定・レイヤーのまとまった変更・連続パラメータ調整は適切な一操作としてまとめる。入力サンプルごとに履歴項目を増やさない。
- **分岐とUndo/Redoの区別**：過去へ戻って別編集した場合、通常のRedo操作の進路と、保存された別案・名前付きSnapshotの寿命を混同しない。参照中・固定した版／分岐は無断で削除しない。通常RedoのUI上の消去と、過去の版の物理削除は別判断。
- **Hot/Cold階層**：近いUndoを迅速に復元できる作業キャッシュを優先し、古い画像差分は圧縮メモリや端末内ストレージへ退避する候補。GPU上の画像だけを作品/履歴の唯一の正本にしない。復元に必要な正本は保護し、破棄可能な表示キャッシュと分ける。
- **操作受付と画面反映を分離**：高速な連続Undo/Redoでも正しい順序を保持し、途中の不要な合成や表示を省略できる場合は最終の確定状態だけ表示する。ただし受理した操作を失わない。
- **用途別の寿命**：通常Undo/Redo、比較用の分岐・名前付きSnapshot、Timelapse、マクロ、通常保存、異常終了Recoveryは別の意味・保持条件を持つ。使えるデータは共有しても同一概念にしない。
- **軽量で正確に**：レイヤー操作・素材更新・効果変更でも意味の整合性を維持。Undo履歴とR07の保存/復旧、R06のレイヤー合成・メモリ予算を統合して扱う。

## 旧Illustroから根拠を確認して取り入れたもの

旧リポジトリ：[totoro0419/illustro_old](https://github.com/totoro0419/illustro_old)

- [ADR-0003 — Command / Undo / Redo / Snapshot](https://github.com/totoro0419/illustro_old/blob/main/docs/architecture/ADR-0003-history-command-snapshot.md)：一操作のTransaction→Revision、immutable root参照による履歴移動、分岐Revision、同一内容の共有、hot/cold履歴、Snapshot/Timelapse/Recoveryの区別。**旧文書が「Accepted」と書くのは当時の状態**で、今回あらためて有用な原則のみ採った。
- [LEGACY_REFERENCE_POLICY](https://github.com/totoro0419/illustro_old/blob/main/docs/LEGACY_REFERENCE_POLICY.md)：過去案はSource of Truthではなく参照資料。特定タイルサイズ・固定履歴保持数・固定Worker/Cache方式を無条件に継承しない。
- [INTEGRATION_VALIDATION](https://github.com/totoro0419/illustro_old/blob/main/docs/architecture/INTEGRATION_VALIDATION.md)：GPU表示キャッシュは作品の正本ではない、Sparse Tile、dirty subrect、Undo/Recovery/Saveの責務分離、履歴共有とGC保護の整合。
- 旧リポジトリのPR #35にもタイル画像履歴の試作資料があるが、**今回確認したのはPRの変更ファイル一覧まで**であり、未閲覧のコード/性能を事実認定していない。

## 引き継がない・保留する部分

- 旧設計の固定タイル幅（例：128/256px）、固定Undo回数、キャッシュ件数、実装言語・保存API・GPU運用などは、新Illustroの値として確定しない。
- 「常に履歴をメモリへ全部保持」や「Undoのたびに全Canvas再計算」は採用しない。
- どの古い履歴を永続保存するか、名前付き版と非固定のRedo分岐の寿命、圧縮形式、GPU/メモリ/OPFSの正確な階層、バッチ合成の表示切替、再計算が必要な例外条件は後工程で定める。
- タイルの変更前後状態と不変Revision参照の組み合わせが最良かは後日測定する。品質・Undo順序を損なわず低遅延であることを合格条件にする。

**今は基本方針を確定する段階なので実装・実測・PR統合は行わない。**

[研究カード](USER_RESEARCH_CARDS.md#r08) · [R07差分保存](R07_DESIGN_DIRECTION.md) · [R06階層キャッシュ](R06_DESIGN_DIRECTION.md)
