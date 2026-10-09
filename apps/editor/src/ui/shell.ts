/** M07 PC/tablet production shell. Artwork state remains in EditorController. */
export const RIGHT_BOXES=[
  ['right.layers','Layers','layersBox',true],
  ['right.color','Color','colorBox',true],
  ['right.brush','Brush','brushBox',true],
  ['right.inspector','Inspector','inspectorBox',false],
  ['right.reference','Reference','referenceBox',false],
  ['right.assets','Assets','assetsBox',false],
  ['right.effects','Effects','effectsBox',false],
  ['right.navigator','Navigator','navigatorBox',false],
  ['right.history','History','historyBox',false],
  ['right.automation','Automation','automationBox',false],
  ['right.document','Document','documentBox',false],
  ['right.workspace','Workspace','workspaceBox',false],
] as const;
export const FEATURE_CATEGORIES=[
  ['描画','drawing'],['塗り・色・Region','fill-color-region'],
  ['選択・変形','selection-transform'],['ベクター・文字・図形','vector-text-shape'],
  ['定規・ガイド','guides-rulers'],['レイヤー・合成','layers-compositing'],
  ['補正・フィルター・修復','adjust-filter-retouch'],['資料・アセット','reference-assets'],
  ['履歴・自動化','history-automation'],['キャンバス・表示','canvas-view'],
  ['ドキュメント・編集・出力','document-output'],['ワークスペース・設定','workspace-settings'],
] as const;
const railTools=[
  ['paint','✎','ブラシ',true],['erase','⌫','消しゴム',true],
  ['smudge','≋','ぼかし・混色',false],['eyedropper','◉','スポイト',false],
  ['smartFill','▧','スマート塗り',false],['selection','▢','選択',false],
  ['transform','◇','変形',false],['move','✥','移動',false],
] as const;
const disabled=(label:string)=>'<span class="unavailable" aria-label="'+label+'は後のマイルストーンで利用できます">M07では準備中</span>';
const boxBody=(id:string):string=>{
  switch(id){
    case 'right.layers':return '<div id="layerList" class="layer-list" role="group" aria-label="レイヤー一覧"></div><button id="addLayer" type="button" disabled>＋ レイヤー追加</button>';
    case 'right.color':return disabled('カラー設定');
    case 'right.brush':return '<label>ブラシの種類<select id="brush" disabled></select></label><div class="scalar-row"><label for="size">太さ</label><input id="size" aria-label="ブラシの太さ" type="range" min="0.1" max="1024" step="0.1" value="16" disabled><input id="sizeNumber" aria-label="ブラシの太さの数値" type="number" min="0.1" max="1024" step="0.1" value="16" disabled><span>px</span></div><label class="checkbox-line"><input id="force" type="checkbox" disabled> 強制入り抜き</label><label class="checkbox-line"><input id="finger" type="checkbox"> 指で描く</label>';
    case 'right.document':return '<div class="box-actions"><button type="button" data-action="new">新規作成</button><button type="button" data-action="open">作品を開く</button><button type="button" data-action="save">作品を保存</button><button type="button" data-action="exportImage">画像を書き出す</button><button type="button" data-action="recover">自動保存から戻す</button></div>';
    case 'right.workspace':return '<label class="width-control">右側の幅 <output id="widthValue">344px</output><input id="width" type="range" min="288" max="440" value="344"></label><div class="box-actions"><button id="narrower" type="button">狭く</button><button id="wider" type="button">広く</button><button id="resetWidth" type="button">元の幅</button></div><button id="hideWorkspace" type="button">右側を閉じる</button>';
    default:return disabled('この機能');
  }
};
function boxes():string{
  return RIGHT_BOXES.map(([id,title,domId,expanded])=>'<section class="workspace-box" data-box-id="'+id+'"><div class="box-heading"><button class="box-toggle" type="button" aria-controls="'+domId+'Body" aria-expanded="'+expanded+'" title="'+title+'を開閉"><span class="chevron" aria-hidden="true">⌄</span><span class="box-name">'+title+'</span></button><span class="box-summary" id="'+domId+'Summary"></span><button type="button" class="box-more" aria-label="'+title+'の操作" aria-expanded="false" title="この欄の操作">•••</button></div><div class="box-more-menu" hidden><button type="button" data-collapse-box="'+domId+'">折りたたむ</button><button type="button" data-expand-box="'+domId+'">開く</button><span>移動・切り離しはM12で対応</span></div><div class="box-body" id="'+domId+'Body"'+(expanded?'':' hidden')+'>'+boxBody(id)+'</div></section>').join('');
}
const exportDialog='<dialog id="exportDialog" aria-labelledby="exportTitle" class="export-dialog"><form method="dialog" id="exportForm"><h2 id="exportTitle">画像を書き出す</h2><p>作品ファイルの保存とは別です。レイヤーを1枚の画像にまとめます。</p><label>画像の種類<select id="exportFormat"><option value="png">PNG（透明な背景を保持）</option><option value="jpeg">JPEG（背景を白にする）</option><option value="webp">WebP（透明な背景を保持）</option></select></label><label id="exportQualityRow" hidden>画質 <output id="exportQualityValue">90%</output><input id="exportQuality" type="range" min="1" max="100" step="1" value="90"></label><p id="exportTransparencyInfo">PNGは背景の透明な部分を保持します。</p><p id="exportStatus" role="status" aria-live="polite"></p><div class="export-actions"><button id="exportCancel" value="cancel" type="button">閉じる</button><button id="exportRun" type="button">書き出す</button></div></form></dialog>';
export function shellMarkup(qa=false,qaContent=''):string{
  const rail=railTools.map(([id,glyph,label,available])=>'<button id="'+id+'" type="button" class="tool-button" aria-label="'+label+'" title="'+(available?label:label+'：後のマイルストーンで利用可能')+'"'+(available?' aria-pressed="'+(id==='paint')+'"':' disabled aria-disabled="true"')+'><span class="tool-glyph" aria-hidden="true">'+glyph+'</span><span class="tool-caption">'+(id==='paint'?'Brush':id==='erase'?'Eraser':label)+'</span></button>').join('');
  const groups=FEATURE_CATEGORIES.map(([label,id],i)=>'<button class="feature-category" type="button" data-category="'+id+'"'+([0,5,9].includes(i)?' data-group-start="true"':'')+' aria-label="'+label+'の機能一覧">'+label+' <span aria-hidden="true">›</span></button>').join('');
  return '<header class="topbar"><div class="brand"><span class="brand-mark">✦</span><strong>Illustro</strong><span class="brand-sub">Create freely</span></div><button id="home" type="button" disabled title="ホーム画面は後の段階で利用できます">⌂ <span>Home</span></button><button id="save" type="button" disabled title=".illustro作品ファイルとして保存">▣ <span>Save</span></button><span class="top-spacer"></span><span id="saveState" role="status">自動保存準備中</span><button id="workspaceToggle" type="button" aria-expanded="true" aria-controls="workspace" title="右側の設定欄を開閉">▤ <span>Workspace</span></button></header>'+
  '<nav class="rail" aria-label="描画ツール">'+rail+'<button id="colorPage" class="compact-only">色</button><button id="brushPage" class="compact-only">設定</button><button id="layersPage" class="compact-only">レイヤー</button><button id="allFeatures" class="all" type="button" aria-expanded="false" aria-controls="allFeaturesPanel" title="すべての機能"><span aria-hidden="true">▦</span><span class="tool-caption">All Features</span></button></nav>'+
  '<section id="allFeaturesPanel" class="features-panel" aria-label="すべての機能" hidden><div class="features-header"><strong>すべての機能</strong><button id="featuresClose" aria-label="閉じる">×</button></div><div id="featuresCategories" class="feature-categories">'+groups+'</div><div id="featuresActions" class="feature-actions" hidden><button id="featuresBack" type="button">← カテゴリへ戻る</button><h3 id="featuresTitle"></h3><div id="featuresItems"></div></div></section>'+
  '<main id="canvasArea"><div class="canvas-top"><p id="status" role="status">新規キャンバスを開くか、作品ファイルを開いてください。</p><div class="document-actions"><button id="new" aria-label="新規キャンバス" type="button">＋ 新規</button><button id="open" type="button">開く</button><button id="recover" type="button" disabled>復元</button><button id="saveCopy" type="button" disabled>別名保存</button><button id="exportImage" type="button" disabled>画像を書き出す</button><input id="openFile" type="file" accept=".illustro,application/octet-stream" hidden></div></div><div class="surface"><canvas id="canvas" aria-label="描画キャンバス" data-committed-strokes="0"></canvas></div></main>'+
  '<div id="splitter" role="separator" tabindex="0" aria-orientation="vertical" aria-label="右側の設定欄の幅" aria-valuemin="288" aria-valuemax="440" aria-valuenow="344"><span class="resize-grip" aria-hidden="true">⋮⋮</span></div>'+
  '<div id="rightDock" class="right-dock"><aside id="workspace" aria-label="Workspace"><button id="close" class="compact-only">閉じる</button><div id="boxStack" class="box-stack">'+boxes()+'</div></aside>'+
  '<section id="layerPage" class="layer-page" role="region" aria-label="レイヤーの一覧と操作" hidden><div class="layer-page-head"><div><small>WORKSPACE / LAYERS</small><h2>レイヤー</h2></div><button id="closeLayerPage" type="button" aria-label="レイヤー画面を閉じる">×</button></div><div class="layer-page-meta">今選んでいるレイヤー: <strong id="layerPageSelected">—</strong></div><div id="layerPageList" class="layer-list layer-page-list" role="group" aria-label="レイヤー一覧"></div><div class="layer-page-actions"><button id="addLayerPage" type="button" disabled>＋ ラスターレイヤーを追加</button><p>グループやマスクなどはM11で追加します。</p></div></section>'+
  '<div class="commands" role="toolbar" aria-label="固定の操作"><button id="layer" type="button" aria-expanded="false" aria-controls="layerPage" title="レイヤー画面">▤<span>Layers</span></button><button id="undo" type="button" disabled title="元に戻す" aria-label="元に戻す">↶<span>Undo</span></button><button id="redo" type="button" disabled title="やり直す" aria-label="やり直す">↷<span>Redo</span></button><button id="flipH" type="button" disabled title="左右反転はM08で利用できます" aria-label="左右反転（M08で利用可能）">⇆<span>左右反転</span></button><button id="flipV" type="button" disabled title="上下反転はM08で利用できます" aria-label="上下反転（M08で利用可能）">⇅<span>上下反転</span></button></div></div>'+
  '<div class="compact-only bottom"><button id="compactUndo" type="button" disabled title="元に戻す">Undo</button><button id="compactRedo" type="button" disabled title="やり直す">Redo</button><button id="drawer" type="button" aria-controls="workspace" aria-expanded="false">Workspace</button></div>'+
  (qa?'<details id="qaSummary" class="qa-review"><summary>M07 実機確認</summary>'+qaContent+'</details>':'')+exportDialog;
}
