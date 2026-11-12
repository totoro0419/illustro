# M03 Undo / Redo — 主要ペイントアプリ公式資料調査

調査日: 2026-10-06  
対象: M03 Undo / Redo。非公開実装は推測しない。

## 確認した公式資料

| 製品 | 公式資料 | 確認できた事実 |
|---|---|---|
| ibisPaint | https://ibispaint.com/lecture/index.jsp?no=08 / https://ibispaint.com/newFeature.jsp | 新規キャンバスではUndo/Redoが灰色。描画後に有効化。連続Undo/Redoが可能。Layer順序・Layer不透明度・Layer消去/削除等もUndo対象。2本指Undo・3本指Redoのジェスチャがある。 |
| CLIP STUDIO PAINT | https://help.clip-studio.com/en-us/manual_en/270_canvas/Undo__47_Redo.htm / https://help.clip-studio.com/en-us/manual_en/780_shortcuts/Menu_Shortcuts.htm | Command Barから直接Undo/Redo。Ctrl+ZでUndo。RedoはCtrl+YとCtrl+Shift+Zが公式ショートカット表にある。Historyでは新しい操作を行うまで後続状態が残る。 |
| Procreate | https://help.procreate.com/procreate/handbook/interface-gestures/gestures / https://help.procreate.com/articles/tvicQm-undo-and-redo | 2本指Undo・3本指Redo。押し続けで連続実行。画面上にもUndo/Redo矢印がある。Undo後に新しい操作やStrokeを行うと、以前のRedo列は使えなくなる。 |
| Krita | https://docs.krita.org/en/reference_manual/main_menu/edit_menu.html | UndoはCtrl+Z、RedoはCtrl+Shift+Z。Undo/Redoを独立したEdit操作として提供。 |
| Adobe Photoshop | https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/use-undo-redo-commands.html / https://helpx.adobe.com/uk/photoshop/desktop/get-started/set-up-toolbars-panels/history-panel-overview.html | WindowsはCtrl+Z / Shift+Ctrl+Z、macOSはCommand+Z / Shift+Command+Z。Historyの後続状態は通常、新しい編集を続けると失われる。実行できないHistory状態はUI上で区別される。 |
| Affinity Photo 2 | https://affinity.help/photo2/English.lproj | 公式Helpに「Using undo, redo and history」とHistory panelが独立項目として存在し、Undo/Redo/Historyを制作操作として提供していることを確認。今回参照できた公開インデックスからは、M03で必要な細かな競合処理やLayer選択履歴の扱いまでは確認できなかった。 |

## 共通して確認できた設計上の傾向

- Undo / Redoは制作中に高頻度で使うため、ボタン・ジェスチャ・キーボードなど直接アクセス経路が用意される。
- 実行できない側は無効状態として扱う製品がある。
- 連続Undo / Redoが通常操作として成立する。
- Undo後の新規編集では、通常のRedo列を破棄する方式が主要製品で確認できる。
- History panelやSnapshotはUndo / Redoより大きい機能であり、M03の直接操作と分離されている。

## Illustroへ採用

1. **正本はDocument Revision History**
   - CANONICALのArchitecture V2に従い、RendererやBrush Sessionの一時履歴を作品履歴にしない。
2. **1 Transaction = 1 RevisionをUndo単位とする**
   - M01 Stroke 1本、M02 Raster Layer追加1回をそれぞれ1段として戻す。
3. **Undo / Redo不可ならボタンをdisabled**
   - PC右下・Compact下部とも同じ状態を即時反映する。
4. **Undo後の新規正式操作で通常Redoを破棄**
   - Coreの既存Revision分岐構造は保持するが、通常Redo導線は新しいbranchへ切り替わる。
5. **ショートカット**
   - Undo: Ctrl+Z / Command+Z
   - Redo: Ctrl+Shift+Z / Command+Shift+Z
   - Windows系互換としてCtrl+Yも受け付ける。
   - 数値入力などテキスト編集中はブラウザ標準のUndoを奪わない。
6. **PC / tabletで直接アクセス**
   - Right UI CANONICALの固定下部Undo/Redo、Compact CANONICALの下部Undo/RedoをM03で正式接続する。
7. **Layer選択は作品Historyへ入れない**
   - これは競合製品からの推測ではなく、Illustro CANONICALとM02合格仕様を根拠とする。

## 採用しない / M03で先送り

- History Panel完成、Snapshot UI、非線形History UI: M03範囲外。
- Procreate/ibisPaintの多指ジェスチャ: 今回は既存PC/Compact導線とKeyboardまで。Quick Controllerや追加Gesture設計を先取りしない。
- Affinity等の高度な履歴分岐UI: CoreがRevisionを保持しても、M03製品UIとして露出しない。
- Undo可能数の競合製品と同じ固定上限: Illustroの永続History設計・Memory方針と別問題のため、数字だけ模倣しない。

## 確認できなかった点

- 各社が内部でStroke確定中のWorker/GPU処理とUndoをどのように直列化しているか。非公開内部実装のため推測しない。
- 公開資料だけでは、各社が「Layerを選択しただけ」を作品Undoの1段として扱うかを一律には確認できなかった。
- Affinity Photo 2の現在版について、今回取得できた公式公開ページからキーボード修飾キーの全組合せまでは確定できなかった。

Illustroでは上記未確認事項を競合推測で埋めず、CANONICALのDocument/Revision/Editor-only state契約に従う。
