# 今回の一次資料と比較の限界

確認日：2026-10-27 JST。URLと確認箇所を以下に固定する。PR #1の59出典を再確認済みとして流用しない。今回の要約は該当節だけの読解で、全製品/全OSの実機比較ではない。本文の手順が分かっても内部実装/応答性/省電力は分からない。公開ソースの観察も当該commitの当該関数に限る。製品名のない「一般技術」とIllustroへの「適用仮説」を区別する。

| ID | 種別・確認箇所 | 確認できたこと | Illustroへの判断・未確認 |
|---|---|---|---|
| S01 | [W3C Pointer Events Level 4](https://www.w3.org/TR/2026/WD-pointerevents4-20261008/) §Coalesced and predicted events / pointercancel / touch-action。2026-10-08 Working Draft | coalesced実測履歴と予測のAPI、UAの直接操作宣言と取消を区別する仕様 | 取得履歴と予測表示を同じ確定入力にしない。OS/ブラウザ/ペンが全APIを提供する保証ではない。Level 4は勧告ではなく草案。旧実機の原因特定資料ではない |
| S02 | [ibisPaint Stabilizer](https://ibispaint.com/lecture/index.jsp?lang=en&no=50) §Stabilizer/Fade、本文 | Real Time/After、全筆/筆別、Force Fadeの始終長と形を区別 | 形を変える時点と遅延を分けて測る。内部のGPU/Worker/Tile構造は未確認 |
| S03 | [Krita Instant Preview](https://docs.krita.org/en/reference_manual/instant_preview.html) Manual 5.3.0、本文 | 縮小feedbackと背景の本描画、100%等で効果がない条件、一部筆設定の制約と完了時の見た目変化を説明 | 全機能への同方式適用は根拠がない。筆ごとの品質検証が必要。今回のKrita速度は未測定 |
| S04 | [Krita Colorize Mask](https://docs.krita.org/en/reference_manual/tools/colorize_mask.html) §Usage/Tool Options、本文 | 指示/出力の分離、Update、範囲制限、大きい画像や過大なGap hintへの注意 | 人の区分意図を扱う参考。Illustroの専用境界データや永続的面IDの採用実例としない |
| S05 | [CSP Advanced Fill](https://help.clip-studio.com/en-us/manual_en/420_fill/Advanced_Fill.htm) §Tolerance/Area scaling/Close gap/Refer multiple/Vector path、本文 | 色許容・被覆拡張・隙間・参照元を別制御。DEBUT非対応の注記 | 同じ基準を共有する可能性。領域アルゴリズムや実行速度は未確認 |
| S06 | [Procreate Transform](https://help.procreate.com/procreate/handbook/transform/transform-interface-gestures) §Reset/Gestures/Commit、本文 | モード内Undoと、終了後のSimplified Undos設定。枠内Pinchは内容、枠外はCanvasという操作 | 履歴単位の参考。Illustroの常時指ナビ要求とは違うため操作をそのまま採用しない |
| S07 | [MyPaint v2.0.0](https://www.mypaint.app/en/blog/2020/02/16/mypaint-v2.0.0-released/) §Linear compositing / compatibility、本文 | 2020年の版で線形合成・顔料混合の互換/結合外観/性能上の注意を説明 | 数値契約と見た目の結合条件を独立に扱う理由。現在版も同じ性能問題と断定しない |
| S08 | [SQLite Isolation](https://www.sqlite.org/isolation.html) §Isolation and Concurrency、本文 | WALのsnapshot isolationで読者が同じ過去状態を見続けられる | 固定保存時点の一般技術例。SQLite採用を決定しない。作品分岐はSQLiteが自動提供する意味ではない |
| S09 | [SQLite Atomic Commit](https://www.sqlite.org/atomiccommit.html) §Hardware Assumptions/Commit/Testing/Things That Can Go Wrong | 全てか無変更かのcommit、flush/lock等の成立条件、故障注入の必要性 | 保存成功をAPI受付と同一視しない。ブラウザ保存/持出ファイルに同保証があるとは言えない |
| S10 | [Photoshop Smart Filters](https://helpx.adobe.com/photoshop/desktop/effects-filters/smart-filters/apply-and-manage-smart-filters.html) §Smart Filters / How they function、本文 | Smart Object上の編集可能な効果と適用順序、Lens Blur等の非対応 | 非破壊能力を一括保証しない。内部schedule/ROIは未確認 |
| S11 | [CGAL 6.2.1 Arrangements](https://doc.cgal.org/latest/Arrangement_on_surface_2/index.html) §Introduction / Separation of Topology and Geometry / removal、該当節 | 辺/頂点/面の構造と幾何を分離する一般手法、辺の削除等 | 境界の位相管理候補。Rasterから作者意図を抽出する手法ではなく、導入/速度/ライセンス適合は未検証 |
| S12 | [W3C Compositing and Blending Level 1](https://www.w3.org/TR/2024/CRD-compositing-1-20240321/) §5.1 / blending / groups、該当節 | source-over/α/下地/Groupの数式を定義 | 数値oracleの参考。HDR/全色空間/顔料を同仕様が網羅するわけではない。CR Draft |
| S13 | [Kono et al., GapFill, 2026](https://arxiv.org/html/2609.00800v1) §Abstract/4.1/5.1.1/Conclusion、HTML該当節 | 小さな未彩色面の検出/拡大/色選択を支援する研究。14参加から技術問題で1名除外し13名を分析したと報告 | 候補精度だけでなく修正/確認作業も測る根拠。アニメのflat-colorタスクから一般の一枚絵や指操作へ効果を外挿しない。モデルは再現していない |
| S14 | [Ragan-Kelley et al., SIGGRAPH 2012](https://people.csail.mit.edu/jrk/halide12/) §Abstract、著者の論文ページ | feed-forward画像演算とschedule（分割/融合/再計算/保持）を分離する研究 | 同じ意味で複数実行案を比較する原理。Halideを採用しない。湿式循環や文書トランザクションを同論文で解決済みとしない。論文PDFの全節再現は未実施 |
| S15 | [libmypaint固定commit](https://github.com/mypaint/libmypaint/blob/d5a88fbe6649d5ec776bc42ec8c1f4bb29d7fd7f/mypaint-tiled-surface.c) L60〜220、公開コード | end_atomicでdirty tilesを取得しprocess_tile。tile要求がthreadsafe等の条件でOpenMP並列化。ROI矩形を返す | 確認できた実装実例。全筆の完全独立性/入力応答の保証ではない。コード転用なし、ライセンス審査/ビルド/実測は未実施 |
| S16 | [CSP Quick Access](https://help.clip-studio.com/en-us/manual_en/690_interface/Quick_Access_Palette.htm) §Search/Add、本文 | Command/Tool/Color/Auto Action登録、検索結果からSetへ追加。DEBUT非対応 | 機能発見と固定入口をつなぐ既存実例。初見理解と反復時間はIllustroで未測定 |
| S17 | [Rebelle 8 Working with Water](https://www.escapemotions.com/products/rebelle/manual/latest/starting-painting/water/) §水の制御、本文 | 湿潤表示、乾燥/水除去、拡散停止等を別操作として説明 | 媒体の進行を作者が扱う実例。内部solver/保存再開の全状態は未確認。latestは変動し得る |
| S18 | [Adobe PSD/PSB仕様](https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/) November 2019 §Preface/Audience/Scope | 公開形式資料があるがデータ解釈の説明ではなく、PSDCも対象外と記載 | 完全互換の根拠にはしない。個別能力ごとの往復fixtureが必要 |
| S19 | [W3C Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced) §SC/Exceptions、本文 | AAAの44 CSS pxと等価入口等の例外 | 論理pxをハードの画素と混同しない。主要Touch標的の参考。規格全体への準拠達成は未確認 |
| S20 | [WebGPU 2026-01-09 CRD](https://www.w3.org/TR/2026/CRD-webgpu-20260109/) §Timelines/Promise ordering、公式検索掲載のみ | submit/Device/Queue timelineやpromise順序の限定が掲載 | 全文openはサイズ上限で取得不能。GPUの実行中断やUI優先を保証する根拠に使わない |

| S21 | [Affinity Photo 2 Live Filters](https://affinity.help/photo2/en-US.lproj/pages/Layers/livefilters.html) §Create/Modify/Move/Mask、本文 | 再編集/移動/Mask、選択から初期Maskを作る操作 | Photo 2の確認に限る。現行Affinity全般の同一性/内部実装/速度は未確認 |

## 比較から変えた研究判断

- ibis/CSP/Procreate/Krita/Photoshop/Affinity/MyPaintを7製品の比較対象にする。Affinityは[Photo 2 Live Filters](https://affinity.help/photo2/en-US.lproj/pages/Layers/livefilters.html)本文を別途確認：再編集/移動/Mask、選択からの初期Mask。これは**Photo 2**の記述で、現行Affinity全般の挙動と同一とは未確認。R05の比較基準に追加する。
- S03の制約から、縮小した途中像を全筆/全操作の統一解にはしない。S07/S12から、数値契約を閉じずに結合/融合を共通化しない。S09から、保存の原子性は実行環境を選ばず自動成立するとは扱わない。
- S11は幾何学的に正しい面構造の道具であり、線の意味理解や修正意図の解決ではない。S13は探索・拡大・色選択という操作全体を評価する研究例で、AI精度だけの採否を避ける。
- 新方式の「独立考案」は、この課題からAIが提案したという意味。既存研究との完全な先行性調査は未了で、世界初・特許新規性は主張しない。

## 取得範囲と不採用資料

CSPの推定Fill URLは取得不能だったため、実在するAdvanced Fill本文へ切替えた。WebGPU全文は取得上限で未読。検索で出た利用者掲示板や転載は方式/製品能力の根拠から除外した。PR #1の競合速度主張は今回の実測結果として扱わない。
