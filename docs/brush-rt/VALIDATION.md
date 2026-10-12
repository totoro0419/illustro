> Classification: EXPERIMENTAL / historical research and validation. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# 検証と本番採用条件

**状態：本番採用は未完了。** 旧brush-labのPASSは、この新エンジンの成功根拠にしていません。

## 実行済みの検証

| 対象 | 確認したこと | 限界 |
|---|---|---|
| Node34項目 | 全56Presetの再生、全実入力保持、予測の保存禁止、センサー、距離／時間Stamp、Undo用記録、入力頻度別補正、表示容量1、間隔、帯の境界 | GPUや実際の画面遅延は測らない |
| CI37049012748／aef36b62 | 両GPUの56Preset最終画像、10種類の正式描画前画像、512／1024px画像、12線形状、blend、archive | WebGL2は14の累積proxy試験PASS、WebGPUは太線等でFAIL |
| CI37083561667／546f9857 | 上記＋点状ブラシ45／46の隙間を独立に確認。両GPUの画像ゲートPASS、33 Node PASS | WebGL2は14 proxy PASS、WebGPUは5試験FAIL |
| 180秒GPU試験 | 両backendで実時間180秒、1024px／240Hz、43200入力を保持して完走 | 繰り返す経路は覆い済み領域が増える。新しい領域への追従をこれだけで証明できない |
| 専用capsule shader／可変分割数 | 34 Node PASS。新たなGPU試行で確認中 | 前のPASSを、この変更の画像／速度の証拠にしない |

具体的な失敗を含むJSONを`evidence/run-*-results.json`、過去の要約を`evidence/run-*-summary.json`へ残します。完全なCI成果物にはフレームごとの代用値、ログ、スクリーンショットがあります。

## 計測の意味

| 値 | 意味 |
|---|---|
| inputAge | GPU完了時刻－表示用の描かれた先端を支える実入力時刻。予測の未来時刻で小さく見せない |
| latestInputAge | GPU完了時刻－最新実入力時刻。間隔の広いStampの入力時刻と区別 |
| visible-tip distance相当 | 最新raw位置－実際の描画命令の先端中心。空のカーソル位置を先端としない |
| previewQueueAge | 未送信の最新表示状態がどれだけ古いか |
| queue age | 正式描画の未処理仕事の最古入力の古さ |
| obsolete preview count | 最新状態に置き換えた表示回数。多いことだけで失敗としない |
| confirmed lag | 最新実入力と、Worker到着・正式描画の未処理時刻の差 |

**これらはGPU完了・幾何形状の代用値です。画面に出た時刻、輪郭の実測、pen-to-photonではありません。** GPU viewport readbackは表示へコピーする画素の検証であり、ブラウザの表示完了を証明しません。Headlessの予測API存在と、実際のペンから予測点が返ることも別です。

最終画像はαを直接3/255以内で比較します。αが8未満のRGBはpremultiplied値を比較し、他のRGBは元の3/255を維持します。raw RGBA差も保存します。Confettiのα0↔1差・透明下RGB差は数値差として記録し、目に見える大きな形／濃さの差を隠しません。

## 残る条件

| 本番採用条件 | 状態 |
|---|---|
| 512／1024pxで累積しない表示 | WebGL2のソフトウェアproxyは複数回PASS。WebGPUはFAIL例あり。実GPUは未確認 |
| 実GPU・実ペンでの追従 | 未確認。ソフトウェアの絶対遅延には数百msの例もあり、合格扱いにしない |
| 複雑ブラシのlive→confirmed | 一定opacity／pigmentの10種類は画像確認済み。変化するopacity／pigmentはlive近似であり、全56本の置換の描き味は未確認 |
| 正式描画を止めても最新表示 | 容量1＋GPU送信1の構造と、12線／96実入力／正式描画48jobs待ちのarchive画像を確認 |
| 正式描画・保存・Undo | 両GPUの56Presetと4blend、canonical Undo／Redo、再生・改ざん拒否を確認。古い方式との完全な見た目同一は主張しない |
| 長時間 | 両GPUの180秒試験を実行。最初／最後1秒だけでなく途中の最大値・入力生成遅れも保存 |
| 4K／4096px／多数レイヤー／メモリ圧迫 | full-resolution sparse tilesとviewport上限は実装。自動退避、多数レイヤー接続、実機負荷は未確認。正式tileは1024個上限 |
| GPU喪失からの復帰 | エラー表示とcanonical記録保持は実装。rendererの自動再生成・再生は未実装 |
| 本体への組込み | build可能な型付きAPIを提供。本体のlayer／history／save adapterは未実装 |
| ibisPaint／CSPとの実機比較 | 同条件比較は未実施。速さ・描き味の優位性を主張しない |

実機では「ペン先から線が離れませんか」「続けるとだんだん遅れませんか」「512pxで途中から追いかけてきませんか」「折り返しで変な線が残りませんか」「離すと跳ねませんか」を確認し、端末・ペン・ブラウザ・設定と一緒に記録してください。


## 8f8ef5cf：細い鉛筆の新Gate

[最上位の描画体験条件](EXPERIENCE_CONTRACT.md)を追加。Node41件成功。CI37089526671のWebGL2では、rough-pencil / graphite / colored-pencil / side-pencilの1/4/16px、最大2803形状を一度に入力した描画中画像を、正式描画停止状態で比較した。12条件とも欠落画素0、3/255を超える差0。ペンを離した直後は画像差0、正式描画後の差は最大2/255。細線の6件を含む21累積遅延proxy試験が成功。

WebGPUも12条件すべて成功。細線240/480Hzを含む20件の累積proxyは成功したが、180秒試験は開始1秒のサンプルが1件だけで、必要な2件に足りずFAIL_OR_INSUFFICIENT。遅延が減ったことだけで成功にしない。WebGL2全体は512px星型の画像差が残りGATE_FAIL。光学的な画面時刻、人間の知覚、実ペンは未確認。1:1画像の数値一致を、そのまま実機で自然に見える証明にしない。


## 最新の実行済み候補：f20a028a / CI37090457149

- Node42件成功（両job）。
- WebGL2・WebGPUとも117検査と21累積proxy条件を成功。
- 密な鉛筆12条件：正式描画停止中の欠落0、終了直後の画像差0、正式描画後最大2/255以内。
- 20本の短い線を正式描画前にすべて保持。両backendとも最大premultiplied差0.44/255、3/255超0。
- 星型512pxの最大alpha差9→1/255、3/255超0。
- 180秒・1024px・240Hz：43200実入力を保持。開始・中間・終了に必要な表示完了サンプルを取得し累積proxy成功。
- マウス入力、56Preset最終画像、Undo/Redo、保存再生、4K、12線形状、blend、mobile幅もCI対象。

結果は`evidence/run-37090457149-results.json`。同じHTMLのGit blobを両jobとGitHub保存時に照合した。GPU完了と読出しを実画面時刻とは扱わない。ソフトウェアGPUの絶対遅延は大きく、pen-to-photon改善の断言はできない。

全56Presetの描画途中の一致や、変動するopacity/pigmentの近似、距離式taperEndの終了時変化、予測の修正、高DPI・縮小表示、実機の自然さは引き続き未合格。最新の自動Gateを成功しても本番完成ではない。
