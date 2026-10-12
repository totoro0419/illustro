# 公式資料と今回の採用判断

2026-10-05に本文/検索結果を再確認。公開UIや設定の事実とIllustroの設計判断を分ける。以下から内部GPU schedulerや保存実装を推測しない。既存調査資料も維持する。

| アプリ | 公式に確認したこと | Illustroへ採用する判断 |
|---|---|---|
| ibisPaint | Layer WindowはLayer追加・選択・並べ替え・Folder・プロパティをまとめ、PC/Tabletには浮動表示/resizeがある | 既決Layer Pageを維持し、Layers Boxと同じモデルを使う |
| CLIP STUDIO PAINT | LiquifyはCanvasを直接なぞり、Raster/Selection/Maskに作用し、モード・強さ等を設定する | Toolから直接操作、対象と取消を明示。Folder一括適用の内部方式はIllustroの設計判断でありCSP内部方式の断定ではない |
| Procreate | Painting Tools、Sidebar、Editing Toolsの役割を分け、Sidebarから太さ等を操作する | 頻出Toolと詳細Workspaceを分離。既決IllustroのLeft/Right/下の取消配置を変更しない |
| Krita | RAM/Undo swap/処理数等に設定があり、プレビューと処理のコストを調整する | 派生cache上限、古い履歴の退避、機能ごとの必要時起動を採用。現在Brushをベンチ数字だけで再設計しない |
| Adobe Photoshop | WorkspaceにToolbar、Panel、Contextual Task Barがあり、Panelの移動/ドック/展開等を提供する | Workspace幅・Boxの折畳み/並べ替え/再ドックと操作時の小さな設定領域を維持 |
| Affinity系 | 公式Live Perspective説明は破壊/非破壊適用を区別し、Live Filter Layerから設定可能 | Effects/Transformの非破壊状態と明示Bakeを区別。内部cache処理は未公開扱い |

公式参照:

- https://ibispaint.com/lecture/index.jsp?lang=en&no=156
- https://help.clip-studio.com/en-us/manual_en/360_transform/Liquify_tool.htm
- https://help.procreate.com/procreate/handbook/interface-gestures/interface
- https://docs.krita.org/en/reference_manual/preferences/performance_settings.html
- https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/workspace-overview.html
- https://www.affinity.studio/help/filters-filter-perspective/

旧Affinity Photo2 helpの試したURLは本文取得失敗。上の現行公式ページ/検索に切り替えた。大手との総合品質優位は未確認であり、調査や仕様採用を優位性の証明としない。
