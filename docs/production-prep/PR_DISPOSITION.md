# PR / Branch の扱い

2026-10-05にGitHub APIとgit refsで独立確認。main `bdc7135b51033982d90ea5dad104bb04fc107df2` を新branchの唯一の親とした。既存PR/branchは削除・close・mergeしない。

| PR | 現在のbaseと依存 | 本番で残す成果 | 除外・扱い |
|---|---|---|---|
| #6 UI Gate E | design/completion-audit-2026-09-28 → UI branch | Left/Right/Layer Page/入力/カスタム/承認済みPC・Tablet構成 | DO-NOT-MERGE。旧Lineartを持つbaseと過去の全体停止を取り込まない。Compact候補は新骨格で補完 |
| #7 Raster Lab | main、独立 | Raster解析Lab全体を同じbytesで保存 | ACCEPTED PROTOTYPE / REFERENCE-ONLY。製品に直結する永続Region ID・History/Saveではない |
| #8 Brush production | main | #10に必要な共有brush入力/dynamics等、Coreのstroke記録小変更 | SUPERSEDED。旧Renderer/bench結果はEXPERIMENTAL。単独で本番採用しない |
| #9 realtime | #8上 | #10に継承された低遅延方式・Worker | SUPERSEDED。#10より古い候補を再採用しない |
| #10 Foundation | #9上、#8にも依存 | 最新Foundationのsource/tests/HTML、7基準Brush、強制入り抜き | ACCEPTED PROTOTYPE / frozen。本体Layer/History/Saveの完成ではない |
| #11 Feature 1–12 | #6上、旧completion branchへ間接依存 | 1–12統合・Delivery Gate・Performance・現在有効なV2契約 | DO-NOT-MERGE。選別済みファイルのみ移植、旧ADR-0005不在 |
| #5 connectivity | validation/gate-bc-final上 | 現在の目的の代わりにしない。元branchで履歴保存 | OBSOLETE / REFERENCE-ONLY。Raster線画の境界構造と混同しない |

統合はmerge/cherry-pickではなく、各確定headからのファイル単位移植。copy後にFoundation/Core/旧Brushの型・既存検査を行い、必要だったCore3ファイルの依存を補った。元branchの歴史・削除済みLineart進捗・旧成功判定は正本へ入れない。

`source-lock.json`は再利用runtime artifactsのSHA-256を保存し、source commitからのbyte一致を検証済み。`CANONICAL_INDEX.json`は全資料/コード/試作を一つの分類へ割り当てる。新統合branchのmain baseと旧設計branchが祖先でないことも検査する。
