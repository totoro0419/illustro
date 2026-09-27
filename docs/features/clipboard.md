# Clipboard / Copy-Cut-Paste Interaction Specification

> Status: **Accepted P0 interaction specification**

## 1. Principle

Copy/Cut/PasteのCore動作はIllustro内部Clipboardで成立させる。

System Clipboardは便利なBridgeであり、権限・Browser・OS対応の有無をCore編集の必須条件にしない。

## 2. Entry

全Deviceで次から到達可能にする。

- Edit系command surface
- Command Search
- Quick Menuへ登録
- Keyboard Shortcut（Keyboard利用時）
- Context UI where appropriate

Keyboardなし端末でも実行可能。

## 3. Copy target resolution

Default target resolution:

### Active Selectionあり

- Raster active layer: Selection coverage内のRaster contentをCopy
- Vector/Text/Object target: object selectionとpixel selectionが衝突する場合は現在のediting contextを優先し、UIで対象を明示
- Copy Merged: visible compositeをSelection範囲でRaster copy

### Active Selectionなし

- one/multiple selected Layer/Object: Native payloadを可能な限り保持してCopy
- explicit object selection: selected objectをCopy

対象が曖昧な場合、Silentに別対象をCopyしない。

## 4. Native internal payload

Illustro内部Clipboardでは可能な対象をRaster化しない。

候補:

- Raster layer/subset
- Vector object/path
- Text entity
- Group/layer subtree
- Mask
- Reference item where command context supports it

Payloadには必要に応じて:

- source document identity
- original document coordinates
- color/profile semantics
- resource/version dependencies
- object/layer metadata

を保持する。

Clipboard保持のためにsource document全HistoryをPinし続けない。必要Blockを独立materialize/reference-protectする。

## 5. Copy

Copy自体はDocumentを変更しない。

Artwork Undoへ入れない。

内部Clipboard更新はSession state。

## 6. Cut

Cut = Copy成功 + source removal。

Copy materializationが失敗した場合にsourceを削除してはならない。

Cut全体 = 1 Undo step。

Undoでsource content/structureを正確に戻す。

## 7. Paste

Default:

- active contextの直上へnew Layer/Objectとして追加
- pasted itemをactive/select
- one Paste = 1 Undo step

Selectionが存在していても、通常PasteはSelection内へ直接焼き込まず新しいLayer/Objectを作る。

「Paste into Selection / Paste Special」等は別Commandとして将来拡張可能。

## 8. Paste in Place

Illustro内部Clipboardがsource document coordinatesを保持している場合、Paste in Placeは同じDocument coordinateへ配置する。

別size/documentへPasteする場合もsource originを基準にし、完全に画面外になる時は警告/visible placement optionを検討する。

## 9. Copy Merged

Visible compositeをRaster payloadとしてCopy。

- active Selectionがあればそのcoverage
- Selectionなしならdocument/canvas bounds

Reference Workspace、Selection outline、Guide、UI Overlayは含めない。

Soft Proof/display-only transformを含めるかはDefaultでは **含めない**。Artwork document compositeをCopyする。

## 10. System Clipboard Bridge

Platformが許可する場合:

- Raster image → OS/System Clipboard
- OS/System Clipboard image → Illustro Paste
- text/path dataの追加Bridgeはformat interoperability検証後

System Clipboard APIがpermission/user-gestureを要求する場合は従う。

System Bridge失敗時も内部Clipboardを破壊しない。

## 11. Cross-document

同一Illustro session内のDocument間Copy/PasteをRequiredとする。

Native payloadのsemanticsがtarget Documentでunsupportedの場合:

- compatible conversion preview
- Rasterize option
- cancel

を提供し、Silent data lossを避ける。

Color profile差はColor Pipeline policyに従って変換/保持する。

## 12. Drag & Drop integration

Clipboardとは別入力だが、同じimport/place semanticsを利用する。

- Home/empty appへimage drop → Open as new document
- existing Canvasへimage drop → Place as new layer/object
- Reference Workspaceへimage drop → Add Reference
- .illustro drop → Open document
- Asset Library targetへsupported asset drop → Import asset

Drop targetをvisual highlightし、Open/Place/Referenceの意味を曖昧にしない。

Tablet/PhoneでDrag & Dropが使えない場合でもFile/Share UIから同じ結果へ到達可能。

## 13. Error

- Clipboard payload too large
- missing resource
- unsupported native type
- System Clipboard denied
- decode/import failure

を区別。

System Clipboard denialはCore internal clipboard failureとして扱わない。

## 14. Persistence

Internal Clipboard = Session/local application state。

Normal .illustro documentへClipboard内容を埋め込まない。

Crash recoveryでClipboard復元を必須にしない。

## 15. Performance

- source whole-document deep copy禁止
- structural sharing/protected blocks利用
- huge Raster payloadはspill/materialize可能
- System Clipboard用encodingはon demand
- inactive Clipboard near-zero CPU cost

## 16. Acceptance

- Copy/Cut/PasteがSystem Clipboardなしで完結
- Cut failureでsource消失なし
- Paste 1回 = 1 Undo
- Paste in Place preserves source coordinates
- Copy Merged excludes UI/Reference overlays
- PC/Tablet/Phoneで入口あり
