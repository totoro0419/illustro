# Illustro C01 — 基本作画アプリ
このフォルダが製品初期実装です。既存の `qa/ui-prototype` とは別です。
`npm install && npm run check`、`npx playwright install chromium && npm run browser:test`。
`npm run build` で `dist` に静的ファイルを生成します。
ネイティブ形式は `.illustro`（v1 JSON + 1 Raster PNG）です。Chrome系ではFile System Access APIにより保存を試み、それ以外は**ダウンロード開始**として扱い上書き保存とは呼びません。
画面・画像検証は実機の性能検査を代替しません。C01の性能・センサー・保存障害耐性・大寸法の受入には追加検証が必要です。
