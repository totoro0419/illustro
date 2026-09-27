# ADR-0008: .illustro Persistence / Autosave / Recovery

## Status

**Accepted — Architecture V1**

## Date

2026-09-27

## Problem

巨大Documentを描画停止なしで保存し、Crash/Partial Write/Browser eviction riskに耐え、ユーザーが持ち運べるNative Fileを提供する。

## Independent analysis

「作業中Documentを毎回単一ZIPへ全書き換え」は:

- large projectでwrite amplification
- stroke中Autosave latency
- partial write risk
- mobile storage cost

が大きい。

一方、OPFSだけをNative Projectとすると:

- user-visible fileではない
- site data clearで失われ得る
- originに束縛される

したがって**Working StoreとPortable Native Fileを分離**する。

## Decision

## 1. Working Store

Web baselineではOPFSをLocal Working Storeとして利用する。

理由:

- origin-private
- in-place access
- Worker利用
- SyncAccessHandle fast path
- large binary workload向き

Storage persistence permissionは可能な環境で要求し、`persisted()`結果を把握する。

それでも外部backup/native fileの代替とはみなさない。

## 2. Persistence worker

Persistence I/OはDedicated Worker roleで行う。

Main/Realtime threadで:

- compression
- full project encode
- hash scan
- file flush

を実行しない。

Worker数は固定しないが、exclusive OPFS file access等のconstraintを所有者設計へ反映する。

## 3. Immutable block store

Working Storeはimmutable/published blockを基本とする。

ただしHot Pathで全Blockをcontent-hash/deduplicateすることを必須にしない。高速なallocated block ID + lightweight integrity metadataを使い、重いhash/dedupは必要性が実測された場合のみbackgroundで行える。

Block categories:

- metadata nodes
- raster tile data
- vector/text resources
- brush/assets
- effect/ICC resources
- command pages
- region/topology data
- previews/thumbnails

Block content encoding/compressionはversioned。

specific codecはこのADRで固定しない。

## 4. Generation Manifest

Projectの有効StateはGeneration Manifestで定義する。

Manifest:

- schema/format version
- root revision
- required block refs
- resource refs
- color/profile refs
- history/snapshot roots as policy permits
- integrity metadata

新Generationを有効化するのは必要Block/Manifestのdurability確認後。

Partial WriteをCurrent generationとして認識しない。

## 5. Recovery Journal

Logical CommitとCrash-protected Commitを分ける。

Recovery packetは:

- transaction identity
- parent/result revision
- required record/block refs
- resources
- integrity data

を持つ。

Durable dependency closureが確認できた地点をRecovery watermarkとする。

数値的な「何秒以内」はBenchmark後にSLAとして決める。

## 6. Streaming long operation

長いStroke/large fillは安定したCommand page/resourceを途中からjournalへ書ける。

ただしterminal commit markerなしで「完了Transaction」として扱わない。

Crash時には:

- completed protected revision
- optional recoverable incomplete interaction

を区別して提示可能にする。

## 7. Autosave

Autosave:
- fixed timerだけに依存しない
- transaction completion
- journal backlog
- idle opportunity
- storage pressure

を考慮する。

AutosaveはUser explicit Saveと同義ではない。

## 8. Portable .illustro

User-facing `.illustro` は単一Containerを目標とする。

Logical sections:

- header/version
- immutable blocks/chunks
- indexes
- one or more manifests/generations
- integrity/footer data

Container内部Encoding（CBOR等）/compression/hashはPrototype後に決める。

Unknown optional dataを可能な限り保持できるforward-compatible schemaを設計する。

## 9. Explicit Save

Explicit Saveは特定Revision Snapshotを固定して非同期生成する。

編集中の新Revisionと混ぜない。

Platform:

- File System Access対応: user file handleへsave
- 非対応: download/export + import workflow
- desktop wrapper: native file API adapter

同じPersistence Coreを使用する。

Direct File System picker/handleはOptional Capabilityとする。showSaveFilePicker等が存在しないBrowser/Deviceでも、Blob export/download、file input/import、platform share adapter等でportable .illustro workflowを成立させる。

## 10. Crash recovery

Startup:

1. validate active generation
2. validate journal suffix
3. stop at last dependency-complete valid record
4. reconstruct latest protected revision
5. report any unprotected recent work honestly

corrupt blockをsilent zero-fillして正常Documentとして開かない。

可能ならprevious good generationへfallback。

## 10.1 Session isolation / concurrent opens

Each open document session uses a distinct mutable working namespace/session identity.

The same portable .illustro source opened twice must not cause both sessions to mutate the same OPFS journal/root concurrently.

Shared immutable blocks may be deduplicated later if proven safe/beneficial, but journal/generation ownership remains isolated.

Recovery entries record session/project/source identity so startup can distinguish concurrent branches.

When saving back to the same external destination, destination version/metadata should be compared where the platform exposes reliable information. External modification conflict must not be silently overwritten.

## 11. Storage pressure

Monitor:

- `navigator.storage.estimate()`
- internal block store size
- cache size
- pending journal

Pressure policy:

1. Derived cache eviction
2. rebuildable preview/thumbnails
3. unprotected alternate history per policy
4. prompt/user decision

Current protected artworkをsilent deleteしない。

## 11.1 Mobile lifecycle

Mobile Browser/Web AppではBackground化後にProcessがfreeze/discard/terminateされる可能性を通常条件として扱う。

- beforeunload / unloadをRecovery correctnessの条件にしない
- normal editing中からjournalを進める
- visibilitychangeでhiddenへ入る際は、既に生成済みのrecovery packetを優先flushする
- hidden後に長い新規save jobが完了する前提を置かない
- pagehide/freezeは追加signalとして利用可能
- resume/reload時はlast protected revisionから復旧する
- Background中はRegion/thumbnail/cache maintenance等を止め、battery/thermalを消費しない

## 12. Export

PNG/JPEG/WebP/TIFF/ORA/PSD等はfixed Revision Snapshotから別Jobとして生成。

Exportが現在編集中Documentをlockし続けないよう published revision sharingを利用する。

PSD/EXR/TIFF等の重いCodecは通常起動時に初期化せず、Import/Export時にlazy-loadする。

## 13. File integrity

Required conceptually:

- length bounds
- checksums/hashes
- version
- dependency verification
- duplicate/invalid references rejection
- decompression limits

Untrusted imported .illustroを安全にparseする。

具体Hash/Compressionは後決定。

## External platform check

OPFSはWeb Workerから利用でき、Dedicated WorkerではSyncAccessHandleによる同期read/write/flushが利用できる。

OPFSはorigin storageで、site data clearで削除され得るためportable fileとは分ける。

## Legacy reference review

過去資料もpartial writeをvalid generationにしない、recovery dependency closure、long transaction streamingを重視していた。

採用。

継承しない:

- CBOR固定
- block size
- checksum/hash
- compression codec
- journal packet size
- recovery 1–2秒数値
- particular writer epoch format

## Validation

Fault injection:

- kill during block write
- kill before/after manifest activation
- corrupt footer/index/block
- storage full
- permission loss
- browser process kill
- device loss during stroke
- save while painting
- export while edit continues
- project > RAM

Success criteria:

- no false-valid partial generation
- last protected state opens
- UI thread not blocked by persistence
- corruption diagnosed
- cache loss never loses artwork


## V1 recovery baseline

Architecture V1 promotionでserved Chromium上のOPFS SyncAccessHandle pathを実検証した。

### Journal contract

- framed
- batched
- bounded
- append-oriented
- durability attempt完了前にprotected acknowledgementしない

Batch bytes / delayはRuntime calibration値であり、Document semanticsにはしない。

### Recovery scan

Open/recovery時:

1. 先頭から連続valid frameをscan
2. 最初のinvalid/truncated frameで停止
3. 後方のmagicを検索して再同期しない
4. valid prefixのみRecovery truthとする
5. invalid tailをtruncate
6. その後appendを再開

### Verified browser sequence

Second-pass served Chromium:

- backend: **opfs-sync-access**
- 8 complete frames write
- reload後8 frames復元
- 11-byte torn tailをinject
- scanner: 8 complete frames + `truncated-frame`
- reload時11-byte tailをtruncate
- sequence 8, 9を正常append
- final frame count 10
- final tail 0

Unit fault injectionでは2番目のFrameを全285 cut positionで切断し、不完全Frameを0/285回受理した。

### Limitation

`flush()`成功を物理電源断に対する絶対durability保証とはしない。

Evidence: [V1 Second Audit](V1_SECOND_AUDIT_EVIDENCE.md)
