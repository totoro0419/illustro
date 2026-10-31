# 第③段階 — システム境界と一貫性契約

**状態：設計候補。実装済み/性能実証済みではない。** PR #3・#5・#7を引き継ぎ、矛盾を生みやすい境界を明文化する。変更後の型案は docs/product-architecture/contracts.d.ts。

## 1. 12システムの責務、状態、取消

| 領域 | 所有する正本、入力・出力 | 不変条件、取消・失敗・解放 |
|---|---|---|
| Input/Gesture/View | pointerId・接触世代、pen writer、View pose | stroke開始時に対象・筆版を固定。指ナビは独立して動く。pointercancel時の受理済/未受理境界を提示 |
| Command/Action/Intent | feature IDに属するaction、scope別Intent | 検索/キー/Quick/固定は同じaction。Home/Settingsに架空Documentを要求しない |
| Transaction/History | admission順、document branch、Session branch、consumer参照 | acceptedとformalを混同しない。Undoはカーソル移動、完了順で履歴を書換えない |
| Document/Layer/Mask/Selection | ID+生存世代、不変Layer tree、Mask、Selection | add/visibility/blendは作品Undo対象。選択中LayerはUI状態。存在しない参照と循環依存を拒否 |
| Brush/Fill/Transform/FX | 固定Brush版、read/write域、入力版、合成契約 | 正確性とpreviewを別品質にする。Cancelは候補だけ、別対象操作を温存 |
| Evaluator/Scheduler/Worker | Job DAG、予約、停止境界、generation | GPU投入済の強制中断を仮定しない。退避先確保前に正本を解放しない |
| GPU/CPU/Cache/Tile | GPU一時データ、CPU参照、cache key | キャッシュは派生物で正本ではない。device loss時に古い結果を公開しない |
| Preview/Presentation | coverage排他所有、公開世代、View pose version | 対応する正式結果追加と仮線除去を**同一Snapshot**で公開 |
| Color/ICC/Precision | 色空間、ICC identity、bit depth、alpha、rounding規約 | 表示Proofを正本へ混入しない。正式数値の精度を黙って低下させない |
| Persistence/Recovery | SaveFence、immutable manifest、旧正常世代 | 保存要求時点を固定。新世代を完全検証後に切替。失敗時は旧世代と受理済入力を保護 |
| Assets/Clipboard/Import/Export | asset hash/version、clipboard、codec options | Copyは画素Undo外、Cut/Pasteは独立Transaction、import失敗で元作品を変更しない |
| UI/Settings/Accessibility | panel、focus restore、名前付きUndo、設定 | 完了通知がfocusを奪わない。panel選択・undo作用先の表示を一致させる |

**所有寿命**：DocumentStoreは正本rootの所有者、Jobはread+output予約、Presentationは表示用途参照、SaveFenceは保存用途参照を持つ。派生キャッシュのevictionは可能だが、受理済入力・回復に必要なroot・未検証保存版を一般LRUで破棄しない。

## 2. Admission / Input writer の契約

1. Intentは作用scopeで判別。DocumentIntentだけが文書Identity、basis revision、reads/writes、色契約を要求する。
2. 文書の現世代と対象lifetimeが一致し、必要な最小資源を予約できたときのみOperationに単調な受理順を与える。
3. 接地中は入力サンプルwriterの保存容量を増分予約する。受理済チャンクを勝手に落とさず、追加サンプルが入らない場合は未受理範囲を明示。部分筆を黙って別Transactionとして確定しない。
4. penと二指touchは別pointer IDと役割。View更新と軽い描画表示の受付をGPU正式計算待ちキューへ置かない。
5. 正式筆は同一作品の受理FIFOを守る。Fill/Mask/FX等はreads/writesで正しい依存DAGを形成。previewを次の正式操作の入力にしない。
6. 予測サンプルはpreviewのみ。正式な一筆は確定サンプルと入力順を守る。pointercancelの救出範囲と取消結果を別に記録する。

## 3. 表示公開とGPU

Invariant P1: coverage内の画素は同じpresentation generationでformalとpreviewの片方のみが描画の責任を持つ。

Invariant P2: FormalResultのdocument/lifetime/read versions/target/settings/color/deviceGenerationを検査し、不一致なら現表示へ不採用。ただしSaveFenceが引用する古い枝には別用途として残せる。

Invariant P3: accepted orderと完了順を混ぜない。GPU command submit後の中断能力や非関連Promiseの完了順序を仮定しない。大仕事は提出前に小分けし、View用の予算を確保する。

Invariant P4: View poseが変わっても未確定strokeの文書座標を保持し、正式に切替わる瞬間に線が欠落/二重化しない。

根拠：WebGPU公式仕様 https://www.w3.org/TR/webgpu/ 、device loss https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost 。

## 4. 並行操作の参照結果

操作列：A受理（formal未完）→B受理→Undo→Save→A正式完了→Redo→再読込。

| 時点 | 現Revision | 表示 | SaveFence |
|---|---|---|---|
| A受理 | A | Aのpreviewもしくは対応するformal | なし |
| B受理 | A+B | A/Bの一世代排他coverage | なし |
| Undo | A | Bの現在表示寄与を除去。Redo可能 | なし |
| Save要求 | A | A | **Aのみ固定** |
| A完了 | A | A formalとA preview除去を一世代で公開 | A formalの正確なroot待ち解除 |
| Redo | A+B | Bの表示寄与を再表示/正式化 | **Aのまま不変** |
| 再読込 | A | 保存時点Aのformal画像 | A |

Redo後の画面A+Bと再読込Aが異なるのは正常。再読込にBが必要ならRedo後の別Saveが必要。旧枝のJobの遅延完了は現カーソルを勝手に前進させない。

## 5. 名前付き履歴・失敗時の収束

通常のUndo作用先は、document、session、reference、test-pad、document-managerの5領域。Sessionを開いたまま別LayerにCを受理でき、候補UndoはCを戻さない。「作品Undo」を明示するとCだけを戻す。候補CancelはCに触れない。元の対象が消滅したSession Applyは衝突解決へ遷移し、同名の別層へ静かに再接続しない。

Job状態は pending → ready、または retryable-failure → retry / blocked。依存A→B、独立Cを含むSave(A+B+C)でAが恒久失敗したとき、旧Saveはfailed、Bはblocked、Cは保護済のまま。A/Bを黙って除去しない。再評価不能ならユーザー確認後にCだけを保持する新枝、新しいSave(C)を作れるようにする。

GPU Device lossで古いdeviceGenerationの結果公開を拒否し、CPU/Native正本から新しいgenerationへ再評価。Storage QuotaExceededError、途中終了、manifest検証失敗は旧正常世代を保持する。ブラウザーOPFSは容量/eviction制約があるため、サイト内Autosaveだけを唯一の永続保護としない。

参照： https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria 、https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system 。

## 6. 色精度・資源計算

正式色：source profile + document profile + transfer + alpha + compositing order + rounding pointsを組にして保存する。8U/16U/16Fの正本表現を本人に無断で変えず、Proofは表示だけ。GPUをbitwiseでCPUと同値と約束するのではなく、事前に固定した数値基準と誤差で判定。

必要資源の上限は protected originals + accepted input + evaluation intermediates + presentation + Save pins + recovery reserve + runtime overhead の各項から測る。tile寸法やGPU/CPU配分は現時点で未確定。端末毎のRAM/thermal/latencyを実測して初めて採否を確定する。

## 7. 必須の反例テスト

T01 no-document New/Settings/Assets、T02 入口ごとのaction結果同値、T03 レイヤー/選択/Undo/保存、T04 Session内Undoと独立作品Undo、T05 後段消去・混色、T06 Preview/Formal atomic handoff、T07 A/B/Undo/Save/Redo、T08 接地中入力容量不足、T09 恒久Job failureと独立C救出、T10 Quota/電源断/Recovery、T11 Device loss、T12 sRGB/P3と8U/16U/16F再読込、T13長時間操作と高多層Cache、T14 pen+二指同時入力。

T02〜04とT07の一部だけはreviewモデルの状態検査を実行。T05〜14の正式画像・GPU・耐久検査は未実行であり、PASSと記録してはいけない。

## 8. 今回の検証で厳密化した契約

この節と現行`contracts.d.ts`を、上の旧候補説明より優先する。製品仕様PR #5の能力は変えない。

- **Undo入口**：固定/Quick/検索/Context/キーの作品Undoは常に`history.undo(document)`。候補はSession帯の「候補Undo」。作品以外のreference/test-pad/document-managerにも名前と明示対象を付け、キー焦点だけで作品Undoの表示名を変えない。IMEやtext input内のローカルUndoは先にその編集系へ渡す。
- **Session確定**：対象ID+lifetime、basis、read versionsを検査。削除・同名再作成・同対象の競合変更を検出し、候補を保持したconflictへ遷移。別層Cの編集は維持。UI試作では対象消滅の適用拒否とUndoによる対象復元をモデル検査した。製品ではread/write競合版の完全検査を必須とする。
- **no-document**：new/open/list/recover、View、Settings、Assetsは文書0件でも表現可能。save/export/closeは実Document identity必須。trash/restoreは作品管理asset identity必須。TypeScriptと限定runtime oracleで0件/1件/切替中を検査。
- **入力OOM**：接地時にwriterと終了処理用容量を予約。各sampleの採用境界を増分記録。容量不足時は追加を未受理と表示しwriterをpaused→recoverableへ。既保護sampleを捨てない。未受理sampleを無制限に蓄積しない。取消／保持範囲だけの救出を明示選択し、無断部分確定しない。
- **恒久失敗**：依存閉包だけをblockedにする。独立CとViewを停止しない。旧SaveFenceはfailedのまま。作者の同意でA/Bを除く新枝を作り、新FenceでCを保存。旧版入力は回復用途がある限りpin。再試行成功は別経路。
- **複数保存**：保存先単位の単調sequenceを持ち、S2公開後のS1完了がカタログを逆転させない。ブロック→manifest→依存閉包検証→現正常世代pointerを原子的に公開。真のfsync/rename/OPFS原子性はバックエンド別契約で第④段階に試験する。限定Storeモデルはその実証ではない。
- **FormalResult**：deviceGenerationとoutputKeyを型へ追加。Document/target lifetime・read versions・brush/settings・ICC/precision・quality・kernel・deviceを照合。古い用途結果は現表示へ採用せず、元SaveFenceへ用途を限定して保持可能。Device喪失後はCPU正本から再評価。
- **Handoff**：一筆単位の整合根を基準。各(operation,coverage cell)の表示責任は一世代で1つ。formal追加とpreview除去を一つのsnapshotで公開する。半透明を同時表示するcrossfadeは禁止。部分tile公開はhaloと依存prefix整合を別途満たした場合だけ。
- **Clip/Groupの循環**：構造変更のadmissionで有向依存グラフを検査し、循環は作品を変更せず拒否。名前による自動的な代替参照は行わない。Clip base削除は参照解除／削除取消を対象表示で解決し、別層へ無言接続しない。

実験：`experiments/stage3-reference/`。CPU Fraction、順序列挙、失敗注入、JSON論理保存で成立を検査。画素の合成順序の根拠と正式数値契約は次節。

## 9. 数値・ICC・資源の正式受入契約

**数値契約（本試験前に固定、実GPU未判定）**：

| 対象 | 正本と丸め | 合否条件 |
|---|---|---|
| 8U/16U | straightコードとαを保持。演算では選択した転送特性でpremulへ。最終操作根の量子化はnearest ties-even。原本のα0隠れRGBも保持 | codecなしNative往復は全コード一致。参照primitiveは期待整数一致。GPU候補は最大1 code/primitiveかつ複合golden最大2 codes。超えれば正式計算に不採用 |
| 16F | binary16、CPU中間binary64。明示操作境界でties-evenへ丸め、原本bitsを保持 | 有限値のNative往復はbits一致（±0含む）。primitiveは参照binary16の1 ULP以下、subnormal絶対誤差≤2^-24。NaN/Infは入力拒否/原本隔離。無言flush-to-zero不可 |
| Alpha | source-over：a=s+d(1−s)。premul c=S+D(1−s)。α0の評価RGBは0 | Mask/Clipは指定位置で各一回。Alpha Lockは現在の対象αを保持。8bit白塗りを消去代用しない |
| Normal既定 | 互換性のため文書のencoded RGBで計算する案。linear-lightは明示別契約 | 50%白を黒へ：encoded=.5、linear→encoded≈.735356983。2つを同一としない。既定の最終製品判断はUI/互換性比較待ち |
| Multiply | straight B=Cs·Cd、premul出力=(1−as)D+(1−ad)S+as·ad·B | αをsource-overと同じ式で導出。Group/Clip境界を越えてキャッシュを勝手に再結合しない |
| sRGB/P3 | source profile/hash、D65、transfer、destination、intent、CMM版を固定 | 同一色空間のassignはraw不変。convertは数値が変わる。predefined行列計算binary64の同色往復目標≤1e−10（transfer境界除外）。任意ICC LUTは未検証 |
| ICC/Proof | Assign/Convert/Proof別action。Proofは表示派生、原本を不変に保つ | 検証用CMM・ICC fixture・intent・BPCを固定して比較。未知/破損ICCを推測でsRGB成功扱いしない。高精度任意ICCの受入未達 |

8U/16U全コードと全有限binary16パターンの数値往復、P3原色行列、転送特性境界をCPUで実行。加えて`icc_probe.py`はLittle CMS 2.14の実CMMで、限定6色×DBL/8U/16U/16F/保存再読込profileを独立CSS行列と比較し、既定誤差内であることを確認した。任意LUT/Proof/全色域は未確認。これは16U/16Fの正式ICC変換やGPU数値合格ではない。GPU許容誤差は暫定受入上限で、達成値ではない。CPU参照の手計算Fraction結果は誤差0。

**資源・停止境界**：`protected originals + accepted chunks + evaluation intermediates + presentation + save pins + recovery reserve + overhead`を同時peakで予約する。tile t、halo h、4channel×b bytesなら一面は`(t+2h)^2*4*b`、同時面数とresident層を乗じる。8192² RGBA16一面は512 MiB（計算値で実測値ではない）。dense全面×履歴長を常駐前提にしない。原本/入力/Save pinは一般LRU対象外。cacheだけを先にevict。

haloは各kernelの支援幅から導出し、tile境界の同値性を参照比較する。Fill連結更新は遠方まで伝播し得るため固定haloを全演算共通に使わない。限界が未知な解析Jobは全域の依存として登録する。

**GPU方式比較**：単一大dispatchはView用queueを塞ぐ危険がある。任意preemptを前提にせず、投入前に分割＋in-flight上限＋View予約を採用候補とする。同じGPU上の別deviceだけではハードウェアの独立性を保証できない。CPU/別Workerの入力受付と既存画像のCSS/compositor Viewは受付を分離できるが、OS/GPU過負荷下で画面が絶対に止まらない保証にはならない。dispatch上限は実機p99/最大占有の試験で決める。

一次資料（2026-10-31確認）：[WebGPU](https://www.w3.org/TR/webgpu/) §Promise Ordering/Queue timeline、[CSS Color 4](https://www.w3.org/TR/2026/CRD-css-color-4-20261009/) predefined spacesと変換例、[ICC profile概説](https://www.color.org/getting-started/)。これらは採用したIllustro契約の性能達成を保証する資料ではない。

## 10. 入力時刻・View座標・横断責務の接続

各受理sampleに`pointerId, pointerGeneration, sequence, monotonicTimestamp, viewPoseVersion, documentXY, pressure, tilt`を保持する。座標はsample時刻に有効だったView行列の逆行列で文書座標へ変換する。coalesced samplesを遅れて受けても一律「配送時の最新行列」で変換しない。View時刻が不明なsampleは未確定として扱い、現在のposeだったと推測しない。予測sampleは別IDのpreviewだけ。

二指の前重心が指す文書点qを保存し、新重心C′と新回転R′・倍率s′に対してtranslationを`C′−R′s′q`とする。反転行列も同じ積へ入れる。接触本数の変更・pointercancelでは生存pointerのみから新基準を取り、古いpairを使わない。ペンwriterはtouchの追加で終了しない。OSによるキャンセルをアプリが禁止できるとは仮定せず、受理境界まで保護し復帰を提示する。

| 組合せ | 固定する版・境界 | 今回の根拠 / 残余 |
|---|---|---|
| Brush×Transform×Undo | 後段座標・筆版・作用列・不変root | Fraction参照。実Warpと高品質筆の画像拡張は残る |
| Fill×Selection×Layer | 参照線画/選択/対象IDを受理時固定、漏れ波及域は全連結 | 連結の遠方反例。2Dの隙間補完を含む製品Fillは未実装 |
| Mask×Clip×Blend | live依存、順序、一回だけα作用、循環拒否 | 半透明Multiply/clipの数式・循環検査 |
| Effect×Cache×GPU | 入力根・順序・kernel・Mask/ICC/quality/device | halo箱ぼかしのtile同値。全Effectのkernel参照は残る |
| Save×Undo×Recovery | 要求root・seq・用途pin・旧正常世代 | 操作列列挙/失敗注入。物理保存耐久は第④段階 |
| Color×ICC×Export | 制作と表示/Proofと出力の別profile | predefined CPU数値。任意ICC高精度は未閉鎖 |
| Reference×Layer×History | 資料rootと作品rootを別所有、外部変更時の元版保持 | 名前付き履歴モデル。利用者の理解は未検証 |
| Session×Independent Editing | target lifetime＋read/write集合、候補取消はローカル | モデル/DOM試験。同対象conflict解決の全枝は残る |
| AI×元画像保持×Undo | sourceRootをpin、候補出力assetを別保存、applyだけ文書Tx | 原本保持のモデル。AI本体は実装しない |
| 長Job×次操作×View | input/Viewを非依存queue、GPU投入前分割 | 世代/論理モデルと二指DOM。実GPU最大遅延は第④段階 |
| 大規模Layer×Memory×Save | resident予算、正本/pinの非LRU、退避完了後だけ解放 | 資源式/入力OOMモデル。実peakは未実測 |
| Device loss×Presentation×Recovery | device epoch、old-result拒否、原本から再評価 | 失敗注入モデル。実GPU復旧は第④段階 |

この表は全組合せを実装済みと示すものではない。未閉鎖の根幹条件を将来の実装試験だけで解消済みにしない。
