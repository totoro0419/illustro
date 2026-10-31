/* Stage III review-only state model. No raster, persistence or GPU claims. */
(function (root) {
 'use strict';
 function createModel(registry) {
  const byId=new Map(registry.features.map(f=>[f.id,f]));
  const aliases={
   '乗算':['LAY-002'], 'multiply':['LAY-002'], 'クリップ':['LAY-004'],
   'クリッピング':['LAY-004'], '透明PNG':['IO-002'], 'png':['IO-002'],
   '左右反転':['CAN-003','TRN-001','UI-006'], '表示反転':['CAN-003'],
   '作品反転':['TRN-001'], 'レイヤー追加':['LAY-001']
  };
  const state={
   tool:'brush',layer:'線画',layerId:'layer-1',panel:'layers',feature:null,
   screen:'editor',session:null,settings:{},past:[],future:[],pending:[],saves:[],
   revision:0,nextId:1,nextLayerId:4,view:{x:0,y:0,zoom:1,angle:0,flipH:1,flipV:1},
   layers:[
    {id:'layer-1',name:'線画',visible:true,blend:'通常'},
    {id:'layer-2',name:'色',visible:true,blend:'通常'},
    {id:'layer-3',name:'背景',visible:true,blend:'通常'}
   ]
  };
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function feature(id){if(!byId.has(id))throw Error('unknown feature '+id);return byId.get(id);}
  function search(query='',category=null){
   const q=query.trim().toLocaleLowerCase('ja').normalize('NFKC');
   const extra=new Set(Object.entries(aliases).filter(([term])=>term.toLocaleLowerCase('ja').normalize('NFKC').includes(q)&&q).flatMap(([,ids])=>ids));
   return registry.features.filter(f=>(!category||f.category===category)&&(!q||[f.id,f.name,f.category_label,...f.discovery].join(' ').toLocaleLowerCase('ja').normalize('NFKC').includes(q)||extra.has(f.id)))
    .sort((a,b)=>Number(b.id.toLowerCase()===q)-Number(a.id.toLowerCase()===q));
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
   const f=feature(id);if(!f.availability.executable)return false;
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
   const s=state.session,f=feature(s.feature);state.session=null;
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
    case 'layer.add':return addLayer(args.name);
    case 'layer.select':return selectLayer(args.id);
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
    revision:state.revision,document:documentSnapshot(),pendingIds:[...state.pending],status:'pending'};
   state.saves.push(s);return s;
  }
  function completeSave(id){const s=state.saves.find(x=>x.id===id);if(!s)throw Error('save absent');s.status='mock-complete';return s;}
  return {state,feature,search,navigate,commit,begin,edit,apply,cancel,undo,redo,dispatch,
   selectLayer,addLayer,toggleVisibility,setLayerBlend,documentSnapshot,acceptPending,finish,save,completeSave};
 }
 root.createIllustroModel=createModel;
 if(typeof module!=='undefined')module.exports={createModel};
})(globalThis);
