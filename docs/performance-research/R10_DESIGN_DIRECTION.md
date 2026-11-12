# R10 — 色・α・精度の契約を固定し、演算経路と色変換を必要最小化する

日付：2026-10-30 JST
状態：**主要アプリ公式資料を比較して導いた基本設計の推奨結論**。ユーザー個別の明示承認・性能評価・詳細アルゴリズムの採否は未確認。現在は方針決定段階。

## 結論

**作品ごとのカラー空間・チャンネル精度・α/合成規則を正本の契約として保持し、画面出力・入力変換・書き出しをそれぞれ分離する。演算ごとに意味を変えない最も軽い経路を選び、不要な変換・一時バッファ・全体コピーを削減する。**

### 適用方針

1. **作品の色値を正本とする**：少なくとも既に承認された sRGB / Display P3、8bit整数 / 16bit整数 / 16bit浮動小数点を削除しない。既定新規作品には一般制作向けのsRGB・8bit整数を暫定推奨するが、実際の既定値・設定UIは既存製品仕様と照合して最終決定。HDR32・Native CMYKは研究対象のまま、ユーザー承認なしに必須化しない。
2. **ビット深度の意味を保持**：16bit整数の表現精度を16bit浮動小数点で無条件に代替しない。演算が高い中間精度を要する場合は適した計算用表現を使い、正本へ戻すときの丸め・クランプ等を定義する。低精度版へ黙って置き換えない。
3. **色の変換と割当を区別**：ICCの「割り当て」は値を保ち解釈を変える処理、「変換」は見た目を近づけるように値を変える処理として別の明示操作にする。プロファイル情報の保持、エクスポート時の埋め込みを設計対象にする。
4. **表示と印刷プレビューは非破壊**：Document→DisplayとDocument→Proof→Displayの変換を、正本の画素に焼き込まず表示側で処理する。Display P3未対応端末における色域処理は別検証。画面色と画素の正本は混同しない。
5. **ブラシ・合成・αの意味を機能間で統一**：演算ごとに色空間、伝達特性（linear/非linear）、α表現、合成順、丸めを契約として規定する。物理的に正しい線形光合成が常に既存アプリの見た目と一致するとは限らない。ユーザーが選ぶ互換合成モードなどがある場合は意味を明示し、無言で変えない。高速化で透明境界の色を壊さない。
6. **必要に応じた計算**：色空間と精度が同じ演算は不要な変換を避ける。連続して適用可能で品質が保たれる色変換だけ合成/キャッシュする。R05のタイル全体/部分、R06の上下表示キャッシュ、R07の画像差分保存、R03のブラシ経路と一貫させる。
7. **簡単なUI**：大多数の一枚絵用途は高度な色管理設定なしで進められる。高度なプロファイル・深度・レンダリング意図・Proofは必要時に明示的に設定。既存作品のプロファイルを黙って変えない。
8. **検証は後工程**：8/U16/F16の比較、透明境界・グラデーション・ICC変換・特殊blend、不同端末/ブラウザ、色変換の高速化、PNG/PSD等の往復一致を測る。正式性能優越は未実証。

## 6アプリの一次資料比較（2026-10-30）

| アプリ | 確認済みの事実 | 設計への示唆 |
|---|---|---|
| Photoshop | 8/16/32 bit/chをサポート。Assign Profileは値を変えず解釈を変え、Convertは値を変えて見え方を維持。32bit HDRは一部機能制限。 | 「割当」と「変換」を別契約へ。高精度経路の機能互換を検証。 |
| Krita | 8bit整数、16bit整数、16bit浮動小数点、32bit浮動小数点を区別。ICC/OCIOで作業空間と表示空間を分ける。16bit floatは16bit intと異なる精度/範囲。 | 万能な一種類の精度へ統一しない。線形光での処理は用途と精度に応じ選ぶ。 |
| Procreate | sRGB、P3、CMYK、カスタムICCを作品プロファイルに設定可能。RGB/CMYK間の変更には制約がある。 | sRGB/P3を分かりやすく選び、出力用途を明示。 |
| CLIP STUDIO PAINT | 作品のRGBプロファイルと、別の出力・CMYKプレビュー用プロファイルを使う表示/書き出しを備える。 | 作品の正本値とプレビューを分離。 |
| Affinity | 開いた作品の埋め込みプロファイルを尊重し、変換や書き出し時にプロファイルを指定・埋め込み可能。ソフトプルーフは調整として非破壊で使える。 | 入力/作業/出力の色管理と非破壊Proofを明確化。 |
| ibisPaint | PNG/JPEG/PSDなどの出力時にRGB・CMYK・グレースケール・二値を選べる（形式で対応差あり）。CMYK出力にはプロファイル/intent指定あり。 | 普段のRGB制作を複雑化せず、書き出し変換を用意する。 |

### 公式資料

- Adobe Photoshop 色プロファイル： https://helpx.adobe.com/photoshop/desktop/adjust-color/color-profiles/change-a-documents-color-profile.html
- Adobe Photoshop ビット深度： https://helpx.adobe.com/jp/photoshop/using/bit-depth.html
- Adobe Photoshop HDRの機能差： https://helpx.adobe.com/photoshop/desktop/adjust-color/hdr-and-channel-manipulation/features-that-support-32-bpc-hdr-images.html
- Krita ビット深度： https://docs.krita.org/ja/general_concepts/colors/bit_depth.html
- Krita カラーマネジメント： https://docs.krita.org/en/general_concepts/colors/color_managed_workflow.html
- Procreate プロファイル： https://help.procreate.com/jp/procreate/handbook/colors/colors-profiles
- CLIP STUDIO PAINT カラープロファイルプレビュー： https://help.clip-studio.com/ja-jp/manual_jp/210_files/%E3%82%AB%E3%83%A9%E3%83%BC%E3%83%97%E3%83%AD%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AE%E3%83%97%E3%83%AC%E3%83%93%E3%83%A5%E3%83%BC%E8%A1%A8%E7%A4%BA%E3%80%90PRO__47_EX%E3%80%91.htm
- Affinity Color management： https://www.affinity.studio/help/clr-clr-profiles/
- ibisPaint 作品書き出し： https://ibispaint.com/lecture/index.jsp?lang=ja&no=206

未確認：各社の非公開GPU/CPU色変換内部実装、各社の最適化しきい値、Illustroでの実効性能。外部仕様の確認事実とIllustroへの設計判断を混同しない。

[研究カード](USER_RESEARCH_CARDS.md#r10) · [R09 UI方針](R09_DESIGN_DIRECTION.md) · [R05部分計算](R05_DESIGN_DIRECTION.md)
