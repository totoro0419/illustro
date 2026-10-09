# Illustro 製品仕様書

> 状態: 正式な上位製品仕様（Canonical Product Specification）  
> 対象: 製品定義、絶対優先順位、設計思想、必須能力、品質基準  
> 原則: 下位の機能仕様・UI仕様・アーキテクチャ仕様・実装判断は、本書に反しないこと。\n> 再設計時の判断原則は [Illustro Redesign Principles](REDESIGN_PRINCIPLES.md) を併用する。

## 0. Illustro の基本定義

Illustro は、

> **「一枚絵を完成させる」という用途において、既存のどのペイントアプリよりも優れた制作体験を目指す、高機能・高応答・直感操作重視のペイントアプリ**

である。

汎用DTP、動画編集、3D制作、漫画制作などへ無制限に用途を広げるのではなく、**イラスト・一枚絵制作を中心として機能体系を最適化する。**

既存アプリの優れた機能・UI・アルゴリズムは積極的に研究・参考にする。「既存アプリと違うこと」自体を目的にはしない。

独自性は主に次によって生み出す。

- 既存機能の再設計
- 複数機能の統合
- 操作ステップの削減
- 一枚絵制作への最適化
- 既存方式では解決できていない問題への新機能

## 1. 開発上の絶対優先順位

優先順位は以下で固定する。

1. 直感的操作
2. 使いやすさ
3. 軽さ・応答性
4. 制作効率
5. 機能の豊富さ
6. 高度なカスタマイズ性

ただし、**「使いやすくするために機能を削る」設計にはしない。**

### 1.1 実装内部の美しさより、実使用時の軽さを優先する

内部Architectureの統一感、抽象化の純粋さ、理論的な美しさは、それ自体を製品価値として優先しない。

同じユーザー体験・正確性・データ安全性・保守可能性を満たす複数案がある場合は、原則として次の実測コストが小さい案を優先する。

- Input latency
- CPU time
- GPU time
- Memory working set
- Memory allocation / copy量
- Startup / first-draw latency
- Background work
- Storage write amplification
- Battery / thermal load
- Bundle / module load cost

特に、**使っていない高度機能が通常の描画を重くしてはならない。**

Region解析、ICC高度変換、Wet Media、PSD codec、高度Filter、Timelapse生成等は、必要でない制作中に恒常的なCPU/GPU/Memoryコストを課さない設計を優先する。

> **機能は多くても、実行コストは使用時にだけ支払う（pay-for-use）。**

Architecture上の共通化を維持するためだけにHot Pathを遅くする場合は、共通化を弱めることを許容する。

目標は、

> **高機能なのに簡単**

である。

高機能化によってUIが複雑化する場合は、機能を削るのではなく、次によって複雑さを管理する。

- UI階層
- 表示条件
- コンテキストUI
- Quick Menu
- ジェスチャー
- ワークスペース
- 検索
- その他の発見性・アクセス性を高める仕組み

## 2. Illustro の中心思想

### 2.1 Canvas First

制作中のユーザーが最も長く触るべきものは、設定画面ではなくキャンバスである。

可能な限り、

1. キャンバスを見る
2. キャンバスに触る
3. その場で結果が分かる

という直接操作を基本とする。

### 2.2 Direct Manipulation

対象を選択してから別画面で数値入力することを常に前提とせず、次のような手段によって対象そのものを操作できる構造を優先する。

- ドラッグ
- ピンチ
- 回転
- ハンドル操作
- ペン操作
- タッチ操作
- キャンバス上UI

数値入力は必要な場合に提供するが、直接操作で自然かつ正確に行える日常操作について毎回必須にはしない。

### 2.3 Low Friction

頻繁に使う操作について、

メニューを開く → カテゴリを選ぶ → サブメニューを開く → 機能を選ぶ

という深い階層を極力作らない。

**よく使う操作ほど少ない手数で実行可能にする。**

### 2.4 Creation Proximity — 機能を制作行為へ近づける

Illustroでは、

> **ユーザーが機能へ移動するより、必要な機能・情報・処理が制作中のユーザーへ近づく**

方向を重視する。

この思想を具体化する重要な設計原則として、次を扱う。

- **PiP / Detachable Workspace** — 必要なInspector/Reference/Layer/Color/Brush等の一部を、必要時だけCanvas近傍へ昇格させる
- **Brush Engine First** — Inputから最終Pixelまで一貫したBrush Pipelineを中核Subsystemとして設計する
- **Quick Controller / Spatial Command Surface** — 高頻度CommandをVisual SearchではなくSpatial Memory / Muscle Memoryで呼び出せる状態を目指す

これらは過去UIの再実装指示ではない。

PiPという名称、六角形Button、具体Panel形状、古い内部実装は固定しない。より単純で、速く、誤操作が少なく、Canvasへの集中を守る方式がある場合は積極的に再設計する。

詳細なCanonical補足は [Creation-Proximity Design Principles](CREATION_PROXIMITY_PRINCIPLES.md) に定義する。

## 3. Illustro の主要独自機能

### 3.1 Lineart Region System — 線画領域認識システム

Illustro の中心的な独自機能候補。

通常のペイントアプリでは、線画と塗りは基本的に別々のピクセル情報として扱われる。

Illustro では線画から次を解析し、**「線画の中に存在する領域」**として管理できる仕組みを導入する。

- 閉領域
- 境界
- 隣接関係
- 領域ID
- 線のつながり
- 塗り対象

将来的には、髪、前髪、後ろ髪、顔、首、服、袖、肌、目、背景など、より意味のある単位と結び付ける余地を持たせる。

目的:

- 塗りつぶしの高速化
- 線画修正後の塗り直し削減
- 色変更の簡略化
- 選択範囲作成の高速化
- 陰影処理の補助
- Smart Color Assist との連携

ただし、完全な意味認識を初期段階の必須条件とはしない。

第一段階では、**「線によって囲まれた領域」を安定して識別・保持できること**を重要視する。

### 3.2 Lineart-linked Coloring — 線画連動塗り

従来方式では、

線画修正 → 境界が変化 → 塗りレイヤーも手動修正

が必要になりやすい。

Illustro では、

線画変更 → Region境界を再計算 → 既存の塗り情報を可能な範囲で新領域へ再マッピング

する。

例:

顔の輪郭線を少し動かした場合、肌色が古い輪郭位置に残るのではなく、新しい輪郭へ追従する。

重要要件:

- 完全自動で勝手に画像を変更する仕組みにしない
- ユーザーが結果を確認できる
- Undo可能である
- 追従の強さや条件を設定可能にする

### 3.3 Smart Color Assist — スマート彩色補助

「AIが完成絵を生成する」のではなく、**ユーザー自身の絵を中心にした補助機能**とする。

対象候補:

- ベースカラー候補
- 隣接色との調和
- 色パレット提案
- 領域別色変更
- 陰影候補
- ハイライト候補
- 色温度調整
- 全体色調整

生成AI主体ではなく、可能な処理については次の情報を用いた決定的アルゴリズムを優先する。

- Region
- 色相
- 明度
- 彩度
- 隣接関係
- 既存パレット
- ユーザー設定

目的は、

> **「絵を代わりに描く」ではなく、「ユーザーが描く際の面倒な処理を減らす」**

ことである。

### 3.4 Smart Fill / Advanced Fill — 高性能塗りつぶし

単純な Flood Fill を超え、次を統合する。

- 線の隙間補完
- 隙間許容量
- 境界拡張
- 境界収縮
- 複数レイヤー参照
- 線画参照
- 色差許容
- Region Fill
- 囲って塗る
- なぞって塗る
- ドラッグ塗り
- 連続領域塗り

塗りツールのモードが大量に分散しないよう、**一つのツールまたは一貫したワークフローから自然に切り替えられるUI**を検討する。

### 3.5 Procedural Brush System — プロシージャルブラシ

ブラシを大量なPNGテクスチャだけで構成するのではなく、次の要素を組み合わせて動的に生成できる仕組みを持つ。

- 形状
- 間隔
- 散布
- 回転
- 筆圧
- 速度
- 方向
- 湿り
- 混色
- 紙質
- エッジ
- 粒子
- ノイズ

利点:

- ブラシ数を増やしても容量が増えにくい
- パラメータ編集性が高い
- 解像度依存を減らせる
- ユーザー独自ブラシを作りやすい
- GPU処理と相性が良い

テクスチャブラシを排除する意味ではなく、**プロシージャル要素とテクスチャ要素を両立できること**を前提とする。

### 3.6 Dynamic Wet Media — 動的水彩・湿式メディア

単純な水彩風スタンプではなく、キャンバス上に内部状態を持たせる。

状態候補:

- Wetness
- Pigment
- Flow
- Absorption
- Dryness

ブラシ入力に応じて、

水分 → 顔料拡散 → 紙への吸収 → 乾燥 → エッジ形成

を簡易シミュレーションする。

完全な物理シミュレーションを目的にせず、次のバランスを重視する。

- 見た目
- 速度
- 操作性

最重要原則:

> **「リアルな水彩シミュレーター」ではなく、「イラスト制作で扱いやすい水彩」**

### 3.7 Reference Workspace — 資料表示システム

資料画像を別アプリで開く必要を減らす。

機能:

- 複数Reference表示
- 自由配置
- ピン留め
- 拡大縮小
- 回転
- 左右反転
- グレースケール
- 常に手前表示
- 一時非表示
- Reference Group
- Reference保存

キャンバスとは独立した Reference として管理する。

### 3.8 Reference Eyedropper — 資料直接スポイト

Reference画像上から直接色取得可能にする。

資料ビューへ切り替えたり、画像をキャンバスへ読み込んだりする必要をなくす。

ペン長押しや修飾キーなど、高速アクセス方法も用意する。

### 3.9 Snapshot System — スナップショット

現在の制作状態を軽量に保存し、

- A案
- B案
- 色違い
- 修正前
- 修正後

などを比較可能にする。

Undoとの違い:

- Undo = 直線的な作業履歴
- Snapshot = ユーザーが重要地点を明示的に保存

Snapshot からの分岐制作も想定する。

### 3.10 Layer Comps — レイヤーカンプ

レイヤーの次の状態をセットとして保存する。

- 表示 / 非表示
- 不透明度
- Blend Mode
- 必要に応じて Transform

用途例:

- 昼 / 夜 / 夕方
- 表情A / 表情B
- 背景A / 背景B

### 3.11 Seamless Tile Drawing — シームレス描画モード

テクスチャ・パターン制作向け。

キャンバスを上下左右へ反復表示し、端に描いた線が反対側へリアルタイム反映される。

ユーザーは継ぎ目を目視しながら制作できる。

### 3.12 Work Time — 実作業時間計測

ファイルを開いていた時間ではなく、可能な限り**実際に制作作業をしていた時間**を計測する。

活動判定候補:

- ブラシ操作
- レイヤー操作
- 変形
- 選択
- 色変更
- その他の意味のある編集操作

長時間放置は自動除外する。

表示候補:

- Total Work Time
- Today
- Session
- Average

### 3.13 Timelapse — 制作タイムラプス

単純な画面録画ではなく、可能な限り**キャンバスの変更履歴を利用する方式**を優先する。

利点:

- ファイルサイズ削減
- UIを映さない
- 高解像度書き出し
- フレーム調整可能

### 3.14 Auto Actions / Macros — 操作自動化

繰り返し作業を自動化する。

例:

レイヤー複製 → Gaussian Blur → Blend Mode変更 → Opacity 40%

対応候補:

- 操作記録
- パラメータ化
- プリセット
- ショートカット割当
- Quick Menu登録

### 3.15 Quick Menu — 高速操作メニュー

ユーザーが自由に編集可能な高速メニュー。

登録可能:

- ツール
- コマンド
- ブラシ
- 色
- Macro
- Layer操作
- Canvas操作

項目ごとに次を設定可能とする候補。

- Icon
- Label
- Shortcut
- Group

### 3.16 Persistent Clipping Control — クリッピング高速操作

クリッピングはイラスト制作で使用頻度が高いため、深いレイヤーメニュー内だけには配置しない。

レイヤーパネル上などで即座に確認・変更可能にする。

### 3.17 Advanced Non-destructive Editing — 高度な非破壊編集

Photoshop等で有用な高度機能を、一枚絵制作向けに整理して搭載する。

候補:

- Adjustment Layer
- Filter Layer
- Mask
- Clipping Mask
- Vector Mask
- Blend If 相当
- Live Blur
- Live Color Adjustment
- Displacement
- Warp
- Liquify
- Healing
- Patch

原則:

> **可能な処理は非破壊化する。**

### 3.18 Blend If 相当

レイヤーを、

- 下地の明るさ
- 自レイヤーの明るさ
- その他の適切なチャンネル情報

などによって自動的に表示制御できるようにする。

用途:

- ハイライト追加
- 影追加
- テクスチャ合成
- 発光
- 色補正

Photoshop方式をそのまま複雑にコピーするのではなく、**視覚的に理解しやすいUI**を検討する。

### 3.19 Healing / Patch

写真編集用途だけではなく、イラスト修正にも活用する。

用途:

- 不要線除去
- 小さなゴミ除去
- テクスチャ修復
- 背景修正

ペイントアプリ向けに簡略化・直接操作化したUIを設計する。

### 3.20 High Zoom

最大ズーム:

> **64000% を目標とする。**

用途:

- ドット単位編集
- アンチエイリアス確認
- 細部修正
- ピクセルアート

高倍率でも座標精度が壊れない設計にする。

## 4. レイヤーシステム

レイヤーはIllustroの中核機能である。

最低限の候補:

- Raster Layer
- Vector Layer
- Group
- Mask
- Clipping
- Adjustment Layer
- Filter Layer
- Text

Reference系EntityはDocumentに保持できるが、**通常のArtwork Layer treeへ混ぜて合成対象にしない**。Reference Workspaceとして独立管理する。

重要要件:

> **大量レイヤーでもUIが重くならないこと。**

機能候補:

- 複数選択
- ドラッグ並べ替え
- 検索
- フィルタ
- カラータグ
- ロック種別
- Solo
- Collapse
- Duplicate
- Merge
- Merge Visible
- Flatten Copy
- Layer Comp
- Quick Clipping

## 5. UI設計

### 5.1 UIの基本原則

UIは**「見た目がミニマル」であることより、「操作が迷わない」こと**を優先する。

ただし情報過多にはしない。

理想:

- 初見 → 基本操作が分かる
- 慣れる → 操作が速くなる
- 上級者 → ほぼUIを意識しなくなる

### 5.2 Context UI

選択中の対象や現在の操作によって、必要な機能だけを近くに表示する。

例:

- Transform中 → 回転・反転・補間・確定
- Brush中 → Size・Opacity
- Selection中 → 追加・削除・反転

不要な項目を常時大量表示しない。

### 5.3 Workspace

PCでは高度なパネル配置を可能にする。

対応候補:

- Dock
- Undock
- Floating
- Resize
- Reorder
- Hide
- Workspace Save
- Workspace Load

用途別プリセット候補:

- Drawing
- Painting
- Coloring
- Photo Editing
- Pixel Art
- Minimal

### 5.4 左右UI反転

左利き・右利き対応。

単にツールバー位置だけでなく、次も左右反転可能にする。

- パネル
- ポップアップ
- Quick Menu
- 主要操作位置

## 6. デバイス別最適化

同一UIを縮小・拡大して使い回さない。

### 6.1 PC

重視:

- Keyboard Shortcut
- Mouse
- Pen Tablet
- 複数Panel
- Dock
- Floating
- Hover
- 右クリック
- Modifier Key

### 6.2 Tablet

重視:

- Pen
- Touch Gesture
- 片手操作
- 大きめUI
- Canvas面積
- Gesture Shortcut

### 6.3 Smartphone

重視:

- 小画面
- 片手
- 親指操作
- Quick Menu
- Context UI
- 画面占有率最小化

PC版の縮小コピーにはしない。

## 7. 入力システム

対応:

- Mouse
- Touch
- Stylus
- Keyboard

Stylusで、対応可能な端末では次を利用する。

- Pressure
- Tilt
- Azimuth
- Eraser
- Barrel Button

Pointer Event処理は可能な限り低遅延化する。

## 8. Undo / Redo

Undoは最重要機能の一つ。

Undoは「失敗した時に使う機能」ではなく、

> **試行錯誤を成立させる制作機能**

として扱う。

そのため、次を重視する。

- 高速
- 深い履歴
- 低メモリ
- 即応
- 安定性

Stroke単位だけでなく、可能であれば Command 単位の履歴として設計する。

Snapshotとは別管理とする。

## 9. パフォーマンスへのこだわり

目標:

> **体感0ラグ**

対象:

- Stroke
- Undo
- Redo
- Zoom
- Pan
- Rotate
- Layer Switch
- Visibility Toggle
- Transform
- Selection
- Color Pick

単なる平均FPSだけでは評価しない。

重要指標:

- Input latency
- Frame time
- Worst frame
- Memory usage
- Canvas size scaling

## 10. 大規模キャンバス対応

巨大キャンバスを一枚の巨大Bitmapとして毎回処理する設計を避ける。

基本候補:

> **Tile-based Canvas**

変更されたTileのみ再描画する構造を有力候補とする。

期待する利点:

- 巨大画像対応
- Undo効率化
- GPU転送削減
- メモリ削減
- 部分更新

Tile-based Canvasの具体方式はアーキテクチャ設計で検証するが、**巨大キャンバスで性能が急落しないこと自体は製品要件**である。

## 11. GPU利用

利用可能な環境ではGPUを積極利用する。

候補:

- WebGPU
- GPU texture
- Compute Shader

対象候補:

- Brush compositing
- Filters
- Blur
- Transform
- Color adjustment
- Blend
- Preview

ただしGPU依存によって互換性が落ちる場合はFallbackを用意する。

具体技術はこの段階では固定しない。

## 12. 保存形式

独自形式:

> **.illustro**

保持対象:

- Canvas
- Layers
- Masks
- Vectors
- Brush information
- Region information
- References
- Snapshots
- Layer Comps
- Document固有のWorkspace/View metadata（必要な範囲）

Global shortcut、Global workspace layout等のUser preferenceは、Native Documentへ必須埋め込みしない。
- Timelapse
- Document settings

通常画像:

- PNG
- JPEG
- WebP

高度形式:

- PSD対応を検討

最重要:

> **読み込み・書き出しで可能な限り情報を失わない。**

## 13. 自動保存

制作アプリとしてデータ損失を極力防止する。

対応:

- Auto Save
- Crash Recovery
- Recovery Snapshot
- Incremental Save

保存処理によって描画が止まらない設計にする。

## 14. Offline First

通常の制作についてインターネット接続を要求しない。

対象:

- 描画
- 保存
- 編集
- Brush
- Layer
- Undo
- Reference
- Filter

クラウド依存・常時ログイン必須を避ける。

PWAとしてインストール可能な構成も重要候補とするが、最終採用はアーキテクチャ検証後に決める。

## 15. AIに対する基本姿勢

AI生成をアプリの中心価値にしない。

IllustroのAI方針:

- AIが絵を完成させる → **×**
- ユーザーが描く作業を補助する → **○**

例:

- 色候補
- Region補助
- 選択補助
- 整理補助
- 修正補助

可能な処理は、AIを使わなくても成立するアルゴリズムを優先する。

理由:

- 結果の再現性
- 速度
- Offline
- Privacy
- コスト
- ユーザー制御性

## 16. カスタマイズ

ユーザーによって好みが大きく違う機能は、削除するのではなく設定可能にする。

例:

- Gesture
- Toolbar
- Quick Menu
- Shortcut
- Workspace
- Brush UI
- Left/Right layout
- Canvas controls
- Hover behavior

ただし設定項目を増やし過ぎて初期設定が難しくならないよう、**Defaultは完成度の高い状態**にする。

## 17. 初心者と上級者の両立

初心者モード / 上級者モードのように完全に分離することを前提にはしない。

基本機能は同じ。

初心者:

- 自然に使える

上級者:

- Shortcut
- Macro
- Workspace
- 高度設定

を使って高速化できる。

**「初心者向けだから機能を削る」という考え方は採用しない。**

## 18. 既存アプリから参考にする方向

既存アプリの優れた部分を積極的に研究する。

### 18.1 Clip Studio Paint

参考:

- Brush自由度
- Layer
- Selection
- Transform
- Shortcut
- 制作支援

改善したい部分:

- UI複雑度
- 設定の深さ
- 操作手数

### 18.2 ibisPaint

参考:

- 機能密度
- スマホ操作
- 手軽さ
- フィルター
- 初心者アクセス性

目標:

- ibisPaint級以上の実用的な機能網羅性を一つの基準として意識する

これは機械的な全機能コピーを意味しない。

### 18.3 Procreate

参考:

- Canvas中心UI
- Gesture
- 低摩擦操作
- 描画体験
- 直感性

改善:

- Procreateより高度なLayer・Selection・Adjustment・Automationを持たせる

### 18.4 Photoshop

参考:

- Blend
- Adjustment
- Mask
- Blend If
- Healing
- Patch
- Advanced Transform

ただし、写真編集ソフト由来の複雑なUIをそのままコピーしない。

### 18.5 Krita

参考:

- Brush Engine
- 自由度
- Open系設計
- 高度な描画機能

### 18.6 Affinity

参考:

- 非破壊編集
- UI整理
- 高速処理
- Adjustment

## 19. Illustroで避ける設計

以下は可能な限り避ける。

- 機能数を減らして簡単に見せる
- 深すぎるメニュー
- 大量のModal Dialog
- 設定画面依存
- 毎回数値入力が必要
- クラウド必須
- 常時ログイン必須
- ブラシ変更時の待ち時間
- 重いUndo
- 高解像度で急激に重くなる
- 端末ごとに同一UIを強制
- スマホ版をPC版の縮小コピーにする
- 初心者向けを理由に高度機能を削る
- 独自性だけを目的に既存の良いUIを捨てる
- 生成AIをアプリの中心価値にする
- 制作中に頻繁に画面遷移させる
- 重要機能を右クリックだけに隠す
- 機能の存在をユーザーが発見できないUI

## 20. Illustro の完成形

Illustroが目指すのは、

> **「何でもできるから強いアプリ」ではない。**

目標は、

> **「一枚絵を描くために必要な高度機能が、すべて自然に使えるアプリ」。**

イメージとしては、

- Clip Studio Paint級の制作機能
- Procreate級の直感性
- ibisPaint級の手軽さ
- Krita級の自由度
- Photoshop / Affinity級の非破壊編集
- Illustro独自の制作支援

を、一枚絵制作専用として最初から再構築したもの。

これらは目標・設計上の参照であり、現時点で同等性能を達成しているという意味ではない。

## 21. Illustroを象徴する独自要素

Illustroの独自性を特に強く出す機能は次とする。

1. Lineart Region System
2. 線画連動塗り
3. Smart Color Assist
4. Advanced Smart Fill
5. Procedural Brush
6. Dynamic Wet Media
7. Reference Workspace
8. Snapshot
9. Layer Comps
10. Quick Menu / Direct Manipulation
11. Work Time
12. 制作履歴ベースTimelapse
13. Auto Actions / Macros
14. デバイス別適応UI
15. 高度機能を直感的に扱うUI体系

## 22. 最重要品質基準

新機能を追加する際は、以下の順番で評価する。

1. 一枚絵制作で本当に役立つか
2. 操作手数を減らせるか
3. 初見でも意味が理解できるか
4. 制作中の集中を邪魔しないか
5. 十分高速に動くか
6. Undo可能か
7. 非破壊化できるか
8. 他機能と連携できるか
9. スマホ・タブレット・PCの操作差を考慮しているか
10. 既存アプリより明確に良くできるか

> **機能を実装できること自体は採用理由にはならない。**

## 23. Illustro の設計原則を一文で表す

> **「機能が多いアプリ」ではなく、「必要な瞬間に必要な機能が、最短操作で、即座に、自然に使えるアプリ」。**

これをIllustro全体の設計判断基準とする。

## 24. 将来の絵チャ・共同編集

最終的に、Illustro本体が完成した後の将来機能として、**絵チャ・共同描画機能**を追加する構想を持つ。

現段階では本体仕様の中心として設計しない。

ただし、将来の共同編集を不必要に不可能にするようなアーキテクチャ上の制約は、合理的に避ける。

## 25. 仕様の管理原則

本書は製品レベルの意図と非交渉事項を定義する。

下位仕様は本書を具体化できるが、無断で矛盾してはならない。

矛盾が見つかった場合は次の順で処理する。

1. 矛盾点を明示する
2. 下位設計と本書のどちらを変更すべきか判断する
3. 判断理由を記録する
4. 影響する仕様を同時に更新する

実装フェーズを分けることによる「後回し」は認めるが、**後回しは最終製品仕様からの削除を意味しない。**

機能を最終仕様から削除・変更する場合は、明示的な製品判断として本書を更新する。
