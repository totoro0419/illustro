# 調査出典と確認範囲

調査・策定日：2026-10-27（JST）。状態：**製品仕様案・未承認**。ユーザー指定の要求を除き正式採用ではない。実装・性能達成を示さない。

[文書案内](README.md) · [判断台帳](DECISION_REGISTER.md) · [品質要件](QUALITY_REQUIREMENTS.md)

## 固定した調査対象

旧リポジトリ：`totoro0419/illustro_old`、HEAD `bdc7135b51033982d90ea5dad104bb04fc107df2`。新リポジトリの作業開始点：`1f0ad19663198c3259165230ac96cba867951d41`。旧側は読取専用。新側のREADME・PRODUCT_VISION・DEVELOPMENT_PROCESSを全文確認。新側のツリーにはAGENTS.mdは存在しなかった。

閲覧日は全て2026-10-27（JST）。下表の「本文確認」は必要な該当節の確認であり、巨大な公式マニュアルの全ページ精読を意味しない。競合は実機操作をしていない。手数は文書から数える設計比較で、実測時間・初見の成功率ではない。最新性は取得できた更新履歴と照合した範囲に限る。

## 公式資料

| ID | 製品・資料 | URLと確認箇所 | 確認できた範囲 | 証拠の強さ |
|---|---|---|---|---|
| IB-01 | ibisPaint / Bucket tool details | [Bucket tool details](https://ibispaint.com/lecture/index.jsp?lang=en&no=82) — About / Bucket Tool window / Gap Recognition / Continuous Filling | 通常・連続・囲み塗り、強さ・拡張・隙間認識、Current/Specific/Canvas参照。設定を誤ると期待どおりに動かない旨も公式に記載。 | 本文確認 |
| IB-02 | ibisPaint / New Feature | [New Feature](https://ibispaint.com/newFeature.jsp?lang=en) — Ver.14.1.0: Stabilizer / Stroke Drawing / Force Fade / Solo / Transform Undo / Deleted Artwork | 定常・高速線補正、予測描画の切替、ブラシ別設定、Solo復帰、変形セッション内Undo、削除作品の復元。掲載版を記録し最新版番号の恒久保証はしない。 | 本文確認 |
| IB-03 | ibisPaint / Adjustment Layer | [Adjustment Layer](https://ibispaint.com/lecture/index.jsp?no=173) — Adjustment Layer | 特殊レイヤー追加から色調整を作成し、パラメータ、表示、不透明度を再編集する。 | 本文確認 |
| IB-04 | ibisPaint / Tutorial index | [Tutorial index](https://ibispaint.com/lecture/index.jsp?lang=ja) — 講座目次 | ブラシ、ベクター、定規、フィルター、変形、ファイル、作品管理の調査範囲確認。目次だけで細部の挙動は断定しない。 | 目次確認 |
| CS-01 | CLIP STUDIO PAINT / Fill settings | [Fill settings](https://help.clip-studio.com/en-us/manual_en/810_subtools/F.htm) — Fill / Close gap | 色の連続性、隙間閉じ設定。値が大きい場合、端末次第で処理が長くなるとの注意。 | 本文確認 |
| CS-02 | CLIP STUDIO PAINT / Advanced Fill | [Advanced Fill](https://help.clip-studio.com/en-us/manual_en/420_fill/Advanced_Fill.htm) — Target color / Refer multiple / Fill up to vector path | 参照範囲、除外、境界・ベクターパスまでの塗り。DEBUTにない機能を含む。 | 検索本文確認 |
| CS-03 | CLIP STUDIO PAINT / Vector layers | [Vector layers](https://help.clip-studio.com/en-us/manual_en/180_layers/Vector_layers.htm) — Using / Editing / Correct Line / Vector eraser / SVG | 描線の点・幅・形状編集、交点まで消去。Fill/Gradient/Blendは同レイヤーで不可。SVG交換では線形状以外の損失注意。 | 本文確認 |
| CS-04 | CLIP STUDIO PAINT / Quick Access Palette | [Quick Access Palette](https://help.clip-studio.com/en-us/manual_en/690_interface/Quick_Access_Palette.htm) — Searching / Adding a search result / Customizing | コマンド・ツール・色・Auto Action登録、検索結果から追加。DEBUT非対応。 | 本文確認 |
| CS-05 | CLIP STUDIO PAINT / Time-Saving and Efficient Coloring | [Time-Saving and Efficient Coloring](https://tips.clip-studio.com/en-us/articles/9941) — Simple Mode / Studio Mode | 公式アカウントによる囲って塗る・参照塗りの入口。モード別の入口差を確認。 | 本文確認 |
| CS-06 | CLIP STUDIO PAINT / Release Notes | [Release Notes](https://www.clipstudio.net/en/dl/release_note/latest/) — 2026 patch release headings | 2026年更新履歴を照合。旧9月調査を最新情報の代用にしない。 | 検索本文確認 |
| PR-01 | Procreate / Gestures | [Gestures](https://help.procreate.com/procreate/handbook/interface-gestures/gestures) — Basic / Undo / Redo / QuickShape | ピンチ回転、2指Undo、3指Redo、描いて保持する形状補正。Undoは最大250操作、Gallery移動・終了で消去との記載。 | 本文確認 |
| PR-02 | Procreate / QuickMenu | [QuickMenu](https://help.procreate.com/procreate/handbook/interface-gestures/quickmenu) — Enable / Use / Customize | 6方向のカスタムメニュー。タップ開閉と保持ドラッグ選択。初回有効化にはGesture controls設定。 | 本文確認 |
| PR-03 | Procreate / Colors Interface | [Colors Interface](https://help.procreate.com/procreate/handbook/colors/colors-interface) — ColorDrop Threshold / Continue Filling / Eyedropper | 色ドラッグ、保持左右ドラッグで許容調整、連続塗り、採色元切替。 | 本文確認 |
| PR-04 | Procreate / Canvas | [Canvas](https://help.procreate.com/procreate/handbook/actions/actions-canvas) — Reference Companion / Crop and Resize | Actions→Canvas→Reference、窓の移動・拡縮、資料・全体表示から採色。Crop UIには端末上限に関する説明。 | 本文確認 |
| PR-05 | Procreate / Brush Studio Settings | [Brush Studio Settings](https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings) — Stroke Path / Stabilization / Taper | 間隔・揺らぎ・補正・入り抜き等の詳細設定。設定数そのものを品質の根拠にしない。 | 該当節本文確認 |
| PR-06 | Procreate / Accessibility | [Accessibility](https://help.procreate.com/procreate/handbook/interface-gestures/accessibility) — Single Touch / VoiceOver / Type / Color / Stabilization | 単指の表示操作、色説明、拡大文字、全体補正。VoiceOver有効中は描けない旨も明示。 | 本文確認 |
| PR-07 | Procreate / What’s new 5.4 | [What’s new 5.4](https://procreate.com/jp/procreate/whats-new) — Brushes Sorted / Existing Brushes | 複数ブラシライブラリ、検索、既存ブラシのClassic保持。 | 本文確認 |
| KR-01 | Krita / Colorize Mask | [Colorize Mask](https://docs.krita.org/en/reference_manual/tools/colorize_mask.html) — Usage / Tool Options | 色指示線→Update、出力と指示線の表示切替、領域制限、隙間設定の誤り、マスクとして保存。 | 本文確認 |
| KR-02 | Krita / Instant Preview | [Instant Preview](https://docs.krita.org/en/reference_manual/instant_preview.html) — Activation / limitations | 縮小側の即時表示と裏の本結果計算。倍率や設定次第で効果がなく、完了時の見た目の跳ねを生む場合がある。 | 本文確認 |
| KR-03 | Krita / Color Smudge Brush | [Color Smudge Brush](https://docs.krita.org/en/reference_manual/brushes/brush_engines/color_smudge_engine.html) — Color Rate / Smudge Length / Options | 色の追加とにじみ・引きずりの関係を設定。 | 該当節本文確認 |
| KR-04 | Krita / Assistant Tool | [Assistant Tool](https://docs.krita.org/en/reference_manual/tools/assistant.html) — Tool Options / Limit assistant to area | キャンバス上のガイド作成・保存・削除・範囲制限。 | 本文確認 |
| KR-05 | Krita / Transform Tool | [Transform Tool](https://docs.krita.org/en/reference_manual/tools/transform.html) — Free / Warp / Cage / Liquify / Mesh | 直接ハンドル、ケージ、メッシュ、変形精度とプレビューの差、キーボード依存の多い操作を確認。 | 該当節本文確認 |
| KR-06 | Krita / Filter Masks | [Filter Masks](https://docs.krita.org/en/reference_manual/layers_and_masks/filter_masks.html) — Filter Masks | 元画像を変更しないフィルターマスク。 | 検索本文確認 |
| KR-07 | Krita / PSD | [PSD](https://docs.krita.org/en/general_concepts/file_formats/file_psd.html) — PSD compatibility | 対応するレイヤー等の説明は参考。ただし公式仕様の不在という記述はAD-05と矛盾し、本調査では採用しない。 | 本文確認・一部主張を反証 |
| KR-08 | Krita / Posts | [Posts](https://krita.org/en/posts/) — September releases / October monthly report | 5.3.4/6.0.4公開記事、開発中報告を区別。マニュアルは5.3.0表記。 | 目次確認 |
| KR-09 | Krita / Brush Settings | [Brush Settings](https://docs.krita.org/en/reference_manual/brushes/brush_settings.html) — Tips / Sensors / Texture | ブラシ設定の構成確認。子ページの全設定は未精査。 | 目次確認 |
| AD-01 | Adobe Photoshop / Smart Objects overview | [Smart Objects overview](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/smart-objects-overview-and-benefits.html) — Benefits / Limitations | 再変形・再編集、リンク更新。直接描画等には制約があり、内容編集や別レイヤー等を使う。 | 本文確認 |
| AD-02 | Adobe Photoshop / Adjustment layers | [Adjustment layers](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/color-adjustment-fill-layers/work-with-adjustment-and-fill-layers.html) — Create an adjustment layer | Layersの追加から補正を作成、Propertiesで調整。補正・塗りレイヤーの種類を確認。 | 本文確認 |
| AD-03 | Adobe Photoshop / Opacity and blending modes | [Opacity and blending modes](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/apply-layer-effects/set-layer-opacity-and-blending-modes.html) — Opacity / Fill / Blend / Groups | 合成モードのライブ比較、OpacityとFillの違い、グループPass Through。 | 本文確認 |
| AD-04 | Adobe Photoshop / Advanced blending | [Advanced blending](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/apply-layer-effects/use-advanced-blending-options.html) — Control blending with tonal ranges | 自レイヤー/下地の階調範囲、Alt/Optionによる分割・なだらかな境界。 | 本文確認 |
| AD-05 | Adobe Photoshop / File Formats Specification | [File Formats Specification](https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/) — Preface / Audience / What is not in this document | 2019年11月の公開PSD/PSB仕様。形式の説明であり解釈の説明ではない、PSDCを含まないと明示。完全互換の根拠にはならない。 | 本文確認 |
| AD-06 | Adobe Photoshop / What’s new desktop | [What’s new desktop](https://helpx.adobe.com/photoshop/desktop/whats-new/whats-new-in-adobe-photoshop-on-desktop.html) — 2026-10-05 updated heading | 最新更新の照合。生成補助がある事実とIllustroへの採否を分離。 | 検索本文確認 |
| AF-01 | Affinity / March 2026 update | [March 2026 update](https://www.affinity.studio/blog/affinity-update-march-2026) — Light UI / Convert to Curves / Live Tone Blend Groups | 明色UI、選択からカーブ、非破壊トーン合成、右クリックのブラシ入口。速度表現はメーカー主張で未実測。 | 本文確認 |
| AF-02 | Affinity / September 2026 update | [September 2026 update](https://www.affinity.studio/blog/affinity-update-september-2026) — Craft / Automation / Integration | Vector/Pixel/Layout横断スクリプト、ブレンド、編集可能なブーリアン等。旧Photo2とは世代を分ける。 | 本文確認 |
| AF-03 | Affinity / Color filters help | [Color filters help](https://www.affinity.studio/help/filters-clr-filters/) — Color filters | 公式検索本文ではPixel FiltersとNew Live Filter Layerを確認。直接openは本文取得不能。詳細操作の確証は限定。 | 検索本文のみ・取得制限 |
| AF-04 | Affinity Photo 2 / Snapshots | [Snapshots](https://affinity.help/photo2/ja.lproj/pages/DesignAids/snapshot.html) — Create / Restore / New document | 名前付き状態保存・復元・別文書化。Photo2の操作として確認し、新Affinityへ自動一般化しない。 | 旧世代公式本文確認 |
| AF-05 | Affinity / Release notes | [Release notes](https://www.affinity.studio/help/release-notes/) — October 2026 title | ページの表題のみ取得、更新細目の本文は取得不能。最新の全変更を調べ終えたとはしない。 | 取得制限 |
| MY-01 | MyPaint / Official repository README | [Official repository README](https://github.com/mypaint/mypaint) — Features / License | 無限キャンバス、ブラシ設定をストロークから取得できる方向、顔料モデル、レイヤー。READMEのmasterとリリースは別。 | 本文確認 |
| MY-02 | MyPaint / Scratchpad | [Scratchpad](https://www.mypaint.app/en/docs/manuals/v1.2.0/ui/panels/scratchpad/) — Scratchpad / Accessing | 作品外の試し描き・混色・資料・ブラシ採取。v1.2.0マニュアルとして扱い最新挙動は未実機検証。 | 旧版公式本文確認 |
| MY-03 | MyPaint / Releases | [Releases](https://github.com/mypaint/mypaint/releases) — Latest entry | 取得時にv2.0.1（2020-05-29）がLatest表記。開発masterと混同しない。 | 本文確認 |
| RB-01 | Rebelle / Working with Water | [Working with Water](https://www.escapemotions.com/products/rebelle/manual/latest/starting-painting/water/) — Show Wet / Dry Layer / Fast Dry / Pause Diffusion | 濡れ可視化、乾燥、再加水、拡散停止。水彩をユーザーが制御する操作を参照。 | 本文確認 |

## 取得制限・反証・未調査

- Affinity現行Helpの一部はopenで本文ではなく共通ナビだけ返る。検索本文で取れた概要以上の細部は未確認（AF-03/05）。Photo2のSnapshot操作は旧世代の確認に留める。
- CSP Quick Accessの小文字URLは取得失敗したが、大文字`Quick_Access_Palette.htm`で本文を取得し解消。マニュアルルートの空本文を「製品に機能がない」根拠にしていない。
- Krita Reference Imagesの推定URL、MyPaint blogの推定URLは取得不能。これらの内容から機能比較の断定をしていない。
- KR-07の「PSDの公式仕様がない」という説明はAD-05の公開本文と矛盾。旧調査の同じ説明も再採用しない。形式公開と完全な描画互換性は別である。
- 競合全OS・全グレードの動作、実際の操作遅延、メモリ、誤操作率、最大作品条件は未検証。現行Affinityの端末別機能同一性、MyPaint旧版マニュアルの現行操作同一性も未確認。
- 価格・契約・他社コードの利用可否は本案の採用根拠にしない。コードや素材は転用していない。OSSを使う判断は次段階で各対象ファイルのライセンスを確認する。
- 論文由来の特定アルゴリズムは採用していない。今回の改善提案は製品体験の仮説であり、独自性や世界初を主張しない。
