# Compact / Smartphone 実装骨格

Status: CANONICAL — 2026-10-05。`COMPACT_UI_SPEC.md`の最新Side Main Toolbar + Bottom Control Bar + 上に引き上げるWorkspace Drawerを採用する。初期案の横型Main ToolbarはOBSOLETE。以下は実装開始用判断であり、ユーザーによる最終見た目の承認は未確認。

| 要素 | 固定する挙動 |
|---|---|
| メインTool | 左の縦Rail。Brush、Eraser、All Features、Properties、Color、Layers、Workspace。小画面ではRail内を縦スクロール、All Featuresは固定 |
| 下バー | Undo / Redoを常に表示。Size、Opacity、現在Colorへのアクセス。幅不足はSize等をDrawerへ送り、Undo/Redoは隠さない |
| Workspace | 下の見えるハンドル/ボタンで開く。上向きドラッグは補助。Closed / Standard / Expandedの3段階。内容上のドラッグでは高さを変えない |
| Brush / Color / Properties | Railまたは下バーから一度で対応Pageを開く。Brushの選択と詳細設定は同じ状態を読む |
| Layer Page | Layersボタンで同じLayer modelを持つPageを開く。選択/追加へ直接到達。別のLayer状態を作らない |
| Page移動 | 12Boxの意味と順を維持。開いたDrawerでPage選択、左右swipe、一覧ジャンプを提供。Slider等が横入力を所有する場合はswipeしない |
| Portrait | DrawerはCanvas領域上へ重なり、下バーとRailを避ける。Standardは残り高さの約55%、Expandedは全残り高さ。内容は内部スクロール |
| Landscape | 同じ操作順。Standard約65%の残り高さ。低い画面でもバーの下へ内容を押し込まない。無理な圧縮はしない |
| Safe area | `env(safe-area-inset-*)`と動的viewportを使用。キーボード表示中は入力欄を見える位置へ移す。px値は後で調整してよい |
| Pen / Touch | 入力方式を画面幅から推測しない。ペン描画中の指は描画に混ぜない。指描画ON/OFFは明示。指ジェスチャーのPan/Zoomは別操作。OSの手のひら除外は実機検査 |
| 閉じる/戻る | ハンドルのボタン、Escape、BackでDrawerを閉じる。呼出元へfocusを戻す。未確定の作品操作を勝手にcommitしない |
| カスタム | Drawer順とPC Box順は別のWorkspace設定。並べ替えに上下移動ボタンを用意。PiPは明示ボタンから1個まで、初期対応はLayers/Color/Brush/Properties/Reference/Navigator |

PC / Tabletは先行実装する。最終アイコン、テーマ微調整、アニメーション、PiPの最終サイズはCore Drawing Sliceの開始を止めない。
