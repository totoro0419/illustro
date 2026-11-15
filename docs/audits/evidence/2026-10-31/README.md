# 監査証拠と再現手順

対象：PR #7 `fc14afdde2d25ee61e2f05e4d89a387ab5ca3c04`。監査日2026-10-31 UTC。

`target-manifest.json`は監査着手時の184 tracked filesのSHA256。`pull-requests.json`はGitHub取得時のPR状態。`source-inventory.json`は対象資料の所在で、全ファイルの全主張を再実験したという意味ではない。

`feature-audit.json`は全247件について12監査軸を持つ。原典の説明は証拠欄、独自の反例/追加試験は`review`およびC06/C10、確認した欠陥と設計不足は`findings`で分けた。`review-notes.json`の247件は手動で著述した監査質問であり、不具合発生の自動認定ではない。C11の出典IDを全件の競合優越確認とは扱わない。

再現コマンド（監査対象を変更しない）：

```sh
node qa/ui-prototype/tests.cjs
node docs/audits/evidence/2026-10-31/adversarial-model.cjs
python docs/audits/evidence/2026-10-31/build-audit.py
python docs/audits/evidence/2026-10-31/verify-audit.py
```

`build-audit.py`が書くのはdocs/audits内の新しい監査資料のみ。元の製品validatorを再実行すると既存のvalidation.jsonを上書きするため、本監査の成果物照合には使っていない。モデルの既存12試験は読み取り実行した。`existing-model-results.json`はその結果。元12件が成功しても、新しいM01/M02の反例は残る。

`adversarial-model-results.json`の読み方：M01は固定Undoと検索適用の意味差、M02はSessionによる作品Undoの占有。M03/M04は正しく保持できた抽象モデルの肯定確認。M05は二指アンカー式、M06は単純source-overでは消せないという限定数学反例。M07は容量算術。`contractHolds:false`は期待契約との不一致を記録するもので、全てが採用済み製品実装の障害を再現した意味ではない。

`cpu-lab-repeat.json`はこの監査でNode v24.22.1/Linuxの既存CPU試験を再実行した記録。12グループ成功。小画像/固定順/4回程度の測定であり、同一端末の旧測定との厳密比較ではない。`median_ms`は元スクリプトが4標本の上側中央値を取る定義。再試験の数値を製品方式の採用、実GPU性能、実機の発光遅延へ一般化しない。`check-inline.cjs`も5 script blocksの構文/静的条件を再検査して成功したが、ブラウザー操作試験の代わりではない。

## ブラウザー操作

ローカル配信した原HTMLのbyteコピーをChromiumで操作した。原HTML SHA256：

`f00dc068a2bf5ad3e668e5335b950f19d58c4f8ac443a810a3cab071036d751b`

実施経路：検索ボタン→IDを入力→対応する結果をクリック→`data-reached=ID`の表示と試行入口の有無を確認。25件程度のバッチで記録し、最後に正式一覧と全件照合した。`browser/routes-desktop.json`は247件、`routes-phone.json`は30分野の代表30件。表示確認は処理結果や全詳細部品の非遮蔽を保証しない。Phone残り217件を実操作済みとはしていない。

原UIの端末切替で1180×820/390×844枠を表示。320×568/740×360/800×600は、外側のiframeだけを寸法変更した。[監査用枠](audit-viewports.html)でも同じ原UIを表示できる。サーバーをリポジトリrootで起動してこのHTMLを開く。URLがfile:の時のブラウザー制約とHTTP配信は別条件。

```sh
python -m http.server 8000
# /docs/audits/evidence/2026-10-31/audit-viewports.html
```

操作後にAX状態を更新し、代表箇所は画面/DOM寸法を取得した。`.isVisible()`は重なりを保証しないため、Session適用には中心点hitも照合した。タブレット画面と寸法は初期状態から取り直した確定版を保存。初期iframe内のFocusクリックで状態が変わらなかった試行は指摘根拠にせず、原UI直接表示で再現した。

|証拠|対応|
|---|---|
|search-undo-adds-operation.jpg / M01|AUD-001|
|layer-state.json / layer-undo-state.jpg|AUD-002|
|undo-focus.json / M02|AUD-003/009|
|focus-color-hidden.jpg|AUD-004|
|landscape-session.jpg / session-occlusion.json|AUD-007|
|search-tests.json|AUD-008|
|intermediate-800.jpg / intermediate-metrics.json|AUD-017|
|tablet-workspace.jpg / color-plane.json|AUD-018|
|tablet-metrics.json / small-320-metrics.json / small-320.jpg|AUD-019|

スクリーンショットの外側の1363×936はクラウドブラウザーの画面。内部のCSS枠/iframe寸法が検査対象。物理スマホ/タブレット/ペン/指、仮想キーボード、支援技術、DPR変更の実機検証ではない。

PR #6のAndroid数値は既存報告を参照し、今回生ログ全件の再集計/Android再測定をしていない。生ログはリポジトリに含まれず、今回の成果物にも転載しない。公式比較は総合報告のリンク先を2026-10-31に検索/取得して確認した。各社の内部実装や同条件での速度比較は未確認。
