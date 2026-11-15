# Raster Lineart / Region 採用境界

Status: CANONICAL integration boundary。PR #7 `dcd09c8bbb5929a0b13a24a58f0b8bc63d109298` の `experiments/raster-region-lab-v01` をACCEPTED PROTOTYPEとして保存する。製品統合済み・全精度合格とは呼ばない。

Raster線画 → 線形状解析 → 太さなし境界 → 接続関係 → 領域/穴/外側/隣接 → 人間の接続・分離訂正 → Fill/Selectionで利用、という目的を固定する。通常Raster Layerを複製する感覚で境界構造を作るが、元Rasterの画素と境界構造を混ぜない。

`REGION_RESOLVER_V2.md`のsnapshot/generation/query、曖昧状態、ユーザー訂正優先、固定Fillとlive linked coloringの分離を再利用する。旧ADR-0005、PR #5のstroke connectivity、旧vector-first試作は正本にしない。

本番adapterは `sourceRevisionId / sourceLayerIds / algorithmVersion / userOverrides` を受け、`boundaryGraph / faces / holes / outside / adjacency / candidates / state / generationId` を返す。試作内のindexは永続RegionIdに直接使わない。接続候補の受理/拒否、境界追加/削除と領域のmerge/splitを一操作一Historyへ変換する。

通常のBrushがRegion解析を待つことは禁止。解析は明示利用時に起動し、変更範囲と接続成分で更新する。古い世代の結果を新しいRevisionへ採用しない。線画を変えても通常Fillの確定範囲を後から変えない。

人間による毛先・顎の補完と延長表示の肯定評価はユーザー申告として記録する。Labの境界訂正・保存形式は製品のものではない。製品に移す前に実線画で閉じ過ぎ・意図的隙間・交差/穴を確認し、手動修正・取消・保存復元まで接続する。全体設計の終了を妨げず、この機能の出荷判定として扱う。
