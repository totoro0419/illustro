import type {FoundationPreset} from '@illustro/brush-rt';
import {addSimpleMapping,changeSimpleMapping,isSimpleMapping,removeSimpleMapping,simpleSources,simpleTargets,type SimpleSource,type SimpleTarget} from './brushDynamics';

type Hooks={
 getPreset:()=>FoundationPreset|null;
 edit:(change:(draft:FoundationPreset)=>void)=>boolean;
 message:(value:string)=>void;
};
const sourceLabel:Record<SimpleSource,string>={pressure:'筆圧',velocity:'ペンの速さ',tilt:'ペンの傾き'};
const targetLabel:Record<SimpleTarget,string>={size:'太さ',opacity:'濃さ',flow:'塗りの量'};
const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T|null;

export function installBrushDynamicsEditor(hooks:Hooks):{sync:(p:FoundationPreset)=>void}{
 const list=byId<HTMLDivElement>('brushDynamicsList');
 const addSource=byId<HTMLSelectElement>('brushDynamicsSource');
 const addTarget=byId<HTMLSelectElement>('brushDynamicsTarget');
 const apply=(change:(p:FoundationPreset)=>FoundationPreset)=>{
  const current=hooks.getPreset();if(!current)return;
  if(!hooks.edit(draft=>{
    const next=change(draft);
    Object.assign(draft,next);
  })){const p=hooks.getPreset();if(p)sync(p);}
 };
 byId<HTMLButtonElement>('brushDynamicsAdd')?.addEventListener('click',()=>{
  const source=addSource?.value as SimpleSource,target=addTarget?.value as SimpleTarget;
  apply(p=>addSimpleMapping(p,source,target));
 });
 function sync(p:FoundationPreset){
  if(!list)return;
  list.replaceChildren();
  const hint=document.createElement('p');
  hint.textContent=p.forceFade?.enabled?'強制入り抜き中は太さの変化が最終形状に反映されない場合があります。':'複数の設定は上から順番に適用されます。';
  list.append(hint);
  for(const [index,m] of p.dynamics.entries()){
   const row=document.createElement('div');row.className='brush-dynamics-row';
   if(!isSimpleMapping(m)){
    row.textContent='詳細設定 '+(index+1)+'：現在の設定を保持します（この画面では編集できません）。';
    list.append(row);continue;
   }
   const select=(values:readonly string[],labels:Record<string,string>,selected:string,aria:string,field:'source'|'target')=>{
    const node=document.createElement('select');node.setAttribute('aria-label',aria);
    node.replaceChildren(...values.map(value=>new Option(labels[value]??value,value)));
    node.value=selected;
    node.addEventListener('change',()=>apply(p=>changeSimpleMapping(p,index,{[field]:node.value})));
    return node;
   };
   const source=select(simpleSources,sourceLabel,m.source,'反応する入力 '+(index+1),'source');
   const target=select(simpleTargets,targetLabel,m.target,'変化するもの '+(index+1),'target');
   row.append(source,target);
   for(const [field,label] of [['min','最小'],['max','最大']] as const){
    const wrapper=document.createElement('label');wrapper.textContent=label+' ';
    const input=document.createElement('input');input.type='number';input.min='0';input.max='100';input.step='1';
    input.value=String(Math.round(m[field]*100));input.setAttribute('aria-label',label+'の反応 '+(index+1));
    input.addEventListener('change',()=>{
     const v=Number(input.value);
     if(!input.value||!Number.isFinite(v)||v<0||v>100){hooks.message('0〜100%で指定してください');sync(hooks.getPreset()??p);return;}
     apply(p=>changeSimpleMapping(p,index,{[field]:v/100}));
    });
    wrapper.append(input,'%');row.append(wrapper);
   }
   const remove=document.createElement('button');remove.type='button';remove.textContent='削除';
   remove.setAttribute('aria-label','反応設定 '+(index+1)+' を削除');
   remove.addEventListener('click',()=>apply(p=>removeSimpleMapping(p,index)));
   row.append(remove);list.append(row);
  }
  const add=byId<HTMLButtonElement>('brushDynamicsAdd');if(add)add.disabled=p.dynamics.length>=16;
 }
 return {sync};
}
