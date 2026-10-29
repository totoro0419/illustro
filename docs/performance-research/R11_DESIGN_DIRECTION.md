# R11 — 元画像を保持する非破壊変形と、表示位置での直感的な編集

日付：2026-10-30 JST
状態：**主要6アプリの一次資料比較から導いた基本設計の推奨結論**。ユーザー個別の明示承認・実機性能・詳細実装は未確認。今は基本方針決定の段階。

## 結論

**画像・文字・ベクターなど元の編集可能なデータを保持し、通常の移動/拡縮/回転/遠近/メッシュ変形では原本へ繰り返し補間を焼き込まず、変形パラメータと表示用評価結果を別管理する。** 必要な場合にだけ明示的にラスタライズ/固定化する。

本線・素材の意味を変えず、変形中もキャンバス操作・次の入力を妨げない（R01/R02）。画質優先だが、単なる非破壊化のために普段の描画が難しくなるUIは避ける。

## 主要アプリとの比較（公式資料）

| アプリ | 公式資料で確認できたこと | Illustroへの示唆／注意 |
|---|---|---|
| Photoshop | Smart Objectは元データを保持して拡縮/回転/warpを非破壊で適用。直接ピクセルを描き込むにはラスター化が必要なケースがある | **反復補間をしない**設計は参考。ただし描くために毎回ラスター化を強制しない |
| Krita | Transform Maskでペイントレイヤーを非破壊で移動/回転/拡縮/パース等。複雑な Cage/Liquify/Warpは更新間隔を制限してコスト削減 | **変形パラメータと原画素の分離**を参考。低画質高速表示と厳密確定の差を管理 |
| CLIP STUDIO PAINT | 画像素材・ベクター等のレイヤーでオブジェクト変形が可能。画像素材レイヤーにはそのままブラシ描画できずラスタライズが必要。テキストレイヤーは文字を後から再編集できる | 変形後の表示に自然に描ける作業導線を考え、テキストやベクターを無断でラスター化しない |
| Procreate | ラスタ画像を繰り返し変形すると再補間による画質劣化があり、公式がその回避を案内。Nearest/Bilinear/Bicubicから補間方式を選べる | **反復変形の画質劣化を未然に防ぐ**。直感的な操作UIは参考 |
| Affinity | 非破壊の Live Perspective、ベクター向けWarp Group、ライブフィルタあり。Perspectiveの一部モードはlive側で制約 | 非破壊の演算を複数組み合わせるが、モード間の意味差・制限を明示 |
| ibisPaint | 移動/拡縮/回転、パース、メッシュと、最近傍/平均/Bilinear/Bicubic/Lanczos2/3の6補間を使い分ける | 画材に適した補間と直感的なタッチ操作を参考。内部で常時原本を保持するかは未確認 |

## Illustroに採る基本方針

1. **原本と変形パラメータの分離**：複数回のアフィン変形を結合できる場合は、原本を評価する変換をまとめて最終出力を一回サンプリングする。全ての非線形変形が行列結合できるとはしない。Undo/Redo/保存で原本と変形情報を保持。
2. **普段の操作は直感的**：変形ハンドル、ピンチ/回転/移動、数値入力、スナップの入口を用意。画面表示座標と編集する文書座標を正確に分離。**表示操作のズーム・パン・回転で作品画素を書き換えない**。
3. **変形後も描ける仕組み**：可逆な変形なら描画位置を原画像の座標へ写して編集する候補。非可逆/重なりがあるメッシュ変形は一意な逆写像がないため、**見えている画面位置へ修正する別の描画レイヤー・追加入力**を使うなど、無理な原本書換えを避ける。どちらの描画が変形と一緒に再移動するかの意味をUIで明確化。毎回のラスタライズ強制はしない。
4. **ピクセルアートは別契約**：整数座標の平行移動と90度単位の回転/反転など画素値をそのまま再配置できる操作を優先する。必要なサイズ変更では最近傍や面積平均等を明示選択し、ぼやける補間を自動強制しない。
5. **文字・ベクター編集性**：字形/テキスト内容/縦横書き/IME未確定文字、ベクター点・線幅を維持して変形。無断ラスター化しない。ラスタしか扱えない機能が必要なら、非破壊の表示用結果を生成するか、明示確定を要求する。
6. **高速描画**：変形中の即時表示は近似プレビューを認め、正式な結果は正確に計算する。変更があるタイル/タイル内部だけ再評価し、下地/周辺タイルの参照範囲をR05に従って処理。R06表示用合成キャッシュは正本ではない。
7. **物理限界の明示**：高品質原画像を保持しても、本来存在しない細部を拡大復元できるわけではない。「繰り返しの再サンプリングで失われる情報を抑える」という意味での劣化防止。
8. **範囲外の画素も保護**：回転/移動でキャンバス外へ出た原本の画素を削除しない。最終的なExportは指定した領域を評価する。

## 後工程で検証するが今は固定しないもの

- アフィン、射影、メッシュ変形それぞれの内部表現と高精度な逆写像の可否。
- 筆圧や位置が変形後にどの座標系で評価されるか、シーム/折り返し/筆の重なりを含むペイント契約。
- プレビューの近似許容差、正式確定タイミング、タイル再評価、GPU/CPUコスト。
- 画素・透明度・色空間ごとの補間カーネル、エッジAA、HDR/16bit精度、ソースのオーバーサンプリング。
- UIの「元画像への編集」と「表示位置への修正」の選択と、複数変形・Undo/Redoとの互換。

## 一次資料（2026-10-30確認）

- Photoshop Smart Objects: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/create-layer-compositions/non-destructive-editing-techniques.html
- Photoshop Rasterize Layers: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/get-started-layers/rasterize-layers.html
- Krita Transformation Masks: https://docs.krita.org/ja/reference_manual/layers_and_masks/transformation_masks.html
- Krita Transform Tool: https://docs.krita.org/en/reference_manual/tools/transform.html
- CLIP STUDIO 素材レイヤー直接描画の制限: https://help.clip-studio.com/ja-jp/manual_jp/210_files/%E7%94%BB%E5%83%8F%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%82%92%E3%82%AD%E3%83%A3%E3%83%B3%E3%83%90%E3%82%B9%E3%81%AB%E8%AA%AD%E3%81%BF%E8%BE%BC%E3%82%80.htm
- CLIP STUDIO 文字を再編集: https://help.clip-studio.com/ja-jp/manual_jp/480_text/%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E3%82%92%E5%85%A5%E5%8A%9B%E3%81%99%E3%82%8B.htm
- Procreate Transform Quality: https://help.procreate.com/articles/drggqy-image-quality
- Procreate Interpolation: https://help.procreate.com/procreate/handbook/transform/transform-interpolate
- Affinity Live Perspective: https://www.affinity.studio/help/filters-filter-perspective/
- ibisPaint 変形設定と補間: https://ibispaint.com/lecture/index.jsp?lang=ja&no=154

外部アプリの非公開GPU処理や、Illustro独自案の高速性は未確認。比較事実と当方の設計提案は区別する。

[研究カードR11](USER_RESEARCH_CARDS.md#r11) · [R10色管理](R10_DESIGN_DIRECTION.md) · [R05必要範囲評価](R05_DESIGN_DIRECTION.md) · [R06合成キャッシュ](R06_DESIGN_DIRECTION.md)
