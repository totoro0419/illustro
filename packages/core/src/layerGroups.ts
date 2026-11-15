import type {LayerId} from './ids';

export type LayerGroup = Readonly<{
  id: LayerId;
  name: string;
  members: readonly LayerId[];
  visible: boolean;
  locked: boolean;
}>;

export const EMPTY_LAYER_GROUPS:readonly LayerGroup[]=Object.freeze([]);

export function validateLayerGroups(groups:readonly LayerGroup[],order:readonly LayerId[]){
  if(!groups.length)return EMPTY_LAYER_GROUPS;
  const positions=new Map(order.map((id,index)=>[id,index]));
  const seen=new Set<LayerId>();
  const ranges=groups.map(group=>{
    if(seen.has(group.id)||positions.has(group.id)||!group.name.trim()||group.name.length>4096||!group.members.length)throw new Error('invalid layer group');
    seen.add(group.id);
    const members=new Set(group.members);
    let low=order.length,high=-1;
    for(const member of members){
      const index=positions.get(member);
      if(index===undefined)throw new Error('missing group member');
      low=Math.min(low,index);high=Math.max(high,index);
    }
    if(members.size!==group.members.length||high-low+1!==members.size)throw new Error('group members must stay together');
    return {low,high,group};
  }).sort((a,b)=>a.low-b.low||b.high-a.high);
  const parents:typeof ranges=[];
  for(const range of ranges){
    while(parents.length&&parents.at(-1)!.high<range.low)parents.pop();
    const parent=parents.at(-1);
    if(parent&&range.high>parent.high)throw new Error('overlapping layer groups');
    parents.push(range);
  }
  return Object.freeze(ranges.map(({group})=>Object.freeze({...group,members:Object.freeze([...group.members])})));
}


const memberIndex=new WeakMap<readonly LayerGroup[],ReadonlyMap<LayerId,readonly LayerGroup[]>>();
const NO_MEMBERSHIPS:readonly LayerGroup[]=Object.freeze([]);

export function groupsForLayer(groups:readonly LayerGroup[],id:LayerId):readonly LayerGroup[]{
  if(!groups.length)return NO_MEMBERSHIPS;
  let index=memberIndex.get(groups);
  if(!index){
    const next=new Map<LayerId,LayerGroup[]>();
    for(const group of groups){
      for(const member of group.members){
        const existing=next.get(member);
        if(existing)existing.push(group);
        else next.set(member,[group]);
      }
    }
    for(const memberships of next.values())Object.freeze(memberships);
    index=next;
    memberIndex.set(groups,index);
  }
  return index.get(id)??NO_MEMBERSHIPS;
}
