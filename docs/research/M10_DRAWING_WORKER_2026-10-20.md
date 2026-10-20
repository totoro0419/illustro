# M10: 仮線を保ったまま自由に操作する描画境界

状態: 描画workerと私有合成の実装・検査記録。最終の検査結果と配信SHAは公開QAの集計とPR #39を参照。ユーザーが報告した実機不具合は、ユーザー確認まで未解決扱い。PR #39はDraft、M11へ進まない。

## 出発点と確認した原因

PR #39、`milestone/M10-brush-quality` の `8fa3857b5ce8deb4dadacce45f06e121a16e8d85` をGitHubとクリーンなcloneで確認。baseはPR #38 `e510ea18b447a5e6d74721bd23b07acab15c391d`、祖先関係も確認。mainへ変更・mergeしない。

IMPLEMENTATION_BASELINE、CANONICAL_INDEXの両形式、CHECKLIST、Brush Foundation採用基準、Architecture V2/Brush–Raster契約、Performance正本、M08表示境界、M10の既存調査を入口にした。古いM09やPR #38から再開していない。

旧版は移動のCSS変換を同期で行う一方、その同じwindow上で `GpuRenderer.frame()` → `backend.render()` → `renderSparseGl/Gpu()` と正式タイルのGPU命令を組み立てていた。128pxタイルの数、コマンド、合成、資源確保が増えれば、入力イベント自体を処理できない時間が生まれる。CSSを設定できた時刻だけではこの停止を検査できなかった。

今回の探索測定では、Chromium 141.0.7390.37 / SwiftShader、390×844 CSS / DPR2、4000px、512pxブラシ、100入力の長線で、旧WebGL2直接表示のCPU命令作成はGペン最大197.9ms、鉛筆82.1ms。正式完了までの窓にlong taskも記録した。CPU仮線の同じ探索条件では最大23.3 / 30.9msだった。ユーザー端末の原因を断定する値ではない。最終の対比較はCIの同一ジョブ内のbefore/afterで取り直す。

## 三つの責任

| 責任 | 所有者 | 仕事・禁止する依存 |
|---|---|---|
| 入力と画面操作 | windowのBrushSurface / DrawingHost | 受領時点の作品座標、移動・拡大・回転・反転。最新viewはここだけが所有。描画workerやGPUの返答を待たず、保持済みの全画像へ同じviewを適用する |
| 仮線の画素 | drawing workerの既存StrokeOverlay + WorkerStrokeSink | 既存の同じcoverage・模様・入り抜きで私有Canvas2D画像を作る。DOMやwindowのview状態を所有しない。画像が未更新でも表示済み部分はwindowだけで動かせる |
| 正式描画と派生履歴 | drawing workerの既存GpuRenderer / RealtimeSession / TileHistory | 同じmodel・shader・128px区画・before/after履歴。Coreの正式Transactionは従来どおりwindow側で公開し、成功後に正式描画を許可する。保存の正本はCoreと筆跡記録のまま |

入力はwindowで共通viewを使って作品座標へ変換してから送る。遅れて処理されても、その時点のviewで入力を再解釈しない。workerの時計はwindowのtimeOriginへ合わせ、予測・待ち時間にworker起動時刻のずれを混ぜない。実入力はまとめて転送しても一件も省略しない。独立canonical worker、Foundationの記録形式とseedは維持する。

DrawingHostはGPUを所有しない。windowのCanvasは `bitmaprenderer` で受け取ったImageBitmapを表示するだけ。基準となるviewを画像ごとに添え、遅れて届いた画像もwindowの**現在の**viewへ変換する。非同期の完了が最新viewを書き戻す経路はない。

## 画像の受け渡しと削除

正式なGPU画像のsnapshotと、それで置き換えられるCPU画像の削除を一つのpacketとして送る。windowは同じJavaScript taskでbaseの交換、仮線の交換・削除、最新viewへの変換を行う。この原子的な表示交換により、worker経路は旧CPU→GPU用のcrop guard、GPU readback、guardの変換・解除待ちを使わない。

GPU完了だけでなく、そのGPU画像のimmutable snapshotも完成してから正式表示を公開する。WebGPUのcanvas textureがtask末尾で失効する前にsnapshot要求を出す。正式終了の通知はwindowがpacketを適用した応答まで待つが、画面操作はこの応答に依存しない。未完成の画像を正式な画像として保存しない。

転送は未受領packetを一個に制限し、windowが忙しければworker側で最新baseと変更済み仮線を保持する。これは転送資源の所有・上限であり、入力受付やviewを待たせるフラグではない。古い私有baseはcloseする。stroke IDとvisibility epochで、Undo前の遅いpacketが取り消した表示を復活させない。CPU仮線はwindowでもIDごとに即時非表示にできる。

削除した主な仕事:

- 編集画面のwindowでのBrush再構成、CPU仮線評価、GPU命令作成、正式タイルreadback/upload。
- 編集画面のwindowからGPUの内部資源を直接触る復元経路。疎な画像復元と読出しはworkerの明示portへ統一。
- pen-up後120msの正式描画抑制、view変更後80msのquiet-gap待ち。
- workerの表示切替でのguard取得・重複保護画像・guard解除待ち。
- メインフレームごとの未応答tick蓄積。ひとつの未応答tickに集約し、実入力は別に全件保持。

固定prototypeとExportで使われる直接Rendererのguardは、別々のCanvasを直接表示する経路の安全性にまだ必要なので残す。worker経路はこれを呼ばない。正式shader、Brush model、模様、筆圧、taper式、保存形式、TileHistoryは変更しない。

## 入力の仕様

- 指描きの途中に2本目の指を置いた場合、すでに入力した線を終了・保持し、その完了を待たず操作へ移る。
- 同じtimestampで到着した最初の2接点はジェスチャーとして扱い、移動入力のない最初の一時点だけを取り消す。実際に描いた途中の線を取り消さない。
- ペン描画中に指を置く場合も、それまでのペン線を保持して操作へ移る。操作中の後続ペンmoveを別の場所の線として混ぜない。
- pointercancelは従来どおり未完成の入力だけを取り消す。

## 検査と限界

`m10-worker-review.mjs` は8fa3857と同一ブラウザー・入力条件で太いGペン/鉛筆、128/256/512px、6間隔、CPU/GPU/自動、両GPUを比較する。実CDP touchで線を引き、2本指の移動・ピンチ・回転を行う。座標設定の時刻だけでは合格にせず、ブラウザーが合成したPNG内で元の線の画素が新しい位置にあることを検査し、screencast連続フレームも採取する。

正式完了通知を保留する12条件でも、保留解除前の画像追従を検査する。これはGPUが物理的に何ms占有されたかを示すものではない。正式描画・画像転送・compositorは同じ物理GPUを共有し得る。workerへ移しただけでGPUが独立したとは主張しない。送信は既存の面積/区画単位で限定し、未送信仕事を無制限にGPUへ積まない。

正式画質は13筆（太いGペン/鉛筆6条件＋7本のFoundation）、3レイヤー、同一raw/seed/record、Undo/Redo、再構成について同一backendでRGBA完全一致を要求する。保存は別に実アプリの`.illustro`ダウンロード・再読込で全レイヤーhashを比較する。

`m10-worker-history.mjs` はrecord保留、複数record保留、正式通知保留、描画途中の指/ペン→ジェスチャーを実タッチで検査する。同期のUndo受付とwindow上のCPU画像取り消し、後の正式復元を区別する。旧検査の内部GPU objectへの注入はworkerの明示診断portへ置き換え、同じ受付・画素・保存の条件は維持する。

調査中の検査誤りも記録する。幾何画像の比較でforce fadeをOFFにした後にプリセットを切り替えたため、ONへ戻った入り抜きの完成変化を画像追従の欠落と誤判定した。プリセット選択の後にOFFにし直し、画質検査は別にONを含める。許容差を広げて通していない。M08で検出した、古いheld renderのdiagnosticsが新しいview snapshotまで抑制する不具合は、現在の表示要求自身の可否で判定するよう修正した。

M05のoffline検査は、ChromiumのService Workerからのfresh fetchがPlaywrightのcontext offline設定を経由せず404応答を返し、ネットワーク断のnegative controlにならない実行があった。ローカルHTTP server自身も接続を拒否する状態にし、cache済みのアプリ・全workerで描画・復旧・保存できることと、未cache probeのfetchが失敗することを別々に要求する。製品のService Workerは変更していない。

実機の指/実ペン、入力から発光までの時間、実GPU占有、VRAM、発熱/電力、全てのdevice loss後復旧は未確認。CI成功で実機不具合を解決済みにしない。**👤 USER REVIEW REQUIRED**。

## 公式資料と採用範囲

- WHATWG HTML: [OffscreenCanvas / bitmaprenderer](https://html.spec.whatwg.org/multipage/canvas.html)、[ImageBitmap](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html)。画像所有の移譲を使う。APIのtransferを物理zero-copyの保証と扱わない。
- [Krita Instant Preview](https://docs.krita.org/en/reference_manual/instant_preview.html): 仮表示と正式計算を分ける公開挙動を参照。非公開GPU実装の推測はしない。
- 既存[M10主要アプリ比較](M10_BRUSH_QUALITY_RESEARCH.md)のブラシ・指/ペン・taperの採用基準を維持する。

UI検証はui-implementation-qualityのPERF.01（入力から可視変化）、PERF.03（遅い側と連続操作）、PERF.06（直接操作の連続性）、作品保持・Undo・Saveの安全性を適用。ユーザーの物理端末は未検証と記録する。

## 追加比較で見つかったGPU共有の問題と再修正

初回のworker版 `85b29c09` の探索対比較では、WebGPUの直接表示でメインlong taskが無くても、入力配送やrAFが100〜300ms以上遅れる条件を確認した。worker化だけを合格としない根拠として残す。CPUへ画面全体を読出す実験はさらに遅くなり、不採用としてコードから除去した。

追加変更は以下の三点。正式な品質・128px区画・コマンド順序は同じ。

1. **GPUへ渡す所有単位を一つの区画の仕事にする。** worker経路は正式描画を一度に一つの128pxタイルjob（最大16コマンド）、GPU仮線も一度に一つのタイルの仕事として提出する。一度提出した重いGPU命令はwindowから中断できないので、巨大な一括仕事を作らない。区画jobは最後まで正確に計算し、実入力も正式な画素も間引かない。既存の一送信完了確認で次の仕事へ進む。
2. **操作の途中の座標をGPU表示の依頼列にしない。** windowで全画像を直ちに変換し、操作が終了した時点の最新view一件だけをworkerへ渡す。正式計算は操作中も続ける。主画面のviewは常に最新であり、座標の受付を後回しにしない。操作中の不要なGPU再表示・画像転送を削減する。
3. **WebGPUの表示画像は所有を移譲する。** `transferToImageBitmap()`で描画済みOffscreenCanvasの画像を切り離し、workerが次に描くbackingとwindowの表示画像を分ける。WebGPUは既存viewport cacheから次の実表示を再構成できる。GLは既存の保持backingを必要とするのでsnapshotを維持する。不要なCPU画面readbackを導入しない。物理zero-copyや別GPUの保証とは区別する。

同じソフトウェアGPUの探索対比較（4000px、鉛筆512px、80入力、GPU直接）では、旧8fa3857→区画単位版で入力配送p95 55.0→33.1ms、rAF間隔p95 48.9→18.2ms、最大間隔145.6→20.6msを観測した。標本は一条件・一筆で、最終の多数条件比較や実機保証の代わりにはしない。最終CIの測定には悪化した指標も含めて掲載する。

## 公開検査と残存遅延・測定手順の補正

製品コード `96965de56ab82f30dfc91042fc34897562c09217` の[CI 39404202492](https://github.com/totoro0419/illustro/actions/runs/39404202492)は全3検証jobとQA公開jobが成功。Core31、Brush237、editor112・TypeScript、M08/M09/M05/My Worksの回帰、太い線432条件、正式通知保留12条件、4倍CPU負荷の短線/連続16条件、正式13筆/3レイヤーの両backend比較、実Undo/Redo/保存18条件が通った。正式StrokeRecordと全12レイヤー画像は同一backendの8fa3857と完全一致した。

独立に公開アプリの全12ファイル（2,235,053 bytes）をCIの検証済みartifactと照合し、全byte一致を確認。公開QAは37項目でソースと一致、gh-pagesの前回公開からM01〜M09への差分は空。[Pages配信](https://github.com/totoro0419/illustro/actions/runs/39414001930)も成功した。

**自動検査が成功しても、残存遅延はある。** 同一CI内で各backend/版108条件を集計すると以下。p95の中央値は「各条件のp95の中央値」であり、全入力をpoolしたp95ではない。

| backend | 入力p95の中央値 前→後 | rAF p95の中央値 前→後 | 入力最大 前→後 | main long task最大 前→後 |
|---|---:|---:|---:|---:|
| WebGL2 | 33.3→24.9ms | 18.8→17.9ms | 41.0→35.6ms | 159ms→未観測 |
| WebGPU | 53.0→26.5ms | 34.6→18.7ms | 251.4→218.5ms | 両版未観測 |

WebGPUのCPU表示/Gペン256px/500ms指定に218.5msが残り、CPU表示/Gペン128px/500ms指定の入力p95は60.4→166.9msへ悪化。GPU直接/鉛筆512px/250ms指定のrAF p95も20.3→33.5msへ悪化した。GPUの実行時間は未計測であり、この遅延の原因をGPU占有だと断定しない。完了処理を含む正式描画の速さと入力・表示の速さは別に報告する。

上記432条件では筆離し後に比較PNGを採ったため、指定0msであっても撮影往復が実際の操作開始前に入っていた。このデータだけで「筆離し0ms」の条件を満たしたとはしない。検査を次のように変更した。

- 最後の指/ペンをまだ置いている時に元画像を採り、screencastを開始する。
- その後の筆離し→次のネイティブ2本指入力には指定間隔以外の画像採取・evaluate・準備完了待ちを挟まない。
- 実イベントの筆離し→操作開始timestampの差と、windowでの受領差を両方記録する。0ms指定でもCDP/ブラウザー配送による実間隔は0msとは限らない。
- 操作の受領後の異なる連続合成画像を要求し、最終の移動後PNGだけで連続性を代用しない。

補正後の全条件・正式完了時間・悪化条件・画像はQAの[小さな集計ページ](https://totoro0419.github.io/illustro/qa/m10/evidence/worker/summary.html)に自動生成する。生JSONは数値を省略せず、空白だけ除去して重複した大容量pretty printを減らす。集計には遅延の合格宣言を入れず、機能的検査と物理端末の未合格を区別する。

**👤 USER REVIEW REQUIRED**。この残存遅延と物理端末未検証を理由に、実機不具合の全面解決とは記載しない。

## 私有の合成画像と公開画像の境界

補正後の追加再現でもWebGPUのGペン256px/自動/500ms指定に204.1msの入力遅延を観測した。正式jobを1タイルにしても、旧CPU仮線用の`overlayHoldIds/overlayDirty`が最後に134タイルの合成をまとめていた。正式jobの数だけを制限しても、このGPU仕事は残る。ユーザー端末での主因の断定とは区別する。

workerが画面に直接出ない私有画像を所有することを利用し、CPU仮線の正式タイルを私有画像・縮小画像へ順次合成する。未完成の私有画像はwindowのbaseを置き換えない。途中のviewport全体コピーとImageBitmap生成も省き、完成した画像でのみ交換する。直接Rendererの旧holdは引き続き必要だが、worker経路では追加・一括解除しない。

GPU仮線と最終合成も、既存の区画キューとdirty集合を使い、1回に1タイルを処理する。GLとWebGPUで、確定済みprefixのpass順序と置換可能なtailを同じキューで扱う。正式なtile/shader/筆跡は変更しない。GPUの経路選択用の観測も、未処理の仮線タイルが残る途中を完成したフィードバックの測定として扱わない。

最後の正式tile commitの後にも、そのタイルを表示用の私有画像へ合成する仕事がある。既存の`strokeFrames`を画像公開の境界に使い、前の一筆の完成画像が用意される前に次の正式strokeで私有画像を上書きしない。正式完了とwindowへの表示反映を待つportもこの境界を含める。**この所有境界は正式画像の順序のためのもので、windowの入力・座標変換・CPU仮線画像の公開は待たない。** 新しい操作解除タイマーは作らない。

操作中のGPU仮線には途中の新しい筆跡を表示できる。一方、正式画像・レイヤー変更や、CPU仮線を退かす完成画像は、必要な合成がすべて終わるまで私有側で保持する。完成画像のsnapshotが先にできても、GPU完了・仮線の退去と一緒に公開するまではbaseとして使わない。このため追加のguard画像やGPU readbackは要らない。

探索試作では、上記再現用8条件の修正後入力最大は24.7〜39.7msとなった。単発の探索値であり、最終検証版の合否やユーザー端末の解決を意味しない。600回の2本指更新を同じ操作として約20秒続け、正式完了・仮線退去の瞬間もまたぐ検査を追加した。短い観測窓の外へ完成処理を移しただけでは合格にしない。途中試作で長い操作中のmain long task 51msも観測しており、最終CIでも長い窓と外れ値を隠さず記録する。

画像公開直前の候補を診断portで保留し、その間のUndo/Redoと`.illustro`保存・再読込も両GPUで検査する。古い候補画像にもvisibility epochを持たせ、取り消し前に作られた候補を新しいepochのpacketへ混ぜない。実Undo/保存の検査は4000pxの12条件と512/2000pxの各4条件、計20条件へ拡張する。

段階合成を導入した直後の追加監査で、履歴の一括batchが渡した全タイルを一送信で処理できると仮定していた不整合を確認。3タイルを1タイルずつ合成する回帰テストで、未処理2タイルが残るのに公開へ進むことを再現した。workerの履歴も同じ所有単位で全タイルを処理し、残るCPU画像の退去と完成通知を同じ`onContentReady`境界に揃えた。既存の直接Rendererのbatchは維持。追加テストを含めBrushは238件となる。画像公開・保存・Undoの正しさの修正であり、windowの操作を待たせるタイマーや解除フラグは加えない。
