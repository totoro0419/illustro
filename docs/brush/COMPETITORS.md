# Official feature comparison — reviewed 2026-10-02

各社の公式説明を比較。実際のアプリを同じ端末・同じ絵で計測した比較ではない。初期ブラシの正確な本数は版/ライブラリに依存し、独立にインストールして数えていないため記載しない。

| 製品と公式情報 | 公開仕様で確認した能力 | Illustroの対応と不足 |
|---|---|---|
| [Clip Studio Paint](https://help.clip-studio.com/en-us/manual_en/240_brushes/Customizing_brush_tools.htm) | brush size/pressure curve、opacity、tip、density、spray/spacing、texture、補正、入り抜き、各種sensor | 基本項目に対応。独立dual engine、color mixing、製品editorの幅は不足 |
| [Procreate Brush Studio](https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings) / [Library](https://help.procreate.com/procreate/handbook/brushes/brush-library) | spacing/jitter、stabilization、shape/grain、image resources、筆圧とtilt、color dynamics等の設定群 | 対応項目の重なりあり。移動grainの多様性、wet系、resource管理、実機品質は同等を証明していない |
| [ibisPaint](https://ibispaint.com/lecture/index.jsp?lang=en&no=118) | speedとpressureによるサイズ/opacity/blur、texture等のカスタム設定 | speed/pressure mappingあり。既存画素のblurや実機モバイル性能は未実装/未検証 |
| [Photoshop dynamics](https://helpx.adobe.com/photoshop/using/adding-dynamic-elements-brushes.html) / [texture and dual](https://helpx.adobe.com/photoshop/using/creating-textured-brushes.html) | shape/scatter/texture/color dynamics、pressure/tilt等。secondary tipのサイズ/spacing/scatter | 同一dab内のdual coverageのみ。secondary samplingの独立した制御は不足 |
| [Krita engines](https://docs.krita.org/en/reference_manual/brushes/brush_engines.html) / [smoothing](https://docs.krita.org/en/reference_manual/tools/freehand_brush.html) / [options](https://docs.krita.org/en/reference_manual/brushes/brush_settings/options.html) | 多数の専用engine、basic/weighted/stabilizer smoothing、各種sensor設定 | 一つの共通CPU engineと連続補正。smudge/particle/専用engine群の幅は不足 |
| [Affinity Photo 2](https://affinity.help/photo2/English.lproj/pages/Painting/pixel_modify.html) | size/accumulation/hardness/spacing/flow、wet edge、dynamics、scatter/color jitter、複数nozzle | 基本curve/scatter/HSV対応。wet edge/複数nozzle資源editorは不足 |

上は公式情報の要約であり、機能名の一致は出力品質の一致を意味しない。Illustroの特色は、型付きのcanonical stroke・preview独立・固定資源・seed付き再生・既存Core transactionに対する検証しやすい小さな実装。競合が同様の再現性を持たないとは主張しない。

50標準+6独自は主要用途をカバーする候補として選び、56本すべての有効定義の違いをテストした。本数だけで必要十分、独自性の市場優位、自然さや速度の優越を判定しない。イラストレーターによる用途ごとの描画と、同一端末での比較が次の証拠になる。
