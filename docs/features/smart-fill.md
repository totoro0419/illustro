# Smart Fill Interaction Specification

> Status: **Accepted P0 interaction specification**

## Entry

Fill familyは1つの主要Toolとして扱い、Context UIからmodeを切り替える。

Modes:

- Flood Fill
- Region Fill
- Enclose and Fill
- Trace and Fill
- Drag Fill
- Continuous Fill

Modeごとに別Toolへ深く分散させない。

## Default

Defaultは通常のFlood Fill。

Reference source defaultは **Auto** とする。

Auto:
- designated Reference Layerが1つ以上ある場合: Reference Layer群を参照
- ない場合: Current Layerを参照

Autoが何を参照しているかはContext UIで常に確認可能にする。

Userが明示的にreference modeを変更した場合はWorkspaceで保持可能。

Gap Closing defaultは保守的にし、強い補完を勝手に行わない。

## Flood Fill

Tap/click:
- target seedを取得
- current fill settingsでpreview/compute
- resultをcommit

短時間処理は即時commit。

長時間処理ではprogress/cancelを表示可能。

## Drag Fill

Drag中に複数Region/seedを横断して連続塗り。

同一dragは原則1 Undo step。

## Enclose and Fill

Userが囲いGestureを描く。
Releaseで囲い内候補を解析。
Preview可能な場合は表示。
Commitで1 transaction。

## Trace and Fill

Userが線/軌跡をなぞり、対象領域を指定。

Gestureの意味が曖昧な場合は結果previewを優先。

## Region Fill

Lineart RegionがCurrentならRegion IDを利用。

RegionがUpdating:
-古いRegionを無条件に使わない
-短時間ならpending state
-Userが待つ/旧結果で暫定実行する等のpolicyはRegion specに従う

Ambiguous:
-確定Fillをsilent applyしない
-候補/修正導線を出す

## Reference source

Context UIで少なくとも次を選べる。

- Current Layer
- Visible Composite
- Selected Layers
- Reference Layers
- Region Model

Reference Layer指定はLayer側からも設定可能。

## Gap Close

Gap size/intensityは直感的なPrimary control + advanced numericを検討。

Preview/hoverでbridge候補を可視化できる場合は利用。

過剰Gap Closeで別領域へ漏れた場合、Undo一回で戻せる。

## Boundary expand/contract

Fill result適用前/同時に設定。

単位はpixel/relative等を個別実装で決める。

## Selection interaction

Active Selectionがある場合は原則selection内へ制限。

「Selection無視」は明示option。

## Commit / Cancel

短いFill: pointer release/tapでcommit。
長いFill: processing stateを持ちCancel可能。

stale source revisionの結果をcurrent Documentへ自動適用しない。

## Undo

1 tap / one drag / one enclose gesture = 1 Undo step。

## Device

PC:
- click/drag
- modifiers
Tablet:
- pen fill + touch navigation
Phone:
- touch fill
- Context controlsはcompact sheet
- hover不可でも全設定へ到達

## Error

- no closed target
- invalid reference source
- Region ambiguous
- memory/resource limit
- stale computation

を区別。

## Persistence

Fill tool settings = Workspace。
Applied pixels/assignments = Document。
Region assignment = Region subsystem。

## Performance

- local bounds first
- no whole-document scan when avoidable
- long fill is worker/background capable
- cancel/stale result safe
- Region analysis is demand-driven

## Acceptance

- normal flood fill immediate on common cases
- gap close does not silently alter lineart
- drag fill one undo
- stale result never overwrites newer artwork
