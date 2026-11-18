# Illustro C03〜C10 — 品質改善統合台帳

> **129件の最新進捗（2026-11-18）：** [PROGRESS-129.md](PROGRESS-129.md) を参照。基準HEAD `523a74aaf4d9`。修正記録あり・完了未認定91件、コード残件明記37件、実装根拠未確認1件。実機独立解決0/129。下の2026-11-17一覧は**統合時点の履歴**であり、最新残件集計ではない。


## 最新確認（2026-11-17 JST、12実装PRを一時統合）

**12/12実装担当PRを `quality/C03-C10-integration` にマージ済み。** これはユーザーの「未完成でも一度統合」指示によるコード集約であり、製品の完成・修正内容の独立検証合格・Android実機合格ではない。**129件の独立解決確認済みは0件のまま**。統合管理PR #75はDraft・未マージ、調査PR #73は調査原本として維持し、mainへのマージは禁止。

| 統合順 | PR | 領域 | マージコミット |
|---:|---|---|---|
| 1 | #76 | C03 レイヤー・保存・履歴 | [ec6e29d8](https://github.com/totoro0419/illustro/commit/ec6e29d821a8a6b56065a887e2e8b799daa4c14e) |
| 2 | #80 | 共通描画・応答 | [d1ffd845](https://github.com/totoro0419/illustro/commit/d1ffd845ab1442d00911555a0fe924fc472dad40) |
| 3 | #77 | C05 素材管理 | [852c2ca7](https://github.com/totoro0419/illustro/commit/852c2ca70c7d48513c7f5eed2a2d0861fc4fdc91) |
| 4 | #82 | C05 参考資料・作品管理 | [e56c3642](https://github.com/totoro0419/illustro/commit/e56c36420f8120ed535df0a5495eaac7d6ebe8e4) |
| 5 | #83 | C04 色選択・スポイト | [9cc816aa](https://github.com/totoro0419/illustro/commit/9cc816aa6dd0f32f85d91db7ac83c7e8347f67e8) |
| 6 | #81 | C08 塗り・線画 | [5597186d](https://github.com/totoro0419/illustro/commit/5597186dd9aaa3f7014836a925a6240d7be28dd3) |
| 7 | #89 | C09 定規・図形・グラデーション | [de877062](https://github.com/totoro0419/illustro/commit/de877062b873b5f136cbd58e5b92cd50b77af7f0) |
| 8 | #84 | C10 文字・フォント | [1a5b453a](https://github.com/totoro0419/illustro/commit/1a5b453a93264b4ce73196fbcb2edf681c190211) |
| 9 | #86 | C07 変形・非破壊編集 | [df0d8301](https://github.com/totoro0419/illustro/commit/df0d83015c724d233b48338cdd92f9fa343891b7) |
| 10 | #88 | C10 ベクター | [14f29aba](https://github.com/totoro0419/illustro/commit/14f29aba105c7cc616f02ea15b650f45311705e3) |
| 11 | #90 | C06 選択・コピー | [0f2db9d4](https://github.com/totoro0419/illustro/commit/0f2db9d4d5d3d5ad044483569b5d13cb77c2101a) |
| 12 | #97 | C04 操作・設定 | [0e2f3451](https://github.com/totoro0419/illustro/commit/0e2f34510d192e2bbea261cda42398e199e8b80c) |

**GitHub上の再確認:** 上記12PRはすべて `merged=true`、対象baseは統合ブランチ、各マージコミットをGitHubで確認。全12PRの変更ファイル名を照合した時点で同一パスの直接衝突0件、各担当PRの `apps/editor/src/main.ts` 変更0件。これだけで機能間の整合性を保証するものではない。

**統合後の検査:** 最終コードHEAD `0e2f34510d19` の [C03-C10 quality integration checks #43974271793](https://github.com/totoro0419/illustro/actions/runs/43974271793) がsuccess。ジョブ内で依存導入、brush生成、Core型・テスト、Brush回帰、Editor単体テスト、Editor型確認・本番ビルドがsuccess。[Core CI #43974279923](https://github.com/totoro0419/illustro/actions/runs/43974279923) もsuccess。**旧`prep:check`には既知の未分類文書による診断失敗が残る**（continue-on-error）。高速連続マージのため、途中コミットの統合CIは後続pushでキャンセルされたものがある。**最終の全体CI成功を正本とする。** Android実機と4000×4000、旧作品の画素一致・保存・復元は未検証。

**未完成として次工程へ引き継ぐ事項:** `main.ts`（統合担当所有）の作品保存、Undo/Redo、参考資料複製と切替、作品固有パレット、マクロ完了通知、図形/塗りのライブ仮表示、ベクターとレイヤー操作の結線。共有描画と保存形式の横断確認、旧DB移行、異常終了からの復旧、高解像度/ペン/指の実機確認。これらの問題IDを解決確認済みに移さない。

**保護の確認:** `main` のHEADは `bdc7135b51033982d90ea5dad104bb04fc107df2` のまま。PR #73の9調査ファイル・129 ID・元分類は改稿せず、その別PRを未マージで維持。問題の追跡はIssue #92、共有調整はIssue #74で継続。

---

最初の確認日時：2026-11-16 JST。詳細ルールは [README](README.md)、調整窓口は [Issue #74](https://github.com/totoro0419/illustro/issues/74)。

## 初期スナップショット（履歴・最新状態は冒頭参照）

| 項目 | 状態 | 根拠・備考 |
|---|---|---|
| 開始点 | `dc28d2d0380352b8d07bcff570def7be8a3db2d4` | `prototype/C03-C10-completion` のGitHub refを直接確認 |
| 統合ブランチ | **作成済み** | `quality/C03-C10-integration`。開始時は上記と同じHEAD |
| 調査記録 | **PR #73（Draft）で維持** | 調査専用ブランチ。統合ブランチに未コピー、未マージ |
| 調査問題ID | **129件すべて一意** | PR #73のREADMEを読み、129 ID・重複0を確認 |
| 調査分類 | A81 / B29 / C19 | 調査時の分類。現在の欠陥確定率ではない |
| 優先度 | P1 55 / P2 74 | 調査時の値 |
| 実装担当PR | **12件提出（すべてDraft）** | PR #76/#77/#80/#81/#82/#83/#84/#86/#88/#89/#90/#97。12担当枠に対応 |
| 取り込み済み実装PR | **0** | 統合作業開始時点 |
| ビルド・回帰検査 | **独立したコード検査成功（1回）** | [Actions #43888071455](https://github.com/totoro0419/illustro/actions/runs/43888071455)、コミット `363d49e`。旧文書分類チェックのみ不合格・診断扱い |
| Androidペン/指実機検査 | **未実施** | CIと別に判定 |
| `main` | **未変更** | 開始時HEAD `bdc7135b51033982d90ea5dad104bb04fc107df2` |

## 12担当PRの受入欄

担当の具体的な割当・PR番号はGitHubで確認できてから記載する。**便宜的な番号に機能を勝手に割り当てない**。

| 担当枠 | PR | 対応領域と状況 | 審査・最新確認 | 統合コミット | 未解決 |
|---|---|---|---|---|---|
| 01 C03 | [#76](https://github.com/totoro0419/illustro/pull/76) | 履歴・保存・復元、**Draft** | CI再確認中。統合側の旧CI比較方法で誤判定した記録あり | — | `main.ts`接続等、部分対応 |
| 02 C04 操作 | [#97](https://github.com/totoro0419/illustro/pull/97) | 操作・設定・マクロ、**Draft** | [CI成功 #43889839213](https://github.com/totoro0419/illustro/actions/runs/43889839213) + [#43889839217](https://github.com/totoro0419/illustro/actions/runs/43889839217) | — | マクロの非同期完了通知、実機操作検証 |
| 03 C04 色 | [#83](https://github.com/totoro0419/illustro/pull/83) | 色選択、**Draft** | [CI成功 #43889333899](https://github.com/totoro0419/illustro/actions/runs/43889333899) | — | パレット保存経路と採色高速化は未結線 |
| 04 C05 素材 | [#77](https://github.com/totoro0419/illustro/pull/77) | 素材庫、**Draft** | [CI成功 #43889164943](https://github.com/totoro0419/illustro/actions/runs/43889164943) | — | DB旧版移行の実データ検証、依存先の確認 |
| 05 C05 参考資料 | [#82](https://github.com/totoro0419/illustro/pull/82) | 資料・作品管理、**Draft** | CI進行中（取得時点） | — | `main.ts`で複製・切替・通知の接続が必要 |
| 06 C06 | [#90](https://github.com/totoro0419/illustro/pull/90) | 選択・貼付、**Draft** | 最新ヘッドのCI未確認 | — | 描画側の共通改修が必要 |
| 07 C07 | [#86](https://github.com/totoro0419/illustro/pull/86) | 変形、**Draft** | [CI成功 #43889360689](https://github.com/totoro0419/illustro/actions/runs/43889360689) | — | 統合時の共有接続、画素の一致は未確認 |
| 08 C08 | [#81](https://github.com/totoro0419/illustro/pull/81) | 塗り・線画、**Draft** | [CI成功 #43889318585](https://github.com/totoro0419/illustro/actions/runs/43889318585) | — | 塗りのライブ表示・レイヤー除外等未完成 |
| 09 C09 | [#89](https://github.com/totoro0419/illustro/pull/89) | 定規・図形・グラデーション、**Draft** | [CI成功 #43889203199](https://github.com/totoro0419/illustro/actions/runs/43889203199) | — | 担当12の描画経路・`main.ts`接続が必要 |
| 10 C10 ベクター | [#88](https://github.com/totoro0419/illustro/pull/88) | ベクター、**Draft** | [CI成功 #43889466534](https://github.com/totoro0419/illustro/actions/runs/43889466534)（別のCIは進行中） | — | `main.ts`で既存層利用・同一Undo・元図形非表示が必要 |
| 11 C10 文字 | [#84](https://github.com/totoro0419/illustro/pull/84) | 文字・フォント、**Draft** | [CI成功 #43889205565](https://github.com/totoro0419/illustro/actions/runs/43889205565) | — | Issue #78/#79の描画・共通データとの連携 |
| 12 共通描画 | [#80](https://github.com/totoro0419/illustro/pull/80) | Worker/仮線・軽量化、**Draft** | CI再確認中。統合側の旧CI比較方法で誤判定した記録あり | — | 実機速度・競合動作の検査 |

## 2026-11-16 JST — 11件の実装PR受付・初回レビュー

- **12担当すべての実装PR**を実際のGitHubで確認。いずれも `quality/C03-C10-integration` がbase、初回確認ではDraft。Draftを最終承認の意味として扱わず、**製品コードの取り込みは0件**。
- PR #76, #80, #81の最初のCI失敗は、統合管理側の拒否ルールがPR自身の変更でなく両tipの差分を判定していたための誤判定。**3点（merge-base）差分に修正：`2387a4f6f8e9c1bd333b728b9778ccfeb43e0d4c`**。修正前CIの失敗は実装不具合とみなさない。修正後にPRヘッドを更新して再検査する。
- 更新後のPR #81ほかでCI成功例あり。ただしCI成功だけで作画・保存・4000px画質・Android実機の合格とは断定しない。
- 現在の統合HEAD `2387a4f6` は [CI #43889067281](https://github.com/totoro0419/illustro/actions/runs/43889067281) 成功。旧 `prep:check` の既存問題は診断のままで成功扱いしない。
- #86の古い差分表示にはCI設定ファイルが見えるが、最新統合HEADとのGitHub比較では`apps/editor/src/assets/linkedImages.ts`と`transform/*`のみが差分。引き続き最新コミットで再照合する。
- 共通作業の衝突は **PRの変更ファイルだけでなく、連携箇所**（`main.ts`、共通描画、保存形式、ブラシの表示）も見て解消する。C10文字の依存Issue #78/#79、C07の #85 も追跡する。

## 12担当のPR到着（追加確認）

PR [#97](https://github.com/totoro0419/illustro/pull/97) を新たに確認。C04操作・設定・マクロの担当で、変更ファイルは `apps/editor/src/ui/*`、専用CI、`docs/quality-fixes/C04-operation-ui.md`。統合管理所有の `main.ts` と監査原本は変更していない。現行ヘッドで自動検査成功（#43889839213 / #43889839217）を確認。**全12件の提出は確認済み、全12件Draft、統合実績は0件**。

提出済みと全機能完成・実機合格は別判定。C04-002では共通操作の完了通知を統合担当が接続する必要があるため、現時点でその問題IDは解決確認済みとしない。

## 12件の変更ファイル同士の重複検査

2026-11-16 JST、PR #76/#77/#80/#81/#82/#83/#84/#86/#88/#89/#90/#97 から、変更ファイル名をGitHubで各PRごとに再取得して相互照合。**12PR間で完全に同じパスの変更は0件**。これは**ファイルの直接競合が現時点で見つからない**ことのみを示し、動作・データの安全性や共有接続不要を意味しない。

特に依存関係は残る：`main.ts` の作品保存・パレット・資料複製・レイヤー操作・定規・マクロ等の呼出し、`brushSurface.ts` による選択/定規/塗り仮表示、Coreの共通データ互換性。#86のPR変更リストに古い統合CIワークフローへの差分が見えているため、統合時は最新共通祖先からの差分だけを取り込む。**統合専用CIを上書きしない**。

## 更新ルール

- PR提出→差分・対象ID・依存関係確認→必要な修正依頼→CIと関連回帰→統合→独立検証待ち、の順に更新。
- 対応済み数は**統合済みかつ確認根拠がある問題ID**のみ。PR説明の自己申告を根拠に129件から減らさない。
- 検査実行時はコミットSHA、実行コマンド、結果へのリンクを追記する。問題があればPR/Issueへ理由と差し戻し条件を記載する。
- 調査台帳そのものを改稿・消去して帳尻を合わせない。

## 2026-11-16 JST — 追加の実地確認

### 作業ブランチの存在と衝突確認

開始点 `dc28d2d` に対する差分をGitHub上で確認した時点で、以下の**11実装候補ブランチ**が存在した。各々のコードが完成・検証済みという意味ではない。今回の品質改善PRは未提出・未確認のため取り込みは**0件**。

| 確認されたブランチ | 比較時の追加コミット数 | `main.ts` | 注意点 |
|---|---:|---|---|
| `quality/C03-layer-history-save-2026-11-16` | 5 | 無変更 | PR待ち |
| `quality/C04-color-picker-fixes-2026-11-16` | 3 | 無変更 | PR待ち |
| `quality/C04-operation-ui-2026-11-16` | 3 | 無変更 | PR待ち |
| `quality/C05-assets-2026-11-16` | 3 | 無変更 | PR待ち |
| `quality/C05-reference-works-2026-11-16` | 3 | 無変更 | PR待ち |
| `quality/C06-selection-edit-2026-11-16` | 6 | 無変更 | PR待ち |
| `quality/C07-transform-nondestructive-fixes` | 4 | 無変更 | PR待ち |
| `quality/C08-fill-line-regions-2026-11-16` | 3 | 無変更 | PR待ち |
| `quality/C09-ruler-shape-gradient-2026-11-16` | 2 | 無変更 | PR待ち |
| `quality/C10-text-font-2026-11-16` | 3 | 無変更 | **統合担当用READMEとの重複** |
| `quality/C10-vector-2026-11-16` | 2 | 無変更 | **統合担当用README・STATUSとの重複** |
| 12番目の作業ブランチ | 未確認 | 未確認 | 割当・作業範囲を推測しない |

**重複への対応:** C10の2ブランチには統合管理文書への変更が含まれる。Issue #74で、実装PRの差分からこれらを除外するよう共有済み。統合ブランチへの実装マージはしていない。

### 自動検査の確認

- [初回CI #43887710078](https://github.com/totoro0419/illustro/actions/runs/43887710078)：失敗。旧 `scripts/check-baseline.mjs` が、開始元に既にある `docs/development/PROTOTYPE_PROGRESS.md` を「未分類文書」と判定して停止。
- [コード検査CI #43888071455](https://github.com/totoro0419/illustro/actions/runs/43888071455)：GitHub上でジョブの結果を再取得。**Core 44テスト、Brush 259テスト、Editor 158テスト、Editorビルドが成功**。いずれも今回の実装PRをマージする前の統合管理コミット `363d49e` に対する結果。
- 同CIの `prep:check` は**引き続き失敗**。この旧文書分類チェックは成功判定に含めず、失敗を記録したままその他のコード検査を継続する設定に変更した。設計文書への無関係な書き換えで見かけ上のPASSにしない。
- `main.ts`、統合専用README・STATUS、調査正本フォルダーへの実装PRからの変更を拒否するCI検査を追加した。**実装PR上での拒否動作はまだ未検証**。
- Android実機のペン・指、保存の実ファイル試験、実際の12担当PR統合後の動作は**未確認**。

最新CIの結果はGitHub Actionsで確認すること。上記の成功記録は、その後のコミットまで無条件に合格とするものではない。

## 2026-11-17 00時台 JST — 12担当の最新HEAD・CI・差分再監査

GitHubの各PRメタデータ、全12件の変更ファイル、各HEADに結びつくActions実行、統合CI定義を個別に再取得した。**全12件はbase=`quality/C03-C10-integration`、Draft、未統合**。PR #73はDraft・未マージ、#75もDraft・未マージ。実装PR間の**変更パス完全一致は0件**。ただし、保存・Undo/Redo・描画・main.tsへの結線という機能的依存は残る。

| 担当 | PR | 照合したHEAD | 統合CI（当該HEAD） |
|---|---|---|---|
| 01 C03 | #76 | `5aa5d79e` | [43891002825](https://github.com/totoro0419/illustro/actions/runs/43891002825) success（Core CI [43891002935](https://github.com/totoro0419/illustro/actions/runs/43891002935)もsuccess） |
| 02 C04操作 | #97 | `f02aebcb` | [43891226096](https://github.com/totoro0419/illustro/actions/runs/43891226096) success（専用 [43891226353](https://github.com/totoro0419/illustro/actions/runs/43891226353) success） |
| 03 C04色 | #83 | `565871e7` | [43889333899](https://github.com/totoro0419/illustro/actions/runs/43889333899) success |
| 04 C05素材 | #77 | `f246fd6f` | [43889164943](https://github.com/totoro0419/illustro/actions/runs/43889164943) success |
| 05 C05資料 | #82 | `c1a8a21a` | [43890670333](https://github.com/totoro0419/illustro/actions/runs/43890670333) success |
| 06 C06 | #90 | `d762bec2` | [43891183451](https://github.com/totoro0419/illustro/actions/runs/43891183451) success |
| 07 C07 | #86 | `c6025f52` | [43892152213](https://github.com/totoro0419/illustro/actions/runs/43892152213) success |
| 08 C08 | #81 | `2ad34b56` | [43891331270](https://github.com/totoro0419/illustro/actions/runs/43891331270) success |
| 09 C09 | #89 | `9786b2ba` | [43890453702](https://github.com/totoro0419/illustro/actions/runs/43890453702) success |
| 10 C10ベクター | #88 | `93691591` | [43890054556](https://github.com/totoro0419/illustro/actions/runs/43890054556) success（Core CI [43890054545](https://github.com/totoro0419/illustro/actions/runs/43890054545) success） |
| 11 C10文字 | #84 | `c57d6007` | [43889205565](https://github.com/totoro0419/illustro/actions/runs/43889205565) success |
| 12 共通描画 | #80 | `9b0a048c` | [43889547783](https://github.com/totoro0419/illustro/actions/runs/43889547783) success |

**注意**：上記successは指定コミットのCIワークフロー結果であり、旧`prep:check`は既存の未分類`docs/development/PROTOTYPE_PROGRESS.md`により失敗し、`continue-on-error`で診断扱い。**prep:check自体は不合格**。また12件をまとめた統合後のCI、保存実データ、Androidペン/指、4000×4000画素の性能・画素一致は**未検証**。

最新PR差分で、実装担当による`apps/editor/src/main.ts`、`docs/quality-integration/`、`docs/quality-audit/`の変更は**0件**。過去に懸念した#86の統合専用CIファイル変更も最新PR差分には存在しない。統合CIはmerge-baseの3点比較を使用し、#86の最新HEADで成功したため、Issue #98の過去の誤検出を現行実装の失敗とみなさない。

**受入保留・統合0件**：全件Draftで、#76の旧作品/保存/Undo、#77のIndexedDB v1→v2実データ移行、#82の作品切替・複製時の保存接続、#83の作品固有パレット接続、#81のライブ仮表示、#88のベクターと通常描画・同一Undo、#97のマクロ非同期完了通知など未解決の横断依存がある。成功したPR単独CIを、統合後の完成や129件の独立解決確認と混同しない。次回もHEAD変更を検知したら再照合し、必要な回帰条件が満たされたPRだけを**1件ずつ**統合する。PR #73の9原本・129 ID・A/B/C（81/29/19）は不変更。


## 2026-11-17 — C03残修正・初回実装（個別再判定）

- 対象：C03-001〜013の13件、調査原本はDraft PR #73（不変更）。初期分類A/B/CはIssue #92と原本で維持。
- 2026-11-17に統合HEAD `65ddac0c` から再開し、[実装修正 `79ddf482`](https://github.com/totoro0419/illustro/commit/79ddf4826c292baacd999a5834cdf27f93318915) および [追加修正 `27a43e8d`](https://github.com/totoro0419/illustro/commit/27a43e8d4d0e29adbe21858932f17be8e0873dd0) を `quality/C03-C10-integration` に反映。**`main`は不変更**。
- 初回修正：C03-002＝自由形の選択マスクを矩形の有無だけで拒否しない・C06の変更とボタン表示を連動、C03-003＝履歴ブラシに画素単位の選択マスクを渡す、C03-004＝ダウンロード開始と保存先検証完了を区別、C03-006＝マスク適用の可否判定を画面と処理で共通化。
- 検査：[79ddf482統合CI](https://github.com/totoro0419/illustro/actions/runs/44017162526) success、[同Core CI](https://github.com/totoro0419/illustro/actions/runs/44017168594) success。[27a43e8d統合CI](https://github.com/totoro0419/illustro/actions/runs/44017370244) と [Core CI](https://github.com/totoro0419/illustro/actions/runs/44017376670) は別コミットの検査のため、最新結果を必ず再確認する。旧 `prep:check` の文書分類診断は従来の未解決項目。
- **自動検査≠実機確認**。Androidペン/指・4000×4000作品・旧作品の実保存復元と画素一致は未確認。独立解決確認済みは依然 **0/13**。

| ID | この時点での状態 | 根拠・次の作業 |
|---|---|---|
| C03-001 | 修正実装済み・検証待ち | PR #76変形レイヤー複製。実作品/Undo/Redo/旧形式と画素の確認待ち |
| C03-002 | 修正実装済み・検証待ち | `79ddf482`、`27a43e8d`。C06選択連携と単体テスト。実画面の自由選択確認待ち |
| C03-003 | 修正実装済み・検証待ち | PR #76で履歴ブラシ単体テスト、`79ddf482`でmain.ts接続。画素境界と実操作の確認待ち |
| C03-004 | 修正実装済み・検証待ち | PR #76で保存先読戻し、`79ddf482`で結果表示区別。ブラウザ別保存検証待ち |
| C03-005 | 修正実装済み・検証待ち | PR #76で復元候補の題名を更新。名称変更→終了→復元の実データ試験待ち |
| C03-006 | 修正実装済み・検証待ち | `79ddf482`、`27a43e8d`。UIと実処理の共通条件/テスト。実操作確認待ち |
| C03-007 | 修正中 | PR #76で重複プレビュー軽減。大きな画像の描き直し/比較PNGの性能が残る |
| C03-008 | 修正中 | PR #76でWorker失敗検知等を修正。終了前保護の完了は保証不能、実機障害復帰待ち |
| C03-009 | 未対応 | 高画質作品の保存負荷の疑い。安全な読戻し検証を維持し計測してから判断 |
| C03-010 | 修正中 | PR #76で描線データ照合。旧作品画像・不透明度の画素比較が残る |
| C03-011 | 未対応 | 遠いレイヤーのグループ化。順序変化が起きない安全なUXの検討が必要 |
| C03-012 | 未対応 | 履歴比較の画面占有と全解像度PNG生成。非遮断・段階表示方式を検討 |
| C03-013 | 未対応 | レイヤー一覧の全作り直し。100レイヤー等の実測で根拠を確かめて修正 |

**次回開始点：** `quality/C03-C10-integration` の最新HEADと本表/Issue #92/#96を照合し、C03-007〜013の残件・C03-001〜006の不足試験から再開。合格や完了の推定は禁止。

### 2026-11-17 C03自動検査・失敗修復の追補

- 追加連携コミット [`27a43e8d`](https://github.com/totoro0419/illustro/commit/27a43e8d4d0e29adbe21858932f17be8e0873dd0) は、Core CI [44017376670](https://github.com/totoro0419/illustro/actions/runs/44017376670) success・Editor単体試験233件 successだったが、[統合CI 44017370244](https://github.com/totoro0419/illustro/actions/runs/44017370244) は **failure**。共通条件関数へ移した際に、`main.ts` で `drawing` のnullをTypeScriptが否定できず TS18047（4箇所）でビルド失敗。
- 修正コミット [`f2eee15d`](https://github.com/totoro0419/illustro/commit/f2eee15dd0bca3450c194e6318fb1c06aead2348) で描画画面の有無を先に検査。**同コミットの[統合CI 44017534449](https://github.com/totoro0419/illustro/actions/runs/44017534449) success・[Core CI 44017540469](https://github.com/totoro0419/illustro/actions/runs/44017540469) success** をGitHub Actionsで再確認。以前の失敗をなかったことにはしない。
- 実機・4000px・旧作品の実データについては未確認のまま。C03の6件（001〜006）は「修正実装済み・検証待ち」であり「解決確認済み」ではない。


## 2026-11-17 — C03残修正・第2回

- 作業起点：`6a08351a22f9e3f36f48b9de1dcecf98541f817c`。今回の修正範囲：C03-007、C03-009、C03-011、C03-012、C03-013。**全体完成とは判定しない**。
- [`84751ad5`](https://github.com/totoro0419/illustro/commit/84751ad5e58f29c5ec71c771d775c2735161bfe6)：**C03-011** 離れたレイヤーを一括グループ化。重なり順変更を明示して同意を要求し、既存グループを割る場合は拒否。1回の履歴操作、Undo/Redoと保存復元の自動テスト追加。
- [`2daf4e04`](https://github.com/totoro0419/illustro/commit/2daf4e04b0eaf4327ee4cf864a9796b68b23b77a)〜[`fbbd1a98`](https://github.com/totoro0419/illustro/commit/fbbd1a988561a40a406bc18606ea052b7004b8dc)：**C03-007/012** 履歴サムネイル・比較プレビューの画像縮小処理を共通化。通常比較は最大1600×1200相当の画像に制限（作品の比率は維持）。原寸比較は明示操作で利用可能。履歴パネルを非モーダル化（開いたまま描画可能）。画面表示・レイアウトは実機確認待ち。**元画像の全解像度レンダリングは残り、GPU/メモリ負荷が完全に解消したわけではない**。
- [`13038451`](https://github.com/totoro0419/illustro/commit/1303845168f8d4d28dcc9b42e246699297c99887)〜[`78f6e911`](https://github.com/totoro0419/illustro/commit/78f6e9119dd291cef2660054935e96967b485162)：**C03-009** 保存Workerから戻った専用のバイト配列を余分に複製せず使用。配列の一部分だけを参照する場合は正しい範囲だけをコピー。ブラウザの保存先書込み後のSHA-256読戻し照合は維持。保存速度・最大メモリは未実測。
- [`40ed2ad9`](https://github.com/totoro0419/illustro/commit/40ed2ad93f3656245851d391adbae67bc873eccf)〜[`321d2486`](https://github.com/totoro0419/illustro/commit/321d2486613ba9b85dd79a1a23f698e0da87495f)：**C03-013** 描線だけが追加されたときレイヤー一覧の大量の行・操作ボタンを作り直さない。レイヤー名・表示状態・選択・グループ・絞り込み等が変われば行を再生成。テスト追加。100レイヤーの体感速度は未測定。
- **検査（コード最終コミット `321d2486`）**： [統合CI #44031605754](https://github.com/totoro0419/illustro/actions/runs/44031605754) **success**（Core 51 / Brush 259 / Editor 240テスト、Editor TypeScript型検査・本番ビルド成功）、[Core CI #44031612549](https://github.com/totoro0419/illustro/actions/runs/44031612549) **success**。従来の`prep:check`は未分類文書を検出するため**診断不合格**、その他の検査合格と混同しない。前後の連続pushによるCI cancelledは最終HEADの検査ではない。
- **注意**：上記のテストはコード自動検査のみ。Androidタブレットでの実作品の保存・復元、4000×4000画素の応答、ペン・指、旧形式の画素一致、履歴表示の視覚回帰は未確認。
- 元調査PR #73の129件のID・A/B/C分類・本文は不変更。 `main`へのマージなし。

### C03全13件・第2回終了時の状態

| ID | 状態 | 今後必要な作業・未確認 |
|---|---|---|
| C03-001 | 修正実装済み・検証待ち | 変形複製の旧作品・実機 |
| C03-002 | 修正実装済み・検証待ち | 自由選択を使った実操作 |
| C03-003 | 修正実装済み・検証待ち | 選択境界の画素・Undo |
| C03-004 | 修正実装済み・検証待ち | ブラウザ別保存の実ファイル |
| C03-005 | 修正実装済み・検証待ち | 名称変更からの復元 |
| C03-006 | 修正実装済み・検証待ち | マスク操作の端末UI |
| C03-007 | 修正中 | プレビュー軽量化を実装。全解像度レンダリングと実測が残る |
| C03-008 | 修正中 | 停止直前の保護完了の保証不可。通常時の保護・異常復旧を実機検証 |
| C03-009 | 修正中 | 不要コピー削減は実装・テスト済み。大容量保存の時間・メモリ未測定 |
| C03-010 | 修正中 | 描線データ照合は実装済み。旧作品の表示画素一致が未確認 |
| C03-011 | 修正実装済み・検証待ち | 一括グループ化の端末操作・既存グループの実データ |
| C03-012 | 修正実装済み・検証待ち | 非遮断比較の画面配置・大きい作品の体感 |
| C03-013 | 修正実装済み・検証待ち | 大量レイヤーで表示更新と速度を確認 |

**現時点：C03 9/13件が修正実装済み・検証待ち、4/13件は部分修正または追加検証・改善中。独立解決確認済み0/13。**
次回はC03-007/008/009/010の未完了部分と、001〜006/011〜013の作品データ・実機検証を継続。C03の状態を全面再照合するまでC04へは移行しない。


### 2026-11-17 第2回追補：C03-008 画面終了前の保存保護

- [`70042c1c`](https://github.com/totoro0419/illustro/commit/70042c1cbdfeb281c8996ceef8cf96a2211d0b06)〜[`630dc745`](https://github.com/totoro0419/illustro/commit/630dc745b245656de72a84927f4fa5c156daf6d6) で、書き込み中・保護待ち・保護失敗のままブラウザを閉じようとしたときに、対応するブラウザの確認機能を使う補助措置を追加。保護が完了しているときは警告しない。登録した通知はサービス終了時に解除。
- 単体テスト追加。[統合CI #44031980775](https://github.com/totoro0419/illustro/actions/runs/44031980775) **success**、[Core CI #44031987731](https://github.com/totoro0419/illustro/actions/runs/44031987731) **success**（コード最終コミット `630dc745`）。
- **C03-008は引き続き「修正中」**。ブラウザの強制終了・OSによるアプリ破棄・一部Androidで終了警告が起動しないことがあり、すべての終了経路で保護を保証する仕組みではない。復元の実データ・未保存状態の端末試験が残る。
- 前掲のC03個別状態表のC03-008の最新内容には、この補助警告と未検証事項を加えて読むこと。C03の修正実装済み・検証待ち9/13、修正中4/13、独立解決確認0/13という集計は不変。


## 2026-11-17 15時台 JST — C03追加修正の統合監査

- 直前の確認HEAD `6a08351a22f9e3f36f48b9de1dcecf98541f817c` から、追加コードHEAD `02de9844f095cf06a3a21a33dd6bca3604ccd2fe` まで **23コミット、19変更パス**をGitHubの比較APIで確認。12実装PRは引き続きすべて `merged=true`、新規PRなし。統合先は `quality/C03-C10-integration` のみで、`main` は `bdc7135b51033982d90ea5dad104bb04fc107df2` と同一。
- C03-007/012：履歴プレビューの縮小・非モーダル表示に加え、`HistoryPreviewQueue` による画像生成の直列化と、利用者が開始する比較をサムネイルより優先する処理を追加。GPU/メモリ負荷や実機応答の合格は未確認。
- C03-009：保存用バイト列の不要コピーを減らし、書き込み後の照合を維持。C03-011：離れたレイヤーの一括グループ化に安全条件とテストを追加。C03-013：描線追加時のレイヤー一覧再構築を抑制。C03-008：終了前の未保護状態警告を追加。ただし強制終了・OS破棄での保存保証はできない。
- C03-010関連：`visualIntegrity.ts` に描画済みRGBAのSHA-256照合補助とテストを追加。`openLegacy.ts` に旧描線の比較用プレビューを構成する処理を追加。**旧作品との実際の表示画素一致を検証した証拠ではなく、解決確認済みには移さない**。
- コード最終の既知CI：`630dc745` に対応する [統合検査 #44031980775](https://github.com/totoro0419/illustro/actions/runs/44031980775) のCore/Editor試験・型検査・本番ビルド成功をGitHubジョブで確認。その後の追加コミットがあるため、**この成功を現在のHEAD全体の検査成功としない**。途中コミット `c2b57b30c22d121030e9e397c6724f619198d35d` の [Core CI #44034554294](https://github.com/totoro0419/illustro/actions/runs/44034554294) はsuccess。追加コードHEAD `02de9844` の [Core CI #44034627180](https://github.com/totoro0419/illustro/actions/runs/44034627180) は**後続確認でsuccess**。ただし**同HEADのBrush/Editor全体回帰と本番ビルド成功は未確認**。
- C03の台帳上の状態は9/13「修正実装済み・検証待ち」、4/13「修正中」。独立解決確認済みはC03 0/13、全体0/129。Androidペン/指、4000×4000、旧作品の実データ保存・復元・画素一致は未検証。
- 旧 `prep:check` は既存の未分類文書により診断失敗するためPASSではない。PR #73の調査原本9ファイル、129 ID、A/B/C（81/29/19）を変更せず、PR #75はDraft・未マージ。Issue #92本文には統合前の古い集計が残るため、最新の統合状態と混同しない。


## 2026-11-17 — C03残修正・第3回（実装と検査）

**起点**：`cdddccfb`、コード最終HEAD [`9c3bd378`](https://github.com/totoro0419/illustro/commit/9c3bd3781ceaf70d06275411df445e3dc2b9e2e5)。

- **C03-007**：[`0400dd68`](https://github.com/totoro0419/illustro/commit/0400dd687cbc21b13ef319739c16bb1aa56b94bc)〜[`efe4f533`](https://github.com/totoro0419/illustro/commit/efe4f5330f5cb8748fa572bf61d466a516b1fa42)。履歴プレビュー生成を同時1件に制限。明示操作の比較は待機中のサムネイルより優先。GPU失敗後にも次のプレビューが止まらないテスト追加。**未完了**：`renderFrozenArtwork`は元作品の全画素を生成する。brush-rtのWebGL2 `read(surfaceKey)`（`packages/brush-rt/src/renderer.mjs:610`）およびWebGPU `read(surfaceKey)`（同:680）はどちらも全解像度の画素配列を確保する。このため縮小専用経路の本質的な削減には共通レンダラーの設計変更が必要。描画の色・不透明度・クリッピング・マスクを犠牲にする近似計算は勝手に導入しない。
- **C03-008**：[`4431f175`](https://github.com/totoro0419/illustro/commit/4431f175937f06b823831c609fc024417ba695d8)〜[`c8ab6cce`](https://github.com/totoro0419/illustro/commit/c8ab6ccea9eeb928f91c231b76b3d04bc5819261)。履歴Undo/Redoの復元先をworkerが永続記録するまで、作品切替・明示的な保護完了判定を待機。既存データ保護と相互待ちにならないよう、履歴の書込み専用待機と全保護待機を分離。追加／失敗した書込みを待つテスト追加。終了直前の補助警告は前回実装済み。OS強制終了の防止は不可能なため、実機の復元条件を未確認として残す。
- **C03-009**：[`5b3320f0`](https://github.com/totoro0419/illustro/commit/5b3320f019ee0537b1904dbc107135683e0ccfa1)〜[`99895abe`](https://github.com/totoro0419/illustro/commit/99895abe214857fa64f491714ad4721087f60ff3)、[`9c3bd378`](https://github.com/totoro0419/illustro/commit/9c3bd3781ceaf70d06275411df445e3dc2b9e2e5)。外部保存後の読み戻しは4MiBずつ取得し、各区間のSHA-256を順番込みで最終ハッシュにまとめて照合。外部ファイルの事前変更検出も同じ方式。**照合は省かず、全ファイルを丸ごと新しい配列に取り込まない**。途中の画素相当部分の改変を検出するテスト、64MB（4000×4000 RGBA相当）の仮想ファイルで1回の読込みサイズを4MiB以下とするテストを追加。実機の所要時間／ピークメモリは未測定。
- **C03-010**：[`58a3518f`](https://github.com/totoro0419/illustro/commit/58a3518fdc2550b6fc0387e04b4119ff619f8da9)〜[`02de9844`](https://github.com/totoro0419/illustro/commit/02de9844f095cf06a3a21a33dd6bca3604ccd2fe)。旧形式移行後の比較ボタンで、移行前・移行後を元の描画処理で生成した全画素（RGBA）のSHA-256を比較。一致／不一致を画面表示。描線数だけでは判定しない。旧画像を生成するときに、移行後のラスターデータを混ぜないよう分離。透明度・色の差、長さ違い、配列の一部の入力等のテスト追加。**確認は比較ボタンを押した場合のみ**。旧実作品の見た目とペン種別別比較は実機・実ファイル未検証。
- **検査**：[統合CI #44035281438](https://github.com/totoro0419/illustro/actions/runs/44035281438) **success**。Core **51** テスト・Brush **259** テスト・Editor **253** テスト、型検査と本番ビルド合格。[Core CI #44035287689](https://github.com/totoro0419/illustro/actions/runs/44035287689) **success**。従来の`prep:check`は既存の `docs/development/PROTOTYPE_PROGRESS.md` を未分類扱いする診断不合格で、実装テストとは区別。
- **境界条件**：Android端末での強制終了後復元、古い作品ファイル・旧ブラシ画像の一致、4000×4000画素での速度・メモリ・画面・ペン/指は実機未確認。`main`は未変更。PR #73監査原本・129 IDとA/B/C分類は変更しない。

### 第3回の最新判定（第2回の表に優先）

| C03問題ID | 状態 | 保留中の確認 |
|---|---|---|
| 001〜006 | 修正実装済み・検証待ち | 前回から変更なし。実データ・端末の動作確認 |
| 007 | 修正中 | 全解像度の描画を伴わずに履歴画像を生成する方式・性能実測 |
| 008 | 修正実装済み・検証待ち | 終了／異常終了／復旧の実機試験（OS終了時の保証とは区別） |
| 009 | 修正実装済み・検証待ち | 大容量・保存衝突の端末検証、速度・メモリ実測 |
| 010 | 修正実装済み・検証待ち | 実旧作品を移行した画像一致・違いの実検査 |
| 011〜013 | 修正実装済み・検証待ち | 前回から変更なし。UI・速度・実機確認 |

**集計：12/13件は修正実装済み・検証待ち、1/13件（007）は修正中、独立した解決確認済み0/13。** `main`未マージ。次回はC03-007の共通GPU描画の限定的な設計改善を検討し、まず既存方式を壊さずテスト可能な方法を設計・検証する。旧作品・Android・4000pxの実検査なしでC03全体の解決確認はしない。


## 2026-11-17 16:56 JST — C03-007タイル描画追加の統合確認

- 直前のC03第3回コードHEAD `9c3bd378` と確認時HEAD `864004462aaf99c67c2c3174b493da6ec3d2f3e1` をGitHubで比較し、**10コミット・7変更パス**を確認。追加は履歴縮小プレビュー用の `export/tiledPreview.ts`・テスト、`basicExport.ts` のタイル別合成、brush-rtのタイル読戻し、`artworkHistoryView.ts` の優先利用と失敗時の従来処理へのフォールバック等。通常の原寸書き出し経路は維持されている。
- **C03-007は修正中のまま**。全画素を一括読戻しせず縮小用にタイル処理する実装は追加されたが、GPUメモリ、レイヤー/マスク/ブレンドの画素一致、Android実機の速度・画面について合格を確認していない。新テストがあることと実機合格は別。
- HEAD `86400446` の [Core CI #44042528176](https://github.com/totoro0419/illustro/actions/runs/44042528176) は **success**。**同HEADの統合Core/Brush/Editor全回帰・本番ビルド成功は未確認**。旧 `prep:check` は既存の未分類文書による診断不合格のまま（PASSではない）。
- 12担当の実装PRはGitHubの個別メタデータで **12/12 merged=true**・baseは統合ブランチ。PR #75・調査PR #73はDraft・未マージ、調査原本9ファイルを維持。mainは固定HEAD `bdc7135b` と比較して identical。**独立解決確認済み0/129**。C03の集計は第3回の **12/13修正実装済み・検証待ち、1/13修正中** を維持。


## 2026-11-17 — C03 第4回：履歴サムネイルの区画単位・低メモリ描画

- **対象**：C03-007。前回までの「縮小表示なのに元の絵全体の画素配列をCPUに取り込む」問題を、履歴サムネイルの実装段階で改善。作業開始 `ccb4a37e`、コード最終コミット [`86400446`](https://github.com/totoro0419/illustro/commit/864004462aaf99c67c2c3174b493da6ec3d2f3e1)。
- [`8caf3d68`](https://github.com/totoro0419/illustro/commit/8caf3d68edb31ff8a88a836d190603fbf3a22443)：GPU描画の原データを、従来のキャンバス全量読み戻しではなく、**128×128画素単位**で読み出すAPIをWebGL2とWebGPUに追加。すでに確定した描線のGPU再生方式は変更しない。サムネイルの色・透明度は元画像をレイヤー順に合成した後、縮小画像に加算する。境界・透明度・大判入力に関する単体テストを追加。
- [`b92725ef`](https://github.com/totoro0419/illustro/commit/b92725efd0b20d001cdc3799fd27e246d533dfdf)〜[`63a8ef5c`](https://github.com/totoro0419/illustro/commit/63a8ef5cd33366e202e143742e46b006380ddea6)：新しいAPIの型宣言と厳密な配列処理を修正。初版 [統合CI #44041635558](https://github.com/totoro0419/illustro/actions/runs/44041635558) はEditorの型検査で**失敗**したため修復。失敗をなかったことにしない。
- [`2fba4e2d`](https://github.com/totoro0419/illustro/commit/2fba4e2d4b3e907f9ab5843a49a3e16c87c68c1f)：区画読み取りに失敗するGPU・端末では従来の正確な描画方式へ戻す。履歴の画像が取れない場合の回復策。
- [`89cba8de`](https://github.com/totoro0419/illustro/commit/89cba8de64022188db1b3c5dd88de8715e59d65c)：通常合成だけでなく、マスク・クリッピング・隔離グループ・グラデーションマップ・複雑な合成・元画素データを持つレイヤーも、**元の座標とレイヤー合成式を維持した区画処理**に拡張。拡大して細部を見るための高解像度比較画像と、通常の画像書き出しは従来の方式を保持。
- [`86400446`](https://github.com/totoro0419/illustro/commit/864004462aaf99c67c2c3174b493da6ec3d2f3e1)：元画像全体を合成した結果と、128画素の境界をまたぐマスク・特殊合成を区画ごとに計算した結果を照合するテストを追加。部分透明な複数レイヤーの合成順・縮小色も比較する。
- **最終コードに対する検査**：[統合CI #44042521158](https://github.com/totoro0419/illustro/actions/runs/44042521158) **success**、[Core CI #44042528176](https://github.com/totoro0419/illustro/actions/runs/44042528176) **success**。Core **51** / Brush **259** / Editor **260**テスト、Editor型検査・製品ビルド成功。旧`prep:check`の未分類文書に関する診断エラーは継続しており、完全な全チェック成功と混同しない。
- **効果の限定**：対象は履歴の小さなサムネイル（表示画素数128,000以下）で、全解像度のレイヤー読み戻し・合成用の巨大なCPU画素配列を削減する実装。GPU上の描線再生は原寸で継続し、旧作品・元画素データを持つ作品について読み込み時の全データ取得は別工程で必要な場合がある。GPU全体の使用量・実機所要時間を削減したという**実測結果はない**。縮小は画素領域を使って計算するため、従来の画像縮小機能との画素単位の完全一致（表示補間方法の差）は未検証。タイル読込みに失敗した場合は従来経路に戻す。
- **端末と実作品の検証待ち**：AndroidのWebGL2 / WebGPU利用可否、4000×4000画素・数十〜100レイヤー、マスク・透過・グラデーションを混在させた作品の表示、長時間の履歴操作、実機メモリと応答時間。これらは今回のGitHub Actions成功だけで合格扱いできない。PR #73の監査原本・129件のID／A・B・C分類は変更しない。 `main`には未マージ。

### C03全件の最新進捗（第4回）

| 状態 | 件数 | 対象・意味 |
|---|---:|---|
| 修正実装済み・検証待ち | **13/13** | C03-001〜013。コード変更・関係する自動検査を追加済み。実機を含む受入判定はまだ |
| 修正中（コード変更の未完了） | **0/13** | 第4回でC03-007の小画像用・区画方式を実装したため、残るのは端末・実作品の検査 |
| **独立して解決確認済み** | **0/13** | 大判作品とAndroid/旧作品の実データを使った検証を行っていないため |
| 実機確認待ち | **13/13** | 前回の12件にC03-007を加えたもの。自動テストと実機試験を区別 |

**次工程**：C03の実機と実作品の受入検査を実施できる環境で全13件を照合した後、C04へ進む。WebGL2/WebGPUの描画結果比較、透明度・マスク・グループの表示差、4000×4000画素のピークメモリと時間の記録を優先する。


## 2026-11-17 — C04第1回のコード改善・15件再照合

**起点**：`71bc1a13`（前回C03第4回完了時）。**今回のコード最終コミット**：[`ff8677e6`](https://github.com/totoro0419/illustro/commit/ff8677e6c47be67b52726d18636636d1c4945dd7)。C04の元監査全15件（A8/B3/C4）をPR #73の原ID・原分類のまま管理する。各「修正あり」はコード・関連単体テストの段階であり、Android実機や旧作品で解決を承認した意味ではない。

### 今回新規・追加した変更

- **C04-001（一時ツール復帰）**：[`ca780c14`](https://github.com/totoro0419/illustro/commit/ca780c147100b0507c4bf7be0fe24e57ebb58229)〜[`a6ce9eab`](https://github.com/totoro0419/illustro/commit/a6ce9eab40aac38e875b4e0da44b6152a57ebfdc)。押し続ける操作の世代をツールごとに管理。消しゴム保持中のQuickの押下によって元のツールへの復帰が打ち消される競合を修正。前のキーを放した後に同じツールが押し直された場合は古い復帰を拒否。テスト追加。
- **C04-003（全レイヤーを探す）**：[`f42ee529`](https://github.com/totoro0419/illustro/commit/f42ee529df27c0caa2eaf5dc6bbe85ea04072a96)〜[`36b583cd`](https://github.com/totoro0419/illustro/commit/36b583cdfa4ed4f263842bf31304b35bf87fa17b)。表示中のDOMレイヤーボタンではなく、Core作品データの全レイヤーを検索対象に変更。絞り込み・折りたたみ・非表示・200レイヤー・作品切り替えで無効になった項目の単体テストを追加。レイヤー選択時の永続記録と白背景の扱いも既存経路を利用。
- **C04-004（作品専用パレット）**：[`4d290ed8`](https://github.com/totoro0419/illustro/commit/4d290ed8aee7d0d12319d59f9df49b507e4e706a)〜[`2f7d5a74`](https://github.com/totoro0419/illustro/commit/2f7d5a7419621b39019bc254759ffc6aa764a0f5)、[`7fdc3016`](https://github.com/totoro0419/illustro/commit/7fdc3016ab823d621df889e9f23548a6c9b83425)〜[`b3894447`](https://github.com/totoro0419/illustro/commit/b389444762522bbdfa70c81ce517300178f9d346)。個人用パレットと作品専用パレットを分離。作品用パレットは新しい任意セクション `c04.artwork-palette` を通してネイティブ `.illustro` ファイルの保存・復元時に受け渡し。複数作品の隔離、色の順番・タグを含むファイル往復試験、破損した端末内バックアップの安全な無視をテスト。**作品の画像ピクセルや描画履歴は変更しない**。端末の自動保護と別端末への実ファイル持ち運びは未検証。
- **C04-005（スポイト遅延）**：[`e811bcd8`](https://github.com/totoro0419/illustro/commit/e811bcd842753cdacf8b81f41cd1642bf55c62de)〜[`610a8f26`](https://github.com/totoro0419/illustro/commit/610a8f2607c60401e782a8b7fa76eab78ca6cbe3)。3×3／5×5の色取得を1画素ずつ最大25件のWorker要求から**1件の小範囲要求**に変更。WebGL2/WebGPUそれぞれで必要部分のみ読戻し、128px区画の境界にまたがる場合も処理。透明画素の除外・白背景合成・複数画素平均の単体テスト追加。古いWorkerでは従来経路に戻す。GPU実機の色・応答時間は未測定。
- **C04-006（採色元の表示）**：[`d457daf7`](https://github.com/totoro0419/illustro/commit/d457daf7200b53801c8ab5afcc97b593ddd033d6)〜[`82419ccb`](https://github.com/totoro0419/illustro/commit/82419ccb6a09a1b98730dbf80b11aae0f32452b0)。キャンバス上部の説明を現在の設定（作品全体／選択中レイヤー／指定レイヤー名）と一致させた。指定した元が削除済みなら誤ったレイヤー名を表示しない。作品を開き直したときは選択候補と実採色設定を更新。表示名称のテストは既存の`eyedropperSettings.test.ts`。
- **C04-013（白黒・色覚補助）**：[`66a1487d`](https://github.com/totoro0419/illustro/commit/66a1487d16582de26ef5d23bba5691a6c0aa7bbb)。ベースのキャンバスだけでなく、実際の絵を表示する分割画像・描画中の仮画像にも補助表示を適用。ボタン・設定欄には作用させないCSS。[`3cfcace6`](https://github.com/totoro0419/illustro/commit/3cfcace6494736d2b2ebce588d0590a98ae23373)〜[`ff8677e6`](https://github.com/totoro0419/illustro/commit/ff8677e6c47be67b52726d18636636d1c4945dd7)にCSS対象の回帰テストを追加。最初のテストはVitestのCSS読み込みが空文字になって失敗したため、実ファイルを読む方式へ修正。
- **C04-015（正式配色との差異）**：元の監査は「相違がある可能性」で、存在の確定ではない。最新の`apps/editor/src/ui/aurora.css`の主要色と、正式に承認された`docs/ui/UI_THEME_CANDIDATES_2026-09-30.md` §10–11を照合。青 `#5EA8FF`、青紫 `#708FFF`、紫 `#8B7CFF`、薄紫 `#C681DE`、背景 `#F7F9FC`、白パネル `#FFFFFF` が一致。不要な配色変更はせず数値回帰テストを追加。**実機での表示と読みやすさは別途未確認**。

### 既存担当の修正を再確認した項目

- **C04-002**：マクロの各操作を順番に待機し、失敗・完了未確認を区別する`invokeMacroSequence`と既存テストを確認。
- **C04-007**：Quickが6枠埋まった場合は未確認の上書きを行わず、枠の選択が必要になる実装を確認。
- **C04-008 / C04-009**：作業場の保存とショートカットの保存は、保存成功の真偽を確認してから完了表示する実装を確認。
- **C04-010**：色一覧は色の一時プレビューで毎回全再生成せず、`collectionsVersion`が変わるときのみ作り直す実装を確認。
- **C04-011**：Quickはペン・タッチの長押しと移動による短縮操作があることを確認。
- **C04-012**：作業場レイアウトとショートカットをひとつのファイルにまとめて入出力し、事前検証・保存失敗時の復旧を行う実装を確認。
- **C04-014**：集中表示でもQuickの呼出しボタンが残り、操作欄が表示される実装を確認。画面サイズ別の端末試験は未実施。

### 検査結果と判定

- **最終コード** [`ff8677e6`](https://github.com/totoro0419/illustro/commit/ff8677e6c47be67b52726d18636636d1c4945dd7)：[統合CI #44047152623](https://github.com/totoro0419/illustro/actions/runs/44047152623) **success**、[Core CI #44047160379](https://github.com/totoro0419/illustro/actions/runs/44047160379) **success**。Core **51**、ブラシ **259**、エディタ **275**テスト合格。Editor型検査と本番ビルドも合格。
- [統合CI #44046954472](https://github.com/totoro0419/illustro/actions/runs/44046954472) は新しいCSSテストの読込方法の問題で一度**failure**。修正して上記最終CI成功。前回からの`prep:check`未分類文書診断は依然失敗（独立警告）で、全検査合格と混同しない。
- **C04-001〜014：14/15件「修正実装あり・検証待ち」**。このうち既存担当修正の8件は現行コードと既存テストの確認が中心で、今回の新規修正とは区別。**C04-015：1/15件「再判定で正式な指定色との主要数値一致を確認、端末表示待ち」**。**独立解決確認済みは0/15件**。
- Android実機での色の取得・ペンでの長押し・高速操作、作品用パレットの実ファイル保存と復元、白黒・色覚補助の見え方、設定の容量不足による保存失敗、キーボードのフォーカス移動は未検証。正式受入には必要。
- PR #73の原本・129 IDの元A/B/Cを変更しない。統合先は`quality/C03-C10-integration`、PR #75 Draftを維持。`main`にマージしない。

**全体の実装状況の報告**：C03の13件＋C04の15件＝28件についてコード修正・再判定まで進行。これは129件の問題が28件「解決確認済み」になった意味ではない。次回はC05を対象に、保存消失や素材・資料の参照切れを優先して、現行コードの再調査と実修正を進める。


## 2026-11-17 — C05第1回：参考資料・素材・作品管理の品質改善

**作業の起点**：`8f2a44939acc197b1d7794f509748e1c42328077`（C04記録まで）。**今回のコード最終コミット**：[`053c69c8`](https://github.com/totoro0419/illustro/commit/053c69c85919febf173de71db595504cef9d14fd)。C05調査の全20件（**元分類A16/B2/C2**）について最新実装を照合。**元PR #73の調査ファイル・129件の問題IDと分類を一切変更しない。**

### C05-001〜020の判定と証拠

| ID | 最新実装で確認した状況 | この回の変更・残る検証 |
| --- | --- | --- |
| **C05-001** | **追加修正・検証待ち** | 参考資料の任意添付で例外が発生しても、作品本体は保存できるよう`main.ts`の付加データ準備にエラー隔離を追加。古い同梱データを誤って再採用しないよう明示的な「資料不足」マーカーを使う。[`5167c8d0`](https://github.com/totoro0419/illustro/commit/5167c8d0255395d0b987a173934539ef1960e634)・[`1dad9b9b`](https://github.com/totoro0419/illustro/commit/1dad9b9b8fca3ff339ce1a4085bafde8107d8e19)。実作品の付加データ障害は要実機確認。 |
| **C05-002** | **追加修正・検証待ち** | 保存待ちの配置を元の作品ID付きで保持し、作品A→B→Aの切替前に先行書込み完了を待つ。書込み失敗時も最後の未保存配置を同じセッション内で保持して再表示する。[`aef497ab`](https://github.com/totoro0419/illustro/commit/aef497ab1d9310b6107b0e7be0ac92c16f8a2798)。容量不足・強制終了後の完全復元は未保証。 |
| **C05-003** | **追加修正・検証待ち** | ホームから作品を複製する前に、元作品の参考資料保存を待ってボード配置を別作品IDへコピー。共有する画像は素材庫に残し、旧ファイルの古い資料添付による上書きを避ける。[`b8997ff9`](https://github.com/totoro0419/illustro/commit/b8997ff966042db903b4773ad4de0f0ec67d0699)。複製後の実機確認は未実施。 |
| **C05-004** | **追加修正・検証待ち** | ネイティブ作品内の資料画像をIndexedDBの**1トランザクション（全件成功か一括取消）**で追加する選択肢を作成。全配置情報を先に検査し、失敗時は元のボードへ戻す。失敗時の一部保存をテストで模擬。[`9f831e85`](https://github.com/totoro0419/illustro/commit/9f831e8577ffef4e00cb64b443e71fc7b8f67157)・[`65a03cce`](https://github.com/totoro0419/illustro/commit/65a03ccefd60af51580fa9bede372848a59ca0d7)・[`53d0cedf`](https://github.com/totoro0419/illustro/commit/53d0cedf5ee6a77935e2a3c6420efe9679c9788f)。実ブラウザーでの容量不足時は未検証。 |
| **C05-005** | **追加修正・検証待ち** | 既存の不正ボード検出を維持。文字列の表示フラグを真と誤認しない検証を追加。大きな資料ウィンドウのサイズを保存前後で保持し、IDだけでなく座標・大きさ・回転など全項目を読戻し照合。[`228d1dc7`](https://github.com/totoro0419/illustro/commit/228d1dc7eae7bbf1fc293ad4f1dbb5758fc40f13)・[`22b284d5`](https://github.com/totoro0419/illustro/commit/22b284d548b2474e99f4a19bdff585e206147f2d)。 |
| **C05-006** | **既存修正を再確認・検証待ち** | パックには`parentId`と`version`が含まれ、読込時に版の参照先IDを再対応付けする。旧形式パックの互換テストあり。循環や外部の欠けた旧版の実使用は別確認が必要。 |
| **C05-007** | **既存修正を再確認・検証待ち** | ゴミ箱・非表示の条件と名前・タグの検索が合わせて効く`assetPanel.ts`実装を確認。 |
| **C05-008** | **既存修正を再確認・検証待ち** | 素材のお気に入り・非表示・名前変更・ゴミ箱移動は、内容の版番号を増やさない`updateAsset`を確認。 |
| **C05-009** | **既存修正を再確認・検証待ち** | 全資料の一時表示/非表示は、作品ボードの保存と資料Undoに混ぜない`temporaryHidden`で扱う。 |
| **C05-010** | **既存修正を再確認・検証待ち** | 同一作品の端末配置とファイル内配置が異なる場合、ユーザーに選択を求め、古い端末側を無条件優先しない。実端末で両者が異なる復元試験は未実施。 |
| **C05-011** | **追加修正・検証待ち** | 参考素材をゴミ箱へ移す前に、保存中の資料更新完了を待ち、他の作品のボードを検索。使用中なら削除を取りやめる。調査が失敗した場合も勝手に安全と判断しない。[`206385d8`](https://github.com/totoro0419/illustro/commit/206385d8889ff1695390d3db7b82a0c3ffd2da92)・[`6d18931a`](https://github.com/totoro0419/illustro/commit/6d18931a70aebeb8ea17719770960a024c34c7b5)・[`5a278de6`](https://github.com/totoro0419/illustro/commit/5a278de695e28250cd2b4048dcaa45a94d591e21)。他種類の素材が全作品のどこで利用されているかの網羅は未確認。 |
| **C05-012** | **既存修正を再確認・検証待ち** | `homeShell.ts`に複数作品の選択、フォルダー移動、お気に入り、ゴミ箱移動の一括操作あり。途中失敗・復元試験は未実施。 |
| **C05-013** | **追加修正・検証待ち** | 作品ファイルへの**画像同梱**と、**端末内素材庫だけから参照（ファイルには画像なし）**を明示的に選択可能にした。端末参照は素材ID・名前・種類・サイズ等を照合し、不一致や別端末では「不足」として配置だけ保持。手動で画像を選び直せる。[`c100af87`](https://github.com/totoro0419/illustro/commit/c100af87468a38dda13e4f837d0807708a11c57c)・[`7d8cd09a`](https://github.com/totoro0419/illustro/commit/7d8cd09a192f3f12e6c5643d9a24c95eecff9f71)・[`6ca393ed`](https://github.com/totoro0419/illustro/commit/6ca393eda7d0293b3d1639185b024badc11fa282)・[`eb311627`](https://github.com/totoro0419/illustro/commit/eb31162798b8b9b36b342959f6b259fea7a5c6de)。注意：OSの外部ファイル自動追跡ではなく、素材庫との紐付け方式。SHA-256による画像バイト単位の同一性検証は未実装。 |
| **C05-014** | **既存修正を再確認・検証待ち** | `color/referenceSampler.ts`は縮小表示用のcanvasとは別に元画像`sourceBitmap`を保持し、色の取得時は元画像の指定画素を読む。1px細部の実端末検査は未実施。 |
| **C05-015** | **部分対応・残修正あり** | 素材取込の失敗IDと対応先IDを記録し、同じ画面では失敗分のみ再実行できる。**アプリ終了後の自動再開・大量データの保存は未実装**。 |
| **C05-016** | **追加修正・検証待ち** | リサイズ後に参照ウィンドウの見える部分を画面に戻す既存処理を確認。デコード時に1000pxへ勝手に縮小される問題を変更し、8192pxまでのサイズを保持する。[`228d1dc7`](https://github.com/totoro0419/illustro/commit/228d1dc7eae7bbf1fc293ad4f1dbb5758fc40f13)。 |
| **C05-017** | **既存修正を再確認・検証待ち** | 素材の一覧表示はIndexedDBの別メタデータ表をカーソルで読み、画像Blobを全件取得しない。数千件の実測は未実施。 |
| **C05-018** | **追加修正・検証待ち** | 参考画像の読み取りをキャッシュし、変更していない資料枠を維持。差がある枠だけDOMを差し替える。[`5a86614f`](https://github.com/totoro0419/illustro/commit/5a86614fffdd6664ee85eba2c110449cf1b4bcc8)・[`bee074aa`](https://github.com/totoro0419/illustro/commit/bee074aada92cc55bf2d9431c27cfca3dbc67c63)。大量画像時の速度実測は未実施。 |
| **C05-019** | **未完了・設計継続** | 資料画像上をタップしてそのまま色を採るモードは未実装。現在は資料ごとの「採色」ボタンから元解像度の採色画面を開く方式。既存の画像移動操作との競合を避ける設計が必要。 |
| **C05-020** | **部分対応・残修正あり** | 参考画像・ブラシ・色セットに加え、素材庫のフォントを別コピーを作らず文字編集で使えるように準備するボタンを追加。[`053c69c8`](https://github.com/totoro0419/illustro/commit/053c69c85919febf173de71db595504cef9d14fd)。紙・模様・図形など他の素材種別の作品への適用経路は未統一。 |

### 自動検査と未確認事項

- **コード最終** [`053c69c8`](https://github.com/totoro0419/illustro/commit/053c69c85919febf173de71db595504cef9d14fd)：[統合CI #44051890711](https://github.com/totoro0419/illustro/actions/runs/44051890711) **success**、[Core CI #44051897107](https://github.com/totoro0419/illustro/actions/runs/44051897107) **success**。Core **51件**、ブラシ **259件**、エディタ **286件**、型検査・本番ビルドが合格。
- 途中の[`f003b5bf`](https://github.com/totoro0419/illustro/commit/f003b5bf554264558ddb0e76f9502bbdfbfa3403)は`referenceBoard.ts`の例外処理にTypeScript型エラーがあり統合CI #44049687207 **failure**。[`1384d826`](https://github.com/totoro0419/illustro/commit/1384d826e1dbb2fcc1495f14e046f29ea923ce0c)で直し、次の統合CI #44049920488 **success**。初回失敗は隠さない。
- **判定：C05の20件を再照合。17件がコード修正・再判定後の検証待ち、2件が一部対応（C05-015・020）、1件が未実装（C05-019）。独立解決確認済みは0/20。** この判定は自動検査とコードの状態であり実機合格とは別。
- 未確認：Androidでの資料を見ながら描く動作、素早い作品切替、容量不足や強制終了、同名・同ID素材の競合、別端末への`.illustro`持ち運び、画像再選択、実際の性能。元の`prep:check`の未分類文書診断は引き続き既知の警告であり「全テスト完全PASS」とは扱わない。
- **次の修正対象**：C05-015（アプリ終了・再開をまたぐパック取込再試行）、C05-019（資料画像からの直接採色と描画操作の共存）、C05-020（未接続の素材種別の実適用）。優先順位は操作の直感性・保存の安全性・軽さ。これらの処理を完了後、C06へ進む。
- **累計**：C03の13件・C04の15件・C05の20件＝**48件の再照合段階**。ただし「48/129件が独立に解決確認済み」を意味しない。原監査PR #73とIssue #92を維持。PR #75 Draftの`quality/C03-C10-integration`で作業し、`main`にはマージしない。


## 2026-11-17 — C05第2回：残り3件への実装と参照画像の厳格照合

**開始時点**：`a4dbf073`（C05第1回の記録）。**今回の最終コード**：[`3e8be278`](https://github.com/totoro0419/illustro/commit/3e8be278ff2733811d6ff92bb5317a862f125eb5)。C05-015・019・020を継続実装し、C05-013の保存画像照合も追加で修正した。PR #73の原分類と129件のIDを変更しない。

- **C05-015｜素材セット読み込み再開：実装あり・検証待ち**。端末内のIndexedDBに取り込む素材セットの元データを一度保存し、各素材の読み込みが終わるごとに**未完了のIDと対応先IDだけを小さく更新**。アプリ再起動時に未完了の素材を表示し、利用者の操作で続きから再開する。途中で端末が閉じられ、素材データは保存されたが進捗だけ記録されなかった場合、**内容を最大1MiBずつ比較**し、同一内容なら重複作成せず完了として扱い、異なる場合は上書きしない。再開記録を明示的に破棄しても取り込み済みの素材は保持。[`3d19ae9b`](https://github.com/totoro0419/illustro/commit/3d19ae9bae5121daa6748f6893386ac468eb53ae)、[`2344fc9e`](https://github.com/totoro0419/illustro/commit/2344fc9ea634f0167dc9e1ad75944ad759f066c2)、[`bf12399f`](https://github.com/totoro0419/illustro/commit/bf12399fc1d985b1c732050b0bcdd7557729e73c)、[`4a7e2667`](https://github.com/totoro0419/illustro/commit/4a7e2667fcf582dd1d0dbcdca19542fe57edf22e)、[`aa5484ce`](https://github.com/totoro0419/illustro/commit/aa5484ced266365988057ec152c6767f45047552)、[`3e8be278`](https://github.com/totoro0419/illustro/commit/3e8be278ff2733811d6ff92bb5317a862f125eb5)。単体テストでは終了を模擬した再開・同内容の再利用・別内容の拒否・異常な進捗記録の検査を追加。**実際にブラウザーを強制終了して再開する試験と容量不足は未検証**。再開記録の端末内保存が失敗する場合は、新規素材の読み込みを進めずエラーにする。
- **C05-019｜参考画像を直接タップして採色：実装あり・検証待ち**。各資料ウィンドウに「画像上で直接採色」の明示的切替を追加。画像を移動する操作と採色する操作はモードで区別する。移動・拡大縮小・回転・左右上下反転を逆算して元画像の正確な画素位置を取得する。採色直径1/3/5画素、透明画素の扱いは既存のスポイト設定を利用。元解像度の小領域を読み取り、確定色は作品の前景色だけに反映。[`11a01169`](https://github.com/totoro0419/illustro/commit/11a01169c385bf5f3008576b0fc4dd9eb9c6585d)〜[`03fc9b4e`](https://github.com/totoro0419/illustro/commit/03fc9b4e91966e4073cf6d36f9e45e8e3c21cbe3)。4000px原画像、拡大・回転・反転・領域外の座標照合テスト追加。**Androidのタッチ/ペン実操作・実画像の色一致は未確認**。
- **C05-020｜素材の実利用先：部分対応を継続**。既存のブラシ・色セット・参考画像・フォントの利用経路に加え、画像形式の素材を**画像レイヤーへ配置**（既存のUndo対応の貼り付け処理）、編集可能な図形/グラデーションJSONを内容検証後にレイヤー追加（既存のUndo対応処理）、マクロ/作業場設定JSONを専用の厳格な形式検査経由で読み込む入口を追加。[`5e079a28`](https://github.com/totoro0419/illustro/commit/5e079a28a4320dcd9141ce26ed0fafb6ecaefd95)〜[`f1451e19`](https://github.com/totoro0419/illustro/commit/f1451e194cf49a35a1f6245d7e5db699701570b5)。図形に中身がない場合の型エラーを修正。**画像をレイヤーに貼ることと、ブラシ先端・紙質・模様などの種類固有の効果として利用することは異なる**。後者の専用接続は未完了のため「C05完遂/解決確認済み」とは判定しない。
- **C05-013｜素材庫参照の内容一致**。別端末や保存済み素材との衝突で、ID/名前/サイズが同一でも実画像の中身が異なる可能性を追加検出。既存の4MiB区画SHA-256を利用し、作品ファイルへ添付する参照情報に画像全体の指紋を保持。読み込み時も指紋を再計算して一致した場合だけ自動参照する。古い指紋のない端末内参照は誤表示を避けて「不足」とし、利用者が元画像を再選択できる。[`b4332c55`](https://github.com/totoro0419/illustro/commit/b4332c55fda2351d100b46d0aa2d06085a1e377b)〜[`3d16adb7`](https://github.com/totoro0419/illustro/commit/3d16adb79b217fd43d9bf79df3fcc67abc25e973)。同じメタデータでも異なる画素ファイルを拒否するテストあり。

**最終コードの検査**：[統合CI #44063523102](https://github.com/totoro0419/illustro/actions/runs/44063523102) **success**、[Core CI #44063539772](https://github.com/totoro0419/illustro/actions/runs/44063539772) **success**。Core **51件**、ブラシ **259件**、エディタ **301件**合格、Editor型検査・本番ビルド成功。途中のCI #44062594522で空の編集データの型検査エラー、CI #44063150148でテストのoptional属性の型エラーが発生したが、後続コミットで修正し、上記最終CIで合格。既存の`prep:check`未分類文書診断は依然として失敗する独立の警告。

**C05第2回終了時の判定**：C05-001〜019の**19/20件が「修正実装または再判定済み・端末検証待ち」**、C05-020の**1/20件が「部分対応・専用素材の利用経路が未完了」**。**独立解決確認済み：0/20件**。自動テスト成功だけではAndroid端末の挙動・保存成功・色の一致・速度・大量素材操作を確認できない。元監査ID・A/B/Cは保持。

**次工程**：C05-020の専用素材適用は未完了課題として残し、これまでの改善と競合しない形でC06（選択範囲・コピー・貼り付け）を開始する。共有描画/保存の変更はIssue #74で調整、C05の各IDはIssue #92に記録。C03/C04/C05の48件を再照合したが、独立解決確認48件ではない。PR #75 Draftを維持し、`main`へはマージしない。


## 2026-11-17 20:28 JST — C06追加修正の統合監視（検証継続）

- 前回確認のコードコミット `3e8be278ff2733811d6ff92bb5317a862f125eb5` と現HEAD `98aeaa89cab32ce346ec211b066a3508cb161789` をGitHubのcompareで照合。**24コミット・19変更パス**、すべて前者からの追加（ahead 24 / behind 0）。C06の選択・コピー・貼付関連が中心で、`selection/maskCodec.ts`・`selection/pasteTiles.ts` の追加、選択ブラシ／貼付プレビュー／外部画像取り込み／ネイティブ圧縮の改修、関連テスト6ファイルの追加を確認。
- 共有ファイルの `apps/editor/src/main.ts`（4行追加）・`apps/editor/src/brushSurface.ts`（3行追加）も差分に存在する。統合担当所有ルールとC03/C04/C05との動作互換性を継続確認する。**この比較だけで共有変更の独立承認やC06全17件の完成は宣言しない。**
- [Core CI #44074314436](https://github.com/totoro0419/illustro/actions/runs/44074314436) はHEAD `98aeaa89` に対し **success**（Core型検査・テスト）。[統合CI #44074304976](https://github.com/totoro0419/illustro/actions/runs/44074304976) は確認時点で**in_progress**。Core・Brushステップは成功、Editorテストと型検査・本番ビルドの最終結果は未確定。**全体CI合格扱いしない。**
- 新規のC03〜C10実装PRはオープンPR一覧に見当たらず、既存の12担当PRは以前の統合済み状態を維持。統合管理PR #75と調査PR #73はDraft・未マージ。PR #73の9原本・129問題ID・A/B/C分類には変更を加えない。独立解決確認済みは**0/129件**を維持。
- `main` は基準 `bdc7135b51033982d90ea5dad104bb04fc107df2` と比較して**identical**。Android実機・旧作品の画素一致・保存復元・4000×4000画素の性能は未検証。旧`prep:check`は既存未分類ドキュメントの診断失敗を持ち、全検査PASSに含めない。
- **保留**：C06-001〜017を問題ID別にコード・回帰・端末で再判定すること、上記統合CIの最終結果確認。未完成コードの追加マージ・mainへの変更は行わない。


## 2026-11-17 — C06第1回：選択・コピー・貼り付け17件の再照合と修正

**開始時点**：`e9923c44`（C05第2回記録）。**今回の最新コード**：[`381a1b57`](https://github.com/totoro0419/illustro/commit/381a1b57875007edc077ebfb326ceeebac8c7342)。PR #73のC06-001〜017の**全17件（原分類A12/B3/C2）**について最新統合コードを再照合し、足りない箇所を実装。元の問題IDと分類は保持した。**「修正実装」＝「実機で解決確認」ではない。**

| ID | 現在の判定 | 実装・根拠・残る確認 |
| --- | --- | --- |
| **C06-001** | **未完了** | 選択マスク付きの通常ブラシで、確定結果と仮表示が完全に同じ範囲に制限されるか未確認。現在は`brushSurface.ts`の`this.session.begin(...,!mask)`で選択中は通常GPU仮表示を停止し、別経路で確定。選択中も高速で正確な仮表示を行う方式が必要。 |
| **C06-002** | **部分対応** | [`cd786f22`](https://github.com/totoro0419/illustro/commit/cd786f22b9168695c0a1ef69cf5b389be45db94e)で選択付き筆の専用Workerを毎筆作り直さず単一Workerを再利用。[`fe87f2b9`](https://github.com/totoro0419/illustro/commit/fe87f2b9500fbf8e1204f1d99fce0da57a103cf9)に複数ジョブの再利用テスト。**全面RGBA転送・毎筆の全作品計算の経路は残る**。 |
| **C06-003** | **既存修正を再確認・実機検証待ち** | 選択なし状態で減算・交差を使うと空のマスクを返す`combineSelection`と`quality.test.ts`を確認。 |
| **C06-004** | **既存修正を再確認・実機検証待ち** | 自由輪郭は`SelectionOverlay`でアルファマスクを画面に描く。boundsは主に操作/位置基準に利用。実機で四角い表示が混ざらないか確認要。 |
| **C06-005** | **既存修正を再確認・実機検証待ち** | `clipboardPanel.ts`はOS貼付イベントからファイルを取得、Ctrl/⌘+Vは貼付イベントを通して処理。既存コピーの内部フォールバックあり。 |
| **C06-006** | **追加修正・実機検証待ち** | [`41b538e5`](https://github.com/totoro0419/illustro/commit/41b538e571fc6334c5910275d325d25ac647d875)で劣化なしRLE圧縮を追加。[ `81c86ac3`](https://github.com/totoro0419/illustro/commit/81c86ac3975849df4cf28fa151224267688ebf14)でネイティブ`selection.alpha.rle.v2`として保存、`selection.alpha.v1`を読み込み互換とし、不正な圧縮ファイルを拒否。[ `5e523663`](https://github.com/totoro0419/illustro/commit/5e52366361995fbad56ab682ef56a272406e9ed4)で保存容量判定を圧縮後サイズに変更。16MPマスクの圧縮テスト、64K画素の作品ファイル保存/読戻しテストを分離。 |
| **C06-007** | **部分対応** | `selection/panel.ts`に選択ブラシの操作中のSVG軌跡を表示する実装あり。圧力・硬さによる実マスク境界と仮表示が完全一致することは未確認。 |
| **C06-008** | **既存修正を再確認・実機検証待ち** | `clipboard.worker.ts`は移動で塗り画素が作品外にはみ出す場合に確定前に拒否する。元画素を守る`selection/quality.test.ts`あり。 |
| **C06-009** | **既存修正を再確認・実機検証待ち** | `selection/panel.ts`に保存済みIDを指定した上書き操作と選択マスクの縮小表示を確認。 |
| **C06-010** | **既存修正を再確認・実機検証待ち** | `selection/magnetic.ts`および投げ縄の選択UI・エッジ吸着テストを確認。 |
| **C06-011** | **既存修正を再確認・実機検証待ち** | `previewAdjustment`は拡張・縮小・ぼかしを元/変更後で見比べ、確定前に取り消せる。 |
| **C06-012** | **既存修正を再確認・実機検証待ち** | `selection/overlay.ts`は従来の640px固定ではなく、画面上の描画領域のピクセル数に合わせて輪郭を表示。縮小表示時の1画素細部は別途実機確認が必要。 |
| **C06-013** | **追加修正・実機検証待ち** | [`6303daa1`](https://github.com/totoro0419/illustro/commit/6303daa15da1b288147323c90495fd46820a4b15)～[`e9b1307e`](https://github.com/totoro0419/illustro/commit/e9b1307eb9124a7242b07a90419efc0f8c3e730f)。非同期選択マスク計算だけでなく、作品切替後の端末保存マスク復元も「処理中」とし、完了前に通常筆を開始させない。 |
| **C06-014** | **追加修正・実機検証待ち** | [`f6a3332a`](https://github.com/totoro0419/illustro/commit/f6a3332a1927a325b35f082aafb78ebaa4a185ad)～[`1b8a358e`](https://github.com/totoro0419/illustro/commit/1b8a358e5cf100848895953da8187c68f6a18b73)。ファイルをキャンバス外に落としてもブラウザーの標準ページ遷移を抑止する。 |
| **C06-015** | **部分対応** | [`8d8e5df8`](https://github.com/totoro0419/illustro/commit/8d8e5df857e0ad75e7a2b53746c5dd0089340a09)～[`84d75db3`](https://github.com/totoro0419/illustro/commit/84d75db360219e83b31207888059fa9dfd782c12)。通常画像を貼るときは作品全体のRGBA配列を新規確保せず、必要なタイルだけを1回のCore編集で書き込む。**編集可能な複数レイヤーを保持する貼付処理では全面画素配列の経路が残る**。 |
| **C06-016** | **既存修正を再確認・実機検証待ち** | 選択範囲近くのQuickメニューにコピー・切取・反転・ぼかしを表示するコードを確認。 |
| **C06-017** | **追加修正・実機検証待ち** | [`20c15515`](https://github.com/totoro0419/illustro/commit/20c155158882f3a861b1b6a4a3d1b3c7d736a17e)～[`381a1b57`](https://github.com/totoro0419/illustro/commit/381a1b57875007edc077ebfb326ceeebac8c7342)。キャンバスの移動・拡大に追従する最大512pxの半透明貼付候補を表示し、指/ペンで移動、確定/取消。確定までは作品に書き込まず、コピー元が変わった場合は候補を無効化。複数レイヤーの画素がない場合は配置枠を表示。 |

### 検査・途中失敗・最終判定

- **最終コードコミット** [`381a1b57`](https://github.com/totoro0419/illustro/commit/381a1b57875007edc077ebfb326ceeebac8c7342)：[統合CI #44076238305](https://github.com/totoro0419/illustro/actions/runs/44076238305) **success**、[Core CI #44076245648](https://github.com/totoro0419/illustro/actions/runs/44076245648) **success**。Core **51件**、ブラシ **259件**、エディタ **317件**テスト成功、エディタ型検査・本番ビルド成功。
- **途中の失敗と修正**：ネイティブ保存往復テストで過度に厳しい圧縮サイズ基準（CI #44074530567）、テストの大配列比較がタイムアウト（#44075007924）したため、作品ファイルテストを小さい画素範囲に分離。16MPの`maskCodec.test.ts`をVitest`toEqual`で比較するとテスト処理自体が4GBメモリを使い切った（#44075412961）ため、1画素ずつの定数メモリ比較に変更（`feff2736`）。最後に貼付仮表示の型検査でnullの可能性（#44076024328）を指摘され、`381a1b57`で修正。すべて**最終CI成功で再確認**。
- 古い`docs/development/PROTOTYPE_PROGRESS.md`の未分類を指摘する`prep:check`は継続して診断上不合格。統合CIの他ステップが成功したことと区別。
- **C06判定：原17件のうち13件はコード修正済み/既存修正を再判定して端末検証待ち、4件は部分/未完了（C06-001、002、007、015）。独立解決確認0/17件**。Androidタブレットでの仮表示一致、ペン圧、選択保存・読戻し、貼付位置、Undo/Redo、4000×4000描画/速度、巨大マスクの実保存試験は未実施。
- **累計：C03〜C06の65件をコード再照合**（C03 13＋C04 15＋C05 20＋C06 17）。ただし**独立解決確認済み0/65**。C05-020の専用素材適用の未完了も維持。次の修正はC06-001の選択マスク付き筆の正確で速い仮表示と、002・007・015の残改善を優先する。PR #75 Draftを維持、PR #73の129問題IDと元分類を保持、`main`へはマージしない。


## 2026-11-17 — C06第2回：残4件の追加実装、3件を改善（独立実機検証は未実施）

**開始HEAD** `32f9149231e330fd8b8a5bbd98adbef67544d12d`、**実装最終HEAD** [`62d2465f`](https://github.com/totoro0419/illustro/commit/62d2465fcab4cd9b3a5f06b043317849f9cb58ec)。C03〜C06の65件の再照合は維持し、C06-001/002/007/015の4件を引き継いだ。原PR #73の129 ID、分類、原本9ファイルには変更なし。

| 問題ID | 最新状態 | この回の実装と残る問題 |
| --- | --- | --- |
| **C06-001** | **未完成・修正中** | 選択中の通常筆では`brushSurface.ts`の`session.begin(...,!mask)`によりGPU仮表示を停止している。単純に有効化すると選択外へ仮線が出る危険があるため変更しなかった。仮表示と確定結果へ同じ選択マスクを適用する実装が必要。 |
| **C06-002** | **部分対応・検証待ち** | [`62d2465f`](https://github.com/totoro0419/illustro/commit/62d2465fcab4cd9b3a5f06b043317849f9cb58ec)。`selection/brush.ts`・`stroke.worker.ts`で同じ選択マスクをWorkerに保持し、毎筆の巨大マスク再送信を省いた。Worker停止時の再送・寸法不一致拒否テスト追加。ただし`renderer.read(surfaceId)`の全作品RGBA読戻しと`replaceLayerRaster`の全画素経路は未解決。 |
| **C06-007** | **実装改善・検証待ち（境界の画素完全一致は未確認）** | [`8146c176`](https://github.com/totoro0419/illustro/commit/8146c176904db23604b92ddfdd1b091bc93711b3)。選択ブラシの仮表示を筆圧・設定サイズ・縁の硬さ・濃さに応じた点の連なりへ変更。単点入力も可視化。画面更新ごとの生成数を制限し、単体テスト追加。SVG近似のため実マスク境界・重なり方の画素単位一致は未確認。 |
| **C06-015** | **実装改善・検証待ち** | [`162a37c2`](https://github.com/totoro0419/illustro/commit/162a37c24d3f0ee2c6f788848949702e139fb003)。編集可能な複数レイヤー貼付で`width*height*4`の全面透明バッファをレイヤー別に作らず、元画素と位置をCoreに渡し、非透明の必要なタイルだけ保存。4000×4000の配置・Undo/Redo・永続化・空タイルのCoreテスト追加。ただしコピー元レイヤーの全画素キャプチャや実機の大量レイヤー検証は残る。 |

**自動検査**：
- [`8146c176` 統合CI #44078561818](https://github.com/totoro0419/illustro/actions/runs/44078561818)、[Core CI #44078569643](https://github.com/totoro0419/illustro/actions/runs/44078569643) ともに **success**。
- [`162a37c2` 統合CI #44078996432](https://github.com/totoro0419/illustro/actions/runs/44078996432)、[Core CI #44079004182](https://github.com/totoro0419/illustro/actions/runs/44079004182) ともに **success**。
- [`62d2465f` 統合CI #44079445004](https://github.com/totoro0419/illustro/actions/runs/44079445004)、[Core CI #44079455143](https://github.com/totoro0419/illustro/actions/runs/44079455143) ともに **success**。統合CIのCore/Brush/Editor・型検査・本番ビルドのジョブ最終結果を確認。
- 既存の`prep:check`未分類文書の診断不合格は継続し、すべての検査が完全合格したとの判定には用いない。

**進捗**：C06 17件のうち、既存13件のコード修正／再判定は維持。残4件のうち今回は3件に追加変更を実装。**C06-001は未完成、C06-002は性能の一部未解決、C06-007/015は改善実装済み・必要な検証待ち**であり、C06全体の完成認定はしない。全129件の独立解決確認済み **0/129件**、C06のAndroid実機確認 **0/17件**。保存/復元・選択マスク境界・筆圧・仮表示一致・長いストロークの速度・4000px大容量・レイヤーグループ貼付の実機試験は未実施。C05-020の専用素材適用未完成も引き続き保持。

**次回「続けて」の着手点**：①C06-001：描画中の筆の仮表示を選択マスクに正確に制限し、選択外に一切出さず、ペンアップ後の確定と画素を比較。②C06-002：GPU/CPUの全画面RGBA読み取りと貼付の全画面確定処理を、変更タイル単位へ段階的に変更（Undo/Redo・変形・消しゴム・旧作品に回帰を防ぐ）。③C06-007/015の画素一致・グループの保存復元・4000px性能の自動/実機検証。C06の全17 IDと関連Issueの再照合後にC07へ。PR #75はDraft、mainへ未マージを維持。


## 2026-11-17 — C06第3回：選択中の仮表示の安全な切抜き・GPU読戻しの余分な複製削減

**開始**：`1c20ef032e8fb494b43f2d32e96aabf94d4bc107`（第2回記録）。**最終実装＋回帰テスト**：[ `c2476af7`](https://github.com/totoro0419/illustro/commit/c2476af752f7f6c266dc697977279f6c4dd5c7e9)。PR #73原調査9ファイル・固定129 ID・元A/B/C分類は不変更。main未マージ、PR #75 Draftを維持する。

| ID | 今回の状態・実装 | 未完成・別途必要な検証 |
| --- | --- | --- |
| **C06-001** | **追加修正・部分対応／実機検証待ち**。描画画面から送った「選択中は仮表示を止める」指示がDrawingSessionPortで捨てられ、Workerの通常仮表示が動きうる原因を修正 [`7d309c07`](https://github.com/totoro0419/illustro/commit/7d309c07a5fd07cd77fecd978852cc126c5be380)。さらに [`b2973e0c`](https://github.com/totoro0419/illustro/commit/b2973e0c0ad9bdfc344b1065969a587fbdfd02a1) で選択マスクを描画Workerに渡し、CPUの筆仮表示へ選択範囲の0〜255濃度を作品座標で適用。GPUの選択未対応仮線への切替は禁止。マスクが変わらない間はWorker内データを再利用。単体テストで選択外ゼロ・半透明マスク・画面回転/反転/縮小・GPU表示経路回避を確認（[`c2476af7`](https://github.com/totoro0419/illustro/commit/c2476af752f7f6c266dc697977279f6c4dd5c7e9)）。 | **通常のFoundation系・上側の不透明な通常合成レイヤーなど、CPU直接仮表示が適用できる条件のみ対応**。消しゴム・複雑な合成・下側レイヤーでは誤表示を避けるため仮線を出さない場合がある。実機の筆圧・ペン/指・仮線と確定画素の完全一致・高解像度描画の応答性は未確認。C06-001を完了認定しない。 |
| **C06-002** | **追加改善・部分対応／検証待ち**。[ `17c4673c`](https://github.com/totoro0419/illustro/commit/17c4673cda9d11721796fb9a9693e58aa41e5fc3)。GPUから転送された`Uint8ClampedArray`を`new Uint8Array(元配列)`で全量コピーしていた箇所を、同じバッファを共有する表示用配列に置換。4000×4000作品では64MBの余計な複製を抑止。共有バッファ・開始位置・バイト数を確かめるテスト追加。前回のWorker再利用・選択マスク再利用も保持。 | **GPUからの作品全体RGBA読取りと、Coreの全画素入替は残る**。レイヤー・変形・Lazy履歴・Undo/Redoと整合する変更タイル単位の読取り/書戻しを実装する必要あり。実機メモリ実測は未確認。 |
| **C06-007** | 前回[`8146c176`](https://github.com/totoro0419/illustro/commit/8146c176904db23604b92ddfdd1b091bc93711b3)の圧力対応SVG仮表示を維持。 | SVGの重ね方・硬さ・境界が確定マスクの画素と完全一致するかは未確認。 |
| **C06-015** | 前回[`162a37c2`](https://github.com/totoro0419/illustro/commit/162a37c24d3f0ee2c6f788848949702e139fb003)の編集可能レイヤー貼付タイル化・Undo/Redo・保存復元テストを維持。 | コピー元の全画素キャプチャ・大容量グループ・実端末の再編集/持ち運びは未確認。 |

**CI**：最終HEAD [統合CI #44082660762](https://github.com/totoro0419/illustro/actions/runs/44082660762) **success**（Core/Brush/Editor回帰・型検査・本番ビルド）、[Core CI #44082670010](https://github.com/totoro0419/illustro/actions/runs/44082670010) **success**。途中の[`b2973e0c` 統合CI #44081561100](https://github.com/totoro0419/illustro/actions/runs/44081561100)は`stroke-overlay.mjs`に余分な閉じ括弧がありfailure→[`60686073`](https://github.com/totoro0419/illustro/commit/60686073d24b3ac932e302498ca52a90cca2b654)で修正。[統合CI #44081883844](https://github.com/totoro0419/illustro/actions/runs/44081883844)は追加テストのモックが必要な管理Mapを作らずfailure→[`8636d4e8`](https://github.com/totoro0419/illustro/commit/8636d4e865897283c438bb05ff652f745f61485b)で修正。これらの中途失敗を成功と扱わず、最終CIで修正後の結果を確認。従来の`prep:check`文書棚卸し警告は依然別管理。

**進捗と未認定事項**：C06の17件すべてにコード上の再判定または対応履歴がある（17/17）。ただし**C06-001、002は部分対応のまま**で、C06-007/015も別途画素/実機確認が残る。独立した端末での解決確認0/17、全体0/129。C03〜C06累計コード再照合65/129。C05-020の専用素材利用経路の未完も継続。

**次回「続けて」の着手点**：第一にC06-002のGPU全画面読戻し・全量Core入替を、選択範囲と筆の変更区画だけ処理する方法へ置換。ただしCore内部のまだ確定していないブラシ処理を壊さないため、必要なら従来方式へ戻す仕組みを保持。第二にC06-001で消しゴム/特殊合成・下側レイヤーにも選択を反映した正確な仮表示を提供。第三にC06-007/015、C06全17 IDのテスト・関連Issueの未解決を照合し、そこで初めてC07へ移る。Android実機の画素一致・ペン圧・4000px動作はユーザー確認待ち。


## 2026-11-17 21時台 JST — C06区画単位処理の追加監視（最終統合CI未確認）

- 前回の実装HEAD `c2476af7` から今回確認したコードHEAD [`cd3a5cd8`](https://github.com/totoro0419/illustro/commit/cd3a5cd8f47f5e742caa5aaacf4f1022ebb2ecc8) まで、GitHub比較で**7コミット・12変更パス（ahead 7 / behind 0）**を確認。新しい実装PRはなく、既存12担当PRの統合済み12/12件を維持。
- **C06-002の追加実装（独立解決未認定）**：`selection/tileCapture.ts` で既存描画の占有128pxタイルを最大16件ずつGPUから読取り、`selection/tileStroke.ts` とWorker側で選択マスク付き筆を区画単位に計算。`packages/core/src/transaction.ts` の `replaceLayerRasterTiles` によって疎な区画を1件の履歴操作として保持し、`coreDocument.ts` で履歴復元向けの区画読み取り経路を追加。`brushSurface.ts` は対応描画環境で区画経路を選び、非対応環境では従来の全画面処理を残す。関連する選択・Coreのテストファイルも追加。
- **残る注意点**：区画方式でも、既存の占有タイルはスナップショット保全のため読み出す。描画区画一覧の整合性、選択中の通常筆/消しゴム、変形済みレイヤー、履歴再生、Undo/Redo、保存復元、4000×4000作品、メモリ・応答性、Androidペン/指は別途回帰・実機確認が必要。C06-001/002を完成認定しない。
- 当該コードHEADの [Core CI #44086356030](https://github.com/totoro0419/illustro/actions/runs/44086356030) は**success**（Core型検査・テスト）。**Core・Brush・Editor全体の統合CIと本番ビルドは、このHEADについて成功未確認**。従来の [統合CI #44082660762](https://github.com/totoro0419/illustro/actions/runs/44082660762) は旧HEAD `c2476af7` の成功であり、今回のコードの合格根拠に流用しない。旧 `prep:check` の既存未分類ドキュメント診断失敗は引き続き不合格として区別。
- PR #73の変更ファイル一覧を再取得し、原調査9ファイルのみであることを確認。129件の既存問題ID・A/B/C（81/29/19）を保持し、**独立解決確認済み0/129件**。PR #73・#75はDraft・未マージ。比較で `main` は基準 `bdc7135b` とidentical。新たなPRマージ、公開アプリ・過去ブランチの変更は実施しない。



## 2026-11-17 — C06第4回：選択中描画の全画面GPU読戻しを区画単位の処理に変更

**開始HEAD** [`51d70b42`](https://github.com/totoro0419/illustro/commit/51d70b421c0c8832adb770db024a1a3f1bc0103a)、**最終実装・検査HEAD** [`932de5ae`](https://github.com/totoro0419/illustro/commit/932de5ae2d8f3b2cf67bbdf2de6cc015cef2a095)。今回はC06-002を重点改善。原監査PR #73の129件の問題ID・分類・原本9ファイルを変更せず、統合PR #75 Draftおよびmain未マージを維持。

### C06-002：変更内容と根拠

1. [`c5d373a6`](https://github.com/totoro0419/illustro/commit/c5d373a6ee4da93d67e2aaddd1c50e4854d68580)：Coreに`replaceLayerRasterTiles()`と`readBaseRasterTiles()`を追加。GPU/Workerの128px区画からCore内部の256px区画へ画素を統合し、**完全なレイヤースナップショット**として保存。過去のブラシ履歴と混ぜて部分上書きしないため、復元で古い線が消えたり重複する原因を回避。透明な区画は保存しない。4000×4000、複数区画、キャンバス端、Undo/Redo、端末保存用の書出し・再読込み、空画像への置換をCore単体テストで検査。型不一致の[`164bfbb8`](https://github.com/totoro0419/illustro/commit/164bfbb851826ea06f4e73366dc88dc560be8683)、区画キー検証の[`486d7470`](https://github.com/totoro0419/illustro/commit/486d7470b8c82ea180cbded70d65bb3cde3d6616)を修正後、Core CI成功。
2. [`f943e754`](https://github.com/totoro0419/illustro/commit/f943e754ce0513456cfc7109d65b9ad3f9c350ce)、[`dfeab722`](https://github.com/totoro0419/illustro/commit/dfeab7226c6640a23e29144313373f6b46ab4189)：選択筆の計算を作品サイズのRGBA配列ではなく、描画のある128px区画の列に対して適用する処理と、既存Workerへの転送経路を追加。マスクの保持・再利用、空白区画への新規描画、元画像の保持、作業外の区画の不変更、壊れた/重複した区画の拒否を実装。
3. [`cd3a5cd8`](https://github.com/totoro0419/illustro/commit/cd3a5cd8f47f5e742caa5aaacf4f1022ebb2ecc8)：`brushSurface.ts`で描画Workerの最新の区画一覧を取得し、選択中の筆の確定で対象レイヤーの**既存描画がある区画すべて**を最大16区画／1回（最大1MiB）ずつGPUから読む方式に変更。選択Workerへ小区画を渡し、Coreスナップショットとして確定。作品切替の検知と、未対応レンダラー向け旧方式を維持。復元側もこのスナップショットについては疎なV2区画形式でGPUへ戻し、余分な全面RGBA作成を省いた。
4. [`932de5ae`](https://github.com/totoro0419/illustro/commit/932de5ae2d8f3b2cf67bbdf2de6cc015cef2a095)：**従来の全画面CPU基準描画と、区画単位の選択付き描画の全画素が一致**することを、実際の筆データ、境界、半透明マスク、既存画素で比較する自動テストを追加。新旧の画素差はテスト上0。

**検査**：最終HEAD [統合CI #44086665670](https://github.com/totoro0419/illustro/actions/runs/44086665670) **success**（Core・ブラシ・Editorテスト、型検査、本番ビルド）、[Core CI #44086671398](https://github.com/totoro0419/illustro/actions/runs/44086671398) **success**。直前の実装HEAD [`cd3a5cd8` 統合CI #44086346950](https://github.com/totoro0419/illustro/actions/runs/44086346950)、[Core CI #44086356030](https://github.com/totoro0419/illustro/actions/runs/44086356030)もsuccess。途中のCore CI失敗は型と区画番号検証の不備で、修正済みコードで再実行して成功。古い`prep:check`文書分類警告は別途残る。

**C06判定（未認定事項を維持）**：
- **C06-002：構造改善・自動検査成功、Android実機検証待ち**。通常のWorker描画では全作品サイズのRGBA読戻し・64MB級の単独配列・全画面復元用配列を削減。ただし対象レイヤーの既存描画を守るため、**描かれている区画はすべてGPUから取得する**。全面に絵がある場合は読戻し総量が大きくなるので、「常に変更区画だけで済む」とは主張しない。実機速度・メモリ・長い線での応答性は未計測。特殊な非Workerレンダラーでは旧方式を維持。
- **C06-001：部分対応**。選択範囲の正確なCPU仮表示が対応する通常ブラシ等には実装済みだが、消しゴム/複雑な合成/下側のレイヤーなど未対応表示方式の仮線は今後改善。
- **C06-007：改善実装済み、マスク確定時とSVG仮表示の画素境界・重なりの一致は未確認**。
- **C06-015：タイル保存対応済み。コピー元レイヤーのGPU全画面取得・実機大容量グループ試験は未解決**。
- C05-020の部分未完了を保持。C03〜C06の**65/129件コード再照合**は維持。全129件の独立実機解決確認 **0/129**（C06 0/17）。「コード実装・自動検査成功」と「Androidで完成した」を混同しない。

**次回「続けて」**：C06-001の未対応ブラシ・消しゴムでの選択付き仮表示、C06-007の確定マスクとの一致、C06-015のコピー元全画面読み取り削減とグループ回帰を改善する。C06の残状態を再照合・Issueに更新後、C07-001〜016へ。mainへはマージしない。


## 2026-11-17 — C06第5回：グループコピーの区画化・選択ブラシの確定計算と一致する仮表示

**作業範囲** C06-015・C06-007（C06全17件の監査IDを照合）。開始HEAD `c8efe164`、最終コードHEAD [`ca43c8ff`](https://github.com/totoro0419/illustro/commit/ca43c8ff361539c1319ee178bfcea344b28ed53c)。監査元のC06.mdとC07.mdを取得し、分類・固定IDは維持。

### C06-015
- [`4ed370fd`](https://github.com/totoro0419/illustro/commit/4ed370fdedac7bbee352f069f345b4d24cbcb21e)：Coreで128px区画リストを貼り付け可能にし、256pxの保存用区画へ位置ずれ・境界・複数レイヤーを正確に展開。4000×4000・複数レイヤー・部分画素・透明・保存/復元・Undo/Redo・不正入力をテスト。
- [`d5493995`](https://github.com/totoro0419/illustro/commit/d54939950aa61bf93043ace129b01bc297c91d72)：通常の**編集可能なグループコピー**では各レイヤーの全画面RGBAを作らず、既存のGPU描画区画だけを最大1MiBずつ取得し、区画形式でクリップボードへ保持。貼り付け時は位置を指定して必要区画だけ確定。グループ構造・編集可能性・Undo/Redoのテスト追加。変形、線画領域、白背景など特殊なレイヤーは互換性のため従来の全面取得を維持。
- C06-015の原指摘「小さな選択範囲の貼り付けでも全画面配列」は前回の`162a37c2`で小領域の直接配置対応済み。今回の変更は、追加で通常グループの**コピー元**の過大な全画面取得を削減したもの。全ケースでGPU読戻し量が減るとは断定しない。

### C06-007
- [`ca43c8ff`](https://github.com/totoro0419/illustro/commit/ca43c8ff361539c1319ee178bfcea344b28ed53c)：入力中の選択ブラシに、**確定時と同じ`brushSelection()`で選択画素の増減を計算する**部分表示を追加。短く小さな筆操作は画素ごとの正確な差分をCanvasに描き、筆圧・硬さ・透明度・重なり・加算・減算を同じルールで表示。画面上の回転・反転・拡縮に合わせて重ねる。計算負荷の大きい長い線や太い筆は既存の軽いSVG仮表示へ戻し、入力中の固まりを避ける。純粋な画素差分を従来の確定処理と全画素比較するテスト追加。
- **未確認**：画面上でのCanvas表示の画素補間、確定への切替時のちらつき、Android筆圧、サイズ上限付近、長い線の近似SVGと確定画素の一致。近似SVGを「完全一致」と扱わない。

### C06全17件の区切り／C07移行条件
- 元監査C06.mdの**C06-001〜017を17件一致**で再照合。C03〜C06のコード再判定は**65/129**。全てに既存の対応・再判定履歴あり。ただし**C06-001**は通常筆の選択マスク付きCPU仮表示まで実装し、消しゴム・特殊合成・下層等の仮表示は未対応。**C06-002**は画像全面配列廃止・疎な区画処理済みだが、既存の描画済み区画全体を取得する必要があり、密な作品の性能は未計測。**C06-007**は対応可能な小型操作のみ画素一致、長い操作と実機は未確認。**C06-015**は小矩形配置と通常グループの疎なコピーを対応、特殊レイヤーと実機大容量は未確認。C05-020も別途継続。
- **最終自動検査**：[統合CI #44089117717](https://github.com/totoro0419/illustro/actions/runs/44089117717) **success**（Core/Brush/Editorテスト・型検査・本番ビルド）、[Core CI #44089127333](https://github.com/totoro0419/illustro/actions/runs/44089127333) **success**。直前`d5493995`の[統合CI #44088396405](https://github.com/totoro0419/illustro/actions/runs/44088396405) と [Core CI #44088412857](https://github.com/totoro0419/illustro/actions/runs/44088412857) もsuccess。既知の`prep:check`棚卸し警告は別枠。
- **独立端末の解決確認：C06 0/17、全体0/129**。自動検査は成功しても実機の完成認定ではない。PR #73の監査原本・mainは変更しない。PR #75はDraftのまま。
- **次に「続けて」**：残るC06-001特殊筆仮表示、C06-002密な絵での全占有区画読戻し、C06-007長い線の画素一致、C06-015特殊グループ・実機の未解決はIssue #92に維持したまま、**C07-001〜016の最新実装からの再判定・修正**へ着手。C07では保存・変形原本・Undo/Redoの破損を最優先。


## 2026-11-17 — C07第1回：16件の監査引継ぎ、リンク画像安全性・変形プレビュー・縮小画質

開始HEAD [`52f81d11`](https://github.com/totoro0419/illustro/commit/52f81d111a8c695e8ef3eea82233840a1b654f16)、最終検査済み実装HEAD [`c26e06ac`](https://github.com/totoro0419/illustro/commit/c26e06acc1cb54d9c70085b05e9d57d73423d3d7)。監査元PR #73の`docs/quality-audit/C07.md`から固定**C07-001〜016：全16件**と元A10/B4/C2分類を照合。元監査を編集しない。

| 問題ID | 今回の再判定・変更 | 完了を主張できない範囲 |
|---|--- | --- |
| **C07-005** | [`f8a05b3`](https://github.com/totoro0419/illustro/commit/f8a05b3bee4101ccc959bc8783ec287ab959b205) にて、一般的なファイル選択では自動更新用の継続ハンドルが取得できないことを候補画面で明示し、継続参照の保存が失敗した場合も警告を表示。 | ブラウザー非対応時の自動更新は不可。手動再選択が必要。端末の実際の権限制御は未検証。**部分対応**。 |
| **C07-006** | 同コミットにて、**元ファイルを手動で選び直す際は新しいfileKeyへ切り替える**。同じファイルの自動更新のみ既存キー継続。成功した作品更新後に古い不要なファイル参照を削除（後片付けに失敗しても、新しいキーに古い元画像が開くことはない）。新旧ファイルを別々に保持するテスト追加。 | 保存失敗・権限回復・Android再起動後のケースは実機未検証。 |
| **C07-001** | [`abba189b`](https://github.com/totoro0419/illustro/commit/abba189b6b6d97045cde6d413458c6792c6c78eb)：操作中の280px仮表示は即時維持、停止約220ms後だけ上限768px・画面表示相当の解像度でメインキャンバスの仮表示を更新。古い表示計算を破棄する仕組み・操作終了時タイマー破棄・軽いプレビューへの安全な戻りを追加。4000px作品・縦横比・低解像度のサイズ計算をテスト。 | 下側の元レイヤーに半透明で重ねる方式なので、レイヤー単独の「完成画素が完全にそのまま見える」は未実装。拡大時のピクセル単位一致・実機の操作応答は未確認。**部分対応**。 |
| **C07-014** | [`c26e06ac`](https://github.com/totoro0419/illustro/commit/c26e06acc1cb54d9c70085b05e9d57d73423d3d7)：回転・傾斜のないアフィン変形で「縮小向け」補間を選んだ場合、従来8×8固定サンプルで落ちていた**32倍縮小時の細い線**を、元画素の被覆面積に沿って平均する方式へ修正。作品サイズ相当の巨大な積分画像は作らない。細線・半透明・キャンバス外まで動かしたときの境界テスト成功。 | 回転・傾斜・メッシュ・遠近の「縮小向け」補間はまだ固定上限8×8サンプル。端末の処理時間は未計測。**部分対応**。 |

**既存コードで改善が確認できた項目（今回は再実装なし、実機合格扱いしない）**：
- **C07-007/008**：`transform/panel.ts`に四隅ハンドルで拡縮・上側の点で回転、縦横比固定のチェックボックス、直接操作と数値操作で比率を維持する分岐が存在。
- **C07-009**：変形元画像に複数回のUndo/Redoを保存する配列、最大12手・96MiBの上限が存在。
- **C07-010**：`transform/mask.ts`でメッシュの外へ出たマスク点を勝手に元位置へ残さず、変形操作を拒否する処理。既存の`c07Quality.test.ts`にも回帰テストあり。
- **C07-011**：プレビュー処理用Workerは1セッションで再利用し、元画像と選択マスクをキャッシュする。最終確定は専用Workerのまま。
- **C07-012**：メッシュ再分割で固定点が残せない場合、変更を拒否。固定位置継続テストあり。
- **C07-013**：変形操作の一時Undoは最大48段階、ゆがみ情報の保持点数は上限196608点。実測性能は未検証。

**未実装・継続の監査ID**：C07-002（元画像編集を通常のキャンバスで行う）、C07-003（複数レイヤー一括変形）、C07-004（変形後に描いた線のプレビュー合成）、C07-015（絵の種類に応じた補間の推奨／採否要比較）、C07-016（レイヤー一覧で変形/参照/マスクの状態識別／採否要比較）。またC07-005/001/014の未対応分岐は上記のとおり。

**検査と進捗**：最終HEAD [統合CI #44091737537](https://github.com/totoro0419/illustro/actions/runs/44091737537) **success**（Core・Brush・Editorテスト/型検査/本番ビルド）、[Core CI #44091739882](https://github.com/totoro0419/illustro/actions/runs/44091739882) **success**。前段の [`abba189b` 統合CI #44091239363](https://github.com/totoro0419/illustro/actions/runs/44091239363) ・ [Core CI #44091248403](https://github.com/totoro0419/illustro/actions/runs/44091248403) もsuccess。**C07は4/16件に今回コード修正、7/16件は現行コードの対応を再確認、残り5/16件は個別再実装/採否判断待ち**。この11/16件も実機解決とは区別。C03〜C06の元問題65件＋C07固定16件を参照したが、C07全面網羅・ユーザー実機検査は未実施。**独立解決確認0/129**。C06-001/002/007/015・C05-020の未解決メモも維持。元のPR #73、mainを変更せず統合PR #75はDraftのまま。

**次回「続けて」の開始地点**：C07-004（変形後の描画を変形プレビューに合成）の保存整合を最優先に再確認、次いでC07-002の元画像編集を通常キャンバス操作へ移す方式、C07-003複数レイヤー一括変形の安全な一操作Undo/Redo、残るC07-001/005/014の部分改善。C07-015/016は操作性と負荷の比較で採否を決める。現行の変更を壊す一括再設計はしない。


## 2026-11-17 — C07第2回：変形後の線の仮表示、メインキャンバス元画像編集、複数レイヤーの一括変形

開始HEAD [`0c8398d7`](https://github.com/totoro0419/illustro/commit/0c8398d760e5b57aa3d69ea8dde6263e97b05f30)、最終実装HEAD [`9e49bb15`](https://github.com/totoro0419/illustro/commit/9e49bb15c97ef185f9f7dcd1096f509f5b8834a3)。固定監査ID、PR #73原本・元A/B/C分類は不変更。PR #75 Draftを維持し、mainへマージしない。

### C07-004：変形後の筆をプレビューにも合成
- [`03cf1154`](https://github.com/totoro0419/illustro/commit/03cf115433878c14bdf274b06ae1e302a758b586) で、元の変形画像を描画後、保存してある`postPaint`（変形後に描いた線）を**描画中プレビューWorker内で加算・消去など元のブラシ計算で合成**。通常280px・停止後高解像度の両方に適用し、Workerに保存済みパスを1回だけ送って再利用。比較モード「変形前を見る」には合成しない。保存時の本来の再生経路`replayBrushPasses()`は変更しない。
- 1:1画素の結果を確定側CPU合成と完全比較、縮小プレビューでは位置・直径を縮小して同じ計算式を適用、複数筆順序をテスト。[`355af9c9`](https://github.com/totoro0419/illustro/commit/355af9c9683bd027e5cd64ee7681acda6b2db86c)・[`d3e46d27`](https://github.com/totoro0419/illustro/commit/d3e46d279885f73dd689bf42013f2ae26de754ef) で型検査の不一致を修正。**後者の統合CI #44099628596・Core CI #44099641832はいずれもsuccess**。
- **未確認・部分対応**：縮小プレビューのブラシ幅、マスク/絵の種類/ペン速度による最終画素との完全一致は未確認（縮小版は近似）。非常に多くの後描き筆をプレビューで再計算する際の応答性は未計測。

### C07-002：制作キャンバスで変形前の元画像を直接編集
- [`1845e449`](https://github.com/totoro0419/illustro/commit/1845e44996aee66e19bcc65e75516a5622469d95)：`BrushSurface.setCanvasEditGesture`に筆圧・傾き・時刻を含む実際のペン入力`completeSamples`を追加。変形前の画像を編集するモードで、既存の小さい専用キャンバスではなく**通常の制作キャンバス上で直接ブラシ/消しゴム入力**を受け、既存の`CanonicalBuilder`／`replayBrushPasses`に渡す。元画像編集の一時Undo/Redoと「変形後の確認」へ戻る導線は保持。編集モードでは元画像を独立した市松模様背景に表示。大きな作品では表示用だけ最大1024pxに縮小し、操作自体は作品本来の画素座標を使用。編集終了時の入力ハンドルを解除。表示解像度・メモリ制限テスト追加。
- 同コミットの[統合CI #44100080588](https://github.com/totoro0419/illustro/actions/runs/44100080588)・[Core CI #44100088228](https://github.com/totoro0419/illustro/actions/runs/44100088228) はsuccess。
- **未確認・部分対応**：操作中の仮線は既存のガイド表示であり、通常のペン描画中の高品質仮線とはまだ一致しない。元画像を編集する画面の実機の筆圧・タッチナビゲーション・4K長時間操作は未検証。元画像の編集結果は「変形を適用」するまで一時状態で保持。

### C07-003：選択した複数の描画レイヤーを一括で移動・回転・拡縮
- [`6b26e7c5`](https://github.com/totoro0419/illustro/commit/6b26e7c5b06b7415d0736c08e01b71ee0028b10a) で既存「複数レイヤー整列」の画面に**まとめて変形**の操作を追加。全選択レイヤーに共通中心と数値変形（移動・縦横倍率・角度・補間方法）を適用し、確定前に各レイヤーの移動先の輪郭を可視化。既存の絵をレイヤー同士で結合しない。
- 元のCore`replaceLayerDeformation()`は**1レイヤー専用**で、同じトランザクション中に2回呼ぶと失敗する保護がある。そこを緩めず、[`d40ef01e`](https://github.com/totoro0419/illustro/commit/d40ef01e0cc9b4dee813374d653b4c32222dc70e)で**全対象を先に検証し、各レイヤーの非破壊変形スナップショットを1操作として確定する専用`replaceLayerDeformationsBatch()`をCoreに実装**。失敗すればまとめて中断。1回のUndo・Redo、元原本Revision参照、保存復元、重複IDの拒否をCore単体テストで確認。[`bc00ca01`](https://github.com/totoro0419/illustro/commit/bc00ca01db61b94121047a8fcac315c44879a9a9)でテストの「nullまたは未設定」を区別、[`9e49bb15`](https://github.com/totoro0419/illustro/commit/9e49bb15c97ef185f9f7dcd1096f509f5b8834a3)で画像配列の変数名重複を修正。
- [最終統合CI #44101867348](https://github.com/totoro0419/illustro/actions/runs/44101867348) **success**（Core/Brush/Editor、型検査、本番ビルド）、[Core CI #44101881377](https://github.com/totoro0419/illustro/actions/runs/44101881377) **success**。途中の`6b26e7c5`/`d40ef01e`/`bc00ca01`ではテスト失敗・型検査失敗あり、最終HEADで修正を確認。旧`prep:check`文書警告は別管理。
- **未確認・部分対応**：今回対象は**複数選択した通常の描画用レイヤー**。文字・リンク画像・既存の非破壊変形・線画領域・位置ロック・白背景は安全のため拒否する。プレビューは輪郭位置であり画素そのもののプレビューではない。4Kの大容量複数レイヤーの処理性能・端末操作は未計測。

### C07進捗・次の着手点
- 今回**C07-002/003/004の3件にコード実装・自動テスト**。前回の4件（001/005/006/014）を加えると**7/16件に追加修正**、前回の7件（007〜013）は既存コードの対応経路を確認。残る**C07-015・016の提案2件は採用比較・実装判断待ち**。ただし修正した7件は一部未完成・実機未確認のため「7件完全解決」とは表現しない。
- **独立した実機解決確認0/129**。C05-020／C06-001・002・007・015の未完了状況も維持。固定全129問題ID/監査PR #73の原本を保護。
- **次回の「続けて」**：C07-015（補間方法のおすすめ）・C07-016（レイヤー状態表示）を直感性と表示負荷で比較し実装、次にC07-001のキャンバス上で正確な変形画素プレビュー、C07-002の仮線と筆圧の画面一致、C07-003の既存非破壊変形／特殊レイヤー対応と4K性能、C07-004の縮小時の描画差と大量筆の性能へ進める。C07全16件のID別状態を再確認してからC08へ進む。mainにはマージしない。


## 2026-11-18 — C07第3回：C07-015補間おすすめ・C07-016レイヤー編集状態の明確化

**開始HEAD** [`00fd8a21`](https://github.com/totoro0419/illustro/commit/00fd8a21222da85f23bdf7b95751948e0df5b521)、**最終コードHEAD** [`e406deb4`](https://github.com/totoro0419/illustro/commit/e406deb4ed4ef49f600f30714486f266755a5e9d)。監査PR #73の元16問題ID、元C/P2分類は変更しない。

### C07-015（改善提案C：採用・追加実装）
- [`b51366bd`](https://github.com/totoro0419/illustro/commit/b51366bdac7362301057a7feb94e09a82887d05d)：`transform/interpolationAdvice.ts`に**描く絵の種類と変形方法に応じた任意の補間おすすめ**を実装。`transform/panel.ts`の1枚変形と`transform/layoutPanel.ts`の複数枚まとめて変形に共通適用。「一般的なイラスト／線画／ドット絵／写真」を利用者が指定し、「ドット絵向け（境界維持）／縮小向け（回転・傾斜なしの縮小時のみ面積平均）／なめらか」の推薦理由と制約を平易に表示。
- **推薦だけでは設定を変更しない**。「おすすめを選ぶ」を押した場合のみ、編集候補の補間を変更する。最終的な作品の確定も元の「変形を適用」を通す。ドット絵での硬い画素・回転やメッシュで面積補間を安易に推薦しないこと・初期設定を変更しないことを4ケースで自動テスト。
- 画像内容の自動識別や品質優位性を実測したとは主張しない。画像ごとに利用者が用途を選ぶ方式。Androidでの操作回数・誤選択率・視認性の比較は未実施。**改善案採用・自動検査成功、実機検証待ち**。

### C07-016（改善提案C：一部採用・追加実装）
- 同[`b51366bd`](https://github.com/totoro0419/illustro/commit/b51366bdac7362301057a7feb94e09a82887d05d)で`transform/layerEditingStates.ts`を追加。`apps/editor/src/main.ts`のレイヤー一覧・ページ一覧双方で、保存済みの情報だけから「変形を再編集可／変形OFF」「外部画像を参照／画像を埋め込み／他のレイヤーの画像を使用」「マスク：連動／マスク：独立／マスクOFF」を表示。読み上げラベルと表示補助も一致させる。状態の変更で一覧を描き直し、単なる筆入力では不要な再描画を発生させない既存の一覧キャッシュを維持。
- 保存データの形式、レイヤーの並び順、クリック・ドラッグ・ロックの仕様には手を加えない。主な状態の組合せ、ON/OFF、リンク種別を4ケースの単体テストで検証。[`e406deb4`](https://github.com/totoro0419/illustro/commit/e406deb4ed4ef49f600f30714486f266755a5e9d)で`LayerImageLink`の種類ごとの参照キー読み取りを型安全に修正。
- **未実装**：レイヤー行から特定の変形・画像リンク・マスク設定へ直接ジャンプする専用ボタン/操作。既存行を選択して関連の設定画面を開く旧導線は維持。タブレットの狭い画面での見切れ・読み上げ・誤操作率は未実機検証。**表示機能は自動検査成功、詳細画面への直接導線と実機検証待ち**。

### 検査の根拠・未解決
- **最終コード`e406deb4`**：[統合CI #44178059599](https://github.com/totoro0419/illustro/actions/runs/44178059599) **success**（Core/Brush/Editorテスト、TypeScriptの型検査、本番ビルド）、[Core CI #44178073961](https://github.com/totoro0419/illustro/actions/runs/44178073961) **success**。最初の`b51366bd`では画像リンクの種別による型検査が失敗し、最終HEADで修正・再検査成功。既知の`prep:check`原型文書分類警告は従前のまま。
- **C07全16問題ID**：この回でC07-015・016の2件に追加実装。累計**9/16件に追加修正（001〜006・014〜016）、7/16件は現行の対応経路を再確認（007〜013）**。この16件を「完成・独立解決確認済み」とは扱わない。C07-001/002/003/004/005/014/016の部分対応・未検証経路、C05-020とC06-001/002/007/015の保留を維持。全体129件の独立Android実機解決確認 **0/129**。
- **次回「続けて」**：C07-016の各レイヤー状態から該当設定へ直接進める導線を、既存のレイヤー選択・ドラッグ操作を壊さず追加する。C07-001変形中のキャンバス表示と確定画像の差、C07-002元画像の描画中仮表示、C07-003複数4Kレイヤーのメモリ、C07-004縮小時の後描き筆プレビュー等を再検査・改善する。十分な根拠と回帰確認ができてからC08へ。**main未マージ、PR #75 Draft、監査PR #73原本を保護。**


### 2026-11-18 C07第3回追補：レイヤー一覧から編集画面へ直接移動

第3回前半で「C07-016の詳細画面への直接導線は未実装」と記録した点を、この追補で更新。**実装後の最新状態を優先**。

- [`8a214fca`](https://github.com/totoro0419/illustro/commit/8a214fca361306324e0c10f978bdc58beb882a81) で`layerEditingTargets()`を追加し、既に変形・リンク画像・マスクを持つレイヤーだけ、レイヤーページに「変形」「画像」「マスク」編集ボタンを表示。通常のレイヤーを選択する操作、ドラッグでの並べ替え、表示/ロックの既存操作を維持し、複数選択モードでは編集ボタンを出さない。
- 設定ボタンは対象レイヤーを選択してから、既存の右側パネルを開き、対応する設定欄へスクロールする。`shellUi.openBox()`を再利用し、専用の二重設定画面は作らない。変形・画像の設定欄には識別用のデータ属性を付け、マスクは既存の`layerVectorMask`を開く。
- [`bf54a963`](https://github.com/totoro0419/illustro/commit/bf54a9639a32de34f1ba357323d8404cec156064) で、別レイヤーを選んで変形設定を開いた場合に、古いレイヤーの未確定候補が残っていると無効化して開き直す処理を追加。変形中の保存経路や作品ファイル仕様は変えない。
- 編集ボタンの生成対象を純粋な関数でテスト（変形のみ、リンク+マスク、変形+マスク、何もない場合）。[直前`8a214fca`の統合CI #44179139097](https://github.com/totoro0419/illustro/actions/runs/44179139097) と [Core CI #44179152484](https://github.com/totoro0419/illustro/actions/runs/44179152484) **success**。
- **最終コードHEAD `bf54a9639a32de34f1ba357323d8404cec156064`**：[統合CI #44179382161](https://github.com/totoro0419/illustro/actions/runs/44179382161) **success**（Core/Brush/Editorテスト、TypeScript、本番ビルド）、[Core CI #44179396276](https://github.com/totoro0419/illustro/actions/runs/44179396276) **success**。Androidタブレットでのボタン幅・移動先・操作負荷は独立して未確認。「実装・自動検査成功」と「実機品質認定」を区別する。

**C07-015/016の提案2件は、コード上の機能と基本操作の実装がそろった。ただしC07全体の独立合格認定はまだない。** C07の他の部分対応（001/002/003/004/005/014）、C05・C06からの未解決も保留。固定C07-001〜016と全129件のIDを維持し、独立Android実機の解決確認は **0/129**。次回はC07-001・002・003・004のプレビュー精度・高解像度性能・操作の回帰へ。元PR #73を改変しない、main未マージ、PR #75 Draft。


## 2026-11-18 07時台 JST — C07プレビュー追加修正の監視確認

- 前回記録済みHEAD `963c9884` から最新確認HEAD [`7ed47052`](https://github.com/totoro0419/illustro/commit/7ed47052fb4a98f0dcd2387e1d507cf04b968667) まで **12コミット、変更9ファイル**。GitHub比較で `ahead_by=12`、`behind_by=0` を確認。変更範囲は `apps/editor/src/transform/{groupTransform,panel,previewReplacement,run,workerSession.test,groupTransform.test,previewReplacement.test}.ts` 等、`apps/editor/src/brushSurface.ts` と統合担当所有 `apps/editor/src/main.ts`（2行追加）。
- **C07-001の追加対応**：通常合成・不透明・マスクなし・最上位の描画レイヤーだけ、キャンバス上の変形仮表示で元レイヤーを置換する判定を追加。グループ・クリッピング・リンク・効果・非通常合成などは元の近似表示へフォールバックし、閉じたときに表示状態を戻す。最終コミットで安全条件と表示復帰の単体テストを追加。変形Workerのプレビュー要求直列化・キャッシュ、複数レイヤー変形入力検証も変更。**描画結果の完全一致や4K性能は未実機確認**。
- [最新HEADのCore CI #44186340715](https://github.com/totoro0419/illustro/actions/runs/44186340715) は `success`。ジョブの `core:typecheck` と `core:test` の成功を再取得。ただし**同HEADの統合CI（Brush/Editor/型検査/本番ビルド）成功は今回確認できず、統合全体PASSとは判定しない**。旧 `prep:check` の未分類文書による既知の失敗も解消確認なし。
- 新規実装PRなし（最新作成は#97）。12担当PRは既存の12/12統合を維持。PR #75はDraft・未マージ、調査PR #73はDraft・未マージ（原本9ファイル、129問題ID、A/B/C確度を維持）。`main` は `bdc7135b` のまま。**独立解決確認0/129、Androidペン/指・旧作品保存復元・4K画素一致は未確認**。
- 今回は新規PRの受入・マージなし。次回は最新HEADの統合CIと、C07プレビューのレイヤー順・マスク・非通常合成・キャンセル時復帰・連続入力・保存/Undoを確認する。無条件に合格としない。


## 2026-11-18 08時台 JST — C07〜C10横断差分の監視

- 直前の監視記録の実装HEAD `7ed47052` から、確認時HEAD [`2cfafdbb`](https://github.com/totoro0419/illustro/commit/2cfafdbb41dc055a259bc4b3fc634003eaddd352) まで、GitHub比較で **32コミット、19ファイル**の変更（behind=0）。今回の変更は既存の統合ブランチへ直接積まれており、**新規実装PRの提出・マージではない**。
- 変更箇所はC07変形プレビュー（`transform/panel.ts`・`previewReplacement.ts`）、C08塗り参照と細部確認（`fill/panel.ts`・`reference.ts`・`detailPreview.ts`）、C09定規・図形のガイド処理（`artwork/guidedPath.ts`・`shapeGradient.ts`）、C10ベクターの演算元の検証・表示（`artwork/booleanSourceVisibility.ts`・`vectorPanel.ts`）に及ぶ。共通 `apps/editor/src/main.ts` と `brushSurface.ts` も変更されており、保存/Undo/Redo・描画・レイヤー操作との横断回帰が必要。変更ファイルの存在は確認したが、**全機能の完成・画素一致を認定するものではない**。
- 最新HEADに紐づく [Core CI #44196806326](https://github.com/totoro0419/illustro/actions/runs/44196806326) は **success**（verifyジョブ）。一方、**同HEADのBrush/Editorテスト・型検査・本番ビルドを含む統合CIの成功は確認できない**ため、統合全体PASS・実機合格とはしない。旧 `prep:check` は元の未分類ドキュメントで失敗する既知事項として維持し、PASSに数えない。
- 11月18日作成の新規PRは0件。既存12担当PRの統合済み12/12を維持し、PR #75と独立調査PR #73はDraft・未マージ。調査原本9ファイル、129件の既存問題IDと元A/B/C分類は変更しない。比較した `main` は従来の `bdc7135b` から変更なし。
- **独立解決確認0/129**。Androidのペン・指操作、旧作品保存/復元、4K作品の応答性、変形・塗り・図形・ベクターの画素一致は未検証。新規PRの受入・マージなし。次回は最新HEADの統合CI、共有ファイル変更とC07〜C10の回帰を確認する。


## 2026-11-18 10時台 JST — C08/C09ライブ仮表示・C10文字組み追加の統合監視

- 前回記録コミット `ecdc38d2` から最新確認HEAD [`d50ec20c`](https://github.com/totoro0419/illustro/commit/d50ec20caee704cfe5990f604ba58c05c29f88a7) まで、GitHub比較で **26コミット・14ファイル変更**（ahead=26、behind=0）。既存の統合ブランチへの追加変更であり、**新規実装PRのマージではない**。
- **C08**：`fill/liveRegionPreview.ts` と `fill/panel.ts`、`brushSurface.ts` に塗り領域のブラシ移動中の軽量仮表示を追加。最大512pxを標準とする縮小表示を再利用し、塗り確定のWorkerを正本とする。マスク・アンチエイリアスを含む最終画素と仮表示の一致は未検証。
- **C09**：`symmetryStrokePreview.ts` と `brushSurface.ts` に対称筆跡の近似仮線を追加。入力中の複製ガイドと確定時のブラシ再生は別処理であり、画素完全一致は未確認。共有表示面の競合を避けるため既存C07変形Canvasとは別の一時表示を使用。
- **C10文字**：`artwork/textLayout.ts`・`verticalGlyph.ts` と関連テストを追加。テキスト枠内の折返し・表示行数制限、縦書きの句読点・小書き仮名・一部記号の配置補助を導入。保存済み文字列は変更しない。フォント差・旧作品・Androidでの実表示は未検証。
- 今回の比較には **`apps/editor/src/main.ts` の変更なし**。`brushSurface.ts`・`artwork/render.ts`・`packages/core/src/editableArtwork.ts` の横断差分は確認したため、C07変形、C08塗り、C09対称、C10文字、保存・Undo/Redoの相互回帰は継続。
- 最新HEAD `d50ec20c` の [統合CI #44211817176](https://github.com/totoro0419/illustro/actions/runs/44211817176) は **success**。ジョブのCore・Brush・Editorテスト、型検査、Editor本番ビルドの各ステップ成功を確認。[Core CI #44211825207](https://github.com/totoro0419/illustro/actions/runs/44211825207) もsuccess。旧`prep:check`の未分類文書に起因する既知の診断失敗は **PASSではない**（統合CI内で診断扱い）。
- 2026-11-18作成の新規PRは **0件**。既存12担当PRは **12/12統合済み**、PR #75とPR #73はDraft・未マージ。`main` は `bdc7135b` から変更なし。調査原本9ファイル、既存129問題ID、A/B/C分類を保持し、**独立解決確認0/129**。Androidペン/指・4K応答性・保存復元・画素一致は未検証。
- [Issue #74の共有表示変更報告](https://github.com/totoro0419/illustro/issues/74#issuecomment-6965685729) は既に記録されているため、同内容の重複コメントは行わない。新規PRの統合・mainへの変更なし。


## 2026-11-18 11時台 JST — C08/C09/C10追加差分の再確認・統合CI照合

- 前回台帳更新コミット [`3bf39b93`](https://github.com/totoro0419/illustro/commit/3bf39b937b045857075a82df58f178137ad15822) から、今回の確認HEAD [`0970cb1b`](https://github.com/totoro0419/illustro/commit/0970cb1b9eb993785f8cbbc512d0e8f77aebb5c3) まで、GitHub比較で **16コミット・11ファイル変更**（ahead=16、behind=0）。この追加は既存の統合ブランチへの直接コミットであり、新しい実装PRのマージではない。
- **C08**：`fill/liveColorPreview.ts` と `fill/panel.ts` に色塗りライブ仮表示を接続。準備を非同期化し、古い結果を操作識別子で破棄する設計。確定画像との画素一致、Androidでの遅延は未検証。
- **C09**：`artwork/gradientMap.ts` に階調確認表示、`gradientToneInspection.ts` と単体テストを追加。グラデーションの実機画質は未検証。
- **C10**：`artwork/run.ts` と `textWorkerSafety.ts` に標準フォントに限定したWorker描画経路を追加。カスタム文字は従来のCanvas処理を維持。`artwork/pathOperations.ts` はAdaptive Bézierの点数予算内での折れ線化を改善。保存・Undo/Redoと旧作品の実データ互換性は未検証。
- 変更ファイル11件は `gradientMap.ts`、`gradientToneInspection.ts/.test.ts`、`pathOperations.ts/.c10.test.ts`、`run.ts`、`textWorkerSafety.ts/.test.ts`、`fill/liveColorPreview.ts/.test.ts`、`fill/panel.ts`。今回の比較に **`apps/editor/src/main.ts` と `docs/quality-audit/` の変更なし**。共通描画・保存・履歴の回帰を引き続き要確認。
- 最終HEAD `0970cb1b9eb993785f8cbbc512d0e8f77aebb5c3` の [統合CI #44219244865](https://github.com/totoro0419/illustro/actions/runs/44219244865) は **success**。ジョブのCore/Brush/Editorテスト、型検査、Editor本番ビルドの各ステップもsuccess。[Core CI #44219251079](https://github.com/totoro0419/illustro/actions/runs/44219251079) もsuccess。ただし旧`prep:check`は従来の未分類ドキュメントに起因する診断失敗を含み、**prep:check自体のPASSとは扱わない**。
- 11月18日作成の新規PRは **0件**。12担当PRは既に **12/12統合済み**、PR #75と原調査PR #73は **Draft・未マージ**。PR #73の原調査9ファイル・129件のID・A/B/C確度（81/29/19）は改変しない。`main` のHEADは `bdc7135b51033982d90ea5dad104bb04fc107df2` から変更なし。
- **独立解決確認0/129件**。Androidペン/指、4000×4000、画素一致、旧作品の保存復元は未検証。今回の新規PRマージはなし。共有変更の内容と検査は [Issue #74の既存報告](https://github.com/totoro0419/illustro/issues/74#issuecomment-6966672250) に記録済みのため重複コメントは行わない。

## 2026-11-18 15時台 JST — C08/C09/C10追加修正の統合監視（第11回）

- 前回記録HEAD [`9b154d7b`](https://github.com/totoro0419/illustro/commit/9b154d7b1dbce72b72d2e97b91449343c931e660) → 最新実装HEAD [`6fbb3908`](https://github.com/totoro0419/illustro/commit/6fbb3908b7c9a09dd10f44ea5a2ac517580d23aa) は、GitHub比較で **12コミット・8ファイル変更**（ahead=12、behind=0）。新規PRのマージではなく、統合ブランチへの追加実装コミット。今回の差分に `apps/editor/src/main.ts`、`docs/quality-audit/`、`docs/quality-integration/` は含まれない。
- **C08-001/014**：`fill/pixels.ts` に自動隙間接続と局所候補の誤接続防止を追加。2つの線端の間の周辺に第3の線が近接する場合を拒否する。安全な線端の接続を維持する回帰テストを追加。**C08-013**：三重・離散閉領域の分類テストを追加。多様な線画での完全保証や実機での候補精度は未確認。
- **C09-013**：`artwork/gradientDistance.ts` と `artwork/render.ts` で、形状追従グラデーションの境界距離を縦横別の縮小倍率に基づく作品画素単位へ修正。縦横の縮小率が異なる場合のテスト追加。**C10-012**：`artwork/textPlacement.ts` を共通化し、通常文字と輪郭化の行頭・行送り・縦書きセル位置の式を揃える。フォント差を含む最終画素一致は未検証。
- 最終コードHEAD `6fbb3908` の [統合CI #44251968962](https://github.com/totoro0419/illustro/actions/runs/44251968962) は **completed/success**。Coreテスト/型検査、Brush回帰、Editor単体テスト、Editor TypeScript/本番ビルドの各ステップがsuccess。[Core CI #44251976551](https://github.com/totoro0419/illustro/actions/runs/44251976551) もsuccess。旧`prep:check`の未分類文書に起因する診断失敗は継続し、**prep:check自体のPASSではない**。
- 新規実装PR **0件**、既存12担当PRは **12/12件統合済み**。PR #75とPR #73はDraft・未マージ。PR #73の原調査9ファイル、129件の問題ID、元A/B/C確度を保護。 `main` は `bdc7135b` のまま。
- **独立解決確認0/129件**。Androidペン/指、4000×4000画素、プレビューと確定画素の一致、旧作品の保存復元・Undo/Redo実機検査は未完了。今回の差分は自動検査成功までで、全件解決とは判定しない。
- [Issue #74の既存コメント](https://github.com/totoro0419/illustro/issues/74#issuecomment-6971098992) と [Issue #92の実装報告](https://github.com/totoro0419/illustro/issues/92#issuecomment-6971092787) に同一HEADの変更・検査・未完了条件が記録済みのため、重複投稿は行わない。追加PRマージ、`main`・公開アプリ・過去ブランチの変更なし。

## 2026-11-18 18時台 JST — C08〜C10追加実装の統合監視

- 前回台帳更新HEAD [`83eba03d`](https://github.com/totoro0419/illustro/commit/83eba03d77c487bbe3227d72d6984c34e2d94092) から確認時の最新実装HEAD [`9cad0f13`](https://github.com/totoro0419/illustro/commit/9cad0f13761b3e36374f3295e5dacafed8fa6a5c) まで **23コミット・16ファイル変更**（GitHub compare: ahead=23、behind=0）。新規実装PRのマージではなく、統合ブランチへの直接追加実装。変更ファイルはC08 `fill/`、C09 `artwork/run.ts`・`shapeGradient.ts`・`workerQueuePolicy.ts`、C10 `artwork/text*`・`fonts.ts`・`render.ts`、Core `editableArtwork.ts`・`index.ts`。比較範囲に `apps/editor/src/main.ts`、`docs/quality-integration/`、`docs/quality-audit/` の変更なし。
- **C08-010**：色指示線の形を保つ平行移動とキャンバス上の直接ドラッグを追加。**C08-015**：境界変更なしの場合の再解析省略・安全条件下での元画像再利用を追加。ただし変更がある場合の領域全体再解析は残る。
- **C09-011**：描画Workerキューで正式確定をプレビューより優先し、古い図形/グラデーションプレビューを中断可能にした。4K全画素生成量の削減と実機応答測定は未完了。
- **C10-009**：旧作品互換の任意 `styleRanges`（UTF-16範囲・色・サイズ）を導入し、文字の部分書式、編集時の範囲更新、表示・単色の輪郭化に接続。異なる文字色を一本のベクターパスにする操作は色消失を防ぐため拒否。最後のコミットで600個の部分書式範囲を保持する回帰テストを追加。AndroidのIME・文字選択、フォント差・最終画素一致は未確認。
- 最新HEAD `9cad0f13761b3e36374f3295e5dacafed8fa6a5c` の [統合CI #44265743415](https://github.com/totoro0419/illustro/actions/runs/44265743415) はジョブとCore/Brush/Editorテスト・Editor型検査・本番ビルドの各ステップが **success**。[Core CI #44265754348](https://github.com/totoro0419/illustro/actions/runs/44265754348) も同一HEADで **success**。旧 `prep:check` は元の未分類ドキュメントに起因する既知の不一致を診断扱いしており、`prep:check` 自体をPASSと認定しない。
- 新規実装PR **0件**。12担当PR（#76/#77/#80/#81/#82/#83/#84/#86/#88/#89/#90/#97）は個別に再取得し、全件が指定統合ブランチをbaseとして **12/12マージ済み**。PR #75・調査PR #73は **Draft・未マージ**、調査PR #73の原調査9ファイル・129件の既存ID・A/B/C確度を維持。`main` は `bdc7135b` から変更なし。
- **独立解決確認0/129件**。Androidのペン/指・IME、4000×4000の遅延/メモリ、旧作品保存/復元・Undo/Redo、プレビューと確定画素の一致は未検証。C08-015の真の差分再解析、C09-011の全画素コスト、C10-009の多様な部分書式も残る。**新規PRの受入・追加マージなし**。
- [Issue #74の既存コメント](https://github.com/totoro0419/illustro/issues/74#issuecomment-6973072810) に同一HEADの共有ファイル変更・検査・未解決条件が記録済みのため、重複コメントは行わない。PR #73原本、`main`、公開アプリ、過去ブランチは変更しない。


## 2026-11-18 19時台 JST — C08/C09/C10追加実装の検査・台帳同期

- 前回台帳更新HEAD [`84c916e9`](https://github.com/totoro0419/illustro/commit/84c916e96082396c1cd404929e982f53db2bd839) から今回の実装HEAD [`6131ad6a`](https://github.com/totoro0419/illustro/commit/6131ad6ae89664660b2fadfeee142971e5681593) まで、GitHub比較で **15コミット・11ファイル変更**（ahead=15、behind=0）。追加実装は既存の統合ブランチへの直接コミットであり、新規PRのマージではない。差分に `apps/editor/src/main.ts`、`docs/quality-integration/`、`docs/quality-audit/` の変更はない。
- **C08**：`fill/incrementalBoundary.ts`・テストを追加し、手動境界追加の限定的な差分更新を `fill/panel.ts` へ接続。適用が不確実な条件では既存Workerの全体解析へ戻る。旧RegionGraphを保持する設計。あらゆる画像での増分解析の正確性・速度は未検証。
- **C09**：`artwork/alphaBands.ts`・テストと `artwork/render.ts` の変更で、図形追従グラデーションの4Kアルファ読み出しを2MiB以下の行ブロックに分割。Androidのメモリ使用量・速度と実画素一致は未検証。
- **C10**：`packages/core/src/editableArtwork.ts`、`artwork/textStyles.ts`、`textPanel.ts`、`render.ts`、`fonts.ts` とテストで、部分太字/斜体の保存・編集・Canvas描画を接続。安全性が保証できない輪郭化は拒否。旧作品・Android IME・フォント差・最終画素一致は未検証。
- 実装HEAD `6131ad6a` の [統合CI #44275958699](https://github.com/totoro0419/illustro/actions/runs/44275958699) は **completed/success**。ジョブでCoreテスト/型検査、Brush回帰、Editor単体テスト、Editor型検査・本番ビルドの成功を確認。[Core CI #44275970355](https://github.com/totoro0419/illustro/actions/runs/44275970355) もsuccess。ただし統合CIの所有権強制ステップは **skipped** であり、所有権検査のPASSとは認定しない。旧 `prep:check` は元の未分類ドキュメントに起因する既知の失敗を診断扱いしており、`prep:check` 自体のPASSではない。
- 2026-11-18 19時台時点、新規実装PR **0件**。12担当PR（#76/#77/#80/#81/#82/#83/#84/#86/#88/#89/#90/#97）は個別再取得し、全件 `quality/C03-C10-integration` をbaseとして **12/12マージ済み**。PR #73（原調査9ファイル・129問題ID・元A/B/C分類）とPR #75はDraft・未マージ。 `main` は `bdc7135b` のまま。
- **独立解決確認0/129件**。Androidのペン/指・IME、4000×4000画素の応答性・メモリ、旧作品保存/復元・Undo/Redo、仮表示と確定画素の一致は未確認。自動CI成功を実機合格に読み替えない。新たなPRマージは行わない。
- [Issue #74の第12回コメント](https://github.com/totoro0419/illustro/issues/74#issuecomment-6974503608) に同じ実装HEAD・共有差分・検査結果が記録済みであることを確認したため重複投稿は行わない。 `main`・公開アプリ・過去ブランチ・PR #73原本は変更しない。

## 2026-11-18 21時台 JST — 8件の残修正追加・共有ファイル監視

- 前回台帳HEAD [`d0f70eae`](https://github.com/totoro0419/illustro/commit/d0f70eae94215852974fd2d450cddbba46aff00c) から、今回の実装HEAD [`57bfe871`](https://github.com/totoro0419/illustro/commit/57bfe87189eb57a117686955d76fbb46446801c7) まで、GitHub比較で **3コミット・33ファイル変更**（ahead=3、behind=0）。追加コミットは `49ff0677` / `409d4281` / `57bfe871`。新しい実装PRではなく、統合ブランチへの直接コミット。変更には **`apps/editor/src/main.ts`** が含まれる。原調査 `docs/quality-audit/` と本台帳はこの比較範囲では未変更。
- **C05-020**：素材画像の画素を内包した自作ブラシの生成・選択を `main.ts` に接続。**C07-003/014**：元画像参照を維持したアフィン一括再変形と面積ベースの縮小補間を追加。**C08-015**：連結関係が不変と確認できる境界消去にも局所更新を適用。**C09-008/011**：反復・往復グラデーションと楕円放射、形状追従距離計算の範囲制限。**C10-009/011**：部分フォント指定、実フォントデータのWorker共有と失敗時フォールバック。具体的な実装範囲・未対応条件は [Issue #92の実装記録](https://github.com/totoro0419/illustro/issues/92#issuecomment-6978250909) を参照。
- [統合CI #44301619338](https://github.com/totoro0419/illustro/actions/runs/44301619338) はジョブ・Core/Brush/Editorテスト・Editor型検査/本番ビルドが **success**。[Core CI #44301628222](https://github.com/totoro0419/illustro/actions/runs/44301628222) も **success**。ただし統合CIの **所有権強制ステップは skipped** で、`main.ts` の編集者・変更手順が統合担当専用ルールを満たしたかは自動的に確認できていない。直接コミットを新規PRの受入検査済みマージと同一視しない。
- 旧 `prep:check` は元の未分類ドキュメントに起因する既知の診断失敗が残り、**単独PASSではない**。CIの診断ステップ成功と区別する。
- 11月17日以降の新規実装PR **0件**。既存12担当PRを再取得し、全12件 `quality/C03-C10-integration` をbaseとして **12/12マージ済み**。PR #73は調査原本9ファイルのままDraft・未マージ、PR #75もDraft・未マージ。129件の問題IDと元A/B/C確度は維持。 `main` は `bdc7135b` から変更なし。
- **独立解決確認0/129件**。Androidペン/指/IME、4000×4000画素の速度・メモリ、旧作品の保存/復元・Undo/Redo、プレビューと確定画素の一致は未検証。複雑な一括変形・領域の分断/結合・フォント輪郭化など未対応条件も残る。新規PRの統合・main・公開アプリ・過去ブランチへの変更は行わない。
- 共有変更は [Issue #74の既存記録](https://github.com/totoro0419/illustro/issues/74#issuecomment-6978258029) と照合済み。特に `main.ts` を含む直接コミットの所有権確認は未解決として追跡する。
