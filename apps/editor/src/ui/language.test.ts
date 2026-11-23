import {expect,it} from 'vitest';
import {translatedLabel} from './language';

it('translates work, layer, canvas, and export controls without changing work names or measurement text values',()=>{
  const labels=['新しい作品','レイヤー一覧','座標で塗る場所を指定','出力ファイルに含める色と情報'];
  expect(labels.map(label=>translatedLabel(label,'en'))).toEqual([
    'New artwork','Layer list','Set fill position by coordinates','Export color and metadata',
  ]);
  expect(labels.map(label=>translatedLabel(label,'ja'))).toEqual(labels);
  expect(translatedLabel('2480 × 3508 px','en')).toBe('2480 × 3508 px');
  expect(translatedLabel('作品 — 海辺','en')).toBe('作品 — 海辺');
});
