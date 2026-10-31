# 変形後の描画・消去・混色の意味契約（AUD-006）

**条件付き設計案**：PR #5のD02に従い、通常描画は変形結果側のDocument位置に固定する。既存Transformを再編集しても後段筆跡を自動移動させない。CPU referenceのゴールデン画像と実機UIの確認までは確定済としない。

## 評価グラフ

原本 → Transform(versioned) → PostPaint(ordered operators) → Mask/Clip/Group composite → 下流Effect（各Nodeが適用順と入力版を宣言）。

PostPaintは単なる透明画素レイヤーではない。順序、演算種別、Document座標、固定したbrush/ICC/alpha設定、読み取った入力Revision、必要な領域maskを持つ非破壊操作の列として正本保持する。

| 操作 | 明示的な正式結果 | Transform再編集後 |
|---|---|---|
| Paint | 入力合成へのsource-over | 筆跡位置固定。下地だけ再評価 |
| Erase | 対象合成へのdestination-out（αを減らす演算） | 消去作用位置固定。新しく移動した画素もそこでは消える |
| 半透明 | linear-light/alpha契約付きの順序合成 | 新下地と再合成、不要な8bit量子化なし |
| Smudge | 受理時read revisionからサンプルした結果を、作用mask付きReplace演算として記録 | 採色済結果と位置は固定し、勝手に再採色しない |
| Alpha Lock | 操作時に固定した対象α maskを演算に適用 | 旧Transform編集でmask位置は自動追従しない |
| Clip/Selection | 参照lifetimeと版を固定。変更があれば参照契約に従い再評価 | 無断で選択範囲外へ拡張しない |

**差分案の比較**：
- source-overだけのoverlayは不透明下地の消去に不正。
- Transformを変更するたびに全演算を新下地から再サンプリングすると、過去のSmudge結果が黙って変わる。
- 毎回焼込は原本非破壊保持というD02要求に反する。
- 上記作用ログ方式はUndo/Saveと整合可能だが、Replaceの容量、依存版、mask/clip、描画品質の検証が必要。

例：不透明四角形→Warp→位置Xを消去→Warpのみ移動。位置Xの消去作用は固定。元画像は未変更。UndoでWarp変更を戻すと同じ位置Xに消去作用が残り、保存/再読込後も同じ結果になること。Paint・Smudgeは各自固定した読取/作用定義を維持する。

**未完了ゲート**：不透明/半透明/折返しWarp/clip/mask/Alpha Lock/Smudgeを含む参照画像で、前処理/後処理/Undo/Redo/Save/Reloadの全画像・α・操作ノード差分を確認。Formal結果の世代外混合ゼロを確認。GPUで実測するまでAUD-006は未解決と判定する。
