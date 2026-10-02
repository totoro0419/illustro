# Implementation contract — illustro-brush-1

## パイプライン

Pointer受信 → 受信時のdocument座標 → canonical sample正規化 → 座標/筆圧filter → monotone cubicの安定区間 → 距離sampling / 明示保持exposure → mapping/seeded jitter → packed commands → tip/grain coverage → ストローク内蓄積 → baselineとの合成 → 一つのCore transaction。

入力はfiniteな座標・非負時刻を要求し、逆順は拒否。pressure/tilt/azimuth/twistの有無をbitmaskで記録する。mouse/touchはpressure 1へfallbackし、非対応tilt等を実測値にしない。ゼロのpenセンサーだけから機器の対応を自動判定できないため、製品adapterは明示的なcapability profileを渡す。ラボの非ゼロ観測方式は簡易診断であり端末認証ではない。

補正の既定strength 0.5はOne Euro minCutoff4/beta4/dCutoff1。0は座標の完全OFF、0〜1を連続調整。筆圧は独立平滑化とcurve。成分ごとのmonotone Hermiteは方向反転での過大な突き出しを抑える。時間/圧力だけ変わる同位置入力もgeometryに保持する。

## Preset / dynamics

Preset v1はid/name/category/purpose/signature/compatibility/previewを持つ不変スナップショット。サイズ、硬さ、aspect、opacity、flow、spacing、angle、direction-follow、scatter、各jitter、tip、grain、start/end taper、exposure、blend、色、曲線mappingを持つ。詳細の有効範囲・strict key検証は `record.ts`、型は `types.ts` を正本とする。

| Mapping source | 単位/意味 |
|---|---|
| pressure / tilt | 0〜1。センサー未対応はmapping fallback |
| azimuth / twist / direction | radianを一周で正規化 |
| velocity | px/sの正規化 |
| distance / time | 確定経路距離 / stroke経過時間。periodで繰返し |
| random | seedとコマンドindex、独立streamからの再現可能値 |

size/opacity/flow/spacing/rotation/scatter/aspect/grain/hue/saturation/valueへcurve→min/max→multiply/add/replaceを適用する。動的shape切替・wet/mix・particle engineは未実装。

7先端はround/ellipse/rect/bristle/star/leaf/embedded alpha-mask。画像maskとgrainは0〜1 alphaの埋込み資源。粒はpaper/noise/hatch/image、document座標基準でscale/rotation。二重先端は同じdabのcoverage productであり、独立した二つのBrush engineや混色ではない。

## Packed commands / replay

Float64の16要素：x, y, size, aspect, angle, opacity, flow, grain, R, G, B, distance, time, index, spacing, reserved。canonical順を固定し、preview回数やtile走査順で乱数を進めない。Record v1はengine/reconstruction/random version、2×uint32 seed、固定Preset、geometry、確定ページを持つ。未知versionや不正resourceは拒否して原画を保持する。

保持エアブラシは呼び出し側の明示 `expose(time)` で最新filter endpointへ追加し、物理入力点を捏造しない。新しいsampleが来たら保持clockを進め、移動中の時間を過去位置にまとめて塗らない。exposure commandと遅れて確定した経路commandのtimeは単調並びを要求しない。**描画順はindex**であり、timeを並べ直して再生してはいけない。held-only混合の仕様で、厳密な時間積分型スプレーとは異なる。

## Coverage / color

CPU Float64被覆を基準とし、ストローク内はpremultiplied colorで保持する。被覆×flowをf、opacityをO、蓄積alphaをAとすると増分は `max(0,O-A)*f`。flowは蓄積速度、opacityはストローク内の上限。start/end taperはsizeに適用する。0.01px最小径と極小roundの面積支持を持つ。

normal/multiply/screen/erase。現在のCore RGBA8値に対する演算で、linear-light/広色域/16bit製品カラーパイプラインの証明ではない。水彩風・ぼかし風は質感/柔らかい塗りを指し、既存色のblur/smudge/wet physicsは行わない。

## メモリとスケジュール

| 上限 | 値と対象 |
|---|---|
| active packed staging | tail容量は `min(8192, ceil(taperEnd/0.25)+512)`、page256。最大1,081,344 bytes、taperEnd=0は98,304 bytes |
| canonical commands | 2,000,000コマンド。容量超過で明示失敗 |
| retained geometry | 500,000点。retain:falseの受信側保持は別責任 |
| CPU raster working | 128MiB。tileはFloat64 RGBA |
| record JSON | 128MiB。Core semanticは文字列32MiB |
| ラボ読込 | 32MiB / 100record。localStorageは4MiB上限 |

これらは製品全体RAMの保証ではない。preset/画像、履歴JSON、preview copy、入力object、queue job、保存I/Oが別に必要。`retain:false` とgeometry/page sinksは本当の受信側保存が必要で、現状にdisk spillはない。

RasterQueueはFIFOの同一演算をpixel/time budgetで分割し、一つの巨大dabも分割する。2ms等は候補budgetで、128画素ごとの時計確認やGC/OSにより超過し得る。負荷時もsample/commandを静かに間引かず、admission/capacity failureでstrokeを拒否する。同期replayは参照・小さな用途向け。Undo/reopenはラボで同期replayするため長い履歴では重くなり得る。

角度とgrainRotationの三角関数をdabごとに準備し、queueの分割をまたいで再利用する。作業tileの参照を最近の一枚だけ保持し、画素ごとの同じMap検索・文字列生成を減らす。色の蓄積式と丸めは変更していない。`StrokeRaster.tiles` の外部からの削除・差替えは作業中に行わず、device loss等ではrasterを作り直す。PresetとpressureCurveはストローク開始時に複製・固定し、後の編集を現在の線へ反映しない。

安定prefixを全再描画しない一方、ラボpreviewはactive rasterをcloneする。これが大きな制限で、tile差分preview/cache、worker/GPUの後続改善を要する。
