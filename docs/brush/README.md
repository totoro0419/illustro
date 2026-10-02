# Illustro Brush Engine — 現在の実装候補

状態：**IMPLEMENTED CANDIDATE / 実用完成・競合への総合優位は未確認**。

品質基準は主要ペイントアプリを総合的に上回ること。旧Illustroとの比較や自動テスト合格を完成基準にしない。現在のコードはこの目標へ向けた実装・検査の土台であり、目標達成を証明していない。

- [現状と継承の監査](AUDIT.md)
- [採用した仕様・費用・採用しなかった方式](SPEC.md)
- [競合の公式資料と比較](COMPETITORS.md)
- [全56本の用途と独自ペン](PRESETS.md)
- [現在の検証結果・未完了条件・実機確認手順](VALIDATION.md)
- [中断時の記録](WORK_CHECKPOINT.md) は履歴資料。現在の実装の正本・PASS根拠ではない。

正本：`packages/brush/src` と、このフォルダーの仕様・実行証拠。旧V2契約は参照資料として扱い、現在の差を明示する。Architecture V1 / Sparse Raster / root-switch Undoは維持。Region/Stroke Connectivity/UI設計ブランチは取り込まない。

## 実行

ルートで `npm ci` 後：

- `npm run brush:check` — 型と自動検査
- `npm run core:check` — Core回帰
- `npm run brush:lab:typecheck` — 検証画面の型
- `npm run brush:build` — 単一オフラインHTML
- `npm run brush:lab` — ローカル検証ページ
- `npm run brush:browser` — 自動ブラウザ検査（自分で検証サーバーを開始・終了）
- `npm run brush:benchmark` — 生の時間分布・メモリ・GC観測
- `node prototypes/brush-lab/test/sustained.mjs` — 実時間3分間の自動入力

ブラウザは `npx playwright install chromium` で用意。`BRUSH_CHROMIUM` は検査用実行ファイルの任意指定。ローカルでは標準ダウンロードが不完全なZIPだったため、Chromium 133の別配布を使用した。agent-browserはdaemon起動に失敗し、Playwrightで実行した。`BRUSH_FONT_CSS` は画面検査環境だけのフォント補助。配布HTMLは外部通信・追加フォントに依存しない。

直接試すファイル：`prototypes/brush-lab/illustro-brush-lab.html`。これは品質確認用で、Illustroの製品UIではない。

## 注意

通常の色を置く処理に対応する。水彩/厚塗り/ぼかしという名前は見た目を示す。水分物理、既存画素のぼかし、色を引きずる処理、絵の具混色は実装していない。実機・人間の確認なしで「完成」や「他社より上」を宣言しない。
