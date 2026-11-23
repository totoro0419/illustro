# R2 Windows PC検査｜必要なファイルの一覧

## 準備した素材
この検査用として `illustro-r2-pc-qa-fixtures.zip` を作成。**ZIPはChatGPTの検査準備会話で配布された添付ファイル**で、GitHubのこのブランチにはバイナリ本体を置いていない。Windows側でZIPをダウンロードし、Workがアクセスできるフォルダー（例：ダウンロード内の`illustro-r2-qa`）へ展開すること。ローカルWorkにフォルダーアクセスを許可する必要がある場合は正規の権限画面を利用する。

| 検査用ファイル | 用途 |
|---|---|
| `qa-colors.png` | 基本読み込み、資料配置、色の拾い出し |
| `qa-colors.jpg` | JPEG読み込み、比較 |
| `qa-colors.webp` | WebP入出力 |
| `qa-colors.tiff` | TIFF形式 |
| `qa-vector.svg` | SVGベクター形式 |
| `qa-two-layers.ora` | レイヤー付きのORA読み込み |
| `qa-two-layers.psd` | レイヤー付きPSD読み込み |
| `qa-colors.avif` | AVIF入出力 |
| `qa-colors.exr` | EXR画像 |
| `qa-srgb.icc` | sRGB色設定ファイル |

ZIPの展開・読み込み可否は、Windows側で本番開始時に確認する。準備時のZIP内部整合性チェックは10ファイルすべて問題なし。準備環境でZIPの完全性・PNG/JPEG/WebP/TIFF/AVIFの形式検証・ORA内構造・PSDのヘッダー・ICCの解析を確認したが、**Illustro自身が読み込めることは未検証**。

**このZIPにないもの**：PSB、HEIF/HEIC、旧Illustro形式、外部フォント。別の検査用ファイルがない場合、その固有の入力部分は理由付き未検査とし、生成や探索に長時間を使わない。既存のPNGは検査中にIllustroから書き出す方法でも準備可能。

## 操作手順
[P09｜素材・資料・入出力](work-steps/09-ASSETS-IO.md)の該当操作に進んだときだけ必要なファイルを開く。アプリ上で本当に形式を受け付けて表示できるかを見る。ファイルが存在するだけで「使える」としない。

外部サイトへファイルをアップロードしない。テストデータは作品A/Bと検査用素材の範囲だけで使用する。
