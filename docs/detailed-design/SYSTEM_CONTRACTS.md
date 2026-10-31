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
