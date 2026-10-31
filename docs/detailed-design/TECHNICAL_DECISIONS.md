# 技術方式の比較・採否・残余リスク台帳

区分：**Contract**＝製品の意味契約、**Candidate**＝技術方式の候補、**Blocked**＝正確性や性能が不足/未検証。第②段階の42方式比較とPR #6 CPU Labを保持し、未測定の端末性能を推論で保証しない。

| 争点 | 第一候補 | 比較した代替・欠点 | 判定 |
|---|---|---|---|
| 入力とView | 即時受付+独立View+後追い正式計算 | 正式終了まで操作待ち：理念違反 | Contract。GPU実機下の最大遅延はBlocked |
| formal順序 | 受理orderと筆FIFO、依存Job DAG | 完了順commit：過去結果による上書き | Contract |
| Preview handoff | coverage排他所有のatomic published snapshot | previewとformalを別フレーム更新：欠落/二重 | Contract。正式エンジンの検証Blocked |
| GPU workload | 小分けdispatch、View予算留保 | GPU仕事をいつでも割込：保証なし | Candidate。実機Job durationとtail latency待ち |
| Brush | 入力版固定、dirty/halo、品質参照画像 | 全再描画：多層負荷、単純近似：品質不足 | Candidate。tile size未決 |
| Fill/Selection | 領域連結と影響の伝播を正確に追跡 | 固定半径halo：離れた連結へ波及しない | Contract for correctness, Candidate for scheduler |
| Cache | input revision/Mask/Group/ICC/qualityをkey化 | stale outputの再利用：不正画素 | Contract for invalidation |
| Undo | 不変正本rootと論理branch、用途pin | 全履歴再演：長作品で操作遅延 | Candidate for storage; semantics Contract |
| Large documents | 正本・入力・保存予算の事前予約 | キャッシュと正本を同列LRU：内容喪失 | Candidate。peak RAMは未計測 |
| Post-transform edits | 座標固定の作用ログ | overlayのみ：erase不可、毎回Bake：非破壊を失う | Candidate / AUD-006 未閉鎖 |
| ICC/Precision | 明示色契約+参照CPU演算 | 默って8U化：情報喪失 | Contract。16U/16F GPU数値実証Blocked |
| Save/Recovery | SaveFenceと検証可能な世代manifest | 上書き1世代：途中終了で喪失 | Candidate、Quota/電断未検証 |
| Device loss | device世代切替、CPU/正本から再評価 | 古いTextureを採用：不正表示 | Candidate、実機未検証 |

## 採用前に分離して測るもの

正確性：全画素+alphaの差分、順序・取消・分岐・Native往復の不変性。形式変換で不可逆ならユーザーへの説明と原本保持を確認。性能は入力→表示（p50/p95/p99/最大）、frame gap、GPU submit/wait、peak RAM、battery/thermalを各端末×作品サイズ×多層数で測定。人工待機時間は実GPU負荷の代替ではない。GPU最適化で参照結果と異なるなら性能が良くても不採用。

比較対象として実装候補の成立条件を記録するが、採用率や競合優越は未測定。WebGPU Promiseは一般順序保証がないため、独自logical orderで検証する。一次情報： https://www.w3.org/TR/webgpu/ 、https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost 、https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system 。
