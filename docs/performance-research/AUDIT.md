# 最終監査の範囲と結果

## 今回の確認

[validation_results.json](validation_results.json)は、生成器と別のパーサーを使って実ファイルを検査する。247 ID集合の一致、30分野件数、各固有問題/試験、原仕様の設定/直接操作/再編集/品質との一致、個別節hash、全既存54ファイルの基準commitとのbyte比較、全関連IDと根本課題の双方向対応を確認する。

加えて、14カードの6欄と未回答状態、42案の3原理と採用未確定、EXP25/QR22/NB12、21出典ID、相対リンク/anchor、Python構文、JSON解析、実験コードhashと実際の負例/基準一致結果を検査する。検査項目数と失敗は結果JSONを正とする。Git保存は別途commit/remote branch/PRで確認し、リンク数で内容品質を証明しない。

## 検査中に見つけて直した点

- 最初の原仕様節抽出regexがDOTALL下の貪欲なタイトル取得で30先頭節しか拾わなかった。改行を除くタイトルに修正し、別のanchor分割パーサーで247節と元詳細値を再検査した。欠落のまま完了にしない。
- AUT-002の固有問題が短く、対象違いという影響を省略していたため補足。文字数の検査自体は内容の正しさの証明ではない。
- 生成途中のAUDIT/validation_resultsリンク未作成を検出し、実ファイル作成後にリンク検査を再実行した。
- モデルの小分け時間は抽象仕事単位でありmsではないと明記。E05も実RAMではなくpayload算術。E07を実機耐電断試験と誤記しないよう、directory fsync/kill/実容量不足が未実施とした。
- 原仕様内の古い未承認ラベルは[判断台帳](DECISIONS.md)に記録し、既存ファイルを無断修正しなかった。

## 内容を再評価した観点

各分野の問題を、単なるGPU/Worker/cacheの置換になっていないか読み直した。ブラシ被覆の集約、恒等演算除去、検索と対象の再指定削減、同じ境界判断の再利用、変形での再標本化廃止、未使用機能の周期処理を発生させない案を残した。一方で混色の順序、面の全域位相変化、効果の入力halo/遠方参照、保存pin、cache回収の破損を反証条件に置いた。

機能固有の問題と横断的な資源/待機の確認は分けた。計算方式がまだないものは、今その不具合が存在すると断定しない。各機能の未確認範囲を残した。将来/範囲外機能も点検し、機能削減や正式採用へ読み替えない。

## この監査が保証しないこと

同じ作業者による別経路/別観点の検査で、他担当の独立承認ではない。原仕様を読んだ分析が唯一の解釈であること、全ての重要問題を発見し尽くしたこと、初見UIの自然さ、実機性能、CPU/GPU/RAM/電池/熱、保存APIの耐久性、色再現と互換、全42案の実現性、競合優越を証明しない。数値と正式採用は未確定で、[ロードマップ](ROADMAP.md)に引継ぐ。

## 再実行

リポジトリルートで以下を実行する。生成器は研究ディレクトリだけを更新する。

```bash
python docs/performance-research/build_indexes.py
python docs/performance-research/build_decisions.py
python docs/performance-research/experiments/run_models.py
python docs/performance-research/experiments/storage_fault_model.py
python docs/performance-research/validate_research.py
git diff --check
```
