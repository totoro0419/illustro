> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# 過去Illustro資料の参照ポリシー

> 対象資料: `ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt`  
> 位置付け: **Reference Only — Source of Truthではない**  
> 適用範囲: 新Illustroのアーキテクチャ、アルゴリズム、データモデル、性能設計、保存・復旧設計

## 1. 目的

新Illustroは、過去Illustroの実装や設計を再現するために作るのではない。

目的は、

> **過去に得られた知見や失敗回避策を利用しつつ、現在の要求・技術・利用環境を基準に、最良のIllustroをゼロベースに近い形で再設計すること。**

過去資料は設計の答えではなく、見落とし・再調査漏れ・過去の失敗の再発を減らすための参考資料として扱う。

## 2. Source of Truth の優先順位

設計判断では以下を優先する。

1. `docs/PRODUCT_SPEC.md`
2. `docs/FEATURE_SPEC.md`
3. 現在の明示的なユーザー要求
4. 現在の利用環境・対象Platform・性能要件
5. 最新の公式仕様・一次資料
6. 現在のPrototype / Benchmark / 実測結果
7. `ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt` の過去知見

過去資料が上位資料と衝突する場合、**過去資料を優先してはならない。**

## 3. 参照が必須となる領域

以下の設計を行う際は、独立して案を検討した後、一度 `ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt` の関連箇所を確認する。

- Input / Pointer / Stylus処理
- Brush sampling / Stroke reconstruction
- Brush dynamics
- Dab / Tip / Texture
- Random / deterministic processing
- Raster / Tile / Coverage / Compositing
- Selection
- Flood Fill
- Lineart Evidence
- Gap処理
- Region Topology
- Stable Region Identity
- Persistent Fill
- Relative Color
- Color Management / ICC
- Effect evaluation
- History / Undo / Redo
- Persistence
- Recovery
- Memory / Cache
- Scheduling
- GPUとCanonical Stateの関係
- Offline / Collaboration

「先に過去案を読む」のではなく、必ず現在の問題設定と独立検討を先に行う。

## 4. 設計判断の順序

関連領域では原則として次の順序を守る。

1. **現在の要求を確認**
2. **今回解く設計問題を明確化**
3. **過去資料に依存せず最適案を独立検討**
4. **指定資料の関連箇所を確認**
5. **過去案がなぜその設計になったかを評価**
6. **前提条件が現在も成立しているか確認**
7. **現在でも妥当なら候補へ取り入れる**
8. **問題があれば修正または破棄**
9. **必要なら最新の一次資料・公式仕様を再確認**
10. **Prototype / Benchmarkが必要なら実測**
11. **新Illustroとして改めて設計決定**
12. **採用理由・不採用理由を記録**

## 5. 積極的に再利用してよい「上位知見」

以下は具体実装より上位にある設計上の注意点として、積極的に検討対象にする。

### 5.1 Realtime表示と最終結果の意味的一致

Realtime PreviewとCanonicalな最終結果が、単なる近似差を超えて意味的に異なる状態を避ける。

Preview高速化のための近似を行う場合は、どの差が許容されるかを明示する。

### 5.2 Undo / History / Recovery / Saveの分離

以下を同一概念として設計しない。

- Undo / Redo
- History
- Snapshot
- Autosave
- Recovery
- Persistent Save

内部Primitiveを共有する場合でも、責務を分離する。

### 5.3 Canonical Stateと表示Cacheの分離

作品の意味を決定するCanonical Stateと、GPU Texture、Preview Tile、Mip、Composite Cache等の再生成可能なCacheを区別する。

Cacheが失われてもCanonical Stateから作品を再構築できることを基本とする。

### 5.4 SelectionとLineart Regionの分離

SelectionとLineart Regionは似たMask表現を共有できても、意味・寿命・Identity・更新規則が異なる別概念として扱う。

### 5.5 Region問題の分解

Lineart関連は少なくとも以下を分けて考える。

1. Lineart Evidence
2. Boundary
3. Topology
4. Region
5. Stable Identity

単一のFlood Fill結果をそのままPersistent Region Identityとして扱わない。

### 5.6 巨大Canvasと部分更新

大規模Canvasを前提に、全画面再処理ではなくDirty Region / Tile / Partial Updateを基本候補とする。

具体的Tile Size等は固定しない。

### 5.7 GPU実行差と作品の意味

GPU固有の実行順、浮動小数点差、Driver差等に作品のCanonicalな意味を不用意に依存させない。

GPUを高速化に利用しても、必要な再現性・保存性・Undo整合性を損なわない。

### 5.8 Randomの再現性

Brush Scatter、Texture、Particle等のRandom処理は、Undo/Redo、Timelapse、再読込、必要な再計算で結果を再現できる方式を検討する。

具体的PRNGは新たに評価する。

### 5.9 Data Loss防止

Persistence / Recoveryは「通常時に保存できる」だけでなく、Crash、Partial Write、Storage不足、終了タイミング等を考慮する。

### 5.10 長時間制作でのBounded Growth

Memory、History、Cache、Temporary Data、Timelapse等が長時間制作で無制限に増加しない構造を設計する。

### 5.11 Ambiguous Region

曖昧なRegion判断を強引に確定値へ変換しない。

Confidence、Unresolved、User Override等を表現できる方式を検討する。

## 6. 無条件継承を禁止する事項

以下は過去資料に記載されていても、現在の設計へそのまま採用してはならない。

- 固定閾値
- 固定Weight
- 固定Quantization値
- 特定PRNG
- 特定Tile Size
- 特定Worker数・Worker構成
- 特定GPU Pipeline
- 特定CPU/GPU分担
- 特定Cache方式
- 特定Persistence Format
- 特定Collaboration方式
- 旧Illustro用内部API
- 過去互換性だけを目的にした構造
- 過去Hardwareに依存した性能判断
- 過去の未実測性能推定
- 旧UIに依存した内部設計

## 7. 「確定」「LOCK」「完成済み」の扱い

過去資料内の以下の表記は、新Illustroの設計状態を意味しない。

- 確定
- LOCK
- 完成
- PASS
- 採用済み
- Final

これらは**過去の設計時点での状態**としてのみ解釈する。

新Illustroでは再評価後に、現在の仕様書またはArchitecture Decision Recordへ改めて記録された場合のみ現行決定となる。

## 8. 性能値の扱い

過去資料の以下を現行性能保証として使用してはならない。

- FPS
- Input Latency
- Memory Usage
- Worker throughput
- GPU timing
- Tile throughput
- Save time
- Canvas limit
- Layer limit

現在のRuntime、Browser/OS、GPU、CPU、Canvas Size、Color Precision等を定義した上で、新たにBenchmarkする。

## 9. 外部仕様への依存

以下のような外部技術に依存する設計では、必要に応じて最新の公式仕様・一次資料を確認する。

- Pointer Events
- WebGPU
- Canvas / WebCodecs / File System API
- ICC / Color Management
- PWA / Storage
- Worker / SharedArrayBuffer / Atomics
- GPU Texture / format limits
- PSD / OpenRaster等のFile Format
- OS / Stylus APIs

過去資料の説明だけを根拠に最新仕様を断定しない。

## 10. Compatibility方針

旧Illustro実装との内部Compatibilityは、新Architectureを歪める理由にしない。

必要なCompatibilityがある場合は以下を分ける。

- User-facing file compatibility
- Import migration
- Settings/asset migration
- internal API compatibility

内部API互換性は原則として維持必須としない。

## 11. Architecture Decision Recordでの記録

過去資料を参照した重要設計では、Decision Recordに最低限以下を書く。

- Current problem
- Current requirements
- Candidate approaches
- Independent analysis
- Legacy reference findings
- Legacy rationale
- Which assumptions still hold
- Which assumptions no longer hold
- Current evidence / official sources / benchmarks
- Decision
- Why this decision is best now
- Rejected alternatives
- Open risks
- Validation plan

過去案と同じ結論になった場合でも、

> 「過去と同じだから」

ではなく、

> **「現在の要求と証拠から独立に評価しても妥当だったから」**

を採用理由にする。

## 12. 結論

`ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt` は、新Illustroにとって有用なReferenceである。

しかしSource of Truthではない。

新Illustroの設計判断は常に、

- 現在の要求
- 合理性
- 実現可能性
- 性能
- 保守性
- 操作性
- 最新の技術仕様
- 実測結果

を根拠として決定する。
