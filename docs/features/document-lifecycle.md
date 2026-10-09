> Classification: OBSOLETE / historical evidence; valid technical principles may be reused. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Document Lifecycle Interaction Specification

> Status: **Accepted P0 interaction specification**

## 1. Home / entry

App起動時は少なくとも次へ直接到達できる。

- New Document
- Open .illustro
- Open/Import image as new document
- Recent documents/recovery entries where available

ユーザーにAccount/Loginを要求しない。

## 2. New Document

New Document flowで最低限設定可能:

- width
- height
- unit
- resolution/DPI metadata
- color profile
- bit depth where supported
- background/transparency option
- preset

高度Color settingsはprogressive disclosure。

Factory defaultにはIllustration向けpresetを用意するが、具体pixel値はTarget device benchmarkと一般的制作需要を確認して別途決定する。

Last-used size/profileをrememberする場合でも、異常に巨大な前回設定を次回Silent defaultにしない。

## 3. Initial layer state

New DocumentはDefaultで**1枚のeditable Raster Layer**を作成しactiveにする。

Userは即座にBrush Strokeを開始できる。

Background扱いはCanvas/document creation UIで明示し、Raster Layerと見分けられない特殊状態をSilentに作らない。

## 4. Open vs Place

操作を分ける。

### Open
画像/.illustroを新しいDocumentとして開く。

### Place / Import into current document
現在DocumentへLayer/Object/Reference等として追加する。

File selection UIでこの意味を混同させない。

## 5. Open image as new document

PNG/JPEG/WebP/TIFF等を新Documentとして開いた場合:

- source dimensionsをDocument dimensionsへ
- source color profileを読み取る
- original profile handlingはColor policyに従う
- 1 Raster Layer等の合理的なLayer representationへ
- file decoding failureはcurrent documentsへ影響させない

## 6. Multiple documents

複数Documentを開ける。

Switch:
- artwork stateを変更しない
- active tool/workspaceはDocument-specific stateとglobal workspace stateを区別

Background documentは不要なrender/Region jobsを縮小・停止する。

## 7. Last drawable layer

Layer treeが空になることをData Modelとしては禁止しない。

ただしUserがRaster Brushで描こうとした時にcompatible editable targetが存在しない場合、Defaultでは**新規Raster Layerを自動作成して同じStroke transaction内で描画を開始**する。

Undo:
- auto-created layer
- first stroke

を同じuser-intent groupとして戻せる。

Locked/hidden layerがactiveなだけで別Layerを勝手に作る場合は、対象が描画不能であることをContext UIで示す。

## 8. Close document — explicit in-app close

Documentにexplicit save以降の変更がある場合:

- Save
- Discard
- Cancel

を提供する。

Documentにまだportable save先がない場合、SaveはSave Asへ進む。

DiscardはRecovery dataも破棄する可能性があるため明示的に扱う。

## 9. Browser/app termination

Browser tab close、OS kill、mobile discardではClose confirmationが確実に実行されると仮定しない。

Recovery policyを使用する。

## 10. Reopen / recovery

Recovery entryから開いたDocumentは、portable saved fileとの差を明示できる。

Recoveryを開いた時点で元のportable fileをSilent overwriteしない。

## 11. Recent list

Recent listは便利機能。

Missing/unavailable file:
- error state
- remove from recent
- relink/open alternative

を提供。

Recent metadataはWorkspace/local dataでありArtwork fileの意味ではない。

## 12. Device behavior

PC:
- multi-document tabs/windows UI候補
- drag/drop open/place

Tablet:
- document switcher
- system file provider

Smartphone:
- compact document switcher
- memory pressure時はinactive document derived cachesを積極evict

全DeviceでNew/Open/Close/Recoveryが完結する。

## 13. Performance

- new document creationでadvanced codecs/Region/Wet modulesをloadしない
- inactive documents do not keep full GPU caches
- opening huge file is progressive/cancellable where practical
- thumbnails lazy

## 14. Acceptance

- New → immediate first stroke
- Open and Place are not ambiguous
- empty layer treeからdrawing可能
- in-app close can cancel
- mobile kill does not rely on close dialog
- multiple documents do not multiply inactive background work without bound
