(() => {
 'use strict';
 const R=globalThis.ILLUSTRO_ROUTES, M=globalThis.createIllustroModel(R), S=M.state;
 const $=id=>document.getElementById(id), frame=$('frame');
 const paths={brush:'M5 19l3-7L19 1l4 4L12 16zM5 19l-2 3 5-2',eraser:'M3 14l9-11 9 7-10 12H7zM7 10l9 8',smudge:'M4 19c5 4 13 1 13-4 0-3-7-5-5-9 2-3 7-3 9-1M5 14c-5 1-4 7 1 8',eyedropper:'M4 20l4-1L20 7l-3-3L5 16zM13 4l7 7',fill:'M2 13l10-10 8 8-10 10zM3 12h15M21 14c-4 5-3 7 0 7s4-2 0-7',selection:'M3 3h4m3 0h4m3 0h4v4m0 3v4m0 3v4h-4m-3 0h-4m-3 0H3v-4m0-3v-4m0-3V3',transform:'M3 3h18v18H3zM1 1h4v4H1zm18 0h4v4h-4zm0 18h4v4h-4zM1 19h4v4H1z',move:'M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4',undo:'M8 4L2 10l6 6M3 10h10c10 0 9 12 0 12',redo:'M16 4l6 6-6 6M21 10H11C1 10 2 22 11 22',layers:'M2 8l10-6 10 6-10 6zM2 13l10 6 10-6M2 18l10 6 10-6',flipH:'M12 2v20M3 5l6 7-6 7zM21 5l-6 7 6 7z',flipV:'M2 12h20M5 3l7 6 7-6zM5 21l7-6 7 6z',home:'M3 10l9-8 9 8M5 9v13h14V9M9 22v-8h6v8',search:'M20 20l-6-6M16 9a7 7 0 1 1-14 0 7 7 0 0 1 14 0',focus:'M3 9V3h6m6 0h6v6m0 6v6h-6M9 21H3v-6',workspace:'M2 3h20v18H2zM15 3v18',more:'M4 12h1m6 0h1m6 0h1',all:'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z',color:'M21 12c0-11-19-13-19 0 0 7 8 10 11 8 4-3-2-4 0-6 1-1 8 2 8-2',save:'M3 2h15l4 4v16H2V2zM7 2v7h10V2M7 22v-9h11v9',reference:'M2 4h20v17H2zM4 18l5-6 5 4 3-3 4 5M16 8h1'};
 const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[k]||paths.more}"/></svg>`;
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const names={brush:'ブラシ',eraser:'消しゴム',smudge:'混色',eyedropper:'スポイト',fill:'塗り',selection:'選択',transform:'変形',move:'移動'};
 const toolIds={brush:'BRU-001',eraser:'BRU-012',smudge:'WET-001',eyedropper:'COL-003',fill:'FIL-001',selection:'SEL-001',transform:'TRN-001',move:'LAY-010'};
 let category=null, panelCategories={},activePanelFeature={}, focusReturn=null,detailReturn=null,previousTool='brush',selected=false,toastTimer,selectionNav=false,saveError=false,layerStamp='',strokeStamp='';
 let pendingTool=null, width=344;
 function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
 function bind(id,fn){$(id).addEventListener('click',fn);}
 for(const [id,key] of Object.entries({home:'home',search:'search',focus:'focus',workspaceToggle:'workspace',reviewToggle:'more',allIcon:'all'})) $(id).innerHTML=icon(key);
 $('save').insertAdjacentHTML('afterbegin',icon('save'));
 $('tools').innerHTML=Object.keys(names).map(t=>`<button class="tool" data-tool="${t}" aria-label="${names[t]}" title="${names[t]}" aria-pressed="${t===S.tool}">${icon(t)}<small>${names[t]}</small></button>`).join('');
 function toggleRegion(id,open){const el=$(id);el.hidden=open===undefined?!el.hidden:!open;const trigger={library:'allFeatures',quick:'quickTrigger'}[id];if(trigger)$(trigger).setAttribute('aria-expanded',!el.hidden);}
 function closeLibrary(){toggleRegion('library',false);if(focusReturn?.isConnected)focusReturn.focus();}
 function openLibrary(search=false){focusReturn=document.activeElement;category=null;$('query').value='';toggleRegion('library',true);$('libraryTitle').textContent=search?'機能検索':'全機能';renderLibrary();$('query').focus();}
 function renderLibrary(){
   const q=$('query').value;
   if(q||category){const results=M.search(q,category);$('libraryContent').innerHTML=`${category?`<button class="back quiet" data-back>‹ カテゴリ一覧</button><div class="crumb">${esc(R.categories[category].label)}</div>`:''}<p class="muted" style="font-size:11px;margin-bottom:6px">${results.length}件 · 保留／対象外は範囲説明のみ</p><div class="results">${results.map(featureRow).join('')||'<p>見つかりません。別の目的やカテゴリで探せます。</p><button data-clear>すべてのカテゴリを見る</button>'}</div>`;}
   else $('libraryContent').innerHTML='<div class="groups">'+R.groups.map(g=>`<h3>${esc(g.label)}</h3>${g.categories.map(c=>`<button class="category" data-category="${c}"><span>${esc(R.categories[c].label)}</span><small>${M.search('',c).length} ›</small></button>`).join('')}`).join('')+'</div>';
 }
 function featureRow(f){return `<button class="feature-row" data-feature="${f.id}"><span>${esc(f.name)}${!f.availability.executable?` <em>${f.final_scope==='deferred'?'保留':'対象外'}</em>`:f.final_scope==='included_limited'?' <em>限定</em>':''}</span><small>${f.id}</small></button>`;}
 function showPanel(p){S.panel=p;if(frame.classList.contains('focused'))frame.classList.add('focus-panel-open');$('layerPage').hidden=true;$('panels').hidden=false;frame.classList.remove('closed');$('dock').classList.add('sheet-open');$('workspaceToggle').setAttribute('aria-expanded','true');const box=$('box-'+p);box.open=true;box.scrollIntoView({block:'start'});}
 function panelRoute(p){const cats=Object.entries(R.categories).filter(([c])=>R.features.some(f=>f.category===c&&f.panel==='right.'+p));return `<div class="cat-list">${cats.map(([c,v])=>`<button data-panel-category="${c}" data-panel="${p}">${esc(v.label)} <span style="float:right">›</span></button>`).join('')}</div>`;}
 function basePanel(p){
   if(p==='layers')return `<div class="row" style="font-size:11px;margin:0 0 5px"><select id="blendMode" aria-label="レイヤーの合成方法" style="width:55%"><option>通常</option><option>乗算</option><option>スクリーン</option></select><span>100%</span><button class="quiet" data-feature="LAY-002">設定</button></div><div id="layerRows"></div><div class="row"><button class="quiet grow" id="addLayer">＋ レイヤー</button><button class="quiet" data-feature="LAY-004">Clip</button><button class="quiet" data-feature="LAY-005">Mask</button></div>`;
   if(p==='color')return `<div class="color-plane" role="group" aria-label="彩度と明度の選択。左右キーで彩度、上下キーで明度" tabindex="0"></div><div class="row spread"><label class="row"><input type="color" id="colorPicker" value="#637b78" aria-label="描画色"><span id="colorCode" style="font-size:11px">#637B78</span></label><button class="quiet" data-feature="COL-001">HSV / RGB</button></div><div class="chips" id="swatches">${['#637b78','#3d5d54','#afbfad','#f3d3a0','#f8f3e7','#7473a4','#b68178','#2e3a49'].map(c=>`<button aria-label="色 ${c}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>`;
   if(p==='brush')return `<label style="font-size:11px">プリセット<select id="preset" style="width:100%;margin:5px 0"><option>Gペン</option><option>鉛筆</option><option>水彩風（簡易）</option><option>パステル</option></select></label><label class="field">不透明度<input id="opacity" type="range" min="1" max="100" value="100"><output id="opacityValue">100%</output></label><button class="panel-link" data-feature="BRU-008">強制入り抜き <span class="arrow">›</span></button>`;
   if(p==='reference')return `<div class="callout">資料は作品のレイヤーとは別に表示します。</div><button class="panel-link" data-feature="REF-001">＋ 資料を追加</button><button class="panel-link" data-feature="REF-004">資料から色を採る</button>`;
   if(p==='history')return '<div id="historyList" class="stack"></div><button class="panel-link" data-feature="HIS-003">別案を保存</button>';
   if(p==='workspace')return '<div class="row"><button id="layoutDefault">標準配置</button><button id="layoutFocus">Focus</button></div><p class="muted" style="font-size:11px;margin:6px 0">幅は境界ドラッグ・＋/−・左右キーで変更できます。</p>';
   if(p==='document')return '<div class="row"><button data-feature="CAN-001">新規</button><button data-feature="CAN-009">作品情報</button><button data-feature="IO-002">書き出し</button></div>';
   return '';
 }
 function renderPanels(){
  $('panels').innerHTML=Object.entries(R.panels).map(([p,label])=>`<details id="box-${p}" class="box" ${['layers','color','brush'].includes(p)?'open':''}><summary>${esc(label)}<span class="summary">${p==='layers'?'3層':p==='brush'?'Gペン':''}</span></summary><div id="body-${p}" class="box-body">${basePanel(p)}<div id="route-${p}"></div><div style="margin-top:9px">${panelRoute(p)}</div></div></details>`).join('');
  renderLayers();renderHistory();
 }
 function renderLayers(){
 if(!$('layerRows'))return;
 const rows=S.layers.map((l,i)=>'<div class="layerrow"><button class="eye" data-eye="'+esc(l.id)+'" aria-label="'+esc(l.name)+'の表示切替" aria-pressed="'+l.visible+'">'+(l.visible?'◉':'○')+'</button><button class="select-layer" data-layer="'+esc(l.id)+'" aria-pressed="'+(S.layerId===l.id)+'"><span class="thumb">'+(i===0?'〰':i===1?'◒':'◻')+'</span><span class="layername">'+esc(l.name)+'</span><small>'+esc(l.blend)+'</small></button></div>').join('');
 $('layerRows').innerHTML=rows;if($('layerPageRows'))$('layerPageRows').innerHTML=rows;
 $('box-layers').querySelector('.summary').textContent=S.layers.length+'層';
 if($('blendMode'))$('blendMode').value=S.layers.find(l=>l.id===S.layerId)?.blend||'通常';
 }
 function renderHistory(){if($('historyList'))$('historyList').innerHTML=S.past.slice(-6).reverse().map(o=>`<small>${esc(o.label)} · ${esc(o.layer)}</small>`).join('')||'<small>この試作での操作履歴はまだありません。</small>';}
 function parameters(f){return f.parameters.split(/[、・。]/).map(x=>x.trim()).filter(x=>x.length>0).slice(0,8);}
 function detail(f){const active=f.availability.executable;
   return `<div class="route-details" data-reached="${f.id}"><div class="inspector-close"><div><small>${f.id} · ${esc(f.category_label)}</small><div class="inspector-title">${esc(f.name)}</div></div><button class="quiet" data-detail-close="${f.panel.slice(6)}" aria-label="機能詳細を閉じる">×</button></div>${!active?`<p class="scope-note">${esc(f.scope_note)}<br>現在の製品機能としては実行しません。</p>`:f.final_scope==='included_limited'?`<p class="scope-note">限定対象：${esc(f.parameters)}</p>`:''}<p>${esc(f.discovery[1])}</p><p class="crumb">通常位置：${esc(f.primary_entry.label)}</p><h3>操作</h3><p>${esc(f.operation)}</p><details><summary>操作中の表示・設定の詳細</summary><p>${esc(f.while_operating)}</p><h3>設定するもの</h3><p>${esc(f.parameters)}</p></details>${active?`<button class="panel-link" data-start="${f.id}">${f.surface.tool?'このツールを使う':f.apply_cancel.kind==='system'?'状態・復旧導線を確認':f.apply_cancel.kind==='lifecycle'?'要求の導線を試す':'設定・候補を試す'} →</button><div id="fields-${f.id}"></div>`:''}<details style="margin-top:10px"><summary>確定・取消・Undoの設計</summary><p>${esc(f.undo_unit)}</p><p class="source-note">現在の保持条件：${esc(f.current_persistence)}</p></details><details><summary>処理との接続・端末別導線</summary><p>PC：${esc(f.devices.pc.projection)}</p><p>スマートフォン：${esc(f.devices.phone.projection)}</p><p>対象：${esc(f.surface.context)}</p><p>作品に対する処理本体はこの試作では実行しません。</p></details><h3>関連する機能</h3><div class="cat-list">${f.related_features.slice(0,8).filter(id=>R.features.some(x=>x.id===id)).map(id=>{const x=M.feature(id);return `<button data-feature="${id}">${esc(x.name)} <small>${id}</small></button>`}).join('')}</div></div>`;
 }
 function openFeature(id,entry='catalog'){
   detailReturn=document.activeElement;
   const result=M.navigate(id,entry),f=result.feature,p=f.panel.slice(6);activePanelFeature[p]=id;panelCategories[p]=null;
   $('route-'+p).innerHTML=detail(f);toggleRegion('library',false);toggleRegion('quick',false);toggleRegion('context',false);showPanel(p);
   const title=$('route-'+p).querySelector('.inspector-title');title.tabIndex=-1;title.focus({preventScroll:true});
   $('route-'+p).scrollIntoView({block:'start'});
 }
 function closeDetail(p){$('route-'+p).innerHTML='';activePanelFeature[p]=null;if(detailReturn?.isConnected){if($('library').contains(detailReturn))toggleRegion('library',true);detailReturn.focus({preventScroll:true});}else $('search').focus();}
 function showCategory(c,p){panelCategories[p]=c;activePanelFeature[p]=null;$('route-'+p).innerHTML=`<button class="quiet back" data-panel-back="${p}">‹ ${esc(R.panels[p])}へ</button><h3>${esc(R.categories[c].label)}</h3>${M.search('',c).filter(f=>f.panel==='right.'+p).map(featureRow).join('')}`;showPanel(p);}
 function conflict(next){pendingTool=next;$('contextTitle').textContent='未適用の操作があります';$('contextActions').innerHTML=`<p style="font-size:12px;margin-bottom:8px">${esc(M.feature(S.session.feature).name)} · ${esc(S.session.layer)}</p><button data-conflict="apply">適用して続ける</button><button data-conflict="cancel">取消して続ける</button><button data-conflict="back">元の操作へ戻る</button>`;toggleRegion('context',true);}
 function setTool(t,force=false){if(S.session&&S.session.layer===S.layer&&!force){conflict(t);return;}if(t!==S.tool){previousTool=S.tool;S.tool=t;}selectionNav=false;
  document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));$('currentTool').textContent=names[t];
  if(['selection','transform'].includes(t)){selected=true;$('selectionOverlay').removeAttribute('hidden');openFeature(toolIds[t],'primary');beginFeature(toolIds[t]);}
  if(t==='fill')openFeature('FIL-001','primary');
  sync();
 }
 function beginFeature(id){const f=M.feature(id);if(!f.availability.executable)return;
  if(id==='HIS-001'){const el=$('fields-'+id);if(el)el.innerHTML='<div class="route-actions"><button data-undo>作品のUndo</button><button data-redo>作品のRedo</button></div>';sync();return;}
  if(id==='LAY-001'||id==='LAY-002'){showPanel('layers');toast('レイヤー行の選択・目・＋・合成を直接操作できます。');return;}
  if(id==='CLP-001'){const el=$('fields-'+id);if(el)el.innerHTML='<p class="callout">コピー・切取・貼付の本体はこの試作では実行しません。架空の履歴も追加しません。</p>';return;}
  if(f.apply_cancel.kind==='command'){const el=$('fields-'+id);if(el)el.innerHTML='<p class="callout">このコマンド本体は試作対象外です。閲覧で作品の履歴は変化しません。</p>';return;}if(S.session&&S.session.feature!==id){toast('先の候補が残っています。対象帯の適用／取消で閉じてから開始してください。');return;}
  if(f.surface.tool&&!['selection','transform'].includes(f.surface.tool)){setTool(f.surface.tool);toast(names[f.surface.tool]+'に切り替えました。');return;}
  if(f.apply_cancel.kind==='system'){toast('状態確認の導線です。復旧処理の実行は実装工程で検証します。');return;}
  if(!S.session)M.begin(id);
  const fields=$('fields-'+id);if(fields)fields.innerHTML='<p class="callout" style="margin-top:10px">設定欄の操作例です。数値の製品既定や画像処理結果を示すものではありません。</p>'+parameters(f).map((p,n)=>`<label>${esc(p)}<input data-value="${n}" aria-label="${esc(p)}の候補" placeholder="候補を入力（試作）" value="${esc(S.session.values[n]||'')}"></label>`).join('')+`<div class="route-actions"><button data-cancel>取消</button><button data-apply class="primary">${['session','command','stroke'].includes(f.apply_cancel.kind)?'候補を適用（模擬）':'設定・要求を反映（模擬）'}</button></div>`;
  sync();
 }
 function finishSession(apply){if(!S.session)return;const id=S.session.feature;const committed=apply?M.apply():(M.cancel(),false);if($('fields-'+id))$('fields-'+id).innerHTML='';sync();toast(apply?(committed?'候補を反映しました（処理本体は未実装）。':'本体未実装の操作は作品へ確定しません。'):'今回の候補だけ取り消しました。');}
 function sync(){
  $('sessionbar').hidden=!S.session;if(S.session){$('sessionName').textContent=M.feature(S.session.feature).name;$('sessionTarget').textContent=' · '+S.session.layer+' · 未適用';}
  frame.style.setProperty('--session-height',S.session?Math.ceil($('sessionbar').getBoundingClientRect().height)+'px':'0px');
  $('sessionDocumentUndo').disabled=!S.past.length;$('sessionDocumentRedo').disabled=!S.future.length;
  $('target').textContent=S.layer+' ▾';if(S.session)document.querySelectorAll('[data-value]').forEach(i=>{const v=S.session.values[i.dataset.value]||'';if(i.value!==v)i.value=v;});
  $('modelStatus').textContent=`模擬状態：受理済${S.past.length}操作 ／ 計算中${S.pending.length} ／ ${S.session?'未適用候補あり':'未適用候補なし'}。画像の正確性・性能の合格証明ではありません。`;
  const last=S.saves.at(-1);$('saveStatus').textContent=saveError?'模擬保存失敗・再試行':last?.status==='pending'?'模擬保存中…':last?.status==='mock-complete'?(last.operationIds.join()===S.past.map(x=>x.id).join()?'模擬保存済み':'保存後の変更あり'):'模擬作品・未保存';
  $('saveStatus').title=`保存対象と現作品を区別。現在：${S.past.length}操作、計算中：${S.pending.length}。`;
  const sessionUndo=S.session?S.session.past.length>0:S.past.length>0,sessionRedo=S.session?S.session.future.length>0:S.future.length>0;
  document.querySelectorAll('[data-undo]').forEach(b=>{b.disabled=!sessionUndo;b.title=S.session?'候補内の直前の変更を戻す':'最後に受理した作品操作を戻す';});document.querySelectorAll('[data-redo]').forEach(b=>b.disabled=!sessionRedo);
   const strokes=S.past.filter(o=>o.payload.path),key=strokes.map(o=>o.id).join(',');
   if(strokeStamp!==key){$('demoStrokes').innerHTML=strokes.map(o=>`<path d="${o.payload.path}" fill="none" stroke="${esc(o.payload.color)}" stroke-width="${o.payload.width}" stroke-linecap="round" stroke-linejoin="round" opacity="${o.payload.opacity}"/>`).join('');strokeStamp=key;}
   const nextLayers=JSON.stringify(S.layers)+S.layerId;if(layerStamp!==nextLayers){renderLayers();layerStamp=nextLayers;}
  renderHistory();
 }
 function fixedButton(key,label,attrs){return `<button ${attrs} aria-label="${label}" title="${label}">${icon(key)}<span>${label}</span></button>`;}
 $('fixed').innerHTML=fixedButton('layers','Layers','data-open-panel="layers"')+fixedButton('undo','Undo','data-undo')+fixedButton('redo','Redo','data-redo')+fixedButton('flipH','左右反転','data-flip="H"')+fixedButton('flipV','上下反転','data-flip="V"');
 $('mobileTabs').innerHTML=fixedButton('undo','Undo','data-undo')+fixedButton('redo','Redo','data-redo')+fixedButton('color','色','data-open-panel="color"')+fixedButton('layers','層','data-open-panel="layers"')+fixedButton('workspace','設定','data-open-panel="workspace"');
 $('quickGrid').innerHTML=fixedButton('undo','Undo','data-undo')+fixedButton('brush','ブラシ','data-tool="brush"')+fixedButton('redo','Redo','data-redo')+fixedButton('eraser','消しゴム','data-tool="eraser"')+fixedButton('color','色','data-open-panel="color"')+fixedButton('layers','層','data-open-panel="layers"');
 renderPanels();sync();
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.feature){openFeature(b.dataset.feature,$('query').value?'search':'catalog');return;}
  if(b.dataset.category){category=b.dataset.category;$('query').value='';renderLibrary();return;}
  if(b.hasAttribute('data-back')||b.hasAttribute('data-clear')){category=null;$('query').value='';renderLibrary();return;}
  if(b.dataset.panelCategory){showCategory(b.dataset.panelCategory,b.dataset.panel);return;}
  if(b.dataset.panelBack){$('route-'+b.dataset.panelBack).innerHTML='';return;}
  if(b.dataset.detailClose){closeDetail(b.dataset.detailClose);return;}
  if(b.dataset.start){beginFeature(b.dataset.start);return;}
  if(b.hasAttribute('data-apply')){finishSession(true);return;}if(b.hasAttribute('data-cancel')){finishSession(false);return;}
  if(b.dataset.tool){setTool(b.dataset.tool);toggleRegion('quick',false);return;}
  if(b.dataset.openPanel){showPanel(b.dataset.openPanel);if(b.dataset.openPanel==='layers'&&(b.closest('#fixed')||b.closest('#mobileTabs'))){$('panels').hidden=true;$('layerPage').hidden=false;renderLayers();}toggleRegion('quick',false);return;}
  if(b.hasAttribute('data-undo')){M.undo();sync();return;}if(b.hasAttribute('data-redo')){M.redo();sync();return;}
  if(b.dataset.flip){S.view['flip'+b.dataset.flip]*=-1;updateView();return;}
  if(b.dataset.layer){M.dispatch('layer.select',{id:b.dataset.layer});sync();return;}
  if(b.dataset.eye){M.dispatch('layer.visibility',{id:b.dataset.eye});sync();return;}
  if(b.dataset.color){changeColor(b.dataset.color);return;}
  if(b.dataset.conflict){const c=b.dataset.conflict;if(c==='back'){openFeature(S.session.feature);return;}finishSession(c==='apply');toggleRegion('context',false);if(pendingTool){const t=pendingTool;pendingTool=null;setTool(t,true);}return;}
  if(b.id==='addLayer'||b.hasAttribute('data-add-layer')){M.dispatch('layer.add',{name:'レイヤー '+(S.layers.length+1)});sync();return;}
  if(b.id==='layoutDefault')resetLayout();if(b.id==='layoutFocus')toggleFocus();
 });
 document.addEventListener('input',e=>{if(e.target.dataset.value!==undefined&&S.session){M.edit(e.target.dataset.value,e.target.value);sync();}if(e.target.id==='opacity')$('opacityValue').textContent=e.target.value+'%';if(e.target.id==='colorPicker')changeColor(e.target.value);if(e.target.id==='blendMode'){M.dispatch('layer.blend',{id:S.layerId,blend:e.target.value});sync();}});
 $('query').addEventListener('input',renderLibrary);
 bind('allFeatures',()=>openLibrary(false));bind('search',()=>openLibrary(true));bind('libraryClose',closeLibrary);
 bind('quickTrigger',()=>{toggleRegion('quick');sync();});bind('quickClose',()=>toggleRegion('quick',false));
 bind('reviewToggle',()=>{toggleRegion('review');sync();});bind('reviewClose',()=>toggleRegion('review',false));
 bind('contextButton',()=>{ $('contextTitle').textContent=S.layer+'の操作';$('contextActions').innerHTML=['LAY-004','LAY-005','LAY-006','SEL-004','TRN-001','CLP-001'].map(id=>`<button data-feature="${id}">${esc(M.feature(id).name)}</button>`).join('');toggleRegion('context',true);});bind('contextClose',()=>toggleRegion('context',false));
 bind('workspaceToggle',()=>{if(frame.clientWidth<=760){$('dock').classList.toggle('sheet-open');$('workspaceToggle').setAttribute('aria-expanded',$('dock').classList.contains('sheet-open'));}else{frame.classList.toggle('closed');$('workspaceToggle').setAttribute('aria-expanded',!frame.classList.contains('closed'));}});
 bind('sheetClose',()=>{$('dock').classList.remove('sheet-open');frame.classList.remove('focus-panel-open');$('workspaceToggle').setAttribute('aria-expanded','false');$('workspaceToggle').focus();});
 bind('layerPageClose',()=>{$('layerPage').hidden=true;$('panels').hidden=false;});bind('target',()=>showPanel('layers'));bind('currentColor',()=>showPanel('color'));bind('currentTool',()=>openFeature(toolIds[S.tool],'primary'));
 function changeColor(c){$('colorPicker').value=c;$('colorCode').textContent=c.toUpperCase();$('currentColor').querySelector('span').style.background=c;}
 // Interactive SV affordance is a UI test only, not the final ICC selector.
 let svX=.61,svY=.29,svHue=170;
 function hsvColor(h,s,v){
  const k=n=>(n+h/60)%6, f=n=>v-v*s*Math.max(Math.min(k(n),4-k(n),1),0);
  return '#'+[f(5),f(3),f(1)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
 }
 function pickSV(x,y){
  svX=Math.max(0,Math.min(1,x));svY=Math.max(0,Math.min(1,y));
  const plane=document.querySelector('.color-plane');plane.style.setProperty('--pick-x',Math.round(svX*100)+'%');plane.style.setProperty('--pick-y',Math.round(svY*100)+'%');
  changeColor(hsvColor(svHue,svX,1-svY));
 }
 document.addEventListener('pointerdown',e=>{const p=e.target.closest('.color-plane');if(!p)return;const r=p.getBoundingClientRect();p.setPointerCapture(e.pointerId);pickSV((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);});
 document.addEventListener('pointermove',e=>{const p=e.target.closest('.color-plane');if(!p||!p.hasPointerCapture(e.pointerId))return;const r=p.getBoundingClientRect();pickSV((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);});
 document.addEventListener('keydown',e=>{if(!e.target.matches('.color-plane'))return;const dx=e.key==='ArrowRight'?.02:e.key==='ArrowLeft'?-.02:0,dy=e.key==='ArrowDown'?.02:e.key==='ArrowUp'?-.02:0;if(dx||dy){e.preventDefault();pickSV(svX+dx,svY+dy);}});

 for(const id of ['brushSize','sizeNumber'])$(id).addEventListener('input',()=>{const v=Math.max(1,Math.min(100,+$(id).value||1));$('brushSize').value=v;$('sizeNumber').value=v;});
 function setWidth(w){width=Math.max(288,Math.min(440,w));frame.style.setProperty('--right',width+'px');$('splitter').setAttribute('aria-valuenow',width);}
 bind('widthLess',()=>setWidth(width-16));bind('widthMore',()=>setWidth(width+16));
 let resize=null;$('splitter').addEventListener('pointerdown',e=>{resize={x:e.clientX,width};$('splitter').setPointerCapture(e.pointerId);});$('splitter').addEventListener('pointermove',e=>{if(resize)setWidth(resize.width+resize.x-e.clientX);});$('splitter').addEventListener('pointerup',()=>resize=null);$('splitter').addEventListener('pointercancel',()=>{if(resize)setWidth(resize.width);resize=null;});$('splitter').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){setWidth(width+16);e.preventDefault();}if(e.key==='ArrowRight'){setWidth(width-16);e.preventDefault();}if(e.key==='Escape'&&resize){setWidth(resize.width);resize=null;}});
 $('device').addEventListener('change',()=>{frame.dataset.device=$('device').value;toggleRegion('review',false);updateView();});
 function resetLayout(){frame.classList.remove('closed','focused');setWidth(344);$('dock').classList.remove('sheet-open');for(const p of Object.keys(R.panels))$('box-'+p).open=['layers','color','brush'].includes(p);updateView();}
 bind('resetLayout',resetLayout);function toggleFocus(){frame.classList.toggle('focused');frame.classList.remove('focus-panel-open');$('focus').setAttribute('aria-pressed',frame.classList.contains('focused'));}bind('focus',toggleFocus);
 bind('home',()=>{$('homePage').hidden=false;});for(const id of ['resume','resumeWork'])bind(id,()=>{$('homePage').hidden=true;});
 bind('newDocument',()=>{$('homePage').hidden=true;openFeature('CAN-001','primary');});bind('openDocument',()=>{$('homePage').hidden=true;openFeature('IO-001','primary');});bind('recoverDocument',()=>{$('homePage').hidden=true;openFeature('SAV-005','primary');});
 function mockSave(){saveError=false;const s=M.save();sync();toast('要求時点の模擬版を固定しました。後のUndo／描画は保存対象を変えません。');setTimeout(()=>{M.completeSave(s.id);sync();},1800);}
 bind('save',mockSave);bind('saveStatus',()=>{if(saveError){mockSave();return;}openFeature('SAV-004','primary');});bind('export',()=>openFeature('IO-002','primary'));
 bind('sessionApply',()=>finishSession(true));bind('sessionCancel',()=>finishSession(false));bind('sessionDocumentUndo',()=>{M.undo(true);sync();});bind('sessionDocumentRedo',()=>{M.redo(true);sync();});bind('sessionUndo',()=>{M.undo();if(S.session){const id=S.session.feature;const f=$('fields-'+id);if(f)f.querySelectorAll('[data-value]').forEach(i=>i.value=S.session.values[i.dataset.value]||'');}sync();});
 function mockPending(){const op=M.acceptPending();sync();toast('模擬計算中です。ナビ／Undo／保存／別層操作を試せます（人工待機3秒）。');setTimeout(()=>{M.finish(op.id);sync();},3000);}
 bind('simulatePending',mockPending);bind('simulateSaveError',()=>{saveError=true;sync();toast('保存失敗の模擬状態です。元の編集は保持。「保存失敗・再試行」から再試行できます。');});
 bind('toggleSelection',()=>{selected=!selected;$('selectionOverlay').toggleAttribute('hidden',!selected);});
 const flows={rough:['BRU-001','BRU-008','LAY-001','FIL-003','FIL-001','LAY-004','WET-001'],transform:['SEL-001','TRN-003','TRN-007','TRN-008','BRU-001'],finish:['REF-001','REF-004','FX-103','SAV-003','IO-002','IO-007']};$('flow').addEventListener('change',()=>{$('flowSteps').innerHTML=(flows[$('flow').value]||[]).map((id,n)=>`<button data-feature="${id}" style="text-align:left">${n+1}. ${esc(M.feature(id).name)}</button>`).join('');});
 function updateView(){const v=S.view;$('art').style.transform=`translate(calc(-50% + ${v.x}px),calc(-50% + ${v.y}px)) rotate(${v.angle}deg) scale(${v.zoom*v.flipH},${v.zoom*v.flipV})`;$('zoomLabel').textContent=Math.round(v.zoom*100)+'%';$('rotateView').textContent=Math.round(v.angle)+'°';}
 bind('fit',()=>{Object.assign(S.view,{x:0,y:0,zoom:1,angle:0});updateView();});bind('zoomLabel',()=>{S.view.zoom=1;updateView();});bind('zoomIn',()=>{S.view.zoom=Math.min(8,S.view.zoom*1.2);updateView();});bind('zoomOut',()=>{S.view.zoom=Math.max(.2,S.view.zoom/1.2);updateView();});bind('rotateView',()=>{S.view.angle+=15;updateView();});bind('panTool',()=>{selectionNav=!selectionNav;$('panTool').setAttribute('aria-pressed',selectionNav);});
 const pointers=new Map();let navStart=null,drawing=null;
 function touchState(){const t=[...pointers.values()].filter(p=>p.type==='touch');if(!t.length)return null;return {x:t.reduce((s,p)=>s+p.x,0)/t.length,y:t.reduce((s,p)=>s+p.y,0)/t.length,d:t.length>1?Math.hypot(t[1].x-t[0].x,t[1].y-t[0].y):1,a:t.length>1?Math.atan2(t[1].y-t[0].y,t[1].x-t[0].x):0,n:t.length};}
 function restartNav(){const t=touchState();navStart=t?{...t,view:{...S.view}}:null;}
 function anchoredNav(start,current){
  const v=start.view,r=$('surface').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const zoom=current.n>1?Math.max(.2,Math.min(8,v.zoom*current.d/start.d)):v.zoom;
  const angle=current.n>1?v.angle+(current.a-start.a)*180/Math.PI:v.angle;
  const a=v.angle*Math.PI/180,b=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
  const dx=start.x-cx-v.x,dy=start.y-cy-v.y;
  const wx=(c*dx+s*dy)/v.zoom/v.flipH,wy=(-s*dx+c*dy)/v.zoom/v.flipV;
  const rx=zoom*(cb*v.flipH*wx-sb*v.flipV*wy),ry=zoom*(sb*v.flipH*wx+cb*v.flipV*wy);
  Object.assign(S.view,{zoom,angle,x:current.x-cx-rx,y:current.y-cy-ry});
 }
 function local(e){const svg=$('art').querySelector('svg'),matrix=svg.getScreenCTM();if(!matrix)return {x:0,y:0};const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());return {x:+pt.x.toFixed(1),y:+pt.y.toFixed(1)};}
 $('surface').addEventListener('pointerdown',e=>{
  if(e.target.closest('button,input'))return;e.preventDefault();$('surface').setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,type:e.pointerType});
  if(e.pointerType==='touch'){restartNav();return;}
  if(e.shiftKey||selectionNav){drawing={type:'pan',id:e.pointerId,x:e.clientX,y:e.clientY,view:{...S.view}};return;}
  if(S.session&&S.session.layer===S.layer){conflict(S.tool);return;}
  if(['selection','transform','move','fill','eyedropper'].includes(S.tool)){if(S.tool==='eyedropper'){showPanel('color');toast('採色位置から現在色へ戻る導線の確認です。サンプル画像の採色処理は未実装。');}else openFeature(toolIds[S.tool],'primary');return;}
  const p=local(e);drawing={type:'stroke',id:e.pointerId,path:`M${p.x},${p.y}`,layer:S.layer,color:S.tool==='eraser'?'#faf6ed':$('colorPicker').value,width:+$('brushSize').value,opacity:+$('opacity').value/100};
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');for(const [k,v] of Object.entries({d:drawing.path,fill:'none',stroke:drawing.color,'stroke-width':drawing.width,'stroke-linecap':'round','stroke-linejoin':'round',opacity:drawing.opacity}))path.setAttribute(k,v);path.id='liveStroke';$('art').querySelector('svg').append(path);
 });
 $('surface').addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,type:e.pointerType});if(e.pointerType==='touch'){const t=touchState();if(t&&navStart){anchoredNav(navStart,t);updateView();}return;}
  if(drawing?.id!==e.pointerId)return;if(drawing.type==='pan'){S.view.x=drawing.view.x+e.clientX-drawing.x;S.view.y=drawing.view.y+e.clientY-drawing.y;updateView();}else{const p=local(e);drawing.path+=`L${p.x},${p.y}`;$('liveStroke')?.setAttribute('d',drawing.path);}
 });
 function pointerEnd(e){pointers.delete(e.pointerId);if(e.pointerType==='touch'){restartNav();return;}if(drawing?.id===e.pointerId){if(drawing.type==='stroke'&&e.type!=='pointercancel'){const old=S.layer;S.layer=drawing.layer;const op=M.commit('試筆（模擬）',{...drawing});S.layer=old;S.pending.push(op.id);setTimeout(()=>{M.finish(op.id);sync();},1200);}drawing=null;$('liveStroke')?.remove();sync();}}
 $('surface').addEventListener('pointerup',pointerEnd);$('surface').addEventListener('pointercancel',pointerEnd);
 document.addEventListener('keydown',e=>{const editing=e.target.matches('input,textarea,select,[contenteditable=true]');if(e.isComposing)return;if(e.key==='Escape'){if(resize){setWidth(resize.width);resize=null;return;}for(const id of ['library','quick','context','review']){if(!$(id).hidden){toggleRegion(id,false);if(id==='library')focusReturn?.focus();return;}}if(S.session){finishSession(false);return;}const active=Object.keys(activePanelFeature).find(p=>activePanelFeature[p]&&$('route-'+p)?.querySelector('.route-details'));if(active){closeDetail(active);return;}if(frame.classList.contains('focus-panel-open')){frame.classList.remove('focus-panel-open');$('dock').classList.remove('sheet-open');return;}if(frame.classList.contains('focused'))toggleFocus();else $('dock').classList.remove('sheet-open');}
  if(editing)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openLibrary(true);}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?M.redo():M.undo();sync();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();mockSave();}
 });
 updateView();
 const initial=decodeURIComponent(location.hash.slice(1));if(R.features.some(f=>f.id===initial))openFeature(initial,'related');
 window.addEventListener('hashchange',()=>{const id=decodeURIComponent(location.hash.slice(1));if(R.features.some(f=>f.id===id))openFeature(id,'related');});
})();
