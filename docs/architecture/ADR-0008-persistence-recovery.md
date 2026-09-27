# ADR-0008: .illustro Persistence / Autosave / Recovery

## Status

**Accepted for prototype**

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

Working Storeはimmutable blockを基本とする。

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

## 10. Crash recovery

Startup:

1. validate active generation
2. validate journal suffix
3. stop at last dependency-complete valid record
4. reconstruct latest protected revision
5. report any unprotected recent work honestly

corrupt blockをsilent zero-fillして正常Documentとして開かない。

可能ならprevious good generationへfallback。

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

## 12. Export

PNG/JPEG/WebP/TIFF/ORA/PSD等はfixed Revision Snapshotから別Jobとして生成。

Exportが現在編集中Documentをlockし続けないよう immutable state sharingを利用する。

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
