# Brush Foundation 固定基準

Status: ACCEPTED PROTOTYPE / 本番再利用基盤。元branch head `4a7b48814cb5b66f7674cd816e0ed35e4f9f5ee5`。正本HTMLは `prototypes/brush-rt/dist/illustro-brush-rt.html`、Git blob `548736458cf0d51a73e8c6b7e31d3fd056936ab0`。source lockでsource/test/HTMLの一致を検査する。

Gペン、丸ペン、製図ペン、マーカー、鉛筆、硬い消しゴム、柔らかい消しゴムの7本と共通Foundation契約を採用する。`packages/brush-rt`を使い、`packages/brush`の旧Rendererは製品で新たに採用しない。必要なdynamics/input/coverage等の共有部品だけ依存として保持する。

強制入り抜きは独立ON/OFF。ON時は通常筆圧/速度/通常taperを形状へ混ぜず基準太さと軌跡を使用。描画中は強制taperを後から随時変えず、pen-up後の全軌跡で最終形状を作る。設定/実入力/seed/最終命令を保持し再生する。

現在コードの長さは `cap=500+700*level`、`length=cap*tanh(total*level/cap)`、左右合計が全長を超えれば比例縮小。単純な固定全長割合ではなく長線で飽和する。**長さ式はbrush sizeを直接参照しない**。brush sizeは基準太さに使われる。依頼中のsize適応という説明と実装の差を隠さない。現在の実機合格済み挙動を変更する根拠にはせず固定する。

ユーザーが合格とした軽さ・追従・大サイズの非累積遅延・基本Gペン・最新強制入り抜きを受入情報として記録する。これは今回の自動検査/物理測定とは別。すべてのブラシ・全端末・高DPI・本体Layer/History/Save統合の実機合格は未確認。

旧WebGL2鉛筆512px/240Hzの初回反復+32.33ms（+20ms基準超過）のFAILは履歴として保持する。後続成功だけで原因解消とはしない。最新CI/回帰結果は `../production-prep/VERIFICATION.md` に記録する。古いHANDOFF_STATE/VALIDATIONのcommitや待機指示は履歴でありこの文書を上書きしない。

本番接続時は現Renderer/Worker/補正/予測/入力保持を維持し、Document側adapterのみ追加する。独立セッションのUndo/Saveを文書全体のHistory/保存と誤認しない。実機で具体的な問題が再現した場合だけ最小修正する。
