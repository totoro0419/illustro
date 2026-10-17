# 128px画像履歴への移行（2026-10-18）

基準は PR #34 の `24993dff35835ec4bd6da12763b0fa328e20b5ca`。PR #33 を含み、利用者から退行報告があった画像残留対策は取り消された状態。`fix/canvas-ghost-submit-sync-2026-10-17` は独立試験版なので採用していない。main・正式公開ページは変更しない。

## 原因と置換

旧通常経路は GPU の `historyPatches` が予算からあふれると画像を捨て、`navigateDerived` が `rebuildTileGroups` へ戻る。変更区画に重なる過去の線を再計算し、太線・多数の線・大作品で再計算と命令準備が増える。キャッシュ容量の増加では解決しない。

新経路は変更された128px区画の変更前・変更後を不変の画像として保持する。変更前は前回の変更後を共有し、透明な初期区画は画像を作らない。正式確定時のコピーは変更区画の変更後1枚を基本とする。操作記録・Coreの一筆一履歴・画素計算・ブラシ・シェーダ・色UIを変更していない。

`TileHistory` が所有権・区画の現在値・Undo/Redo差分を一元管理する。通常Undoでは最終的に必要な各区画1枚だけを選ぶ。受付順とCoreの履歴移動はすべて維持し、表示不要な中間画像だけを省略する。

## 容量と復元

- GPU：従来と同じ32MiB（deviceMemoryが8GiB以上なら64MiB）。値が取れない場合は32MiB。これは実VRAM測定ではなく保守的な端末クラス分け。
- 別処理の圧縮メモリ：8MiB／16MiB、最大32MiB。RGBA8を可逆deflate圧縮し、SHA-256の同じ画像を共有。
- 端末保存：専用OPFS名前空間、利用不可ならIndexedDB、両方不可なら制限付きメモリ。標準128MiBかつoriginの推定空き容量の10%以下。保存の失敗・破損・不足時は正確な元の操作記録から例外的に復元する。通常のGPU不足と保存障害を計測上区別する。
- GPUコピー・読み出し・読み戻しは最大8区画（512KiB）ずつ。GPU予算を超えたら正式処理の追加を一時休止し、画面のイベント処理を続けながら古い画像を下位へ移す。
- 画像は既存のレイヤー用二重バッファの空き側へ準備する。すべての読み込み・長さ・ハッシュ確認が済むまでは現在側を変えない。最終合成を小分けに行う間は画面反映を保留し、最後に最新の移動・拡大・回転位置で表示する。追加の作品全体画像は作らない。
- 保存用の画像生成をUndo応答経路に加えない。従来の自動保存・作品ファイル・復旧記録が正本で、この画像履歴キャッシュはセッション用の再生成可能な補助データ。

旧GPU専用経路は standalone／比較用に隔離して保持。古い作品、画像変形、破損や容量不足の復元用再計算も保持する。通常の編集画面の描画・消しゴムは新しい画像履歴を使用する。`tileHistory=legacy` は比較用の従来経路。

## 公開資料から採用した点

- [Krita公式ソース KisMementoManager](https://github.com/KDE/krita/blob/master/libs/image/tiles3/kis_memento_manager.h)：確定済みタイルデータを共有し、変更時に複製する仕組みとUndo/Redoの所有権。ソースの複製や移植ではなく設計原則を参照した独立実装。
- [Adobe Photoshop scratch disks](https://helpx.adobe.com/photoshop/desktop/troubleshoot/troubleshoot-tools-resources/set-up-and-manage-scratch-disks.html)：RAMが不足する場合の一時保存先の分離。Photoshopの非公開の履歴表現は断定しない。
- [CLIP STUDIO PAINT Preferences / Performance](https://help.clip-studio.com/en-us/manual_en/720_preferences/Preferences.htm)：メモリと仮想メモリの容量管理、取り消し回数の設定を参照。内部方式は断定しない。
- [Procreate Gestures](https://help.procreate.com/procreate/handbook/5.4/interface-gestures/gestures)：連続取り消しの操作と新規描画後のやり直し破棄を参照。内部の保存方式は断定しない。

## 検証

同じ旧版24993df、同じ入力点・時刻・ブラシ・画面・GPU制限で比較する。ソフトウェアGPUの数値と実機の体感を区別する。最終の測定値と未確認項目は検証後の記録へ追記する。
