(function (root) {
  'use strict';
  function createModel(registry) {
    const byId = new Map(registry.features.map(f => [f.id, f]));
    const state = { tool:'brush', layer:'線画', panel:'layers', feature:null, screen:'editor', session:null,
      settings:{}, past:[], future:[], pending:[], saves:[], revision:0, nextId:1, view:{x:0,y:0,zoom:1,angle:0,flipH:1,flipV:1} };
    function feature(id) { if(!byId.has(id)) throw Error('unknown feature '+id); return byId.get(id); }
    function search(query='', category=null) {
      const q=query.trim().toLocaleLowerCase('ja').normalize('NFKC');
      return registry.features.filter(f => (!category || f.category===category) && (!q || [f.id,f.name,f.category_label,...f.discovery].join(' ').toLocaleLowerCase('ja').normalize('NFKC').includes(q)))
        .sort((a,b)=>Number(b.id.toLowerCase()===q)-Number(a.id.toLowerCase()===q));
    }
    function navigate(id, entry='catalog') {
      const f=feature(id);
      if(!['catalog','search','primary','related'].includes(entry)) throw Error('unknown entry');
      state.feature=id;state.panel=f.panel.slice(6);
      if(!f.availability.executable) return {type:'scope',feature:f};
      return {type:f.surface.tool?'tool':'inspect',feature:f};
    }
    function commit(label, payload={}) {
      const op={id:state.nextId++,label,layer:state.layer,payload};
      state.past.push(op);state.future=[];state.revision++;
      return op;
    }
    function begin(id) {
      const f=feature(id);
      if(!f.availability.executable) return false;
      state.session={feature:id,layer:state.layer,values:{},past:[],future:[]};return true;
    }
    function edit(key,value) {
      if(!state.session)throw Error('no session');
      state.session.past.push({...state.session.values});state.session.future=[];
      state.session.values={...state.session.values,[key]:value};
    }
    function apply() {
      if(!state.session) return false;
      const s=state.session,f=feature(s.feature);state.session=null;
      if(['session','command','stroke'].includes(f.apply_cancel.kind)) {const old=state.layer;state.layer=s.layer;commit(f.name,{feature:f.id,values:s.values});state.layer=old;}
      else state.settings[f.id]={...s.values};
      return true;
    }
    function cancel(){state.session=null;}
    function undo(global=false){
      if(state.session && !global){const s=state.session;if(!s.past.length)return false;s.future.push({...s.values});s.values=s.past.pop();return true;}
      if(!state.past.length)return false;state.future.push(state.past.pop());state.revision++;return true;
    }
    function redo(global=false){
      if(state.session&&!global){const s=state.session;if(!s.future.length)return false;s.past.push({...s.values});s.values=s.future.pop();return true;}
      if(!state.future.length)return false;state.past.push(state.future.pop());state.revision++;return true;
    }
    function acceptPending(label='模擬ストローク'){const op=commit(label);state.pending.push(op.id);return op;}
    function finish(id){state.pending=state.pending.filter(x=>x!==id);return state.past.some(x=>x.id===id);}
    function save(){const s={id:state.saves.length+1,operationIds:state.past.map(x=>x.id),revision:state.revision,pendingIds:[...state.pending],status:'pending'};state.saves.push(s);return s;}
    function completeSave(id){const s=state.saves.find(x=>x.id===id);if(!s)throw Error('save absent');s.status='mock-complete';return s;}
    return {state,feature,search,navigate,commit,begin,edit,apply,cancel,undo,redo,acceptPending,finish,save,completeSave};
  }
  root.createIllustroModel=createModel;
  if(typeof module!=='undefined') module.exports={createModel};
})(globalThis);
