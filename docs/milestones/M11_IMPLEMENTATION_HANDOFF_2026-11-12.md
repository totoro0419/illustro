> **設計移行の重要更新（2026-11-12）**：PR #68により、正式開発ブランチ `integration/production-prep-2026-10-05` の設計正本がアーカイブ版へ置き換わりました（統合HEAD `47c560078ba436d07219d35a6b22c9c9241cfb82`）。
>
> **このM11ブランチにはPR #69で新設計資料を取り込み済みです。ただし本書の旧設計資料指定をそのまま適用して実装を始めないでください。** まず最新の設計正本を確認し、`docs/DESIGN_AUTHORITY.md` と `docs/product-planning/`・`docs/performance-research/`・`docs/product-architecture/`・`docs/detailed-design/` を正本として読み直してください。下記の `docs/FEATURE_SPEC.md`・旧 `docs/ui/`・旧 `docs/architecture/ARCHITECTURE_V2.md` 等の参照は設計移行前の履歴です。矛盾がある場合は新正本を目標とし、M01〜M10の合格済み機能を壊さない移行方法を検証してから本書の実装範囲を更新してください。
>
> 本文のM11機能は候補であり、**アーカイブ版C03の正式要件との差分を照合するまでは旧M11指示書のまま製品実装を開始・完了宣言しない**。M10受入コード・作品保存の互換性・既存QAを保護します。

# Illustro M11 — Layer完成系 実装引継ぎ・開始位置固定（2026-11-12）

## 0. 必須ミッション
現在の正式開発先 `https://github.com/totoro0419/illustro` で、M11「レイヤー完成系」を**調査→設計→実装→検証→修正→GitHub保存→固定QA公開**まで一括して進める。単なるUIの見せかけで終わらせない。

優先順位は **直感操作 > 軽さ・体感応答性 > 多機能**。M01〜M10のユーザー合格済み成果は保護する。M11の製品実装は本指示を受け取った実装担当が行い、Managerによるこの準備コミットだけを「実装完了」としない。

## 1. 正しい開始位置とGit運用
- Repository: `totoro0419/illustro`（旧 `illustro_old`。全面再制作版のアーカイブ側とは混同しない）。
- 作業branch: `milestone/M11-layer-completion-2026-11-12`
- **開始commit（製品基準）**: `d890e7cc9579305138bb4ea0513e7e4d6602db0f`。このcommitにはM10受入済みの製品コードと進捗表の合格記録が含まれる。
- M10最終製品HEAD: `4722710c623d8ed31722bc9d50cd645110f5716e`、PR #65 merged、統合PR #66 merged（merge commit `7e6ea96bf74f45983c6028b667ff3e296efd9c4b`）。
- 統合先: `integration/production-prep-2026-10-05`。PRはM11専用Draftを用い、終了まではDraftを維持。
- **`main`へのcommit/mergeは禁止**。M11がユーザー合格するまではintegrationへ無断mergeしない。先行PR #65/#66の成果をrebaseやcherry-pick失敗で落とさない。
- 実装開始前に最新HEAD、各ブランチ祖先関係、PR、CIを再取得し、この開始commitが現在の正しい祖先か確認。既に別担当の更新があれば無理に上書きしない。
- 別系統の不合格M10再構築を混入させない。`docs/revival/M10_CLOSURE_2026-11-12.md`を読む。

## 2. 仕様正本
**最初に必ず** `docs/IMPLEMENTATION_BASELINE.md`、`docs/CANONICAL_INDEX.md`、`docs/IMPLEMENTATION_CHECKLIST.md`を読む。対応する正本は少なくとも：
- `docs/FEATURE_SPEC.md`「10. Layers」FR-LAYER-001〜006、QR-LAYER-001
- `docs/architecture/ARCHITECTURE_V2.md`
- `docs/ui/RIGHT_UI_SPEC.md`
- `docs/ui/RIGHT_LAYER_PAGE_SPEC.md`
- `docs/ui/UI_INPUT_CONTROL_STANDARD.md`、必要なLeft / Compact / Workspace文書
- 保存、History、Rasterの該当CANONICALと既存テスト

実装済みコードや仮UIは最終仕様とみなさない。M11と後工程の境界で矛盾があれば正本を確認し、合理的な適用範囲を記録する。

## 3. 主要アプリ公式資料調査
機能ごとにibisPaint、CLIP STUDIO PAINT、Procreate、Krita、Photoshop、Affinityの**公式マニュアル**を調査し、次を比較・記録：作成、選択、グループ化、Mask、Clipping、Alpha Lock、複数選択、並べ替え、表示切替、複製、結合、Undo、使いやすいUI、端末差。優れた公開方式は積極採用。非公開の内部実装を推測して断定しない。根拠URLと採用/不採用理由を `docs/research/M11_LAYER_COMPLETION_RESEARCH.md` に残す。

## 4. 今回のM11必須機能
1. **共通Layerモデル**：Layers BoxとLayer Pageは同一正本・同一操作を参照。追加、選択、リネーム、並べ替え、表示/非表示、ロック、タグ、検索/種類別絞り込み、ソロ表示。
2. **Group / Folder**：作成、展開/折畳み、入れ子、グループ内外の移動、まとめた表示・ロック・選択、合成順の一貫性。誤ったドロップは元へ戻す。
3. **Mask**：非破壊の編集可能マスク、作成・有効/無効・解除・削除、元画素の保持と見た目の即時反映。後続M26の高度な合成/ベクトルマスク機能を先取りした完成宣言はしない。
4. **Clipping / Alpha Lock**：不透明部分への描画制限、下地に従う切り抜き、グループ・透明背景との一貫性、直感的なON/OFF、保存・読み込み・Undo。
5. **複数選択**：タップ/キー/範囲選択、複数レイヤーに対する適用可能な操作、無効操作の説明、誤操作防止。
6. **整理・コピー・結合**：複製、削除、移動、Merge Down / Merge Visible、Flatten Copy、必要な確認表示。透明度・合成結果・順序・マスクの意味を守り、一操作でUndoできること。
7. **Layer Page完成**：正本の行構造、検索欄、属性、操作列、階層のドラッグ、選択同期。PC/Tabletでタッチ・ペン・マウス操作しやすいこと。右下の入口、編集画面での表示領域・拡大縮小・戻るを妨げない。M12 Workspaceの浮動/分離完成までは勝手に先取りしない。
8. **扱えないレイヤー種類**：Vector/Text/Adjustment/Filter等の後続マイルストーンで本実装予定の機能を見せかけで実装済み扱いしない。M11で必要な共通データの境界を整え、未対応操作には明確な理由を表示する。

## 5. 最重要の互換・回帰保護
- M10ブラシ：固定Foundation 7本、追加3本、検索/詳細設定、筆圧・入り抜き・仮線/本線、速度/手ブレ補正、描画品質。source-lockを勝手に外さない。
- キャンバス：Pan/Zoom/Rotate/Flip、DPR/高DPI、入力追従。操作を履歴/保存/マスク合成待ちで止めない。
- M10新規キャンバス：透明/論理白背景、4000×4000、GPU事前準備・初筆・スポイト・PNG出力の正確性と軽さ。白を全面の画素で初期生成する旧方式へ戻さない。
- Undo/Redo：一操作一履歴、確定前Undo、連続操作、レイヤー構造/画素/マスク状態の復元。
- Save/Recovery：`.illustro`、Autosave、Last Good、Previous Good、Offline、過去作品の読み込み、保存中断からの復旧。保存形式変更は明示的な後方互換検証を要する。
- M09 Color、マイ作品高速Open/thumbnail、旧M01〜M10固定QAも保持。
- 描画直後の指入力停止はM10の合否対象外で未解決。M11が新たに悪化させてよい意味ではない。端末起因と断定しない。

## 6. 性能と処理設計
- タッチ/ペン入力、線の仮表示、Canvas操作を最優先。Layer追加・表示ON/OFF・選択・ロックは内部合成を待たず反応し、原則として次の画面更新で状態を表示する。
- GPU/CPU合成やマスク変更は変更箇所だけを更新し、毎操作の全画面読み出し、全Layer再合成、全Canvas複製、無限待機を禁止。
- 高解像度4000×4000、レイヤー数の増加、グループ入れ子、マスクや半透明を含む大きい作品で応答遅延・メモリ・表示ちらつきを定量測定する。比較基準の端末と測定方法を明記。
- 表示用の一時結果と作品の正式データを分離し、待ち状態の画像・後から届いた古い処理結果によるちらつき/消失を防ぐ。
- 多数のレイヤーを一覧表示するときは必要な行だけ描画する等、一覧自体を重くしない。

## 7. 実装方法
機能ごとに現存の共通Document / Layer / History / Save経路を調査し、重複したLayer正本・並行の保存状態や履歴経路を作らない。UIのみのmockやチェックボックスだけを完成扱いにしない。Layer関係の不変条件（親子/循環禁止/可視性/順序/Mask ownership/Clipping target）を契約とテストにする。必要であれば設計改善するが、Foundation・Raster・Saveを無関係に作り直さない。

## 8. 自動検査・回帰
- 型検査、全ユニットテスト、ビルド、source lock/CANONICAL checks。
- 各Layer操作の前後で正式画像、Undo/Redo、Save/Reload/Recovery、Portable/PNG出力、旧作品の互換性を照合。多階層Group、マスク有無、半透明、非表示、クリッピング、Alpha Lock、結合などを組み合わせる。
- Browserで**実pointer/touch/drag**の検索・複数選択・順序変更・操作反映を検証。見た目だけでなく正式画像を比較。
- WebGL2/WebGPUを両方検証し、512pxだけでなく2048/3000/4000px、PC/Tablet/Smartphone相当の画面幅/DPRを含む。ソフトウェアGPU結果と実機結果を明確に区別。
- 旧M01〜M10の固定QAが残っていること、M10 `/qa/m10-revival-2026-11-10/` の保持とM11の公開で消えないことを確認する。
- Performanceは入力から画面更新までのp95、重い操作の最大停滞時間、Canvas移動の反応、メモリ変化、操作中の黒化/ちらつきを計測して記録。試行条件・未計測項目を明記する。

## 9. 固定QA・ユーザー確認
M11固定QA: `https://totoro0419.github.io/illustro/qa/m11/` を作成・公開し、実URL到達確認を行う。旧QAを消さない。操作確認項目は一般ユーザーが理解できる日本語にする。たとえば「グループに入れたレイヤーをまとめて表示/非表示できる」「マスクをかけても元の絵は消えない」「たくさんのレイヤーでも画面操作が重くならない」「保存して開き直してもレイヤー構造が同じ」等。

固定QA公開に成功してもユーザーの物理端末の確認が済まない間は最大 `👤 USER REVIEW REQUIRED`。スマホ・タブレット・PCの確認できない条件は未確認と明記する。

## 10. GitHub成果物・完了条件
- M11専用Draft PRに正しいbase・開始commit・詳細調査・実装差分・検証結果・残課題・公式資料URLを記録。
- `docs/IMPLEMENTATION_CHECKLIST.md` を進捗に応じ更新する。QA公開のrun/HEAD/URLと合格条件を対応付ける。
- M10の合格済みファイルを巻き戻していないことを比較で示す。
- 失敗した自動テストは修正して再実行。原因未特定・描画データ破壊・保存の後方互換破壊・体感操作悪化があればSTOPと明記。
- **実装担当は勝手にPRをmergeしない。mainを変更しない。M11はユーザー合格まで固定完了と宣言しない。M12へ進まない。**
