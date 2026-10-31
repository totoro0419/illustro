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

## 引渡し阻害要因

AUD-006の消去/混色ゴールデン未成立、P1のFocus/phone挙動の端末実証不足、no-documentの型/APIの整合テスト不足、Preview→Formalの実エンジン不可視、Save+Undo+Recoveryの正本試験不足。**「資料を書いたので通過」と判定しない**。具体的な阻害要因が残るため現時点の無条件引渡しは不可。
