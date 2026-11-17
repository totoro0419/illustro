# Illustro C03〜C10 — 品質改善統合台帳

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
