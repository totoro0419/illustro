import {CoreDocument,type CorePersistenceSnapshotV1,type LayerId,type RevisionId} from '@illustro/core';
import {validateRecord} from '@illustro/brush-rt';
import {decodeIllustroFile,encodeIllustroFile,type DecodedPortableFile,type PortableSectionInput} from './format';

const CORE_SECTION='document';
const EDITOR_SECTION='editor-state';
const CORE_TYPE='document.core.v1',BLOCK_TYPE='raster.block.v1',EDITOR_TYPE='editor.state.v1';
const KNOWN_REQUIRED_TYPES=new Set([CORE_TYPE,BLOCK_TYPE]);
const textEncoder=new TextEncoder(),textDecoder=new TextDecoder('utf-8',{fatal:true});

export type PreservedPortableData=Readonly<{
  manifestExtras:Readonly<Record<string,unknown>>;
  optionalSections:readonly PortableSectionInput[];
}>;
export type PortableOpenResult=Readonly<{
  document:CoreDocument;selectedLayerId:LayerId;preserved:PreservedPortableData;
  generationId:string;snapshotRevisionId:RevisionId;
}>;

export async function createPortableDocument(input:Readonly<{
  document:CoreDocument;selectedLayerId:LayerId;revisionId?:RevisionId;preserved?:PreservedPortableData;createdAt?:number;generationId?:string;
}>){
  const revisionId=input.revisionId??input.document.head,snapshot=input.document.capturePersistenceSnapshot(revisionId),blocks=input.document.persistenceBlockPayloads(snapshot);
  if(!snapshot.revisions.some(r=>r.id===revisionId))throw new Error('save snapshot revision missing');
  const sections:PortableSectionInput[]=[Object.freeze({id:CORE_SECTION,type:CORE_TYPE,required:true,bytes:textEncoder.encode(JSON.stringify(snapshot))})];
  for(const block of snapshot.blocks){const bytes=blocks.get(block.id as never);if(!bytes)throw new Error('save block dependency missing');sections.push(Object.freeze({id:blockSectionId(block.id),type:BLOCK_TYPE,required:true,bytes}));}
  const selected=input.document.revision(revisionId).root.hasLayer(input.selectedLayerId)?input.selectedLayerId:input.document.revision(revisionId).root.rootLayerIds[0];
  if(!selected)throw new Error('save snapshot has no selectable layer');
  sections.push(Object.freeze({id:EDITOR_SECTION,type:EDITOR_TYPE,required:false,bytes:textEncoder.encode(JSON.stringify({version:1,selectedLayerId:selected}))}));
  for(const section of input.preserved?.optionalSections??[]){if(section.required)throw new Error('cannot preserve unknown required section');if(sections.some(x=>x.id===section.id))continue;sections.push(Object.freeze({...section,bytes:section.bytes.slice(),required:false}));}
  const generationId=input.generationId??crypto.randomUUID(),createdAt=input.createdAt??Date.now(),root=input.document.revision(revisionId).root;
  const bytes=await encodeIllustroFile({generationId,documentId:root.documentId,snapshotRevisionId:revisionId,createdAt,sections,manifestExtras:input.preserved?.manifestExtras});
  return Object.freeze({bytes,generationId,revisionId,snapshot,createdAt});
}

export async function openPortableDocument(bytes:Uint8Array):Promise<PortableOpenResult>{
  const decoded=await decodeIllustroFile(bytes,{knownRequiredTypes:KNOWN_REQUIRED_TYPES});
  const coreSections=[...decoded.sections.values()].filter(s=>s.descriptor.type===CORE_TYPE);if(coreSections.length!==1||coreSections[0]?.descriptor.id!==CORE_SECTION)throw new Error('exactly one core document section is required');
  let rawSnapshot:unknown;try{rawSnapshot=JSON.parse(textDecoder.decode(coreSections[0].bytes));}catch{throw new Error('malformed core document section');}
  validateM05SemanticDependencies(rawSnapshot);
  const snapshot=rawSnapshot as CorePersistenceSnapshotV1;if(snapshot.snapshotRevisionId!==decoded.manifest.snapshotRevisionId)throw new Error('snapshot revision manifest mismatch');
  const target=(snapshot.revisions as readonly {id:string;root:{documentId:string}}[]).find(r=>r.id===snapshot.snapshotRevisionId);if(!target||target.root.documentId!==decoded.manifest.documentId)throw new Error('document identity manifest mismatch');
  const blocks=new Map<string,Uint8Array>();if(!Array.isArray(snapshot.blocks))throw new Error('invalid core block list');
  const expectedBlockSections=new Set<string>();
  for(const item of snapshot.blocks as readonly {id:string}[]){const id=blockSectionId(item.id),section=decoded.sections.get(id);if(!section||section.descriptor.type!==BLOCK_TYPE||!section.descriptor.required)throw new Error('required raster block section missing');blocks.set(item.id,section.bytes);expectedBlockSections.add(id);}
  for(const section of decoded.sections.values())if(section.descriptor.type===BLOCK_TYPE&&!expectedBlockSections.has(section.descriptor.id))throw new Error('orphan raster block section');
  const document=CoreDocument.restore({snapshot:rawSnapshot,blockPayloads:blocks});
  let selectedLayerId=document.root.rootLayerIds[0];const editor=decoded.sections.get(EDITOR_SECTION);
  if(editor){if(editor.descriptor.type!==EDITOR_TYPE||editor.descriptor.required)throw new Error('invalid editor state section');try{const state=JSON.parse(textDecoder.decode(editor.bytes)) as {version?:unknown;selectedLayerId?:unknown};if(state.version===1&&typeof state.selectedLayerId==='string'&&document.root.hasLayer(state.selectedLayerId as LayerId))selectedLayerId=state.selectedLayerId as LayerId;}catch{throw new Error('malformed editor state section');}}
  if(!selectedLayerId)throw new Error('opened document has no selectable layer');
  const optionalSections:PortableSectionInput[]=[];
  for(const {descriptor,bytes:sectionBytes} of decoded.sections.values()){if(descriptor.id===CORE_SECTION||descriptor.id===EDITOR_SECTION||descriptor.type===BLOCK_TYPE)continue;if(descriptor.required)throw new Error('unknown required section');
    optionalSections.push(Object.freeze({id:descriptor.id,type:descriptor.type,required:false,codec:descriptor.codec,bytes:sectionBytes.slice(),descriptorExtras:descriptor.extras}));}
  const preserved=Object.freeze({manifestExtras:decoded.manifest.extras,optionalSections:Object.freeze(optionalSections)});
  return Object.freeze({document,selectedLayerId,preserved,generationId:decoded.manifest.generationId,snapshotRevisionId:decoded.manifest.snapshotRevisionId as RevisionId});
}

export async function verifyPortableDocument(bytes:Uint8Array){await openPortableDocument(bytes);return true;}

function validateM05SemanticDependencies(value:unknown){
  if(!value||typeof value!=='object')throw new Error('invalid core snapshot');const snapshot=value as {revisions?:unknown};if(!Array.isArray(snapshot.revisions))throw new Error('invalid core revisions');
  for(const revisionValue of snapshot.revisions){if(!revisionValue||typeof revisionValue!=='object')throw new Error('invalid core revision');const command=(revisionValue as {command?:unknown}).command;if(command===null||command===undefined)continue;
    if(!command||typeof command!=='object'||!Array.isArray((command as {operations?:unknown}).operations))throw new Error('invalid persisted command');
    for(const operationValue of (command as {operations:unknown[]}).operations){if(!operationValue||typeof operationValue!=='object')throw new Error('invalid persisted operation');const operation=operationValue as {kind?:unknown;parameters?:unknown;algorithmVersionRefs?:unknown};
      if(operation.kind!=='brush.stroke')continue;const parameters=operation.parameters;if(!parameters||typeof parameters!=='object')throw new Error('brush dependency payload missing');const record=(parameters as {strokeRecord?:unknown}).strokeRecord,validated=validateRecord(record);
      const refs=operation.algorithmVersionRefs;if(!Array.isArray(refs)||refs.some(x=>typeof x!=='string'))throw new Error('brush algorithm dependency list invalid');
      const required=[`engine:${validated.engine}`,`reconstruction:${validated.smoothing}`,`prng:${validated.random}`,`stroke-schema:${validated.version}`];
      for(const item of required)if(!refs.includes(item))throw new Error('brush algorithm dependency missing: '+item);
    }
  }
}
function blockSectionId(id:string){return 'block:'+id;}
