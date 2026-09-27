# Illustro Interaction Model

> Status: **Canonical interaction baseline v0.1**  
> Date: 2026-09-27  
> Scope: ユーザーが直接触る全機能に共通する操作契約  
> Priority: PRODUCT_SPEC > FEATURE_SPEC > 本書 > 個別Feature Interaction Spec > UI visual specification

## 1. Purpose

Illustroでは「機能がある」だけでは仕様完了としない。

ユーザーが直接触る機能は、最低限次を定義する。

1. Entry — どこから開始するか
2. Default — 初回/通常時に何が起きるか
3. Active state — 操作中に何が見えるか
4. Direct manipulation — Canvas上で何を直接触れるか
5. Commit — いつ結果が確定するか
6. Cancel — どう戻すか
7. Undo boundary — Undo一回の単位
8. Conflict / failure — 競合・失敗時
9. Discovery — 機能の存在をどう知るか
10. PC / Tablet / Smartphone — 入力差
11. Shortcut / Gesture — 高速操作
12. Persistence — 何を保存するか
13. Performance cost — 通常描画へ何を課すか
14. Accessibility — Keyboard/Touch/非色依存等
15. Acceptance criteria — 何をもって完成とするか

個別Feature Specがこれらを意図的に省略する場合は「共通規則を継承」と書く。

## 2. Entry-point hierarchy

頻度に応じて入口を整理する。

### Tier 1 — 常用

例:

- Brush
- Eraser
- Color
- Layer
- Undo/Redo
- Fill
- Selection
- Transform

少なくとも主UIまたはCanvas近接UIから直接到達可能。

### Tier 2 — 頻繁だがContext依存

例:

- clipping
- alpha lock
- selection expand
- transform interpolation
- reference grayscale
- snapshot

Context UI / Quick Menu / Command Searchから少ない手数で到達する。

### Tier 3 — 高度/設定

例:

- ICC profile conversion
- brush engine advanced mapping
- PSD compatibility details

Command Searchまたは明確なPanel/Settingsから到達可能。

深いMenuのみを唯一の入口にしない。

## 3. Tool state model

Canvas Toolは概念上次の状態を持つ。

- Idle
- Hover/Ready
- Active interaction
- Provisional/Preview
- Committing
- Completed
- Cancelled
- Error/Blocked

すべてのToolが全状態を使う必要はないが、操作中と確定後を混同しない。

## 4. Commit model

### Immediate tools

Stroke、Eyedropper等。

操作終了とほぼ同時にCommit。

### Preview-before-commit tools

Transform、Warp、Adjustment parameter drag等。

Preview stateとCanonical resultを分離する。

Default:

- Enter / explicit Apply: Commit
- Esc / explicit Cancel: Cancel
- switching to an incompatible operation: 原則として明示Commit/Cancelを要求。Silent commitは禁止寄り。
- compatible view navigation: interactionを維持可能

### Continuous property editing

Brush size、opacity、layer opacity等。

Drag中はPreview/Coalesced transactionとし、pointer release等で一Undo単位へまとめる。

## 5. Cancel policy

操作開始前の状態へ戻せることを原則とする。

Cancelが必要なTool:

- Transform
- Warp/Liquify session
- gradient placement before commit
- crop
- modal-like selection modification
- file import mapping
- profile conversion preview
- macro parameter input

Cancel不能な操作は、その理由を個別仕様に書く。

## 6. Undo boundary

Undo一回の粒度は「ユーザーが一操作と感じる単位」。

Examples:

- one brush stroke
- one fill gesture
- one layer reorder drag
- one transform commit
- one continuous slider drag
- one color change if it edits artwork
- one macro execution by default

Tool内部のmicro-stepを大量Undoへ露出しない。

## 7. Preview policy

Previewは結果理解を助ける場合に使う。

Requirements:

- PreviewとCommit後の意味が大きく変わらない
- Previewが重い場合はqualityを落とすより、更新頻度/visible demandを調整
- Preview-only dataはCanonical saveに混ぜない
- long computationではstale previewを明示可能
- Cancelで元状態へ戻る

## 8. Long-running operation policy

Fill、Region、large Filter、save/export等が即時完了しない場合:

- Canvas全体を不要にModal lockしない
- progress/stateを表示
- Cancel可能な処理はCancelを提供
- foreground drawingを安全に継続できる場合は継続
- old revisionに対する結果は勝手にcurrentへ適用しない
- jobがstaleなら再計算/破棄を明示的に判断

## 9. Error and conflict model

エラーをSilent fallbackで隠さない。

分類:

- Invalid operation
- Resource unavailable
- Unsupported capability
- Conflict
- Ambiguous result
- Storage pressure
- Recovery issue
- Import/export loss
- Background job stale

User actionが必要な場合のみinterruptive UIを使う。

復旧可能な軽微問題を大量Modal Dialogにしない。

## 10. Context UI

Context UIは現在のTool/Selection/Targetに応じて必要項目を出す。

Examples:

Brush:
- size
- opacity
- current brush

Transform:
- mode
- interpolation
- flip
- apply/cancel

Selection:
- add/subtract/intersect
- invert
- feather when relevant

Fill:
- tolerance
- gap close
- reference source
- region mode

Context UIから高度設定へdrill-down可能だが、高頻度項目をdeep settingsへ追いやらない。

## 11. Direct manipulation

Canvasで意味が理解しやすい操作は直接操作をPrimaryにする。

- move
- scale
- rotate
- crop
- guide placement
- reference placement
- gradient direction
- clone source
- transform mesh
- perspective guide

Numeric entryはprecision補助として提供。

## 12. Tool switching

Tool switch時に未確定stateがある場合:

- safe compatible switch: preserve
- incompatible switch: explicit apply/cancel
- destructive silent commit: 原則禁止

Brush ↔ Eraser等、高頻度temporary switchはHold shortcut/previous-tool returnを利用可能。

## 13. Canvas navigation during tools

可能な限り、Tool操作を破棄せずPan/Zoom/Rotateできる。

PC:
- Space/shortcut/mouse/trackpad
Tablet/Phone:
- touch gesture while pen tool remains selected

NavigationはArtwork CommandとしてUndo履歴へ入れない。

## 14. Selection persistence rules

Active Selection:

- Tool switchで維持
- Document editing state
- explicit deselectで解除

操作がSelectionを暗黙解除する場合は個別仕様で理由を定義。

Saved Selectionは別Entity。

## 15. Focus and keyboard

PCでShortcutが有効でも、Text入力欄・Text Tool・numeric editor等がfocus中の場合は文字入力を破壊しない。

Global shortcut / contextual shortcut / text-input captureのpriorityを定義する。

Escapeは原則:

1. active capture/modal-like operation cancel
2. current provisional tool cancel
3. temporary overlay close

の順。

## 16. Touch and pen arbitration

Default:

- Pen: drawing/editing
- Touch: canvas navigation
- Finger drawing: opt-in/configurable

Phone touch-onlyでは選択Toolに応じてsingle-finger drawing/edit、multi-touch navigationを成立させる。

## 17. Hover-independent design

Hoverは補助。

Hoverでしか見つからない/実行できないCore commandを作らない。

Tooltip情報はTouchではpress/explicit help等で代替可能。

## 18. Discovery

高度機能を隠蔽しても、存在を不可視にしない。

Discovery mechanisms:

- Command Search
- contextual overflow
- tooltips/help
- first-use hints where useful
- command palette
- Quick Menu customization browser

Tutorial completionを機能利用の前提にしない。

## 18.1 Canvas Focus Mode

Focus ModeはCanvas Firstを実現するCore interaction。

Enter:
- explicit command
- shortcut/gesture acceleration possible

Behavior:
- non-essential panels/chrome hide
- current Tool/Selection/View preserved
- temporary Context UI remains summonable
- critical storage/recovery/error state can still surface

Exit:
- same command/shortcut
- discoverable touch control
- no keyboard-only dependency

Focus Mode toggleはArtwork Undoへ入れない。

## 19. Settings philosophy

Defaultを高品質にする。

設定が必要な理由:

- user preference
- device capability
- specialized workflow

設定をしないと基本操作が成立しない設計は禁止。

Advanced settingsはprogressive disclosure。

## 20. Persistence classes

Interaction stateを以下へ分類。

### Document-persistent
Artwork meaning / document workflow state。

### Workspace-persistent
Panel layout, Quick Menu, shortcuts, view preferences。

### Session-only
Temporary focus, hover, transient popover。

### Recovery-only
Crash restoration data。

個別仕様は必要なclassを明示する。

## 21. PC / Tablet / Smartphone mapping

個別機能で少なくとも以下を確認する。

### PC
- mouse
- keyboard
- pen
- hover
- right-click/context

### Tablet
- pen
- touch
- optional keyboard/trackpad
- split view

### Smartphone
- touch-only completion
- compact controls
- one-hand reach for common non-drawing commands
- no hover/right-click dependency

同一機能の意味は共通、入口とLayoutを適応させる。

## 22. Accessibility inheritance

全Featureは最低限:

- stateを色だけで表さない
- touch targetを十分にする
- keyboard-only可能な非描画commandを増やす
- text labels/accessible nameを持てる
- reduced motionを尊重
- multi-touch-only Core actionを作らない

## 23. Performance interaction contract

Feature Specは以下を記述する。

- inactive recurring cost
- activation cost
- hot-path additions
- long job behavior
- stale/cancel behavior
- cache/memory implication

「操作性向上のため常時解析」は原則禁止。必要性を実測する。

## 24. Acceptance gate for UI generation

UI visual generationへ進むFeatureは少なくとも以下が決定済みであること。

- main entry
- default behavior
- active/preview state
- commit/cancel
- undo boundary
- error/conflict behavior
- PC/Tablet/Phone access
- persistence class
- performance behavior

これらが未決定ならUI側で勝手に補完しない。
