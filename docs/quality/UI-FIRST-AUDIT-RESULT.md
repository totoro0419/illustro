# Illustro UI起点の操作検査結果

**公開プレビューではホームと新規作成画面を操作できた。検査に使ったChromeでは標準サイズでも描画の準備に失敗し、編集画面へ進めなかった。このため、絵を描いて保存するまでの実用性は保留。**

## 対象と確認範囲

- 検査対象は [PR #101](https://github.com/totoro0419/illustro/pull/101) の [`843514b353e118b7c9a895eb3e242740807f7d9d`](https://github.com/totoro0419/illustro/commit/843514b353e118b7c9a895eb3e242740807f7d9d)。比較元は [`quality/C03-C10-integration` の `b2893cc2e58f422e671ad7395b101e8ec7d11afe`](https://github.com/totoro0419/illustro/tree/b2893cc2e58f422e671ad7395b101e8ec7d11afe)。
- [公開プレビュー](https://totoro0419.github.io/illustro/workspace-preview/) はブラウザ内の表示用情報で [`1ab6ea2d9d12beea18e9f8165ada0b3d716264b5`](https://github.com/totoro0419/illustro/commit/1ab6ea2d9d12beea18e9f8165ada0b3d716264b5) と確認。このコミットと検査対象のファイル差分は、既存の操作台帳・初期経路・手順書の3ファイル。
- 既存の336要素の台帳と初期13経路を再利用。元の3つのUIファイルは検査対象で同一。ホーム、作品一覧、作成・復元、ブラシ、色、レイヤー、履歴、表示、キャンバス変更、保存・出力を追い、動的に作られる作品カード、レイヤー行、色見本、ブラシの入力欄も確認した。
- [操作マップ](UI-FIRST-OPERATION-MAP.csv) は58経路。内訳は52経路で処理の接続または入口の欠落を追跡し、後発機能の6経路は入口の記録まで。33シナリオの T001〜T827 は関連する番号として記載。範囲表記は前提や後続の操作を含む。ブラウザ欄で「成功」とした5行は、各行に記した範囲の判定。失敗は1行、未確認は52行。

## 主要な連続操作

| 操作の流れ | ブラウザ結果 |
| --- | --- |
| ホーム → 新しい作品 → 作品名入力 → サイズ・背景を開く → プリセットを切替 → 取消 → 開き直す | 成功。4000×4000と標準512×384への入力欄の切替、取消後のホーム復帰を確認。 |
| 標準512×384 → キャンバスを作成 → 編集画面 | 失敗。2回ともボタンは押せたが、作成ダイアログ内のエラーで止まった。編集・描画へ到達せず。 |
| ホーム → 設定 → ホーム | 成功。設定画面と戻り道を確認。設定画面に表示されたのは説明と描画画面への入口。 |
| ホーム → ファイルから開く → ファイル選択 | 未確認。入口を押したが、検査側でファイル選択の通知を時間内に受け取れなかった。作品ファイルの読込は未判定。 |
| ブラシ → 描画 → 色とレイヤー切替 → Undo・Redo → 消しゴム → 保存 → 同じ作品を開き直す | コード上の接続を確認。編集画面に到達できず、線やファイルの内容、切替後の状態は未確認。 |
| 表示操作 → 切り抜きの取消 → 描画復帰、マイ作品・復元・画像出力 | コード上の接続を確認。描画復帰、保存された内容、画像の色・寸法・透過は未確認。 |

## 発見した問題と修正優先順

### F01 最優先｜描画の準備に失敗すると、作成が止まり原因がホームから分からない

- 再現手順は公開プレビュー →「新しい作品」→ 標準512×384 →「キャンバスを作成」。今回のChromeでは「作成できませんでした。描画画面の状態を確認してください。」と表示され、ダイアログに留まった。取消は可能。
- 編集側の状態表示に `WebGPU unavailable (request-adapter: requestAdapter returned null)` と `WebGL2 float render targets unavailable` が記録された。WebGPUは描画に使う機能の取得に失敗し、代替のWebGL2も描画に使う色データの条件を満たせなかった。初期化エラーは編集側に出る一方、ホームに返す値は `false` で、作成画面には汎用の案内だけが表示される。比較元と描画の初期化・エラー発生箇所にコード差分はない。Androidで報告された事象との同一性は未判定。
- 修正箇所は新規作成フォームと描画初期化の結果の受け渡し。作成画面に原因とその場で選べる対応を出し、対応端末では標準作品を開いて一筆描けるところまで確認する。[新規作成フォーム](https://github.com/totoro0419/illustro/blob/843514b353e118b7c9a895eb3e242740807f7d9d/apps/editor/src/ui/homeShell.ts#L568) · [作成時のエラー処理](https://github.com/totoro0419/illustro/blob/843514b353e118b7c9a895eb3e242740807f7d9d/apps/editor/src/main.ts#L2739) · [描画方式の選択](https://github.com/totoro0419/illustro/blob/843514b353e118b7c9a895eb3e242740807f7d9d/apps/editor/src/brushSurface.ts#L258)

### F04 次点｜作成を取り消すと、開く前の画面に戻らない経路がある

- コードからの再現手順は編集上部「作品」→「新規」→「キャンセル」。または作品が空の「マイ作品」→「新しい作品を作る」→「キャンセル」。どちらもダイアログを開く前に `navigate('home')` が実行され、取消はダイアログを閉じる処理だけ。元の編集には「開いているキャンバスに戻る」、元の一覧には「マイ作品」を押す必要がある。編集・一覧起点でのブラウザ再現は未確認。
- 修正箇所は作成ダイアログの起点管理と取消時の戻り先。編集・一覧それぞれから開き、取消後に同じ場所へ戻ることを確認する。[ダイアログ開始処理](https://github.com/totoro0419/illustro/blob/843514b353e118b7c9a895eb3e242740807f7d9d/apps/editor/src/ui/homeShell.ts#L177) · [編集側「新規」](https://github.com/totoro0419/illustro/blob/843514b353e118b7c9a895eb3e242740807f7d9d/apps/editor/src/main.ts#L2744)

### F03 低｜ホームの案内と実際に探す入口の名前がずれている

- ホームの歯車を押すと「エディターのWorkspaceから変更できます」と表示された。現在の入口は編集の「その他」内の「パネル一覧」。また空のマイ作品には、現行の新規ダイアログから外された「新しい作品 → ファイルから開く」の案内がコードに残っている。
- 修正箇所は設定画面と空のマイ作品の文言。現行の入口をそのまま表示し、必要な場所までたどれることを確認する。[ホーム画面の案内](https://github.com/totoro0419/illustro/blob/843514b353e118b7c9a895eb3e242740807f7d9d/apps/editor/src/ui/homeShell.ts#L99) · [現行の操作メニュー](https://github.com/totoro0419/illustro/blob/843514b353e118b7c9a895eb3e242740807f7d9d/apps/editor/src/ui/shell.ts#L96)

### F02 低｜カラー履歴を一括消去する入口が見つからない

- 確認対象は編集「色」→「パレット」→「カラー履歴」（T224〜T225）。消去処理は `data-color-action=clear-history` 向けに残るが、画面のHTMLと動的生成に対応するボタンがない。パレット管理の削除は保存色1件に対する操作。比較元にも同じ分岐だけがあり、既存手順書に疑いとして記載済みだった。ブラウザでは編集に未到達。履歴消去を提供する場合の修正箇所は履歴見出しのボタン生成と操作の接続。[パレットUIとクリック処理](https://github.com/totoro0419/illustro/blob/843514b353e118b7c9a895eb3e242740807f7d9d/apps/editor/src/color/panel.ts#L75)

## 未確認事項

- Android実機でのキャンバス表示、指・ペン、筆圧や傾き、狭い画面でパネルを閉じて一筆目を描けるかは未確認。
- 同じ作品での色・ブラシ・レイヤーの引き継ぎ、切り抜き・寸法変更後の描画、保存物の再読込、自動保存の復元、通信断からの再開、4000×4000での描画は未確認。
- `npm run brush:build` に続けて `npm run editor:build` に成功。既存の `editor-home-smoke.mjs` のホーム操作と `editor-works-safety-smoke.mjs` の描画確定・再読込の判定を短いローカル検査に転用した。ローカルのChromiumが実行環境の制限で起動できなかったため、この検査は未実行。公開プレビューではPlaywrightの画面操作で上記の範囲を確認した。

CSVの根拠欄では `H` が `ui/homeShell.ts`、`S` が `ui/shell.ts`、`SB` が `ui/shellBehavior.ts`、`C` が `color/panel.ts`、`M` が `main.ts`、`BS` が `brushSurface.ts`、`BA` が `brushAdvancedEditor.ts`、`BD` が `brushDynamicsEditor.ts`、`CSS` が `ui/paintingWorkspace.css`。いずれも `apps/editor/src/` 以下。操作番号の元資料は [M01–M10 連続操作手順](https://github.com/totoro0419/illustro/blob/b2893cc2e58f422e671ad7395b101e8ec7d11afe/docs/quality/M01-M10-CONTINUOUS-OPERATIONS.md)。
