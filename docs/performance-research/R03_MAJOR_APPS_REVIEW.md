# R03 — 主要ペイントアプリのブラシ方式・性能の一次資料比較（2026-10-29 JST）

## 目的と前提

ユーザー指示：「ここは大事だから大手アプリを強く参考にしていきたい。」

R03の**中心線＋局所太さ方式（C）**を有力研究候補に残しつつ、主要アプリの**公開されている振る舞い・設定契約**と**公開ソースコード**から、従来dab方式（A）、輪郭/パス方式（B）、中心線直接評価（C）の採用条件を厳しく調べる。**ブランド名を根拠に未公開の内部実装を推測しない。**

原則：
- 製品品質・筆圧・強制入り抜き・半透明の積層・質感・混色・Undoを削って性能改善扱いしない。
- 仮線は近似可能だが**正式本線の正しさ**は維持する（[R01](R01_USER_DIRECTION.md)/[R02](R02_USER_DIRECTION.md)）。
- 同じ設定名でも各アプリの数値意味が一致するとは限らない。競合画面のpixel一致を無根拠に要求しない。
- 2026-10-29時点の公開資料調査。UI設定の説明とブラシエンジンの実コードを根拠レベルで区別する。

## アプリ別の確認事項

| 対象 | 公開一次資料で確認できる内容 | Illustroへの設計上の示唆 | 分からないこと |
|---|---|---|---|
| **Krita** | 多数の独立したBrush Engine。**Quick Brush Engine**はサイズ・合成・間隔に機能を絞った円形dab専用の高速エンジンで、他のエンジンでは難しい最適化が可能と公式説明。しかも同エンジンは**間隔を狭くすると速くなる**特性を明記 | 1つの万能な方式に固定せず、低次元パラメータの高速特殊化を設ける。dabが近いから必ず重くなるとは限らない | Quick Brushの具体的なC/B/Dの内部方式、GPU時間 |
| **CLIP STUDIO PAINT Ver.5.0** | 2026-03-11公式リリースで、**大径筆の画質を抑え高速化する設定**、水彩境界最適化、**確定前の予測線表示**、にじみ品質の改善を告知 | 描画中の即時性と本線品質を別研究対象とし、大径/水彩/補正で複数の最適化を比較する | 描画中の近似が最終品質へどう適用されるか、ブラシGPU/CPU内部構造は公開説明だけでは不明 |
| **ibisPaint** | 公式のブラシパラメータ説明に、先端の**間隔**、筆圧/速度/入り抜き、**不透明度の飽和**（筆内で濃くなるか）、**ストロークごとに区切る**、紙質・散布・水彩混色などがある。公式2026-09-07更新で予測・筆追従改善も明記 | **筆内蓄積/筆間蓄積**と**テクスチャの座標・移動**の契約を分ける。中心線＋被覆だけで良い筆かどうかを各設定から判定 | GPU実装や中心線直接評価の採用状況は不明 |
| **Procreate** | Brush StudioはShape（先端形状）とGrain（模様）、Stroke Path、Rendering、Wet Mix、Dynamic Inputsなどを分離して説明 | 濃淡・グレイン・先端形状・混色を単一の「輪郭」値に押し込めず、独立した評価契約にする | レンダラーが実際にdabで処理しているか、中心線で評価するか、タイルサイズ等は未公開 |
| **Adobe Photoshop** | 2026-10-04更新の公式性能ガイドでは、間隔を広げる、スムージングを控える、複雑な筆設定を避けると応答が改善し得る。Brush Tip Shape/Dual Brushでspacingやscatterを明示 | 各設定がどの処理量へ影響するか計測する。ただし**作者に画質/設定を落とさせることを標準解決策にしない** | Photoshopの内部実行経路、GPU優先度等は不明 |
| **MyPaint / libmypaint** | 公開C実装`mypaint-tiled-surface.c`にdab maskを計算してタイル上の画素へ合成する処理がある。`PERFORMANCE`には遅延実行/多スレッド化/ベクトル化の実施履歴、異なるタイルサイズ・dab mask cache・CPU/GPU転送の研究事項が書かれている | **詳細コードまで検査可能な正解参照**。タイルの細分化には境界・発行固定費があり、キャッシュはメモリ費を伴う。C/B案とA案を比較する際、実際のデータ処理を基準化 | PERFORMANCE文書中の`TODO`/提案は現行実装済みとみなさない。MyPaintの優劣を新Illustroへ移せるか未測定 |

## 重要な発見

### 1. 専用エンジンの高速化は現実の採用例がある

Krita Quick Brush Engineは、機能を限った専用エンジンだからこそ高速化が可能と公式に説明している。さらに間隔を縮めるほど速いという、一般的なdabブラシの直感と逆の例がある。**「dab回数が多い＝必ず遅い」という単純な仮説を破棄**し、エンジンの内部アルゴリズム単位で測る。

### 2. ブラシには「画素被覆」と「繰り返し作用」の両方がある

ibisPaintの「不透明度の飽和」と「ストロークごとに区切る」は、描いた領域・筆内蓄積・筆間蓄積を分けるべき強い理由になる。ProcreateのShape/Grain、Krita/MyPaintのOpacity/Flow/Smudgeも同様。輪郭と中心線が同じでも全ブラシが同じ結果になるわけではない。

### 3. 仮線プレビューの競合事例はあるが、正式品質まで推測しない

CSPの予測線は入力体験の例。**大径の低画質・高速描画**は別の機能。両者を組み合わせたIllustroの独立仮線と厳密確定の構造をCSP自身の未公開実装として断言しない。

### 4. 公開コードを持つMyPaintは参照実装と性能研究の出発点

libmypaintでdabのmask生成→タイル画素合成の順序を直接確認できる。境界跨ぎ、ブレンド、smudge、スケジューラ、画素更新コストをコードとfixtureで検討する。異なるタイルサイズ、mask cache、GPU転送は同文書が**研究課題**としても示すため、最適値を既知としない。

## Illustroの比較候補（研究段階、製品採用なし）

- **A. 逐次dab/タイル**：機能の広さと順序依存ブラシの基準。公開MyPaintを参考にテスト可能な厳密oracleを設ける。
- **B. 境界・パス・領域塗り**：輪郭の union/coverage でdab重複を削る案。自己交差/筆圧/AAの誤差を検査。
- **C. 中心線＋局所太さ＋属性直接評価**：内部領域と透明度・紙質・グレインを必要に応じ評価。中心線の最近点計算/タイル線分探索/テクスチャ座標/急な太さ変化がボトルネック候補。
- **D. 制限された専用高速エンジン**：Krita Quick Brushの考え方を参考に、厳密に同じ意味を持つ単純な太筆・消去等に特化。ただしそのアルゴリズムはIllustro側で独立設計・比較し、Krita内部実装を推測しない。
- **E. 依存的な筆の状態演算**：蓄積flow/混色/Smudge/湿式は状態やdabの順番が必要な場合、正確性優先でそのまま保持する。Cの形状探索だけ一部併用する余地は試す。

これらを**各ブラシpresetの意味から自動で選ぶ**ことを研究仮説とする。ユーザーへ設定・画質の変更を要求して速くしたことにしない。

## 次の実験と合否条件

1. **意味の固定**：5系統（不透明、非蓄積半透明、蓄積flow、紙/ストロークに固定したテクスチャ、Smudge/湿式）について筆圧・速度・入り抜き・筆内/筆間透明度・乱数seed・座標基準・合成順を定義する。
2. **公平なA/B/C/D比較**：同じ計測環境・出力解像度・色深度・全処理範囲（タイル確定・アップロード・同期等を含む）で、GPUとCPUそれぞれ比較。前回ブラウザ試作のCanvas2DネイティブB vs JavaScript Cの差は公正な実装比較ではない。
3. **画質**：AAのエッジ・交点・筆圧の急変・円形以外の筆先・短い筆・高速で曲がる筆・極太筆・長い筆・強制入り抜き・テクスチャ座標を参照結果と比較。平均誤差だけで合格にしない。
4. **操作中の実性能**：入力から仮線表示、確定処理中のPan/Zoom/Rotate、次筆の受付、FIFOの前進、仮線の消去を実測し、単独筆と同時操作で比べる。
5. **比較製品の実体験**：同一デバイスで近いブラシ設定と大きさの制作課題を実施し、見た目・筆感・入力応答・継続性を比較。独自の筆設定までピクセル一致することは前提にしない。
6. **採否**：厳密同等性を示せず、性能も改善しない最適化は採用しない。条件付きで速くなる場合はその条件内で採用。どの方式も全筆へ強制しない。

## 一次資料（閲覧日 2026-10-29）

1. [Krita Quick Brush Engine](https://docs.krita.org/ja/reference_manual/brushes/brush_engines/quick_brush_engine.html) — 専用高速エンジン、間隔の例外
2. [Krita Brush Engines](https://docs.krita.org/en/reference_manual/brushes/brush_engines.html) — 多種類エンジン
3. [Krita Color Smudge Engine](https://docs.krita.org/en/reference_manual/brushes/brush_engines/color_smudge_engine.html) — 混色と先端間隔
4. [CLIP STUDIO PAINT Ver.5.0公式発表（2026-03-11）](https://www.clipstudio.net/ja/news/202603/11_01/) — 画質・高速化・予測線
5. [CLIP STUDIOのブラシパラメータ案内](https://tips.clip-studio.com/ja-jp/articles/563) — 濃度・間隔・品質
6. [ibisPaintブラシパラメータ詳細](https://ibispaint.com/lecture/index.jsp?lang=ja&no=118) — 透明度の飽和、筆内/間、紙質
7. [ibisPaint手ブレ補正](https://ibispaint.com/lecture/index.jsp?no=50) — リアルタイムとペンアップ後の補正
8. [Procreate Brush Studio](https://help.procreate.com/jp/procreate/handbook/5.2/brushes/brush-studio) — Shape/Grain/Rendering/Wet Mix
9. [Adobe Photoshop Performance Guide（2026-10-04更新）](https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/brushes-presets/optimize-painting-and-cloning-using-brush-settings.html)
10. [libmypaint tiled surface C source](https://github.com/mypaint/libmypaint/blob/master/mypaint-tiled-surface.c)
11. [libmypaint PERFORMANCE（履歴とTODOを区別）](https://github.com/mypaint/libmypaint/blob/master/PERFORMANCE)

**出典の境界**：Procreate/Photoshop/CSP/ibisPaintの内部レンダラそのものは今回の資料では公開確認できない。Krita Quick Brushも内部計算原理は文書だけでは分からない。本比較の「Illustroへの示唆」は設計仮説であり、採用済みの実装事実ではない。

[ユーザー案](R03_USER_IDEA.md) · [初回比較](R03_EXPERIMENT_PILOT.md) · [検証計画](VALIDATION_PLAN.md)
