# Creation-Proximity Design Principles

> Status: **Canonical design principle supplement**  
> Date: 2026-09-28  
> Priority: PRODUCT_SPEC > this document > FEATURE_SPEC / Interaction / UI visual design  
> Scope: PiP / Detachable Workspace, Brush Engine First, Quick Controller

## 0. Core idea

Illustroでは、ユーザーをUIへ移動させるより、

> **必要な機能・情報・処理能力が、制作中のユーザーの位置と行為へ近づく**

ことを重視する。

この文書は過去UIの再実装指示ではない。

継承するのは:

- 解決したかった問題
- 制作中の集中を守る思想
- 操作距離を短くする思想
- 入力意図を忠実に描画へ変換する思想

継承しない:

- 過去の具体Layout
- 「PiP」「六角形」という名称/形
- 固定されたButton数
- 古い内部実装
- 未検証のGesture/配置

より単純で優れた方式が実測・操作検証で見つかれば再設計する。

## 1. PiP / Detachable Workspace

### Problem

Inspector / Reference / Layer / Color / Brush設定等を確認・操作するたびにCanvasから視線・手・意識が大きく移動すると、制作の連続性が損なわれる。

### Principle

Workspaceの一部を必要な時だけCanvas中心の作業空間へ昇格させる。

典型的な流れ:

Docked content
→ 必要なBlockだけDetach
→ Canvas上またはCanvas近傍へFloating
→ 制作しながら直接操作
→ 不要になれば再Dock / dismiss

目的はWindow数を増やすことではない。

目的:

- Canvasから視線を離す時間を減らす
- 頻繁な設定変更のPointer/Pen移動距離を減らす
- 必要な情報だけ手元に置く
- Workspaceをユーザーの作業へ適応させる
- Focus Mode中でも必要最小限の補助を呼び出せる

### Candidate mechanisms

形状は固定しない。

候補:

- Dockable / Detachable Panel
- Floating block
- Popover
- Context UI
- Overlay
- Split View
- temporary pinned inspector
- Canvas-anchored control

採用は機能ごとに判断する。

### Required properties

- detach可能な単位は意味のあるBlockである
- detach前後で機能意味が変わらない
- Canvasを過剰に隠さない
- drag / resize / pin等が必要なら直接操作できる
- re-dock / dismissが容易
- PCだけの概念にしない
- Tablet/PhoneではFloatingより適切な方式を使ってよい
- inactive状態で継続的な負荷を課さない

### Evaluation

採用判断は次で行う。

- Canvasからの視線離脱時間
- Pointer/Pen移動距離
- 操作手数
- Canvas占有率
- 誤操作率
- Context維持
- discoverability
- device適合性

## 2. Brush Engine First

### Problem

Brushを単なる「Tip画像のStamp列」として後付けすると、入力・描き味・再現性・性能がSubsystem間で分断される。

### Principle

Brush EngineをIllustroの中核Subsystemとして扱い、

> **入力から最終Pixelまで一貫したBrush Pipelineを持つ。**

Conceptual pipeline:

Input
→ Normalization
→ Stroke Reconstruction
→ Dynamics
→ Dab / Continuous Coverage Generation
→ Tip / Texture Evaluation
→ Color / Mixing
→ Coverage / Compositing
→ Canvas

Brush結果は必要に応じて少なくとも次の情報から決定可能な構造を目指す。

- position
- pressure
- tilt
- azimuth / twist
- velocity
- direction
- time
- stroke history
- tip
- texture / grain
- spacing
- rotation
- scatter
- flow
- opacity
- density
- accumulation
- mixing
- wetness
- canvas state

機能数そのものを品質基準にはしない。

### Quality priorities

同時に成立させる:

- low perceived latency
- input sample lossを避ける
- deterministic/reproducible committed result
- ZoomやTile境界で描き味を変えない
- fast strokeで破綻しない
- slow strokeで不自然に溜まらない
- PreviewとCommitで意味を変えない
- large Canvasで性能崩壊しない
- inactive advanced dynamicsはnear-zero cost

### Procedural vs asset

Proceduralを優先候補とするが目的化しない。

Asset tip / texture / paperが品質・操作性・表現力で優れる場合は使用する。

## 3. Quick Controller / Spatial Command Surface

### Problem

Toolbarでは高頻度CommandでもVisual Searchが繰り返し発生しやすい。

### Principle

高頻度Commandを、

> **視覚探索ではなくSpatial Memory / Muscle Memoryで呼び出せる**

状態を目指す。

過去の「6個の六角形Button」は一候補にすぎない。

重要なのは、

- 左 = Undo
- 右 = Redo

のように位置が安定し、身体的に覚えられること。

### Candidate forms

- Hex Controller
- Radial Menu
- Pie Menu
- Arc Menu
- Edge Controller
- Floating Toolbar
- Gesture
- hybrid form

### Required properties

- Pen描画中の邪魔にならない
- 必要時だけ出せる
- Canvasを大きく隠さない
- Touchでも誤操作しにくい
- handednessへ適応
- user-customizable
- Context適応可能
- **ユーザー固定Commandの位置をContextによって勝手に入れ替えない**
- no-op open/closeはArtwork Undoへ入れない

Context-aware項目を出す場合は、Spatial Memoryを壊さない別領域・slot・layerとして扱う。

### Evaluation

- time-to-command
- travel distance
- error rate
- Canvas occlusion
- Pen compatibility
- Touch compatibility
- repeated-use muscle memory
- novice discoverability
- expert speed

独特さ・見た目の格好良さは採用理由にしない。

## 4. Shared principle

3思想の共通点:

- PiP: 必要な情報を制作位置へ近づける
- Brush Engine: 入力意図をPixelへ近い形で忠実に伝える
- Quick Controller: Commandを手元へ近づける

つまり、

> **ユーザーを機能へ移動させるのではなく、必要な機能が制作中のユーザーへ現れる。**

ただし常に再評価する。

- 本当に制作速度が上がるか
- 本当に直感的か
- Canvasへの集中を守るか
- より単純な解決法がないか
- inactive costを増やしていないか

## 5. Design gate

PiP系 / Quick Controller系 / Brush Engine系を最終UI・Production実装へ進める前に、少なくとも:

- problem statement
- candidate mechanisms
- device-specific behavior
- performance cost
- failure/conflict behavior
- user customization boundary
- acceptance metric

を明示する。

過去案の形を理由なく再実装しない。
