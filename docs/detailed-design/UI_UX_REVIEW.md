# 第③段階 UI/UXと操作検証

**製品完成/正式UI承認ではない。** Aurora明色・黄橙accent・左Rail・右可変Workspace・中央Canvas・Layer Page・Quickを維持。

## 実修正

- 固定/Quick/検索/Context/キーは常に作品Undo。候補UndoはSession帯に限定。Session中の別層筆と候補取消を検査。
- Layer構造/目/合成/Undo/模擬保存は同じ正本を参照。選択だけでvisibilityが戻らず、隠したLayerの試筆も非表示。
- Focus中でも色/層の一時Panelを表示し、閉じるとFocusへ。操作確認メニューの「Focusの比較」で、一時Panelと標準配置へ戻る案を切替可能。
- SheetとSessionの占有高さをResizeObserverで共有。スマホは重複する作品Undo/Redoを下部固定帯へ集約し、候補Undo/取消/適用を優先。rem文字、coarse主要標的44pxを導入。
- SV面はpointer/arrow操作、native色相range、現在色と背景gradientを同期。色管理本体ではない。
- 二指は重心アンカーを補正。反転/回転を含む再投影誤差をDOMで検査。実物ペン/指は未実施。
- 無関係syncで描線path DOMを再生成しない。新規模擬文書、ページ内模擬Save/再読込、Export形式選択と確認表示を追加。

## 8制作フロー

| フロー | 操作検証 | 未実装/未検証 |
|---|---|---|
| 新規→最初の筆 | 模擬文書1層作成→試筆path | 正式寸法/ICC/筆エンジン |
| ラフ→線画→着色 | 層選択/追加/目/Undo/試筆可視性 | 実レイヤー画素のGPU合成 |
| 筆・色・サイズ | Rail/サイズ/色相/SV/キー | 筆圧/高品質筆/広色域色選択 |
| 線画参照Fill | 参照と対象の候補設定→Fill詳細 | 2D閉領域Fill本体 |
| Selection→Transform→Undo→再編集 | 候補・独立別層筆・作品/候補Undo・取消 | 正式選択Mask/Warp/画像ハンドル |
| 非破壊Effect | 候補入力→適用→作品Undo | Effect正式画素/cache |
| Save→中断→再開 | 保存要求版固定→別操作→ページ内模擬再読込 | 永続Native/OS終了/再起動 |
| Export | PNG/JPEG/WebP選択→要求確認 | 実画像生成/ICC埋込 |

## 証拠と端末の区別

`stage3-browser-tests.cjs` 11件、`final-browser-tests.cjs`（最終版32件予定、結果はCIを正とする）、`catalog-browser-tests.cjs` 247×4開始状態=988既知ID詳細導線。通常/閉Workspace/Focus/390pxから実DOMを操作。保留/対象外には実行開始ボタンがないことも照合する。IDを知っている試験なので初見発見率ではない。

幅/高さ：320×568、390×844、740×360、760×600、800×600、960×700、1180×820、820×1180。追加で320px文字200%、390×420/740×280のキーボード相当geometry。実OSキーボードやAndroid/iPad/Windows実機の試験ではない。DOM中心hit、focus、Canvas寸法、合成touchを検査。読上げ実機、OSgesture、筆圧/傾き、実指誤タップ、初見探索時間は未確認。

旧PR7に同じ期待を実行し失敗を確認。ただし旧版に存在しない新要素の不在も含むため、before失敗数を不具合件数と同一視しない。

## プレビューと公開

- 元Pages失敗の原因：`github-pages` Environmentが設計ブランチのデプロイを拒否。Actions [41192510066](https://github.com/totoro0419/illustro/actions/runs/41192510066)のAnnotationsで確認。artifactやビルド開始後の失敗ではなく、runner前の保護規則。権限・保護ルールは変更しない。
- [別のレビュー用プレビュー](https://illustro-stage3-review-c2c1.ibukioike2009.chatgpt.site/)をSitesへowner-privateで配置。既存Performance Labを変更しない。デプロイの成功と操作確認は別：クラウドブラウザーではログイン要求を確認し、デプロイ版の操作は未確認。ローカル管理プレビューでは実表示・操作を確認済み。
- GitHub上の単体HTMLも保持。HTMLは画像処理・永続保存を実装済みと表示しない。

## ユーザー判断待ち（未承認）

| 判断 | 比較するもの | 確認方法 |
|---|---|---|
| FocusのPanel | Focus維持の一時Panel／標準配置へ復帰 | 操作確認→「Focusの比較」→Quickの色/層→閉じる |
| Undoの提示 | 作品Undoを固定＋候補Undoを対象帯へ分離した案の理解 | 変形候補→別層へ筆→作品Undo→候補Undo→取消 |
| 横持ちスマホ帯 | 下部の作品操作＋上の候補帯でCanvasが十分残るか | 740×360相当、候補とWorkspaceを開閉 |
| 旧変形再編集後のErase/Smudge | 位置固定の消去作用／固定採色済結果、全体を動かす別Transform | 手計算golden・仕様表を比較。実Warpでの比較試作は不足 |

ユーザー本人の承認や初見試験をAIで代行しない。技術的な資源・保存・版チェックは上の好み確認へ丸投げしない。
