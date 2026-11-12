# Illustro M10 — ブラシ設定・編集機能の設計案（2026-10-22）

> **状態：設計案／製品コード未変更／ユーザー最終承認前。** 既存の CANONICAL 文書の置換・改訂ではない。今後の実装では正式な UI・Brush・Performance 正本が優先する。
> **開始地点：** `rebuild/M10-presentation-correctness-2026-10-21` の `74202fdd5c915c928b7f98deab033fed21397f37`。
> **作業ブランチ：** `design/M10-brush-settings-from-rebuild-2026-10-22`。旧 `milestone/M10-brush-quality` / PR #39 の `34a2472` から作り直さない。

## 1. 最重要原則と作業範囲

優先順位は **直感的操作 > 軽さ・追従 > 多機能**。M10は「ブラシ線の品質」と「ブラシを選び編集するための正式機能」を完成させる。M08のキャンバス表示画質、M09の色、M01〜M09、PR #37の確定前Undo、PR #38の作品管理・保存の合格成果は変更しない。

### キャンバス改善の固定保護事項

- `rebuild/M10-presentation-correctness-2026-10-21` の構造を開始点とし、旧Worker版や旧M10ブランチへ戻さない。旧ブランチとのGit比較は diverged（旧M10の後続コミットを雑に取り込まない）。
- 入力・座標変換・2本指移動/拡大/回転と、仮線の表示、正式画素の作成/保存を分離した役割を維持する。
- 正式描画完了やGPU待ちをキャンバス操作や次の一筆の受付条件にしない。仮線を含む作品全体が最新の同一座標変換に従う。
- 急縮小時の未描画領域・線の後出し、黒いタイル、古い画像による上書き、連続描画不能を再発させない。
- 128px TileHistory、確定前Undo、StrokeRecord、旧Stroke再生、`.illustro`保存形式、レイヤー内容、WebGL2/WebGPUの整合を保持する。
- 変更してよいのは必要性と検証根拠のあるM10ブラシ機能・設定接続のみ。Renderer/Worker/画面表示の再設計をブラシ設定のために始めない。

## 2. GitHub上で確認した現状（現時点のコード実装・ユーザー受入は区別）

| 項目 | 確認結果 | 根拠 |
|---|---|---|
| 正式採用ブラシ | Gペン、丸ペン、製図ペン、マーカー、鉛筆、Hard/Soft Eraser の7本 | `packages/brush-rt/src/foundation.mjs` の `referenceBrushes` |
| プリセット管理 | 検索・選択、ユーザー複製、保存、改名、削除、JSONパック読み書き | `apps/editor/src/main.ts`、`brushPresets.ts` |
| 現行UI | 右Brush欄に太さ・不透明度・フロー・間隔・筆圧平滑化・手ブレ補正・紙の質感・強制入り抜き・方位/ひねり設定 | `apps/editor/src/ui/shell.ts` |
| 基盤のみの設定 | 先端形状・硬さ・縦横比・角度・曲線・入り抜き形状・速度・各センサーの割当・散布・模様・予測など | `packages/brush-rt/src/foundation.mjs` |
| 現行保存境界 | 自作ブラシは端末の `localStorage`。作品のStrokeRecordと分離 | `apps/editor/src/brushPresets.ts` |
| 別の旧試作 | `packages/brush`の旧資料に56定義あり。製品標準ブラシ56本実装とは見なさない | `docs/brush/PRESETS.md` とBrush Foundation固定基準 |

**注意：** Foundationがパラメータを受け入れても、全組み合わせが動くわけではない。現在の通常描画は `kind=mono`、`renderer=auto/continuous/stamp/soft/sweep` 等に条件がある。特殊な組み合わせは検証時に明確に拒否される。後補正(`stabilization.post>0`)は通常のリアルタイム確定で拒否。Textureは現在の通常エンジンで強度が有効な層は1つまで。これらをUIで「実装済みの完成機能」として見せない。

## 3. 他のアプリの公式仕様からの採否

| 公式仕様 | 参考にする良い点 | Illustroでの判断 |
|---|---|---|
| Procreate Brush Studio | 左属性群・中央設定・試し描きパッド、筆圧/指の入り抜き区別、先端と地模様の分離 | 設定分類と試し描き方式を採用。ただしIllustroの右Brush欄を置換せず、二重の編集画面を作らない |
| CLIP STUDIO PAINT | サイズ・Ink・補正・先端・質感・速度/筆圧連動を分類、設定値ごとの動的変化ボタン | 単一の設定値と「入力に応じて変化」の割当を分ける |
| ibisPaint | リアルタイム補正と描画後補正、共通/ブラシ別切替、強制入り抜き始点/終点/曲線 | 共通/個別と始点/終点を採用。描画後補正は表示一致の証明まで実装保留 |
| Krita | 補正なしを含む方式選択、速度による補正差、細かい線の追従の説明 | 補正0を確保し、遅延との比較を行う。別補正器の無条件追加は禁止 |
| Photoshop | Shape/Color/Transferの動的変化と、未対応ペン機能の警告 | 対応センサー可否を利用者に明示。圧力がない指を実筆圧として扱わない |
| Affinity Photo 2 | 幅・Opacity・Flowの素早い調整と、カスタムブラシ管理 | 頻繁に使う値を右Brush上部に残す。設定の保存を容易にする |

公式資料（確認対象）：
- https://help.procreate.com/jp/procreate/handbook/5.4/brushes/brush-studio
- https://help.procreate.com/jp/procreate/handbook/5.4/brushes/brush-studio-settings
- https://help.clip-studio.com/en-us/manual_en/240_brushes/Customizing_brush_tools.htm
- https://ibispaint.com/lecture/index.jsp?no=50
- https://docs.krita.org/ja/reference_manual/tools/freehand_brush.html
- https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/fill-objects-selections-layers/brush-dynamics-settings.html
- https://affinity.help/photo2ipad/en-US.lproj/pages/Tools/tools_paintBrush.html

## 4. 最終UI構成：右Brush欄の「簡単操作＋詳細を開く」

**最優先：`docs/ui/RIGHT_UI_SPEC.md` の R3 Brush構成と `docs/ui/UI_INPUT_CONTROL_STANDARD.md` に従う。** 同じパラメータを持つ別個のBrush設定ウィンドウは作らない。現在のM07骨格、左Rail、右Workspace、右下固定5ボタンは保持する。

### 普段見える上部（折りたたまない部分）

1. 現在のブラシ名・小さな線の見本・自作/標準の区別。選択中のブラシを変えても編集中の作品画像は変更しない。
2. 名前検索＋カテゴリによる候補の絞り込み。文字入力中にブラシが勝手に選ばれない。検索一致0件・標準7本・自作ブラシを明確に表示する。
3. プリセット一覧（コンパクトなリストまたは見本付き選択）。一覧のスクロールは内部、外側のWorkspaceスクロールは詰まらない。
4. 太さ：非線形スライダー＋px数値欄。極細0.75〜2pxと数百pxを両方調整しやすくする。エンジン限界と選択ブラシ推奨範囲を混同しない。
5. 不透明度：%スライダー＋数値欄。手ブレ補正：0を含む%スライダー＋数値欄。頻繁に変える項目を最短操作に置く。
6. 調整済み・未保存の目印、保存/複製/元に戻す、ブラシの読み込み/書き出しへの操作を、邪魔にならないまとまりで用意する。

### 詳細設定：同じBrush欄内の開閉セクション

| 順 | 表示区分 | 内容 |
|---|---|---|
| 1 | 線の描き方 | Flow（塗りの強さ）、間隔、先端の硬さ、線の重なり方 |
| 2 | 筆圧・ペン入力 | 筆圧曲線、筆圧の滑らかさ、共通/ブラシ別曲線、傾き・方位・ひねりの確認 |
| 3 | 入り抜き | 強制入り抜きON/OFF、始点/終点、最低幅、曲線、通常taperとの区別 |
| 4 | 手ブレ補正 | リアルタイム補正、速度に対する補正変化、共通/ブラシ別、補正0 |
| 5 | ブラシ先端 | 丸・角・楕円などの形状、硬さ、縦横比、回転、進行方向への追従、先端画像 |
| 6 | 質感 | 紙/ストローク/先端の選択、模様、強さ、細かさ、向き、画像リソース |
| 7 | 動的変化 | 筆圧・速度・方向・傾きなどの入力が、太さ・不透明度・角度等へどう作用するか |
| 8 | 散布・ランダム | 粒の密度、広がり、配置、サイズや角度のばらつき |
| 9 | ブラシ情報 | 名前、分類、用途、ID、読み込み・互換性の状態 |

「湿った絵の具」「混色」等はM14/M43等で判断する。Right UI正本にWet Media項目の位置があることを、現時点で混色エンジンが実装済みである根拠にしない。M10で空の有効スイッチを出さず、非対応なら説明つきの無効項目に留める。

### PC・タブレット・スマホ

- PC/タブレット：右Brush Boxの中で直接開閉。サイズ・Opacity・補正が常に分かる。ブラシ選択中もキャンバス操作は独立して受理。
- スマホ：既存のBrush入口から同じ設定を読むDrawer/Page形式。パラメータはPCと同一の状態へ接続し、スマホ専用の別ブラシ管理形式を持たない。戻る/閉じるでキャンバスや線を変えない。
- 設定を編集中にキャンバスが見えなくなる場合は、既存の画面レイアウト方式に従い領域を使い分ける。未承認の新しい画面切替やDock機構をM10で追加しない（Workspace完成はM12）。

### 試し描きの見本

- 既存ブラシエンジンが出す実際の見た目で、S字・直線・弱/強筆圧・短い入り抜き・質感を確認できる小さな試し描き欄を、詳細セクションから開けるようにする。
- 試し描きは作品のレイヤー・Undo・保存へ一切反映しない。一覧の全ブラシに重いGPU描画を常時走らせず、必要なもののみ生成・再利用する。
- 同時に大量の見本を更新して、最新ペン入力やキャンバス移動を遅らせない。仮線・正式線一致の保証なしに独自の軽量近似だけで見本を描かない。

## 5. 機能の具体的な接続ルール（Foundation v2から新形式を作らない）

| 利用者の表示名 | 既存データ/処理 | 今回の扱い |
|---|---|---|
| 太さ・不透明度・塗りの強さ | `size`, `opacity`, `flow` | 接続済み。数値入力と表示を整理 |
| 描画間隔・筆圧平滑化・補正強さ | `spacing`, `pressure.smoothing`, `stabilization.constant` | 接続済み。詳細を段階開示 |
| 強制入り抜き | `forceFade.enabled/start/end/minimum/curve` | ON/OFFは接続済み、始点/終点/曲線編集を追加 |
| 通常の入り抜き | `taper` の size/opacity/flow/grain の start/end | 既存条件が満たされるパターンだけUIに出す。強制入り抜きと同義にしない |
| ペン筆圧曲線 | `pressure.curve` と `pressure.deviceCurve` または stroke contextの`deviceCurve` | ブラシ曲線と端末共通曲線を明確に分離し、二重補正を防ぐ |
| 高速時の補正 | `stabilization.fast`, `speedMode`, `scope` | 既存値を検証し、体感追従のテスト後に公開 |
| 先端 | `tip.shape/resource/aspect/hardness/angle/direction/azimuth/twist` | 対応する形状のみ編集可能にする。画像先端は現在のembedded mask形式を守る |
| 質感 | `texture.tip/paper/stroke` | 現行通常エンジンは強度>0の層を1つまで。複数合成のUIを先に公開しない |
| 変化の割当 | `dynamics[]`：pressure/velocity/tilt/azimuth/twist/direction/distance/time/random → size/opacity/flow/spacing/rotation/aspect/scatter/density/grain/hue/saturation/value | 既存の対応表だけ表示。「Stroke phase」「Wet」「混色」等の未実装入力は有効にしない |
| 散布・揺らぎ | `scatter`, `random` | 先端数・太さ・配置などの性能を条件比較して公開 |
| 線の合成 | `blend` normal/erase/multiply/screen、`paint` saturated/build-up | 色の混色ブラシと混同しない。組み合わせは実画素比較が通ったものだけ |
| 入力予測 | `prediction` | 既存機能を保持するが、有効化は実際の遅延・線の見え方の検証後 |
| 描画後の補正 | `stabilization.post` | 現行リアルタイム確定は拒否するためM10で無条件に公開しない |

## 6. 入力欄と編集のルール

1. **値の単位を表示する。** px、%、角度、距離の意味を統一。スライダーと数値欄は常に同期し、数値欄で正確に指定できる。内部正規化値0〜1を無説明で表示しない。
2. **曲線はドラッグ＋数値入力。** 制御点追加/削除、入力・出力の数値欄、元に戻す/初期化を提供。タッチでも細かな調整が可能な大きさにする。
3. **各項目の動的変化は一か所。** 例：「太さ」の横から「筆圧で太さを変える」を開く。別の画面に同じ太さの設定値を複製しない。割当の元入力が存在しなければ理由を表示。
4. **設定は次の一筆から有効。** 描画中の筆跡の設定・入力点は開始時点で固定し、設定ドラッグにより描画中の線が別物にならない。
5. **未保存の扱いは明示。** 標準ブラシは変更後に複製して保存。自作ブラシは編集前の保存状態と一時編集状態を区別し、切替時に黙って失わせない。キャンセルはプリセット編集だけを戻し、作品Undo/Redoには手を触れない。
6. **センサー不足を偽らない。** 指とマウスの筆圧は物理筆圧ではない。傾き・ひねりが取れない場合には無効/未利用を明示し、未取得を「正常な0」と断定しない。
7. **失敗を成功と表示しない。** localStorage容量不足、ファイル形式違い、資源欠落、未対応組合せ等では設定を保存せず原因を示す。ブラシパックのID重複は上書き前に識別・利用者確認とする。
8. **誤タップ回避とタッチ。** パネル内スクロールでスライダーが意図せず変化しない。キーボード/マウス/タッチに代替操作を用意する。

## 7. 保存・旧作品・パフォーマンスの境界

- プリセット形式は既存の Foundation v2 / `illustro-brush-pack` を再利用。IDは安定。既存の `BrushPresetLibrary` のユーザーブラシだけを継続保存する。
- 現行の作品データを自作ブラシ一覧に依存させない。すでに描いた線は、プリセットが後から変更・削除されても見た目やUndo/Redo/再生結果が変わらないこと。
- 画像先端/模様の外部ファイルは明示的な取り込みでブラシに埋め込む。描画時にネットから取得しない。バージョン・サイズ・不明リソースを検証する。
- 動的変化はブラシ開始時に確定した設定で評価し、GPU/CPU間、プレビュー/正式表示、保存再読込で同じ見た目にする。
- デフォルトで試し描きと全プリセット画像を毎フレーム作らない。使わなくなったプレビューを破棄し、作品表示Workerの仕事を圧迫しない。
- 描画終了後にも2本指操作・Undo・新しい一筆を待たせない。設定UIの変更でwindowにGPU描画や全Canvas readbackを戻さない。

## 8. 実装順序（M10を変えず内部の段階だけ分ける）

**設計ゲート D0：今回**
- 既存正本／現行パラメータ／UI動線／保存境界の確定。レビュー対象は本書とUI具体案。製品コードには変更を加えない。

**品質ゲート Q1：最初の製品コード変更**
- Gペン・鉛筆・丸ペン・消しゴムを、細線・太線、短線・長線、低速/高速、強制入り抜き、プレビュー/確定で比較。基準より悪化した場合は原因単位で修正。表示改善版を維持。

**UIゲート U1：日常設定と編集状態**
- 現在の右Brushを正本R3構成に整える。検索・リスト、太さ/Opacity/補正、簡潔なフロー、未保存状態、複製/保存/改名/削除。既存実装を流用する。

**UIゲート U2：曲線・先端・質感・動的変化**
- すでに実装済みのFoundationプロパティを詳細開閉へ接続。対応できない組み合わせは公開しない。軽い試し描きを統合。

**内容ゲート B1：ブラシの実用性**
- 既存7本の品質を先に確認。増やす場合は用途の違いと線の質が検証できるものだけ採用。旧56定義を一括取り込まない。

**受入ゲート A1：総合回帰**
- 4000×4000、Gペン/鉛筆128/256/512、細線0.75〜2、指と実ペン、長短と連続、2本指の瞬時操作、裏レイヤーの描画、WebGL2/WebGPU、確定前Undo、保存/再読込を確認。ソフトウェアGPU自動検査と実端末評価を分ける。

## 9. 合否基準

| 分類 | 合格とする条件 |
|---|---|
| 正しい開始地点 | 作業ブランチが改善版のHEADから派生し、旧M10/PR39を勝手に置換しない |
| 表示と操作 | 仮線中・正式描画中でも移動/拡大/回転でき、縮小時に画像欠落・黒タイルが出ない |
| 線の品質 | 滑らかさ、輪郭、筆圧、入り抜き、質感が従来以下にならない。仮線→正式線で不意な変化なし |
| 操作 | 太さ/不透明度/補正/検索まで少ない操作で到達。細かい設定を後ろへ隠すだけで利用不能にしない |
| 保存と互換 | 自作プリセット再読込とパック読み書き、古い作品画素/履歴/保存に回帰なし |
| 性能 | 4000px・太筆で描画、直後の新筆/Undo/2本指操作が新UIで悪化しない。CPU/GPU負荷も測定 |
| 判定 | 自動検査、公開QA、ユーザー実機確認を別々に扱い、未確認をPASSとしない |

## 10. 開始地点と作業分岐の不変条件

- **設計ブランチの起点 SHA：** `74202fdd5c915c928b7f98deab033fed21397f37`。
- **保護対象：** `rebuild/M10-presentation-correctness-2026-10-21`、PR #37/#38、従来 M01〜M09 QA、`milestone/M10-brush-quality` の旧比較版。
- ブラシ製品実装は **改善版を祖先に持つことが確認できるコミット** から開始する。作業開始時に改善ブランチが進んでいれば差分を確認し、最新改善版から分岐し直す。
- 本設計文書の保存だけで「アプリに反映」「ブラシ完成」「M10合格」と宣言しない。検査はまずdocsのみの変更確認、その後の実装でコード・CI・実機を別々に評価する。

## 11. 公式正本と実装ファイルの照合先

- `docs/IMPLEMENTATION_BASELINE.md` / `docs/CANONICAL_INDEX.md` / `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/ui/RIGHT_UI_SPEC.md` R3 / `docs/ui/LEFT_UI_SPEC.md` / `docs/ui/UI_INPUT_CONTROL_STANDARD.md` / `docs/ui/COMPACT_IMPLEMENTATION_BASELINE.md`
- `docs/brush-foundation/ADOPTION_BASELINE.md` / `docs/architecture/ARCHITECTURE_V2.md` / `docs/architecture/BRUSH_RENDER_CONTRACT_V2.md` / `docs/architecture/FEATURE_PERFORMANCE_RESOLUTION_2026-10-04.md`
- `docs/research/M10_PRESENTATION_REBUILD_2026-10-21.md` / `docs/research/M10_BRUSH_QUALITY_RESEARCH.md` / `docs/research/M10_PREVIEW_2026-10-19.md`
- `apps/editor/src/main.ts` / `apps/editor/src/ui/shell.ts` / `apps/editor/src/brushPresets.ts` / `apps/editor/src/brushSurface.ts` / `packages/brush-rt/src/foundation.mjs`

**未確認事項：** 実機の最終ブラシ体験、画面発光までの遅延、センサー実測、ブラシ先端/質感の全組合せの正確性、ユーザーによるこの設定UI案の受入。M10の正式完了は未判定。
