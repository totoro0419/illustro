# Illustro UI起点調査：初回の確認済み操作経路

- 調査日：2026-11-20
- ブランチ：`quality/painting-workspace-ux`（PR #101）。元のUIソース：`1ab6ea2d9d12beea18e9f8165ada0b3d716264b5`。
- **検査種別：コード上の接続確認のみ**。ブラウザで押せた・使えた・描けたという判定ではない。
- 初期全操作部品台帳：`UI-FIRST-CONTROL-INVENTORY.json`（UI生成の3ファイルから336行を抽出。ほかのファイル、動的生成、画面の見え方は未調査）。

## コードで追跡できた経路（初回）

| 出発点 | 操作 | コード上の次の処理／画面 | 閉じ方・次へ進む道 | 根拠 |
| --- | --- | --- | --- | --- |
| ホーム | 「新しい作品」(`#ihStart`) | `showNew()` で新規作品ダイアログ | ダイアログ内キャンセル・作成へ | `ui/homeShell.ts:431,438` |
| 新規作品ダイアログ | 「キャンバスを作成」(`#ihNewCreate`、フォーム送信) | サイズ検証 → `actions.createDocument(...)` → 成功時 `navigate('editor')` | 入力エラーは画面表示、作成ボタンを復帰 | `ui/homeShell.ts:564-581` |
| ホーム | 「ファイルから開く」(`#ihSelectFile`) | `actions.openFile` へ接続 | 読込結果と失敗時の画面は別途検査 | `ui/homeShell.ts:438` |
| ホーム | 「前回の作業を続ける」(`#ihContinue`) | `showRecovery(true)` へ接続。候補状態に応じて押せるか切替 | 復帰先の作品・保存の状態は別途検査 | `ui/homeShell.ts:318,431` |
| 描画画面 | レイヤー(`#layer`) | `setLayerPage(!layerOpen)` で一覧画面を開閉 | `#closeLayerPage` から戻れるコードあり | `ui/shellBehavior.ts:78-92` |
| 描画画面 | 色(`#colorPage`) | `togglePanel('colorBox',...)`、同じ入口を再押下で閉じる | 色パネル内で「カラー」／「パレット」を切替 | `ui/shellBehavior.ts:135-139`、`color/panel.ts:105-121` |
| 色パネル | 「カラー」／「パレット」(`#colorShowColor`/`#colorShowPalette`) | `selectScreen(...)` が表示とキーボードの状態を更新 | 同じ2タブ間を往復可能なコードあり | `color/panel.ts:109-121` |
| 色パネル | 「色選択の表示モード」(`#colorPickerMode`) | クラシック／オービットを切替。選択状態をブラウザ内に保存 | 再選択で切替、保存されたモードを次回反映する処理あり | `color/panel.ts:95-107` |
| 描画画面 | ブラシ(`#brushPage`) | `togglePanel('brushBox',...)`、同じ入口を再押下で閉じる | ブラシ選択・調整画面へ | `ui/shellBehavior.ts:135-139` |
| 描画画面 | 右側の操作欄(`#workspaceToggle`/`#drawer`) | `toggleWorkspace` で開閉 | `#close` から閉じ、必要なら元の操作へフォーカスを戻す | `ui/shellBehavior.ts:121-131` |
| 描画画面 | 保存(`#save`) | `saveWork()` に接続 | 保存後の作品状態・ファイル内容はブラウザ確認対象 | `main.ts:3246` |
| 描画画面 | 別名保存(`#saveCopy`) | `saveWork(true)` に接続 | ファイル内容はブラウザ確認対象 | `main.ts:3247` |
| 描画画面 | 画像書き出し(`#exportImage`) | ダイアログを開く。形式で画質設定・透明部分の説明を切替 | `#exportCancel` は処理中でないとき閉じる | `main.ts:3249-3271` |

## 必ず追加調査する点

1. UIソースにIDがあっても、初期は隠れていたり無効になったりする。実機の表示・押せる条件と混同しない。
2. 上表の接続先（例：`actions.createDocument`、`saveWork`）の結果まで追う。処理が存在するだけでは合格にしない。
3. 画面の境界をまたぐ、ホーム→新規作品→描画→色→ブラシ→レイヤー→Undo→保存→開き直す、という連続操作を優先する。
4. ほかのUIファイルで動的に作られるボタンを追加する。すべての入口・状態変化・戻り道はまだ列挙できていない。
5. M01〜M10の827操作と対応を取る。後発C系のボタンが見つかってもM10の基準範囲へ混入しない。

**現時点の判定**：最初の13経路のコード上の接続箇所を確認。クリック、表示、描画結果、全操作網羅は未確認。
