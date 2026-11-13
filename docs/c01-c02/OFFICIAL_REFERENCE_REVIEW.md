# C01/C02 — 主要ペイントアプリの公式仕様参照と採用判断

確認日: 2026-11-12。Illustroの正式設計は docs/DESIGN_AUTHORITY.md を優先し、参考アプリの仕様をそのまま移植しない。

| 公式アプリ | 公式資料（一次資料） | 優れた考え方・候補 | 採用・非採用の判断 |
|---|---|---|---|
| ibisPaint | https://ibispaint.com/lecture/index.jsp?no=50 | 手ブレ補正と入り抜きをブラシごとに調整する | **最優先参考**。描画中・離筆後の線の見え方の違いに注意し、遅延と筆跡変化を測定する |
| ibisPaint | https://ibispaint.com/lecture/index.jsp?lang=en&no=118 | ブラシごとの詳細設定と描画効果 | 詳細機能をまとめて配置せず、簡単な設定から段階的に開く |
| CLIP STUDIO PAINT | https://help.clip-studio.com/en-us/manual_en/240_brushes/Customizing_brush_tools.htm | ブラシの調整・表示項目の整理 | 高度設定は参考にするが、Illustroの軽さと操作の直感性を優先する |
| Procreate | https://help.procreate.com/jp/procreate/handbook/brushes/brush-studio-settings | ブラシ先端や質感の独立したプレビュー | 作品を汚さない試筆領域を採用候補とする。機種固有の操作を他端末に強制しない |
| Krita | https://docs.krita.org/en/reference_manual/brushes/brush_settings/options.html | センサーと出力を細かく対応させる仕組み | 未対応センサーの誤認を避け、基本設定と詳細設定を分離する |
| Photoshop | https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/fill-objects-selections-layers/brush-dynamics-settings.html | 筆圧・速度とブラシ結果の変調 | ブラシ編集の意味を参考にする。元データとUndo/Redo再現性を損なわない |

## 今回の実装上の採用
BRU-004にお気に入りと最近使ったブラシの入口を設け、検索・分類・複製を残した。作品データから個人の使用履歴を分離して、使用中のキャンバス性能と保存形式に干渉させない。

## 未検証
各社製品との同一条件での速度・線品質比較は未実施。公式資料はあくまで操作設計の根拠であり、Illustroの機能完成や性能を証明しない。