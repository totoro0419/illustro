# Stage③ 残存UI/UX監査5件 — 実修正と未検証境界

対象：AUD008（発見性）、AUD010（入口の正確性）、AUD016（複数Undo scope）、AUD017（中間画面幅）、AUD019（Touch標的）。
この資料は**修正をした事実**と**受入までの不足**を分ける。プロトタイプのUI検査は、製品機能や初見利用者の合格証明ではない。正式スコープ247機能・30分野は変更しない。

## 修正・検査マトリックス

| ID | 元の原因 | 実変更・検査対象 | 未確認／閉鎖条件 |
|---|---|---|---|
| AUD008 P2 | IDの到達検査は制作目的からの発見性を証明しない | model.jsに意味の明確な日本語/英語タスク別名を定義。完全一致・名前・説明・同義語に順位を付け、未知語は別機能へ勝手に置換しない。検索初期画面に4つの目的別候補を追加。16の制作目的の候補一致とDOM操作を検査 | 十分に多様な言い換えと、**答えを教えない初見の利用者**による探索率・誤到達の評価 |
| AUD010 P2 | 全247件を「検索3手」と機械的に数え、Clip/Mask等の直接入口を過小評価 | LAY-004/005、BRU-008のWorkspace直接ボタン→実詳細を1クリックで確認。既存の247×4=988件のID検索に加え、全247件の既知カテゴリ→詳細も実DOM検査へ追加（別集計） | 全247件の**実際の主入口**と通常/最短経路、スクロール、候補開始の端末別実測・製作課題による検証 |
| AUD016 P2 | Pad・資料・作品管理のUndoが作品/Sessionから分離されていない | model.jsにreference/test-pad/document-managerの独立履歴・Redo枝切断・対象寿命を追加。brush/reference/document Panelへ対象名付き専用Undo/Redoと状態を表示。作品Undoや候補Undoと交錯するモデル/DOM操作を検査 | 初見利用者がどの対象をUndoしたか理解するか、資料やパッドの製品上の永続化・動作は未検証 |
| AUD017 P2 | 760px超の中間幅で右WorkspaceがCanvasを圧迫 | 761–1000pxでDock幅を32%以下、かつ描画列420px以上に制限。760px以下は初期に非表示のシート式Workspace。740/760/761/800/960/1180pxで幅・シート開閉をDOM検査 | 実制作課題での探索時間、開閉回数、遮蔽率の比較とユーザー判断 |
| AUD019 P3 | 320px端で制御がはみ出す、coarse標的に小さい例外 | 主要表示操作・ヘッダー・レイヤー・Workspace・Session・Scope制御をcoarse時44px以上に調整、320pxの余白も最適化。320px文字200%/390/740横/800で可視ヘッダー標的の矩形/中央hitをDOM検査 | 画面全標的の例外一覧、実指の誤押下・片手/左右利き・OS倍率/スクリーンリーダー検証 |

## 再現

- `node qa/ui-prototype/stage3-ux-model-tests.cjs`：16の名称非提示タスク、カテゴリ限定、3つの履歴scopeのUndo/Redoと作品/Session不干渉、新規作品でのscope reset、未知scopeの拒否。
- `node qa/ui-prototype/stage3-ux-browser-tests.cjs`：目的選択、直接機能入口、各scopeのボタン、幅別Canvas領域、Touch標的をChromium実DOMから確認し、`test-results/stage3-ux-evidence.json`に記録。
- `node qa/ui-prototype/catalog-browser-tests.cjs`：従来988件のID指定経路に加え247件のカテゴリ既知経路を検査し、`test-results/catalog-routes.json`に個別結果を記録。
- `node tools/verify_stage3_design.cjs`：247 ID／30分野／採否／19指摘台帳の構造を検査。
- `python tools/build_ui_prototype.py`と`git diff --exit-code -- qa/ui-prototype/index.html`で配布用の単一HTMLがソースと一致することを検証。

テストで使用した画面幅はブラウザの模擬viewport。実機Androidの物理タッチ・ペン、初見の人の認知負荷、製品GPU/Nativeデータは確認できない。**時間や成功率の数値が存在しないものを推測で埋めない。**

## 第③段階での採否

今回の修正で、設計原因のうち**機械的に試せる範囲**を改善した。AUD008/010/016/017/019の元閉鎖条件には初見の人の探索、作用先理解、同じ制作課題の比較、実指の誤タップが含まれるため、実際の試験をせず5件すべてを閉鎖してはならない。結果を見てStage③で閉じる項目と、正式実装がないため④でしか検証できない項目を分ける。

ユーザー本人のUI判断として、**Focusの一時Panel/標準復帰、作品/候補Undoの見せ方、スマホ横持ち時のシート占有**はまだ決定していない。後段変形の固定意味（AUD006）は前に決定済みで、ここで再承認を求めない。

第④段階の製品実機性能や耐久をStage③の失敗へ混同しないが、**ユーザー未確認の重要UIをAIが承認済みと記載しない**。正式な引渡し判定は最終監査による。

## CIと証拠の検証版

コードHEAD `f958f3eedab5abb1a819852f0d55d527ff33a3b0`：[Actions 41259682637](https://github.com/totoro0419/illustro/actions/runs/41259682637) 全工程SUCCESSを確認。新規UXモデル・Chromium検査、既知ID988＋既知カテゴリ247のDOM実操作、過去の型/CPU/ICC回帰、生成済HTML一致が含まれる。スクリーンショット・寸法JSONはActionsのアーティファクトに保存されるが、人による画質・視認性・誤押下率の評価そのものではない。
