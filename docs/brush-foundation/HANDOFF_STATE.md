# 現在の状態 — 2026-10-03（UTC）

最終目標は `COMPLETION_CONTRACT.md`。実機で合格した軽さ・追従を保ち、今後のほぼすべてのブラシの共通基盤を完成させる。CI/7本/HTMLだけを目的にしない。

- 作業ブランチ `brush/foundation-2026-10-03`、Draft PR10。main/元の合格版は変更していない。
- 現行実装 `6bfc95f5e8451074234b3b8a79a423833b825153`。検査したローカル02a5957とGit tree `207aab925161989d016f113b1398d32f4733a28c` が完全一致。
- 正本HTML `prototypes/brush-rt/dist/illustro-brush-rt.html`、526,008bytes、blob `036b69675d9016eafb04bac3573731d9069267fb`。
- 今回は設定拒否後に不正値が残る不具合、packの重複ID/資源種別検査、ページの読み込み前の利用可否確認・名前表示・不正な太さからの復帰を修正。描画/補正/予測/合成/通知方式は変更していない。
- Gペン4pxの最初の点が見えない設定上の欠陥を独立検査で発見。初期設定を実筆圧による入りへ変更し、人工的な入りは選択可として保持。元の4px/筆圧.7/整数位置の点はalpha0→255。離した後の命令は不変。保存済みの設定と記録の意味は変更していない。
- 最新Node78/78合格。両GPUでFoundation34画像/挙動比較+4性能条件合格。点の可視性をCPU/GPU一致とは独立に検査する。実ペン/画面の自然さは未確認。
- 直前25ac91eの全検査37128925258はSUCCESS。両GPU228画像/挙動比較・38性能条件・18反復条件すべて合格。raw ZIP4つのSHA-256とゲート計算/入力保持/同時投入1を独立照合済み。計算の時間窓は記録されたサンプル数を使用し、その境界時刻は独立に記録されていない。
- 同じ25ac91eで共通合成16条件×両GPU、ブラシ読み込みの失敗/成功、保存/履歴、幅320/800/1200も合格。最新変更はGペンの設定と可視点検査のみ。
- 最新実装の全検査37131153403は再実行中。反復検査はWebGPU18/18合格、WebGL2 17/18合格で最初の鉛筆512/240が32.33ms増加FAIL。後の2回はPASS。raw ZIP2つのdigest/ゲート/入力保持は照合済み。ローカルで直前版と最新を交互3回ずつ比較すると両版3/3PASS。原因/再現性は未解決であり、直前全PASSを最新全PASSとして転記しない。全検査の結果を取得してVALIDATIONとページを更新する。
- 拡張検査は時間間隔+重ね塗り、画像先端+模様+散布、別提供者をmainと実workerに登録して同じ記録を生成するところまで実行。水彩/色付き画像/複数質感層/カーソル表示/静止時間の自動入力などは未実装。追加する契約と効果完成を区別する。
- 前の6f72a2c全検査37121144408も両GPU226比較・38性能条件・18反復条件すべて合格。以前のFAILは消さず保存している。
- ページ更新は成功。Sites source `eff03687805171e3ee1e4e9221211b11be7b3f35`、deployment `appgdep_6ac117b778b881919d1de5bd3f803fcf`。この後の新しいFAIL/全検査結果を表示と同期する。
- 正式な試し描きページは https://illustro-realtime-brush-test.ibukioike2009.chatgpt.site 。既存project `appgprj_6ac0517d1104819194de23404ff9b3a0`、所有者限定を維持する。ページのsource-evidence.jsonで実装/正本blob/検査を確認できる。
- 現checkout `/workspace/scratch/1cb77f0be138/illustro`、Sites `/workspace/scratch/1cb77f0be138/brush-rt-site`。継続環境に同じパスがあるとは仮定せずGitHubを正本にする。
- 実機受入は `HUMAN_CHECKS.md`。自然な入り抜き、見えない切替、旧合格版の軽さ維持が確認されるまで全体完成・本番採用・mergeを宣言しない。

以下は以前の状態であり、上の現行状態を上書きしない。

# 以前の続行状態（履歴）

作業を再開し、WebGPUの共通MAX合成・通知を必要最小限修正した。7ブラシは共通Foundationの設定として維持し、ブラシID専用の分岐を追加していない。WebGL2の入力更新間隔は合格済み方式を維持する。保存・読み込み/Undo/Redo後の画面が空になる既存不具合を両方式で再現し、確定タイルの合成を修正した。

- Repository/branch/PR: https://github.com/totoro0419/illustro / `brush/foundation-2026-10-03` / https://github.com/totoro0419/illustro/pull/10 (Draftのまま、mergeしない)。
- 現行ソース: `7ecdf9b4283e0d8f2b850845a7f6675f11e818f4`。
- 正本HTML: `prototypes/brush-rt/dist/illustro-brush-rt.html`、523,272 bytes、Git blob `925804bf751b4a6b9066cb5c89f59849dc89091e`。
- Node: 72/72 PASS。最終ソースのCI37119396194は実行中。
- ローカル最終版: WebGPU反復15/15 PASS。WebGL2鉛筆の旧版との交互比較は現行3/3 PASS、旧版2/3で1FAIL。復元後の画像は両方式PASS。
- 前のソース65e1937のfull: 両方式222比較PASS。WebGL2性能38/38 PASS、WebGPU37/38で旧fine-ink1024/240/reversal FAIL (56.30ms)。詳細はVALIDATIONとevidence。
- 元のhard erase41.30ms、pencil21.17ms、続行中の新たなFAILをすべて残した。+20ms基準/入力保持/必要サンプル数を変更していない。
- 実ペン・実画面はUNVERIFIED。全体完成・本番採用を宣言しない。
- 同じ所有者限定ページ https://illustro-realtime-brush-test.ibukioike2009.chatgpt.site の更新を準備済み。最終CI結果を受けてsource-evidence.json/表示文とGitHub文書を同期し、既存Sites projectへ反映する。新規ページは作らない。

続きの担当はCI37119396194の最新状態とraw artifactを回収し、PASS/FAIL/未完了を別々に記録する。旧細線の折返しは元版と現行版の交互GPU比較で原因を切り分ける。現行コードの軽さを壊す広い変更を行わない。機械検査が通っても実ペン確認はHUMAN_CHECKSを使う。

現在のcheckout: `/workspace/scratch/d6b9dda68ba2/illustro`、Sites checkout: `/workspace/scratch/d6b9dda68ba2/brush-rt-site`。Node24、Playwright1.62.1。ローカルはChromium153/SwiftShader、CIは別のChromium151/SwiftShader環境であり実GPUではない。`baseline-shaders.mjs` のGit blob `e40effdb2802d9a3df70f928351fb389ed9d25f5` と、Sitesのbaseline.html全文SHA-256 `4886168f381fb832b3c38900e8b8ce2350bfeb52a679b648e01e4999b5bf679e` を維持した。

以下は以前の状態を比較・追跡するための履歴であり、現行ソース/検査中状態を上書きしない。

# 以前の引き継ぎ記録 — 2026-10-03（JST）

ユーザーは別チャットへの引き継ぎを希望した。追加の性能修正・再検査を始めず、現在の実装・成功・失敗を保存した。元の目標は51項目のBrush Foundation要求を満たすこと。詳細は `REQUIREMENT_COVERAGE.md` を読む。

## 正式な保存先

- GitHub: https://github.com/totoro0419/illustro
- 作業ブランチ: `brush/foundation-2026-10-03`
- Draft PR: https://github.com/totoro0419/illustro/pull/10
- PRのベース: `brush/realtime-redesign-2026-10-03`。マージしていない。
- 実際に検査した描画ソース: `1f7cc3e1cd6558fdcfba75e8374702ae266d01a8`
- 自己完結HTML: `prototypes/brush-rt/dist/illustro-brush-rt.html`、521,668 bytes、Git blob `bab16d11586e5d163a3f774935f0250d7b112589`。ローカルと両GPUのCIビルドが一致。
- 所有者限定の試し描きページ: https://illustro-realtime-brush-test.ibukioike2009.chatgpt.site 。公開範囲を変更しない。

## 成果物の仕様

| 成果物 | 仕様・場所 |
|---|---|
| 共通ブラシ基盤 | `packages/brush-rt/src`。実入力・保存する正規データ・補正後の形・表示専用予測を分離。最新表示通知は容量1、同時GPU投入1、正規の線はすべて保持。 |
| 7基準ブラシ | Gペン、丸ペン、ミリペン、マーカー、鉛筆、硬い消しゴム、柔らかい消しゴム。`referenceBrushes` と `reference-brushes.json`。既存56設定も保存。 |
| 共通設定 | 筆圧の端末曲線→ブラシ曲線→独立平滑化、速度・方向・距離・時間・任意ペンセンサー、曲線/範囲/加算/乗算/置換、補正、予測、入り抜き、Tip、回転、間隔、濃さ/Flow/Blend、散布、再現可能な乱数、画像資源、一時設定、既知の形の入力。 |
| 描画 | 連続インク、順序付きスタンプ、単色・丸形・飽和塗りの連続coverage union `sweep`。新鉛筆/柔らかい消しゴムは最新接触点に連続して届く。マーカーの一筆濃さは一度だけ掛ける。 |
| 保存形式 | preset: `illustro-brush-preset` version 2、engine `illustro-foundation-1`。pack: `illustro-brush-pack` version 1。stroke record: version 3。document: `illustro-rt-document-2`。旧version 2の2.4/2.5記録とversion 1設定を維持。 |
| 互換性 | 旧 `soft` の順序付きスタンプ意味を維持し、新連続描画は `sweep` IDで区別。b18e2b0で実際に生成した7ブラシのversion 3 fixtureを正確に再生成。 |
| 試し描きUI | `prototypes/brush-rt`。平易な日本語、7+56ブラシ、太さ・濃さ・Flow・筆圧・入り/抜き・補正・予測、保存/読込み/Undo/Redo、4秒/3分の生成試験、確認結果の保存。 |
| 文書 | `docs/brush-foundation` のRESEARCH、ARCHITECTURE、SPEC、REQUIREMENT_COVERAGE、VALIDATION、FAILURE_ANALYSIS、HUMAN_CHECKS。公式調査・仕様・51要求・人間の手順・失敗を記録。 |
| 検査 | `packages/brush-rt/test`、`prototypes/brush-rt/browser-check.mjs`、`foundation-check.mjs`、`foundation-quick-check.mjs`、`.github/workflows/brush-rt-candidate.yml`。 |

画像/手続き模様のtip/paper/strokeスロットは分かれているが、builtinで同時に評価するのは1層。水彩・顔料・混色・特殊シミュレーションは未実装。RendererRegistry、backend契約、拡張設定・資源参照を用意したことを効果実装済みと扱わない。

## 固定して守る条件

ユーザーが以前確認した軽さ・追従を守る。CPU全画素走査、全画面複製/転送、表示FIFO、粗い/低解像度の一時表示、後から質感を出す方式へ戻さない。表示通知を置き換えても、正規入力・線の形・保存する描画命令を削除しない。離した後に線を伸ばす/細くする処理を加えない。予測を保存しない。

accepted baseline source: `f20a028aa8c70643910ea27e7ffd97f7153536db`。accepted shader blob: `e40effdb2802d9a3df70f928351fb389ed9d25f5`。accepted HTML blob: `e4352a885c39e480f8972daaa1e8dda13c34e48e`。試し描きページのbaseline.htmlは埋め込みエンジンのimport mapがaccepted HTMLと同じ（imports JSON SHA-1 `0a3fa1f240e10eb692ed4e461ea69a872089f58b`）。ページ装飾を含むHTML全体の同一性を意味しない。

## 最新の実行結果

[Run 37107164670](https://github.com/totoro0419/illustro/actions/runs/37107164670)。head sourceは上記1f7cc3e。headless Chromium/SwiftShaderの検査であり、実GPUや画面への表示遅延の証明ではない。

| 検査 | 結果 |
|---|---|
| Node | ローカルと両CIで65合格（旧42+Foundation23）、失敗0。 |
| WebGL2 full | 220画像/挙動比較、38性能条件すべて合格。 |
| WebGPU full attempt 2 | 220画像/挙動比較合格、性能37/38合格、全体GATE_FAIL。 |
| WebGPU fullの未達 | `foundation-hard-eraser` 512px/240Hz/fast-curve。p95前半140.37/中間105.07/後半146.37ms、全体増加6.00ms、中間→後半41.30msが+20ms基準超過。 |
| 短時間targeted | WebGL2 4/4合格、WebGPU 3/4合格。`foundation-pencil` 512px/240Hzは142.33→163.50ms、増加21.17msで+20ms基準超過。 |
| 3分間 | 両GPUのmarker/旧fine-ink 1024px/240Hzが合格。各43,200/43,200入力を保持。 |
| 不一致/エラー | 完了した両full検査のpixel/transition/input-generator/consoleエラー0。AAの比較には3/255許容があり、全画素が完全同一という意味ではない。 |
| 実ペン/実画面 | 筆圧、自然な入り抜き、見えない切替、実GPU、high-DPI/画面遅延、任意センサー、device loss、VRAM圧迫は未確認。 |

WebGPU attempt 1は旧582a830の遅れたpushイベントで中断された。207比較/17Foundation性能条件まで合格したcheckpointを保存し、同じソースのWebGPU jobのみ再実行した。再実行後の失敗も残す。しきい値を緩めていない。

## 証拠と次の作業

raw artifacts: WebGL2 full `11268353070`、WebGPU full attempt 2 `11268459992`、WebGPU中断 `11268184803`、quick GL `11268576054`、quick GPU `11268700806`。詳細summaryは `docs/brush-foundation/evidence`。以前の失敗も削除していない。

次の担当は最初にGitHubの最新head・上記CI結果・文書を読む。その後、WebGPU hard eraserの中間→後半増加とtargeted pencilの再現性を調べる。単発の再実行合格だけで過去の未達を消さない。入力数、正規データ、描画中/離した後/正式描画/CPU参照の一致、前半/中間/後半proxyを一緒に確かめる。基準はtotal/steady双方の増加+20ms以下、必要な完了サンプル数を維持する。実ペン確認はHUMAN_CHECKSを使う。全体完成・本番採用・PR mergeを宣言しない。

## 再現と環境

Node 24を推奨。`node prototypes/brush-rt/build.mjs`、`node --test packages/brush-rt/test/*.test.mjs`。GPU: Playwright 1.62.1とChromiumを準備し、`RT_LONG_TEST=1 RT_BACKEND=webgl2 node prototypes/brush-rt/browser-check.mjs`、webgpuも同じ手順。必要なら `RT_PLAYWRIGHT_PATH` を指定する。

このチャットの元作業場所は `/workspace/scratch/2f1e68aeec3e/illustro`（部分的に取得した作業用コピー、git checkoutではない）。別チャットで同じパスがあるとは考えず、GitHubの固定commitまたは引き継ぎZIPから復元する。shellのUTCとユーザーのJSTを区別する。途中でshellが停止したが現在は復旧。手元のPlaywrightにはChromium実体がなく、CIでGPU検査した。

Sites project ID: `appgprj_6ac0517d1104819194de23404ff9b3a0`。既存projectを再利用し、新規siteを作らず、所有者限定を維持する。元checkoutは `/workspace/scratch/2f1e68aeec3e/brush-rt-site`、`.openai/hosting.json` のstatic directoryはdist。操作時にSitesの現行skillを読む。認証トークンは資料に含めていない。
