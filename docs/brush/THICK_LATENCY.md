> Classification: EXPERIMENTAL / historical research and validation. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# 512px以上：最新先端の表示と確定計算を分離する

2026-10-02。基点は `78ad82b3cbbbea0f8b8e4256e7668ace1e0666e3`、実装チェックポイントは `f7bc76747c73490370011ee4cac72e9040e471f0`。品質基準は主要ペイントアプリ。旧版との比較は不具合の再現確認に使い、総合品質の合格基準にはしない。

## 問題と構造の変更

入力ハンドラーの送信時間が短くても、GPUへ全イベントのpreviewを順に送れば古い先端を表示し続ける。全履歴のコマンドを再計算していなくても、この滞留は発生する。今回の最優先指標は、連続入力中の「最新先端を描く仕事が完了した時点で、その入力がどれだけ古くなったか」と、その前半・後半の変化。

リアルタイム表示と確定画像を別の責務にした。同じWebGL contextは維持するが、確定用の全命令を表示のFIFOへ送り続ける構造は廃止した。

- 192px以上は表示GPUフレームを最大1個に制限する。`fenceSync` と **timeout=0** の `clientWaitSync` で前フレームの完了だけを確認し、未完了なら送信しない。入力ハンドラーに `finish`、readback、ブロッキングwaitはない。
- 待機中もすべての入力をBrushEngineへ取り込む。再試行timerは1個だけ。古い可変previewのGPUコマンドは作らず、再試行時点の最新入力から作る。
- ライブの1回分は、未描画の確定dab最大1個と最新末尾dab最大1個。巨大な入力burstや長いストロークで確定命令が増えても、次の表示に一括投入しない。可変末尾の古い表示専用dabは破棄できる。形状・筆圧・粒は全解像度で描き、ブラシ輪郭の縮小画像は使わない。
- 待機中に増えた確定命令はCPU側に保持する。入力の合間に予算内でprefixへ一度ずつ反映する。保存用geometry・seed・全命令は別に保持し、workerの厳密な確定画像へ必ず含める。
- release時にもGPUへ未処理履歴を一括送信しない。残りが予算を超える場合は、描画済みprefixと最新先端を暫定的にbaseへ保持し、確定workerの画像に置き換える。これは確定結果を捨てる処理ではない。過負荷時は途中の線や入り抜きの表示が確定後に変わる可能性がある。
- 取消・終了は再試行を止める。前のストロークのtimerが次のストロークを描かない。

確定計算の仕事量を消す設計ではない。CPU確定が遅ければ暫定表示の期間は延びる。新しい線をそのCPU計算の終了待ちにせず、記録を失わずに表示の先端を優先する。

## 1フレーム自体の負荷も削減

document-space grainを設定時にR32Fへ準備し、押印ごとのhash、三角関数、画像grain変換を減らした。mask/grainのuploadも同じ素材なら繰り返さない。接触時に全画面のstroke面をclearしない。起動時の小さな非表示描画でshader/driverの初期化を先に行う。

丸い硬い先端には、独立CPU実装と同じcoverageの小さなshaderを使う。最新末尾が1dabならprefixコピー・可変面押印・画面合成の3段を、prefixとbaseへ直接合成する1回の表示shaderへ置き換えた。通常の終了はストロークが触れた範囲だけ合成・clearする。

32dabのuniform-loopや4/16dab展開shaderはsoftware GPU上で遅くなったため採用していない。確定命令と複数の最新dabを同じ可変面へ描く候補も、表示年齢が増加したため廃止し、最新1dabの直接表示にした。最初の丸先端候補で硬い円の内縁を軟化させた誤差を独立画素比較で検出し、CPUと同じ内側coverageへ修正した。

設定読み込み時にrangeの上限512が数値入力へ転記され、1024指定が512へ丸められる既存不具合も修正。検査はラベルだけでなく実効Preset.sizeが指定値であることをassertする。

## 参照した既存方式と採用範囲

- [Krita Instant Preview公式説明](https://docs.krita.org/en/reference_manual/instant_preview.html)：軽い即時feedbackと背景の確定計算を分ける方式を参考にした。KritaのLODそのものは移植していない。テクスチャ等で確定時の変化が生じる制限も参照した。
- [Android stylus/front-buffer公式説明](https://developer.android.com/develop/ui/views/touch-and-input/stylus-input/advanced-stylus-features)：入力先端の部分更新と通常の確定描画を分ける方針を参考にした。Androidネイティブのfront buffer APIをWebGLで利用しているという意味ではない。
- [MyPaint公開実装](https://github.com/mypaint/libmypaint/blob/master/mypaint-tiled-surface.c)：新規操作と影響するタイルを処理する方式を参照。GPLの実装コードをコピーしていない。
- [ibisPaint公式更新情報](https://ibispaint.com/newFeature.jsp?lang=ja)：事前補正や高速ストロークの更新を確認した。非公開GPU実装を把握・複製したとは主張しない。
- [WebGL2仕様](https://registry.khronos.org/webgl/specs/latest/2.0/)：完了確認のzero-timeoutと状態を確認。未完了GPUコマンドの取り消しAPIはないため、古いpreviewを**送信前**に破棄する。

## 検証の読み方

`brush:thick` は13条件・39回の独立CPU preview照合、厳密な保存再生、接触のcopy/readback/wait不在、取消、領域commitを検査する。画素照合はテスト専用 `present()` のforce経路。これだけで本番のスケジューラを認証しない。

`brush:paced` は本番の `present(false)` を使う。512/1024px、インク/鉛筆、120/240入力/秒、各3秒の連続ストローク。実際に送られた最新入力の表示にだけtest fenceを追加し、非同期の再試行も計測する。入力のないprefix精細化は最新入力への追従測定に含めず、確定待ちの時間を別に記録する。前半/中盤/後半の完了年齢p95、未表示の最古入力の年齢、GPU fence数、描画予算、全入力保持、最新入力完了、保存再生を検査する。

`brush:overload` は80回の長距離往復と遠くへの最後の入力を連続投入する。歴史の確定命令が残っている間に、**最新の補正位置に実際のink画素があること**をtest-only readbackで確認する。releaseのGPU押印数も計測する。保存後は全82入力のgeometryと再生一致を確認する。

SwiftShader/headlessの完了年齢には、GPU処理、driver、event loop、polling、検査fenceが含まれる。物理ペンから画面までのpen-to-visible-tipそのものを測った数値ではない。実機・異なるGPU・巨大文書・全設定での追従や競合優越を確証するものでもない。補正済み位置と生のペン位置の差、過負荷時の暫定表示、既存round-markerのfloat輪郭差1channel 44/255は残る評価事項。

## 測定結果

同じローカルChromium/SwiftShader環境。基点は各1秒、候補は各3秒の連続入力。入力数・試験時間が異なるため倍率の性能主張には使わない。基点は入力毎に表示を送り、候補は古い表示を破棄する。`queuePeak` は検査用fenceの数であり、候補のcoreは最大1表示フレーム。

| ブラシ/太さ/入力Hz | 基点の完了年齢p95 / queuePeak | 候補の完了年齢p95 / queuePeak | 候補の前半→後半p95 |
|---|---:|---:|---:|

| インク / 512px / 120 | 492.0ms / 51 | 29.5ms / 2 | 50.1→33.4ms |
| インク / 512px / 240 | 1422.6ms / 141 | 26.9ms / 2 | 26.9→27.0ms |
| 鉛筆 / 512px / 120 | 1020.8ms / 62 | 31.9ms / 2 | 30.0→32.6ms |
| 鉛筆 / 512px / 240 | 3721.3ms / 194 | 30.8ms / 2 | 27.3→33.5ms |
| インク / 1024px / 120 | 未測定 | 33.4ms / 2 | 26.8→49.9ms |
| インク / 1024px / 240 | 未測定 | 35.4ms / 2 | 32.8→36.7ms |
| 鉛筆 / 1024px / 120 | 未測定 | 33.9ms / 2 | 33.5→32.7ms |
| 鉛筆 / 1024px / 240 | 未測定 | 34.3ms / 2 | 43.1→33.7ms |

候補の全8条件でライブdab最大2、全入力保持、最新入力完了、保存再生一致。候補の120Hz試験は360入力、240Hzは720入力。240Hzではブラウザtimerの制約により実送信期間が3秒を超えることがあり、raw JSONの期間を参照する。

[候補raw](evidence/paced-thick-v3.json) / [基点raw](evidence/paced-thick-before-v3.json) / [13条件・39画素照合](evidence/thick-check-v3.json) / [過負荷で最新先端が描かれる画素証拠](evidence/overload-tip-v3.json)。過負荷では512pxで1,839dab、1024pxで919dabの確定仕事が残った状態で、最新補正位置700,450のalpha=255を確認。releaseのGPU押印は各1dab、blocking query/readbackは0。保存の82geometryと再生は一致。

10秒・240Hzの鉛筆では、再実行の512px完了年齢p95=60.5ms、1024px=33.5ms。前半→後半は50.9→36.5ms、35.6→33.5ms、各2,400入力を保存・再生一致。queuePeakは各2。ただし512pxの確定待ち込み完了期間は16.7秒で、入力送信期間11.3秒より長い。確定仕事の遅れを先端の遅れと混同しない。[10秒raw](evidence/paced-thick-long-v3.json)。

**長時間の絶対遅延の安定性には未解消の問題がある。** 最初の10秒・512px試験は完了年齢p95=161.7ms、最大429.1msで100ms gateにFAIL。前半→後半154.0→129.2msで継続的な累積は観測せず、queuePeak=2、geometry/replay一致だった。再実行がPASSでも、この失敗を消さず、実機の低遅延品質の認証にはしない。[失敗の全出力](evidence/long-tip-failed-run-v3.txt) / [再実行の全出力](evidence/long-tip-repeat-v3.txt)。常に即時表示できる、大手と同等以上、といった結論は出せない。

実装チェックポイントf7bc767の [Brush CI](https://github.com/totoro0419/illustro/actions/runs/37021120903) と [Core CI](https://github.com/totoro0419/illustro/actions/runs/37021120899) はsuccess。Brush型/170件、Core型/8件、P0型/build/29件、ラボ型/build、latency 9ゲート、thick、throughput、overload、paced、通常ブラウザ17項目（3分の定期入力を含む）を通過。[取得したCI証拠](evidence/ci-thick-v3.json)。以前の78ad CIの成功は流用していない。最終の文書・証拠追記は実装とHTMLを変えない。
