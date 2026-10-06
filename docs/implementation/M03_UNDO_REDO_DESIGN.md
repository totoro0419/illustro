# M03 Undo / Redo 実装設計

作成日: 2026-10-06  
対象branch: `milestone/M03-undo-redo`  
開始HEAD: `1d1eb238f483fdaae0c822c1ca266109f67d401b`

## 正本

実装前に以下を確認した。

- `docs/IMPLEMENTATION_BASELINE.md`
- `docs/CANONICAL_INDEX.md`
- `docs/PRODUCT_SPEC.md`
- `docs/FEATURE_SPEC.md`
- `docs/FEATURE_SYSTEM_INTEGRATION_2026-10-04.md`
- `docs/architecture/ARCHITECTURE_V2.md`
- `docs/ui/RIGHT_UI_SPEC.md`
- `docs/ui/COMPACT_IMPLEMENTATION_BASELINE.md`
- `docs/architecture/FEATURE_PERFORMANCE_RESOLUTION_2026-10-04.md`
- `docs/architecture/PERFORMANCE_POLICY.md`

重大な正本矛盾は確認されなかった。

## 1. Historyの正本

`RevisionHistory<DocumentRoot>`のみを正式な作品Historyとする。

- `CoreDocument.undo()/redo()`はRevision headを移動する。
- `canUndo/canRedo`をCoreから公開し、UIのdisabled状態へそのまま反映する。
- Renderer / RealtimeSessionはDocumentを画面へ見せるための派生状態。
- Layer選択はEditor-only stateでありRevisionを増やさない。

## 2. Selection整合

Undoで現在選択中Layerが消えた場合のみ、現在Document内に存在する直前側のRaster Layerへフォールバックする。

Redoでは「過去の選択履歴」を再生しない。現在選択中Layerがまだ存在するなら維持する。これにより選択変更だけでArtwork Revisionを作らないM02契約を維持する。

## 3. Stroke表示同期

Stroke RevisionにはM01で保存済みの正式`StrokeRecord`とcanonical 256px dirty footprintがある。

Undo / Redo時は:

1. Document Revision headを先に移動する。
2. 対象Revisionの`brush.stroke` Semantic Operationを読む。
3. 256px canonical dirty footprintを128px Brush runtime tileへ変換する。
4. 影響した128px tileだけGPU派生キャッシュを無効化する。
5. そのtileに関係する、現在有効な正式StrokeRecordだけを元の順序で再投影する。

禁止している全Canvas readback、全Document serialize、常時全Layer再描画は行わない。

## 4. Renderer側の派生index

RealtimeSessionに以下の派生indexを保持する。

- runtime tile -> 現在有効なStrokeRecord列
- StrokeRecord -> touched runtime tile
- StrokeRecord -> 元の順序

通常Stroke確定時にTileDocumentが既に求めているtouched tileを利用して増分更新する。Undoのたびに全StrokeRecordを走査してtile交差判定しない。

Document側のStrokeRecordとSession側の末尾Recordが一致しない場合は同期エラーとして拒否する。「似た線を再生成」しない。

## 5. Redo branch

Coreの`publish()`が通常Redo列を消す既存仕様を使用する。

Stroke開始時、RealtimeSessionの派生redo列は一時的に退避する。pointercancelや正式commit失敗なら退避を復元し、Documentでまだ可能なRedoと派生表示を一致させる。正式Strokeが成功した場合のみ旧redoを破棄した状態を確定する。

Layer追加などStroke以外の新規正式操作でも、Sessionの派生redo列を明示的に破棄する。

## 6. 競合対策

History操作を以下では開始しない。

- pointer-down中
- pen-up後の正式commit確定中
- History同期中
- Layer追加の同期中

UIを一時disabledにし、Keyboard shortcutも同じ条件を通す。これにより、Undo後に遅れて確定したStrokeが復活する経路を作らない。

Historyの表示同期に失敗した場合は逆方向のDocument操作とRenderer同期によるrollbackを試み、成功した状態へ戻す。失敗を無視してDocumentとCanvasを食い違わせない。

## 7. UI

Right UI CANONICALの固定下部5操作のうちM03対象だけを有効化する。

1. Layer Page導線
2. Undo
3. Redo
4. 左右反転（まだdisabled）
5. 上下反転（まだdisabled）

Compact下部のUndo / Redoも同じhandlerへ接続する。Quick Controllerは実装しない。

## 8. Keyboard

- Undo: Ctrl/Cmd + Z
- Redo: Ctrl/Cmd + Shift + Z
- Redo互換: Ctrl + Y
- textarea、select、text/number input、contenteditable内ではアプリHistoryを奪わない。

## 9. M03で変更しないもの

Brush input、Prediction、stabilization、forced in/out、StrokeRecord形式、Workerのcanonical計算、M02 presentation passは変更しない。

Brush Foundation側へ追加するのはHistory同期専用のdirty-tile派生再投影境界だけであり、描き味を作るアルゴリズムは変更しない。
