# 監査19件の解決台帳

**第③段階の閉鎖13件、未閉鎖6件。製品実装の完了判定ではない。**

元指摘は[PR8台帳](../audits/findings.md)。各原因・変更・before/after・閉鎖根拠は[JSON](AUDIT_REMEDIATION.json)。元の閉鎖要求を実機未実施だけで全て先送りせず、今回のユーザー指示に従い設計と第④段階の実装試験を分離する。

| ID | 重要度 | 判定 | 修正・残余 |
|---|---|---|---|
| AUD-001 | P1 | 閉鎖（Stage③） | 固定/検索/Quick/Context/キーをdocument dispatchへ統一。Sessionの有無で作品Undoの意味を変えない。 |
| AUD-002 | P1 | 閉鎖（Stage③） | Layer構造/visibility/blendを正本・Undo・Save snapshotへ統合。描線の可視性も対象Layer属性から評価。 |
| AUD-003 | P1 | 閉鎖（Stage③） | 作品Undoと候補Undoを異なる明示actionへ分離。候補取消で別層Cを維持。 |
| AUD-004 | P1 | 閉鎖（Stage③） | Focusの一時Panelを実表示し、閉じる/WorkspaceボタンでFocusへ復帰。 |
| AUD-005 | P1 | 閉鎖（Stage③） | scope判別union、save/export実文書必須、manager asset、実行可否境界を修正。 |
| AUD-006 | P1 | 未閉鎖（技術参照拡張済） | 実三角形Warp・折返し・bilinear/cubic B-spline・複数後段・Mask/Clip・2 live Effect・不変Save rootをFraction CPU参照12件で追加。全製品Warpと、本人による再編集意味のUI確認は未実施。詳細は [AUD006参照契約](AUD006_WARP_REFERENCE_REVIEW.md)。 |
| AUD-007 | P1 | 閉鎖（Stage③） | Session実測高さをResizeObserverで予約。狭幅で重複作品Undoボタンを省き、文字をrem化。 |
| AUD-008 | P2 | 未閉鎖 | 主要同義語は修正済だが、名称を教えない制作課題と十分な同義語コーパスは未実行。 |
| AUD-009 | P2 | 閉鎖（Stage③） | 詳細の入口保持、Escape/閉じるの焦点復帰と入口消滅時の安全代替。 |
| AUD-010 | P2 | 未閉鎖 | Clip/Mask/入り抜き/表示帯の主入口を修正し、名目手数と実測を区別。全247件の主入口・スクロール・候補開始までの最短/通常経路の実測は不足。 |
| AUD-011 | P2 | 閉鎖（Stage③） | View逆行列で前重心の文書点を固定し新重心へ再投影。反転/回転を含む。 |
| AUD-012 | P2 | 閉鎖（Stage③） | 描線stampを状態更新と分離し、無関係syncでpath DOMを置換しない。 |
| AUD-013 | P2 | 閉鎖（Stage③） | 実DOMで入口action/結果/副作用を検査し、修正前PR7にも同じ期待を適用。988件の既知ID詳細導線は別集計。 |
| AUD-014 | P2 | 閉鎖（Stage③） | writer増分予算・acceptedThrough・firstRejected・保護範囲救出を具体化し、部分筆を黙って確定しない。 |
| AUD-015 | P2 | 閉鎖（Stage③） | 恒久失敗の依存閉包、旧Save失敗、独立C保護、同意後の新枝Saveをモデル化。 |
| AUD-016 | P2 | 未閉鎖 | scopeを5領域に定義。作品/候補の試作は動くが、Pad/資料を含む実UIと利用者の作用対象理解の試験は不足。 |
| AUD-017 | P2 | 未閉鎖 | 8幅のCanvasとhit測定は実施。残余幅を改善したが、同じ制作課題の探索時間/開閉回数/遮蔽比較の利用者評価は未実施。 |
| AUD-018 | P2 | 閉鎖（Stage③） | SV面のpointer/arrow、色相range、描画色と見た目の同期。初期の紫面/緑色採用の不一致も修正。 |
| AUD-019 | P3 | 未閉鎖 | coarse入力の主要標的44pxと文字200%/320pxのgeometry検査を追加。実指の誤タップと全標的の例外評価が不足。 |

## 証拠の扱い

- PR7に同じDOM期待を適用：旧版に失敗が出る。ただし旧版にない要素の不在も含むため、失敗数を不具合件数とは数えない。レイヤー/遮蔽は共通DOMの追加試験でも検査する。
- 型/モデル/CPU画素と物理保存・GPU・実機の合格を区別する。AUD014/015は旧参照実装が存在しない設計欠落のため、元の反例から受理境界・依存失敗を具体化し、失敗注入モデルで閉鎖する。
- 新規3件を修正・検証。独立した第三者監査ではなく、同一AIによる再監査。
- 現HEADでCIが失敗した場合は該当閉鎖を取り消す。CIリンクの版と現在の版の差は最終監査で明示。
