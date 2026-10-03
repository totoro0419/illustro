# Illustro 新リアルタイムブラシエンジン v2.4候補

[描いて試すページ](https://illustro-realtime-brush-test.ibukioike2009.chatgpt.site)を用意しました。ブラシ56本、4／16／128／512／1024px、透明度、手ブレ補正、予測の切替ができます。ペン・マウス・タッチに対応します。ページは所有者限定です。

**本番への採用判定は未完了です。** WebGL2では累積遅延のソフトウェア検証が通りましたが、WebGPUには失敗例が残っています。実GPU・実ペンでの描き味と画面上の遅延は、ここから確認する必要があります。単体テストやGPU処理完了だけで「遅延を解消した」とは判断していません。

- [Research](RESEARCH.md)：一次資料で確認できた事実、設計判断、非公開のため分からないこと。
- [Architecture](ARCHITECTURE.md)：複数方式の比較と、入力・即時表示・正式描画・保存の分離。
- [Implementation](../../packages/brush-rt/src)：WebGPU／WebGL2、連続形状／複雑Stamp、Worker、canonical記録。
- [Failure Analysis](FAILURE_ANALYSIS.md)：旧方式の問題と、新方式で実際に失敗した試行。
- [Benchmark](BENCHMARK.md)：太さ・入力頻度・180秒の結果。表示遅延の代用値と実画面の測定を区別。
- [Validation](VALIDATION.md)：確認済みのことと、本番採用までに残る条件。
- [競合との違い](COMPETITOR_COMPARISON.md)：ibisPaint／CLIP STUDIOの公開挙動から参考にした点。速さの優位性は主張しない。

単独で開けるHTML：`prototypes/brush-rt/dist/illustro-brush-rt.html`。最新版はビルド後に生成し、検証したソースと対応を記録します。GitHubからダウンロードして開くこともできます。

基本操作：まず16pxと512pxで4秒ほど続けて描きます。「ペン先から線が離れるか」「描き続けると遅れが増えるか」「急な折り返しで変な線が残るか」「ペンを離すと線が跳ねるか」を確認してください。結果のJSONと、端末・ペン・ブラウザ・設定を合わせて残せます。

リアルタイム経路ではCPU画素走査、Float64画像コピー、Canvas2DのputImageDataを使いません。CPU referenceとCanvas2D転送は画像比較・PNG書き出しだけに使います。保存・Undoには実入力、Preset、seed、センサー、補正設定を記録し、予測点を含めません。

`npm run build --workspace=@illustro/brush-rt`でパッケージとHTMLを生成します。`@illustro/brush-rt`はGpuRenderer、RealtimeSession、TileDocument、参照描画、型定義を公開します。Illustro本体の複数レイヤー・保存・履歴への接続と、メモリ管理・GPU喪失からの自動復帰は未実装です。

候補ブランチへのGitHub Pages配置は既存の保護規則で禁止されていたため、保護を変更していません。描ける検証ページを別途用意し、エンジンのソース・調査・検証資料はこのリポジトリに保存します。
