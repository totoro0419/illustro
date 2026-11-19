# C03〜C10 129件｜修正進捗スナップショット

**作成日:** 2026-11-18 JST
**照合対象のコードHEAD:** [`c69a5055`](https://github.com/totoro0419/illustro/commit/c69a50557a7ba3cd16ff28c466793362be101c2a)
**基準:** [PR #73（調査原本129件）](https://github.com/totoro0419/illustro/pull/73) / [Issue #92（実装履歴）](https://github.com/totoro0419/illustro/issues/92) / [PR #75（統合）](https://github.com/totoro0419/illustro/pull/75)

> **重要:** 以下はPR・コミット・Issueの記録を突き合わせた**記録ベースの進捗分類**。全129件の現在のソースを新たに行単位で精読した独立品質監査ではない。したがって「修正記録あり」を「コード完成」や「解決確認済み」と読み替えない。実機独立確認は別扱い。元のA/B/C・P1/P2はPR #73の履歴分類で変更しない。

### 2026-11-19｜最終開発：C06-002 / C09-007 / C10-006 / C10-010

- **C09-007・C10-006・C10-010：コード上の不足を修正済み。** Android実機合格とは別。C06-002は部分対応を維持。37件や129件全体を合格扱いしない。
- **C06-002**：保存済み画素を再利用し、後続の通常筆跡を持つ256pxブロックは除外してGPUの確定画像を取得。作品・履歴・レイヤー・描画器が切り替われば中止。選択Workerへ渡すのは筆跡の影響区画だけとし、変更しない区画は処理後に安全に結合。同じArrayBufferを共有する区画は必要な部分を複製し、転送による他区画の消失を防止。4000×4000で1024→1区画（GPU要求）、256→1区画（Workerへの入力）のプロトコル試験、RGBA一致、消しゴム・半透明マスク・保存/Undo/Redoの既存試験成功。**初回の通常筆跡の全GPU読み取りと、実GPUでの時間測定は残る。**
- **C10-006**：保存経路に加えて整列・均等配置にも自動更新を接続。2つの元を同時に動かす場合も、移動後の両方の形から1度だけ再計算して同一履歴へ保存。空の演算結果は通常線・筆圧線とも無描画。元を削除/画像化した場合は最後の編集可能な形を保持し、循環は拒否。既存の変形保持レイヤーへの制限は維持。
- **C10-010**：読み込んだフォントの`vert`/`vrt2`字形、GPOSの位置、VORGの原点、vmtxの位置情報を利用。情報がない/壊れているフォント、端末専用フォント、合成太字/斜体では従来処理へ戻る。表示と輪郭化で同じ位置を使用。2桁数字の縦中横を明示選択でき、異なる部分書式をまたいで結合しない。文字枠・間隔・部分書式・保存復元を維持。
- **縦書きの実描画比較**：Noto Sans CJK Regular / Noto Serif CJK Regular、文章「縦書き、。\n小さいゃっー「」（）\n英A12数字」、通常/部分色・サイズ変更の4条件。260×460 RGBA、各478,400 bytesで表示用と輪郭化後の差 **0 bytes**。ローカルCanvasで描画し画像も確認。自作の異なる縦書きフォント2種のGSUB/vmtx試験も成功。Android/ブラウザの実機比較ではない。
- **確認**：Core 66 / Brush 266 / Editor 687 tests、Core型検査・Editor型検査/本番ビルド成功。実フォント描画比較は追加の環境依存試験1本で実行し、上記の通常テスト数に含めない。Chromiumの画面操作試験は、起動時のソケット作成が環境で許可されず**実行不能**。GPU時間・ブラウザ操作・Androidは合格扱いしない。
- **実装保存**：`4072bd5c`（C06）、`c0b45cbd`（C09）、`0b8ab28b`（C10連動）、本節を含む後続コミット（確定SHAはIssue #92にも記録）。main・PR #73未変更、PR #75 Draft維持。
- **次**：C06-002の初回読み取りを、保存形式と履歴の安全性を維持して減らす。独立検査待ち7件は再現結果を受けて判断。任意提案5件の大規模変更は行っていない。

### 2026-11-19｜C10-006 元レイヤーと演算結果の自動連動

- 元レイヤーIDと編集可能な形を併記。図形/ベクターの保存時に影響する演算結果を依存順で再計算し、元と結果の画素・編集情報を一つの履歴へ保存。和/差/交差/XOR、連鎖、空の結果、元削除時の最後の形への退避、循環拒否に対応。旧データは埋込み形のまま読み込める。
- `artwork/linkedBooleans.ts`・`vectorPanel.ts`・`pathOperations.ts`・`render.ts`・`main.ts`、Core `editableArtwork.ts`・`transaction.ts`。関連28試験成功、Core 65試験/型検査・Editor型検査/本番ビルド成功。
- C10-006：部分対応。図形/ベクターの保存経路の自動更新・一括Undo/Redo・保存復元は確認。専用パネル以外の整列/変形による元形状変更への接続、Android実機の操作は未確認。未確認経路を完全解決としない。

### 2026-11-19｜C09-007 図形の画像/編集可能出力

- 図形パネルに「形を後から直せる図形」「ブラシで描き直せる画像」を追加。同じ描画・保存処理を通し、画像出力だけ編集用データを付けず通常レイヤーに保存。新規は新しいレイヤー、既存図形の画像化は元レイヤーのマスク・設定を維持する。グラデーションの既存出力は維持。
- `artwork/shapeGradient.ts`・`tools.ts`・`saveSnapshot.ts`・`main.ts`。長方形/角丸/楕円/多角形/折線/ベジェ ×2出力の12試験で画素・編集情報・マスク・Undo/Redo・保存復元・画像の通常画素編集を確認。関連54試験とEditor型検査/本番ビルド成功。
- C09-007：コード上の不足を修正済み。ブラウザでの見た目比較・Android操作は独立確認待ち。

### 2026-11-19 JST｜C06-002 保存済み画素の再利用（部分対応）

- 保存スナップショットの128px区画を再利用し、その後の通常筆跡が触れた区画と、再利用できない区画だけGPUから取得。全区画を組み合わせて従来の完全なsnapshotを保存する。変形・編集可能図形・参照画像では従来経路。作品/選択レイヤー/履歴が変わったら反映中止。
- 自動試験：4000×4000、1024区画の模擬GPUで転送要求 **1024→1区画、67,108,864→65,536 bytes**。全RGBA同一、消しゴム・透明RGB・不正バッファ・中断検査成功。これはプロトコル試験であり、実GPU速度の測定ではない。
- 検証：Core 65、Brush 266、Editor 658 tests成功、Core型検査・Editor型検査/本番ビルド成功。
- 残件：保存済みの画素がない初回の通常筆跡は全体読取りが必要。Workerへの完全snapshot転送は維持。実GPU時間・Android実機は未測定。C06-002の完全解決認定はしない。

### 2026-11-19 定期自動開発②｜C09-004・C09-005・C09-015｜大規模マスク・ハンドル・Worker仮表示（3 ID）

- **C09-004（部分改善）**：固定128タイル上限を撤廃。129以上の可視タイルや画面外タイル多数でも、実際に読む元画素が最大1,048,576画素・索引登録10万件以内なら縮小面積平均を維持。高密度マスクは中心点方式へ安全に戻す。可視129タイル・画面外128タイル・高密度上限のテスト追加。
- **C09-005 / C09-015（部分改善）**：ベジェ制御ハンドルの仮表示と確定を同じ検証関数に統一し、欠損・非有限座標を拒否。10万画素を超えるパス仮表示のマスク処理をWorker内へ移し、UI側の二重全画素走査を省略。小さな仮表示の面積平均は維持。Workerの文書座標・密度・無効マスクのテスト追加。
- **コード・テスト6コミット**：[30253e7d](https://github.com/totoro0419/illustro/commit/30253e7d1fe071af4fee912ec6f0bcbb457870c0) → [a49abba4](https://github.com/totoro0419/illustro/commit/a49abba4dcaa6fa3478b75c74f39f4ef91b9dc7b) → [094c669e](https://github.com/totoro0419/illustro/commit/094c669e59b12d92b858140a6d2d53df72901a0b) → [168c39cc](https://github.com/totoro0419/illustro/commit/168c39cc0e3c3ab862c316e92fd1e8a6237416c9) → [733f6ce4](https://github.com/totoro0419/illustro/commit/733f6ce441f620aba00b096a7c7cebcec7852add) → [c69a5055](https://github.com/totoro0419/illustro/commit/c69a50557a7ba3cd16ff28c466793362be101c2a)。対象：`apps/editor/src/artwork/shapeGradient.ts`、`render.ts`、`shapeGradient.quality.test.ts`。追加回帰テスト7件。
- **検証**：最終コード `c69a5055` の[統合CI #44451964830](https://github.com/totoro0419/illustro/actions/runs/44451964830)・[Core CI #44451972931](https://github.com/totoro0419/illustro/actions/runs/44451972931) は両方 completed/success（Core/Brush/Editorテスト・型検査・本番ビルド）。途中 `733f6ce4` でNode環境のCanvas未定義によりテスト2件が失敗したが、`c69a5055` で修正・再検証済み。Android実機・4K実測・旧作品保存復元・Undo/Redo独立実機確認は未実施。保存形式・履歴構造は変更なし。
- **残件・次回**：3 IDとも部分改善、完全解決認定なし。部分対応37件・根拠未確認0件・個別完了未認定92件を維持。次回は **C09-004** の100万画素超の密集マスクと複雑パス縮小精度（`apps/editor/src/artwork/shapeGradient.ts`）、**C09-005/015** のWorker障害時・複雑レイヤーでの仮表示一致（`apps/editor/src/artwork/render.ts`・`run.ts`）。競合時 **C07-003**（`apps/editor/src/transform/`）。main・PR #73変更なし、PR #75 Draft維持。

### 2026-11-19 定期自動開発①｜C06-002｜選択消しゴムの描画範囲限定GPU事前確認（1 ID、5コミット）

- **C06-002（部分改善）**：選択付き消しゴムのGPU事前確認を、選択マスク全体ではなく実際の筆跡の保守的な外接範囲に限定。筆跡から離れた選択画素が別GPUタイルに存在しても、そこを先読みしない。1タイル内でも筆跡外の選択画素は無変更判定に含めず、無関係な画素による全タイル読戻しを防ぐ。変更がある場合は筆跡外を含む**従来の全既存タイル**を取得して保存スナップショットとUndo/Redoの互換性を維持。異常な筆跡座標は安全側の従来の全選択範囲確認へ戻す。
- **コード・テスト（5コミット）**：[971c186d](https://github.com/totoro0419/illustro/commit/971c186d9d5c033c9317f5d056ea3d01d2b800bf) → [078ccc93](https://github.com/totoro0419/illustro/commit/078ccc937e219efeb4193161ff9474aaa1ca782f) → [b0bddf97](https://github.com/totoro0419/illustro/commit/b0bddf9730db1a14f946b4c85d613a8d2a7d7658) → [ce479665](https://github.com/totoro0419/illustro/commit/ce4796651bea33c9a41189973f90d2b034073723) → [a6ce151b](https://github.com/totoro0419/illustro/commit/a6ce151b07ac3161dc8c6d85ef87f0f31bf91dd5)。変更は `apps/editor/src/selection/maskStrokeBounds.ts`・`tileCapture.ts`・`brushSurface.ts` と対応するテスト2ファイル。追加回帰テスト6件。
- **検証**：コード最終 `a6ce151b` の[統合CI #44448994078](https://github.com/totoro0419/illustro/actions/runs/44448994078)・[Core CI #44448997504](https://github.com/totoro0419/illustro/actions/runs/44448997504)はともに **completed/success**。テスト・型検査・本番ビルド成功。Android実機、4K時間・メモリ、旧作品の保存復元・Undo/Redo独立実機検証は未実施。
- **残件・次回**：C06-002は部分改善のまま、完全解決認定なし。記録上の部分対応37件・実装根拠未確認0件・個別完了未認定92件を維持。次回は **C06-001/002** の選択付き特殊合成・消しゴム途中表示と変更がある場合の全GPUタイル読戻し（`apps/editor/src/brushSurface.ts`、`packages/brush-rt/src/stroke-overlay.mjs`、`apps/editor/src/selection/tileCapture.ts`）。次点 **C06-015** 特殊グループのコピー、競合時 **C07-003**。main・PR #73変更なし、PR #75 Draft維持。

### 2026-11-19 定期自動開発②｜C09-004・C09-005・C09-015｜大きな画素マスク・曲線ハンドル安全性（3 ID、2段階）

- **C09-004（部分改善）**：縮小表示で変更済み64px画素マスクが16タイルを超えると中心点サンプリングへ戻り、細い境界が消える問題を改善。変更タイルを出力画素ごとに索引化し、最大128タイルまで元の整数画素の面積平均を計算。索引登録10万件を超える密集マスクは従来の軽量表示へ戻す。17タイル・小数位置・画面外タイル・反転の回帰テストを追加。128タイル超の密集マスクの厳密縮小は残る。
- **C09-005 / C09-015（部分改善）**：編集点のドラッグで古いベジェ制御ハンドルが片側だけ存在する、非有限値を含む、座標差分や移動後ハンドルがオーバーフローする場合は変更を拒否。NaNの曲線を仮表示・保存しない。既存の正常なハンドル移動は維持。欠損ハンドル・非有限値・演算オーバーフローの回帰テストを追加。
- **コード・テスト（5コミット）**：[d3ca9dc9](https://github.com/totoro0419/illustro/commit/d3ca9dc95f48bfe1d65092329889366befd4f5bc) → [dfecc287](https://github.com/totoro0419/illustro/commit/dfecc28723fd3e95d25f1703fd4c040e90cbbb5a) → [70414336](https://github.com/totoro0419/illustro/commit/7041433682a7247d0edc285a93e09c5815e66c6b) → [872b0d57](https://github.com/totoro0419/illustro/commit/872b0d571ce844bd0874e734163339743c8d5458) → [a50d28ae](https://github.com/totoro0419/illustro/commit/a50d28aeb0615db267a2d2f61e316964532da796)。変更は `apps/editor/src/artwork/shapeGradient.ts`、`shapeGradient.quality.test.ts`。保存形式・Undo/Redo構造は変更なし。
- **検証**：最終コード `a50d28ae` の[統合CI #44445404019](https://github.com/totoro0419/illustro/actions/runs/44445404019)・[Core CI #44445413507](https://github.com/totoro0419/illustro/actions/runs/44445413507)とも **completed/success**。Core/Brush/Editorテスト、型検査、本番ビルド成功。途中 `872b0d57` でTypeScriptのexactOptionalPropertyTypes検査に失敗したが `a50d28ae` で修正・再検証済み。Android実機、4K性能実測、旧作品の保存復元・Undo/Redo独立実機検証は未実施。
- **残件・次回**：3 IDとも部分改善、完全解決認定なし。記録上の部分対応37件・実装根拠未確認0件・個別完了未認定92件を維持。次回は **C09-004** の128タイル超の密集画素マスク・大規模複雑パスの縮小精度（`apps/editor/src/artwork/shapeGradient.ts`）、**C09-005/015** の大きなパス・複雑レイヤー合成の途中表示（`apps/editor/src/artwork/render.ts`）。競合時は **C07-003**（`apps/editor/src/transform/`）。main・PR #73変更なし、PR #75 Draft維持。

### 2026-11-19 定期自動開発①｜C06-002・C06-007｜選択消しゴムGPU読戻し・プレビュー整合性（2 ID、2段階）

- **C06-002（部分改善）**：選択付き消しゴムの確定時に選択マスクをGPUタイル取得へ渡し、まず選択と重なる区画だけを読み取る。選択内のRGBAが全て0なら、同じ区画の選択外に絵が存在しても消去は無変更と判断し、残りの区画のGPU読戻し・選択Worker・Undo記録を省略。選択内に非ゼロ画素があれば、先に読み取った区画を再利用して残りを取得し、従来どおり全既存タイルのスナップショットを復元。透明アルファ下のRGBも非ゼロとして扱う。選択内無画素、非ゼロ画素、透明RGBの回帰テスト追加。
- **C06-007（部分改善）**：選択ブラシの正確な仮表示で、復元済み選択マスクのアルファ配列が不正な場合や操作モードが未知の場合、誤った画素差分を表示せず軽量プレビューへ戻す。正常なマスク・設定の回帰テストも追加。
- **コード・テスト（2コミット）**：[124b6443](https://github.com/totoro0419/illustro/commit/124b644367694c9b91409fb8d03efc38e85c9d2e) → [4f0f009b](https://github.com/totoro0419/illustro/commit/4f0f009b9e1a5fb62293501778deb0b625962985)。変更は `apps/editor/src/selection/tileCapture.ts`、`tileCapture.test.ts`、`brushSurface.ts`、`selection/brushPreview.ts`、`brushPreview.test.ts`。保存形式・履歴構造は変更なし。
- **検証**：最終コード `4f0f009b` の[統合CI #44440877820](https://github.com/totoro0419/illustro/actions/runs/44440877820)と[Core CI #44440884424](https://github.com/totoro0419/illustro/actions/runs/44440884424)はともに **completed/success**。Core/Brush/Editorテスト、型検査、本番ビルド成功。Android実機、4K処理時間・メモリ、旧作品の保存復元・Undo/Redo独立実機検証は未実施。
- **残件・次回**：両IDとも部分改善で完全解決認定なし。記録上の部分対応37件・実装根拠未確認0件・個別完了未認定92件を維持。次回は **C06-001/002** の選択付き消しゴム・特殊合成の途中表示と、選択内に既存画素がある場合の全タイル読戻し削減（`apps/editor/src/brushSurface.ts`、`packages/brush-rt/src/stroke-overlay.mjs`、`apps/editor/src/selection/tileCapture.ts`）。次点は **C06-015** の特殊レイヤー・グループのコピー経路（`apps/editor/src/brushSurface.ts`）、競合時は **C07-003**（`apps/editor/src/transform/`）。main・PR #73変更なし、PR #75 Draft維持。

### 2026-11-19 定期自動開発②｜C09-004・C09-005・C09-015｜細線・画素マスク・仮表示遅延（3 ID、2段階）

- **C09-004（部分改善）**：縮小表示で細長い自由形状の選択範囲が画素中心から外れて消える場合、16点以下の細長いパスを面積平均で表示。小さい多角形は128点まで正確な面積計算に拡張。4K相当の長い細線・80点小図形の回帰テスト追加。大きく複雑なパスは高速な従来経路を維持。
- **C09-004（部分改善）**：縮小倍率が縦横とも4倍以上で、変更された画素マスクタイルが16個以下・倍率が4倍以下の場合、元の整数画素のマスクを面積平均して表示。64pxタイルを越える大きな縮小表示で小さい透明領域が消える問題を改善。変更のないタイルは一括して扱い、4K全画素走査を回避。反転・半透明・小数位置と倍率の回帰テスト追加。密集した大きな画素マスクの厳密縮小は残る。
- **C09-005 / C09-015（部分改善）**：編集点ドラッグ中の描画Workerが120ms以上古い結果を処理している場合のみ中断し、最新の位置を優先。高速な連続入力では毎回中断しない。最新の描画に失敗したときは、古い仮表示を残さず消す。中断判定の境界テスト追加。Android実機の応答性・複雑レイヤー合成一致は未確認。
- **コード・回帰テスト（2コミット）**：[d229508d](https://github.com/totoro0419/illustro/commit/d229508d4edfb78da782a3486d40a2df80245256) → [f16cae82](https://github.com/totoro0419/illustro/commit/f16cae823ba546354196b47d80c4ddebe0655ca2)。変更は `apps/editor/src/artwork/shapeGradient.ts`、`shapeGradient.quality.test.ts`。保存形式・履歴構造は変更なし。
- **検証**：最終コード `f16cae82` の[統合CI #44437294965](https://github.com/totoro0419/illustro/actions/runs/44437294965)と[Core CI #44437301975](https://github.com/totoro0419/illustro/actions/runs/44437301975)は両方 **completed/success**。統合CIのCoreテスト・型検査、Brush回帰、Editorテスト、Editor TypeScript・本番ビルドの各ステップ成功。Android実機、4K実測、旧作品保存復元・Undo/Redoの独立実機検証は未実施。
- **残件・次回**：3 IDとも部分改善で完全解決認定なし。記録上の部分対応37件・実装根拠未確認0件・個別完了未認定92件を維持。次回は **C09-004** の多数タイル画素マスク・大きな複雑パスの縮小表示（`apps/editor/src/artwork/shapeGradient.ts`）、**C09-005/015** の複雑レイヤー合成・実機仮表示（`apps/editor/src/artwork/render.ts`）。競合時は **C07-003** 特殊レイヤー一括変形（`apps/editor/src/transform/`）。main・PR #73変更なし、PR #75 Draft維持。

### 2026-11-19 定期自動開発①｜C06-002・C06-007・C06-015｜選択消しゴム・コピー・仮表示（3 ID）

- **C06-002（部分改善）**：選択付き消しゴムで、描画Workerの最新タイル一覧と選択マスクの非ゼロ画素を照合。既存GPUタイルが選択範囲に一つも重ならない場合、全タイルGPU読戻し・選択Worker・Undo記録を作らず終了。重なりがある場合は旧画素を守るため従来どおり全占有タイルを取得。マスクのサイズ・配列が不整合な場合はGPUアクセス前に拒否。非選択タイルが既存の保存スナップショットから消えることはない。
- **C06-007（部分改善）**：選択ブラシの正確な途中表示（最大384点）の要求識別を、従来の直近64点から直近384点に拡張。筆跡が100〜350点のときに古い入力点が同時補正されても、古い仮表示を再利用しない。長大筆跡は384点で上限を維持。
- **C06-015（部分改善）**：小さな矩形コピーのGPUタイル占有判定を128×128全体から、実際にコピーする矩形との交差画素に限定。範囲外の描画による不要な画素走査・一時タイル保持を減らす。透明アルファ下のRGBと矩形内の0画素は従来どおり正確に扱う。
- **コード・回帰テスト**：[6927b66a](https://github.com/totoro0419/illustro/commit/6927b66a727b1e2dc9b6100fe7642bbd3c79cf2a)。変更は `apps/editor/src/selection/tileCapture.ts`、`tileCapture.test.ts`、`brushPreview.ts`、`brushPreview.test.ts`。保存形式・Undo/Redo構造は変更なし。
- **検証**：最終コード `6927b66a` の[統合CI #44433943706](https://github.com/totoro0419/illustro/actions/runs/44433943706)と[Core CI #44433950887](https://github.com/totoro0419/illustro/actions/runs/44433950887)は両方 **completed/success**。Core・Brush・Editorテスト、型検査、本番ビルドが成功。Android実機・4K処理時間/メモリ・旧作品保存復元・Undo/Redoの独立実機検証は未実施。
- **残件・次回**：3 IDとも部分改善で完全解決認定なし。記録上、部分対応37件・実装根拠未確認0件・個別完了未認定92件を維持。次回は **C06-001/002** の選択付き消しゴム・特殊合成の仮表示と、選択範囲が既存タイルに重なる場合の全タイル読戻し削減（`apps/editor/src/brushSurface.ts`、`packages/brush-rt/src/stroke-overlay.mjs`、`apps/editor/src/selection/tileCapture.ts`）。競合時は **C07-003** 特殊レイヤー一括変形（`apps/editor/src/transform/`）。main・PR #73変更なし、PR #75 Draft維持。

### 2026-11-19 定期自動開発②｜C09-004・C09-005・C09-015｜グラデーションのマスク精度・4K応答性（3 ID）

- **C09-004（部分改善）**：図形だけでなくグラデーションの縮小プレビューでも、マスクを描画後に一度だけ適用。小さな矩形・自由形状の選択が出力画素の中心から外れても、面積平均で消えないよう改善。通常プレビューの左右比較も合成後に一度だけマスク適用。サブピクセル矩形・三角形・マスクなしの回帰テスト追加。
- **C09-004 / C09-005（部分改善）**：ピクセルマスクのプレビューで、128×128画素の中間マスクタイルを大量に生成する経路を避け、元の64×64タイルから直接サンプリング。整数画素中心・マスクの小数オフセット・拡大縮小・反転・密度の既存確定結果と一致する回帰テスト追加。大きなパス・画素マスクの厳密な縮小面積平均は残る。
- **C09-005 / C09-015（部分改善）**：ライブ編集点の大きなグラデーション仮表示（10万画素超）では、マスク適用を描画Worker側で済ませてUIスレッドの全画素再走査を回避。小さいライブプレビューと通常の縮小プレビューは面積平均を使用。ベクター図形の既存マスク処理を維持。Worker非対応・複雑レイヤーの実機一致は未確認。
- **コード・回帰テスト（6コミット）**：[a44520a8](https://github.com/totoro0419/illustro/commit/a44520a8c351394a10b9bcb907d551b24f90aca2) → [6d86fd8b](https://github.com/totoro0419/illustro/commit/6d86fd8b5a05a8d0fcaeda9de869b7fbf04b61ea) → [5efaec97](https://github.com/totoro0419/illustro/commit/5efaec97d46dc57bffe7b17d9b1f0be85cccd8ef) → [770707b6](https://github.com/totoro0419/illustro/commit/770707b6012e1225fadeab237265a3d59b5c4f8e) → [5cfec933](https://github.com/totoro0419/illustro/commit/5cfec933cb9777fcf263b5a3c05e36c48a634d8d) → [3d21f207](https://github.com/totoro0419/illustro/commit/3d21f20710d285325db5d63a54fec7a19110cde9)。変更は `apps/editor/src/artwork/shapeGradient.ts` と `shapeGradient.quality.test.ts`。保存形式・Undo/Redo構造は変更なし。
- **検証**：最終コードHEAD `3d21f207` の[統合CI #44429316094](https://github.com/totoro0419/illustro/actions/runs/44429316094)・[Core CI #44429323844](https://github.com/totoro0419/illustro/actions/runs/44429323844)はともに **completed/success**。統合CIのCore/Brush/Editorテスト、型検査、本番ビルドの各ステップ成功。Android実機・4K時間/メモリ・旧作品保存復元・Undo/Redoの独立実機検証は未実施。
- **残件・次回**：3 IDとも部分改善で完全解決認定なし。記録上の部分対応37件・実装根拠未確認0件・個別完了未認定92件を維持。次回は **C09-004** 大きな自由形状・画素マスクの縮小面積精度（`apps/editor/src/artwork/shapeGradient.ts`）、**C09-005/015** 高倍率・複雑レイヤー合成の仮表示一致（`apps/editor/src/artwork/render.ts`）。競合時は **C07-003** 特殊レイヤー一括変形（`apps/editor/src/transform/`）。main・PR #73は変更せず、PR #75はDraft維持。

### 2026-11-19 定期自動開発①｜C06-002・C06-007・C06-015・C08-003（4 ID、4段階の実装修正）

- **C06-007（部分改善）**：選択ブラシのWorker途中表示で、同時入力が座標・筆圧を差し替えても点数が同じなら要求が更新されない問題を修正。要求キーに直近64点の座標・筆圧を含め、古い非同期応答を破棄。Workerの原寸プレビュー再計算も直近64点へ拡張。45点前の差替えと要求キーの回帰テストを追加。Worker非対応時の長大筆跡・Android応答時間は未検証。
- **C08-003（部分改善）**：線画ドラッグ塗りの領域追跡で、45点前の同時入力補正を再計算できるよう直近64点を保持。RegionGraphが同じオブジェクトのまま壁・補完線・領域アンカー・領域数を交換した場合も仮表示を無効化。長い筆跡とグラフ更新の回帰テスト追加。実機の原寸画素一致は未検証。
- **C06-002（部分改善）**：選択マスクの画素数が作品に一致しない場合、GPU読戻し前に拒否。真に空のGPUレイヤーに対する消しゴムは選択WorkerとUndo項目の生成を省略。透明アルファ下の非ゼロRGBを持つタイルは空とみなさない。空レイヤーと透明RGBの回帰テスト追加。通常の選択付き描画の既存GPU全タイル読戻しは残る。
- **C06-015（部分改善）**：コピー範囲のNaN/Infinity等を画素読戻し前に拒否。保存・復元した選択マスクの大きさ・アルファ配列が不整合な場合、マスクを黙って外したコピーを禁止し、作品外の画素を誤ってコピーしない。異常座標・短いマスクの回帰テスト追加。特殊グループ・合成コピーの大容量経路は残る。
- **コード・回帰テスト（4コミット）**：[49696935](https://github.com/totoro0419/illustro/commit/49696935606baaaac5a3846797743714a9715359) → [591560ba](https://github.com/totoro0419/illustro/commit/591560bada7ba14b25cfbd53b7c1a01085f99569) → [548a6a86](https://github.com/totoro0419/illustro/commit/548a6a864b324a4fd6434637d313e6fe0a9f5fc4) → [f9cca830](https://github.com/totoro0419/illustro/commit/f9cca830f2c658bf361458ba532c5cad7309701e)。変更は選択ブラシ・コピー・描画終了・塗り仮表示と対象テスト。保存形式・Undo/Redoデータ構造は変更なし。
- **検証**：最終コードHEAD `f9cca830` の[統合CI #44427316001](https://github.com/totoro0419/illustro/actions/runs/44427316001)・[Core CI #44427324555](https://github.com/totoro0419/illustro/actions/runs/44427324555)はともに **completed/success**。Core/Brush/Editorテスト、型検査、本番ビルド成功。Android実機、4K時間・メモリ、旧作品の保存復元・Undo/Redoの独立実機検証は未実施。
- **残件・次回**：4 IDとも部分改善で完全解決認定なし。記録上の部分対応37件・実装根拠未確認0件・個別完了未認定92件を維持。次回は **C06-001/002** の選択付き消しゴム・特殊合成の仮表示と全タイル読戻し削減（`apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/tileCapture.ts`）。競合時は **C07-003** 特殊レイヤー一括変形（`apps/editor/src/transform/`）、**C08-015** の大規模領域更新。main・PR #73変更なし、PR #75 Draft維持。

### 2026-11-19 定期自動開発②｜C09-004・C09-005・C09-015｜小領域マスク・仮表示の連続改善（3 ID）

- **C09-004（部分改善）**：縮小プレビューの中心点から外れた小さな自由形状選択が消える問題を改善。64頂点以下かつ表示上2画素以内の小さなパスは、自己交差も含め偶奇規則で画素内面積を積分し、選択密度・反転を反映。大きなパスは従来の高速タイル方式を維持。小三角形・自己交差・反転・密度の回帰テストを追加。
- **C09-004 / C09-005（部分改善）**：図形の仮表示で元から透明な画素はマスクを参照しても可視化されないため、マスクタイル取得・領域計算を省略。透明画素のRGBとアルファを保ち、非透明画素は従来のマスク計算を維持するテストを追加。
- **C09-005 / C09-015（部分改善）**：編集中に別レイヤーが選択されても、編集対象の元レイヤーマスクを保持して途中表示するよう修正。編集中レイヤーが選択中なら最新のそのマスクを使用し、別レイヤーのマスクを誤用しない。選択切替・マスクなし・新規作成の回帰テストを追加。
- **コード・回帰テスト（6コミット）**：[91bc28f4](https://github.com/totoro0419/illustro/commit/91bc28f44425aa54a5553fb79b438ba874e907bb) → [cb019f29](https://github.com/totoro0419/illustro/commit/cb019f2904c5bfab1630f7d8b06e68645dfad87b) → [a3fc7a78](https://github.com/totoro0419/illustro/commit/a3fc7a78a3c131e9daf5e4fc0c042503cf145f49) → [1322a75f](https://github.com/totoro0419/illustro/commit/1322a75ff468d75ad6054229234816f7bb8575fd) → [ba7be9d5](https://github.com/totoro0419/illustro/commit/ba7be9d5e343dd9465b5fcc8dfde29e3665967f6) → [ec230c61](https://github.com/totoro0419/illustro/commit/ec230c610e2198efa52765e92d1dc1f0ca72fef4)。変更は `artwork/shapeGradient.ts` と `shapeGradient.quality.test.ts` のみ。保存形式・履歴構造は変更なし。
- **検証**：最終コードHEAD `ec230c61` の[統合CI #44421877791](https://github.com/totoro0419/illustro/actions/runs/44421877791) と[Core CI #44421886277](https://github.com/totoro0419/illustro/actions/runs/44421886277) が両方 **completed/success**。Core・Brush・Editorテスト、型検査、本番ビルド成功。Android実機、4Kの時間・メモリ、複雑なレイヤー、旧作品保存復元・Undo/Redoの独立実機検証は未実施。
- **残件・次回**：3 IDとも部分改善で完全解決認定なし。記録上の部分対応37件・根拠未確認0件・個別完了未認定92件を維持。次回は **C09-004** の大きなパス・画素マスク縮小精度と、**C09-005/015** の複雑レイヤー合成・実機プレビュー（`apps/editor/src/artwork/shapeGradient.ts`、`apps/editor/src/artwork/render.ts`）。競合時は **C07-003** 特殊レイヤー一括変形（`apps/editor/src/transform/`）へ。main・PR #73変更なし、PR #75 Draft維持。

### 2026-11-19 定期自動開発①｜C06-007・C06-015・C07-003・C07-014（4 ID、2段階の実装修正）

- **C06-007（部分改善）**：選択ブラシの長い筆跡で、最後の8点より前の同時入力補正が古い仮表示を残す経路を改善。直近32点の座標・筆圧を比較し、差替え時は元マスクから正確に再計算。20点前の差替え回帰テストを追加。長い筆跡・Worker非対応・4K実機の表示時間は未検証。
- **C07-003（部分改善）**：一括変形を繰り返した際、個々の倍率が正常でも合成後の軸倍率が0.001未満になる不安定な行列を拒否。X/Y双方の縮小境界をテスト。特殊レイヤーや非アフィンの一括変形は未対応。
- **C07-014（部分改善）**：回転・傾斜した面積平均の出力領域が透明な場合、4辺の判定オブジェクトを生成しない。画素の積分・保存結果は従来どおり。透明・単色の回帰テストを追加。4K実測・極端な曲率誤差は未検証。
- **C06-015（部分改善）**：小さな選択範囲の通常ラスターコピーでは、作品全体のGPU画素を取得せず、選択矩形と重なるGPUタイルだけを読み取り、矩形のRGBAを直接組み立てる。従来の通常Canvas・白背景・特殊レイヤー・グループは互換経路を維持。4Kでの単一区画コピー・範囲外入力・クリップボード操作の回帰テストを追加。特殊グループや合成コピーの大容量経路は残る。
- **コード**：[8a477f58](https://github.com/totoro0419/illustro/commit/8a477f5803ad5da1cd0e040e432977117b93e86e) → [2ccfe7bf](https://github.com/totoro0419/illustro/commit/2ccfe7bfa927347a838c1d1fbe7c69d06c4bdd34) → [878d0510](https://github.com/totoro0419/illustro/commit/878d051061bbea3d718417ff79e955fab85e0a41) → [b2cef2c8](https://github.com/totoro0419/illustro/commit/b2cef2c8ca22a95e68b696f7832ad27c854cd531)。変更は選択プレビュー・小領域コピー・変形演算・対象回帰テスト。保存形式・履歴構造は変更なし。
- **検証**：最終コードHEAD `b2cef2c8` の[統合CI #44417791528](https://github.com/totoro0419/illustro/actions/runs/44417791528)と[Core CI #44417800006](https://github.com/totoro0419/illustro/actions/runs/44417800006)が両方 **completed/success**（Core・Brush・Editor回帰テスト、型検査、本番ビルド）。先行コード `8a477f58` も両CI成功。中間pushのCIキャンセルは成功扱いしない。Android実機、4K実測、旧作品保存復元・Undo/Redoの独立実機検証は未実施。
- **残件・次回**：4 IDとも完全解決認定なし。記録上、部分対応37件・根拠未確認0件・個別完了未認定92件を維持。次回は **C06-001/002** の選択付き消しゴム・特殊合成の仮表示と既存GPUタイル全読戻し（`apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/tileCapture.ts`）。競合時は **C07-003** の特殊レイヤー一括変形（`apps/editor/src/transform/`）または **C08-015** の大規模領域更新。main・PR #73変更なし、PR #75 Draft維持。

### 2026-11-19 定期自動開発②｜C09-004・C09-005・C09-009・C09-011・C09-015（5 ID、連続修正）

- **C09-005 / C09-015（部分改善）**：図形・グラデーション編集点の途中表示で、`OffscreenCanvas` 非対応ブラウザーでは描画を省略していた条件を撤去。既存の通常Canvas描画へ切り替える。通常倍率は最大512px、拡大時は768/1024px、通常Canvasへの切替時は最大256pxに制限。古い結果の表示抑止を維持。
- **C09-009（部分改善）**：グラデーションの色帯とドラッグ用マーカーへ各停止点の不透明度を反映。透明色には市松模様を敷き、表示と保存値の違いを減らす。
- **C09-004（部分改善）**：密度0の選択マスクでは仮表示の全画素走査とマスク画像の読み取りを省略。元画像・透明度を変更しない。
- **C09-011（部分改善）**：背景描画Workerの起動・描画が失敗したとき、図形・グラデーションも通常Canvas描画へ切り替える。以前は文字以外でWorker失敗をそのまま返していた。中止済みの描画は再実行せず、文字のフォント互換性判定を維持。Worker不在の実機での挙動・処理時間は未検証。
- **コード・回帰テスト**：[`ff17a630`](https://github.com/totoro0419/illustro/commit/ff17a63016fc43a19b78bd539baea5c8af0b863d) → [`d017ee89`](https://github.com/totoro0419/illustro/commit/d017ee891564aa75cb4f421a10e78c858572e669) → [`865e72e3`](https://github.com/totoro0419/illustro/commit/865e72e3a5b84de4711fd0c15404cf67f2cba5b0) → [`08ed2e4d`](https://github.com/totoro0419/illustro/commit/08ed2e4dc328b9dbbd28b31debf4dd9a966007ea)（4コミット、回帰テスト7件追加）。純粋な計算・判定関数はローカルでTypeScript strictと15境界ケースを実行。
- **検証**：最終コードHEAD `08ed2e4d` の[統合CI #44413518333](https://github.com/totoro0419/illustro/actions/runs/44413518333)・[Core CI #44413527360](https://github.com/totoro0419/illustro/actions/runs/44413527360)は両方 **completed/success**。Core/Brush/Editorテスト、型検査、本番ビルドを通過。Android実機、実際のWorker非対応ブラウザー、複雑なレイヤーの高倍率表示、4K処理時間、旧作品の保存復元・Undo/Redoの独立実機検証は未実施。保存形式・履歴構造は変更なし。
- **残件・次回**：5件とも追加改善であり完全解決認定なし。記録上の部分対応37件・実装根拠未確認0件・修正記録あり個別完了未認定92件を維持。次回は **C09-005/015** の実機での仮表示と複雑レイヤーの合成、**C09-004** の縮小時の小さなパス・画素マスク精度（`apps/editor/src/artwork/shapeGradient.ts`、`apps/editor/src/artwork/render.ts`）。競合時は **C07-003** の特殊レイヤー変形へ。main・PR #73は変更せず、PR #75はDraft維持。

### 2026-11-19 定期自動開発①｜C06-002・C06-007・C06-015・C08-015（4 ID、連続修正）

- **C06-002（部分改善）**：選択付き描画のGPUタイル空白判定と選択マスクの行走査から不要なコールバック・サブ配列確保を削減。タイル一覧の非正規座標（例 `00,0`）や不正項目を読戻し前に拒否。既存の全タイル読戻しと非Worker経路は残る。
- **C06-007（部分改善）**：選択ブラシの確定結果と同じアルファ演算を使う仮表示の入力点上限を96点から384点に拡張。処理量・表示領域の既存上限を維持し、長大な線は軽量表示に戻す。
- **C06-015（部分改善）**：小さな選択範囲のコピーで、4K画像全体とマスク全体をWorkerへ送る代わりに、先に選択矩形の画素・マスクを切り出してから処理。従来と同じ画素を得るテスト追加。特殊グループ・大容量コピー元取得の課題は残る。
- **C08-015（部分改善）**：局所的な境界消去で隣接する線画が残っている場合は全画面の `hasInk` 再走査を省略。孤立点の消去は従来の全画面判定に戻して正確性を保持。近接・離れた線・最後の線の回帰テスト。
- **コード**：[`bc7cf1a1`](https://github.com/totoro0419/illustro/commit/bc7cf1a1ffd571de6a24a8707d47b66b8e363dc9) → [`660106f9`](https://github.com/totoro0419/illustro/commit/660106f950718978cbcd266b34d0639ee1108bbb) → [`7ea054c5`](https://github.com/totoro0419/illustro/commit/7ea054c532f131c2239c85d6e359470331f3f8d4)（3コミット）。初回CIで非正規キーの回帰テストが失敗したため実装の正規表現を修正し、最終コードで再検証。
- **検証**：最終コード `7ea054c5` の[統合CI #44407983852](https://github.com/totoro0419/illustro/actions/runs/44407983852)と[Core CI #44407994192](https://github.com/totoro0419/illustro/actions/runs/44407994192)は両方 completed/success。Core/Editorテスト、型検査、本番ビルド成功。Android実機・4K実測・保存復元・Undo/Redoの独立実機検証は未実施。保存形式・履歴構造は変更なし。
- **残件・次回**：4件とも部分改善のまま。記録上の部分対応37件、実装根拠未確認0件、修正記録あり個別完了未認定92件を維持。次回は **C06-001/002** の選択付き消しゴム・特殊合成の仮表示、既存タイルの全読戻し削減（`apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/tileCapture.ts`）。競合時は **C07-003** 特殊レイヤーの一括変形、**C08-015** の大規模領域更新。main・PR #73は変更せず、PR #75はDraft維持。

### 2026-11-19 定期自動開発②｜C09-005・C09-009・C09-015の精度・中断安全性改善（3 ID）

- **C09-005 / C09-015（部分改善）**：キャンバス上で動かした編集点の小数座標を数値欄で0.1pxへ丸めず、仮表示と確定に同じ値を使用。数値欄は細かな座標を受け入れる。非有限座標を拒否し、非同期保存が始まる前に編集点の操作を終了して、保存中に別の位置が表示される競合を防止。図形・グラデーション共通の仮表示マスクで、縮小判定の繰り返しも削減。
- **C09-009（追加改善、個別完了未認定）**：色停止点のドラッグ中に縮小プレビューを更新し、同じ位置では不要な再計算を省略。数値欄が空欄・不正値のときは直前の正常値を保持。ポインターの捕捉が突然失われた場合はドラッグ前の位置に戻す。
- **コード・テスト**：[d9487cea](https://github.com/totoro0419/illustro/commit/d9487cead5d88c8002b7e3bdd6eb93b99b2fc450) → [6517d63e](https://github.com/totoro0419/illustro/commit/6517d63eb6908e3491bbe4917ab0a466a864faca)（2コミット）。小数座標保持、無効な色停止点数値、非有限ドラッグ座標の回帰テストを追加。
- **検証**：最終コードHEAD `6517d63e` の[統合CI #44402844450](https://github.com/totoro0419/illustro/actions/runs/44402844450) は **completed/success**（Core・Brush・Editorテスト、型検査、本番ビルド）。先行コード `d9487cea` の[統合CI #44402653682](https://github.com/totoro0419/illustro/actions/runs/44402653682) と[Core CI #44402666026](https://github.com/totoro0419/illustro/actions/runs/44402666026) も成功。Android実機・4K実測・保存復元/Undo/Redoの独立実機確認は未実施。保存形式・履歴構造は変更なし。
- **残件・次回**：C09-005/015は部分対応を維持。C09-009も個別完了未認定のまま。記録上の部分対応37件・根拠未確認0件・修正記録あり個別完了未認定92件を維持。次回は **C09-005/015** の高倍率原寸プレビューとWorker非対応時の表示（`apps/editor/src/artwork/shapeGradient.ts`、`apps/editor/src/artwork/run.ts`）を優先。競合時は **C07-003** 特殊レイヤー一括変形（`apps/editor/src/transform/`）または **C09-004** 自由形状の縮小マスク精度。main・PR #73は変更せず、PR #75はDraft維持。

### 2026-11-19 定期自動開発①｜C06-002・C07-014・C08-003の連続改善（3 ID）

- **C06-002（部分改善）**：選択付き描画Workerが返すタイルの重複・範囲外・長さ不正を保存前に拒否し、全画素の戻り値サイズも検証。複数タイルが同一ArrayBufferを共有するときの二重転送を防止。4KのGPU区画読戻しは最大16区画/回を維持しつつ、UIへのタスク譲渡を4バッチ単位にして不要な待機を削減。異常な作品サイズは読戻し前に拒否。異常区画・共有バッファ・80区画の分割取得の回帰テストを追加。既存タイルの全読戻し・選択付き消しゴムの完全な仮表示は残る。
- **C07-014（部分改善）**：回転・傾斜を伴う面積平均の各出力画素で、四隅の最小最大座標を4つの配列生成ではなく1回の走査で求める。面積積分の計算式は変更せず、4K縮小時の不要なメモリ割当を削減。4K実測・強い曲がりの誤差検証は残る。
- **C08-003（部分改善）**：領域解析がRegionGraphの同一オブジェクトを再利用しつつラベル配列・外部領域配列を入れ替えた場合、古い塗り仮表示を破棄して再計算。領域ID再利用と外部判定変更の回帰テストを追加。長い筆跡の全条件・Android実機は未検証。
- **コード・テスト**：[`dd501000`](https://github.com/totoro0419/illustro/commit/dd5010002d85a0b21d7c5ba3bc7c01cbeef35f00) → [`67ce97f4`](https://github.com/totoro0419/illustro/commit/67ce97f4aa42891c5d154c6b0535c93629b15edb) → [`3b0c1d1b`](https://github.com/totoro0419/illustro/commit/3b0c1d1b56973978be6479a2a372d7264b19f655) → [`c6cd161e`](https://github.com/totoro0419/illustro/commit/c6cd161ef6f4931b00abc143f101e5c2ea10945f)（4コミット）。
- **検証**：最終コードHEAD `c6cd161e` の[統合CI #44397209635](https://github.com/totoro0419/illustro/actions/runs/44397209635)・[Core CI #44397198108](https://github.com/totoro0419/illustro/actions/runs/44397198108) は両方 **completed/success**。Core・Brush・Editorテスト、型検査、本番ビルドを通過。Android実機、4K時間・メモリ、旧作品保存復元・Undo/Redoの独立実機確認は未実施。保存形式・履歴構造は変更なし。
- **残件・次回**：3 IDとも部分対応を維持。記録上の部分対応37件・根拠未確認0件・修正記録あり個別完了未認定92件。次回は **C06-001/002** の選択付き消しゴム・特殊合成の仮表示と既存タイル全読戻し削減（`apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/tileCapture.ts`）。競合時は **C07-003** 特殊レイヤー一括変形（`apps/editor/src/transform/`）または **C08-015**（`apps/editor/src/fill/incrementalBoundary.ts`）。main・PR #73は変更せずPR #75はDraft維持。

### 2026-11-19 定期自動開発②｜C09-005・C09-009・C09-015の操作改善（3 ID）

- **C09-005 / C09-015（部分改善）**：図形・グラデーションの編集点をキャンバス上で動かす操作を取り消した場合、編集状態と古い非同期仮表示を同時に無効化し、取り消した旨を表示。保存形式・履歴処理は変更しない。
- **C09-009（部分改善）**：グラデーション色停止点をペン・タッチで動かす際、途中で操作がキャンセルされたら元の位置に戻す。キーボード左右キーで0.1%単位、Shift+左右で1%単位、Home/Endで端へ移動。画面上の位置と数値欄を同期し、無効な幅・座標は無視。ポインター・キーボード境界条件の3テストを追加。
- **コード・テスト**：[68399f4c](https://github.com/totoro0419/illustro/commit/68399f4c2bcb9c319fa48ea5db6ace0279ece565)、[c866dc6a](https://github.com/totoro0419/illustro/commit/c866dc6acdc488c0e70b83e22dac23d08b0e2e7a)。
- **検証**：変更コミットの差分と対象ファイルを再取得して確認。抽出した2つの純粋な計算関数について、独立環境でTypeScript strictコンパイルと14境界ケースの実行に成功。ただしGitHub Actionsのステータス取得は空で、リポジトリ全体のVitest・型検査・本番ビルドは**未確認**。Android実機・4K性能・旧作品の保存復元・Undo/Redoの独立検証も未実施。今回の3件を完全解決には数えない。
- **残件・次回**：記録上の部分対応37件・実装根拠未確認0件・修正記録あり完了未認定92件を維持。まずこのコードの統合CI・Core CIを確認し、失敗があれば優先修正。次はC09-005/015の高倍率・複雑レイヤー時の仮表示一致（`apps/editor/src/artwork/shapeGradient.ts`）、競合時はC07-003の特殊レイヤー変形（`apps/editor/src/transform/`）へ。main・PR #73は変更せず、PR #75はDraft維持。

### 2026-11-19 定期自動開発①｜C06-002・C08-003・C08-011・C08-015の連続改善（4 ID）

- **C08-003（部分改善）**：塗り領域のドラッグ仮表示で、手ぶれ補正などが最新点だけでなく直近16点の途中位置を修正した場合も、古い線分の領域カウントを取り消して再計算。長い4Kストロークの全点再走査は行わず、確定済みの古い線分は保持。中間点修正・点追加・1500点入力の回帰テストを追加。
- **C08-011（部分改善）**：塗り領域のブラシ跡を調べる円形サンプルの座標一覧を半径ごとに再利用。長いストロークの各サンプルで円の内外判定を繰り返す処理を削減。幅1/3/9/25で従来と同じ領域を選ぶ回帰テストを追加。4K実測は未実施。
- **C08-015（部分改善）**：自動隙間補完で作られた橋の近傍（3×3）を境界追加・消去するときは、安全性を証明できない局所再解析を使わず、既存の全体解析へ戻す。橋に隣接する編集の回帰テストを追加。大規模な領域分割・統合の局所更新は残る。
- **C06-002（部分改善）**：既存GPUタイルの空白判定を、RGBAの32-bit単位で走査してコールバック回数を削減。透明画素に残るRGBを保持し、4バイト非整列の配列では従来のバイト単位判定へ戻す。空白・透明RGB・非整列バッファの回帰テスト追加。GPUからの既存タイル全読戻し・非Worker経路は残る。
- **コード・テスト**：[`08f0a9f4`](https://github.com/totoro0419/illustro/commit/08f0a9f460ba2712bb6a866bb27fa4f5fe3aac6c) → [`ae10d023`](https://github.com/totoro0419/illustro/commit/ae10d02306caa357479b6ead3d70adcbe6b353d6)（計8コミット）。対象は `fill/liveRegionPreview.ts`、`fill/incrementalBoundary.ts`、`selection/tileCapture.ts` と対応するテスト。
- **検証**：最終コードHEAD `ae10d023` の[統合CI #44387239337](https://github.com/totoro0419/illustro/actions/runs/44387239337) と[Core CI #44387251250](https://github.com/totoro0419/illustro/actions/runs/44387251250) は両方 **completed/success**。Core・Brush・Editorテスト、型検査、本番ビルドを通過。途中コミットのCIキャンセルは最終HEADの成功とは別。Android実機・4K処理時間/メモリ・旧作品保存復元/Undo/Redoの独立実機確認は未実施。保存形式・履歴構造は変更なし。
- **残件と次回**：4件とも部分対応を維持。記録上、部分対応37件・実装根拠未確認0件・修正記録あり個別完了未認定92件。次回は **C06-001/002** の選択付き消しゴム・特殊合成の途中表示とGPU読戻し削減（`apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/tileCapture.ts`、`packages/brush-rt/src/stroke-overlay.mjs`）。競合時は **C07-003** の特殊レイヤー変形（`apps/editor/src/transform/`）または **C08-015** の領域再解析へ。main・PR #73は変更せず、PR #75はDraft維持。

### 2026-11-19 定期自動開発①｜C08-001・C08-011・C08-014の追加改善

- **C08-001（隙間の誤接続）**：自動補完を近い方向に向き合う毛先に限定（向きの一致基準を0.7から0.9へ）。既に自動接続した線との交差・接触を拒否。4096件の候補上限に達した後は、候補一覧に載らない壁を生成しない。正しい斜め線の隙間補完は保持。
- **C08-014（候補提示の誤接続）**：修復済みの橋をまたぐ候補、同じ毛先を二重使用する候補、互いに交差する候補を除外。曖昧な交差部は自動で閉じず、手動操作に委ねる。
- **C08-011（高解像度の処理量）**：gap=1では距離条件を満たす斜め隙間が存在しないため、不要な斜め4方向の全画面走査を省略。候補上限到達後も追加走査を打ち切る。4K実測値は未取得。
- **コード・テスト**：[`75354135`](https://github.com/totoro0419/illustro/commit/75354135bedff7a5443283cf189cc92b10a84096) から [`ac290d9e`](https://github.com/totoro0419/illustro/commit/ac290d9ecfb3cd5e961cc9342188844855c8f03f) まで。交差候補、斜め毛先、候補4096件上限、gap=1と正しい斜め補完の回帰テストを追加。
- **検証**：最終コードHEAD `ac290d9e` の[統合CI #44377199432](https://github.com/totoro0419/illustro/actions/runs/44377199432) と [Core CI #44377207606](https://github.com/totoro0419/illustro/actions/runs/44377207606) は両方 completed/success。Core・Brush・Editorテスト、型検査、本番ビルド成功。既存の文書分類診断には従来からの警告が残る。
- **残件**：3件とも部分対応のまま。複雑な線画の自動接続精度、4K実測、Android実機、旧作品の保存復元・Undo/Redoの独立実機検証は未完了。保存形式・履歴構造は変更していない。全体の記録上の部分対応37件、根拠未確認0件、修正記録あり・個別完了未認定92件を維持。
- **次回着手**：C06-001/002（`apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/tileCapture.ts`、`packages/brush-rt/src/stroke-overlay.mjs`）の選択付き消しゴム・特殊合成の仮表示とGPU読戻し。競合時はC08-003/015（`apps/editor/src/fill/liveRegionPreview.ts`、`apps/editor/src/fill/incrementalBoundary.ts`）。

### 2026-11-19 定期自動開発②｜C10-002・C10-015の追加改善

- **修正内容**：ベクターの点・曲線ハンドルのドラッグ中に、確定時と共通の点移動計算を使ってキャンバスへ仮表示。連続入力を最新位置へ集約し、古い非同期結果を表示しない。Escapeで取消した場合の表示残り、同じ座標の重複計算も改善。
- **コード・テスト**：[`db5b08bb`](https://github.com/totoro0419/illustro/commit/db5b08bb5df3c4d92024c1cc434420241858d91c) → [`51db81f7`](https://github.com/totoro0419/illustro/commit/51db81f730150ae945bf425d01e37d5c14d07543)。ベクター点移動の3回帰テストを追加。
- **検査**：最終コード [統合CI #44370308188](https://github.com/totoro0419/illustro/actions/runs/44370308188) と [Core CI #44370324539](https://github.com/totoro0419/illustro/actions/runs/44370324539) は両方成功。Core/Brush/Editorテスト、型検査、本番ビルドを通過。
- **未完了**：2件とも部分改善。Android実機、4Kの実測、複雑なレイヤー合成と原寸画素の一致、保存復元・Undo/Redoの独立実機検証は未実施。保存形式・履歴構造は変更していない。
- **次回**：C10-002/015の高倍率原寸表示と複雑合成の一致（`apps/editor/src/artwork/vectorPanel.ts`、`apps/editor/src/brushSurface.ts`）。競合時はC07-014（`apps/editor/src/transform/`）またはC09-004（`apps/editor/src/artwork/shapeGradient.ts`）。

### 2026-11-19 定期自動開発②｜C03-007の追加改善

- **修正内容**：履歴サムネイルの生成中の同一リビジョンを、完成済み24件のキャッシュが埋まっても共有する。失敗時はキャッシュを残さず再試行可能。LRU更新・同時生成・失敗再試行の3テストを追加。
- **コード**：[`23c2941d`](https://github.com/totoro0419/illustro/commit/23c2941d6590d73fb7d22fcf0662a6270dc19738)。
- **検査**：[統合CI #44370789617](https://github.com/totoro0419/illustro/actions/runs/44370789617) と [Core CI #44370804626](https://github.com/totoro0419/illustro/actions/runs/44370804626) は両方成功（テスト・型検査・本番ビルド）。
- **残件**：C03-007は部分対応のまま。4K履歴比較画像の全画素処理、Android実機の時間・メモリ、保存復元・Undo/Redoの独立検証は未実施。保存形式と履歴構造は変更なし。
- **次回**：C03-007の履歴比較画像の4K負荷（`apps/editor/src/ui/artworkHistoryView.ts`、`apps/editor/src/export/tiledPreview.ts`）。競合時はC10-002/015の高倍率・複雑合成プレビュー、C07-014の縮小品質へ。

### 2026-11-19 定期自動開発②｜C03-007・C08-003・C07-014の追加改善（検査結果は未確認）

- **C03-007（部分改善）**：4K作品の履歴比較（最大1600×1200）でも条件付きでタイル単位の再描画を使い、CPU側で作品全体のレイヤー画像を保持する経路を回避。縮小画像の集計配列をFloat64からFloat32へ変更し、1600×1200時の集計配列を約61MBから約31MBへ削減。小さな画像では従来の判定を維持。変更・テスト [0dad45f0](https://github.com/totoro0419/illustro/commit/0dad45f048bdf13eec2a8a8cb3106ed7ad57a422) / [ea47868e](https://github.com/totoro0419/illustro/commit/ea47868e6f52db19a938f7c44388eee53961e415)。
- **C08-003（部分改善）**：線画領域の解析結果が入れ替わった場合、同じ領域番号を以前の領域と誤認して古い仮表示を残さないよう更新。長い筆跡で同じ画素を重複して調べる処理も省略。変更・テスト [36eca116](https://github.com/totoro0419/illustro/commit/36eca116b0dc7b2e881508889fb1f80679415406) / [0e977ca9](https://github.com/totoro0419/illustro/commit/0e977ca9d5b57a23df3bc05a82ff080a39b5ead5) / [1ccc32fb](https://github.com/totoro0419/illustro/commit/1ccc32fbf342f1947cf33a62580276b67e6a3b4e)。
- **C07-014（部分改善）**：4K作品の縮小用の正確な画素平均で、透明画素・選択範囲外画素を早期に省略。透明RGBが結果へ混入しない回帰テストを追加。変更・テスト [05d234b5](https://github.com/totoro0419/illustro/commit/05d234b589e18af937a1ba3c17fa0616495b476d) / [56a1243c](https://github.com/totoro0419/illustro/commit/56a1243cad0ff29c2125ef0d3d34632c45d3706a)。
- **検証状態**：GitHub上のコードとテストファイルへのコミットは確認。数値検査ではFloat32の色丸め差が抽出条件内で0〜1未満だった。ただしリポジトリ全体をローカル取得できず、GitHub Actionsの実行結果も現在の連携手段から取得できないため、Vitest・型検査・本番ビルドの成功は**未確認**。未検証のため完全解決認定は行わない。Android実機・4K実測・保存復元/Undo/Redoの独立検証も未実施。
- **残件と次回**：記録上の部分対応37件・実装根拠未確認0件・修正記録あり完了未認定92件を維持。次回はまず本コミットのCI結果を確認し、失敗があれば修正。続いてC06-001/002（`apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/tileCapture.ts`）の選択付き消しゴム・特殊合成の仮表示とGPU読戻し削減。タスク①と競合する場合はC08-015（`apps/editor/src/fill/incrementalBoundary.ts`）を優先。保存形式・履歴構造は変更なし。main・PR #73は変更せず、PR #75はDraft維持。

## 集計

| 現在の記録上の区分 | 件数 | 意味 |
|---|---:|---|
| 修正記録あり・個別完了未認定 | 92 | 既存記録を維持。今回の再調査対象ではない |
| 今回、コード上の不足を修正済み | 3 | C09-007・C10-006・C10-010。実機独立確認は別 |
| 監査対象37件のうち上記3件以外 | 34 | 主要実装あり21・C06-002の部分対応1・実測待ち7・改善案5。34件全部が未実装バグという意味ではない |
| 実装根拠未確認 | 0 | 既存記録を維持 |
| 実機での独立解決確認 | **0** | Android実機での承認は別扱い |

| 分野 | 総数 | 既存の修正記録・未認定 | 今回コード不足修正 | 元37件のうち残る記録 |
|---|---:|---:|---:|---:|
| C03 | 13 | 12 | 0 | 1 |
| C04 | 15 | 14 | 0 | 1 |
| C05 | 20 | 19 | 0 | 1 |
| C06 | 17 | 13 | 0 | 4 |
| C07 | 16 | 10 | 0 | 6 |
| C08 | 16 | 10 | 0 | 6 |
| C09 | 16 | 6 | 1 | 9 |
| C10 | 16 | 8 | 2 | 6 |

## 直ちに着手するコード残件

優先順位は「作品の安全性と操作中の確定／仮表示の一致」→「4Kの応答性能」→「その他」。特に **C06-001/002/007/015、C07-001/003/014、C08-003/015、C09-004/006/010/011、C10-009/015** を複数まとめて実装。C05-020は素材ごとの適用仕様に照らして不足を解消。修正に伴い対象IDを更新し、テストとコミットのリンクを残す。

### 2026-11-19 定期自動開発①｜C06-002・C06-007・C07-003の追加改善

- **C06-002（部分改善）**：4Kの長い斜め線について、選択外判定を外接四角形の走査から保守的な線分領域の走査へ変更。選択範囲に届かない筆跡ではGPU読戻しを開始しない。複数筆跡の選択タイルマスクをWorker内で再利用し、未選択タイルの確保を省略。数値異常は安全側で従来処理へ戻す。回帰テストで斜線・水平線・縦線・巨大座標・複数筆跡とCPU参照画素の一致を検証。既存タイル全読戻しは残る。
- **C06-007（部分改善）**：選択ブラシの入力点が最後の点だけでなく直近8点の範囲で変更された場合、古い仮表示を残さず原寸マスクを再計算。長い線で全点を毎フレーム走査しない構造は維持。Worker非対応の長い線とAndroid実機は未確認。
- **C07-003（部分改善）**：多数レイヤーの一括変形の境界計算で引数展開をなくし、数値上限に近い座標でも中心の加算オーバーフローを避け、非有限の出力を確定前に拒否。複数レイヤー・異常値の回帰テスト追加。特殊レイヤー・非アフィン一括変形は未実装。
- **コードコミット**：[`907574fe`](https://github.com/totoro0419/illustro/commit/907574fe98837561c186bbdd559e1f9f39fa6c85) から [`bae83ac9`](https://github.com/totoro0419/illustro/commit/bae83ac9dc8db232c73760765ffac869919d7789) まで（コード・テスト計11コミット）。最終コードHEAD `bae83ac9`。
- **検証**：最終コードHEADの[統合CI #44364855747](https://github.com/totoro0419/illustro/actions/runs/44364855747) **completed/success**（Core・Brush・Editorテスト、型検査、本番ビルド）、[Core CI #44364872995](https://github.com/totoro0419/illustro/actions/runs/44364872995) **completed/success**。Android実機、4K時間・メモリ、保存復元・Undo/Redoの実機独立確認は未実施。保存形式・履歴構造は変更なし。
- **残件・次回**：3件とも部分対応のまま。記録上の部分対応37件・根拠未確認0件・修正記録あり完了未認定92件を維持。次回は **C06-001/002**（選択付き消しゴム・特殊合成の仮表示、選択内GPU読戻し削減）を優先。関連 `apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/tileCapture.ts`、`packages/brush-rt/src/stroke-overlay.mjs`。競合時は **C07-003** の特殊レイヤー対応（`apps/editor/src/transform/`）か **C08-003/015**（`apps/editor/src/fill/`）へ。

### 2026-11-18 追加コード修正

- **C10-008**：最後のベクター線を消す操作を、レイヤーのUndo可能な削除処理へ接続。未保存の新規候補は作品に触れず破棄。既存のロック・最低1描画レイヤー保護を維持。コード: [`1c51309fd678`](https://github.com/totoro0419/illustro/commit/1c51309fd6788451e9d012a0b745430a08d2aa85)。検査: [統合CI #44321070832](https://github.com/totoro0419/illustro/actions/runs/44321070832)、[Core CI #44321084276](https://github.com/totoro0419/illustro/actions/runs/44321084276)ともsuccess（Core/Brush/Editor検査、型確認、本番ビルド）。Android実機は未確認。
- **次回最初の対象（定期自動開発②の追加修正後）**：C06-001/002（選択付き消しゴム・特殊合成の途中表示、画素読戻し）。関係箇所: `apps/editor/src/selection/`、`apps/editor/src/brushSurface.ts`。並行作業と重なる場合はC09-004へ切り替える。

### 2026-11-18 定期自動開発②｜追加の連続修正（3 ID）

- **C06-015（部分改善）**：貼り付け時に空白タイルを毎回確保・破棄する処理を見直し、元画像の全RGBA画素を調べて空白と分かったタイルは確保しない。透明画素に残るRGB情報も捨てず、画素データの互換性を維持。4Kの大きな余白と透明RGBの回帰テストを追加。コミット [`35529a5a`](https://github.com/totoro0419/illustro/commit/35529a5a472b9fed43f41b8c4ef8c073a7506a42)。
- **C06-007（部分改善）**：選択ブラシの途中表示で、最後のペン位置が同じ点数のまま変更されたときも原寸の結果を再計算。長い線の表示範囲は新しく増えた点だけを調べる方式に変更し、入力が増えるほど無駄な全点走査が繰り返される問題を抑制。確定用の筆跡計算・Undo/Redo・保存形式は変更なし。回帰テストを追加。コミット [`bae35851`](https://github.com/totoro0419/illustro/commit/bae35851bb080b35fbad686fd8d140464a887214)。
- **C03-007（部分改善）**：履歴画像の生成中、アプリが背景タブにあると画面更新待ちで止まり続ける可能性を解消。表示中は従来の画面更新に合わせ、背景では短い待機で処理を継続する。履歴画像の色・合成方法・保存形式は変更なし。表示中／背景のテストを追加。コミット [`e03757fa`](https://github.com/totoro0419/illustro/commit/e03757fa30d5c1a5cb66c4f190e5040b0b1d6416)。
- **検査**：前2コミットはそれぞれ統合CIとCore CIがsuccess。最終コードHEAD `e03757fa` のCore CI [#44326327749](https://github.com/totoro0419/illustro/actions/runs/44326327749) はsuccess。統合CI [#44326315905](https://github.com/totoro0419/illustro/actions/runs/44326315905) もcompleted/success（Core・Brush・Editorテスト、型確認、本番ビルド）。Android実機と4K性能の実測は未実施。
- **残件と次回**：3 IDとも既存の「部分対応」を維持。C03-007の高度な履歴画像での全画素処理、C06-007のWorker非対応時の長い線、C06-015の特殊グループ貼り付け・巨大コピー元の課題は残る。次回は **C06-001/002**（選択付き消しゴム・特殊合成の途中表示と読戻し）を最優先。関連ファイル：`apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/`。競合する場合は **C09-004**（図形の選択マスク付き仮表示）、`apps/editor/src/artwork/shapeGradient.ts` へ切り替える。

### 2026-11-19 定期自動開発①｜3 IDを追加改善（コードHEAD `434f6261`）

- **C06-002（部分改善）**：選択付きの一筆が選択範囲の画素に届かないと保守的に判定できる場合、描画済みレイヤーの全GPUタイル読戻しとWorkerへの転送を開始せず終了。接続した筆跡、複数の対称コピー、選択の透明度、4K座標に対応。判定が不確実な場合や検査範囲が広い場合は従来の正確な処理へ戻す。対象: `selection/maskStrokeBounds.ts`、`brushSurface.ts`。全タイル読戻しの一般的な削減、非Worker経路は未完成。
- **C09-004（部分改善）**：新規図形の仮表示に使った選択マスクを、選択状態が後から変わっても保存時に同じ値で渡す。既存図形の編集ではそのレイヤーの保存済みマスクを維持。原寸・縮小表示のマスク計算と透明度の回帰テストを追加。小さな選択領域を縮小する際の面積平均・実機での完全一致は未確認。
- **C09-011（部分改善）**：グラデーションの方向・距離・角度に依存する不変計算を描画前に1回だけ実行し、最大64個の色停止点を各画素で順番に調べる方式から二分探索へ変更。既存の線形・放射・楕円・角度・反射の位置計算、重複停止点の区間判定を回帰テストで照合。4Kの最終画像全画素生成とメモリ確保は引き続き残る。
- **コミット**：[図形マスク `dc8d2186`](https://github.com/totoro0419/illustro/commit/dc8d21867043a0d15e580e53fe0f767bed9e85f8) / [グラデーション高速化 `e54737a4`](https://github.com/totoro0419/illustro/commit/e54737a40a41d3b985aec0a51486c49ba9bc4086) / [選択付き筆の読戻し削減 `e71b0dc4`](https://github.com/totoro0419/illustro/commit/e71b0dc47667b1949e67e228d6f6fe15a9cd691b) / [テスト修正を含む最終 `434f6261`](https://github.com/totoro0419/illustro/commit/434f6261700dbca4c02e88d8f11776dea6da6040)。中間のテスト失敗（Node DOM依存・4K配列の巨大比較・構文誤り）を修正し、最終HEADで再検証。
- **検査**：[統合CI #44332262101](https://github.com/totoro0419/illustro/actions/runs/44332262101) **success**（Core、Brush、Editorテスト、型検査、本番ビルド）。[Core CI #44332277362](https://github.com/totoro0419/illustro/actions/runs/44332277362) **success**。Android実機、4K実測、Undo/Redo・保存復元の実機独立検証は未実施。保存形式や履歴構造は変更なし。
- **集計**：3 IDとも部分対応を維持。既知の部分対応36件、根拠未確認1件、修正記録あり・個別完了未認定92件という記録上の分類は変更しない。
- **次回**：C06-001（選択付き消しゴム・特殊合成の途中表示）、C06-002（実際に重なる筆のGPU読戻し削減）、C07-003（特殊レイヤーの一括変形）。関連: `apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/`、`apps/editor/src/transform/`。競合時はC09-006（ペン保持中の図形補正仮表示）へ。

### 2026-11-19 定期自動開発②｜C09-004・014・016の追加改善

- **C09-014（部分改善）**：グラデーションマップの比較に、作品中央の原寸128×128画素を追加。元画像の原寸RGBAと選択マスクを保持したまま、全体の320px縮小プレビューとは別に比較できる。4K作品でも追加保持する画像は128×128画素だけ。原寸画素の取り出し・透明度・4K座標のテストを追加。コード [`325c23f9`](https://github.com/totoro0419/illustro/commit/325c23f9fa82bd535411835252631a01288de257)。
- **C09-004（部分改善）**：長方形の選択マスクを縮小表示するとき、中央の1点だけで判断せず、元画像内で実際に重なる面積から透明度を計算。小さな選択領域が縮小で消える場合と、反転・濃さの回帰テストを追加。楕円・自由形状・画素マスクは引き続き追加検証が必要。コード [`4caebbc9`](https://github.com/totoro0419/illustro/commit/4caebbc9012dea970d388f9cf2b98f54b6f987b6)、型の修正 [`97a8dc78`](https://github.com/totoro0419/illustro/commit/97a8dc78eefa0b2bf5e8b03542c0c07df8855b2d)。
- **C09-016（部分改善）**：ベジェ曲線の制御ハンドルも、線の点と同じ固定した定規へ吸着。曲線だけが定規からはみ出す経路を改善し、入力元を変更しない回帰テストを追加。コード [`4caebbc9`](https://github.com/totoro0419/illustro/commit/4caebbc9012dea970d388f9cf2b98f54b6f987b6)。
- **検証**：中間HEAD `0f43339a` で型検査に失敗したため、型指定を修正。最終コードHEAD `97a8dc78` の [統合CI #44336741413](https://github.com/totoro0419/illustro/actions/runs/44336741413) は **success**（Core・Brush・Editorテスト、型検査、本番ビルド）。[Core CI #44336757302](https://github.com/totoro0419/illustro/actions/runs/44336757302) も **success**。Android実機・4K操作の時間とメモリは未測定。
- **残件・次回**：3 IDはすべて部分対応を維持。既知のコード残件36件・根拠未確認1件・修正記録あり完了未認定92件は変更なし。次回は **C09-005/015**（図形・グラデーションの編集点を動かしている途中のキャンバス表示）、**C09-006**（ペン保持中の形状補正候補表示）。他作業と競合する場合は **C08-014**（隙間の誤接続改善）を選ぶ。関係ファイル：`apps/editor/src/artwork/shapeGradient.ts`、`apps/editor/src/brushSurface.ts`、`apps/editor/src/artwork/strokeCorrection.ts`、`apps/editor/src/fill/`。

### 2026-11-19 定期自動開発①｜C09-004/005/006/015を連続改善（コードHEAD `c7a052d6`）

- **C09-004（部分改善）**：楕円選択マスクの縮小表示を、中心1点の判定から曲線内の面積積分に変更。小さな楕円、反転・密度、輪郭の回帰テスト3件追加。コード [`64186e82`](https://github.com/totoro0419/illustro/commit/64186e823c95ae6b3339117974ebf30d23154e36)。
- **C09-005/C09-015（部分改善）**：図形・グラデーションの編集点ドラッグ中、同じ編集点変更を使った縮小結果をWorkerで計算して制作キャンバスに重ねる。最新操作だけを採用し、古い計算を破棄、確定・取消時に仮表示を消す。保存・Undo/Redoは変更しない。アンカーとベジェ制御点の回帰テスト2件追加。コード [`7ad2ef83`](https://github.com/totoro0419/illustro/commit/7ad2ef83ba0324e8de96a44c3b9dc4220339997c)。
- **C09-006（根拠未確認→部分対応）**：ペンを止めたとき、手を離す前に直線／楕円の補正候補をキャンバス上へSVGで表示。最終補正と同じ幾何生成関数を使用し、古い候補は終了・取消時に破棄。候補生成の回帰テスト3件追加。コード [`824ce744`](https://github.com/totoro0419/illustro/commit/824ce7445a4e06a8cf963513993eea707b1374db)、型修正 [`15508a62`](https://github.com/totoro0419/illustro/commit/15508a62cf7bd721924b0b88b92d90f339ab3dad)、細い楕円の互換性修正 [`c7a052d6`](https://github.com/totoro0419/illustro/commit/c7a052d693cc142a9b9e7568d1439958dc9b6b21)。
- **検証**：中間HEAD `7ad2ef83` はEditor型検査で失敗し、`mask??null` に修正。最終コードHEAD `c7a052d6` の [統合CI #44343199115](https://github.com/totoro0419/illustro/actions/runs/44343199115) は **success**（Core・Brush・Editorテスト、型検査、本番ビルド）、[Core CI #44343212007](https://github.com/totoro0419/illustro/actions/runs/44343212007) も **success**。Android実機・4K応答速度・旧作品の保存復元は未検証。
- **残件・次回**：4 IDとも完全解決とは扱わない。C09-006を「実装根拠未確認」から「部分対応」に移し、記録上は**部分対応37件／根拠未確認0件／修正記録あり92件**。次回は **C06-001/002**（選択付き消しゴム・特殊合成の途中表示、選択内GPU読戻し）、競合時は **C08-014**（毛先・交差の隙間候補）。関連：`apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/`、`apps/editor/src/fill/pixels.ts`。

### 2026-11-19 定期自動開発②｜C08-011/014/015の連続改善（コードHEAD `7c03eb5d`）

- **C08-011（部分改善）**：隙間補完が不要な線画の解析で元の壁画像を余分に複製せず、4Kで最大約16MBの一時配列を節約。塗り先の元色と一致するかの判定に必要なRGB値を塗り操作ごとに1回だけ計算し、画素ごとの重複配列生成を削減。透明画素・保存形式は変更なし。コード [`6e97aa58`](https://github.com/totoro0419/illustro/commit/6e97aa588ccff956719f581fd1e36acb008e7d98)、[`7c03eb5d`](https://github.com/totoro0419/illustro/commit/7c03eb5dd9f4036680b2747aaa256023553a631e)。
- **C08-014（部分改善）**：隙間候補は交差点から離れた、互いに向き合う明確な毛先だけに限定。垂直方向の毛先や交差部をつなぐ誤候補を抑え、手動の線接続は維持。安全な対向毛先・交差・垂直毛先の回帰テスト追加。コード [`6e97aa58`](https://github.com/totoro0419/illustro/commit/6e97aa588ccff956719f581fd1e36acb008e7d98)、型修正 [`b156acb1`](https://github.com/totoro0419/illustro/commit/b156acb1a3b67ab846e3caeb9d068bd28f3f021b)。
- **C08-015（部分改善）**：空白線画では全領域の探索・隣接解析・大型作業配列を省略し、1領域の正確な番号・隣接情報を直接生成。部分的な領域更新では番号付けと壁の有無の判定を1回の走査にまとめる。空白・変更領域の回帰テストを追加。コード [`6e97aa58`](https://github.com/totoro0419/illustro/commit/6e97aa588ccff956719f581fd1e36acb008e7d98)、[`fe94b6b6`](https://github.com/totoro0419/illustro/commit/fe94b6b663b5a8d062e62a1d0fced2078e6d0c4e)。
- **検証**：中間コード `6e97aa58` のEditor型検査はローカル配列の型推定で失敗したため `b156acb1` で修正。最終コード `7c03eb5d` の [統合CI #44348308747](https://github.com/totoro0419/illustro/actions/runs/44348308747) と [Core CI #44348321769](https://github.com/totoro0419/illustro/actions/runs/44348321769) はともに **completed/success**。統合CIでCore・Brush・Editorテスト、Editor型検査、本番ビルドが成功。Android実機、4Kの処理時間とメモリ使用量の実測、保存復元の独立実機検証は未実施。
- **残件・次回**：3 IDとも完全解決とは扱わず部分対応を維持。記録上の部分対応37件・根拠未確認0件・修正記録あり92件を維持。次回は **C08-003/015**（線画領域・囲い塗りの途中表示と変更範囲だけの再解析）を優先。関連 `apps/editor/src/fill/liveRegionPreview.ts`、`apps/editor/src/fill/changedRegions.ts`、`apps/editor/src/fill/run.ts`。他作業と競合しなければ **C06-001/002** を再検討。

### 2026-11-19 定期自動開発①｜C08-003/011/015の連続改善（コードHEAD `6aa5a5cd`）

- **C08-003（部分改善）**：線画領域のドラッグ仮表示を、確定用の2倍密度の筆跡サンプリングと一致させ、斜め線で細い領域を飛ばす条件を修正。縮小画像は最大4点の被覆サンプルと領域の先頭画素による見失い防止を追加。ペン先の最後の点が書き換わった場合は直前区間だけ取り消して再計算し、古い青い仮表示が残る条件を修正。短縮・取消時の表示消去、4K画像、細い領域の回帰テスト追加。線画マスクの原寸画素完全一致、囲い塗りの途中表示、Android実機は未完成。
- **C08-011（部分改善）**：塗り結果の変更検査をRGBA全画素走査から、実際に塗りマスクがある画素の4チャンネル照合へ変更。空マスク・透明レイヤー消去・アルファロック消去・不透明度0の確実な無変更操作では、診断表示が不要な場合に64MB級の4K結果画像の生成を省略。通常の有効な塗りでは従来の画素計算を維持。Worker転送・通常の巨大画像生成の追加削減は残る。
- **C08-015（部分改善）**：部分的な境界編集が実際には1画素も変更しない場合、変更領域の再番号付け・隣接情報再計算を避け、既存の領域グラフをそのまま返す。無変更の追加・削除の回帰テスト追加。複雑な変更時の全画素再走査は残る。
- **コードコミット**：[線画仮表示・変更画素照合・無変更領域 `88f42b56`](https://github.com/totoro0419/illustro/commit/88f42b565e055ee90c3dec1e965aa910709a5b76) → [無変更塗りの画像確保省略 `0f245105`](https://github.com/totoro0419/illustro/commit/0f24510536193d6cdc07c92a742c529205548d9d) → [最後の入力点変更への追従 `6aa5a5cd`](https://github.com/totoro0419/illustro/commit/6aa5a5cd18edccac8cd35d572cceefc3f9fb2956)。
- **検証**：最終コードの [統合CI #44355132542](https://github.com/totoro0419/illustro/actions/runs/44355132542) と [Core CI #44355147926](https://github.com/totoro0419/illustro/actions/runs/44355147926) はともに **completed/success**。Core・Brush・Editorテスト、Editor型検査、本番ビルドが成功。Android実機、4000×4000の応答時間・メモリ実測、既存作品の保存復元・Undo/Redoの実機独立確認は未実施。保存形式・履歴構造の変更なし。
- **残件・次回**：3 IDとも完全解決とせず部分対応を維持。記録上は部分対応37件、根拠未確認0件、修正記録あり・個別完了未認定92件。次回は **C06-001/002**（選択付き消しゴム・特殊合成の途中表示とGPU読戻し）を優先。競合時は **C08-003** の囲い・線画マスク原寸一致、**C08-015** の複雑な変更領域の再解析削減。関連 `apps/editor/src/brushSurface.ts`、`apps/editor/src/selection/`、`apps/editor/src/fill/panel.ts`、`apps/editor/src/fill/changedRegions.ts`。

### 2026-11-19 定期自動開発②｜C10-007/008/013 ベクター精度の連続改善

- **C10-007（追加改善・完了未認定）**：離れたベクター線を接続するとき、元の曲線ハンドルを新しい接続区間に流用して不自然なループを作る問題を修正。完全一致する端点は1点に統合し、左右の既存曲線ハンドルを維持。既存の距離制限・入力データ非変更を回帰テストで確認。
- **C10-008（追加改善・完了未認定）**：曲がりの強い4Kベクター線をタップしたとき、固定16分割の近似によって実際の線から遠いと誤判定する問題を修正。曲線の制御点が作る範囲で先に候補を絞り、必要な区間だけ精度に応じて細分化して距離を測る。区間消去の回帰テスト追加。既存のレイヤー削除・Undo/Redo・保存処理は変更なし。
- **C10-013（部分改善）**：曲線の細分化が上限に達したとき、精度不足の直線を黙って返さず明示的に停止。楕円と長方形の輪郭でも要求精度・点数上限を確認し、不正確な図形演算の結果を防ぐ。高曲率4K曲線、楕円、点数制限の回帰テストを追加。4Kでの処理時間・極端な曲線の継続編集は未検証。
- **コード・テストコミット**：[ベクター接続・区間消去・曲線精度 `99fb1bff`](https://github.com/totoro0419/illustro/commit/99fb1bff0850d0c59b8545356f0563ed8bb3c8d0) → [楕円・輪郭の精度上限 `39b90559`](https://github.com/totoro0419/illustro/commit/39b90559014488acdcc8cba639fc89a4bcd58a8e)。
- **検証**：最終コードHEAD `39b90559` の [統合CI #44360706966](https://github.com/totoro0419/illustro/actions/runs/44360706966) と [Core CI #44360717092](https://github.com/totoro0419/illustro/actions/runs/44360717092) はいずれも **completed/success**。統合CIでCore・Brush・Editorテスト、Editor型検査、本番ビルド成功。Android実機・4K性能の実測、保存復元・Undo/Redoの実機独立確認は未実施。
- **残件と次回**：今回の3 IDを完全解決とは判定しない。記録上の部分対応37件、根拠未確認0件、修正記録あり・個別完了未認定92件を維持。次回は **C10-002/015**（点・ハンドル移動中の曲線仮表示と確定一致）を優先。関係ファイル：`apps/editor/src/artwork/vectorPanel.ts`、`apps/editor/src/brushSurface.ts`。タスク①と競合する場合は **C07-003**（`apps/editor/src/transform/groupTransform.ts`）へ切り替える。

## 129件の一覧

| ID | 元分類・優先 | 元の指摘 | 2026-11-18の進捗区分 | 次に必要なこと・既知の制約 | 実装PR |
|---|---|---|---|---|---|
| [C03-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-001) | A/P1 | 変形済みレイヤーを複製できない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-002) | A/P1 | 自由形状の選択範囲からマスクを作れない条件がある | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-003) | A/P1 | 履歴ブラシが自由形状の選択範囲を考慮しない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-004) | A/P1 | 保存の成功表示が実際の保存確認を意味しない場合がある | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-005) | A/P2 | 復元候補に古い作品名が表示される条件 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-006) | A/P2 | マスク適用ボタンが使用可能でも処理が拒否される | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-007) | B/P2 | 履歴の小さなプレビューに大きな画像を生成する | **部分対応・コード残件あり** | 履歴サムネイルの生成中処理を完成済みLRUキャッシュから分離。24件の完成済み画像が埋まっても、生成中の同一履歴を重複して4K再描画しない。失敗時は再試行可能。コード [`23c2941d`](https://github.com/totoro0419/illustro/commit/23c2941d6590d73fb7d22fcf0662a6270dc19738)。4K全画素処理の他経路と実機負荷は継続 | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-008) | B/P1 | 終了直前の自動保護は完了が保証されない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-009) | B/P2 | 大きな作品の保存時にデータ複製・全内容照合・読戻しの負担が懸念される | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-010) | B/P2 | 旧形式移行の検証が描線数中心で見た目の一致を証明していない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-011) | C/P2 | 離れたレイヤーをまとめてグループ化する操作が複雑 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-012) | C/P2 | 履歴比較の確認画面が制作の流れを中断する | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C03-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C03.md#c03-013) | C/P2 | レイヤー一覧の全面再構築を減らす余地がある | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#76](https://github.com/totoro0419/illustro/pull/76) |
| [C04-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-001) | A/P1 | 一時ツールを戻す操作が状況によって一致しない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C04-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-002) | A/P1 | マクロが終了する前に成功したと表示する | **部分対応・コード残件あり** | マクロの一部UI操作について完了判定の共通連携が未完全 | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C04-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-003) | A/P1 | コマンド検索で非表示レイヤーが候補から欠落する | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C04-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-004) | A/P1 | 作品固有のパレットが作品データへ保存されない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#83](https://github.com/totoro0419/illustro/pull/83) |
| [C04-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-005) | A/P1 | スポイトのGPU画像読取が繰り返され操作遅延の懸念 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#83](https://github.com/totoro0419/illustro/pull/83) |
| [C04-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-006) | A/P2 | 採色元表示と選択範囲の扱いが一致しない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#83](https://github.com/totoro0419/illustro/pull/83) |
| [C04-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-007) | A/P2 | Quick Controllerの枠が満杯の場合に確認なく置換する | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C04-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-008) | A/P2 | Workspace保存に失敗しても成功表示する場合がある | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C04-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-009) | B/P2 | ショートカット設定保存に失敗しても読込成功と表示する場合がある | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C04-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-010) | B/P2 | 色を変更する途中で色一覧を繰り返し走査する可能性 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#83](https://github.com/totoro0419/illustro/pull/83) |
| [C04-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-011) | B/P2 | Quick操作の必要手数を削減できる | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C04-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-012) | C/P2 | Workspace設定とショートカット設定の分離・整合を改善できる | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C04-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-013) | C/P2 | 色覚補助・白黒フィルターが補助UIにも作用する表示を見直す | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#83](https://github.com/totoro0419/illustro/pull/83) |
| [C04-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-014) | C/P2 | Focus中にQuick Controllerが隠れて操作性を損なう | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C04-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C04.md#c04-015) | C/P2 | 正式に指定した色と実際のCSS配色に相違がある可能性 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#97](https://github.com/totoro0419/illustro/pull/97) |
| [C05-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-001) | A/P1 | 参考資料の問題が作品ファイル全体の保存失敗につながる | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-002) | A/P1 | 資料の配置変更が作品切替時に保存されず失われる可能性 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-003) | A/P1 | 作品を複製しても参考資料を引き継げない経路がある | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-004) | A/P1 | 作品ファイルからの参考資料復元が読み込み途中に終了する可能性 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-005) | A/P1 | 資料の保存情報が不正な場合に空の資料として扱う | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-006) | A/P1 | 素材パックの持ち運びで版のつながりが失われる | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#77](https://github.com/totoro0419/illustro/pull/77) |
| [C05-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-007) | A/P2 | 素材の非表示・ゴミ箱表示では検索条件が無視される | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#77](https://github.com/totoro0419/illustro/pull/77) |
| [C05-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-008) | A/P2 | お気に入り変更でも素材の版番号が増える | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#77](https://github.com/totoro0419/illustro/pull/77) |
| [C05-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-009) | A/P2 | 一時的な資料表示が保存とUndoの対象になる | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-010) | A/P1 | 作品ファイル内の参考資料より端末に残る古い配置が優先される | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-011) | A/P2 | 素材を削除するときの依存関係の確認が不足 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#77](https://github.com/totoro0419/illustro/pull/77) |
| [C05-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-012) | A/P2 | 作品一覧で複数作品をまとめて操作できない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-013) | A/P2 | 参考資料の埋め込みと外部参照を選べる入口がない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-014) | A/P2 | 資料の縮小画像を使用する採色で細部の色が正確に拾えない場合がある | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-015) | A/P2 | 素材パックの一部読み込み失敗への回復操作が不足 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#77](https://github.com/totoro0419/illustro/pull/77) |
| [C05-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-016) | A/P2 | 画面サイズ変更後に参考資料が画面外に残る条件がある | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-017](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-017) | B/P2 | 素材一覧の取得方式が大量素材に不利な可能性 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#77](https://github.com/totoro0419/illustro/pull/77) |
| [C05-018](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-018) | B/P2 | 参考資料の変更時に全ウィンドウを再構築し負荷が増える可能性 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-019](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-019) | C/P2 | 参考資料上の直接採色と全体表示の切替を改善できる | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#82](https://github.com/totoro0419/illustro/pull/82) |
| [C05-020](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C05.md#c05-020) | C/P2 | 素材種別ごとの実際の利用方法を統一できる | **部分対応・コード残件あり** | 素材別適用を追加したが、色・質感・サイズ等の表現制限が残る | [#77](https://github.com/totoro0419/illustro/pull/77) |
| [C06-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-001) | A/P1 | 選択中のブラシの仮表示に選択範囲が反映されない経路 | **部分対応・コード残件あり** | 消しゴム・特殊合成・下層描画の選択マスク付き仮線が未完成 | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-002) | A/P1 | 選択中の一筆が通常の描画より大きな処理を要求する | **部分対応・コード残件あり** | 4K斜め線の選択外判定を細い線分領域で検査し、巨大な外接四角形の走査・不要なGPU読戻しを回避。Worker内では選択のないタイルを早期除外し、同じタイルのマスクを複数の筆跡で再利用。コード [`bae83ac9`](https://github.com/totoro0419/illustro/commit/bae83ac9dc8db232c73760765ffac869919d7789) まで。選択内の既存タイル全読戻しと非Worker経路は継続。追加：GPUタイルの非ゼロ判定をRGBAワード単位へ高速化。透明RGBと非整列バッファの回帰テスト成功。コード [`ae10d023`](https://github.com/totoro0419/illustro/commit/ae10d02306caa357479b6ead3d70adcbe6b353d6)。全タイル読戻しは残る 追加：Workerの戻り値を保存前に検証し、同一ArrayBufferの二重転送を防止。GPU読戻しのタスク譲渡頻度を調整。コード [`c6cd161e`](https://github.com/totoro0419/illustro/commit/c6cd161ef6f4931b00abc143f101e5c2ea10945f)。 追加：非正規GPUタイル座標を拒否し、選択マスクの行走査とタイル空白判定の割当を削減 [`7ea054c5`](https://github.com/totoro0419/illustro/commit/7ea054c532f131c2239c85d6e359470331f3f8d4)。全タイル読戻しは継続 追加：不正な選択マスクを読戻し前に拒否し、真に空のGPUレイヤーの消しゴムを無操作化 [`548a6a86`](https://github.com/totoro0419/illustro/commit/548a6a864b324a4fd6434637d313e6fe0a9f5fc4)。既存タイル全読戻しは残る | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-003) | A/P1 | 選択がない状態で減算・交差を使うと新しい選択範囲ができる | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-004) | A/P2 | 複雑な選択範囲でも四角い外枠が表示される | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-005) | A/P1 | Ctrl+Vが端末の画像貼り付けと連動していない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-006) | A/P1 | 保存選択範囲の件数と作品ファイルの容量制限が矛盾する | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-007) | A/P1 | 選択ブラシで描いている途中の形が仮表示されない | **部分対応・コード残件あり** | 選択ブラシのWorker仮表示で、ペンの同時入力処理により直近8点のうち最後以外が差し替わっても原寸結果を再計算し、古い線が残る条件を改善。コード [`8d3ad847`](https://github.com/totoro0419/illustro/commit/8d3ad8473ea999ae73a90bd84c32964dc40f7d1c)。Worker非対応時の長い線、Android/4K応答時間は継続 追加：確定演算と一致する仮表示を384点まで拡張 [`bc7cf1a1`](https://github.com/totoro0419/illustro/commit/bc7cf1a1ffd571de6a24a8707d47b66b8e363dc9)。長い筆跡のWorker非対応時は継続 追加：同時入力補正の監視を直近32点へ拡張し、20点前の差替えを再計算 [`8a477f58`](https://github.com/totoro0419/illustro/commit/8a477f5803ad5da1cd0e040e432977117b93e86e)。Worker非対応の長大筆跡は残る 追加：直近64点の座標・筆圧を要求キーに含め、同点数の入力補正でもWorker仮表示を再計算・古い応答を破棄 [`49696935`](https://github.com/totoro0419/illustro/commit/49696935606baaaac5a3846797743714a9715359)。Worker非対応時は残る | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-008) | A/P1 | 選択した絵を作品外へ移動すると外にはみ出した画素が失われる | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-009) | A/P2 | 名前付き選択範囲の既存項目への上書き保存とサムネイルがない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-010) | A/P2 | 磁気投げ縄が実装されていない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-011) | A/P2 | 選択範囲の拡張・縮小・ぼかしで元の範囲との比較と適用前取消が不足 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-012) | A/P2 | 選択マスクの640画素表示では原画の1画素幅の細部を表示できない条件 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-013) | B/P1 | 四角い選択から選択マスクへの非同期変換完了前に描画を開始する競合の疑い | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-014) | B/P1 | 画像ドラッグを拒否した場合にブラウザー標準のファイルドロップがページ移動を起こす疑い | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-015) | B/P2 | 小さい選択範囲の貼り付けにも作品全体の画素配列を確保する懸念 | **部分対応・コード残件あり** | 特殊グループ貼り付け・大容量コピー元取り込みの残課題 追加：小さい選択範囲は画像とマスクを切り出してからWorkerでコピー [`660106f9`](https://github.com/totoro0419/illustro/commit/660106f950718978cbcd266b34d0639ee1108bbb)。特殊グループ・元画像全体の取得は継続 追加：通常ラスターの小選択コピーは重なるGPU区画だけ読取り、全4K画像の取得を回避 [`2ccfe7bf`](https://github.com/totoro0419/illustro/commit/2ccfe7bfa927347a838c1d1fbe7c69d06c4bdd34)。特殊グループ・合成コピーは継続 追加：NaN/Infinityのコピー範囲・不整合な選択マスクを読戻し前に拒否 [`f9cca830`](https://github.com/totoro0419/illustro/commit/f9cca830f2c658bf361458ba532c5cad7309701e)。特殊グループの大容量経路は残る | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-016) | C/P2 | 選択範囲の近くにコピー・切取・反転・ぼかしの操作を一時表示する案 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C06-017](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C06.md#c06-017) | C/P2 | 貼り付け画像を半透明の仮表示で動かし位置確認後に確定する案 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#90](https://github.com/totoro0419/illustro/pull/90) |
| [C07-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-001) | A/P1 | 変形結果が制作キャンバス上でなく小さな別プレビューに表示される | **部分対応・コード残件あり** | 停止後に原寸の変形結果を差し替え、既存のタイル合成で上下関係・マスク・複雑合成を反映。操作中の軽量表示は近似のまま | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-002) | A/P1 | 変形前の元画像を編集する画面が小さな専用キャンバスに限定される | **部分対応・コード残件あり** | 縮小表示時の描画中仮線は原寸の確定結果と未一致 | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-003) | A/P1 | 複数のレイヤー・グループを一括して変形できない | **部分対応・コード残件あり** | 複数レイヤーの一括変形計画で大量の境界配列を引数展開せず計算し、巨大な座標の数値オーバーフロー・非有限の確定形状を拒否。コード [`16d0dd3b`](https://github.com/totoro0419/illustro/commit/16d0dd3b067904a05c2b47ab3d29323acd01a1e4)。非アフィン・特殊レイヤー・範囲付き一括変形は未対応 追加：繰り返し縮小で合成後の軸倍率が0.001未満になる不安定な変形を拒否 [`8a477f58`](https://github.com/totoro0419/illustro/commit/8a477f5803ad5da1cd0e040e432977117b93e86e)。非アフィン・特殊レイヤーは残る | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-004) | A/P1 | 変形後に描いた筆がセッション中の変形プレビューに反映されない | **部分対応・コード残件あり** | 停止後の全体合成は原寸の後描き筆跡を含む。操作中の縮小仮表示は近似のまま | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-005) | A/P1 | 一般的なファイル選択で外部参照を登録すると後から更新できない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-006) | A/P1 | リンク画像の再選択時に元の古い参照ハンドルが残る条件 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-007) | A/P2 | 変形の回転・拡縮をキャンバス上の直接ハンドルで操作できない | **部分対応・コード残件あり** | 直接操作中は軽量表示、停止後に原寸計算で重なりを反映。Androidでの追従性は未確認 | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-008) | A/P2 | 縦横比を固定したまま拡縮する操作がない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-009) | A/P2 | 元画像編集セッションのUndoが直近一筆に限定される | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-010) | A/P2 | メッシュ変形でマスク位置の対応付けが不正確になり得る | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-011) | B/P1 | プレビューごとにWorkerを生成し全画素を渡すため高解像度で遅延する懸念 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-012) | B/P2 | メッシュ格子分割の変更で固定した点の状態が失われる可能性 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-013) | B/P2 | 変形セッション内のUndo記録が増え続ける懸念 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-014) | B/P2 | 縮小用の画素平均が固定分割で画質が変わる可能性 | **部分対応・コード残件あり** | 非アフィンも固定点サンプルを撤去し、曲がりに応じた分割と画素面積の積分へ変更。強い曲がりで分割上限に達する場合の誤差・4K負荷は未確認 追加：回転・傾斜の面積平均で画素ごとの4配列生成を1回の範囲走査へ変更。コード [`3b0c1d1b`](https://github.com/totoro0419/illustro/commit/3b0c1d1b56973978be6479a2a372d7264b19f655)。 追加：透明な回転・傾斜の出力領域では4辺判定の割当を省略 [`8a477f58`](https://github.com/totoro0419/illustro/commit/8a477f5803ad5da1cd0e040e432977117b93e86e)。4K実測・強い曲がりは未検証 | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-015) | C/P2 | イラストの種類別に画素補間方法をおすすめする案 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C07-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C07.md#c07-016) | C/P2 | レイヤー一覧から変形・リンク・マスク状態を理解できる案 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#86](https://github.com/totoro0419/illustro/pull/86) |
| [C08-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-001) | A/P1 | 隙間補完が線端を確認せず近接する黒い画素を接続し細い通路もふさぐ | **部分対応・コード残件あり** | 毛先や交差等での隙間接続精度の追加改善余地。追加：毛先方向の一致基準を強化し、交差する自動橋と未記録の4097件目以降の橋を抑止。コード [`ac290d9e`](https://github.com/totoro0419/illustro/commit/ac290d9ecfb3cd5e961cc9342188844855c8f03f)。複雑線画の精度は未確認 | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-002) | A/P1 | 透明画素だけ塗る条件が塗り先ではなく参照画像の透明度を見る | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-003) | A/P1 | ドラッグ塗りで操作中に塗る領域が逐次仮表示されない | **部分対応・コード残件あり** | 通常色塗りは原寸の確定用判定をWorkerで共有。線画領域は確定用筆跡の2倍サンプル、最大4点の縮小被覆、細い領域の表示保証、移動中の終点差替えに対応。線画の原寸マスク完全一致・囲いの途中表示は未完成。追加：直近16点の途中座標修正を検出し、古い線分の領域カウントを差し戻して再計算。長い筆跡の全再走査は回避。コード [`0b9982f6`](https://github.com/totoro0419/illustro/commit/0b9982f684f88c03d52f10945fe4e22ea8c85800)。原寸一致・実機は未確認 追加：同じRegionGraphを再利用してラベル・外部領域配列が交換された場合も古い仮表示を無効化。コード [`c6cd161e`](https://github.com/totoro0419/illustro/commit/c6cd161ef6f4931b00abc143f101e5c2ea10945f)。 追加：直近64点の修正と同一グラフの壁・補完線・アンカー交換を検知し再計算 [`591560ba`](https://github.com/totoro0419/illustro/commit/591560bada7ba14b25cfbd53b7c1a01085f99569)。原寸一致・実機は残る | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-004) | A/P1 | 線画領域を最大420px程度に縮めるため細部の確認が難しい | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-005) | A/P1 | 明色の線画が暗さに基づく境界判定で認識されない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-006) | A/P2 | 色の違いと透明度の許容値が共通で独立調整できない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-007) | A/P2 | 塗りの境界マスクが二値的で滑らかな輪郭になりにくい | **部分対応・コード残件あり** | 複雑な輪郭・高解像度での境界の滑らかさと画素一致が未確認 | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-008) | A/P2 | 元の色と塗り替える色を別々に指定できない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-009) | A/P2 | 統合表示から特定レイヤーのみ除外して塗り参照に使えない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-010) | A/P2 | 保存した色指示線の位置や色を直接再編集する入口がない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-011) | B/P1 | 塗り候補の再計算ごとに新しいWorkerと画像の複製が必要になる懸念 | **部分対応・コード残件あり** | 通常色塗りの途中表示は参照画像をWorkerで再利用。隙間補完なしの壁複製を回避し、塗りマスクの画素だけで結果を比較。確実な無変更操作では4K結果画像の確保を省略。通常の巨大候補や他方式の複製削減は継続。追加：gap=1の不要な斜め全画面走査と候補上限後の追加走査を省略。コード [`ac290d9e`](https://github.com/totoro0419/illustro/commit/ac290d9ecfb3cd5e961cc9342188844855c8f03f)。4K実測・通常の大規模候補は継続。追加：領域トレースの円形サンプル座標を半径ごとに再利用。コード [`63cfef07`](https://github.com/totoro0419/illustro/commit/63cfef0776b4d52e01d614c7da6a4e134e870ab5)。4K実測は未実施 | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-012) | B/P1 | 塗り計算を途中で中断できず処理停止時の復帰が難しい懸念 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-013) | B/P2 | 複雑な線で閉領域の穴と外側の分類が正しいか未検証 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-014) | B/P2 | 隙間候補の点数付けが毛先や交差部を誤接続する可能性 | **部分対応・コード残件あり** | 候補を交差部から離れた、互いに向き合う毛先に限定。垂直の毛先・交差を誤接続する候補を除外。複雑な線画での正解率と実機操作は未検証。追加：交差・同一毛先の競合候補と修復済み橋への再接続を拒否。コード [`ac290d9e`](https://github.com/totoro0419/illustro/commit/ac290d9ecfb3cd5e961cc9342188844855c8f03f)。複雑線画・Androidは未確認 | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-015) | C/P2 | 線画の変更部分だけ再解析する構造改善案 | **部分対応・コード残件あり** | 空白線画の全領域探索を省略し、部分変更の番号付けを統合。実際に壁が変わらない操作はグラフを再利用。複雑な変更では全体再解析・番号付けが残る。追加：自動隙間補完の橋に隣接する局所編集は安全側で全体解析へ切替。コード [`4a4de800`](https://github.com/totoro0419/illustro/commit/4a4de80069263d9a0fe7c44682a2055c598d8ad0)。複雑な分割・統合の局所化は未完成 追加：局所消去の近隣線画で全画面hasInk走査を回避し、最後の線は正確な全体判定を維持 [`bc7cf1a1`](https://github.com/totoro0419/illustro/commit/bc7cf1a1ffd571de6a24a8707d47b66b8e363dc9) | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C08-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C08.md#c08-016) | C/P2 | 通常塗りと高度な線画管理を分けるUI設計案 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#81](https://github.com/totoro0419/illustro/pull/81) |
| [C09-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-001) | A/P1 | 二点・三点透視定規で描きたい消失点方向を自動選択できない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-002) | A/P1 | 透視定規の候補距離が0になりやすくほかの定規を押しのける | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-003) | A/P1 | 図形の位置指定にブラシ用の定規吸着が適用されない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-004) | A/P1 | 選択範囲内の図形プレビューに確定時のマスクが反映されない | **部分対応・コード残件あり** | 長方形と楕円の縮小マスクを面積評価。自由形状・画素マスクの縮小精度と実機一致は未確認 追加：129タイル超も実読取画素数1,048,576以内なら面積平均を維持。密集マスクの厳密縮小・実機は残る。コード c69a5055。 | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-005) | A/P1 | 図形やグラデーションの編集点を制作キャンバス上で直接操作できない | **部分対応・コード残件あり** | 編集点をドラッグ中、Workerの縮小画像を制作キャンバスへ重ねて更新。原寸画素一致・Worker非対応時の表示は未完成 追加：制御ハンドルの異常値を仮表示・確定で共通拒否。大規模パスのマスクをWorkerで処理。コード c69a5055。 | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-006) | A/P1 | ペン保持中に整えた図形が仮表示されず、離してから補正候補が出る | **部分対応・コード残件あり** | ペン保持中に直線・楕円の補正候補を制作キャンバスへ非破壊のSVG仮表示。筆圧・質感の一致とAndroid実機は未確認 | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-007) | A/P2 | 角丸長方形・多角形・RasterとVector出力先の選択などが不足 | **コード上の不足を修正済み** | 画像/編集可能図形の出力選択を共通保存処理に接続。12ケースで保存復元・Undo/Redo確認。実機独立確認待ち（冒頭記録） | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-008) | A/P2 | グラデーションの反転・繰り返し・楕円状放射が不足 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-009) | A/P2 | グラデーションの色停止点を色帯上でドラッグ調整できない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-010) | B/P1 | 対称描画のコピー線がペンを離してから生成され描画中に見えない懸念 | **部分対応・コード残件あり** | 対称コピー仮線は本線の筆圧・質感と一致しない | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-011) | B/P1 | 図形とグラデーション確定時に作品全サイズの画素を生成し負荷が高い懸念 | **部分対応・コード残件あり** | グラデーション定数計算・色停止点探索を改善。4K最終画像本体の計算量・メモリ削減は継続 | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-012) | B/P2 | グラデーション調整のたびに新Workerを生成し古い計算を取消できない懸念 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-013) | B/P2 | 形状追従グラデーションの縮小プレビューと確定後の外観が一致するか未検証 | **部分対応・コード残件あり** | グラデーションの原寸と縮小仮表示の画素一致が未確認 | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-014) | B/P2 | グラデーションマップの比較画像が最大320px程度で原寸の色の段差を確認できるか未検証 | **部分対応・コード残件あり** | 作品中央128×128画素の原寸比較を追加。任意位置の原寸比較と実機確認は未対応 | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-015) | C/P2 | 制作キャンバス上の定規・図形・グラデーション共通編集ハンドルの設計案 | **部分対応・コード残件あり** | 図形・グラデーションの点移動中に縮小した結果画像をキャンバスへ非同期表示。定規との完全共通化・原寸一致は未完成 追加：制御ハンドルの仮表示・確定一致、大規模パスのWorker内マスク。Worker障害・複雑レイヤーは残る。コード c69a5055。 | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C09-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C09.md#c09-016) | C/P2 | 通常ブラシ・図形・グラデーションの共通吸着基盤への再設計案 | **部分対応・コード残件あり** | ベジェ曲線の制御ハンドルも同じ定規に吸着するよう改善。図形全種類の吸着・解除操作の全経路は未確認 | [#89](https://github.com/totoro0419/illustro/pull/89) |
| [C10-001](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-001) | A/P1 | 自由ベクター線の一筆ごとに新規レイヤーを作り、同じ層に複数パスを保持できない | **部分対応・コード残件あり** | 自由ベクター描画から既存パスへの自動追記が未完成 | [#88](https://github.com/totoro0419/illustro/pull/88) |
| [C10-002](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-002) | A/P1 | ベジェ曲線の制御ハンドルをキャンバスでドラッグできず数値編集が中心 | **部分対応・コード残件あり** | キャンバス上の点・曲線ハンドル移動中に、確定時と同じ点移動計算を用いた曲線をWorkerで仮表示。最新入力だけを順次処理し、Escape時の古い仮表示を解除。コード [`db5b08bb`](https://github.com/totoro0419/illustro/commit/db5b08bb5df3c4d92024c1cc434420241858d91c)、[`51db81f7`](https://github.com/totoro0419/illustro/commit/51db81f730150ae945bf425d01e37d5c14d07543)。4K縮小仮表示の原寸画素・複雑合成の一致とAndroid操作は未確認 | [#88](https://github.com/totoro0419/illustro/pull/88) |
| [C10-003](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-003) | A/P1 | 文字の輪郭化後も元文字レイヤーが表示され重なって外観が変わる | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#84](https://github.com/totoro0419/illustro/pull/84) |
| [C10-004](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-004) | A/P1 | 文字枠の幅・高さと枠に応じた自動改行がない | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#84](https://github.com/totoro0419/illustro/pull/84) |
| [C10-005](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-005) | A/P1 | 図形演算を別レイヤーに追加しても元の図形が見えたままで結果を隠す | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#88](https://github.com/totoro0419/illustro/pull/88) |
| [C10-006](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-006) | A/P2 | 図形演算の結果が元の形と連動しないため後から非破壊で編集できない | **コード上の不足を修正済み** | 図形/ベクター保存・整列で元と結果を自動更新し同一Undoへ。4演算・連鎖・循環・削除・空の結果・保存復元を確認。実機独立確認待ち（冒頭記録） | [#88](https://github.com/totoro0419/illustro/pull/88) |
| [C10-007](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-007) | A/P2 | 離れた2本のベクター線も接続候補として直線でつなぎ誤結合する条件 | 修正記録あり・個別完了未認定 | 端点距離制限に加え、接続区間に古い曲線ハンドルを流用しないよう修正。同一点の接続では端点を統合し、元の曲線ハンドルを維持。コード [`99fb1bff`](https://github.com/totoro0419/illustro/commit/99fb1bff0850d0c59b8545356f0563ed8bb3c8d0)。実機・全経路は未確認 | [#88](https://github.com/totoro0419/illustro/pull/88) |
| [C10-008](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-008) | A/P2 | 線全体を触れるだけで消すベクター消しゴムがない | 修正記録あり・個別完了未認定 | 最後の1本を消す際に確認後、同じUndo可能な操作でレイヤーも削除。未保存の線は実在するレイヤーを消さず候補だけ破棄。ロック・最後の描画用レイヤーは既存の削除保護を保持。コードコミット [`1c51309f`](https://github.com/totoro0419/illustro/commit/1c51309fd6788451e9d012a0b745430a08d2aa85)。曲がりの強い4K線の区間タップ判定を精度可変の細分化に改善 [`99fb1bff`](https://github.com/totoro0419/illustro/commit/99fb1bff0850d0c59b8545356f0563ed8bb3c8d0)。統合CI成功、Android実機は未確認 | [#88](https://github.com/totoro0419/illustro/pull/88) |
| [C10-009](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-009) | A/P2 | 文字の一部分だけを選択して別の書式を設定できない | **部分対応・コード残件あり** | 複数色・複数の取り込み書体の輪郭化、部分色編集、保存・Undoを追加。端末専用書体・合成太字/斜体の輪郭化は未対応 | [#84](https://github.com/totoro0419/illustro/pull/84) |
| [C10-010](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-010) | A/P2 | 日本語の縦書きで句読点・小書き仮名の調整が簡略化されている | **コード上の不足を修正済み** | 読み込んだフォントの縦書き字形・位置情報を利用。既存処理への退避と縦中横を追加。Noto2書体×2書式で表示/輪郭のRGBA一致。実機独立確認待ち（冒頭記録） | [#84](https://github.com/totoro0419/illustro/pull/84) |
| [C10-011](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-011) | B/P1 | 文字の全画素生成を画面側で同期実行するため大作品で応答低下する懸念 | **部分対応・コード残件あり** | Worker非対応環境・一部条件で文字の同期待機が残る | [#84](https://github.com/totoro0419/illustro/pull/84) |
| [C10-012](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-012) | B/P1 | 通常表示と輪郭化で別々の文字配置計算を用い外観の一致が未検証 | 修正記録あり・個別完了未認定 | 部分書式の通常表示と輪郭化で同じ文字配置を利用し、色付き輪郭を同一レイヤーで保持。端末の字形表示との実機比較は未確認 | [#84](https://github.com/totoro0419/illustro/pull/84) |
| [C10-013](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-013) | B/P2 | ベクター曲線を図形演算時に有限個の折れ線へ分割することで曲線精度が落ちる懸念 | **部分対応・コード残件あり** | 曲線・楕円の点数上限で不正確な折れ線を黙って返さず停止するよう修正 [`39b90559`](https://github.com/totoro0419/illustro/commit/39b90559014488acdcc8cba639fc89a4bcd58a8e)。極端な曲線の編集継続、4K実測は未確認 | [#88](https://github.com/totoro0419/illustro/pull/88) |
| [C10-014](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-014) | B/P2 | 取り込めるフォントでも輪郭化に使えない形式がある可能性 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#84](https://github.com/totoro0419/illustro/pull/84) |
| [C10-015](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-015) | C/P2 | 線を直接選択し点・ハンドル・線幅を操作する共通UIの設計案 | **部分対応・コード残件あり** | 点と曲線ハンドルのドラッグ表示を共通化し、連続入力をまとめて古いWorker結果を捨てる。操作取消・同じ座標の重複再計算も抑制。コード [`db5b08bb`](https://github.com/totoro0419/illustro/commit/db5b08bb5df3c4d92024c1cc434420241858d91c)、[`51db81f7`](https://github.com/totoro0419/illustro/commit/51db81f730150ae945bf425d01e37d5c14d07543)。原寸画素一致・レイヤー特殊合成・Android実機は未確認 | [#88](https://github.com/totoro0419/illustro/pull/88) |
| [C10-016](https://github.com/totoro0419/illustro/blob/b463bb156bfb28cd49f41d403990966e5a7c304e/docs/quality-audit/C10.md#c10-016) | C/P2 | ベクター・文字の表示を編集した領域だけ再計算する設計案 | 修正記録あり・個別完了未認定 | コード修正・対応の記録はある。残存不具合や実機挙動は独立確認待ち | [#84](https://github.com/totoro0419/illustro/pull/84) |

## 判定・更新方法

- **修正記録あり:** 対応コード・改善がPR/Issueで報告されている。ただし完全なコード完成・機能全分岐の合格を意味しない。
- **部分対応:** 最新のIssue/PR記録が残る機能上の不足・速度課題・実画素不一致などを明記。単なるAndroid未実施だけでは「コード残件」にしない。
- **実装根拠未確認:** 最新の記録だけで実装完了とは認定できない。該当部分だけコードを照合し、必要なら実装する。
- **実機検査:** Androidのペン/指/IME、4000×4000での応答・メモリ、旧作品の保存/復元、Undo/Redo、プレビューと確定画素の一致は個別管理。未実施を勝手に合格としない。
- 修正が進んだら**この表の対象IDと集計を更新**する。同じ問題を再調査・再計画するのではなく、具体的な未完成経路に直接着手する。
- 本記録は管理用の追加ファイル。PR #73の調査原本129件と分類は変更しない。PR #75はDraftを維持し、`main`にマージしない。
