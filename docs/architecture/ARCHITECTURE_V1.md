> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Illustro Architecture V1

> Status: **Confirmed for Core implementation**  
> Date: 2026-09-28  
> Scope: UI visual designを除く、Core Editor本実装の内部Architecture baseline

## Evidence

- [V1 Promotion Gate](V1_PROMOTION_GATE.md)
- [First PASS Evidence](V1_FIRST_PASS_EVIDENCE.md)
- [Second Audit Evidence](V1_SECOND_AUDIT_EVIDENCE.md)
- [P0 Prototype Report](../prototypes/P0_ARCHITECTURE_PROTOTYPE.md)

## 1. Meaning of V1

Architecture V1は「Illustroの性能が完成した」という意味ではない。

V1で確定するのは次。

- Core Editor実装を開始するための責務分離
- Realtime placementの初期Default
- Raster canonical ownership
- Sparse Tile / dirty updateのBaseline
- GPU backend/fallback policy
- Persistence / RecoveryのBaseline
- Startup / First Drawのlazy-load原則
- TypeScript / WASM境界の決定方法

V1で確定しないもの:

- Visual UI
- PC / Tablet / SmartphoneすべてのSupport認定
- WebGPUがすべての端末で動くという前提
- Production bundleの最終startup SLA
- Lineart Layer / ICC / Wet Media等の最終Algorithm・定数
- portable .illustroのphysical container encoding

## 2. Realtime runtime placement

### V1 decision

Default:

- Pointer intake: **Main Thread**
- active stroke ownership / reconstruction coordination: **Main Thread**
- lightweight render submission: **Main Thread**
- Persistence: **Dedicated Worker**
- Lineart Layer analysis / codec / heavy filter / expensive compute: **bounded utility Worker lanes**
- full Realtime Worker: **optional measured fast path only**

Xiaomi tablet + Xiaomi penの実測ではMain / Workerに意味のある体感差がなく、Main pathのinput→next RAF proxyが低かった。

V1ではThread分離の美しさより、不要なhopを減らすことを優先する。

特定ProfileでWorker pathが実測上明確に優れる場合はCapability Profileで切替可能にする。Document semanticsはThread配置へ依存させない。

## 3. Raster canonical ownership

Rasterは:

- sparse logical tiles
- immutable published canonical blocks
- mutable active working tiles
- Revisionからcanonical block identityを参照

とする。

### Existing tile edit

1. current canonical blockからworking bufferへ1回copy
2. Stroke中はworking bufferをmutable更新
3. commit時にworking buffer ownershipをcanonical storeへtransfer
4. new Revisionがblock identityを参照

### New tile edit

- zero-initialized working bufferを直接作成
- existing canonical read/copyは不要

### Seal invariant

Seal時に変更Tileの**avoidableな二度目のfull-tile copyを行わない**。

PrototypeではArrayBuffer ownership transferを利用した。Productionは同等以上のownership semanticsを満たす別方式でもよい。

### Stale transaction

Stale headを基準にしたtransactionは、canonical blockをstoreへ追加・transferする前にrejectする。

Orphan canonical blockを作らない。

### Undo

Undo / RedoはRevision / block identity switchingを基本とする。

Undoのためにfull Canvas bitmapをcopyしない。

## 4. Logical Tile policy

### Standard profile

**256 × 256 logical pixels**

Brush-like workload aggregateでは128→256で:

- tile touches: **-36.87%**
- sparse allocation: **+52.19%**
- dirty upload bytes: **+13.96%**

256→512では:

- tile touches: **-20.70%**
- sparse allocation: **+66.42%**
- dirty upload bytes: **+20.38%**

256をV1 standard profileの初期Defaultとする。

### Memory-constrained profile

**128 × 128** を候補として許容する。

利用判断はworking-set budget、sparse layer数、cache pressure等のRuntime telemetryに基づく。

### 512

512はUniversal Defaultにしない。

特定処理やProfileで実測上有利なら利用可能だが、Document / file semanticsへ固定しない。

### Important

Logical Tile Sizeと以下は別概念。

- dirty subrect
- processing subdivision
- GPU texture atlas page
- filter workgroup
- effect halo region

portable .illustroの意味をLogical Tile Sizeへ依存させない。

## 5. Dirty update contract

Dirty stateはTile IDだけでなくlocal dirty rectangleを保持する。

Consume時:

1. dirty rect snapshotをJobへ渡す
2. live Tileのdirty stateをclear
3. returned snapshotはclear操作で変化しない

GPU upload、CPU materialization、effect propagationは可能な限りdirty subrectを利用する。

## 6. Derived cache / memory

Derived cacheはbyte-budgetedにする。

基本Eviction順:

1. stale preview
2. cold GPU / composite cache
3. decoded resources
4. non-pinned derived summaries
5. policy上prunableなhistory

次はDerived cache budgetの都合で捨てない。

- current canonical artwork
- protected Recovery closure
- pinned Snapshot
- required active transaction data

Pinned canonical/protected dataはcacheではない。

## 7. Render backend

### Selection order

1. **WebGPU**
2. **WebGL2 compatibility GPU**
3. **Canvas2D / CPU compatibility**

WebGPU APIの存在だけでは採用しない。

採用には最低限:

- adapter
- device
- required capabilities
- representative smoke
- command submission

の成功を要求する。

### Verified evidence

GitHub-hosted Chromiumでは:

- navigator.gpu: present
- WebGPU adapter: unavailable
- WebGL2: actual draw / readback PASS
- Canvas2D: available

したがって、**WebGPU hardware executionはこのCIでは未確認**。

V1はWebGPUを唯一のcorrectness dependencyにしない。WebGPU smokeが成功した環境では第一候補、失敗すればWebGL2 / Canvas2Dへfallbackする。

### Device loss

GPU resourceはDerived state。

Device/backend loss時:

1. GPU generationをinvalidate
2. GPU-derived resourcesを破棄
3. backendを再初期化またはfallback
4. canonical Revisionからvisible resourcesを再生成

Canonical artworkは変更・消失しない。

## 8. Persistence / Recovery

### Working store

Web runtimeではOPFSをPrimary Working Storeとする。

Dedicated Persistence WorkerでFileSystemSyncAccessHandleが利用可能なら使用する。

### Journal

Recovery journalは:

- framed
- batched
- bounded
- append-oriented

とする。

Batch byte threshold / delayはRuntime calibration値であり、Document semanticsではない。

### Durability acknowledgement

Recordを含むBatchのdurability attemptが完了する前に、そのRecordをprotected扱いしない。

### Torn tail recovery

Open / recovery時:

1. 先頭から連続valid frameのみscan
2. 最初のinvalid / truncated位置で停止
3. 後方のmagicを検索して再同期しない
4. valid prefixをRecovery truthとする
5. invalid tailをtruncate
6. その後にappendを再開

served Chromium + OPFS SyncAccessHandleで次を確認済み。

- 8 complete frames persistence
- reload recovery
- 11-byte torn tail detection
- reopen repair
- repaired後にsequence 8, 9をappend
- final tail 0

API flush成功を物理的な突然の電源断に対する絶対保証とは表現しない。

## 9. Startup / First Draw

First Draw critical pathへ不要なModuleを入れない。

First Strokeをblockしてはならない候補:

- Lineart Layer analysis
- general ICC engine
- PSD / TIFF / EXR codec
- Wet Media
- advanced filters
- diagnostics / benchmark modules
- Persistence Worker initialization
- inactive compatibility backend

必要時にlazy loadする。

Second-pass served Chromium proxy:

- boot → module: 約5.0 ms
- boot → canvas ready: 約8.3 ms
- first stroke → next RAF: 約6.2 ms
- first stroke前後でadvanced load flagsはすべてfalse
- first strokeによる追加resource requestなし

これらはCI環境のproxy値であり、Production SLAではない。

## 10. TypeScript / WASM

### V1 decision

TypeScriptをDefault implementation languageとする。

Rust / WASMは次のようなProduction-like heavy kernelが存在した時点で比較する。

- Lineart Layer extraction / structural analysis
- computational geometry
- ICC
- codec
- heavy selection/fill/raster kernel

単純microbenchmarkだけでWASM採用範囲を固定しない。

JS↔WASMのcopy、call overhead、startup、memoryを含めて利益が明確なkernelだけ移す。

これはCore implementation開始のblockerではない。

## 11. History / revision semantics

- Revision = immutable published document state
- Transaction = user-intent Undo grouping
- Snapshot = pinned named Revision
- Save = fixed Revision snapshot
- Recovery = durable protected Revision / dependency closure

を分離する。

Active interactionのmicro-stepをRevisionへしない。

## 12. Device adaptation

Document / Brush / History / PersistenceのsemanticsはPC / Tablet / Smartphoneで共通。

次はCapability Profileで変えてよい。

- UI layout
- cache budget
- Worker count
- render backend
- memory-constrained Tile Profile
- input fast path

Full 3-device validationはCore implementation後、Supported environment宣言前に行う。

Core実装開始前に全端末で同一benchmarkを繰り返すことは要求しない。

## 13. Pay-for-use

Inactive advanced featureは:

- recurring CPU ≈ 0
- recurring GPU ≈ 0
- minimal/no resident data
- startup compile/loadなし

を目標にする。

Background workよりForeground input / presentを優先する。

## 14. V1 implementation invariants

Core implementationで破ってはならない。

1. GPU cacheをCanonical artworkにしない
2. active Strokeごとにfull Canvas copyしない
3. Seal時にchanged Tileを二重full-copyしない
4. stale transactionをpublishしない
5. inactive advanced featureを常時解析しない
6. one-worker-per-core等の固定Worker思想を採用しない
7. Save / RecoveryをMain realtime pathのsync waitへしない
8. OPFS torn tailの後ろへそのまま追記しない
9. localized display stringをCommand / File identityにしない
10. Device categoryだけでCapabilityを決めない

## 15. Still intentionally open

Core implementation開始を止めない未確定事項:

- representative heavy-kernel TS / WASM split
- final memory budget values
- device-specific 128 / 256 Tile profile switch threshold
- brush stabilization / resampling constants
- PRNG implementation
- Lineart Layer extraction / connection / representation decisions
- ICC library
- exact blend compatibility formulas
- portable .illustro physical container encoding / compression / hash
- PSD mapping
- advanced-feature interaction backlog
- visual UI design

これらはProduction-like workloadまたは該当Feature実装前に確定する。

## 16. V1 promotion verification

### First PASS

- GitHub Actions run: 36334997832
- tested commit: 8bb9148ef6332dfcf532655ff45adc6d9b9012ed
- 24 unit tests / 11 files
- 4 served-browser tests
- strict typecheck PASS
- Vite build PASS

### Second audit

First PASS後に4件のhidden issueを発見した。

- stale Raster transaction orphan block risk
- consumed dirty rect snapshot destruction
- Graphics context probe false negative / fallback risk
- torn journal tailをrepairせず再追記するrisk

すべて修正し、adversarial regression testsを追加した。

### Second PASS

- GitHub Actions run: 36335428192
- tested commit: 0245189a80ddad3957cfa6774bfdd7fa2cca403c
- 29 unit tests / 12 files
- 4 served-browser tests
- strict typecheck PASS
- Vite build PASS

以上によりArchitecture V1を**Confirmed for Core implementation**とする。
