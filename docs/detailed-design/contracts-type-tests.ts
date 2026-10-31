import type {IntentEnvelope,DocumentIntent,ViewIntent,SettingsIntent,HistoryScope} from '../product-architecture/contracts';
const base={operation:'op-01',feature:'CAN-001' as const,action:'new',origin:'panel' as const};
const withoutDocument:ViewIntent={...base,scope:'view',viewId:'home',viewPoseVersion:'0',command:'navigate'};
const setting:SettingsIntent={...base,scope:'settings',settingNamespace:'workspace',settingVersion:'1',values:{density:'comfortable'}};
declare const operation:IntentEnvelope;
function examine(i:IntentEnvelope){
 if(i.scope==='document'){
  const revision=i.basis;
  const target=i.target;
  return revision.document.id+target.target.id;
 }
 return i.action;
}
const doc:DocumentIntent={
 ...base,scope:'document',
 basis:{document:{id:'doc-1',lifetime:1},branch:'main',revision:'r1'},
 target:{document:{id:'doc-1',lifetime:1},target:{id:'layer-1',lifetime:1},component:'content'},
 reads:[],writes:[],settingsVersion:'1',coordinateContract:'v1',
 color:{space:'sRGB',depth:'8U',alpha:'premul',transfer:'sRGB',composition:'v1',rounding:'v1'}
};
const scope:HistoryScope='session';
const results:[string,string,string,string,string]=[examine(doc),examine(withoutDocument),examine(setting),examine(operation),scope];
void results;
// @ts-expect-error New/open/view action cannot claim document revision when not in document scope.
const impossible:ViewIntent={...withoutDocument,basis:doc.basis};
void impossible;

// Lifecycle requests that read an artwork must have its actual identity.
import type {LifecycleIntent,FormalResult} from '../product-architecture/contracts';
const start:LifecycleIntent={...base,scope:'lifecycle',request:'new'};
const save:LifecycleIntent={...base,scope:'lifecycle',request:'save',context:{id:'d',lifetime:1}};
// @ts-expect-error No dummy/missing artwork on Save.
const missingSave:LifecycleIntent={...base,scope:'lifecycle',request:'save'};
// @ts-expect-error Trash targets an asset, not an optional artwork.
const missingAsset:LifecycleIntent={...base,scope:'lifecycle',request:'trash'};
void [start,save,missingSave,missingAsset];
