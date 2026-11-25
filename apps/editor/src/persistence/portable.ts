import {CoreDocument,type CorePersistenceSnapshotV1,type EditableArtwork,type LayerId,type RevisionId} from '@illustro/core';
import {validateRecord} from '@illustro/brush-rt';
import {decodeIllustroFile,encodeIllustroFile,type DecodedPortableFile,type PortableSectionInput} from './format';
import type {ProjectionCache} from './projectionCache';
import {makeEditorState,readEditorState} from './editorState';
import type {SelectionRect} from '../strokeSelection';

const CORE_SECTION='document';
const EDITOR_SECTION='editor-state';
const CORE_TYPE='document.core.v1',BLOCK_TYPE='raster.block.v1',EDITOR_TYPE='editor.state.v2';
const PARTIAL_RASTER_TYPE='document.partial-raster.v1',PARTIAL_RASTER_SECTION='partial-raster-support';
const EDITABLE_AFFINE_TYPE='document.editable-affine.v1',EDITABLE_AFFINE_SECTION='editable-affine-support';
export const KNOWN_REQUIRED_TYPES:ReadonlySet<string>=new Set([CORE_TYPE,BLOCK_TYPE,PARTIAL_RASTER_TYPE,EDITABLE_AFFINE_TYPE]);
const textEncoder=new TextEncoder(),textDecoder=new TextDecoder('utf-8',{fatal:true});

export type PreservedPortableData=Readonly<{
  manifestExtras:Readonly<Record<string,unknown>>;
  optionalSections:readonly PortableSectionInput[];
}>;
export type PortableOpenResult=Readonly<{
  document:CoreDocument;selectedLayerId:LayerId;preserved:PreservedPortableData;
  generationId:string;snapshotRevisionId:RevisionId;projectionCache?:ProjectionCache;previewImage?:Uint8Array;
  selection?:SelectionRect|null;legacyEditorState?:Readonly<{version:0|1;notices:readonly string[]}>;
}>;

export async function createPortableDocument(input:Readonly<{
  document:CoreDocument;selectedLayerId:LayerId;revisionId?:RevisionId;preserved?:PreservedPortableData;createdAt?:number;generationId?:string;previewImage?:Uint8Array;selection?:SelectionRect|null;
}>){
  const revisionId=input.revisionId??input.document.head,snapshot=input.document.capturePersistenceSnapshot(revisionId),blocks=input.document.persistenceBlockPayloads(snapshot);
  if(!snapshot.revisions.some(r=>r.id===revisionId))throw new Error('save snapshot revision missing');
  const sections:PortableSectionInput[]=[Object.freeze({id:CORE_SECTION,type:CORE_TYPE,required:true,bytes:textEncoder.encode(JSON.stringify(snapshot))})];
  appendPortableCapabilitySections(snapshot,sections);
  for(const block of snapshot.blocks){const bytes=blocks.get(block.id as never);if(!bytes)throw new Error('save block dependency missing');sections.push(Object.freeze({id:blockSectionId(block.id),type:BLOCK_TYPE,required:true,bytes}));}
  const selected=input.document.revision(revisionId).root.hasLayer(input.selectedLayerId)?input.selectedLayerId:input.document.revision(revisionId).root.rootLayerIds[0];
  if(!selected)throw new Error('save snapshot has no selectable layer');
  sections.push(Object.freeze({id:EDITOR_SECTION,type:EDITOR_TYPE,required:false,bytes:textEncoder.encode(JSON.stringify(makeEditorState(selected,input.selection??null,input.document.revision(revisionId).root.width,input.document.revision(revisionId).root.height)))}));
  if(input.previewImage&&isPngPreview(input.previewImage))sections.push(Object.freeze({id:'render-preview',type:'render.preview.png.v1',required:false,bytes:input.previewImage.slice()}));
  for(const section of input.preserved?.optionalSections??[]){if(section.required)throw new Error('cannot preserve unknown required section');if(sections.some(x=>x.id===section.id))continue;sections.push(Object.freeze({...section,bytes:section.bytes.slice(),required:false}));}
  const generationId=input.generationId??crypto.randomUUID(),createdAt=input.createdAt??Date.now(),root=input.document.revision(revisionId).root;
  const manifestExtras=input.preserved?.manifestExtras;const bytes=await encodeIllustroFile({generationId,documentId:root.documentId,snapshotRevisionId:revisionId,createdAt,sections,...(manifestExtras?{manifestExtras}:{})});
  return Object.freeze({bytes,generationId,revisionId,snapshot,createdAt});
}

/** Shared by the portable and worker save paths. Keep mandatory capability markers in sync. */
export function appendPortableCapabilitySections(snapshot:CorePersistenceSnapshotV1,sections:PortableSectionInput[]){
  // Older applications must reject this new replay capability rather than
  // silently interpreting a partial snapshot as an entire-layer replacement.
  if(hasPartialRasterSnapshots(snapshot))sections.push(Object.freeze({id:PARTIAL_RASTER_SECTION,
    type:PARTIAL_RASTER_TYPE,required:true,bytes:Uint8Array.of(1)}));
  if(hasEditableAffine(snapshot))sections.push(Object.freeze({id:EDITABLE_AFFINE_SECTION,type:EDITABLE_AFFINE_TYPE,required:true,bytes:Uint8Array.of(1)}));
}

/** Verify the complete file through the normal semantic restore path before writing it. */
export async function encodeVerifiedPortableFile(input:Parameters<typeof encodeIllustroFile>[0]){
  const bytes=await encodeIllustroFile(input);
  await openPortableDocument(bytes);
  return bytes;
}

export async function openPortableDocument(bytes:Uint8Array):Promise<PortableOpenResult>{
  const decoded=await decodeIllustroFile(bytes,{knownRequiredTypes:KNOWN_REQUIRED_TYPES});return openDecodedPortableDocument(decoded);
}

export function openDecodedPortableDocument(decoded:DecodedPortableFile):PortableOpenResult{
  const coreSections=[...decoded.sections.values()].filter(s=>s.descriptor.type===CORE_TYPE);if(coreSections.length!==1||coreSections[0]?.descriptor.id!==CORE_SECTION)throw new Error('exactly one core document section is required');
  let rawSnapshot:unknown;try{rawSnapshot=JSON.parse(textDecoder.decode(coreSections[0].bytes));}catch{throw new Error('malformed core document section');}
  validateM05SemanticDependencies(rawSnapshot);
  const snapshot=rawSnapshot as CorePersistenceSnapshotV1;if(snapshot.snapshotRevisionId!==decoded.manifest.snapshotRevisionId)throw new Error('snapshot revision manifest mismatch');
  const partial=decoded.sections.get(PARTIAL_RASTER_SECTION);
  if(hasPartialRasterSnapshots(snapshot)&&!partial||partial&&(!partial.descriptor.required||partial.descriptor.type!==PARTIAL_RASTER_TYPE||
    partial.bytes.length!==1||partial.bytes[0]!==1))throw Error('作品の区画保存情報を確認できません。');
  const affine=decoded.sections.get(EDITABLE_AFFINE_SECTION);
  if(hasEditableAffine(snapshot)&&!affine||affine&&(!affine.descriptor.required||affine.descriptor.type!==EDITABLE_AFFINE_TYPE||affine.bytes.length!==1||affine.bytes[0]!==1))throw Error('図形と文字の変形情報を確認できません。');
  const target=(snapshot.revisions as readonly {id:string;root:{documentId:string}}[]).find(r=>r.id===snapshot.snapshotRevisionId);if(!target||target.root.documentId!==decoded.manifest.documentId)throw new Error('document identity manifest mismatch');
  const blocks=new Map<string,Uint8Array>();if(!Array.isArray(snapshot.blocks))throw new Error('invalid core block list');
  const expectedBlockSections=new Set<string>();
  for(const item of snapshot.blocks as readonly {id:string}[]){const id=blockSectionId(item.id),section=decoded.sections.get(id);if(!section||section.descriptor.type!==BLOCK_TYPE||!section.descriptor.required)throw new Error('required raster block section missing');blocks.set(item.id,section.bytes);expectedBlockSections.add(id);}
  for(const section of decoded.sections.values())if(section.descriptor.type===BLOCK_TYPE&&!expectedBlockSections.has(section.descriptor.id))throw new Error('orphan raster block section');
  const document=CoreDocument.restore({snapshot:rawSnapshot,blockPayloads:blocks});
  let selectedLayerId=document.root.rootLayerIds[0];const editor=decoded.sections.get(EDITOR_SECTION);
  let selection:SelectionRect|null=null;
  let legacyEditorState:PortableOpenResult['legacyEditorState'];
  if(editor){
    if((editor.descriptor.type!=='editor.state.v1'&&editor.descriptor.type!==EDITOR_TYPE)||editor.descriptor.required)throw new Error('invalid editor state section');
    let state:ReturnType<typeof readEditorState>;
    let extraLegacyFields:string[]=[];
    try{
      const rawState=JSON.parse(textDecoder.decode(editor.bytes));
      state=readEditorState(rawState,document.root.width,document.root.height);
      if(state.sourceVersion===1&&rawState&&typeof rawState==='object'&&!Array.isArray(rawState)){
        extraLegacyFields=Object.keys(rawState).filter(key=>key!=='version'&&key!=='selectedLayerId');
      }
    }catch(error){throw new Error('編集状態を読み込めません。'+(error instanceof Error?error.message:''));}
    if(editor.descriptor.type!==('editor.state.v'+state.sourceVersion))throw new Error('編集状態の版が一致しません。');
    if(state.selectedLayerId&&document.root.hasLayer(state.selectedLayerId as LayerId))selectedLayerId=state.selectedLayerId as LayerId;
    selection=state.selection;
    if(state.sourceVersion===1)legacyEditorState={version:1,notices:[
      '旧形式には選択範囲の保存欄がありません。保存されていない選択範囲は復元できません。',
      ...(extraLegacyFields.length?['旧形式の未対応の編集状態（'+extraLegacyFields.join('、')+'）は新形式では引き継げません。']:[]),
    ]};
  }else{
    legacyEditorState={version:0,notices:['旧形式には編集対象レイヤーと選択範囲の保存欄がありません。開いた時の描画先は先頭のレイヤーです。']};
  }
  if(!selectedLayerId)throw new Error('opened document has no selectable layer');
  const preview=decoded.sections.get('render-preview'),previewImage=preview&&preview.descriptor.type==='render.preview.png.v1'&&!preview.descriptor.required&&isPngPreview(preview.bytes)?preview.bytes.slice():undefined;
  const optionalSections:PortableSectionInput[]=[];
  for(const {descriptor,bytes:sectionBytes} of decoded.sections.values()){if(descriptor.id===CORE_SECTION||descriptor.id===EDITOR_SECTION||descriptor.type===BLOCK_TYPE||descriptor.id===EDITABLE_AFFINE_SECTION&&descriptor.type===EDITABLE_AFFINE_TYPE||descriptor.id===PARTIAL_RASTER_SECTION&&descriptor.type===PARTIAL_RASTER_TYPE||descriptor.type==='render.cache.index.v1'||descriptor.type==='render.cache.layer.v1'||descriptor.type==='render.cache.index.v2'||descriptor.type==='render.cache.tile.v2'||(descriptor.id==='render-preview'&&descriptor.type==='render.preview.png.v1'))continue;if(descriptor.required)throw new Error('unknown required section');
    optionalSections.push(Object.freeze({id:descriptor.id,type:descriptor.type,required:false,codec:descriptor.codec,bytes:sectionBytes.slice(),descriptorExtras:descriptor.extras}));}
  const preserved=Object.freeze({manifestExtras:decoded.manifest.extras,optionalSections:Object.freeze(optionalSections)});
  return Object.freeze({document,selectedLayerId,selection,preserved,generationId:decoded.manifest.generationId,snapshotRevisionId:decoded.manifest.snapshotRevisionId as RevisionId,...(legacyEditorState?{legacyEditorState}:{}),...(previewImage?{previewImage}:{})});
}

export async function verifyPortableDocument(bytes:Uint8Array){await openPortableDocument(bytes);return true;}

function hasEditableAffine(snapshot:CorePersistenceSnapshotV1){
  const transformed=(content:EditableArtwork|null|undefined):boolean=>{
    if(!content)return false;
    if(content.kind==='gradient')return typeof content.follow==='object'&&transformed(content.follow);
    return !!content.transform||content.kind==='path'&&!!content.booleanOperands&&
      (transformed(content.booleanOperands.a)||transformed(content.booleanOperands.b));
  };
  return snapshot.revisions.some(revision=>revision.root.layers.some(layer=>transformed(layer.editable)));
}

function hasPartialRasterSnapshots(snapshot:CorePersistenceSnapshotV1){
  return snapshot.revisions.some(revision=>revision.command?.operations.some(op=>op.kind==='layer.snapshot'&&op.parameters.partialRaster===true));
}

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
export function isPngPreview(bytes:Uint8Array){
  return bytes.byteLength>=24&&bytes.byteLength<=8*1024*1024&&
    [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
}
function blockSectionId(id:string){return 'block:'+id;}
