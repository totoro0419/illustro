# Illustro 本番実装基準 — 2026-10-05

本番実装はこの文書と `CANONICAL_INDEX.json` を入口に開始する。旧設計の「全実装停止」はこの依頼で解除された。解除はCore Drawing Sliceと必要な基盤整合を開始する意味であり、アプリ完成・全機能合格・mainへのmergeを意味しない。

## 優先順位

一枚絵の制作体験を主要ペイントアプリより良くする。直感的操作 → 使いやすさ・軽さ・追従 → 多機能。公開された優れた方式は積極的に採用する。内部実装は推測しない。機能名だけの実装を完成扱いにしない。

## 正本と優先関係

この文書 → 分野別正本（[一覧](CANONICAL_INDEX.md)）→ 採用試作 → 過去の検査資料。矛盾はこの順で解決する。カタログのInvestigateや水彩物理・高度な自動化等は今回の必須範囲へ昇格させない。

- Product / Featureの目的を維持し、1–12統合仕様を具体的な機能挙動に使う。
- Architecture V2のIdentity / Raster / Brush境界 / Persistence / Region責務を採用する。
- Brush Foundationは採用試作として固定。Renderer・補正・入力保持・シェーダーを作り直さない。
- PC/Tablet UIは承認されたLeft / Right / Layer Page / 入力標準 / カスタマイズ仕様を維持する。
- Compactは[実装骨格](ui/COMPACT_IMPLEMENTATION_BASELINE.md)で未決事項のみ解消する。最終見た目の承認とは区別する。
- LineartはRaster入力から太さなし境界・接続・領域構造を得る。[統合境界](architecture/REGION_ADOPTION.md)を守る。旧ADR-0005は移植しない。

## 最初に作る一連の操作

起動 → 新規キャンバス → Brush選択 → 描画 → Eraser → Layer追加・選択 → Undo → Redo → Save → 再読み込み → 復元 → PNG Export。

実装順は以下。各段階で前の動作を維持する。

1. **文書・履歴・保存形式のV2整合**。既存Coreの疎な格納、変更部分だけの複製、取消、古い操作の拒否は再利用する。数値Revision / Blockの永続ID、max Revision方式のRecovery、RGBA8・正座標限定、可変canonical tileは本番ファイルに固定しない。UUIDと独立CommitSequence、256pxの論理区画、Surface形式、依存データ付き操作記録へ段階的に合わせる。
2. **一筆を選択Layerへ確定**。既存Foundationの実入力と最終StrokeRecordを使い、一筆一Transactionを発行する。128pxの描画処理区画を256pxの保存区画へdirty範囲のみ変換する。入力中に全体読出し・全画面コピーを行わない。Previewと正式Rasterの関係を明確にする。
3. **Layer追加・選択と取消**。一つのモデルをLayers BoxとLayer Pageで共有。確定前にLayer/History操作を直列化し、取り消した遅いWorker結果を採用しない。
4. **Save / Recovery / 復元 / PNG**。保存時点のRevisionを固定。依存データの書込みと確認が終わって初めて「保存済み」。途中失敗で前の保存を壊さない。再読込して画素・Layer・選択と保存Revisionを照合する。Recovery保護状態はSaveと別。
5. **基本経路の実機確認**。筆圧・追従・太い線・Undo後の表示・復元を確認する。CIを実機合格の代用にしない。
6. Selection → Transform → 通常Fill → Region連携 → Effects → Liquify → 高度Layer → Assets / Reference / Navigator → Automation。各機能は[Feature Delivery Gate](FEATURE_DELIVERY_GATE.md)で実操作・取消・保存まで検証する。

## 実装境界

| 担当 | 所有するもの | 他へ直接行わないこと |
|---|---|---|
| UI | Tool選択、数値入力、Workspace配置、状態表示 | GPU命令や保存データの直接変更 |
| Document / Layer | 文書Root、Layer構造、選択対象、Transactionの公開 | Previewを正式画素として採用 |
| Raster | 不変画素、Surface、疎な256px論理区画、dirty範囲 | UIやBrushプリセットの管理 |
| Brush | 実入力整形、設定、確定StrokeRecord、描画命令 | Layer / Save / Region解析 |
| Renderer | 表示・dirty合成・一時GPU資源 | 文書の正本、保存済み判定 |
| History | 一操作一Revision、Undo/Redo、分岐 | Renderer専用履歴を文書履歴として公開 |
| Save | 固定Revisionと依存データの書込み・検証 | 書込み開始だけでSavedを更新 |
| Recovery | WriterEpoch/CommitSequence順の連続保護 | RevisionIdの大小で最新判定 |
| Selection | 範囲のcoverageと編集寿命 | Region identityとの同一視 |
| Region | 太さなし境界、Topology、訂正、世代・曖昧さ | 通常描画を待たせる常時解析 |
| Effects | 非破壊設定、必要区画の派生計算 | 元画素の暗黙破壊 |

UIは小さなController/Portを介して操作する。巨大ファイルや全機能共通の万能Event Busを作らない。既存Coreは[V2修正対象一覧](implementation/CORE_SLICE_001_FINAL_DISPOSITION.md)を持つ暫定基盤として再利用する。

## 軽さを守る実装規則

入力と最新先端の表示を最優先。見える範囲・変更区画・依存区画だけ処理する。全Layer再計算・毎stroke全画面readback・不要な全体コピーを禁止。Previewは古い仕事を捨てられるが実入力と確定精度は捨てない。GPUの送信待ちを増やさない。256pxは保存の論理区画でありBrushの128pxを変更する理由にしない。

Region、Effects、Asset scan、縮小プレビュー、PSD codecは必要時だけ動かす。サムネイルとNavigatorは同じdirty通知から低優先で更新。Workerは入力を待たせる理由にせず、重い独立処理へ使う。キャッシュは上限を持ち、追い出しても作品を失わない。Group Transform/Liquifyはグループ構造と各Layerを保ち、共有座標変換/変位を対象子へ適用して一括Undo可能にする。対象外・locked・非対応Layerを事前表示し、暗黙mergeしない。

## 実装開始条件

| 確認項目 | 根拠 |
|---|---|
| 何を正本として読めばよいか一つに決まっている | CANONICAL_INDEXとこの文書 |
| 古い線画設計を取り込んでいない | mainから選別移植、旧ADR不在、source lock検査 |
| 合格したブラシを保存できている | 固定commitとHTML hash、既存回帰検査 |
| ボタンの主な場所が決まっている | Left / Right / Compact正本 |
| 文書・Layer・取消・保存の担当が明確 | 上の表とV2契約 |
| 最初の一連の操作と作る順番が明確 | Core Drawing Slice順序 |
| 実装を始める土台がある | apps/editor、既存CoreとFoundationを再利用 |
| できていないことを完成と表示しない | 未接続保存等を無効化、STATUSと検証記録 |

これらが検証できれば**本番実装を開始してよい**。Region全精度、Compact最終配色、全大手との品質優位性は各機能の出荷条件であり、Core実装を停止する条件ではない。
