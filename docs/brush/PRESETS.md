> Classification: EXPERIMENTAL / historical research and validation. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Preset uses and definitions

標準50本と独自6本。全て同じBrushEngine/coverage/rasterを使う。名称だけ変更したプリセットではなく、有効設定のfingerprintが56種類あることをテスト。用途の有用性と自然な描き味は人の評価待ち。

[確定描画アトラス](evidence/preset-atlas.html) / [全定義JSON](evidence/presets.json) / [型付き定義](../../packages/brush/src/presets.ts)

| 種類 | 名前 / id | 用途 | 主な違い |
|---|---|---|---|
| ラフ・下書き | ラフ鉛筆 / `rough-pencil` | 薄いざらつきで形を探す | round / 4px / opacity 1 / flow 0.45 / normal / paper 0.75 |
| ラフ・下書き | やわらかラフ / `rough-soft` | 大きく薄い線で構図を置く | round / 18px / opacity 0.45 / flow 0.6 / normal |
| ラフ・下書き | 青下書き / `draft-blue` | 線画と区別しやすい細い下書き | round / 3px / opacity 0.5 / flow 1 / normal |
| ラフ・下書き | 速描き / `gesture` | 速さで細くなる勢いのあるラフ | round / 8px / opacity 1 / flow 0.8 / normal |
| 線画 | 細線 / `fine-ink` | 小さなパーツを一定の太さで描く | round / 1.5px / opacity 1 / flow 1 / normal |
| 線画 | 輪郭ペン / `clean-ink` | 輪郭の強弱を筆圧で描く | round / 8px / opacity 1 / flow 1 / normal |
| 線画 | 漫画ペン / `comic-ink` | 鋭い入り抜きの漫画線 | round / 16px / opacity 1 / flow 1 / normal |
| 線画 | やわらか線 / `soft-ink` | 線画を柔らかい縁にする | round / 7px / opacity 1 / flow 0.8 / normal |
| 線画 | 製図ペン / `technical` | 補正した均一な線で図形を描く | round / 2px / opacity 1 / flow 1 / normal |
| 線画 | 筆線 / `brush-ink` | 細線から太線へ大きな強弱を付ける | round / 32px / opacity 1 / flow 1 / normal |
| 鉛筆 | 鉛筆 / `graphite` | 細粒の筆圧で陰影と線を描く | round / 5px / opacity 1 / flow 0.65 / normal / paper 0.8 |
| 鉛筆 | シャープペン / `mechanical` | 細い一定幅の薄い筆記線 | round / 1.2px / opacity 0.85 / flow 1 / normal / paper 0.25 |
| 鉛筆 | 色鉛筆 / `colored-pencil` | 粒を残して色を重ねる | round / 8px / opacity 1 / flow 0.35 / normal / paper 0.9 |
| 鉛筆 | 寝かせ鉛筆 / `side-pencil` | ペンの傾きで幅広い陰影を付ける | ellipse / 24px / opacity 1 / flow 0.45 / normal / paper 0.85 |
| 鉛筆 | 木炭 / `charcoal` | 大きな粒と散りで粗い陰影を置く | round / 36px / opacity 1 / flow 0.5 / normal / noise 0.85 |
| マーカー | 丸マーカー / `round-marker` | 均一な半透明の色帯を置く | round / 28px / opacity 0.55 / flow 1 / normal |
| マーカー | 角マーカー / `chisel-marker` | 角形の先端で幅のある線を描く | rect / 30px / opacity 0.65 / flow 1 / normal |
| マーカー | フェルトペン / `felt` | 丸く少し柔らかい筆記線 | round / 10px / opacity 1 / flow 0.85 / normal |
| マーカー | 蛍光マーカー / `highlighter` | 低い濃さで広い帯を付ける | rect / 42px / opacity 0.25 / flow 1 / normal |
| 筆・厚塗り | 丸筆 / `round-brush` | 筆圧を使って不透明な面を塗る | round / 36px / opacity 1 / flow 1 / normal |
| 筆・厚塗り | 平筆 / `flat-brush` | 平たい先端で面と角を描く | rect / 44px / opacity 1 / flow 1 / normal |
| 筆・厚塗り | 熊手筆 / `rake` | 一定方向の毛の筋を残す | bristle / 40px / opacity 1 / flow 0.8 / normal |
| 筆・厚塗り | ドライ筆 / `dry-brush` | ざらついた筋で乾いた塗りを作る | bristle / 48px / opacity 1 / flow 0.55 / normal / paper 0.9 |
| 塗り | 塗り込み / `opaque-paint` | 途切れない丸い面で下塗りする | round / 64px / opacity 1 / flow 1 / normal |
| 塗り | 薄塗り / `glaze` | 筆圧で薄い色を少しずつ置く | round / 54px / opacity 0.45 / flow 0.25 / normal |
| 塗り | ぼかし風塗り / `soft-paint` | 柔らかい色の縁で境目を塗る。既存色のぼかしではない | round / 70px / opacity 1 / flow 0.3 / normal |
| 塗り | 水彩風 / `wash-look` | 粒を残す半透明の塗り。水分の移動は行わない | round / 56px / opacity 0.4 / flow 0.18 / normal / paper 0.4 |
| エア・影・光 | エアブラシ / `broad-air` | 保持時間で柔らかい色を足す | round / 128px / opacity 1 / flow 0.04 / normal |
| エア・影・光 | 細エアブラシ / `fine-air` | 小さな陰影に柔らかい色を置く | round / 24px / opacity 1 / flow 0.08 / normal |
| エア・影・光 | やわらか影 / `shadow-soft` | 乗算で淡い広い影を置く | round / 80px / opacity 0.55 / flow 0.22 / multiply |
| エア・影・光 | 輪郭影 / `shadow-edge` | 縁を残す影の形を描く | round / 32px / opacity 0.65 / flow 1 / multiply |
| エア・影・光 | 光ペン / `light` | スクリーンで細い光を描く | round / 12px / opacity 1 / flow 1 / screen |
| 肌・髪 | 肌なじみ / `skin` | 弱い筆圧で柔らかい肌色を重ねる | round / 64px / opacity 1 / flow 0.28 / normal |
| 肌・髪 | 髪細線 / `hair-line` | 細い入り抜きで一本の髪を描く | round / 5px / opacity 1 / flow 1 / normal |
| 肌・髪 | 髪の面 / `hair-band` | 平たい筋で髪の塊を塗る | bristle / 36px / opacity 1 / flow 0.8 / normal |
| 肌・髪 | 髪ハイライト / `hair-light` | 細い帯の筋で髪に光を入れる | ellipse / 20px / opacity 1 / flow 1 / screen |
| 背景 | 葉散らし / `foliage` | 向きと大きさの違う葉で背景を描く | leaf / 30px / opacity 1 / flow 1 / normal |
| 背景 | 雲の粒 / `cloud` | 大きい柔らかい粒を散らして雲の形を作る | round / 80px / opacity 1 / flow 0.65 / normal |
| 背景 | 石の粒 / `stone` | 粗い粒の陰影で岩の面を作る | round / 48px / opacity 1 / flow 0.7 / normal / noise 0.9 |
| 質感 | 紙粒 / `paper` | 細かい紙の粒を平らな色に加える | round / 64px / opacity 1 / flow 0.5 / normal / paper 1 |
| 質感 | チョーク / `chalk` | 白い粉の粒で粗い線を描く | round / 20px / opacity 1 / flow 0.65 / normal / noise 0.9 |
| 質感 | 斜線 / `hatching` | 一定方向の斜線を影として置く | round / 42px / opacity 1 / flow 1 / multiply / hatch 1 |
| 装飾・効果 | 星スタンプ / `star-stamp` | 一定間隔に星の形を並べる | star / 28px / opacity 1 / flow 1 / normal |
| 装飾・効果 | きらめき / `sparkles` | 散った大小の星で光を加える | star / 32px / opacity 1 / flow 1 / screen |
| 装飾・効果 | 紙吹雪 / `confetti` | 回転する小さな角形で彩りを付ける | rect / 16px / opacity 1 / flow 1 / normal |
| ドット・パターン | 丸ドット / `dots` | 同じ大きさの丸を等間隔で並べる | round / 9px / opacity 1 / flow 1 / normal |
| ドット・パターン | 強弱ドット / `pressure-dots` | 筆圧に応じた丸を並べる | round / 18px / opacity 1 / flow 1 / normal |
| ドット・パターン | 楕円チェーン / `chain` | 進行方向を向く楕円を並べる | ellipse / 18px / opacity 1 / flow 1 / normal |
| 消しゴム | 硬い消しゴム / `hard-eraser` | 筆圧で太さを変えて消す | round / 32px / opacity 1 / flow 1 / erase |
| 消しゴム | 柔らか消しゴム / `soft-eraser` | 淡く柔らかい縁で消す | round / 64px / opacity 1 / flow 0.3 / erase |
| Illustro独自 | 絹糸 / `silk` | 弱い筆圧で細線、強い筆圧で幅広い面へ滑らかに切り替える | ellipse / 32px / opacity 1 / flow 1 / normal |
| Illustro独自 | 束ね / `bundle` | 筆の毛の筋を楕円で整え、髪の束と抜きを一筆で作る | bristle / 38px / opacity 1 / flow 1 / normal / dual ellipse |
| Illustro独自 | 芽吹き / `sprout` | 軽い筆圧ではラフ、強い筆圧では粒を減らした濃い線になる | round / 8px / opacity 1 / flow 0.8 / normal / paper 0.95 |
| Illustro独自 | 影織り / `shadow-weave` | 軽く斜線を置き、筆圧を上げるほど連続した乗算の影にする | round / 54px / opacity 1 / flow 0.6 / multiply / hatch 1 |
| Illustro独自 | 彩層 / `color-strata` | 毛の筋・紙粒・小さな色差で塗りに情報量を加える | bristle / 44px / opacity 1 / flow 0.7 / normal / paper 0.55 |
| Illustro独自 | 星脈 / `star-vein` | 距離に沿って星の大小が周期的に変わる装飾を描く | star / 30px / opacity 1 / flow 1 / normal |

## 独自6本の狙いと制約

| ペン | 狙い / 有効な操作 | 合成機構 | 次に人が確認する点 |
|---|---|---|---|
| 絹糸 | 弱い筆圧は細線、強い筆圧は面 | 非線形pressure size、pressure aspect、direction、taper | 幅の遷移と小ループの制御 |
| 束ね | 髪の筋と抜きを一筆で置く | bristle×ellipse、pressure size/flow、end taper | 毛束の方向と狭い曲がりの潰れ |
| 芽吹き | ラフから濃い線へ筆圧で移る | pressureでgrain減少、flow増加 | 弱圧の粒と強圧の輪郭 |
| 影織り | 斜線から連続した影へ移る | hatch、pressure grain、multiply | 密度変化とストローク重なり |
| 彩層 | 毛筋と紙粒に小さな色差 | bristle、paper、seeded hue/value/flow | 色差の自然さと濁り |
| 星脈 | 距離に沿う星の大小のリズム | star、periodic distance size、seeded angle | 開始/終端、急旋回、間隔 |

これらはIllustro向けに作成した組合せ。世界で初めての技法や競合にない機能とは主張しない。水彩風・ぼかし風等は見た目のプリセットで、wet physicsや既存画素blurではない。alpha-mask/image-grainはエンジンに対応しているが初期56本は手続き型資源を中心とする。
