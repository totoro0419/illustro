> 現行判定：追加P1 `DESIGN-NUMERIC-001` と元5件が未解決。今回の自律選択権限によりC案を設計採用し、細部の再承認待ちは設けない。実人/実指評価は未実施。CPU参照は54件。以下の旧履歴にある43件/P1=0/細部承認待ちは現行判定ではない。

# 第④段階への引渡しゲート（現時点では未通過）

**第④段階の製品実装を今回開始しない。** この文書は次段階に必要な試験、期待結果、資源境界を指定するが、重要な第③段階設計の根幹が未検証のまま実装開始を無条件承認しない。

## 検査方式

| ID | 検査 | 予想される正しい結果 | 必須証跡 |
|---|---|---|---|
| H01 | A→B（未完）→Undo→Save→A完了→Redo→Reload | SaveはAだけ。表示はRedoでA+B。ReloadはA。形式上のrevisionが保存時点と一致 | 参照結果、Job/Saveの全世代ログ、保存ファイル再読出 |
| H02 | Pen描画中＋二指Pan/Zoom/Rotate（正式処理中も） | 入力受理とViewが両立、描画プレビューが作品と一体移動、筆の文書座標が変わらない | 実機pointerログ、event→presentationのtimestamp |
| H03 | Preview/Formal同世代handoff | formal採用と対応preview除去が一回の交換で、欠落/二重/黒化なし | 画素/α golden画像、各フレームのcoverage世代 |
| H04 | 同対象のTransform session A＋独立Layer C＋作品Undo/候補Undo | Cのみ取り消せ、Session Aを維持／取消してもCを残せる | 操作列とHistory/Document state diff |
| H05 | 不透明原本→非破壊変形→Erase/Smudge→元Transform変更 | 後段操作がDocument座標に残り、明示したalpha/replace意味を守る | CPU基準画像/GPU/保存往復の比較 |
| H06 | Layer×Visibility×Clip×Mask×Blend×Undo | 依存作用順を維持、古いcache採用0、正本と表示が一致 | DAG入力版本・レイヤー画素golden・Undoスナップショット |
| H07 | 長筆途中のInput Writer容量不足 | 受理済の入力が消えない、未受理範囲が説明され、View/コピー救出できる | quota/allocator fault injection、受理境界ログ |
| H08 | Job A恒久失敗→B依存→独立C→Save→救出 | 旧Saveはfailed。Bのみblocked、C保護、必要な同意後に新枝CをSave可 | fault injection・manifest監査 |
| H09 | Native書込/manifest検証/Quota/終了/再起動 | 成功した世代のみ読め、旧正常世代が残る | 失敗点別電源断とOS再起動試験 |
| H10 | GPU device lost→新generation | 古いGPU結果を公開せず再構成できる、CPU/Native正本に損失なし | device loss試験ログ・画像比較 |
| H11 | sRGB/P3 8U/16U/16F、ICC Assign/Convert/Proof、Export | 色契約通り、Proofは正本非変更、誤差が**事前定義値**以下 | reference color値・ICC hash・lossless native roundtrip |
| H12 | 2000/4000/8000px級＋多レイヤー＋長時間 | 正本/入力/Saveを退避でき、操作中もナビが停止しない | 端末別frame latency分布/peak RAM/熱/電力 |
| H13 | PC/Tablet/Phoneの初見利用者8制作課題 | 操作意味が入口や画面で変わらず、誤操作を元に戻せる | 操作動画/経路/迷い/所要時間/誤タップ |
| H14 | 全247機能×関連機能の交差試験 | 適用と取消/Undo/Save/Reloadで仕様表の受入条件を維持 | test matrix、足りない性能や仕様を明示 |

## 合否の意味

- **PASS**：そのプラットフォーム・入力・画質・作用順で実際に試験を実行し、事前に合意した判定基準を満たした。
- **FAIL**：参照結果と不一致、または保存データの喪失・無応答・UI遮蔽などの障害を検出。
- **BLOCKED**：正式実装/接続デバイス/ゴールデン参照がないため測定できず、成功とも失敗とも言えない。
- **NOT RUN**：試験可能だが今回は実行していない。

現時点でH01〜H14の正式製品統合試験は**NOT RUN/BLOCKED**。モデル試験とCIは別台帳に記載。入力応答時間、フレームgap、RAM、誤タップ率など数値閾値は実機の基準線と競合比較を測った上で**試験前に**固定する。試験後に閾値を緩めて合格扱いにしない。

## 端末母集団と試験資産

Androidペンタブレット（ペン圧/ホバー/二指）、Androidスマホ、Windows（マウス/ペン可否を明示）、WebGL2/CPUフォールバックを交差。仕様にないGPUデバイス実測の値を推論しない。小/中/大キャンバス、文字/ICC/16F、多層/Mask/Clip/FX、最大密度のStroke、OPFS低容量、失敗したSave、再起動を分ける。

## 第③段階で残す阻害要因

- AUD006はStage③設計意味として閉鎖済み（2026-11-01本人同意、43件限定CPU参照）。**製品品質のH05**は別で、任意Warp kernel・実GPU・初見UI・実画面の挙動は未試験。合格を宣言しない。
- 全247機能の台帳は原典・障害条件・action例外まで補強したが、個別受入は草案が残る。全Effect kernelの数値契約や任意ICC/Proofを含む根幹条件を、実装者へ未定義のまま渡さない。AUD006の参考幾何計算は [AUD006契約](AUD006_WARP_REFERENCE_REVIEW.md) に限定。
- AUD008/010/016/017/019と、FocusとUndoのAは正式決定済み。横持ちスマホはibisPaintを強く参考にする本人指示を得てC案を試作済み。具体レイアウトの本人承認・実機の比較検査は未完了。実機性能未実測だけを理由にStage③を否定しているのではない。

## 第④段階へ渡せる確定部分

scope判別Intent、document/target lifetime、admission順、名前付きUndo、SaveFence/保存先sequence、用途pin、atomic Handoff、writer不足、依存失敗の契約は`SYSTEM_CONTRACTS.md`を使用。限定CPU referenceは43件、ICC実CMM限定比較、実DOMと型検査を回帰資産として渡す。性能や物理耐久の合格ではない。

**現時点の無条件引渡しは不可。製品の正式実装は開始していない。** 第③段階で残るP2/P3の原因、全247機能の固有受入・技術契約、ibisPaint参照C案の横持ちスマホ設計と実利用者評価を整理し、最終再監査に合格してから移行する。元19件内P1は0件だが、追加 `DESIGN-NUMERIC-001` がP1で未解決。21機能の算法定義はStage③で解消する。


## UI/UX未完了に対する検査の引継ぎ（2026-11-01）

[Stage③ UI修正・5件の残条件](STAGE3_UI_REMEDIATION_5.md)では、機械的な発見性・scope・viewport検査は増えた。一方で、実利用者に機能名を教えない制作課題、作品/Session/Pad/資料/作品管理のUndo作用先の説明、同じ課題のCanvas遮蔽/開閉/探索時間比較、320px・拡大文字・利き手の実指誤操作率が未検証。

④への引渡し時は、**実装が存在しないため④でしか測れない性能・永続化**と、**③でUIを正式承認するために必要な判断**を分ける。Focusの一時Panel方式Aは本人が採用済み。作品Undo/候補Undoの明示分離Aも本人が正式採用済み。スマホ横持ちはibisPaintを強く参考にする方針が確定。C案の細かな配置と実機操作性は未承認・未検証。これをCIが成功したという理由で承認済みにしない。
