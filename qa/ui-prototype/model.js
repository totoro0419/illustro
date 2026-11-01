/* Stage III review-only state model. No raster, persistence or GPU claims. */
(function (root) {
 'use strict';
 function createModel(registry) {
  const byId=new Map(registry.features.map(f=>[f.id,f]));
  // Curated production-task language is a deterministic index, not a fuzzy guess.
  const aliases={
   '乗算':['LAY-002'],'multiply':['LAY-002'],'暗く重ねる':['LAY-002'],
   '下の色を残して暗く重ねる':['LAY-002'],
   'クリップ':['LAY-004'],'クリッピング':['LAY-004'],
   'はみ出さないように塗る':['LAY-004'],'下のレイヤーからはみ出さない':['LAY-004'],
   'マスク':['LAY-005'],'隠した部分を後から戻す':['LAY-005'],
   '透明PNG':['IO-002'],'png':['IO-002'],
   '背景を透明にして保存':['IO-002'],'背景透過で書き出す':['IO-002'],
   '左右反転':['CAN-003','TRN-001','UI-006'],'表示反転':['CAN-003'],
   '絵を裏返して確認':['CAN-003'],'作品反転':['TRN-001'],
   '選択した絵を左右反転':['TRN-001'],
   'レイヤー追加':['LAY-001'],'新しいレイヤーに描く':['LAY-001'],
   '一つ前の操作に戻す':['HIS-001'],'描いた線を取り消す':['HIS-001'],
   '色を拾う':['COL-003'],'画像の色を使う':['COL-003'],
   '線をきれいに細く終える':['BRU-008']
  };
  const state={
   tool:'brush',layer:'線画',layerId:'layer-1',panel:'layers',feature:null,
   screen:'editor',session:null,settings:{},past:[],future:[],pending:[],saves:[],
   scopedHistory:Object.fromEntries(['reference','test-pad','document-manager'].map(scope=>[scope,{entries:[],future:[],serial:0}])),
   revision:0,nextId:1,nextLayerId:4,view:{x:0,y:0,zoom:1,angle:0,flipH:1,flipV:1},
   layers:[
    {id:'layer-1',name:'線画',visible:true,blend:'通常'},
    {id:'layer-2',name:'色',visible:true,blend:'通常'},
    {id:'layer-3',name:'背景',visible:true,blend:'通常'}
   ]
  };
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function feature(id){if(!byId.has(id))throw Error('unknown feature '+id);return byId.get(id);}
  const normalize=v=>String(v).trim().toLocaleLowerCase('ja').normalize('NFKC');
  const aliasTerms=Object.entries(aliases).map(([term,ids])=>[normalize(term),ids]);
  function search(query='',category=null){
   const q=normalize(query), scores=new Map();
   for(const f of registry.features){
    if(category&&f.category!==category)continue;
    let score=0;
    if(!q)score=1;
    else if(normalize(f.id)===q)score=200;
    else if(normalize(f.name)===q)score=160;
    else if(normalize(f.name).includes(q))score=85;
    else if([f.category_label,...f.discovery].some(t=>normalize(t).includes(q)))score=25;
    for(const [term,ids] of aliasTerms){
     if(q&&ids.includes(f.id)&&(term===q||q.includes(term)||(q.length>=2&&term.includes(q))))
      score=Math.max(score,term===q?150:q.includes(term)?110:35);
    }
    if(score)scores.set(f.id,score);
   }
   return registry.features.filter(f=>scores.has(f.id)).sort((a,b)=>
    scores.get(b.id)-scores.get(a.id)||a.id.localeCompare(b.id));
  }
  function scopeEdit(scope,label){
   const h=state.scopedHistory[scope];if(!h)throw Error('unknown undo scope '+scope);
   const edit={id:++h.serial,label:String(label||scope+'操作（模擬）')};
   h.entries.push(edit);h.future=[];return edit;
  }
  function scopeUndo(scope){
   const h=state.scopedHistory[scope];if(!h)throw Error('unknown undo scope '+scope);
   if(!h.entries.length)return false;
   h.future.push(h.entries.pop());return true;
  }
  function scopeRedo(scope){
   const h=state.scopedHistory[scope];if(!h)throw Error('unknown undo scope '+scope);
   if(!h.future.length)return false;
   h.entries.push(h.future.pop());return true;
  }
  function navigate(id,entry='catalog'){
   const f=feature(id);
   if(!['catalog','search','primary','related'].includes(entry))throw Error('unknown entry');
   state.feature=id;state.panel=f.panel.slice(6);
   if(!f.availability.executable)return {type:'scope',feature:f};
   return {type:f.surface.tool?'tool':'inspect',feature:f};
  }
  function documentSnapshot(){return {layers:clone(state.layers),selectedLayerId:state.layerId};}
  function restoreDocument(s){
   state.layers=clone(s.layers);
   const active=state.layers.find(l=>l.id===state.layerId)||state.layers.find(l=>l.id===s.selectedLayerId)||state.layers[0];
   state.layerId=active.id;state.layer=active.name;
  }
  function commit(label,payload={},before=null,after=null){
   const op={id:state.nextId++,label,layer:state.layer,payload:clone(payload)};
   if(before)op.before=clone(before);
   if(after)op.after=clone(after);
   state.past.push(op);state.future=[];state.revision++;return op;
  }
  function mutate(label,callback){
   const before=documentSnapshot();callback();return commit(label,{},before,documentSnapshot());
  }
  function selectLayer(id){
   const layer=state.layers.find(l=>l.id===id);
   if(!layer)return false;
   state.layerId=layer.id;state.layer=layer.name;return true;
  }
  function addLayer(name){
   const id='layer-'+state.nextLayerId++;
   mutate('レイヤー追加（模擬）',()=>{
    state.layers.unshift({id,name:name||'レイヤー '+state.nextLayerId,visible:true,blend:'通常'});
    selectLayer(id);
   });
   return id;
  }
  function toggleVisibility(id){
   const layer=state.layers.find(l=>l.id===id);if(!layer)return false;
   mutate('レイヤー表示切替（模擬）',()=>{layer.visible=!layer.visible;});return true;
  }
  function setLayerBlend(id,blend){
   if(!['通常','乗算','スクリーン'].includes(blend))return false;
   const layer=state.layers.find(l=>l.id===id);if(!layer)return false;
   if(layer.blend===blend)return true;
   mutate('レイヤー合成変更（模擬）',()=>{layer.blend=blend;});return true;
  }
  function begin(id){
   const f=feature(id);if(!f.availability.executable||state.session)return false;
   state.session={feature:id,layer:state.layer,layerId:state.layerId,values:{},past:[],future:[]};return true;
  }
  function edit(key,value){
   if(!state.session)throw Error('no session');
   if(state.session.values[key]===value)return;
   state.session.past.push(clone(state.session.values));state.session.future=[];
   state.session.values={...state.session.values,[key]:value};
  }
  function apply(){
   if(!state.session)return false;
   const s=state.session,f=feature(s.feature);
   if(!state.layers.some(l=>l.id===s.layerId))return {status:'session-conflict',reason:'target-removed'};
   state.session=null;
   if(f.apply_cancel.kind==='session'||f.apply_cancel.kind==='stroke'){
    const previousId=state.layerId,previousName=state.layer;
    state.layerId=s.layerId;state.layer=s.layer;commit(f.name,{feature:f.id,values:s.values});
    state.layerId=previousId;state.layer=previousName;
   }else if(['preference','view'].includes(f.apply_cancel.kind)){
    state.settings[f.id]=clone(s.values);
   }else{
    /* Unknown commands and lifecycle actions must never invent an artwork revision. */
    return false;
   }
   return true;
  }
  function cancel(){state.session=null;}
  function undo(global=false){
   if(state.session&&!global){
    const s=state.session;if(!s.past.length)return false;
    s.future.push(clone(s.values));s.values=s.past.pop();return true;
   }
   if(!state.past.length)return false;
   const op=state.past.pop();state.future.push(op);
   if(op.before)restoreDocument(op.before);
   state.revision++;return true;
  }
  function redo(global=false){
   if(state.session&&!global){
    const s=state.session;if(!s.future.length)return false;
    s.past.push(clone(s.values));s.values=s.future.pop();return true;
   }
   if(!state.future.length)return false;
   const op=state.future.pop();state.past.push(op);
   if(op.after)restoreDocument(op.after);
   state.revision++;return true;
  }
  function dispatch(action,args={}){
   switch(action){
    case 'history.undo':return undo(true);
    case 'history.redo':return redo(true);
     case 'scope.edit':return scopeEdit(args.scope,args.label);
     case 'scope.undo':return scopeUndo(args.scope);
     case 'scope.redo':return scopeRedo(args.scope);
    case 'layer.add':return addLayer(args.name);
    case 'layer.select':return selectLayer(args.id);
    case 'layer.remove':{
     if(state.layers.length===1||!state.layers.some(l=>l.id===args.id))return false;
     mutate('レイヤー削除（模擬）',()=>{state.layers=state.layers.filter(l=>l.id!==args.id);if(state.layerId===args.id)selectLayer(state.layers[0].id);});return true;
    }
    case 'layer.visibility':return toggleVisibility(args.id);
    case 'layer.blend':return setLayerBlend(args.id,args.blend);
    case 'view.flipH':state.view.flipH*=-1;return true;
    case 'view.flipV':state.view.flipV*=-1;return true;
    default:return {status:'unmodeled',action};
   }
  }
  function acceptPending(label='模擬ストローク'){const op=commit(label);state.pending.push(op.id);return op;}
  function finish(id){state.pending=state.pending.filter(x=>x!==id);return state.past.some(x=>x.id===id);}
  function save(){
   const s={id:state.saves.length+1,operationIds:state.past.map(x=>x.id),
    operations:clone(state.past),revision:state.revision,document:documentSnapshot(),pendingIds:[...state.pending],status:'pending'};
   state.saves.push(s);return s;
  }
  function loadSave(id){const save=state.saves.find(s=>s.id===id);if(!save||save.status!=='mock-complete')return false;restoreDocument(save.document);state.past=clone(save.operations);state.future=[];state.session=null;state.pending=[];state.revision++;return true;}
  function newDocument(){state.layers=[{id:'layer-'+state.nextLayerId++,name:'レイヤー 1',visible:true,blend:'通常'}];selectLayer(state.layers[0].id);state.past=[];state.future=[];state.pending=[];state.session=null;state.revision++;return true;}
  function completeSave(id){const s=state.saves.find(x=>x.id===id);if(!s)throw Error('save absent');s.status='mock-complete';return s;}
  return {state,feature,search,navigate,commit,begin,edit,apply,cancel,undo,redo,dispatch,
   selectLayer,addLayer,toggleVisibility,setLayerBlend,documentSnapshot,acceptPending,finish,save,completeSave,loadSave,newDocument,scopeEdit,scopeUndo,scopeRedo};
 }
 root.createIllustroModel=createModel;
 if(typeof module!=='undefined')module.exports={createModel};
})(globalThis);
