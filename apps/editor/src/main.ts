import {openBatchExport} from './export/batchExport';
import {installTimeline} from './recording/timeline';
import {installWorkTime} from './recording/workTime';
import {installRasterEffects} from './effects/rasterPanel';
import {readEffectSteps} from './effects/rasterSettings';
import {validateLayerMask} from '@illustro/core';
import {installPassiveTouchProbe} from './passiveTouchProbe';
import {installInputFreezeTrace} from './inputFreezeTrace';
import {HistoryNavigation,type HistoryDirection} from './historyNavigation';
import {getWork,namedSnapshot,type WorkEntry,listWorks as listLocalWorks,updateWorkCatalog as updateLocalCatalog} from './persistence/workLibrary';
import './style.css';
import './ui/shell.css';
import './ui/aurora.css';
import './ui/home.css';
import {installHomeShell,type HomeShell} from './ui/homeShell';
import {appChoose,appConfirm,appPrompt} from './ui/appDialogs';
import './color/color.css';
import './color/harmony.css';
import {ForegroundColor,rgb,hex,fromHex,DOCUMENT_PALETTE_SECTION} from './color/model';
import {installColorPanel} from './color/panel';
import {installEyedropperSettings,sampleSourceLabel} from './color/eyedropperSettings';
import {getAsset,addAsset} from './assets/library';
import {installAssetPanel} from './assets/assetPanel';
import {readBrushMaterial,withBrushMaterial,type BrushMaterialKind} from './assets/brushMaterial';
import {installReferenceBoard,referenceUnavailableSection,type ReferenceBoardService} from './assets/referenceBoard';
import {copyReferenceBoard} from './assets/referenceBoardStore';
import {exportFonts,importFonts} from './artwork/fontAttachments';
import {installTextPanel} from './artwork/textPanel';
import {textFontAssetIds} from './artwork/textStyles';
import {installVectorPanel} from './artwork/vectorPanel';
import {installArtworkPresets} from './artwork/presets';
import {installRulerPanel} from './artwork/ruler';
import {installSymmetryPanel} from './artwork/symmetryPanel';
import {DEFAULT_SYMMETRY,normalizeSymmetry,SYMMETRY_SECTION,SYMMETRY_TYPE,type SymmetrySettings} from './strokeSymmetry';
import {installShapeGradientPanel} from './artwork/shapeGradient';
import {extractGradientMapCrop,installGradientMapPanel} from './artwork/gradientMap';
import {installStrokeCorrection} from './artwork/strokeCorrection';
import {layerMaskCoverage} from '@illustro/brush-rt';
import {runArtwork} from './artwork/run';
import {snapArtworkPathToGuide} from './artwork/guidedPath';
import {validatedBooleanSourceVisibility} from './artwork/booleanSourceVisibility';
import {saveArtworkSnapshot} from './artwork/saveSnapshot';
import {linkedBooleanUpdates} from './artwork/linkedBooleans';
import type {EditablePath,EditableArtwork} from '@illustro/core';
import {selectionAsLayerMask} from './artwork/selectionMask';
import {selectionCanCreateMask,explicitSaveStatus,maskApplyAllowed} from './artwork/c03UiGuards';
import type {ArtworkActions} from './artwork/tools';
import {fillLayerName,installFillPanel} from './fill/panel';
import {readFillReference} from './fill/reference';
import {installTransformPanel} from './transform/panel';
import {transformPreviewReplacementOpacity} from './transform/previewReplacement';
import {installLayoutPanel} from './transform/layoutPanel';
import {groupTransformPlan,composeGroupAffine,editableGroupTransform} from './transform/groupTransform';
import {layerEditingStates,layerEditingTargets} from './transform/layerEditingStates';
import {installImageLinkPanel} from './transform/imageLinkPanel';
import {chooseLinkedImage,decodeLinkedImage,placedImage,readLinkedFile,rememberImageHandle,forgetImageHandle,nextLinkedImageFileKey} from './assets/linkedImages';
import type {SnapMark} from './transform/layout';
import {runTransform} from './transform/run';
import {replayBrushPasses} from './selection/brush';
import {digestLayerMask,readSelectionMask,transformLinkedMask} from './transform/mask';
import {cornerMode,initialTransform,meshMode,type Transform} from './transform/geometry';
import {alphaBounds} from './transform/quadrilateral';
import {boundsOfSelection} from './selection/mask';
import type {LayerDeformation} from '@illustro/core';
import {ArtworkClipboard} from './selection/clipboard';
import {installClipboardPanel,type ClipboardUI} from './selection/clipboardPanel';
import {installSelectionWorkbench,type SelectionWorkbench} from './selection/panel';
import {installImageDropRouting} from './selection/dropImport';
import './ui/c06.css';
import './ui/c05.css';
import {shellMarkup} from './ui/shell';
import {icon} from './ui/icons';
import {sliderSize,syncBrushSize} from './ui/brushSizeControl';
import {LayerThumbnailList} from './ui/layerThumbnailList';
import {bindLayerReorder} from './ui/layerReorder';
import {installShellUi} from './ui/shellBehavior';
import {installBrushCatalogView} from './ui/brushCatalogView';
import {installWorkspaceControls} from './ui/workspaceControls';
import {installCommandPalette} from './ui/commandPalette';
import {installSimpleMacros} from './ui/simpleMacros';
import {installWorkspaceProfiles} from './ui/workspaceProfiles';
import {installFloatingPanels} from './ui/floatingPanels';
import {installInputDeviceProfiles,readPointerRoles} from './ui/inputDeviceProfiles';
import {installEditorHelp} from './ui/help';
import {installGestureShortcuts} from './ui/gestureShortcuts';
import {installToolbarSettings} from './ui/toolbarSettings';
import {installShortcutSettings} from './ui/shortcutSettings';
import {installFocusMode} from './ui/focusMode';
import './ui/c04.css';
import './ui/workspaceProfiles.css';
import './ui/floatingPanels.css';
import {EditorController,type EditorHistoryChange} from './controller';
import {BrushSurface} from './brushSurface';
import {layerBlendNames,openLayerBlendDialog} from './ui/layerBlendDialog';
import {createHistoryComparison,historyThumbnail,historyComparisonPreview} from './ui/artworkHistoryView';
import {layerListSignature} from './ui/layerListSignature';
import {drawMaskPreview,paintPixelMask,type MaskStrokePoint} from './layerMaskEditing';
import {restoreHistoryPixels} from './historyBrush';
import {penEraserInput} from './stylusButtons';
import {parseSavedCanvasView,type Point} from './canvasView';
import {DEFAULT_GUIDE_SETTINGS,normalizeGuideSettings,type GuideSettings} from './strokeGuide';
import {BrushPresetLibrary} from './brushPresets';
import {readWorkBrushSettings,saveWorkBrushSettings} from './workBrushSettings';
import {additionalBrushes} from './brushStarterPresets';
import {installBrushDynamicsEditor} from './brushDynamicsEditor';
import {filterBrushCatalog,type BrushCatalogGroup} from './brushCatalog';
import {BrushUsage} from './brushUsage';
import {installBrushAdvancedEditor} from './brushAdvancedEditor';
import {sameEditableBrush} from './brushEditorModel';
import './ui/brushEditor.css';
import {compilePreset,layerMaskTile,TILE,type FoundationPreset} from '@illustro/brush-rt';
import {changeCanvasBounds,cropCanvas,shiftedForAnchor,resizeImagePixels,resizeImageRegion,type ImageResample} from './canvasGeometry';
import {captureExport,compositeLayer,encodePng,exportImage,exportFileName,renderFrozenArtwork,renderFrozenArtworkTiledPreview,type FrozenExport,type ImageFormat,type ImageExportOptions,type ImageExportResult} from './export/basicExport';
import {ExternalFileConflict,PersistenceCoordinator,type Candidate,type PersistenceState} from './persistence/coordinator';
import type {PortableOpenResult} from './persistence/portable';
import {convertLegacyStrokeFile,isLegacyStrokeFile,legacySourcePreview} from './persistence/openLegacy';
import {fingerprintRenderedPixels,sameRenderedPixels,type VisualFingerprint} from './persistence/visualIntegrity';
import {storeCreationTemplate,resolveDocumentDimensions} from './documentSetup';
import {CoreDocument,LAYER_BLEND_MODES,LAYER_COLOR_TAGS,type LayerBlendMode,parseLayerColorTag,validateEditableArtwork,moveEditableArtwork,transformLayerMask,type LayerColorTag,type LayerComp,type LayerGroup,type RevisionId,type SemanticOperation,type LayerMask,type LayerImageLink,type LayerId} from '@illustro/core';

const perfMode=new URLSearchParams(location.search).has('perf')||location.pathname.includes('/qa/perf-canvas/')||location.pathname.includes('/qa/perf-stroke-handoff/')||location.pathname.includes('/qa/perf-undo/')||location.pathname.includes('/qa/perf-mobile4000/')||location.pathname.includes('/qa/perf-thin-stroke4000/');
const qaPath=location.pathname.replace(/\/+$/,'');
const m09Mode=new URLSearchParams(location.search).has('m09')||qaPath.endsWith('/qa/m09')||qaPath.endsWith('/qa/m09/index.html');
const m08Mode=m09Mode||new URLSearchParams(location.search).has('m08')||qaPath.endsWith('/qa/m08')||qaPath.endsWith('/qa/m08/index.html');
const qaMode=new URLSearchParams(location.search).get('qa')==='1'||qaPath.endsWith('/qa/m05')||qaPath.endsWith('/qa/m05/index.html')||qaPath.endsWith('/qa/m06')||qaPath.endsWith('/qa/m06/index.html')||qaPath.endsWith('/qa/m07')||qaPath.endsWith('/qa/m07/index.html')||m08Mode;
const qaStartedAt=new Date().toISOString();
// Focused startup timings, accessible in ?perf=1 without a busy-loop profiler.
// They distinguish the real editing-ready state from merely displaying white.
function measureCanvasStage(stage:string,started:number){
 if(perfMode)performance.measure('illustro-canvas:'+stage,{start:started,end:performance.now()});
}
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=shellMarkup(qaMode,qaMode?(m09Mode?qaM09Markup():m08Mode?qaM08Markup():qaMarkup()):'');
const contextBar=document.createElement('div');
contextBar.id='c04ContextBar';contextBar.setAttribute('role','group');contextBar.setAttribute('aria-label','今の操作対象');
for(const [id,label] of [['c04ContextTool','ブラシ'],['c04ContextLayer','描画先'],['c04ContextReference','採色元'],['c04ContextSelection','選択なし']] as const){
  const button=document.createElement('button');button.id=id;button.type='button';button.textContent=label;button.disabled=true;contextBar.append(button);
}
const contextPending=document.createElement('output');contextPending.id='c04ContextPending';contextPending.setAttribute('role','status');
contextBar.append(contextPending);document.querySelector('.canvas-view-strip')?.append(contextBar);
// Read-only TouchEvent/PointerEvent logger in opt-in QA builds. No gesture changes.
installPassiveTouchProbe();
// Opt-in physical-device trace; registers capture before editor input handlers.
const inputFreezeTrace=installInputFreezeTrace();
// In M08 the GPU canvas is the entire interaction viewport, not a fixed paper rectangle.
if(m08Mode)document.body.classList.add('m08-canvas-viewport');
if(m08Mode||!qaMode)document.body.classList.add('canvas-viewport');

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let controller=EditorController.restored(new CoreDocument({width:512,height:384,name:'新しい作品',dpi:72}));
const foreground=new ForegroundColor();
const brushPresets=new BrushPresetLibrary();
const brushUsage=new BrushUsage();
let builtInBrushes:FoundationPreset[]=[];
const workBrushDrafts=new Map<string,Map<string,FoundationPreset>>();
let brushDrafts=new Map<string,FoundationPreset>();
let temporaryEraserReturn:string|null=null;
let temporaryEraserRestoreRequested=false;
let advancedBrushEditor:ReturnType<typeof installBrushAdvancedEditor>|null=null;
let dynamicsEditor:ReturnType<typeof installBrushDynamicsEditor>|null=null;
let eyedropperOriginal=foreground.current;
let historyNavigation:HistoryNavigation|undefined;
const admittedHistoryChanges:EditorHistoryChange[]=[];
const historyInputs:Array<{at:number;eventAt:number;button:string;direction:string;phase:string;pointerType:string;disabled:boolean;reason?:string}>=[];
function traceHistoryInput(button:HTMLButtonElement,direction:HistoryDirection,phase:string,event:Event,reason?:string){if(!perfMode)return;historyInputs.push({at:performance.now(),eventAt:event.timeStamp,button:button.id,direction,phase,pointerType:(event as PointerEvent).pointerType??'keyboard',disabled:button.disabled,...(reason?{reason}:{})});if(historyInputs.length>1200)historyInputs.shift();}

const inputPreferences={finger:false,palmGuard:true,penBarrelErase:false,rotationSnap:true,brushCursorEnabled:false,eraserSizeLink:false};
try{
  const saved=JSON.parse(localStorage.getItem('illustro.input-preferences.v1')??'null');
  for(const key of Object.keys(inputPreferences) as (keyof typeof inputPreferences)[])
    if(typeof saved?.[key]==='boolean')inputPreferences[key]=saved[key];
}catch{/* Defaults remain available if preferences cannot be read. */}
let devicePressureSensitivity=0.5;
try{const raw=localStorage.getItem('illustro.device-pressure-midpoint.v1');if(raw!==null){const saved=Number(raw);if(Number.isFinite(saved)&&saved>=0&&saved<=1)devicePressureSensitivity=saved;}}catch{}
let commonStabilization=0.25;
try{const raw=localStorage.getItem('illustro.common-stabilization.v1');if(raw!==null){const saved=Number(raw);if(Number.isFinite(saved)&&saved>=0&&saved<=1)commonStabilization=saved;}}catch{}
let guidePreferences:GuideSettings=DEFAULT_GUIDE_SETTINGS;
try{
 const saved=JSON.parse(localStorage.getItem('illustro.guide-settings.v1')??'null') as Partial<GuideSettings>|null;
 if(saved&&typeof saved==='object')guidePreferences=normalizeGuideSettings(saved);
}catch{/* Drawing remains usable when preferences are unavailable. */}
let symmetrySettings:SymmetrySettings=DEFAULT_SYMMETRY;
let rulerPanel:ReturnType<typeof installRulerPanel>|undefined;
let strokeCorrection:ReturnType<typeof installStrokeCorrection>|undefined;
let symmetryPanel:ReturnType<typeof installSymmetryPanel>|undefined;
let c05ReferenceBoard:ReferenceBoardService|undefined;
let c06ClipboardUI:ClipboardUI|undefined;
let c06Selection:SelectionWorkbench|undefined;
let timeline:ReturnType<typeof installTimeline>|undefined;
let fillPanel:ReturnType<typeof installFillPanel>|undefined;
let transformPanel:ReturnType<typeof installTransformPanel>|undefined;
let activeCanvasTool='',canvasToolRequest=0;
let imageLinkPanel:ReturnType<typeof installImageLinkPanel>|undefined;
let surface:BrushSurface|null=null,historyPending=false,undoCount=0,redoCount=0,blockedHistoryGhostClicks=0,selectedTool:'brush'|'eraser'|'eyedropper'='brush',lastDrawingTool:'brush'|'eraser'='brush',lastBrushPresetId='foundation-g-pen',lastEraserPresetId='foundation-hard-eraser',documentReady=false,lastQueuedRevision:string|null=null,recoveryCandidates:readonly Candidate[]=[];
const CHECKPOINT_OPERATION_INTERVAL=12,CHECKPOINT_IDLE_MS=800;
let projectionCheckpointTimer:number|null=null,projectionCheckpointBusy=false,checkpointOpsSinceLast=0,checkpointNeedsFullSeed=true,lastCheckpointAt:number|null=null;
let checkpointOperations:SemanticOperation[]=[];let checkpointCancelled=0;const checkpointErrors:Array<{at:string;message:string}>=[];let qaRefreshTimer:number|null=null;
function scheduleQaRefresh(){if(qaRefreshTimer!==null)return;qaRefreshTimer=window.setTimeout(()=>{qaRefreshTimer=null;updateQa();},250);}
let persistenceState:PersistenceState|null=null;
let lastExport:(Omit<ImageExportResult,'blob'>&{downloadBytes:number})|null=null,exportError:string|null=null,exportBusy=false,exportCount=0;
const persistence=new PersistenceCoordinator(state=>{persistenceState=state;surface?.setProtectionQueueLength(state.queueLength);updatePersistenceDisplay();if(state.storageError&&typeof homeUi!=='undefined')showStorageError(new Error(state.storageError));updateQa();});
let homeUi:HomeShell|null=null;let works:WorkEntry[]=[],lastWorkId:string|null=null,workSwitchBusy=false,librarySaving=false;
// A fresh blank document never contains pixels to replay. Existing works
// still restore their saved contents before drawing is enabled.
type BlankWarmup={
  controller:EditorController;
  drawing:BrushSurface;
  selectedLayerId:LayerId;
  whiteSurfaceKey:string|null;
  background:'transparent'|'white';
  ready:Promise<boolean>;
  cancelled:boolean;
  completed:boolean;
  started:number;
};
let initialBlankWarmup:BlankWarmup|null=null;
let documentActivationPending=false;
// Keep the original editable raster background and the top drawing layer in the
// Core document. Only the initial GPU upload differs from normal saved-work replay.
function newBlankDocument(width:number,height:number,name:string,background:'transparent'|'white',dpi=72,author='',description='',emptyDrawingLayer=false){
  // White is a logical base color, not 4*width*height initial raster bytes.
  // The upper transparent drawing layer is immediately usable. Native saves
  // carry the white-base metadata, and image export composites it on demand.
  const document=new CoreDocument({width,height,name:name.trim()||'新しい作品',dpi,author,description,emptyDrawingLayer,...(background==='white'?{blankBackground:'white' as const}:{})});
  const first=document.root.rootLayerIds[0]!;
  if(background!=='white')return {document,selected:first,whiteSurfaceKey:null};
  const whiteSurfaceKey=document.root.getLayer(first).surface.descriptor.surfaceId;
  const selected=document.addRasterLayerAbove(first).layerId;
  // The initial pair of layers is already in the autosave base. Start its
  // journal in a fresh writer epoch so the first subsequent edit is packet 1.
  const snapshot=document.capturePersistenceSnapshot();
  const ready=CoreDocument.restore({snapshot,blockPayloads:document.persistenceBlockPayloads(snapshot)});
  return {document:ready,selected,whiteSurfaceKey};
}
// Prepares the ACTUAL drawing host in the hidden editor, not an unrelated
// temporary GPU context whose shaders would need to be compiled a second time.
function reportBlankWarmup(state:string,detail='',background:'transparent'|'white'='transparent'){
  if(perfMode)(window as unknown as {__illustroWarmup:unknown}).__illustroWarmup={state,detail,background,at:performance.now()};
}
function beginBlankWarmup(width=512,height=384,name='新しい作品',background:'transparent'|'white'='transparent',dpi=72,author='',description=''){
  const title=name.trim()||'新しい作品';
  if(qaMode||documentReady||documentActivationPending||byId<HTMLButtonElement>('new').disabled||
      !Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>8192||height>8192)return;
  const active=initialBlankWarmup,root=active?.controller.document.root;
  if(active&&!active.cancelled&&active.background===background&&root?.width===width&&root.height===height&&root.name===title&&root.metadata.dpi===dpi&&(root.metadata.author??'')===author&&(root.metadata.description??'')===description)return;
  // Switching the intended blank size only replaces Home's unused renderer.
  // An existing drawing is never in this path (documentReady is false).
  if(active)discardBlankWarmup();
  const idle=surface,initial=controller.document.root;
  const reuseIdle=background==='transparent'&&!!idle&&initial.width===width&&initial.height===height&&initial.name===title&&initial.metadata.dpi===dpi&&(initial.metadata.author??'')===author&&(initial.metadata.description??'')===description&&controller.document.operationsTo().length===0;
  if(!reuseIdle)idle?.destroy();
  const blank=reuseIdle?{document:controller.document,selected:controller.selectedLayerId,whiteSurfaceKey:null}:newBlankDocument(width,height,title,background,dpi,author,description);
  const draft=reuseIdle?controller:EditorController.restored(blank.document,blank.selected);
  const drawing=reuseIdle?idle!:makeSurface(null,draft);
  surface=drawing;
  reportBlankWarmup('started',width+'x'+height,background);
  const entry:BlankWarmup={controller:draft,drawing,selectedLayerId:blank.selected,whiteSurfaceKey:blank.whiteSurfaceKey,background,cancelled:false,completed:false,started:performance.now(),ready:Promise.resolve(false)};
  initialBlankWarmup=entry;
  entry.ready=drawing.initialize().then(async()=>{
    if(entry.cancelled){drawing.destroy();return false;}
    if(entry.cancelled){drawing.destroy();return false;}
    entry.completed=true;
    measureCanvasStage('home-gpu-prewarm',entry.started);
    reportBlankWarmup('ready',width+'x'+height,entry.background);
    return true;
  }).catch(error=>{
    if(!entry.cancelled){
      reportBlankWarmup('failed',error instanceof Error?error.stack??error.message:String(error),entry.background);
      console.warn('Optional canvas prewarm unavailable:',error);
    }
    drawing.destroy();
    if(initialBlankWarmup===entry)initialBlankWarmup=null;
    if(surface===drawing)surface=null;
    return false;
  });
}
function discardBlankWarmup(){
  const entry=initialBlankWarmup;
  if(!entry)return;
  initialBlankWarmup=null;
  entry.cancelled=true;
  // A host still initializing is disposed as soon as worker initialization
  // returns, so an interrupted Home warmup cannot leak pointer listeners.
  entry.drawing.destroy();
  if(surface===entry.drawing)surface=null;
}
function matchedBlankWarmup(width:number,height:number,name:string,background:'transparent'|'white',dpi=72,author='',description=''){
  const ready=initialBlankWarmup;
  const root=ready?.controller.document.root;
  return !qaMode&&!documentReady&&ready&&!ready.cancelled&&surface===ready.drawing&&
    root?.width===width&&root.height===height&&root.name===(name.trim()||'新しい作品')&&ready.background===background&&root.metadata.dpi===dpi&&(root.metadata.author??'')===author&&(root.metadata.description??'')===description?ready:null;
}
let thumbnailTimer:number|null=null,thumbnailInProgress=false,thumbnailRetryCount=0;
let thumbnailRepairTimer:number|null=null,thumbnailRepairRunning=false;const thumbnailRepairSkipped=new Set<string>();

document.body.dataset.appMode=qaMode?'qa':'production';if(!qaMode){const retry=document.createElement('button');retry.type='button';retry.textContent='保存を再試行';retry.id='retryWorkSave';retry.onclick=()=>{void persistence.retry().then(()=>{byId('status').textContent='アプリ内に保存しました。';updatePersistenceDisplay();}).catch(showStorageError);};const rescue=document.createElement('button');rescue.type='button';rescue.id='rescueWorkSave';rescue.textContent='作品ファイルに救出';rescue.hidden=true;rescue.onclick=()=>{void saveWork(true);};byId('saveState').after(retry,rescue);}
const historyButtons=()=>[byId<HTMLButtonElement>('undo'),byId<HTMLButtonElement>('redo'),byId<HTMLButtonElement>('compactUndo'),byId<HTMLButtonElement>('compactRedo')];

const layerTagNames:Record<LayerColorTag,string>={
  red:'赤',orange:'オレンジ',yellow:'黄',green:'緑',blue:'青',purple:'紫',
};
for(const selectId of ['layerTagFilter','selectedLayerTag']){
  const field=byId<HTMLSelectElement>(selectId);
  for(const tag of LAYER_COLOR_TAGS)field.add(new Option(layerTagNames[tag],tag));
}

function changeLayer(label:string, change:(tx:ReturnType<CoreDocument['begin']>)=>boolean){
  if(!documentReady||!surface)return;
  if(surface.busy||historyPending||geometryBusy){
    byId('status').textContent='今の操作が終わってからレイヤーを変更してください。';
    renderLayers();
    return;
  }
  try{
    stopLayerCompComparison();
    const previousOrder=controller.document.root.rootLayerIds;
    const tx=controller.document.begin(label);
    if(!change(tx)){tx.cancel();return;}
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.reconcileSelection(previousOrder);
    queueLatestCommit();
    surface.discardRedoProjection();
    surface.syncLayerStack();
    byId('status').textContent=label;
  }catch(error){
    byId('status').textContent='レイヤーを変更できませんでした。'+(error instanceof Error?error.message:'');
  }
  renderLayers();
  updateHistoryButtons();
  updateQa();
}

let layerBatchDocument:CoreDocument|null=null;
let layerBatchMode=false;
let layerBatchAnchor:LayerId|null=null;
const layerBatchIds=new Set<LayerId>();
const collapsedLayerGroups=new Set<LayerId>();

function selectLayerForBatch(id:LayerId,visibleRows:readonly {id:LayerId}[],extend:boolean){
  const anchor=visibleRows.findIndex(layer=>layer.id===layerBatchAnchor);
  const current=visibleRows.findIndex(layer=>layer.id===id);
  if(extend&&anchor>=0&&current>=0){
    for(const layer of visibleRows.slice(Math.min(anchor,current),Math.max(anchor,current)+1))layerBatchIds.add(layer.id);
  }else{
    if(layerBatchIds.has(id))layerBatchIds.delete(id);
    else layerBatchIds.add(id);
    layerBatchAnchor=id;
  }
  renderLayers();
  byId('layerPageList').querySelector<HTMLButtonElement>(`[data-layer-id="${id}"]`)?.focus();
}

function changeLayerBatch(label:string,apply:(tx:ReturnType<CoreDocument['begin']>,id:LayerId)=>boolean){
  if(layerBatchDocument!==controller.document)return;
  changeLayer(label,tx=>{
    let changed=false;
    for(const id of layerBatchIds){
      if(controller.document.root.hasLayer(id))changed=apply(tx,id)||changed;
    }
    return changed;
  });
}


let opacityPreview:{document:CoreDocument;layerId:LayerId;surface:BrushSurface}|null=null;
let opacityPreviewFrame=0;

function clearLayerOpacityPreview(){
  cancelAnimationFrame(opacityPreviewFrame);
  opacityPreviewFrame=0;
  opacityPreview?.surface.setLayerOpacityPreview();
  opacityPreview=null;
}

async function createLayerFromPixels(mode:'duplicate'|'copy'|'merge',ids:ReadonlySet<LayerId>){
  const drawing=surface,document=controller.document,root=document.root;
  if(!drawing?.canChangeGeometry||!documentReady||geometryBusy||historyPending||!ids.size)return;
  const sourceOrder=root.rootLayerIds.filter(id=>ids.has(id));
  if(sourceOrder.length!==ids.size)return;
  if(mode==='merge'){
    if(ids.size<2)return;
    if(sourceOrder.some(id=>root.isLayerLocked(id))){
      byId('status').textContent='結合するレイヤーのロックを解除してください。';
      return;
    }
    const first=root.rootLayerIds.indexOf(sourceOrder[0]!),last=root.rootLayerIds.indexOf(sourceOrder.at(-1)!);
    const interleaved=last-first+1!==ids.size;
    const message=ids.size+'枚を一枚に結合します。非表示の内容と個別のレイヤー設定は結合後のレイヤーに残りません。';
    const hasExternalBlend=first>0&&sourceOrder.some(id=>{
      const blend=root.getLayer(id).blend;
      return blend&&(blend.mode!=='normal'||blend.space==='linear');
    });
    const asymmetricGroups=new Set(sourceOrder.map(id=>root.groupsForLayer(id).at(-1)?.id)).size>1;
    const externalClip=root.rootLayerIds.some(id=>{
      const base=root.clippingSource(id);
      return base&&ids.has(base.id)!==ids.has(id);
    });
    if(!await appConfirm(message+(externalClip?' 結合範囲の外とのクリッピング関係が変わります。':'')+(interleaved?' 間にあるレイヤーとの重なり順が変わる場合があります。':'')+(hasExternalBlend?' 結合範囲の外の絵との混ざり方が変わる場合があります。':'')+(asymmetricGroups?' 異なるグループをまたぐため、表示やロックの継承が変わります。':'')))return;
  }
  geometryBusy=true;
  drawing.setInputBarrier(true);
  const label=mode==='duplicate'?'レイヤーを複製':mode==='copy'?'統合コピーを作成':'レイヤーを結合';
  byId('status').textContent=label+'しています。';
  try{
    const head=document.head;
    const captureIds=new Set(ids);
    if(mode!=='duplicate')for(const id of ids){
      const clip=root.clippingSource(id);
      if(clip&&root.isLayerVisible(clip.id))captureIds.add(clip.id);
    }
    const snapshots=await drawing.captureDocumentLayers(captureIds);
    if(surface!==drawing||controller.document!==document||document.head!==head)throw new Error('作品が変わったため操作を取り消しました。');
    const reference=mode==='copy'?root.rootLayerIds.at(-1)!:mode==='merge'?(sourceOrder.findLast(id=>root.isLayerVisible(id))??sourceOrder.at(-1)!):sourceOrder.at(-1)!;
    let pixels:Uint8Array|Uint8ClampedArray;
    if(mode==='duplicate'){
      pixels=snapshots.get(reference)!;
    }else{
      const combined=new Uint8ClampedArray(root.width*root.height*4);
      for(const id of sourceOrder){
        const clip=root.clippingSource(id);
        if(!root.isLayerVisible(id)||(clip&&!root.isLayerVisible(clip.id)))continue;
        const item=root.getLayer(id);
        compositeLayer(combined,snapshots.get(id)!,item.opacity,clip?{pixels:snapshots.get(clip.id)!,opacity:clip.opacity,mask:clip.vectorMask??null}:undefined,{width:root.width,mask:item.vectorMask??null,blend:item.blend??null});
      }
      pixels=combined;
    }
    const tx=document.begin(label);
    const id=mode==='merge'
      ?tx.replaceRasterLayers(ids,reference,pixels as Uint8ClampedArray,'結合レイヤー')
      :tx.addRasterSnapshotAbove(reference,pixels,mode==='copy'?'統合コピー':root.getLayer(reference).name.slice(0,4070)+' のコピー',mode==='duplicate',mode==='duplicate');
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.selectLayer(id);
    queueLatestCommit();
    checkpointNeedsFullSeed=true;
    await drawing.restoreDocumentProjection();
    byId('status').textContent=label+'しました。';
  }catch(error){
    byId('status').textContent=label+'できませんでした。'+(error instanceof Error?error.message:'');
  }finally{
    geometryBusy=false;
    if(surface===drawing)drawing.setInputBarrier(false);
    renderLayers();updateHistoryButtons();updateQa();
  }
}

function visibleLayerIds(){
  const root=controller.document.root;
  return new Set(root.rootLayerIds.filter(id=>root.isLayerVisible(id)&&!root.getLayer(id).implicitRaster&&root.getLayer(id).opacity>0));
}

type MaskEditMode='pixels'|'path'|'points';
let historyBrush:HistoryBrushSession|null=null;
let maskEditing:{drawing:BrushSurface;artwork:CoreDocument;id:LayerId;mode:MaskEditMode;reveal:boolean}|null=null;
let thumbnailState:{mask:LayerMask;width:number;height:number}|null=null;
let maskInspection:{drawing:BrushSurface;artwork:CoreDocument;id:LayerId;mode:'red'|'grayscale';mask:LayerMask;width:number;height:number}|null=null;
function stopMaskInspection(){
  maskInspection?.drawing.setMaskInspection();
  maskInspection=null;
}
function inspectSelectedMask(mode:'red'|'grayscale'){
  const drawing=surface,artwork=controller.document,layer=controller.selectedLayer,mask=layer.vectorMask;
  if(!drawing||!mask||drawing.busy)return;
  stopMaskEditing();
  const {width,height}=artwork.root;
  maskInspection={drawing,artwork,id:layer.id,mode,mask,width,height};
  drawing.setMaskInspection(mask,mode);
  shellUi.setLayerPage(false);
  updateVectorMaskControls();
}

function stopMaskEditing(){
  if(!maskEditing)return;
  maskEditing.drawing.setCanvasEditGesture(null);
  maskEditing=null;
}
function updateVectorMaskControls(){
  const layer=controller.selectedLayer,mask=layer.vectorMask,root=controller.document.root;
  const disabled=!documentReady||layer.implicitRaster||layer.baseColor==='white'||root.isLayerContentLocked(layer.id);
  if(maskEditing&&(disabled||maskEditing.id!==layer.id||maskEditing.artwork!==controller.document||
    maskEditing.drawing!==surface||(maskEditing.mode==='pixels'&&mask?.shape!=='pixels')||(maskEditing.mode==='points'&&mask?.shape!=='path')))stopMaskEditing();
  if(maskInspection){
    if(!mask||maskInspection.id!==layer.id||maskInspection.artwork!==controller.document||maskInspection.drawing!==surface){
      stopMaskInspection();
    }else if(maskInspection.mask!==mask||maskInspection.width!==root.width||maskInspection.height!==root.height){
      maskInspection={...maskInspection,mask,width:root.width,height:root.height};
      maskInspection.drawing.setMaskInspection(mask,maskInspection.mode);
    }
  }
  byId('maskInspectionBar').hidden=!maskInspection;
  byId<HTMLButtonElement>('maskInspectOnly').disabled=!mask;
  byId<HTMLButtonElement>('maskInspectRed').disabled=!mask;
  byId<HTMLButtonElement>('vectorMaskFromSelection').disabled=disabled||!surface||!selectionCanCreateMask(
    byId<HTMLSelectElement>('vectorMaskShape').value,surface.selectedRectangle,c06Selection?.active()??null,root.width,root.height
  );
  byId<HTMLButtonElement>('pixelMaskAdd').disabled=disabled;
  byId<HTMLButtonElement>('maskPathEdit').disabled=disabled;
  byId<HTMLButtonElement>('maskPointEdit').disabled=disabled||mask?.shape!=='path';
  byId('pixelMaskAdd').textContent=mask?.shape==='pixels'?'マスクを塗る':'塗って隠すマスクを追加';
  for(const id of ['vectorMaskEnabled','maskLinked','vectorMaskInverted','vectorMaskDensity','vectorMaskRemove','vectorMaskApply']){
    (byId(id) as HTMLInputElement|HTMLButtonElement).disabled=disabled||!mask;
  }
  byId<HTMLButtonElement>('vectorMaskApply').disabled=!maskApplyAllowed({
    editable:!disabled,maskEnabled:!!mask?.enabled,geometryReady:!!surface?.canChangeGeometry,geometryBusy,historyPending,
  });
  byId<HTMLInputElement>('vectorMaskEnabled').checked=mask?.enabled??false;
  byId<HTMLInputElement>('maskLinked').checked=mask?.linked??true;
  byId<HTMLInputElement>('vectorMaskInverted').checked=mask?.inverted??false;
  byId<HTMLInputElement>('vectorMaskDensity').value=String(Math.round((mask?.density??1)*100));
  const thumbnail=byId<HTMLButtonElement>('maskThumbnail');
  thumbnail.hidden=!mask;
  thumbnail.disabled=disabled;
  thumbnail.setAttribute('aria-pressed',String(!!maskEditing));
  if(mask&&(thumbnailState?.mask!==mask||thumbnailState.width!==root.width||thumbnailState.height!==root.height)){
    drawMaskPreview(byId<HTMLCanvasElement>('maskThumbnailImage'),mask,root.width,root.height,'grayscale');
    thumbnailState={mask,width:root.width,height:root.height};
  }
  const shape=mask?.shape;
  const name=shape==='ellipse'?'楕円':shape==='rectangle'?'長方形':shape==='path'?'手描きの輪郭':'ブラシで塗る';
  byId('vectorMaskStatus').textContent=mask?name+'マスク'+(mask.enabled?'':'（無効）'):'マスクを追加すると元の絵を残したまま一部を隠せます。';
  byId('maskEditingBar').hidden=!maskEditing;
  if(maskEditing){
    const pixels=maskEditing.mode==='pixels',reveal=maskEditing.reveal;
    byId('maskEditingTarget').textContent='編集中 '+layer.name+' のマスク'+(maskEditing.mode==='points'?'（点の移動）':'');
    byId('maskPaintHide').hidden=!pixels;
    byId('maskPaintReveal').hidden=!pixels;
    byId('maskPaintHide').setAttribute('aria-pressed',String(!reveal));
    byId('maskPaintReveal').setAttribute('aria-pressed',String(reveal));
  }
}
function modifyVectorMask(patch:Partial<Pick<LayerMask,'enabled'|'inverted'|'density'|'linked'>>){
  const layer=controller.selectedLayer,mask=layer.vectorMask;
  if(mask)changeLayer('マスクを変更しました。',tx=>tx.setVectorLayerMask(layer.id,{...mask,...patch}));
}
async function replaceMaskAllowed(next:LayerMask['shape']){
  const mask=controller.selectedLayer.vectorMask;
  return !mask||mask.shape===next||await appConfirm('現在のマスクを置き換えますか？ 元に戻す操作で復元できます。');
}
async function startMaskEditing(mode:MaskEditMode,reveal=false){
  const drawing=surface,artwork=controller.document,layer=controller.selectedLayer;
  if(!drawing||drawing.busy||geometryBusy||historyPending||artwork.root.isLayerContentLocked(layer.id))return;
  if(!artwork.root.isLayerVisible(layer.id)){
    byId('status').textContent='レイヤーを表示するとマスクを編集できます。';return;
  }
  let mask=layer.vectorMask;
  if(mode==='pixels'&&mask?.shape!=='pixels'){
    if(!(await replaceMaskAllowed('pixels')))return;
    changeLayer('ピクセルマスクを追加しました。',tx=>tx.setVectorLayerMask(layer.id,{
      shape:'pixels',x:0,y:0,scaleX:1,scaleY:1,tiles:{},enabled:true,inverted:false,density:1,linked:true,
    }));
    mask=controller.selectedLayer.vectorMask;
    if(mask?.shape!=='pixels')return;
  }
  if(mode==='path'&&!replaceMaskAllowed('path'))return;
  stopHistoryBrush();
  stopLayerCompComparison();
  cancelLayerPick?.();
  drawing.setSelectionMode(false);
  if(drawing.inspectedLayer)drawing.setSoloLayer(null);
  stopMaskInspection();
  maskEditing={drawing,artwork,id:layer.id,mode,reveal};
  drawing.setCanvasEditGesture({
    path:mode==='path',width:drawing.brushSize,color:mode==='path'?'#43bfea':reveal?'#fff':'#e35060',
    complete:points=>{
      if(surface!==drawing||controller.document!==artwork||controller.selectedLayerId!==layer.id)return;
      const current=controller.selectedLayer.vectorMask;
      if(mode==='path'){
        if(points.length<3){byId('status').textContent='マスクにする範囲を囲んでください。';return;}
        const next:LayerMask={
          shape:'path',points,
          enabled:true,inverted:current?.shape==='path'?current.inverted:false,density:current?.shape==='path'?current.density:1,
          linked:current?.linked??true,
        };
        stopMaskEditing();
        changeLayer('輪郭のマスクを保存しました。',tx=>tx.setVectorLayerMask(layer.id,next));
      }else if(current?.shape==='pixels'){
        const {width,height}=artwork.root;
        const next=paintPixelMask(current,points,{reveal,size:drawing.brushSize,opacity:drawing.maskBrushOpacity,width,height,selection:drawing.selectedRectangle,selectionMask:c06Selection?.active()??null});
        if(next!==current)changeLayer('マスクを塗りました。',tx=>tx.setVectorLayerMask(layer.id,next));
      }
    },
  });
  shellUi.setLayerPage(false);
  updateVectorMaskControls();
  byId('status').textContent=mode==='path'?'残したい範囲を一筆で囲んでください。':'マスクを塗れます。黒で隠し、白で表示を戻します。';
}

function startMaskPointEditing(){
  const drawing=surface,artwork=controller.document,layer=controller.selectedLayer;
  const mask=layer.vectorMask;
  if(!drawing||drawing.busy||geometryBusy||historyPending||mask?.shape!=='path'||
    artwork.root.isLayerContentLocked(layer.id))return;
  if(!artwork.root.isLayerVisible(layer.id)){
    byId('status').textContent='レイヤーを表示すると輪郭の点を編集できます。';
    return;
  }
  stopMaskEditing();stopHistoryBrush();stopLayerCompComparison();
  cancelLayerPick?.();drawing.setSelectionMode(false);
  if(drawing.inspectedLayer)drawing.setSoloLayer(null);
  stopMaskInspection();
  maskEditing={drawing,artwork,id:layer.id,mode:'points',reveal:false};
  const installHandles=()=>{
    const current=artwork.root.getLayer(layer.id).vectorMask;
    if(current?.shape!=='path'||maskEditing?.drawing!==drawing||maskEditing.id!==layer.id)return;
    drawing.setCanvasEditGesture({
      path:false,width:2,color:'#43bfea',complete:()=>{},
      pointEdit:{
        points:current.points,
        commit:(index,point)=>{
          if(surface!==drawing||controller.document!==artwork||controller.selectedLayerId!==layer.id||
            artwork.root.isLayerContentLocked(layer.id))return;
          const before=artwork.root.getLayer(layer.id).vectorMask;
          if(before?.shape!=='path'||index<0||index>=before.points.length)return;
          const previous=before.points[index]!;
          const x=Math.max(0,Math.min(artwork.root.width,point.x));
          const y=Math.max(0,Math.min(artwork.root.height,point.y));
          if(previous.x===x&&previous.y===y)return;
          const points=before.points.map((p,i)=>i===index?{x,y}:p);
          changeLayer('マスクの輪郭点を移動しました。',tx=>tx.setVectorLayerMask(layer.id,{...before,points}));
          installHandles();
        },
      },
    });
  };
  installHandles();
  shellUi.setLayerPage(false);
  updateVectorMaskControls();
  byId('status').textContent='白い点をドラッグして輪郭を調整できます。変更は一回ずつ元に戻せます。';
}

async function applyVectorMask(){
  const drawing=surface,artwork=controller.document,layer=controller.selectedLayer,mask=layer.vectorMask;
  if(!drawing){byId('status').textContent='作品を開いてから操作してください。';return;}
  if(!maskApplyAllowed({
    editable:documentReady&&!layer.implicitRaster&&layer.baseColor!=='white'&&!artwork.root.isLayerContentLocked(layer.id),
    maskEnabled:!!mask?.enabled,geometryReady:!!drawing?.canChangeGeometry,geometryBusy,historyPending,
  })){
    byId('status').textContent=!mask?.enabled?'有効なマスクを選んでください。':
      artwork.root.isLayerContentLocked(layer.id)?'ロックされているレイヤーにはマスクを適用できません。':
      '現在の操作が終わってからマスクを適用してください。';
    return;
  }
  if(!await appConfirm('マスクを絵に適用します。隠れていた画素に戻すには、元に戻す操作を使ってください。'))return;
  const head=artwork.head,root=artwork.root;
  geometryBusy=true;
  drawing.setInputBarrier(true);
  try{
    const pixels=(await drawing.captureDocumentLayers(new Set([layer.id]))).get(layer.id)!;
    if(surface!==drawing||controller.document!==artwork||artwork.head!==head)throw new Error('作品が切り替わりました。');
    for(let ty=0;ty<Math.ceil(root.height/TILE);ty++){
      for(let tx=0;tx<Math.ceil(root.width/TILE);tx++){
        const coverage=layerMaskTile(mask,tx+','+ty);
        if(coverage===255)continue;
        const tileWidth=Math.min(TILE,root.width-tx*TILE),tileHeight=Math.min(TILE,root.height-ty*TILE);
        for(let y=0;y<tileHeight;y++)for(let x=0;x<tileWidth;x++){
          const index=((ty*TILE+y)*root.width+tx*TILE+x)*4;
          const alpha=typeof coverage==='number'?coverage:coverage[y*TILE+x]!;
          pixels[index+3]=Math.round(pixels[index+3]!*alpha/255);
          if(!pixels[index+3])pixels.fill(0,index,index+3);
        }
      }
    }
    const tx=artwork.begin('マスクをレイヤーに適用');
    const id=tx.bakeVectorLayerMask(layer.id,pixels);
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.selectLayer(id);
    queueLatestCommit();
    checkpointNeedsFullSeed=true;
    await drawing.restoreDocumentProjection();
    byId('status').textContent='マスクをレイヤーに適用しました。';
  }catch(error){
    byId('status').textContent='マスクの適用中にエラーが発生しました。'+(error instanceof Error?error.message:'');
  }finally{
    geometryBusy=false;
    if(surface===drawing)drawing.setInputBarrier(false);
    renderLayers();updateHistoryButtons();updateQa();
  }
}

async function deleteLayers(ids:ReadonlySet<LayerId>){
  if(!ids.size)return;
  const root=controller.document.root;
  const affected=root.rootLayerIds.filter(id=>{
    const source=root.getLayer(id).clipSourceId;
    return !ids.has(id)&&source&&ids.has(source);
  }).length;
  const message=ids.size===1?'このレイヤーを削除しますか？':ids.size+'枚のレイヤーを削除しますか？';
  if(!await appConfirm(message+(affected?' '+affected+'枚のレイヤーのクリッピングが外れます。':'')))return;
  changeLayer('レイヤーを削除しました。',tx=>tx.deleteRasterLayers(ids));
}

function chooseLayerGroupDestination(action:(id:LayerId|null)=>void){
  const dialog=document.createElement('dialog'),form=document.createElement('form');
  const label=document.createElement('label'),select=document.createElement('select');
  const cancel=document.createElement('button'),apply=document.createElement('button');
  form.method='dialog';
  label.textContent='移動先 ';
  select.add(new Option('グループの外（一番上）',''));
  for(const group of controller.document.root.layerGroups){
    const depth=controller.document.root.groupsForLayer(group.members[0]!).findIndex(parent=>parent.id===group.id);
    select.add(new Option('　'.repeat(Math.max(0,depth))+group.name,group.id));
  }
  label.append(select);
  cancel.type='submit';cancel.value='cancel';cancel.textContent='取消';
  apply.type='submit';apply.value='apply';apply.textContent='移動';
  form.append(label,cancel,apply);
  dialog.className='export-dialog';
  dialog.setAttribute('aria-label','レイヤーの移動先');
  dialog.append(form);
  document.body.append(dialog);
  const artwork=controller.document;
  dialog.addEventListener('close',()=>{
    dialog.remove();
    if(dialog.returnValue==='apply'&&artwork===controller.document)action((select.value||null) as LayerId|null);
  },{once:true});
  dialog.showModal();
}

let cancelLayerPick:(()=>void)|null=null;

function pickLayerOnCanvas(point?:Point){
  const drawing=surface,artwork=controller.document;
  if(!drawing||!documentReady||drawing.busy||geometryBusy||historyPending)return;
  cancelLayerPick?.();
  stopLayerCompComparison();
  shellUi.setLayerPage(false);
  byId('status').textContent='絵の上で探したい場所をタップしてください。非表示のレイヤーは候補に含みません。';
  const cancel=()=>{
    window.removeEventListener('keydown',onKey);
    drawing.setLayerPick(null);
    if(cancelLayerPick===cancel)cancelLayerPick=null;
  };
  const onKey=(event:KeyboardEvent)=>{
    if(event.key!=='Escape')return;
    event.preventDefault();
    cancel();
    byId('status').textContent='レイヤー選択を取り消しました。';
  };
  cancelLayerPick=cancel;
  window.addEventListener('keydown',onKey);
  drawing.setLayerPick(ids=>{
    if(cancelLayerPick!==cancel)return;
    cancel();
    if(surface!==drawing||controller.document!==artwork)return;
    if(!ids.length){
      byId('status').textContent='そこには表示中のレイヤーの絵がありません。';
      shellUi.setLayerPage(true);
      return;
    }
    const dialog=document.createElement('dialog'),form=document.createElement('form');
    const title=document.createElement('h2'),list=document.createElement('fieldset'),legend=document.createElement('legend');
    const choose=document.createElement('button'),close=document.createElement('button');
    title.textContent='この場所に重なるレイヤー';
    legend.textContent='上のレイヤーから順に表示';
    list.append(legend);
    let candidate=ids[0]!;
    const lock=artwork.root;
    for(const id of ids){
      const layer=lock.getLayer(id),radio=document.createElement('input'),label=document.createElement('label');
      radio.type='radio';radio.name='layerCandidate';radio.value=id;radio.checked=id===candidate;
      radio.onchange=()=>{candidate=id;void drawing.showLayerOutline(id);};
      radio.onfocus=()=>{void drawing.showLayerOutline(id);};
      label.onpointerenter=event=>{if(event.pointerType==='mouse')void drawing.showLayerOutline(id);};
      label.append(radio,layer.name+(lock.isLayerLocked(id)?'（ロック中）':''));
      list.append(label);
    }
    list.onpointerleave=()=>{void drawing.showLayerOutline(candidate);};
    form.method='dialog';
    choose.type='submit';choose.value='choose';choose.textContent='描画先に選ぶ';
    close.type='submit';close.value='cancel';close.textContent='取消';
    form.append(title,list,choose,close);
    dialog.className='layer-blend-dialog layer-pick-dialog';
    dialog.setAttribute('aria-label','この場所に重なるレイヤー');
    dialog.append(form);
    document.body.append(dialog);
    drawing.setInputBarrier(true);
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&dialog.open){event.preventDefault();dialog.close('cancel');}
    };
    window.addEventListener('keydown',key);
    dialog.addEventListener('close',()=>{
      window.removeEventListener('keydown',key);
      dialog.remove();
      void drawing.showLayerOutline(null);
      if(surface!==drawing||controller.document!==artwork)return;
      drawing.setInputBarrier(false);
      if(dialog.returnValue==='choose'&&artwork.root.hasLayer(candidate)){
        controller.selectLayer(candidate);
        if(!qaMode)void persistence.selectWorkLayer(candidate).catch(showStorageError);
        byId('status').textContent=controller.selectedLayer.name+'を描画先に選びました。';
      }
      shellUi.setLayerPage(true);
      renderLayers();updateQa();
    },{once:true});
    dialog.show();
    void drawing.showLayerOutline(candidate);
  });
  if(point)drawing.pickLayerAt(point);
}

function groupLayerRow(group:LayerGroup,depth:number){
  const row=document.createElement('div');
  row.className='layer-group-row';
  row.style.marginInlineStart=Math.min(depth,8)*10+'px';
  let actions:HTMLElement=row;
  const button=(text:string,label:string,action:()=>void)=>{
    const control=document.createElement('button');
    control.type='button';
    control.textContent=text;
    control.setAttribute('aria-label',label);
    control.onclick=action;
    actions.append(control);
    return control;
  };
  const expanded=!collapsedLayerGroups.has(group.id);
  row.dataset.groupDrop=group.id;
  const summary=button(group.name,group.name,()=>{
    if(expanded)collapsedLayerGroups.add(group.id);
    else collapsedLayerGroups.delete(group.id);
    renderLayers();
    byId('layerPageList').querySelector<HTMLButtonElement>(`[data-group-id="${group.id}"]`)?.focus();
  });
  summary.className='layer-folder-toggle';
  const folderGlyph=document.createElement('span');
  folderGlyph.innerHTML=icon('open')+icon('down');
  folderGlyph.className='layer-folder-icons';
  summary.prepend(folderGlyph);
  summary.dataset.groupId=group.id;
  summary.setAttribute('aria-expanded',String(expanded));
  const visibility=button('',group.name+'の表示を切り替える',()=>{
    changeLayer('グループの表示を切り替えました。',tx=>tx.updateLayerGroup(group.id,{visible:!group.visible}));
  });
  visibility.innerHTML=icon(group.visible?'eye':'eyeOff');
  visibility.className='layer-visibility';
  visibility.title=group.visible?'グループを非表示':'グループを表示';
  const menu=document.createElement('details'),trigger=document.createElement('summary');
  menu.className='layer-folder-actions';trigger.innerHTML=icon('more');
  trigger.setAttribute('aria-label',group.name+'の操作');trigger.title=group.name+'の操作';
  actions=document.createElement('div');menu.append(trigger,actions);row.append(menu);
  button(group.locked?'ロックを解除':'ロック',group.name+'のロックを切り替える',()=>{
    changeLayer('グループのロックを切り替えました。',tx=>tx.updateLayerGroup(group.id,{locked:!group.locked}));
  });
  button('改名',group.name+'の名前を変更する',async()=>{
    const name=(await appPrompt('グループ名',group.name))?.trim();
    if(name&&name!==group.name)changeLayer('グループ名を変更しました。',tx=>tx.updateLayerGroup(group.id,{name}));
  });
  button('合成範囲',group.name+'の合成範囲を見比べる',()=>editGroupStructure(group));
  button('上へ',group.name+'を一段上へ移動する',()=>{
    changeLayer('グループを上へ移動しました。',tx=>tx.moveLayerGroup(group.id,1));
  });
  button('下へ',group.name+'を一段下へ移動する',()=>{
    changeLayer('グループを下へ移動しました。',tx=>tx.moveLayerGroup(group.id,-1));
  });
  button('移動先',group.name+'の移動先を指定する',()=>{
    chooseLayerGroupDestination(destination=>changeLayer('グループを移動しました。',tx=>tx.moveGroupIntoGroup(group.id,destination)));
  });
  button('解除',group.name+'をグループ解除する',()=>{
    changeLayer('グループを解除しました。',tx=>tx.dissolveLayerGroup(group.id));
  });
  return row;
}

let groupStructurePreview:HTMLDialogElement|null=null;

function editGroupStructure(group:LayerGroup){
  const drawing=surface,artwork=controller.document,head=artwork.head;
  if(!drawing||drawing.busy||geometryBusy||historyPending)return;
  groupStructurePreview?.close('cancel');
  const dialog=document.createElement('dialog'),body=document.createElement('form');
  dialog.className='layer-blend-dialog';dialog.setAttribute('aria-label','グループ構造を見比べる');
  const title=document.createElement('strong');title.textContent=group.name+'の合成範囲';
  body.method='dialog';
  const mode=document.createElement('select');
  mode.add(new Option('下のレイヤーまで合成する','pass-through'));mode.add(new Option('グループの中で合成する','isolated'));
  mode.value=group.compositing??'pass-through';
  const choose=document.createElement('label');choose.append('合成する範囲',mode);
  const detail=document.createElement('output');detail.setAttribute('role','status');
  const stages=document.createElement('details'),stageName=document.createElement('summary');
  stageName.textContent='変化が出るレイヤーと処理の順番';stages.append(stageName);
  const rows=document.createElement('ul');
  for(const id of group.members){
    const layer=artwork.root.getLayer(id),clip=artwork.root.clippingSource(id);
    const sequence=[
      layer.deformation?'保持した変形を適用':'元の絵',
      ...(layer.blend?.effect?.enabled?['効果用マスクで色を調整']:[]),
      ...(layer.vectorMask?.enabled?['レイヤーマスク']:[]),
      ...(clip?['「'+clip.name+'」でクリップ']:[]),
      layer.blend?.tone?'色の範囲に応じて合成':'合成'
    ];
    const row=document.createElement('li');
    row.textContent=layer.name+'  '+sequence.join(' → ');
    rows.append(row);
  }
  stages.append(rows);
  const compare=document.createElement('button');compare.type='button';
  const cancel=document.createElement('button');cancel.type='submit';cancel.value='cancel';cancel.textContent='取り消す';
  const apply=document.createElement('button');apply.type='submit';apply.value='apply';apply.textContent='構造を確定';
  let before=false;
  const reflect=()=>{
    drawing.setIsolationPreview(before?null:{id:group.id,isolated:mode.value==='isolated'});
    compare.textContent=before?'変更後を見る':'変更前を見る';
    compare.setAttribute('aria-pressed',String(before));
    const count=group.members.filter(id=>{
      const blend=artwork.root.getLayer(id).blend;
      return blend&&(blend.mode!=='normal'||blend.tone?.source==='backdrop');
    }).length;
    detail.textContent=(before?'変更前。':'変更後の仮表示。')+
      (count?count+'枚で下の色との混ざり方が変わる可能性があります。':'現在の処理順で、元のレイヤーと関連を保持します。');
    apply.disabled=mode.value===(group.compositing??'pass-through');
  };
  compare.onclick=()=>{before=!before;reflect();};
  mode.onchange=()=>{before=false;reflect();};
  const actions=document.createElement('menu');actions.append(compare,cancel,apply);
  body.append(title,choose,detail,stages,actions);dialog.append(body);document.body.append(dialog);
  groupStructurePreview=dialog;
  dialog.addEventListener('close',()=>{
    if(groupStructurePreview===dialog)groupStructurePreview=null;
    if(surface===drawing)drawing.setIsolationPreview(null);dialog.remove();
    if(dialog.returnValue!=='apply')return;
    if(controller.document!==artwork||artwork.head!==head||surface!==drawing){
      byId('status').textContent='作品が変更されたため構造を確定できませんでした。開き直してください。';return;
    }
    changeLayer('グループの合成範囲を変更しました。',tx=>tx.updateLayerGroup(group.id,{
      compositing:mode.value==='isolated'?'isolated':'pass-through'
    }));
  },{once:true});
  shellUi.setLayerPage(false);dialog.show();reflect();mode.focus();
}
let activeBlend:{dialog:HTMLDialogElement;drawing:BrushSurface;id:LayerId}|null=null;
function editLayerBlend(){
  const drawing=surface,artwork=controller.document,layer=controller.selectedLayer;
  if(!drawing||drawing.busy||geometryBusy||historyPending||layer.baseColor==='white')return;
  activeBlend?.dialog.close('cancel');
  stopLayerCompComparison();
  stopHistoryBrush();
  stopMaskEditing();
  stopMaskInspection();
  updateVectorMaskControls();
  if(drawing.inspectedLayer)drawing.setSoloLayer(null);
  shellUi.setLayerPage(false);
  const root=artwork.root,clip=root.clippingSource(layer.id);
  const stages=[
    layer.deformation?'変形した絵と、その上に描いた線':layer.editable?'編集できる図形・文字・グラデーション':'レイヤーの絵',
    ...(layer.blend?.effect?.enabled?['効果用マスクの範囲で色を調整する']:[]),
    ...(layer.vectorMask?.enabled?['レイヤーマスクで表示する範囲を決める']:[]),
    ...(clip?['「'+clip.name+'」で切り抜く']:[]),
    'レイヤーの不透明度と、選んだモードで下の絵に重ねる'
  ];
  const revision=artwork.head,cache=new Map<string,Promise<ImageData>>();
  const sampleTone=(kind:'self'|'backdrop')=>{
    const existing=cache.get(kind);
    if(existing)return existing;
    const loading=(async()=>{
      const frozen=captureExport(artwork,undefined,revision),id=layer.surface.descriptor.surfaceId;
      const index=frozen.layers.findIndex(item=>item.surfaceId===id);
      const layers=kind==='self'?[{surfaceId:id,visible:true,opacity:1}]:frozen.layers.slice(0,index);
      const surfaceIds=new Set(layers.map(item=>item.surfaceId));
      const image=await renderFrozenArtwork({...frozen,layers,
        basePixels:frozen.basePixels?.filter(item=>surfaceIds.has(item.surfaceId))??[],
        strokes:frozen.strokes.filter(item=>surfaceIds.has(item.surfaceId))});
      const scale=Math.min(1,256/Math.max(root.width,root.height));
      const w=Math.max(1,Math.round(root.width*scale)),h=Math.max(1,Math.round(root.height*scale));
      const output=new Uint8ClampedArray(w*h*4);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const at=(Math.floor(y*root.height/h)*root.width+Math.floor(x*root.width/w))*4;
        output.set(image.subarray(at,at+4),(y*w+x)*4);
      }
      return new ImageData(output,w,h);
    })();
    cache.set(kind,loading);return loading;
  };
  const dialog=openLayerBlendDialog({
    title:layer.name,stages,sampleTone,selectionMask:()=>{
      const selection=c06Selection?.active();return selection?selectionAsLayerMask(selection):null;
    },
    current:{blend:layer.blend??{mode:'normal',space:'encoded',seed:parseInt(layer.id.slice(-8),16)>>>0},opacity:layer.opacity},
    preview:choice=>drawing.setLayerBlendPreview(choice?{layerId:layer.id,...choice}:null),
    complete:choice=>{
      if(activeBlend?.dialog!==dialog)return;
      activeBlend=null;
      drawing.setLayerBlendPreview(null);
      if(!choice||surface!==drawing||controller.document!==artwork||!artwork.root.hasLayer(layer.id))return;
      const latest=artwork.root.getLayer(layer.id);
      if(latest.blend!==layer.blend||latest.opacity!==layer.opacity){
        byId('status').textContent='合成設定が変わりました。開き直して調整してください。';
        return;
      }
      changeLayer('レイヤーの合成設定を変更しました。',tx=>{
        const {blend,opacity}=choice;
        const changed=tx.setLayerBlend(layer.id,blend.mode==='normal'&&blend.space==='encoded'&&!blend.tone&&!blend.effect&&!blend.gradientMap?null:blend);
        return tx.setLayerOpacity(layer.id,opacity)||changed;
      });
    },
  });
  activeBlend={dialog,drawing,id:layer.id};
}

let layerCompComparison:{surface:BrushSurface;id:LayerId}|null=null;

function selectedLayerComp(){
  const id=byId<HTMLSelectElement>('layerCompList').value;
  return controller.document.root.layerComps.find(comp=>comp.id===id);
}
function stopLayerCompComparison(){
  layerCompComparison?.surface.setLayerCompPreview(null);
  layerCompComparison=null;
}
function renderLayerComps(){
  const list=byId<HTMLSelectElement>('layerCompList'),previous=list.value,root=controller.document.root;
  const comps=root.layerComps;
  list.replaceChildren(...comps.map(comp=>new Option(comp.name,comp.id)));
  if(comps.some(comp=>comp.id===previous))list.value=previous;
  const comp=selectedLayerComp();
  if(layerCompComparison&&(layerCompComparison.surface!==surface||layerCompComparison.id!==comp?.id))stopLayerCompComparison();
  for(const id of ['layerCompCompare','layerCompApply','layerCompUpdate','layerCompDelete']){
    byId<HTMLButtonElement>(id).disabled=!documentReady||!comp;
  }
  byId<HTMLButtonElement>('layerCompSave').disabled=!documentReady;
  const compare=byId<HTMLButtonElement>('layerCompCompare');
  compare.setAttribute('aria-pressed',String(!!layerCompComparison));
  compare.textContent=layerCompComparison?'比較を終了':'比較';
  const saved=new Set(comp?.layers.map(layer=>layer.id));
  const deleted=comp?.layers.filter(layer=>!root.hasLayer(layer.id)).length??0;
  const added=comp?root.rootLayerIds.filter(id=>!saved.has(id)).length:0;
  const attributes=comp?[comp.saveVisibility?'表示':'',comp.saveOpacity?'不透明度':'',comp.saveBlend?'合成モード':''].filter(Boolean).join('・'):'';
  byId('layerCompStatus').textContent=comp
    ?attributes+(deleted||added?'。削除済み '+deleted+'枚、追加 '+added+'枚は適用対象外。':'')
    :'保存した表示案はありません。';
}
function saveLayerComp(comp?:LayerComp){
  const name=byId<HTMLInputElement>('layerCompName').value.trim();
  const visibility=byId<HTMLInputElement>('layerCompVisibility').checked;
  const opacity=byId<HTMLInputElement>('layerCompOpacity').checked;
  const blend=byId<HTMLInputElement>('layerCompBlend').checked;
  stopLayerCompComparison();
  changeLayer(comp?'表示案を更新しました。':'表示案を保存しました。',tx=>tx.saveLayerComp(name||comp?.name||'',visibility,opacity,comp?.id,blend));
}
function loadLayerCompFields(){
  const comp=selectedLayerComp();
  const name=byId<HTMLInputElement>('layerCompName');
  name.value=comp?.name??'';
  byId<HTMLInputElement>('layerCompVisibility').checked=comp?.saveVisibility??true;
  byId<HTMLInputElement>('layerCompOpacity').checked=comp?.saveOpacity??true;
  byId<HTMLInputElement>('layerCompBlend').checked=comp?!!comp.saveBlend:true;
}

const thumbnails=new LayerThumbnailList([byId('layerPageList'),byId('layerList')]);
function scheduleLayerDrawingThumbnail(){
  const drawing=surface,artwork=controller.document;
  thumbnails.update(drawing&&documentReady&&!app.inert?{
    document:artwork,width:artwork.root.width,height:artwork.root.height,layers:controller.layers,
    busy:()=>drawing.busy||geometryBusy||historyPending,
    read:(id)=>drawing.layerThumbnail(id),
  }:null);
}

let previousLayerListKey:string|null=null;
let previousLayerListDocument:CoreDocument|null=null;
const renderLayers=()=>{
  fillPanel?.refresh();imageLinkPanel?.refresh();rulerPanel?.refresh();
  if(surface)surface.setArtworkGuides(controller.document.root.artworkGuides);
  syncHistoryBrush();
  renderLayerComps();
  updateVectorMaskControls();
  const root=controller.document.root;
  const rows=[...controller.layers].reverse().filter(layer=>!layer.implicitRaster);
  const selectedLayer=controller.selectedLayer,selectedName=selectedLayer.implicitRaster?'最初の一筆で描画レイヤーを作成':selectedLayer.name;
  const hasLayer=documentReady&&!selectedLayer.implicitRaster;
  if(layerBatchDocument!==controller.document){
    layerBatchDocument=controller.document;
    layerBatchMode=false;
    layerBatchAnchor=null;
    layerBatchIds.clear();
    collapsedLayerGroups.clear();
  }
  for(const id of layerBatchIds){
    if(!controller.document.root.hasLayer(id))layerBatchIds.delete(id);
  }
  const soloButton=byId<HTMLButtonElement>('layerSoloToggle'),inspected=surface?.inspectedLayer;
  soloButton.disabled=!hasLayer;
  soloButton.setAttribute('aria-pressed',String(!!inspected));
  soloButton.textContent=inspected?'単独表示を解除':'選択レイヤーだけ表示';
  byId('layerSoloStatus').textContent=inspected?inspected.name+'を単独表示中':'';
  const batchButton=byId<HTMLButtonElement>('layerBatchToggle');
  batchButton.disabled=!hasLayer;
  batchButton.setAttribute('aria-pressed',String(layerBatchMode));
  byId('layerBatchActions').hidden=!layerBatchMode;
  byId('layerBatchCount').textContent=layerBatchIds.size+'枚を選択';
  byId('layerBatchCount').hidden=!layerBatchMode;
  const clipControl=byId<HTMLButtonElement>('layerClipping'),clip=root.clippingSource(selectedLayer.id);
  clipControl.textContent=selectedLayer.clipSourceId?'クリッピングを解除':'下の絵でクリップ';
  clipControl.setAttribute('aria-pressed',String(!!selectedLayer.clipSourceId));
  clipControl.disabled=!documentReady||(!selectedLayer.clipSourceId&&!root.availableClippingSource(selectedLayer.id));
  byId('layerClippingStatus').textContent=clip?'クリップ元 '+clip.name:selectedLayer.clipSourceId?'クリッピング元が見つかりません。':'';
  const alphaLock=byId<HTMLButtonElement>('layerAlphaLock');
  alphaLock.disabled=!hasLayer||selectedLayer.baseColor==='white';
  alphaLock.textContent=selectedLayer.alphaLocked?'不透明度ロックを解除':'不透明度をロック';
  alphaLock.setAttribute('aria-pressed',String(!!selectedLayer.alphaLocked));
  const fullLock=byId<HTMLButtonElement>('layerFullLock');
  fullLock.disabled=!hasLayer;
  fullLock.textContent=selectedLayer.locked?'レイヤー全体のロックを解除':'レイヤー全体をロック';
  fullLock.setAttribute('aria-pressed',String(selectedLayer.locked));
  const contentLock=byId<HTMLButtonElement>('layerContentLock');
  contentLock.disabled=!hasLayer||root.isLayerLocked(selectedLayer.id);
  contentLock.textContent=selectedLayer.contentLocked?'内容のロックを解除':'内容をロック';
  contentLock.setAttribute('aria-pressed',String(!!selectedLayer.contentLocked));
  const positionLock=byId<HTMLButtonElement>('layerPositionLock');
  positionLock.disabled=!hasLayer;
  positionLock.textContent=selectedLayer.positionLocked?'位置ロックを解除':'位置をロック';
  positionLock.setAttribute('aria-pressed',String(!!selectedLayer.positionLocked));
  byId<HTMLButtonElement>('pickLayerOnCanvas').disabled=!rows.length||!documentReady;
  byId<HTMLButtonElement>('duplicateLayer').disabled=!hasLayer;
  byId<HTMLButtonElement>('flattenLayerCopy').disabled=!documentReady||!visibleLayerIds().size;
  byId<HTMLButtonElement>('mergeVisibleLayers').disabled=!documentReady||visibleLayerIds().size<2;
  byId<HTMLButtonElement>('mergeLayerDown').disabled=!documentReady||!rows[rows.indexOf(selectedLayer)+1];
  byId<HTMLButtonElement>('layerBatchMerge').disabled=!documentReady||layerBatchIds.size<2;
  byId<HTMLButtonElement>('deleteLayer').disabled=!documentReady||root.isLayerLocked(selectedLayer.id)||!rows.some(layer=>layer.id!==selectedLayer.id&&layer.baseColor!=='white');
  byId<HTMLButtonElement>('layerBatchDelete').disabled=!documentReady||!layerBatchIds.size||[...layerBatchIds].some(id=>root.isLayerLocked(id))||!rows.some(layer=>!layerBatchIds.has(layer.id)&&layer.baseColor!=='white');
  byId<HTMLButtonElement>('layerGroupSelected').disabled=!hasLayer||selectedLayer.baseColor==='white';
  byId<HTMLButtonElement>('layerBatchGroup').disabled=!documentReady||!layerBatchIds.size;
  byId<HTMLButtonElement>('layerBatchDestination').disabled=!documentReady||!layerBatchIds.size||!root.layerGroups.length;
  byId<HTMLButtonElement>('layerDestination').disabled=!documentReady||!root.layerGroups.length||root.isLayerPositionLocked(selectedLayer.id)||selectedLayer.baseColor==='white';
  for(const id of ['layerBatchShow','layerBatchHide','layerBatchLock','layerBatchUnlock']){
    byId<HTMLButtonElement>(id).disabled=!documentReady||!layerBatchIds.size;
  }
  const query=byId<HTMLInputElement>('layerSearch').value.trim().toLocaleLowerCase();
  const tagFilter=byId<HTMLSelectElement>('layerTagFilter').value;
  const kindFilter=byId<HTMLSelectElement>('layerKindFilter').value;
  const filtering=!!(query||tagFilter||kindFilter);
  const tagField=byId<HTMLSelectElement>('selectedLayerTag');
  tagField.value=selectedLayer.colorTag??'';
  tagField.disabled=!hasLayer;
  clearLayerOpacityPreview();
  const opacity=byId<HTMLInputElement>('layerOpacity');
  opacity.value=String(Math.round(selectedLayer.opacity*100));
  opacity.disabled=!hasLayer;
  byId('layerOpacityValue').textContent=opacity.value+'%';
  const nameField=byId<HTMLInputElement>('selectedLayerName');
  if(document.activeElement!==nameField||nameField.dataset.layerId!==selectedLayer.id)nameField.value=selectedName;
  nameField.dataset.layerId=selectedLayer.id;
  nameField.disabled=!hasLayer;
  const selectedIndex=rows.findIndex(layer=>layer.id===selectedLayer.id);
  const sameParent=(a:LayerId,b:LayerId)=>root.groupsForLayer(a).at(-1)?.id===root.groupsForLayer(b).at(-1)?.id;
  const blendChoice=byId<HTMLSelectElement>('layerBlendChoice');
  const blendButton=byId<HTMLButtonElement>('layerBlendMode');
  blendButton.disabled=!hasLayer||selectedLayer.baseColor==='white';
  const blendName=layerBlendNames[selectedLayer.blend?.mode??'normal'];
  blendChoice.disabled=blendButton.disabled||root.isLayerLocked(selectedLayer.id);
  blendChoice.value=selectedLayer.blend?.mode??'normal';
  blendButton.setAttribute('aria-label','合成モード '+blendName);
  if(activeBlend?.dialog.open&&(!documentReady||activeBlend.drawing!==surface||activeBlend.id!==selectedLayer.id))activeBlend.dialog.close('cancel');
  const canMove=hasLayer&&!layerBatchMode&&!filtering&&!root.isLayerPositionLocked(selectedLayer.id)&&selectedLayer.baseColor!=='white';
  for(const direction of [-1,1] as const){
    const id=direction===1?'layerBatchUp':'layerBatchDown';
    const selected=rows.filter(layer=>layerBatchIds.has(layer.id));
    const movable=selected.length>0&&selected.every(layer=>!root.isLayerPositionLocked(layer.id)&&layer.baseColor!=='white');
    const hasRoom=rows.some((layer,index)=>{
      const adjacent=rows[index-direction];
      return layerBatchIds.has(layer.id)&&adjacent&&!layerBatchIds.has(adjacent.id)&&adjacent.baseColor!=='white'&&sameParent(layer.id,adjacent.id);
    });
    byId<HTMLButtonElement>(id).disabled=!documentReady||filtering||!movable||!hasRoom;
  }
  const previous=rows[selectedIndex-1],next=rows[selectedIndex+1];
  byId<HTMLButtonElement>('moveLayerUp').disabled=!canMove||!previous||previous.baseColor==='white'||!sameParent(selectedLayer.id,previous.id);
  byId<HTMLButtonElement>('moveLayerDown').disabled=!canMove||!next||next.baseColor==='white'||!sameParent(selectedLayer.id,next.id);
  const nextLayerListKey=layerListSignature({
    documentId:root.documentId,
    selectedId:selectedLayer.id,documentReady,
    batchMode:layerBatchMode,batchIds:[...layerBatchIds].sort(),
    collapsedGroups:[...collapsedLayerGroups].sort(),
    query,tagFilter,kindFilter,
    groups:root.layerGroups.map(group=>[group.id,group.name,group.members,group.visible,group.locked,group.compositing]),
    rows:rows.map(layer=>[
      layer.id,layer.name,layer.kind,layer.baseColor,layer.visible,layer.locked,
      layer.contentLocked,layer.positionLocked,layer.alphaLocked,layer.colorTag,
      layer.opacity,layer.vectorMask?.enabled,layer.vectorMask?.shape,layer.vectorMask?.linked,
      layer.deformation?.enabled,layer.deformation?.mode,!!layer.blend?.effect,
      layer.imageLink?.kind,layer.imageLink?.kind==='linked'?layer.imageLink.fileKey:undefined,
      layer.imageLink?.kind==='instance'?layer.imageLink.sourceId:undefined,layer.imageLink?.digest,
      layer.blend?.mode,layer.clipSourceId,
      root.isLayerVisible(layer.id),root.isLayerLocked(layer.id),
      root.isLayerContentLocked(layer.id),root.isLayerPositionLocked(layer.id),
      root.groupsForLayer(layer.id).map(group=>group.id),
    ]),
  });
  // Ink-only revisions keep the same layer metadata; avoid allocating hundreds
  // of buttons and destroying touch/focus state after every completed brush stroke.
  if(previousLayerListDocument!==controller.document||previousLayerListKey!==nextLayerListKey){
    previousLayerListDocument=controller.document;previousLayerListKey=nextLayerListKey;
  for(const id of ['layerList','layerPageList']){
    const list=byId<HTMLDivElement>(id);
    const matching=id==='layerPageList'?rows.filter(layer=>{
      const tagMatches=!tagFilter||(layer.colorTag??'none')===tagFilter;
      const kind=layer.baseColor==='white'?'background':layer.kind;
      return tagMatches&&(!kindFilter||kindFilter===kind)&&layer.name.toLocaleLowerCase().includes(query);
    }):rows;
    if(id==='layerPageList'){
      byId('layerPageSelected').textContent=selectedName+(matching.includes(selectedLayer)?'':'（絞り込みで一覧に表示されていません）');
    }
    const seenGroups=new Set<LayerId>();
    const entries:HTMLElement[]=[];
    if(id==='layerPageList'&&kindFilter==='group'){
      for(const layer of rows){
        if(tagFilter&&(layer.colorTag??'none')!==tagFilter)continue;
        for(const [depth,group] of root.groupsForLayer(layer.id).entries()){
          if(seenGroups.has(group.id)||!group.name.toLocaleLowerCase().includes(query))continue;
          seenGroups.add(group.id);entries.push(groupLayerRow(group,depth));
        }
      }
    }
    for(const layer of matching){
      const groups=root.groupsForLayer(layer.id);
      if(id==='layerPageList'){
        for(const [depth,group] of groups.entries()){
          if(!seenGroups.has(group.id)){
            entries.push(groupLayerRow(group,depth));
            seenGroups.add(group.id);
          }
          if(!filtering&&collapsedLayerGroups.has(group.id))break;
        }
        if(!filtering&&groups.some(group=>collapsedLayerGroups.has(group.id)))continue;
      }
      const selected=layer.id===controller.selectedLayerId,row=document.createElement('button'),name=document.createElement('span'),state=document.createElement('span');
      const batchRow=id==='layerPageList'&&layerBatchMode;
      const batchSelected=batchRow&&layerBatchIds.has(layer.id);
      const effectiveLocked=root.isLayerLocked(layer.id),effectiveVisible=root.isLayerVisible(layer.id);
      row.type='button';row.className='layer-row';row.dataset.layerId=layer.id;
      row.setAttribute('aria-pressed',String(batchRow?batchSelected:selected));row.setAttribute('aria-label',layer.name+(batchRow?(batchSelected?'、まとめて操作する対象':''):(selected?'、選択中':'')));
      name.className='layer-name';name.textContent=layer.name;
      if(layer.colorTag){
        row.dataset.colorTag=layer.colorTag;
        row.setAttribute('aria-label',(row.getAttribute('aria-label')??layer.name)+'、'+layerTagNames[layer.colorTag]+'タグ');
      }
      state.className='layer-state';state.textContent=[batchSelected?'操作対象':'',selected?'描画先':'',effectiveLocked?'全体ロック中':'',layer.contentLocked?'内容ロック中':'',layer.positionLocked?'位置ロック中':'',layer.alphaLocked?'不透明度ロック中':'',...layerEditingStates(layer),layer.blend?.effect?'色の効果':'',layer.clipSourceId?(root.clippingSource(layer.id)?'クリップ中':'クリップ元なし'):'',effectiveVisible?'':'非表示'].filter(Boolean).join('・');
      const thumb=document.createElement('span'),preview=document.createElement('canvas');
      thumb.className='layer-preview';
      preview.width=preview.height=96;
      preview.dataset.thumbnailLayer=layer.id;
      const location=document.createElement('span');location.className='layer-preview-position';location.hidden=true;
      location.append(document.createElement('i'));thumb.append(preview,location);thumb.setAttribute('aria-hidden','true');
      const description=document.createElement('span');description.className='layer-description';description.append(name);
      if(effectiveLocked||layer.contentLocked||layer.positionLocked||layer.alphaLocked){
        const locked=document.createElement('span');locked.className='layer-lock-indicator';locked.innerHTML=icon('lock');description.append(locked);
      }
      const rename=document.createElement('button');
      rename.type='button';rename.className='layer-inline-name';rename.append(description);
      rename.title=layer.name+'の名前を変更';
      rename.disabled=layer.baseColor==='white'||effectiveLocked||!documentReady;
      rename.onclick=()=>{
        if(batchRow){row.click();return;}
        if(!selected)row.click();
        const liveList=byId(id),liveRow=liveList.querySelector<HTMLButtonElement>(`[data-layer-id="${layer.id}"]`);
        const liveButton=liveRow?.parentElement?.querySelector<HTMLButtonElement>('.layer-inline-name');
        if(!liveButton||liveButton.disabled)return;
        const field=document.createElement('input');
        field.type='text';field.className='layer-inline-name';field.value=layer.name;field.maxLength=4096;
        field.setAttribute('aria-label','レイヤー名');
        let done=false;
        const finish=(save:boolean)=>{
          if(done)return;done=true;
          const value=field.value.trim();
          field.replaceWith(liveButton);
          if(save&&value&&value!==layer.name)
            changeLayer('レイヤー名を変更しました。',tx=>tx.renameLayer(layer.id,value));
        };
        field.onkeydown=event=>{
          if(event.key!=='Enter'&&event.key!=='Escape')return;
          event.preventDefault();event.stopPropagation();finish(event.key==='Enter');
          liveList.querySelector(`[data-layer-id="${layer.id}"]`)?.parentElement?.querySelector<HTMLButtonElement>('.layer-inline-name')?.focus();
        };
        field.onblur=()=>finish(true);
        liveButton.replaceWith(field);field.focus();field.select();
      };
      if(batchRow)rename.disabled=false;
      row.append(thumb);
      if(state.textContent){
        row.title=state.textContent;
        row.setAttribute('aria-label',(row.getAttribute('aria-label')??layer.name)+'、'+state.textContent.replaceAll('・','、'));
      }
      row.onclick=event=>{
        if(batchRow){
          selectLayerForBatch(layer.id,matching,event.shiftKey);
          return;
        }
        if(layer.baseColor==='white'&&layer.visible&&!layer.locked){
          void materializeAndSelectWhiteLayer(layer.id).catch(showStorageError);
          return;
        }
        try{controller.selectLayer(layer.id);if(!qaMode)void persistence.selectWorkLayer(layer.id).catch(showStorageError);renderLayers();byId('status').textContent=layer.name+(root.isLayerContentLocked(layer.id)?'を選びました。内容はロック中です。':effectiveVisible?'を選びました。次の線はこのレイヤーに入ります。':'を選びました。描くにはレイヤーを表示してください。');updateHistoryButtons();updateQa();}
        catch{byId('status').textContent='そのレイヤーを選択できませんでした。';}
      };
      const entry=document.createElement('div');
      entry.className='layer-entry';
      if(id==='layerPageList'&&groups.length)entry.style.marginInlineStart=Math.min(groups.length,8)*10+'px';
      entry.dataset.layerDrop=layer.id;
      const grip=document.createElement('button');
      grip.type='button';grip.className='layer-grip';grip.innerHTML=icon('grip');
      grip.setAttribute('aria-label',layer.name+'の順番を変更');grip.title='ドラッグ、または上下の矢印キーで移動';
      grip.disabled=!documentReady||layerBatchMode||filtering||layer.baseColor==='white'||root.isLayerPositionLocked(layer.id);
      if(!grip.disabled)bindLayerReorder(grip,list,entry,target=>{
        if(target.dataset.groupDrop){
          const group=root.layerGroups.find(group=>group.id===target.dataset.groupDrop);
          return !!group&&!group.members.includes(layer.id)&&!group.locked;
        }
        const id=target.dataset.layerDrop as LayerId;
        return root.hasLayer(id)&&root.getLayer(id).baseColor!=='white'&&sameParent(layer.id,id);
      },target=>{
        if(target.dataset.groupDrop){
          const groupId=target.dataset.groupDrop as LayerId;
          changeLayer('レイヤーをグループに移動しました。',tx=>tx.moveLayersIntoGroup(new Set([layer.id]),groupId));
        }else{
          const index=root.rootLayerIds.indexOf(target.dataset.layerDrop as LayerId);
          changeLayer('レイヤーの順番を変更しました。',tx=>tx.moveRasterLayerTo(layer.id,index));
        }
      },direction=>{
        const neighbor=rows[rows.indexOf(layer)-direction];
        if(!neighbor||neighbor.baseColor==='white'||!sameParent(layer.id,neighbor.id))return;
        changeLayer('レイヤーの順番を変更しました。',tx=>tx.moveRasterLayer(layer.id,direction));
        list.querySelector<HTMLButtonElement>(`[data-layer-drop="${layer.id}"] .layer-grip`)?.focus();
      });
      const visibility=document.createElement('button'),lock=document.createElement('button');
      visibility.type=lock.type='button';
      visibility.innerHTML=icon(effectiveVisible?'eye':'eyeOff');
      visibility.title=layer.visible?'非表示にする':'表示する';
      lock.innerHTML=icon('lock');lock.setAttribute('aria-pressed',String(Boolean(layer.locked)));
      lock.title=layer.locked?'ロックを解除':'ロック';
      lock.disabled=!documentReady||layer.baseColor==='white';
      visibility.setAttribute('aria-label',layer.name+(layer.visible?'を非表示にする':'を表示する'));
      lock.setAttribute('aria-label',layer.name+(layer.locked?'のロックを解除する':'をロックする'));
      visibility.onclick=()=>{
        changeLayer(layer.visible?'レイヤーを非表示にしました。':'レイヤーを表示しました。',tx=>tx.setLayerVisibility(layer.id,!layer.visible));
        list.querySelector<HTMLButtonElement>(`[data-layer-id="${layer.id}"]`)?.parentElement?.querySelector<HTMLButtonElement>('.layer-visibility')?.focus();
      };
      lock.onclick=()=>{
        changeLayer(layer.locked?'レイヤーのロックを解除しました。':'レイヤーをロックしました。',tx=>tx.setLayerLocked(layer.id,!layer.locked));
        list.querySelector<HTMLButtonElement>(`[data-layer-id="${layer.id}"]`)?.parentElement?.querySelector<HTMLButtonElement>('.layer-lock')?.focus();
      };
      visibility.className='layer-visibility';
      lock.className='layer-lock';
      const editingTargets=id==='layerPageList'&&selected&&!layerBatchMode?layerEditingTargets(layer):[];
      if(editingTargets.length){
        const shortcuts=document.createElement('div');shortcuts.className='layer-edit-shortcuts';
        const buttons=editingTargets.map(item=>{
          const edit=document.createElement('button');
          edit.type='button';edit.className='layer-edit-shortcut';edit.textContent=item.label;
          edit.setAttribute('aria-label',layer.name+'の'+item.label+'設定を開く');
          edit.onclick=()=>{
            // Reuse the normal layer selection first. In batch mode these
            // buttons do not exist, so a shortcut never mutates a batch.
            row.click();
            if(controller.selectedLayerId!==layer.id)return;
            const box=item.kind==='mask'?'layersBox':'documentBox';
            if(item.kind==='mask')shellUi.setLayerPage(true);else shellUi.openBox(box);
            const destination=item.kind==='mask'
              ?byId<HTMLDetailsElement>('layerVectorMask')
              :byId(box+'Body').querySelector<HTMLDetailsElement>(
                '[data-edit-panel="'+item.kind+'"]');
            if(!destination){
              byId('status').textContent='この設定を開けませんでした。レイヤーを選んで設定画面から開いてください。';
              return;
            }
            destination.dispatchEvent(new Event('illustro:open-layer-settings'));
            destination.open=true;
            destination.scrollIntoView({block:'nearest'});
            destination.querySelector<HTMLElement>('summary')?.focus({preventScroll:true});
          };
          return edit;
        });
        shortcuts.append(...buttons);entry.append(visibility,row,rename,lock,grip,shortcuts);
      }else entry.append(visibility,row,rename,lock,grip);
      entries.push(entry);
    }
    const scrollTop=list.scrollTop;
    list.replaceChildren(...entries);
    list.scrollTop=scrollTop;
    if(!entries.length)list.textContent=selectedLayer.implicitRaster?'ひと筆描くとレイヤーができます。':'一致するレイヤーがありません。';
  }
  }
  scheduleLayerDrawingThumbnail();
  updateContextBar();
  byId('layersBoxSummary').textContent=selectedName;
  byId('documentBoxSummary').textContent=controller.document.root.width+'×'+controller.document.root.height;
};

function updateHistoryButtons(){
  const ready=!!surface&&documentReady,blocked=!ready||geometryBusy||(surface?.inputActive===true&&!historyPending)||!!historyNavigation?.diagnostics.fault;
  byId<HTMLButtonElement>('undo').disabled=blocked||!(surface?.canUndo||historyPending);
  byId<HTMLButtonElement>('compactUndo').disabled=blocked||!(surface?.canUndo||historyPending);
  byId<HTMLButtonElement>('redo').disabled=blocked||!(surface?.canRedo||historyPending);
  byId<HTMLButtonElement>('compactRedo').disabled=blocked||!(surface?.canRedo||historyPending);
  const name=(label:string|null|undefined)=>label==='Brush stroke'?'描画':label==='Add raster layer'?'レイヤーを追加':label;
  const undoLabel=name(controller.document.currentRevision.command?.label);
  const redoLabel=name(controller.document.nextRedoLabel);
  for(const button of historyButtons())button.setAttribute('aria-busy',String(historyPending));
  for(const id of ['undo','compactUndo'])byId(id).title=undoLabel?'元に戻す · '+undoLabel:'元に戻す';
  for(const id of ['redo','compactRedo'])byId(id).title=redoLabel?'やり直す · '+redoLabel:'やり直す';
}
function updatePersistenceDisplay(){
  const state=persistenceState,indicator=byId('saveState'),inputPending=historyPending||(surface?.hasUncommittedInput??false);
  if(!state){indicator.textContent='自動保存準備中';return;}
  indicator.textContent=state.storageError?'保存できません・再試行してください':inputPending||state.protectionPending||state.queueLength>0?'アプリ内に保存中':qaMode?'自動保存済み':documentReady?'アプリ内に保存済み':'作品はまだ開かれていません';
  const retry=document.getElementById('retryWorkSave');if(retry)retry.hidden=!state.storageError;
  const rescue=document.getElementById('rescueWorkSave');if(rescue)rescue.hidden=!state.storageError||!documentReady;
  if(state.storageError&&state.queueLength)indicator.textContent='保存待ち '+state.queueLength+'件。再試行または作品ファイルに救出できます。';
  indicator.dataset.autosavePending=String(inputPending||state.protectionPending||state.queueLength>0);indicator.dataset.saving=String(state.saving||librarySaving);indicator.dataset.protectedThrough=state.protectedThrough;
  const homeSaveState=document.getElementById('ihHomeSaveState');
  if(homeSaveState){
    const pending=inputPending||state.protectionPending||state.queueLength>0;
    homeSaveState.hidden=!documentReady||(!pending&&!state.storageError);
    homeSaveState.textContent=state.storageError?'保存できませんでした。開いているキャンバスに戻り、保存を再試行してください。':'作品を安全に保存しています。完了するまではこのページを閉じないでください。';
  }
  byId<HTMLButtonElement>('recover').disabled=!recoveryCandidates.some(candidate=>BigInt(candidate.protectedThrough)>0n);
}


if(qaMode){document.addEventListener('pointerdown',e=>{const canvas=byId<HTMLCanvasElement>('canvas'),target=e.target instanceof HTMLElement?e.target:null;canvas.dataset.lastPointerTarget=target?.id||target?.tagName.toLowerCase()||'unknown';canvas.dataset.lastPointerType=e.pointerType;canvas.dataset.lastPointerX=String(Math.round(e.clientX));canvas.dataset.lastPointerY=String(Math.round(e.clientY));queueMicrotask(updateQa);},{capture:true});}
const updateQa=()=>{
  const canvas=byId<HTMLCanvasElement>('canvas'),selected=controller.selectedLayer;
  canvas.dataset.commit=import.meta.env.VITE_COMMIT_SHA??'unknown';canvas.dataset.documentId=controller.document.root.documentId;canvas.dataset.documentName=controller.document.root.name;canvas.dataset.documentDpi=String(controller.document.root.metadata.dpi??72);canvas.dataset.documentWidth=String(controller.document.root.width);canvas.dataset.documentHeight=String(controller.document.root.height);canvas.dataset.backend=surface?.backend??'';canvas.dataset.view=JSON.stringify(surface?.viewState??null);canvas.dataset.committedStrokes=String(controller.committedStrokeCount);canvas.dataset.revisionId=controller.document.head;canvas.dataset.dirtyTiles=String(controller.lastCommit?.dirtyTileCount??0);
  canvas.dataset.layerCount=String(controller.layers.length);canvas.dataset.selectedLayerId=controller.selectedLayerId;canvas.dataset.selectedLayerName=selected.name;
  canvas.dataset.canUndo=String(surface?.canUndo??controller.canUndo);canvas.dataset.canRedo=String(surface?.canRedo??controller.canRedo);canvas.dataset.historyBusy=String(historyPending||surface?.busy===true);canvas.dataset.historyPatchHits=String(surface?.historyPatchHits??0);canvas.dataset.historyReplayFallbacks=String(surface?.historyReplayFallbacks??0);canvas.dataset.selectedTool=selectedTool;canvas.dataset.selectedPresetId=surface?.brushId??'未選択';canvas.dataset.selectedBlend=surface?.blendMode??'normal';canvas.dataset.eraserStrokes=String(controller.committedEraserStrokeCount);
  if(!qaMode)return;
  const data={display:surface?.displayDiagnostics??null,milestone:m09Mode?'M09':m08Mode?'M08':'M07',commit:(import.meta.env.VITE_COMMIT_SHA??'unknown'),backend:surface?.backend??'未取得',backendSelection:surface?.backendSelection??null,initializationError:surface?.initializationError??null,viewport:`${innerWidth}x${innerHeight}`,userAgent:navigator.userAgent,
    selectedTool,selectedPresetId:surface?.brushId??'未選択',selectedPresetName:surface?.brushName??'未選択',blendMode:surface?.blendMode??'normal',eraserType:surface?.eraserType,size:surface?.brushSize??0,
    layerCount:controller.layers.length,selectedLayerId:controller.selectedLayerId,selectedLayerName:selected.name,currentRevision:controller.document.head,canUndo:surface?.canUndo??controller.canUndo,canRedo:surface?.canRedo??controller.canRedo,
    seamlessCopyCount:controller.document.currentRevision.command?.operations.filter(op=>op.parameters.seamlessCopy===true).length??0,undoCount,redoCount,blockedHistoryGhostClicks,eraserCommittedStrokeCount:controller.committedEraserStrokeCount,totalStrokeCount:controller.committedStrokeCount,committedStrokeCount:controller.committedStrokeCount,historyPatchHits:surface?.historyPatchHits??0,historyReplayFallbacks:surface?.historyReplayFallbacks??0,rendererDesynchronized:surface?.rendererDesynchronized??false,rendererAlpha:surface?.rendererAlpha??false,rendererPremultipliedAlpha:surface?.rendererPremultipliedAlpha??false,rendererArtworkAlpha:surface?.rendererArtworkAlpha??false,presentationOpaque:surface?.presentationOpaque??false,presentationMode:surface?.presentationMode??'未取得',presentationAlpha:surface?.presentationAlpha??null,presentationDesynchronized:surface?.presentationDesynchronized??null,presentationFrames:surface?.presentationFrames??0,presentationLastAt:surface?.presentationLastAt??0,projectionRestoreMs:surface?.projectionRestoreMs??0,projectionRestoreMode:surface?.projectionRestoreMode??'none',projectionCacheRevision:surface?.projectionCacheRevision??null,browserPredictionSamples:surface?.browserPredictionSamples??0,
    lastInputTarget:canvas.dataset.lastPointerTarget??'まだ入力なし',lastInputType:canvas.dataset.lastPointerType??'—',lastInputPoint:canvas.dataset.lastPointerX&&canvas.dataset.lastPointerY?`${canvas.dataset.lastPointerX},${canvas.dataset.lastPointerY}`:'—',
    activeElement:document.activeElement instanceof HTMLElement?(document.activeElement.id||document.activeElement.tagName.toLowerCase()):'unknown',workspaceOpen:!workspace.inert,workspaceDisplay:getComputedStyle(workspace).display,
    visualViewport:window.visualViewport?{width:Math.round(window.visualViewport.width),height:Math.round(window.visualViewport.height),offsetTop:Math.round(window.visualViewport.offsetTop),offsetLeft:Math.round(window.visualViewport.offsetLeft),scale:window.visualViewport.scale}:null,
    export:{last:lastExport,error:exportError,busy:exportBusy,count:exportCount},layers:controller.layers.map(layer=>({id:layer.id,surfaceId:layer.surface.descriptor.surfaceId,name:layer.name,committedStrokes:controller.strokeCountForLayer(layer.id)})),documentId:controller.document.root.documentId,documentMetadata:controller.document.root.metadata,writerEpoch:controller.document.writerEpochId,commitSequence:controller.document.commitSequence.toString(),persistence:persistenceState,autosaveCheckpoint:{operationInterval:CHECKPOINT_OPERATION_INTERVAL,idleMs:CHECKPOINT_IDLE_MS,opsSinceLast:checkpointOpsSinceLast,fullSeedPending:checkpointNeedsFullSeed,lastCheckpointAt,cancelled:checkpointCancelled,errors:checkpointErrors},qaStartedAt};
  byId('qaAuto').textContent=JSON.stringify(data,null,2);
};
byId<HTMLInputElement>('layerSearch').oninput=renderLayers;
byId<HTMLSelectElement>('layerCompList').onchange=()=>{
  stopLayerCompComparison();
  loadLayerCompFields();
  renderLayerComps();
};
byId<HTMLButtonElement>('layerCompCompare').onclick=()=>{
  const comp=selectedLayerComp(),drawing=surface;
  if(!comp||!drawing||drawing.busy||geometryBusy||historyPending)return;
  if(layerCompComparison)stopLayerCompComparison();
  else{
    drawing.setSoloLayer(null);
    drawing.setLayerCompPreview(comp);
    layerCompComparison={surface:drawing,id:comp.id};
  }
  renderLayers();
};
byId<HTMLButtonElement>('layerCompSave').onclick=()=>saveLayerComp();
byId<HTMLButtonElement>('layerCompUpdate').onclick=()=>{
  const comp=selectedLayerComp();
  if(comp)saveLayerComp(comp);
};
byId<HTMLButtonElement>('layerCompApply').onclick=()=>{
  const comp=selectedLayerComp();
  if(!comp)return;
  stopLayerCompComparison();
  changeLayer('表示案を適用しました。',tx=>tx.applyLayerComp(comp.id));
};
byId<HTMLButtonElement>('layerCompDelete').onclick=async()=>{
  const comp=selectedLayerComp();
  if(!comp||!await appConfirm(comp.name+'を削除しますか？'))return;
  stopLayerCompComparison();
  changeLayer('表示案を削除しました。',tx=>tx.deleteLayerComp(comp.id));
};
byId<HTMLButtonElement>('layerSoloToggle').onclick=()=>{
  if(!surface||!documentReady||geometryBusy||historyPending)return;
  if(surface.busy){
    byId('status').textContent='描画が終わってから単独表示を切り替えてください。';
    return;
  }
  stopLayerCompComparison();
  surface.setSoloLayer(surface.inspectedLayer?null:controller.selectedLayerId);
  renderLayers();
};

byId<HTMLButtonElement>('layerBatchToggle').onclick=()=>{
  layerBatchMode=!layerBatchMode;
  if(layerBatchMode&&byId('layerActionsMenu').matches(':popover-open'))byId('layerActionsMenu').hidePopover();
  layerBatchIds.clear();
  layerBatchAnchor=null;
  renderLayers();
};
byId<HTMLButtonElement>('layerBlendMode').onclick=editLayerBlend;
const blendChoice=byId<HTMLSelectElement>('layerBlendChoice');
blendChoice.replaceChildren(...LAYER_BLEND_MODES.map(mode=>new Option(layerBlendNames[mode],mode)));
blendChoice.onchange=()=>{
  const layer=controller.selectedLayer,mode=blendChoice.value as LayerBlendMode;
  if(!LAYER_BLEND_MODES.includes(mode)||blendChoice.disabled)return;
  changeLayer('合成モードを'+layerBlendNames[mode]+'に変更しました。',tx=>tx.setLayerBlend(layer.id,{
    ...(layer.blend??{space:'encoded',seed:parseInt(layer.id.slice(-8),16)>>>0}),mode,
  }));
};
byId<HTMLButtonElement>('pickLayerOnCanvas').onclick=()=>pickLayerOnCanvas();
byId<HTMLSelectElement>('vectorMaskShape').onchange=updateVectorMaskControls;
byId<HTMLButtonElement>('vectorMaskFromSelection').onclick=async()=>{
  const drawing=surface,layer=controller.selectedLayer,root=controller.document.root;
  const rect=drawing?.selectedRectangle??null,mode=byId<HTMLSelectElement>('vectorMaskShape').value;
  const selection=c06Selection?.active()??null;
  if(!documentReady||!drawing||layer.implicitRaster||layer.baseColor==='white'||root.isLayerContentLocked(layer.id)||
    !selectionCanCreateMask(mode,rect,selection,root.width,root.height)){
    byId('status').textContent='マスクにする選択範囲がありません。選択を作成してから操作してください。';
    return;
  }
  const mask:LayerMask=mode==='selection'&&selection?selectionAsLayerMask(selection):{
    ...rect!,shape:mode==='ellipse'?'ellipse':'rectangle',density:1,enabled:true,inverted:false,linked:true
  };
  if(!(await replaceMaskAllowed(mask.shape)))return;
  stopMaskEditing();
  changeLayer('選択範囲からマスクを作成しました。',tx=>tx.setVectorLayerMask(layer.id,mask));
};
byId<HTMLButtonElement>('pixelMaskAdd').onclick=()=>startMaskEditing('pixels');
byId<HTMLButtonElement>('maskPathEdit').onclick=()=>startMaskEditing('path');
byId<HTMLButtonElement>('maskPointEdit').onclick=startMaskPointEditing;
byId<HTMLButtonElement>('maskThumbnail').onclick=()=>{
  const mask=controller.selectedLayer.vectorMask;
  if(mask?.shape==='pixels')startMaskEditing('pixels');
  else if(mask?.shape==='path')startMaskPointEditing();
  else if(mask)startMaskEditing('path');
};
byId<HTMLButtonElement>('maskInspectOnly').onclick=()=>inspectSelectedMask('grayscale');
byId<HTMLButtonElement>('maskInspectRed').onclick=()=>inspectSelectedMask('red');
byId<HTMLButtonElement>('doneMaskInspection').onclick=()=>{
  stopMaskInspection();updateVectorMaskControls();
};
byId<HTMLButtonElement>('maskPaintHide').onclick=()=>startMaskEditing('pixels');
byId<HTMLButtonElement>('maskPaintReveal').onclick=()=>startMaskEditing('pixels',true);
byId<HTMLButtonElement>('doneMaskEditing').onclick=()=>{
  stopMaskEditing();updateVectorMaskControls();byId('status').textContent='絵を編集できます。';
};
byId<HTMLInputElement>('vectorMaskEnabled').onchange=event=>modifyVectorMask({enabled:(event.currentTarget as HTMLInputElement).checked});
byId<HTMLInputElement>('maskLinked').onchange=event=>modifyVectorMask({linked:(event.currentTarget as HTMLInputElement).checked});
byId<HTMLInputElement>('vectorMaskInverted').onchange=event=>modifyVectorMask({inverted:(event.currentTarget as HTMLInputElement).checked});
byId<HTMLInputElement>('vectorMaskDensity').onchange=event=>modifyVectorMask({density:Number((event.currentTarget as HTMLInputElement).value)/100});
byId<HTMLButtonElement>('vectorMaskApply').onclick=()=>{void applyVectorMask();};
byId<HTMLButtonElement>('vectorMaskRemove').onclick=()=>{
  stopMaskEditing();
  changeLayer('マスクを外しました。',tx=>tx.setVectorLayerMask(controller.selectedLayerId,null));
};
byId<HTMLButtonElement>('layerClipping').onclick=()=>{
  const layer=controller.selectedLayer;
  changeLayer(layer.clipSourceId?'クリッピングを解除しました。':'クリッピングを設定しました。',tx=>tx.setLayerClipping(layer.id,!layer.clipSourceId));
};
byId<HTMLButtonElement>('layerAlphaLock').onclick=()=>{
  const layer=controller.selectedLayer;
  changeLayer(layer.alphaLocked?'不透明度のロックを解除しました。':'不透明度をロックしました。',tx=>tx.setLayerAlphaLocked(layer.id,!layer.alphaLocked));
};
byId<HTMLButtonElement>('layerFullLock').onclick=()=>{
  const layer=controller.selectedLayer;
  changeLayer(layer.locked?'レイヤーのロックを解除しました。':'レイヤーをロックしました。',tx=>tx.setLayerLocked(layer.id,!layer.locked));
};
byId<HTMLButtonElement>('layerContentLock').onclick=()=>{
  const layer=controller.selectedLayer;
  changeLayer(layer.contentLocked?'内容のロックを解除しました。':'レイヤーの内容をロックしました。',tx=>tx.setLayerContentLocked(layer.id,!layer.contentLocked));
};
byId<HTMLButtonElement>('layerPositionLock').onclick=()=>{
  const layer=controller.selectedLayer;
  changeLayer(layer.positionLocked?'位置ロックを解除しました。':'レイヤーの位置をロックしました。',tx=>tx.setLayerPositionLocked(layer.id,!layer.positionLocked));
};
byId<HTMLButtonElement>('duplicateLayer').onclick=()=>{void createLayerFromPixels('duplicate',new Set([controller.selectedLayerId]));};
byId<HTMLButtonElement>('flattenLayerCopy').onclick=()=>{void createLayerFromPixels('copy',visibleLayerIds());};
byId<HTMLButtonElement>('mergeVisibleLayers').onclick=()=>{void createLayerFromPixels('merge',visibleLayerIds());};
byId<HTMLButtonElement>('layerBatchMerge').onclick=()=>{void createLayerFromPixels('merge',new Set(layerBatchIds));};
byId<HTMLButtonElement>('mergeLayerDown').onclick=()=>{
  const root=controller.document.root,id=controller.selectedLayerId,lower=root.rootLayerIds[root.rootLayerIds.indexOf(id)-1];
  if(lower)void createLayerFromPixels('merge',new Set([id,lower]));
};
byId<HTMLButtonElement>('deleteLayer').onclick=()=>deleteLayers(new Set([controller.selectedLayerId]));
byId<HTMLButtonElement>('layerBatchDelete').onclick=()=>deleteLayers(new Set(layerBatchIds));
byId<HTMLButtonElement>('layerDestination').onclick=()=>{
  const ids=new Set([controller.selectedLayerId]);
  chooseLayerGroupDestination(destination=>changeLayer('レイヤーを移動しました。',tx=>tx.moveLayersIntoGroup(ids,destination)));
};
byId<HTMLButtonElement>('layerBatchDestination').onclick=()=>{
  const ids=new Set(layerBatchIds);
  chooseLayerGroupDestination(destination=>changeLayer('選んだレイヤーを移動しました。',tx=>tx.moveLayersIntoGroup(ids,destination)));
};
async function createLayerGroup(ids:ReadonlySet<LayerId>){
  const artwork=controller.document,root=artwork.root;
  const positions=root.rootLayerIds.flatMap((id,index)=>ids.has(id)?[index]:[]);
  if(!positions.length)return;
  const separated=positions.at(-1)!-positions[0]!+1!==positions.length;
  const name=(await appPrompt(separated?'グループ名（離れたレイヤーは隣り合うように移動します）':'グループ名','グループ'))?.trim();
  if(!name||artwork!==controller.document)return;
  changeLayer(separated?'レイヤーを移動してグループにまとめました。':'レイヤーをグループにまとめました。',
    tx=>tx.createLayerGroup(ids,name,separated));
}
byId<HTMLButtonElement>('layerBatchGroup').onclick=()=>void createLayerGroup(new Set(layerBatchIds));
byId<HTMLButtonElement>('layerGroupSelected').onclick=()=>void createLayerGroup(new Set([controller.selectedLayerId]));
byId<HTMLButtonElement>('layerBatchUp').onclick=()=>changeLayer('選んだレイヤーを上に移動しました。',tx=>tx.moveRasterLayers(layerBatchIds,1));
byId<HTMLButtonElement>('layerBatchDown').onclick=()=>changeLayer('選んだレイヤーを下に移動しました。',tx=>tx.moveRasterLayers(layerBatchIds,-1));
byId<HTMLButtonElement>('layerBatchShow').onclick=()=>changeLayerBatch('選んだレイヤーを表示しました。',(tx,id)=>tx.setLayerVisibility(id,true));
byId<HTMLButtonElement>('layerBatchHide').onclick=()=>changeLayerBatch('選んだレイヤーを非表示にしました。',(tx,id)=>tx.setLayerVisibility(id,false));
byId<HTMLButtonElement>('layerBatchLock').onclick=()=>changeLayerBatch('選んだレイヤーをロックしました。',(tx,id)=>tx.setLayerLocked(id,true));
byId<HTMLButtonElement>('layerBatchUnlock').onclick=()=>changeLayerBatch('選んだレイヤーのロックを解除しました。',(tx,id)=>tx.setLayerLocked(id,false));
byId<HTMLSelectElement>('layerKindFilter').onchange=()=>renderLayers();
byId<HTMLSelectElement>('layerTagFilter').onchange=renderLayers;
const layerTagField=byId<HTMLSelectElement>('selectedLayerTag');
layerTagField.onchange=()=>changeLayer('レイヤーの色タグを変更しました。',tx=>tx.setLayerColorTag(controller.selectedLayerId,parseLayerColorTag(layerTagField.value||null)));
byId<HTMLButtonElement>('moveLayerUp').onclick=()=>changeLayer('レイヤーを一つ上に移動しました。',tx=>tx.moveRasterLayer(controller.selectedLayerId,1));
byId<HTMLButtonElement>('moveLayerDown').onclick=()=>changeLayer('レイヤーを一つ下に移動しました。',tx=>tx.moveRasterLayer(controller.selectedLayerId,-1));
const layerNameField=byId<HTMLInputElement>('selectedLayerName');
layerNameField.onchange=()=>{
  const nextName=layerNameField.value.trim();
  if(!nextName){
    layerNameField.value=controller.selectedLayer.name;
    byId('status').textContent='レイヤー名を入力してください。';
    return;
  }
  changeLayer('レイヤー名を変更しました。',tx=>tx.renameLayer(controller.selectedLayerId,nextName));
  layerNameField.value=controller.selectedLayer.name;
};
layerNameField.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();layerNameField.blur();}};
const layerOpacityInput=byId<HTMLInputElement>('layerOpacity');
layerOpacityInput.oninput=()=>{
  byId('layerOpacityValue').textContent=layerOpacityInput.value+'%';
  if(!surface||surface.busy||historyPending||geometryBusy)return;
  opacityPreview={document:controller.document,layerId:controller.selectedLayerId,surface};
  if(opacityPreviewFrame)return;
  opacityPreviewFrame=requestAnimationFrame(()=>{
    opacityPreviewFrame=0;
    const preview=opacityPreview;
    if(!preview||preview.document!==controller.document||preview.surface!==surface||surface.busy||historyPending||geometryBusy)return;
    surface.setLayerOpacityPreview({layerId:preview.layerId,opacity:Number(layerOpacityInput.value)/100});
  });
};
layerOpacityInput.onchange=()=>{
  const next=Number(layerOpacityInput.value)/100;
  cancelAnimationFrame(opacityPreviewFrame);
  opacityPreviewFrame=0;
  const preview=opacityPreview;
  opacityPreview=null;
  if(preview&&(preview.document!==controller.document||preview.layerId!==controller.selectedLayerId)){
    preview.surface.setLayerOpacityPreview();
    return;
  }
  const current=controller.selectedLayer.opacity;
  changeLayer('レイヤーの不透明度を変更しました。',tx=>tx.setLayerOpacity(controller.selectedLayerId,next));
  if(controller.selectedLayer.opacity===current)preview?.surface.setLayerOpacityPreview();
};
layerOpacityInput.onpointercancel=renderLayers;
layerOpacityInput.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();renderLayers();}};
renderLayers();

function scheduleProjectionCheckpoint(delay=CHECKPOINT_IDLE_MS){
  if(projectionCheckpointTimer!==null)clearTimeout(projectionCheckpointTimer);
  projectionCheckpointTimer=window.setTimeout(()=>{projectionCheckpointTimer=null;void createProjectionCheckpoint();},Math.max(0,delay));
}
function noteCheckpointOperations(operations:readonly SemanticOperation[]){
  if(operations.some(operation=>operation.kind==='layer.snapshot'&&operation.parameters.replacesRaster))checkpointNeedsFullSeed=true;
  checkpointOperations.push(...operations);checkpointOpsSinceLast+=Math.max(1,operations.length);
  scheduleProjectionCheckpoint(checkpointOpsSinceLast>=CHECKPOINT_OPERATION_INTERVAL?0:CHECKPOINT_IDLE_MS);
}
async function createProjectionCheckpoint(){
  if(projectionCheckpointBusy||!surface||!documentReady){if(documentReady)scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);return;}
  if(historyPending||geometryBusy||surface.interacting){scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);return;}
  const activeSurface=surface,revisionId=controller.document.head,operations=checkpointOperations.slice(),fullSeed=checkpointNeedsFullSeed;projectionCheckpointBusy=true;
  try{
    const delta=await activeSurface.captureProjectionDelta(revisionId,fullSeed?undefined:operations);
    if(surface===activeSurface&&controller.document.head===revisionId&&!activeSurface.busy&&await persistence.storeProjectionDelta(delta)&&surface===activeSurface){
      checkpointOperations.splice(0,operations.length);checkpointOpsSinceLast=checkpointOperations.length;checkpointNeedsFullSeed=false;lastCheckpointAt=Date.now();
      thumbnailRepairSkipped.delete(controller.document.root.documentId+':'+revisionId);
      if(app.inert)scheduleThumbnailRepair(100);
    }
  }catch(error){const message=error instanceof Error?error.message:String(error);if(message.includes('stale'))checkpointCancelled++;else{checkpointErrors.push({at:new Date().toISOString(),message});if(checkpointErrors.length>12)checkpointErrors.shift();}}finally{
    projectionCheckpointBusy=false;
    if(surface===activeSurface&&(controller.document.head!==revisionId||checkpointOperations.length||checkpointNeedsFullSeed))scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);
    updateQa();
  }
}
function resetCheckpointTracking(){checkpointOperations=[];checkpointOpsSinceLast=0;checkpointNeedsFullSeed=true;lastCheckpointAt=null;if(projectionCheckpointTimer!==null){clearTimeout(projectionCheckpointTimer);projectionCheckpointTimer=null;}}
function queueLatestCommit(){
  const handoff=controller.lastPersistenceHandoff;if(!handoff||handoff.resultRevisionId===lastQueuedRevision)return;lastQueuedRevision=handoff.resultRevisionId;
  inputFreezeTrace?.mark('save-prepare:start');persistence.noteCommit(controller.document,handoff);inputFreezeTrace?.mark('save-prepare:end');if(controller.document.head!==handoff.resultRevisionId)persistence.noteNavigation(controller.document);const revision=controller.document.revision(handoff.resultRevisionId),operations=revision.command?.operations??[];noteCheckpointOperations(operations);
  timeline?.record(controller.document,revision.id);
}
function makeSurface(backendOverride:'webgl2'|'webgpu'|null=null,documentController=controller){const drawing=new BrushSurface(byId('canvas'),documentController,text=>{inputFreezeTrace?.mark('status-write',{value:text});byId('status').textContent=text;},()=>{inputFreezeTrace?.mark('committed-ui:start');queueLatestCommit();renderLayers();updateHistoryButtons();updateQa();inputFreezeTrace?.mark('committed-ui:end');},reason=>{if(reason!=='view'&&reason!=='view-command')updatePersistenceDisplay();updateViewControls();redrawCrop();if(reason==='view'||reason==='view-command')scheduleViewSave(drawing);if(reason==='view'){scheduleQaRefresh();return;}updateHistoryButtons();updateQa();},backendOverride,(rgba,phase,point)=>{
 if(phase==='cancel'){byId('colorSampleLoupe').hidden=true;foreground.cancel();if(releasedColorHold)restoreDrawingTool();return;}
 if(!rgba||rgba.length<4||rgba[3]===0){if(phase==='commit'){foreground.cancel();byId('status').textContent='透明な場所からは色を取得できません。';if(!holdingColorKey&&selectedTool==='eyedropper')restoreDrawingTool();}return;}
 const alpha=(rgba[3]??0)/255,fromComposite=(byId<HTMLSelectElement>('colorSampleSource').value==='composite');
 const channels=rgba.slice(0,3).map(v=>Math.min(1,Math.max(0,v/255)));
 // Composite surfaces store premultiplied alpha; restore the displayed RGB at translucent edges.
 const color=rgb(...(fromComposite&&alpha>0&&alpha<1?channels.map(v=>Math.min(1,v/alpha)):channels) as [number,number,number]);
 if(phase==='preview'){
  foreground.begin();foreground.preview(color);
  if(point&&surface){const loupe=byId<HTMLElement>('colorSampleLoupe'),box=surface.viewportRect,screen=surface.documentToScreen(point);
   byId<HTMLElement>('colorSampledSwatch').style.backgroundColor=hex(color);
   byId<HTMLElement>('colorBeforeSwatch').style.backgroundColor=hex(eyedropperOriginal);
   byId('colorSampleCode').textContent=hex(color);
   loupe.style.left=Math.max(8,Math.min(innerWidth-150,box.left+screen.x-72))+'px';
   loupe.style.top=Math.max(8,Math.min(innerHeight-110,box.top+screen.y-116))+'px';
   loupe.hidden=false;}
 }
 else{byId('colorSampleLoupe').hidden=true;foreground.begin();foreground.commit(color);byId('status').textContent='キャンバスから '+hex(foreground.current)+' を取得しました。';if(!holdingColorKey&&selectedTool==='eyedropper')restoreDrawingTool();}
 });
 drawing.correctionHold=()=>strokeCorrection?.hold()??null;
 drawing.eraserPreset=()=>{
  const active=drawing.preset;if(active?.blend==='erase')return active;
  const eraser=brushDrafts.get(lastEraserPresetId)??drawing.brushes.find(brush=>brush.id===lastEraserPresetId);
  return eraser?.blend==='erase'?(inputPreferences.eraserSizeLink&&active?{...eraser,size:active.size}:eraser):null;
 };
 drawing.selectionMask=()=>surface===drawing?c06Selection?.active()??null:null;
 drawing.selectionPending=()=>surface===drawing?(c06Selection?.isPending()??false):false;
 applyInputPreferences(drawing);
 drawing.onLayerPickShortcut=point=>{if(surface===drawing&&documentReady)pickLayerOnCanvas(point);};
 drawing.onSelectionChanged=()=>{if(surface===drawing){
    refreshSelectionControls();updateVectorMaskControls();
    if(documentReady)void persistence.updateSelection(drawing.selectedRectangle).catch(error=>{
      byId('status').textContent='選択範囲の保護に失敗しました。'+(error instanceof Error?error.message:'');
    });
  }};
 drawing.setGuideSettings(guidePreferences);
 drawing.setArtworkGuides(documentController.document.root.artworkGuides);
 drawing.setSymmetry(symmetrySettings);
 drawing.setCommonStabilization(commonStabilization);
 drawing.setPressureCalibration(devicePressureSensitivity);
 return drawing;
}
function applyInputPreferences(drawing:BrushSurface){
 drawing.fingerDrawing=inputPreferences.finger;drawing.palmGuard=inputPreferences.palmGuard;drawing.barrelErases=inputPreferences.penBarrelErase;
 drawing.setRotationSnap(inputPreferences.rotationSnap);
 drawing.setPointerRoles(readPointerRoles());
}
surface=makeSurface();
function updateViewControls(){const state=surface?.viewState;if(!state)return;
  const zoom=byId<HTMLInputElement>('zoomPercent'),zoomValue=String(Math.round(state.zoom*1000)/10);if(zoom.value!==zoomValue)zoom.value=zoomValue;
  const angle=byId<HTMLInputElement>('angleDegree'),angleValue=String(Math.round(state.rotation*180/Math.PI*10)/10);if(angle.value!==angleValue)angle.value=angleValue;
  for(const [id,on] of [['flipH',state.flipX],['flipV',state.flipY]] as const){const button=byId<HTMLButtonElement>(id),value=String(on);if(button.getAttribute('aria-pressed')!==value)button.setAttribute('aria-pressed',value);}
  const tile=byId<HTMLInputElement>('seamless');if(tile)tile.checked=state.seamless;
  updatePixelGrid();
  c06Selection?.updateView();
}
let viewSaveTimer:number|undefined;
let viewSaveRequest:{documentId:string;view:NonNullable<BrushSurface['viewState']>}|null=null;
function persistCanvasView(){
 const request=viewSaveRequest;
 if(!request)return;
 viewSaveRequest=null;
 try{
  const key='illustro.canvas-views.v1';
  const stored=JSON.parse(localStorage.getItem(key)??'[]') as unknown;
  const entries=Array.isArray(stored)?stored.filter(item=>item?.documentId!==request.documentId):[];
  localStorage.setItem(key,JSON.stringify([request,...entries].slice(0,100)));
 }catch{}
}
function scheduleViewSave(drawing:BrushSurface){
 if(qaMode||!documentReady||documentActivationPending||drawing!==surface||!drawing.viewState)return;
 viewSaveRequest={documentId:controller.document.root.documentId,view:drawing.viewState};
 clearTimeout(viewSaveTimer);
 viewSaveTimer=window.setTimeout(persistCanvasView,450);
}
window.addEventListener('pagehide',persistCanvasView);
function readCanvasView(documentId:string){
 try{
  const entries=JSON.parse(localStorage.getItem('illustro.canvas-views.v1')??'[]') as unknown;
  if(Array.isArray(entries))return parseSavedCanvasView(entries.find(item=>item?.documentId===documentId)?.view);
 }catch{}
 return null;
}
const gridToggle=byId<HTMLInputElement>('pixelGridToggle');
const gridThreshold=byId<HTMLInputElement>('pixelGridThreshold'),gridColor=byId<HTMLInputElement>('pixelGridColor');
const gridOverlay=byId('pixelGrid'),pixelCoordinates=byId('pixelCoordinates'),gridPage=byId('pixelGridPage');
try{
 const saved=JSON.parse(localStorage.getItem('illustro.pixel-grid.v1')??'null');
 gridToggle.checked=saved?.enabled===true;
 if(Number.isInteger(saved?.threshold)&&saved.threshold>=400&&saved.threshold<=6400)gridThreshold.value=String(saved.threshold);
 if(typeof saved?.color==='string'&&/^#[a-f0-9]{6}$/i.test(saved.color))gridColor.value=saved.color;
}catch{}
function updatePixelGrid(){
 const state=surface?.viewState;
 const visible=!!state&&gridToggle.checked&&state.zoom*100>=gridThreshold.valueAsNumber&&!state.seamless;
 gridOverlay.toggleAttribute('hidden',!visible);
 if(!visible||!state||!surface){pixelCoordinates.hidden=true;return;}
 const origin=surface.documentToScreen({x:0,y:0}),c=Math.cos(state.rotation),s=Math.sin(state.rotation);
 const scaleX=state.zoom*(state.flipX?-1:1),scaleY=state.zoom*(state.flipY?-1:1);
 gridPage.setAttribute('transform',`matrix(${c*scaleX} ${s*scaleX} ${-s*scaleY} ${c*scaleY} ${origin.x} ${origin.y})`);
 gridPage.setAttribute('width',String(state.documentWidth));gridPage.setAttribute('height',String(state.documentHeight));
}
for(const input of [gridToggle,gridThreshold,gridColor])input.onchange=()=>{
 if(!gridThreshold.checkValidity()||!gridThreshold.value)gridThreshold.value='800';
 byId('pixelGridLine').setAttribute('stroke',gridColor.value);
 try{localStorage.setItem('illustro.pixel-grid.v1',JSON.stringify({enabled:gridToggle.checked,threshold:gridThreshold.valueAsNumber,color:gridColor.value}));}catch{}
 updatePixelGrid();
};
byId('pixelGridLine').setAttribute('stroke',gridColor.value);
const canvasViewport=byId('canvas').closest('.surface')!;
canvasViewport.addEventListener('pointermove',event=>{
 if(gridOverlay.hasAttribute('hidden')||!surface||!(event instanceof PointerEvent))return;
 const rect=surface.viewportRect,point=surface.screenToDocument({x:event.clientX-rect.left,y:event.clientY-rect.top}),root=controller.document.root;
 const x=Math.floor(point.x),y=Math.floor(point.y);
 pixelCoordinates.hidden=x<0||y<0||x>=root.width||y>=root.height;
 if(!pixelCoordinates.hidden)pixelCoordinates.textContent='X '+x+' · Y '+y;
},{passive:true});
const brushCursor=byId('brushCursor');
let brushCursorTimer:number|undefined;
function hideBrushCursor(){clearTimeout(brushCursorTimer);brushCursor.hidden=true;}
function displayBrushCursor(x:number,y:number,size:number,zoom:number){
 const diameter=Math.max(8,Math.min(4096,size*zoom));
 brushCursor.style.width=brushCursor.style.height=diameter+'px';
 brushCursor.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-50%)';
 brushCursor.hidden=false;
}
canvasViewport.addEventListener('pointermove',event=>{
 if(!inputPreferences.brushCursorEnabled||!surface||!(event instanceof PointerEvent)||event.pointerType==='touch')return;
 const drawing=surface,view=drawing.viewState;
 if(!view||drawing.panTool||event.buttons&1||selectedTool==='eyedropper'){hideBrushCursor();return;}
 const bounds=drawing.viewportRect;
 const eraser=penEraserInput(event,drawing.barrelErases)?drawing.eraserPreset():null;
 displayBrushCursor(event.clientX-bounds.left,event.clientY-bounds.top,eraser?.size??drawing.brushSize,view.zoom);
},{passive:true});
canvasViewport.addEventListener('pointerdown',hideBrushCursor,{passive:true});
canvasViewport.addEventListener('pointerleave',()=>{pixelCoordinates.hidden=true;hideBrushCursor();});
byId('showBrushSize').onclick=()=>{
 const view=surface?.viewState;
 if(!view||!surface||!documentReady)return;
 hideBrushCursor();
 displayBrushCursor(view.cssWidth/2,view.cssHeight/2,surface.brushSize,view.zoom);
 brushMessage('基準の太さ '+Math.round(surface.brushSize*10)/10+' px。筆圧や先端形状で描画範囲が変わります。');
 brushCursorTimer=window.setTimeout(hideBrushCursor,1800);
};
byId('panView').onclick=()=>{
 if(!surface||!documentReady)return;
 if(selectedTool==='eyedropper')restoreDrawingTool();
 surface.panTool=!surface.panTool;
 byId('panView').setAttribute('aria-pressed',String(surface.panTool));
 byId('status').textContent=surface.panTool?'キャンバスをドラッグして移動できます。':'描画に戻りました。';
};
const shellUi=installShellUi(scheduleLayerDrawingThumbnail),workspace=shellUi.workspace;
function updateContextBar(){
  const active=documentReady&&!!surface;
  const tool=byId<HTMLButtonElement>('c04ContextTool'),layer=byId<HTMLButtonElement>('c04ContextLayer');
  const selection=byId<HTMLButtonElement>('c04ContextSelection'),source=byId<HTMLButtonElement>('c04ContextReference');
  tool.disabled=layer.disabled=selection.disabled=!active;
  const fill=activeCanvasTool==='smartFill'?fillPanel?.context():null;
  source.hidden=!fill&&selectedTool!=='eyedropper';
  source.disabled=!active;
  const sampleSource=byId<HTMLSelectElement>('colorSampleSource').value;
  const sampleLayerId=byId<HTMLSelectElement>('colorSampleLayerId').value;
  source.textContent=fill?'塗り参照: '+fill.reference:'採色元: '+sampleSourceLabel({
    source:sampleSource==='layer'?'layer':sampleSource==='specific'?'specific':'composite',
    layerId:sampleLayerId?sampleLayerId as LayerId:null,
  },controller.layers.map(item=>({id:item.id,name:item.name})));
  tool.textContent='道具: '+(fill?'塗りつぶし':selectedTool==='eraser'?'消しゴム':selectedTool==='eyedropper'?'スポイト':surface?.brushName??'ブラシ');
  layer.textContent=fill?'塗り先: '+fill.destination:'描画先: '+(active?controller.selectedLayer.name:'作品なし');
  const selected=surface?.selectedRectangle;
  selection.textContent=selected?'選択: '+Math.round(selected.width)+'×'+Math.round(selected.height):c06Selection?.active()?'選択範囲あり':'選択なし';
  byId('c04ContextPending').textContent=historyPending?'履歴を反映中':
    surface?.inputActive?'描画中':surface?.busy?'線の反映中':
    geometryBusy?'変更を処理中':fill?.pending?'塗り候補・未確定':surface?.selectingRectangle?'範囲を指定中':'';
}
byId<HTMLButtonElement>('c04ContextTool').onclick=()=>shellUi.openBox('brushBox');
byId<HTMLButtonElement>('c04ContextLayer').onclick=()=>shellUi.setLayerPage(true);
byId<HTMLButtonElement>('c04ContextSelection').onclick=()=>byId<HTMLButtonElement>('selection').click();
byId<HTMLButtonElement>('c04ContextReference').onclick=()=>{
  if(activeCanvasTool==='smartFill')fillPanel?.focusReference();
  else byId('openEyedropperSettings').click();
};
const eyedropperDialog=byId<HTMLDialogElement>('colorEyedropperOptions');
app.append(eyedropperDialog);
byId('openEyedropperSettings').onclick=()=>{if(!eyedropperDialog.open)eyedropperDialog.showModal();};
byId('referenceSampleOpen').addEventListener('click',()=>eyedropperDialog.close());
const colorPanel=installColorPanel(foreground,{onPickTool:()=>activateEyedropper(),onBrushColor:()=>surface?.setForegroundColor([foreground.current.r,foreground.current.g,foreground.current.b],foreground.opacity)});
const eyedropperSettings=installEyedropperSettings({foreground,getSurface:()=>surface,getLayers:()=>controller.layers.map(layer=>({id:layer.id,name:layer.name})),onChange:updateContextBar});
function refreshSelectionControls(){
 const selecting=surface?.selectingRectangle??false;
 const rectangle=surface?.selectedRectangle;
 byId<HTMLButtonElement>('selection').setAttribute('aria-pressed',String(selecting||activeCanvasTool==='selection'));
 byId<HTMLButtonElement>('selectionStart').textContent=selecting?'選択範囲を描いてください':'四角く範囲を選ぶ';
 byId<HTMLButtonElement>('selectionClear').disabled=!rectangle;
 byId<HTMLElement>('selectionStatus').textContent=selecting
   ?'キャンバス上をドラッグして範囲を作成してください。'
   :rectangle?'範囲を設定しました。ブラシまたは消しゴムで内側に描けます。'
   :'選択範囲なし。キャンバス全体に描けます。';
 updateContextBar();c06ClipboardUI?.refresh();
 if(c06Selection&&surface&&!surface.selectingRectangle&&!c06Selection.active()){
   const rect=surface.selectedRectangle;
   if(rect&&rect.width>0&&rect.height>0)c06Selection.applyRectangle(rect);
 }
}
function reflectRailTool(){
 const quick=byId<HTMLButtonElement>('switchDrawingTool');
 const label=lastDrawingTool==='eraser'?'ブラシに切り替え':'消しゴムに切り替え';
 quick.title=label;quick.setAttribute('aria-label',label);quick.innerHTML=icon(lastDrawingTool==='eraser'?'brush':'eraser');
 const current=activeCanvasTool||(selectedTool==='brush'?'paint':selectedTool==='eraser'?'erase':'eyedropper');
 for(const id of ['paint','erase','eyedropper','smartFill','selection','transform','move','shapes','rulers'])
   byId(id).setAttribute('aria-pressed',String(id===current));
 updateContextBar();
}
function leaveCanvasTool(){
 if(activeCanvasTool==='selection')c06Selection?.stop();
 if(activeCanvasTool==='smartFill')fillPanel?.stop();
 if(activeCanvasTool==='shapes'||activeCanvasTool==='rulers')surface?.setCanvasEditGesture(null);
 const tools=byId('documentBoxBody');
 if(activeCanvasTool)tools.querySelector<HTMLDetailsElement>('[data-tool-panel="'+(activeCanvasTool==='move'?'transform':activeCanvasTool)+'"]')?.removeAttribute('open');
 delete tools.dataset.activeToolPanel;
 activeCanvasTool='';
}
function openCanvasTool(id:string){
 if(!surface||!documentReady||surface.inputActive)return false;
 if(activeCanvasTool!==id)leaveCanvasTool();
 surface.setEyedropper(false);
 surface.setSelectionMode(false);
 surface.panTool=false;
 byId('panView').setAttribute('aria-pressed','false');
 activeCanvasTool=id;
 shellUi.openBox('documentBox');
 const tools=byId('documentBoxBody'),panel=id==='move'?'transform':id;
 tools.dataset.activeToolPanel=panel;
 const details=tools.querySelector<HTMLDetailsElement>('[data-tool-panel="'+panel+'"]');
 if(details){details.open=true;details.scrollIntoView({block:'nearest'});}
 reflectRailTool();
 return Boolean(details);
}
function activateEyedropper(){if(!surface||!documentReady)return;leaveCanvasTool();surface.panTool=false;byId('panView').setAttribute('aria-pressed','false');if(selectedTool!=='eyedropper')lastDrawingTool=selectedTool==='eraser'?'eraser':'brush';eyedropperOriginal=foreground.current;selectedTool='eyedropper';surface.configureSample(eyedropperSettings.options());surface.setEyedropper(true,eyedropperSettings.options().source);reflectRailTool();byId('status').textContent='キャンバスに触れて、取りたい色を選んでください。';updateQa();}
let holdingColorKey=false,releasedColorHold=false;
function restoreDrawingTool(){if(!surface)return;holdingColorKey=releasedColorHold=false;byId('colorSampleLoupe').hidden=true;surface.setEyedropper(false);selectPreset(lastDrawingTool==='eraser'?lastEraserPresetId:lastBrushPresetId);updateQa();}
document.addEventListener('keydown',event=>{
 if(event.key!=='Alt'||event.repeat||event.ctrlKey||event.metaKey||isTextEditingTarget(event.target)||
    app.inert||document.querySelector('dialog[open]')||!surface||surface.inputActive||selectedTool==='eyedropper'||!documentReady)return;
 event.preventDefault();holdingColorKey=true;releasedColorHold=false;activateEyedropper();
});
function releaseColorHold(){
 if(!holdingColorKey)return;
 holdingColorKey=false;releasedColorHold=true;
 if(!surface?.samplingColor)restoreDrawingTool();
}
document.addEventListener('keyup',event=>{if(event.key==='Alt')releaseColorHold();});
window.addEventListener('blur',releaseColorHold);
byId('eyedropper').onclick=activateEyedropper;
byId<HTMLSelectElement>('colorSampleSource').onchange=()=>{eyedropperSettings.apply();if(selectedTool==='eyedropper'){surface?.setEyedropper(true,eyedropperSettings.options().source);}updateContextBar();};
addEventListener('keydown',e=>{if(e.key.toLowerCase()!=='i'||e.altKey||e.ctrlKey||e.metaKey||e.repeat||(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable]')))return;e.preventDefault();if(selectedTool==='eyedropper')restoreDrawingTool();else activateEyedropper();});

function savedBrush(id:string):FoundationPreset|undefined{return brushPresets.all(builtInBrushes).find(p=>p.id===id);}
function rememberWorkBrush(){
 if(qaMode||!documentReady||documentActivationPending||temporaryEraserReturn||!surface?.preset)return;
 saveWorkBrushSettings(brushPresets.storage,controller.document.root.documentId,{presetId:surface.preset.id,size:surface.preset.size});
}
function applyBrushChange(change:(draft:FoundationPreset)=>void):boolean{
 if(!surface?.preset)return false;
 if(surface.inputActive){brushMessage('描画中は設定を変更できません。線を離してから調整してください。');return false;}
 const previousSize=surface.preset.size,draft=structuredClone(surface.preset);
 try{
  change(draft);
  compilePreset(draft,{forceFadeGeometry:'adaptive-v1'});
  surface.applyPreset(draft);
  const original=savedBrush(draft.id);
  if(original&&sameEditableBrush(draft,original))brushDrafts.delete(draft.id);
  else brushDrafts.set(draft.id,structuredClone(draft));
  if(draft.size!==previousSize)rememberWorkBrush();
  syncPreset();
  return true;
 }catch(error){brushMessage('この設定は使えません: '+String(error));return false;}
}
function syncPreset(){
 if(!surface?.preset)return;
 const p=surface.preset;
 const sizeNumber=byId<HTMLInputElement>('sizeNumber');
 syncBrushSize(byId<HTMLInputElement>('size'),sizeNumber,p);
 byId('brushBoxSummary').textContent=(surface.brushName||selectedTool)+' · '+Math.round(p.size)+'px';
 byId<HTMLInputElement>('force').checked=p.forceFade?.enabled??false;
 for(const [id,value] of [['brushOpacity',p.opacity],['brushFlow',p.flow],['brushSpacing',p.spacing.value],['brushPressure',p.pressure.smoothing],['brushStabilization',p.stabilization.constant],['brushTexture',p.texture.paper.strength]] as const){
  const control=byId<HTMLInputElement>(id);control.value=String(Math.round(value*100));
  byId<HTMLOutputElement>(id+'Value').value=String(Math.round(value*100))+'%';
  const numeric=document.getElementById(id+'Number') as HTMLInputElement|null;
  if(numeric&&document.activeElement!==numeric)numeric.value=String(Math.round(value*100));
 }
 byId<HTMLSelectElement>('brushStabilizationScope').value=p.stabilization.scope;
 byId<HTMLInputElement>('brushAzimuth').checked=p.tip.azimuth;
 byId<HTMLInputElement>('brushTwist').checked=p.tip.twist;
 const user=brushPresets.isUser(p.id);
 const original=savedBrush(p.id),dirty=Boolean(original&&!sameEditableBrush(p,original));
 byId('brushModifiedStatus').textContent=dirty?'変更あり・未保存':'保存済み';
 byId<HTMLButtonElement>('brushReset').disabled=!dirty;
 advancedBrushEditor?.sync(p);
 dynamicsEditor?.sync(p);
 byId<HTMLButtonElement>('brushRename').disabled=!user;
 byId<HTMLButtonElement>('brushDelete').disabled=!user;
 updateQa();
}
type GeometryMode='document.crop'|'document.canvas-resize'|'document.image-resize';
let geometryMode:GeometryMode|null=null,geometryBusy=false;
const geometryDialog=byId<HTMLDialogElement>('geometryDialog'),cropOverlay=document.getElementById('cropOverlay') as unknown as SVGSVGElement;
const dimensionInput=(id:string)=>byId<HTMLInputElement>(id);
let geometryPreviewEpoch=0;
function refreshResizeSize(changed?:string){
 if(geometryMode!=='document.image-resize')return;
 const {width,height}=controller.document.root;
 const w=dimensionInput('geometryWidth'),h=dimensionInput('geometryHeight');
 if(dimensionInput('geometryKeepRatio').checked&&changed){
   const source=changed===w.id?w:h,target=source===w?h:w,ratio=source===w?height/width:width/height;
   if(source.validity.valid)target.value=String(Math.max(1,Math.round(source.valueAsNumber*ratio)));
 }
 const valid=w.validity.valid&&h.validity.valid;
 byId('geometryResultSize').textContent=valid?`結果 ${w.value} × ${h.value} px（元の画像 ${width} × ${height} px）`:'幅・高さを1〜8192pxで指定してください。';
 byId<HTMLButtonElement>('geometryCompare').disabled=!valid;
 const comparison=byId('geometryComparison');comparison.hidden=true;comparison.replaceChildren();
 geometryPreviewEpoch++;
}
byId('geometryFilter').addEventListener('change',()=>refreshResizeSize());
byId('geometryDpiOnly').onclick=()=>{closeGeometry();byId('documentInfoOpen').click();dimensionInput('documentInfoDpi').focus();};
byId('geometryCompare').onclick=async ()=>{
 if(geometryMode!=='document.image-resize'||geometryBusy)return;
 const w=dimensionInput('geometryWidth'),h=dimensionInput('geometryHeight');
 if(!w.validity.valid||!h.validity.valid)return;
 const artwork=controller.document,head=artwork.head,{width,height}=artwork.root;
 const newWidth=w.valueAsNumber,newHeight=h.valueAsNumber,method=dimensionInput('geometryFilter').value as ImageResample;
 const preview=++geometryPreviewEpoch,output=byId('geometryComparison');
 const current=()=>geometryPreviewEpoch===preview&&geometryDialog.open&&artwork===controller.document&&head===artwork.head;
 output.hidden=false;output.textContent='比較画像を準備しています。';
 try{
   const pixels=await renderFrozenArtwork(captureExport(artwork,undefined,head));
   if(!current())return;
   const centre=(w:number,h:number)=>({x:Math.max(0,Math.floor((w-112)/2)),y:Math.max(0,Math.floor((h-112)/2)),
     width:Math.min(w,112),height:Math.min(h,112)});
   const before=centre(width,height),after=centre(newWidth,newHeight);
   const previewImage=(label:string,rgba:Uint8Array,area:typeof before)=>{
     const figure=document.createElement('div'),caption=document.createElement('p'),canvas=document.createElement('canvas');
     caption.textContent=label;canvas.setAttribute('aria-label',label);canvas.width=area.width;canvas.height=area.height;
     canvas.style.imageRendering='pixelated';
     canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(rgba),area.width,area.height),0,0);
     figure.append(caption,canvas);return figure;
   };
   output.replaceChildren(
     previewImage('変更前・100%',cropCanvas(pixels,width,height,before.x,before.y,before.width,before.height),before),
     previewImage('変更後・100%',resizeImageRegion(pixels,width,height,newWidth,newHeight,after,method),after),
   );
 }catch(error){if(current())output.textContent=error instanceof Error?error.message:'比較画像を作れませんでした。';}
};

function geometryRect(){
 const root=controller.document.root;
 const x=Number(dimensionInput('geometryX').value),y=Number(dimensionInput('geometryY').value),w=Number(dimensionInput('geometryWidth').value),h=Number(dimensionInput('geometryHeight').value);
 if(![x,y,w,h].every(Number.isSafeInteger)||w<1||h<1||x<0||y<0||x+w>root.width||y+h>root.height)return null;
 return {x,y,w,h};
}
function redrawCrop(){
 if(geometryMode!=='document.crop'||!surface)return;
 const rect=geometryRect();if(!rect){cropOverlay.setAttribute('hidden','');return;}
 cropOverlay.removeAttribute('hidden');
 const a=surface.documentToScreen({x:rect.x,y:rect.y}),b=surface.documentToScreen({x:rect.x+rect.w,y:rect.y}),c=surface.documentToScreen({x:rect.x+rect.w,y:rect.y+rect.h}),d=surface.documentToScreen({x:rect.x,y:rect.y+rect.h});
 const points=[a,b,c,d];(document.getElementById('cropPolygon') as unknown as SVGPolygonElement).setAttribute('points',points.map(p=>p.x+','+p.y).join(' '));
 for(const [corner,index] of [['tl',0],['tr',1],['br',2],['bl',3]] as const){const handle=cropOverlay.querySelector<SVGCircleElement>('[data-corner="'+corner+'"]');if(handle){handle.setAttribute('cx',String(points[index]!.x));handle.setAttribute('cy',String(points[index]!.y));}}
}
function closeGeometry(){if(geometryBusy)return;geometryPreviewEpoch++;geometryMode=null;geometryDialog.close();cropOverlay.setAttribute('hidden','');byId('geometryStatus').textContent='';}
function openGeometry(mode:GeometryMode){
 if(!documentReady||!surface?.canChangeGeometry){byId('status').textContent='描画が終わってから変更してください。';return;}
 geometryPreviewEpoch++;geometryMode=mode;const root=controller.document.root;
 dimensionInput('geometryWidth').value=String(root.width);dimensionInput('geometryHeight').value=String(root.height);
 dimensionInput('geometryX').value='0';dimensionInput('geometryY').value='0';
 for(const element of geometryDialog.querySelectorAll<HTMLElement>('.crop-coordinate'))element.hidden=mode!=='document.crop';
 for(const element of geometryDialog.querySelectorAll<HTMLElement>('.resize-anchor'))element.hidden=mode!=='document.canvas-resize';
 for(const element of geometryDialog.querySelectorAll<HTMLElement>('.image-filter'))element.hidden=mode!=='document.image-resize';
 byId('geometryTitle').textContent=mode==='document.crop'?'切り抜き':mode==='document.canvas-resize'?'キャンバスサイズ変更':'画像サイズ変更';
 byId('geometryHelp').textContent=mode==='document.crop'?'黄色い枠の四隅をドラッグするか、数値で正確に指定できます。拡大・移動しながら調整できます。':mode==='document.canvas-resize'?'作品の範囲だけを変更します。絵の大きさは変えません。':'絵のピクセル数を変更します。画質を比較してから適用してください。';
 byId('geometryStatus').textContent='';
 if(!geometryDialog.open)geometryDialog.show();refreshResizeSize();redrawCrop();
}
byId('cropStart').onclick=()=>openGeometry('document.crop');
byId('canvasResizeStart').onclick=()=>openGeometry('document.canvas-resize');
byId('imageResizeStart').onclick=()=>openGeometry('document.image-resize');
byId('geometryCancel').onclick=closeGeometry;
geometryDialog.addEventListener('cancel',e=>{e.preventDefault();closeGeometry();});
for(const id of ['geometryWidth','geometryHeight','geometryX','geometryY'])dimensionInput(id).addEventListener('input',()=>{refreshResizeSize(id);redrawCrop();});
let draggingCrop:{corner:string;startX:number;startY:number;endX:number;endY:number}|null=null;
cropOverlay.addEventListener('pointerdown',e=>{
 const target=e.target as SVGElement,corner=target.dataset.corner,rect=geometryRect();
 if(!corner||!rect)return;e.preventDefault();e.stopPropagation();
 draggingCrop={corner,startX:rect.x,startY:rect.y,endX:rect.x+rect.w,endY:rect.y+rect.h};
 target.setPointerCapture(e.pointerId);
});
cropOverlay.addEventListener('pointermove',e=>{
 if(!draggingCrop||!surface)return;e.preventDefault();
 const box=surface.viewportRect,p=surface.screenToDocument({x:e.clientX-box.left,y:e.clientY-box.top}),root=controller.document.root,c=draggingCrop;
 const x=Math.max(0,Math.min(root.width,Math.round(p.x))),y=Math.max(0,Math.min(root.height,Math.round(p.y)));
 let x0=c.startX,y0=c.startY,x1=c.endX,y1=c.endY;
 if(c.corner.includes('l'))x0=Math.min(x,x1-1);else x1=Math.max(x,x0+1);
 if(c.corner.includes('t'))y0=Math.min(y,y1-1);else y1=Math.max(y,y0+1);
 dimensionInput('geometryX').value=String(x0);dimensionInput('geometryY').value=String(y0);
 dimensionInput('geometryWidth').value=String(x1-x0);dimensionInput('geometryHeight').value=String(y1-y0);redrawCrop();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])cropOverlay.addEventListener(type,()=>draggingCrop=null);
async function restoreArtworkHistory(artwork:CoreDocument,id:RevisionId,branchName?:string){
  const drawing=surface;
  if(!drawing?.canChangeGeometry||geometryBusy||historyPending||artwork!==controller.document)return;
  geometryBusy=true;
  drawing.setInputBarrier(true);
  const oldOrder=artwork.root.rootLayerIds;
  try{
    const tx=artwork.begin(branchName?'別案「'+branchName+'」':'以前の状態を復元');
    if(!tx.restoreRevision(id)){tx.cancel();return;}
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.restoreEditHistory(oldOrder);
    queueLatestCommit();
    persistence.noteNavigation(artwork);
    checkpointNeedsFullSeed=true;
    await reloadGeometryProjection();
    byId('status').textContent=branchName?'別案を開きました。直前の案も作品の履歴に残っています。':'以前の状態を復元しました。元に戻す操作で直前の状態へ戻れます。';
  }catch(error){
    byId('status').textContent='履歴の処理中にエラーが発生しました。'+(error instanceof Error?error.message:'');
  }finally{
    geometryBusy=false;
    surface?.setInputBarrier(historyPending);
    updateHistoryButtons();updateQa();
  }
}

function saveNamedArtworkSnapshot(reopen:()=>void){
  const artwork=controller.document;
  if(!documentReady||!surface||surface.busy||geometryBusy||historyPending)return;
  const dialog=document.createElement('dialog'),form=document.createElement('form');
  const title=document.createElement('h2'),nameLabel=document.createElement('label'),memoLabel=document.createElement('label');
  const input=document.createElement('input'),memo=document.createElement('textarea');
  const save=document.createElement('button'),cancel=document.createElement('button');
  const date=new Date(artwork.root.metadata.modifiedAt).toLocaleString('ja-JP');
  title.textContent='現在の状態を名前付きで残す';
  nameLabel.textContent='名前 ';
  input.required=true;input.maxLength=160;input.value=date;
  nameLabel.append(input);
  memoLabel.textContent='メモ ';
  memo.maxLength=2000;memo.rows=3;
  memoLabel.append(memo);
  save.type='submit';save.textContent='保存';
  cancel.type='button';cancel.textContent='取消';cancel.onclick=()=>dialog.close();
  form.append(title,nameLabel,memoLabel,save,cancel);
  dialog.className='export-dialog';
  dialog.setAttribute('aria-label','スナップショットを保存');
  dialog.append(form);
  document.body.append(dialog);
  const head=artwork.head;
  form.onsubmit=event=>{
    event.preventDefault();
    if(artwork!==controller.document||head!==artwork.head){dialog.close();return;}
    changeLayer('名前付きスナップショットを保存しました。',tx=>tx.pinRevision(input.value,memo.value));
    dialog.close();
  };
  dialog.addEventListener('close',()=>{dialog.remove();reopen();},{once:true});
  dialog.showModal();
}

async function copyHistoricalLayer(artwork:CoreDocument,revision:RevisionId,layerId:LayerId,selectedRegion:boolean){
  const drawing=surface,head=artwork.head;
  if(!documentReady||!drawing?.canChangeGeometry||geometryBusy||historyPending||artwork!==controller.document)return;
  const historic=artwork.revision(revision).root,layer=historic.getLayer(layerId),current=artwork.root;
  const region=selectedRegion?drawing.selectedRectangle:null;
  if(selectedRegion&&!region){
    byId('status').textContent='先に現在のキャンバスで範囲を選んでください。';
    return;
  }
  const x0=region?Math.max(0,Math.ceil(region.x)):0,y0=region?Math.max(0,Math.ceil(region.y)):0;
  const x1=Math.min(current.width,historic.width,region?Math.floor(region.x+region.width):Infinity);
  const y1=Math.min(current.height,historic.height,region?Math.floor(region.y+region.height):Infinity);
  if(x0>=x1||y0>=y1){byId('status').textContent='復元元と現在の範囲が重なっていません。';return;}
  const sizesDifferent=current.width!==historic.width||current.height!==historic.height;
  if(sizesDifferent&&!await appConfirm('作品の大きさが異なります。左上をそろえて、重なる範囲だけをコピーしますか？'))return;
  geometryBusy=true;
  drawing.setInputBarrier(true);
  byId('status').textContent='以前のレイヤーを読み込んでいます。';
  try{
    const frozen=captureExport(artwork,layerId,revision);
    const source=await renderFrozenArtwork({...frozen,layers:frozen.layers.map(item=>({...item,opacity:item.visible?1:item.opacity}))});
    if(artwork!==controller.document||surface!==drawing||artwork.head!==head)throw new Error('作品が切り替わりました。');
    const pixels=new Uint8ClampedArray(current.width*current.height*4);
    for(let y=y0;y<y1;y++){
      const offset=(y*historic.width+x0)*4;
      pixels.set(source.subarray(offset,offset+(x1-x0)*4),(y*current.width+x0)*4);
    }
    const tx=artwork.begin('以前のレイヤーを部分復元');
    const id=tx.addRasterSnapshotAbove(current.rootLayerIds.at(-1)!,pixels,layer.name.slice(0,4000)+'（履歴から）',false,false);
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.selectLayer(id);
    queueLatestCommit();
    checkpointNeedsFullSeed=true;
    await drawing.restoreDocumentProjection();
    byId('status').textContent='以前の内容を新しいレイヤーにコピーしました。';
  }catch(error){
    byId('status').textContent='履歴からコピーできませんでした。'+(error instanceof Error?error.message:'');
  }finally{
    geometryBusy=false;
    if(surface===drawing)drawing.setInputBarrier(false);
    renderLayers();updateHistoryButtons();updateQa();
  }
}

type HistoryBrushSession={
  artwork:CoreDocument;drawing:BrushSurface;target:LayerId;revision:RevisionId;sourceName:string;
  source:Uint8ClampedArray;width:number;height:number;
};
function stopHistoryBrush(){
  historyBrush?.drawing.setCanvasEditGesture(null);
  historyBrush=null;
  byId('historyBrushBar').hidden=true;
}
function syncHistoryBrush(){
  const session=historyBrush;
  if(!session)return;
  const root=controller.document.root;
  if(session.artwork!==controller.document||session.drawing!==surface||controller.selectedLayerId!==session.target||
    root.isLayerContentLocked(session.target)||!root.isLayerVisible(session.target))stopHistoryBrush();
}
async function startHistoryBrush(artwork:CoreDocument,revision:RevisionId,sourceLayer:LayerId){
  const drawing=surface,layer=controller.selectedLayer,root=artwork.root;
  if(artwork!==controller.document||!drawing?.canChangeGeometry||geometryBusy||historyPending)return;
  if(layer.baseColor==='white'||root.isLayerContentLocked(layer.id)||!root.isLayerVisible(layer.id)){
    byId('status').textContent='表示中でロックされていない描画レイヤーを選んでください。';return;
  }
  const older=artwork.revision(revision).root,sourceName=older.getLayer(sourceLayer).name;
  const adjusted=root.width!==older.width||root.height!==older.height||layer.id!==sourceLayer;
  if(adjusted&&!await appConfirm('復元元「'+sourceName+'」を、左上をそろえて「'+layer.name+'」に重ねます。続けますか？'))return;
  const head=artwork.head;
  stopHistoryBrush();stopMaskEditing();stopMaskInspection();stopLayerCompComparison();
  updateVectorMaskControls();
  if(drawing.inspectedLayer)drawing.setSoloLayer(null);
  drawing.setSelectionMode(false);
  byId('status').textContent='履歴ブラシの復元元を読み込んでいます。';
  try{
    const frozen=captureExport(artwork,sourceLayer,revision);
    const source=await renderFrozenArtwork({...frozen,layers:frozen.layers.map(item=>item.visible?{...item,opacity:1}:item)});
    if(surface!==drawing||artwork!==controller.document||artwork.head!==head||drawing.busy||controller.selectedLayerId!==layer.id)return;
    historyBrush={artwork,drawing,target:layer.id,revision,sourceName,source,width:older.width,height:older.height};
    byId('historyBrushBar').hidden=false;
    byId('historyBrushTarget').textContent='履歴ブラシ '+sourceName+' → '+layer.name;
    drawing.setCanvasEditGesture({
      path:false,width:drawing.brushSize,color:'#25a486',
      complete:points=>{if(historyBrush)void applyHistoryBrush(historyBrush,points);},
    });
    byId('status').textContent='戻したい場所をブラシでなぞってください。';
  }catch(error){
    byId('status').textContent='履歴ブラシを準備できませんでした。'+(error instanceof Error?error.message:'');
  }
}
async function applyHistoryBrush(session:HistoryBrushSession,points:readonly MaskStrokePoint[]){
  const {drawing,artwork,target}=session,head=artwork.head,root=artwork.root;
  if(session!==historyBrush||surface!==drawing||artwork!==controller.document||drawing.busy||geometryBusy||historyPending)return;
  if(root.isLayerContentLocked(target)||!root.isLayerVisible(target))return;
  const opacity=Number(byId<HTMLInputElement>('historyBrushStrength').value)/100;
  if(!opacity||!points.length)return;
  geometryBusy=true;drawing.setInputBarrier(true);
  try{
    const pixels=(await drawing.captureDocumentLayers(new Set([target]))).get(target);
    if(!pixels||session!==historyBrush||artwork.head!==head||drawing!==surface)return;
    const changed=restoreHistoryPixels(pixels,session.source,points,{
      width:root.width,height:root.height,sourceWidth:session.width,sourceHeight:session.height,
      size:drawing.brushSize,opacity,selection:drawing.selectedRectangle,selectionMask:c06Selection?.active()??null,lockAlpha:root.getLayer(target).alphaLocked??false,
    });
    if(!changed)return;
    const transaction=artwork.begin('履歴ブラシで復元');
    transaction.replaceLayerRaster(target,pixels,session.revision);
    controller.lastPersistenceHandoff=transaction.commit().persistence;
    queueLatestCommit();
    checkpointNeedsFullSeed=true;
    await drawing.restoreDocumentProjection();
    byId('status').textContent='なぞった部分を復元しました。';
  }catch(error){
    byId('status').textContent='履歴ブラシを反映できませんでした。'+(error instanceof Error?error.message:'');
  }finally{
    geometryBusy=false;if(surface===drawing)drawing.setInputBarrier(false);
    renderLayers();updateHistoryButtons();updateQa();
  }
}
byId<HTMLButtonElement>('doneHistoryBrush').onclick=()=>{
  stopHistoryBrush();byId('status').textContent='絵を編集できます。';
};

function loadHistoryUndoLimit(artwork:CoreDocument){
  try{
    const key='illustro.history-undo-limit.'+artwork.root.documentId;
    const stored=localStorage.getItem(key);
    if(stored!==null)artwork.setHistoryUndoLimit(Number(stored));
  }catch{}
}
function createHistorySettings(artwork:CoreDocument,entries:ReturnType<CoreDocument['historyEntries']>,close:()=>void){
  const details=document.createElement('details'),summary=document.createElement('summary');
  const label=document.createElement('label'),limit=document.createElement('select'),status=document.createElement('output');
  const backup=document.createElement('button'),stats=document.createElement('p');
  summary.textContent='元に戻せる回数と保存領域';
  label.textContent='連続して元に戻せる回数 ';
  limit.replaceChildren(new Option('作品に残っている全履歴',''),...([50,100,200,500,1000].map(value=>new Option(value+'回',String(value)))));
  limit.value=String(artwork.historyUndoLimit??'');
  label.append(limit);
  const snapshots=entries.filter(entry=>entry.snapshot).length;
  stats.textContent='履歴 '+entries.length+'件。名前付き '+snapshots+'件。保持している画素データ '+(artwork.canonicalRasterBytes/1048576).toFixed(1)+' MiB。';
  backup.type='button';backup.textContent='履歴を含む作品のバックアップを保存';
  backup.onclick=()=>{if(controller.document===artwork)void saveWork(true);};
  status.setAttribute('aria-live','polite');
  limit.onchange=()=>{
    if(controller.document!==artwork||historyPending||surface?.busy){limit.value=String(artwork.historyUndoLimit??'');return;}
    const value=limit.value?Number(limit.value):null,key='illustro.history-undo-limit.'+artwork.root.documentId;
    artwork.setHistoryUndoLimit(value);
    try{
      if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,String(value));
      status.textContent='回数の設定を保存しました。名前付きの状態や履歴一覧からは引き続き復元できます。';
    }catch{status.textContent='この設定を端末に保存できませんでした。';}
    updateHistoryButtons();
  };
  const candidates=artwork.historyCleanupCandidates(),cleanup=document.createElement('details'),cleanupSummary=document.createElement('summary');
  const retained=document.createElement('p'),removed=document.createElement('ul'),copy=document.createElement('button');
  cleanupSummary.textContent='使われていない履歴を整理する（'+candidates.length+'件）';
  retained.textContent='現在の履歴、やり直せる操作、名前付きの状態、別案、これらが参照する時点を残します。除外候補は新しいコピーだけから外れます。';
  for(const entry of candidates){
    const item=document.createElement('li');
    const label=entry.label==='Brush stroke'?'描画':entry.label==='Add raster layer'?'レイヤーを追加':entry.label;
    item.textContent=label+' · '+new Date(entry.committedAt).toLocaleString('ja-JP');
    removed.append(item);
  }
  removed.className='history-cleanup-list';
  copy.type='button';copy.textContent='整理したコピーを開く';copy.disabled=!candidates.length;
  copy.onclick=()=>{close();void openCleanedHistory(artwork);};
  cleanup.append(cleanupSummary,retained,removed,copy);
  details.append(summary,stats,label,status,backup,cleanup);
  return details;
}

async function openCleanedHistory(artwork:CoreDocument){
  if(artwork!==controller.document||!(await prepareWorkSwitch())||artwork!==controller.document)return;
  try{
    const selectedLayerId=controller.selectedLayerId;
    const prepared=artwork.forkCopy(artwork.root.name.slice(0,4060)+'（履歴整理コピー）',true);
    const preserved=persistence.preservedData??{manifestExtras:{},optionalSections:[]};
    await activateOpened({document:prepared,selectedLayerId,preserved,generationId:'history-cleanup',snapshotRevisionId:prepared.head});
    byId('status').textContent='整理した履歴を持つ別の作品を開きました。';
    if(!qaMode){void refreshWorks();scheduleWorkThumbnail();}
  }catch(error){
    byId('status').textContent='整理したコピーを開けませんでした。'+(error instanceof Error?error.message:'');
  }
}

function openArtworkHistory(){
  if(!documentReady)return;
  const artwork=controller.document,head=artwork.head;
  const entries=[...artwork.historyEntries()].sort((a,b)=>b.committedAt-a.committedAt);
  const dialog=document.createElement('dialog'),form=document.createElement('form');
  const settings=createHistorySettings(artwork,entries,()=>dialog.close());
  const title=document.createElement('h2'),status=document.createElement('output');
  const label=document.createElement('label'),list=document.createElement('select');
  const more=document.createElement('button'),compare=document.createElement('button'),compareFull=document.createElement('button');
  const restore=document.createElement('button'),close=document.createElement('button');
  const pin=document.createElement('button'),branch=document.createElement('button');
  const note=document.createElement('p');
  const partial=document.createElement('details'),partialTitle=document.createElement('summary');
  const sourceLabel=document.createElement('label'),sources=document.createElement('select');
  const copyLayer=document.createElement('button'),copyRegion=document.createElement('button'),brush=document.createElement('button');
  partialTitle.textContent='以前のレイヤーからコピー';
  sourceLabel.textContent='復元元のレイヤー ';
  sourceLabel.append(sources);
  copyLayer.type=copyRegion.type=brush.type='button';
  brush.textContent='履歴ブラシを使う';
  copyLayer.textContent='レイヤー全体';
  copyRegion.textContent='現在選んでいる範囲だけ';
  partial.append(partialTitle,sourceLabel,copyLayer,copyRegion,brush);
  const previews=document.createElement('div');
  const pinned=document.createElement('div'),pinnedTitle=document.createElement('h3');
  const pinnedEntries=entries.filter(entry=>entry.snapshot);
  const morePinned=document.createElement('button');
  pinned.className='history-pinned';
  pinnedTitle.textContent='名前付きの状態';
  pinnedTitle.hidden=pinned.hidden=morePinned.hidden=!pinnedEntries.length;
  morePinned.type='button';morePinned.textContent='ほかの名前付きの状態';
  const urls:string[]=[],pinnedUrls:string[]=[],disposePreviews:Array<()=>void>=[];
  let shownPinned=0,thumbnailBatch=Promise.resolve();
  function appendPinned(){
    for(const entry of pinnedEntries.slice(shownPinned,shownPinned+6)){
      const button=document.createElement('button'),caption=document.createElement('span');
      button.type='button';
      caption.textContent=entry.snapshot!.name;
      button.append(caption);
      button.onclick=()=>{
        if(!Array.from(list.options).some(option=>option.value===entry.id)){
          list.add(new Option(entry.snapshot!.name,entry.id));
        }
        list.value=entry.id;update();
      };
      pinned.append(button);
      thumbnailBatch=thumbnailBatch.then(async()=>{
        if(!dialog.open)return;
        try{
          const blob=await historyThumbnail(artwork,entry.id);
          if(!dialog.open)return;
          const url=URL.createObjectURL(blob);pinnedUrls.push(url);
          const thumb=new Image();thumb.src=url;thumb.alt='';
          button.prepend(thumb);
        }catch{caption.title='縮小画像を作成できませんでした。';}
      });
      shownPinned++;
    }
    morePinned.hidden=shownPinned>=pinnedEntries.length;
  }
  morePinned.onclick=appendPinned;
  let shown=0,request=0;
  function clearPreviews(){
    for(const dispose of disposePreviews.splice(0))dispose();
    for(const url of urls.splice(0))URL.revokeObjectURL(url);
    previews.replaceChildren();
  }
  function appendEntries(){
    const page=entries.slice(shown,shown+200);
    for(const entry of page){
      const label=entry.label==='Add raster layer'?'レイヤーを追加':entry.label==='Brush stroke'?'描画':entry.label;
      const time=new Date(entry.committedAt).toLocaleString('ja-JP');
      const description=entry.snapshot?'保存した状態「'+entry.snapshot.name+'」':label;
      list.add(new Option((entry.id===head?'現在 · ':'')+description+' · '+time,entry.id));
    }
    shown+=page.length;
    more.hidden=shown>=entries.length;
  }
  for(const [button,text] of [[more,'さらに表示'],[compare,'現在と比較'],[compareFull,'原寸で比較'],[restore,'この時点を復元'],[pin,'現在の状態を名前付きで保存'],[branch,'この時点から別案を作る'],[close,'閉じる']] as const){
    button.type='button';button.textContent=text;
  }
  title.textContent='作品の履歴';
  label.textContent='比較する時点 ';
  label.append(list);
  status.setAttribute('aria-live','polite');
  previews.className='artwork-history-previews';
  appendEntries();
  list.value=head;
  const update=()=>{
    request++;
    clearPreviews();
    restore.disabled=!list.value||list.value===head;
    compare.disabled=compareFull.disabled=restore.disabled;
    branch.disabled=restore.disabled;
    note.textContent=entries.find(entry=>entry.id===list.value)?.snapshot?.note??'';
    note.hidden=!note.textContent;
    sources.replaceChildren();
    if(list.value&&list.value!==head){
      const root=artwork.revision(list.value as RevisionId).root;
      for(const id of [...root.rootLayerIds].reverse())sources.add(new Option(root.getLayer(id).name,id));
    }
    copyLayer.disabled=brush.disabled=!sources.value;
    copyRegion.disabled=!sources.value||!surface?.selectedRectangle;
    status.textContent='';
  };
  const copy=(selectedRegion:boolean)=>{
    const id=list.value as RevisionId,source=sources.value as LayerId;
    if(!id||!source)return;
    dialog.close();
    void copyHistoricalLayer(artwork,id,source,selectedRegion);
  };
  copyLayer.onclick=()=>copy(false);
  brush.onclick=()=>{
    const source=sources.value as LayerId,revision=list.value as RevisionId;
    if(!source||!revision)return;
    dialog.close();void startHistoryBrush(artwork,revision,source);
  };
  copyRegion.onclick=()=>copy(true);
  list.onchange=update;
  more.onclick=appendEntries;
  close.onclick=()=>dialog.close();
  pin.onclick=()=>{dialog.close();saveNamedArtworkSnapshot(openArtworkHistory);};
  branch.onclick=async()=>{
    const id=list.value as RevisionId;
    if(!id||id===head)return;
    const title=(await appPrompt('別案の名前',entries.find(entry=>entry.id===id)?.snapshot?.name??'別案'))?.trim();
    if(!title)return;
    dialog.close();
    void restoreArtworkHistory(artwork,id,title.slice(0,160));
  };
  restore.onclick=async()=>{
    const id=list.value as RevisionId;
    if(!id||id===head||!await appConfirm('この時点を復元しますか？ 直前の状態も履歴に残ります。'))return;
    dialog.close();
    void restoreArtworkHistory(artwork,id);
  };
  const displayComparison=async(fullResolution:boolean)=>{
    const id=list.value as RevisionId,token=++request;
    compare.disabled=compareFull.disabled=true;
    clearPreviews();
    status.textContent=fullResolution?'原寸画像を準備しています。':'表示用の比較画像を準備しています。';
    try{
      for(const [revision,caption] of [[head,'現在'],[id,'選んだ時点']] as const){
        if(!dialog.open||request!==token)return;
        const result=fullResolution
          ?await exportImage(captureExport(artwork,undefined,revision),'png')
          :await historyComparisonPreview(artwork,revision);
        if(!dialog.open||request!==token)return;
        const url=URL.createObjectURL(result.blob);urls.push(url);
        const preview=createHistoryComparison(url,caption,result.width,result.height);
        disposePreviews.push(preview.dispose);
        previews.append(preview.figure);
      }
      status.textContent=fullResolution?'原寸画像で比較しています。':
        '軽量な縮小画像で比較中です。細部は「原寸で比較」で確認できます。';
    }catch(error){
      if(request===token&&dialog.open)status.textContent='比較画像を作れませんでした。'+(error instanceof Error?error.message:'');
    }finally{
      if(request===token&&dialog.open)compare.disabled=compareFull.disabled=false;
    }
  };
  compare.onclick=()=>{void displayComparison(false);};
  compareFull.onclick=()=>{void displayComparison(true);};
  form.append(title,pinnedTitle,pinned,morePinned,label,note,more,compare,compareFull,restore,pin,branch,close,partial,status,previews,settings);
  dialog.className='export-dialog artwork-history-dialog artwork-history-panel';
  dialog.setAttribute('aria-label','作品の履歴');
  dialog.append(form);
  document.body.append(dialog);
  dialog.addEventListener('close',()=>{
    request++;clearPreviews();
    for(const url of pinnedUrls)URL.revokeObjectURL(url);
    dialog.remove();
  },{once:true});
  update();
  dialog.show();
  appendPinned();
}
byId<HTMLButtonElement>('openArtworkHistory').onclick=openArtworkHistory;

async function reloadGeometryProjection(){
 const oldPreset=surface?.brushId,previousView=surface?.viewState;surface?.destroy();surface=makeSurface();
 await initializeCurrentSurface(true);surface?.setInputBarrier(historyPending);
 if(previousView&&previousView.documentWidth===controller.document.root.width&&previousView.documentHeight===controller.document.root.height)surface?.restoreView(previousView);
 if(oldPreset){try{selectPreset(oldPreset);}catch{}}
 updateViewControls();renderLayers();updateQa();redrawCrop();
}
/** Editing the white base itself is uncommon; only then do we materialize it.
 * All other layers are rebased from exact current GPU pixels, preserving ink.
 * This never runs during canvas creation, ordinary drawing, or native saves. */
async function materializeAndSelectWhiteLayer(layerId:LayerId){
  if(geometryBusy||!surface?.canChangeGeometry)throw new Error('描画処理中です。背景レイヤーの準備ができません。');
  const root=controller.document.root;
  if(!root.hasLayer(layerId))throw new Error('背景レイヤーが見つかりません。');
  if(root.getLayer(layerId).baseColor!=='white'){controller.selectLayer(layerId);renderLayers();return;}
  geometryBusy=true;surface.setInputBarrier(true);
  byId('status').textContent='背景レイヤーを編集できるようにしています。';
  try{
    await surface.settleStrokes();
    await historyNavigation?.barrier();
    const pixels=await surface.captureDocumentLayers();
    // This is the first point at which physical white bytes are needed.
    // The usual path never allocates them, including native .illustro save.
    const white=pixels.get(layerId);
    if(!white)throw new Error('白背景のデータがありません。');
    white.fill(255);
    const tx=controller.document.begin('背景レイヤーを編集用に変換');
    tx.resizeDocument(root.width,root.height,'document.canvas-resize',pixels,{materializeLogicalWhite:true});
    const receipt=tx.commit();
    controller.lastPersistenceHandoff=receipt.persistence;
    queueLatestCommit();
    await reloadGeometryProjection();
    controller.selectLayer(layerId);
    if(!qaMode)void persistence.selectWorkLayer(layerId).catch(showStorageError);
    renderLayers();updateHistoryButtons();updateQa();
    byId('status').textContent='背景レイヤーを編集できます。';
  }finally{
    geometryBusy=false;surface?.setInputBarrier(false);updateHistoryButtons();
  }
}
async function applyGeometry(){
 if(!geometryMode||geometryBusy||!surface?.canChangeGeometry)return;
 const mode=geometryMode,old=controller.document.root,w=Number(dimensionInput('geometryWidth').value),h=Number(dimensionInput('geometryHeight').value);
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||w>8192||h>8192){byId('geometryStatus').textContent='幅と高さを1〜8192pxで指定してください。';return;}
 let rect=geometryRect();
 if(mode==='document.crop'&&!rect){byId('geometryStatus').textContent='切り抜き範囲が作品からはみ出しています。';return;}
 if(mode!=='document.crop'&&w===old.width&&h===old.height){byId('geometryStatus').textContent='元の大きさと同じです。';return;}
 geometryBusy=true;byId<HTMLButtonElement>('geometryApply').disabled=true;byId('geometryStatus').textContent='作品を変更しています。';
 const canvas=byId<HTMLCanvasElement>('canvas');canvas.style.pointerEvents='none';
 try{
  const source=await surface.captureDocumentLayers(),out=new Map<ReturnType<EditorController['target']>['layerId'],Uint8Array>();
  const anchor=dimensionInput('geometryAnchor').value as 'center'|'top-left'|'top-right'|'bottom-left'|'bottom-right';
  const shift=shiftedForAnchor(old.width,old.height,w,h,anchor);
  const method=dimensionInput('geometryFilter').value as ImageResample;
  for(const [id,pixels] of source){
   out.set(id,mode==='document.crop'?cropCanvas(pixels,old.width,old.height,rect!.x,rect!.y,w,h):
     mode==='document.canvas-resize'?changeCanvasBounds(pixels,old.width,old.height,w,h,shift.x,shift.y):
     resizeImagePixels(pixels,old.width,old.height,w,h,method));
  }
  const tx=controller.document.begin(mode==='document.crop'?'Crop':mode==='document.canvas-resize'?'Canvas Resize':'Image Resize');
  tx.resizeDocument(w,h,mode,out,mode==='document.crop'?{x:rect!.x,y:rect!.y}:{anchor,filter:method});
  const receipt=tx.commit();controller.lastPersistenceHandoff=receipt.persistence;queueLatestCommit();
  geometryMode=null;geometryDialog.close();cropOverlay.setAttribute('hidden','');
  await reloadGeometryProjection();scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);
  byId('status').textContent='作品を'+w+'×'+h+'pxに変更しました。元に戻すこともできます。';
 }catch(error){byId('geometryStatus').textContent=error instanceof Error?error.message:'変更できませんでした。';}
 finally{canvas.style.pointerEvents='';geometryBusy=false;byId<HTMLButtonElement>('geometryApply').disabled=false;updateHistoryButtons();updateQa();}
}
byId('geometryApply').onclick=()=>{void applyGeometry();};

const documentInfoDialog=byId<HTMLDialogElement>('documentInfoDialog');
const workTime=installWorkTime(documentInfoDialog.querySelector('form')!,byId('canvasArea'),
  ()=>documentReady&&!app.inert&&!documentActivationPending?controller.document.root.documentId:null);
byId('documentInfoOpen').onclick=()=>{
  if(!documentReady||!surface)return;
  const root=controller.document.root,info=root.info;
  byId<HTMLInputElement>('documentInfoName').value=info.name;
  byId<HTMLInputElement>('documentInfoAuthor').value=info.author;
  byId<HTMLInputElement>('documentInfoDpi').value=info.dpi===null?'':String(info.dpi);
  byId<HTMLTextAreaElement>('documentInfoDescription').value=info.description;
  byId('documentInfoSize').textContent=root.width+' × '+root.height+' px · '+(root.colorProfileId==='srgb'?'sRGB':root.colorProfileId);
  byId('documentInfoStatus').textContent='';
  byId<HTMLInputElement>('canvasTemplateName').value='';
  workTime.refresh();documentInfoDialog.showModal();
};
byId('documentInfoClose').onclick=()=>documentInfoDialog.close();
byId<HTMLFormElement>('documentInfoForm').onsubmit=event=>{
  event.preventDefault();
  if(!documentReady||!surface)return;
  if(surface.hasUncommittedInput||surface.inputActive||historyPending||geometryBusy){
    byId('documentInfoStatus').textContent='現在の操作が終わってから適用してください。';
    return;
  }
  const dpi=byId<HTMLInputElement>('documentInfoDpi');
  try{
    const tx=controller.document.begin('作品情報を変更');
    if(tx.setDocumentInfo({name:byId<HTMLInputElement>('documentInfoName').value,
      author:byId<HTMLInputElement>('documentInfoAuthor').value,
      description:byId<HTMLTextAreaElement>('documentInfoDescription').value,
      dpi:dpi.value===''?null:dpi.valueAsNumber})){
      controller.lastPersistenceHandoff=tx.commit().persistence;
      surface.discardRedoProjection();
      queueLatestCommit();
      updateHistoryButtons();updateQa();
      byId('status').textContent='作品情報を変更しました。';
    }
    documentInfoDialog.close();
  }catch(error){byId('documentInfoStatus').textContent=error instanceof Error?error.message:String(error);}
};
byId<HTMLFormElement>('canvasTemplateForm').onsubmit=event=>{
  event.preventDefault();
  const root=controller.document.root;
  const input=byId<HTMLInputElement>('canvasTemplateName');
  if(root.colorProfileId!=='srgb'){
    byId('documentInfoStatus').textContent='この色プロファイルのテンプレート保存には対応していません。';
    return;
  }
  try{
    storeCreationTemplate(localStorage,{name:input.value,width:root.width,height:root.height,dpi:root.metadata.dpi??72,
      background:root.getLayer(root.rootLayerIds[0]!).baseColor==='white'?'white':'transparent'});
    input.value='';
    byId('documentInfoStatus').textContent='新規作成用のテンプレートを保存しました。';
  }catch(error){byId('documentInfoStatus').textContent=error instanceof Error?error.message:String(error);}
};

async function initializeCurrentSurface(replay:boolean,projectionCache?:PortableOpenResult['projectionCache'],prewarmed=false,freshWhiteSurfaceKey:string|null=null){
  if(!surface)throw new Error('描画面がありません。');
  if(!prewarmed){
    const gpuStarted=performance.now();
    await surface.initialize();
    measureCanvasStage('gpu-and-worker-init',gpuStarted);
  }else{
    // The already-initialized host keeps its shader pipelines, Workers, and
    // renderer state. Re-initializing would destroy the whole benefit.
    performance.mark('illustro-canvas:reused-home-gpu');
  }
  const acceptedBrushes=surface.brushes.map(p=>structuredClone(p));
  builtInBrushes=[...acceptedBrushes,...additionalBrushes(acceptedBrushes)];
  surface.setBrushes(brushPresets.all(builtInBrushes));
  refreshBrushOptions();
  if(brushPresets.loadError)byId('brushLibraryStatus').textContent='保存済みブラシを読み取れませんでした: '+brushPresets.loadError;
  const defaultBrush=surface.brushes.find(p=>p.id==='foundation-g-pen')??surface.brushes.find(p=>p.blend!=='erase')??surface.brushes[0]!;
  lastBrushPresetId=surface.brushes.some(p=>p.id===lastBrushPresetId)?lastBrushPresetId:defaultBrush.id;
  lastEraserPresetId=surface.brushes.find(p=>p.id==='foundation-hard-eraser')?.id??surface.brushes.find(p=>p.blend==='erase')?.id??lastEraserPresetId;
  let initialBrushId=lastBrushPresetId;
  if(!qaMode){
    const documentId=controller.document.root.documentId;
    brushDrafts=workBrushDrafts.get(documentId)??new Map();
    workBrushDrafts.set(documentId,brushDrafts);
    temporaryEraserReturn=null;
    temporaryEraserRestoreRequested=false;
    const settings=readWorkBrushSettings(brushPresets.storage,documentId);
    const saved=settings&&surface.brushes.find(p=>p.id===settings.presetId);
    lastBrushPresetId=defaultBrush.id;
    initialBrushId=saved?.id??defaultBrush.id;
    if(saved&&settings&&(brushDrafts.get(saved.id)?.size??saved.size)!==settings.size){
      brushDrafts.set(saved.id,{...(brushDrafts.get(saved.id)??saved),size:settings.size});
    }
  }
  selectPreset(initialBrushId,false);
  if(freshWhiteSurfaceKey){
    // No white pixels are generated at startup. The editor already displays
    // an ordinary white paper; the layer's real color is recorded in Core.
    performance.mark('illustro-canvas:logical-white-ready');
  }else if(replay){
    const replayStarted=performance.now();
    await surface.restoreDocumentProjection(projectionCache);
    measureCanvasStage('projection-restore',replayStarted);
  }
  for(const id of ['brush','size','sizeNumber','force','addLayer','addLayerPage','save','saveCopy','exportImage','flipH','flipV','brushDuplicate','brushSave','brushOpacity','brushOpacityNumber','brushFlow','brushFlowNumber','brushSpacing','brushPressure','brushStabilization','brushStabilizationNumber','brushTexture','brushAzimuth','brushTwist'])(byId(id) as HTMLInputElement).disabled=false;
  syncPreset();surface.setForegroundColor([foreground.current.r,foreground.current.g,foreground.current.b],foreground.opacity);documentReady=true;c06Selection?.documentChanged();renderLayers();void c05ReferenceBoard?.refreshIfChanged();updateHistoryButtons();
}
async function activateOpened(opened:PortableOpenResult,recovered=false,expectedEpoch:string|null=null,freshWhiteSurfaceKey:string|null=null){
  if(documentActivationPending)throw new Error('別の作品を開いています。');
  const previous=controller,previousPreserved=persistence.preservedData,previousSymmetry=symmetrySettings,wasReady=documentReady;
  persistCanvasView();documentActivationPending=true;documentReady=false;
  // A NEW work has no dependency between the GPU worker and the storage
  // worker. Start storage during GPU initialization, but do not expose input
  // before BOTH have finished. Other open/recovery paths stay unchanged.
  let newStorageInit:Promise<{ok:true}|{ok:false;error:unknown}>|null=null;
  try{
  updateHistoryButtons();const barrierStarted=performance.now();await historyNavigation?.barrier();
  measureCanvasStage('history-barrier',barrierStarted);
  discardBlankWarmup();
  surface?.destroy();
  // Clearing an existing displayed bitmap is a constant-size browser reset.
  // Without it, a second pristine canvas can briefly show pixels from the
  // previous work while its brand-new display Worker prepares the first frame.
  const firstEmptyCanvas=opened.generationId==='new'&&!opened.projectionCache&&(opened.document.operationsTo().length===0||freshWhiteSurfaceKey!==null);
  if(firstEmptyCanvas){
    const canvas=byId<HTMLCanvasElement>('canvas');
    canvas.width=canvas.width;
  }
  symmetrySettings=DEFAULT_SYMMETRY;
  try{
    const local=localStorage.getItem('illustro.symmetry.'+opened.document.root.documentId);
    const section=opened.preserved.optionalSections.find(item=>item.id===SYMMETRY_SECTION&&item.type===SYMMETRY_TYPE);
    const encoded=local??(section&&section.bytes.length<4096?new TextDecoder().decode(section.bytes):null);
    if(encoded){
      const state=JSON.parse(encoded);
      if(state&&typeof state==='object')symmetrySettings=normalizeSymmetry(state);
    }
  }catch{/* The symmetry mode remains off if the work's settings cannot be read. */}
  symmetryPanel?.restore(symmetrySettings);
  controller=EditorController.restored(opened.document,opened.selectedLayerId);loadHistoryUndoLimit(opened.document);lastQueuedRevision=null;resetCheckpointTracking();surface=makeSurface();
  if(opened.generationId==='new'){
    persistence.clearFileDestination();
    const started=performance.now();
    // Library binding depends on storage initialization, but neither depends
    // on GPU worker readiness. Start both now instead of serializing them.
    newStorageInit=persistence.initialize(controller,null,opened.preserved,recovered,opened.selection??null)
      .then(async()=>{
        measureCanvasStage('storage-init',started);
        if(!qaMode){
          const boundAt=performance.now();
          await persistence.bindWork(expectedEpoch);
          measureCanvasStage('work-bind',boundAt);
        }
        return {ok:true as const};
      }).catch(error=>({ok:false as const,error}));
  }
  try{await initializeCurrentSurface(!firstEmptyCanvas,opened.projectionCache,false,freshWhiteSurfaceKey);}
  catch(error){
    const requested=new URLSearchParams(location.search).get('backend'),selection=surface?.backendSelection as {selected?:string}|null;
    if(requested!=='webgpu'&&requested!=='webgl2'&&selection?.selected==='webgpu'){
      surface?.destroy();surface=makeSurface('webgl2');await initializeCurrentSurface(!firstEmptyCanvas,opened.projectionCache,false,freshWhiteSurfaceKey);
    }else throw error;
  }
  const savedView=qaMode||opened.generationId==='new'?null:readCanvasView(opened.document.root.documentId);
  if(savedView)surface?.restoreView(savedView);
  if(newStorageInit){
    const status=await newStorageInit;
    if(!status.ok)throw status.error;
  }else{
    persistence.clearFileDestination();
    const started=performance.now();
    await persistence.initialize(controller,null,opened.preserved,recovered,opened.selection??null);
    measureCanvasStage('storage-init',started);
  }
  // For NEW works the library was bound concurrently with GPU startup.
  // Restored/imported works retain the existing serialized binding semantics.
  if(!qaMode&&!newStorageInit){
    const started=performance.now();
    await persistence.bindWork(expectedEpoch);
    measureCanvasStage('work-bind',started);
  }
  surface?.restoreRectangleSelection(opened.selection??null);
  // Import a verified optional PNG preview without blocking first editable paint.
  if(!qaMode&&opened.previewImage){
    const id=controller.document.root.documentId,revision=controller.document.head,image=opened.previewImage.slice();
    window.setTimeout(()=>{void (async()=>{
      const blob=new Blob([image.buffer as ArrayBuffer],{type:'image/png'}),bitmap=await createImageBitmap(blob);
      try{if(bitmap.width>0&&bitmap.height>0&&bitmap.width<=320&&bitmap.height<=240)await persistence.storeThumbnail(id,revision,blob);}finally{bitmap.close();}
    })().catch(error=>console.warn('Imported optional preview ignored:',error));},0);
  }
  // Native-file reference contents are optional. Preserve first editable paint
  // and read the reference-only section independently of artwork initialization.
  if(opened.preserved?.optionalSections.some(section=>section.id==='c05.reference-board')){
    void c05ReferenceBoard?.importNative(opened.preserved).catch(error=>{
      byId('status').textContent='参考資料を読み込めませんでした。'+(error instanceof Error?error.message:String(error));
    });
  }
  if(opened.preserved?.optionalSections.some(section=>section.id==='c06.selection.index')){
    void c06Selection?.importNative(opened.preserved).catch(error=>{
      byId('status').textContent='選択範囲を復元できませんでした。'+(error instanceof Error?error.message:String(error));
    });
  }
  if(opened.preserved?.optionalSections.some(section=>section.id.startsWith('c10.font.'))){
    void importFonts(controller.document.root,opened.preserved).catch(error=>{
      byId('status').textContent=error instanceof Error?error.message:String(error);
    });
  }
  if(opened.generationId!=='library'){
    try{timeline?.restoreNative(opened.document,opened.preserved.optionalSections);}
    catch(error){console.warn('Optional timelapse metadata could not be read',error);}
  }
  // Prefer the exact palette embedded in this native file to device-local data.
  eyedropperSettings.refreshLayers();eyedropperSettings.apply();
  const paletteSection=opened.preserved.optionalSections.find(
    part=>part.id===DOCUMENT_PALETTE_SECTION
  )??null;
  try{foreground.bindDocumentPalette(opened.document.root.documentId,paletteSection);}
  catch(error){
    foreground.bindDocumentPalette(opened.document.root.documentId);
    byId('status').textContent='作品の色一覧を復元できませんでした。元の作品は開いています。'+
      (error instanceof Error?error.message:'');
  }
  scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);updatePersistenceDisplay();updateQa();
  }catch(error){
    // A started storage initialization must finish before rollback restores
    // the previous document, or the late worker reply could replace its state.
    if(newStorageInit)await newStorageInit;
    symmetrySettings=previousSymmetry;symmetryPanel?.restore(previousSymmetry);
    surface?.destroy();const snapshot=previous.document.capturePersistenceSnapshot();controller=EditorController.restored(CoreDocument.restore({snapshot,blockPayloads:previous.document.persistenceBlockPayloads(snapshot)}),previous.selectedLayerId);surface=makeSurface();documentReady=false;
    if(wasReady){try{await initializeCurrentSurface(true);await persistence.initialize(controller,null,previousPreserved,false);const current=(await persistence.listWorks()).works.find(x=>x.documentId===controller.document.root.documentId);if(!qaMode)await persistence.bindWork(current?.writerEpochId??null);}catch{}}
    throw error;
  }finally{documentActivationPending=false;}
}
async function activateFirstPrewarmedBlank(entry:BlankWarmup){
  // All resources belong to the exact document that was initialized on Home.
  // Never replace the CoreDocument after the host has bound its surface IDs.
  initialBlankWarmup=null;
  controller=entry.controller;
  surface=entry.drawing;
  lastQueuedRevision=null;
  resetCheckpointTracking();
  persistence.clearFileDestination();
  const storageStarted=performance.now();
  const storagePromise=persistence.initialize(controller,null,{manifestExtras:{},optionalSections:[]},false)
    .then(async()=>{
      measureCanvasStage('storage-init',storageStarted);
      const bindStarted=performance.now();
      await persistence.bindWork(null);
      measureCanvasStage('work-bind',bindStarted);
      return {ok:true as const};
    }).catch(error=>({ok:false as const,error}));
  try{
    const warmAwaitStarted=performance.now();
    const ready=await entry.ready;
    measureCanvasStage('prewarm-await',warmAwaitStarted);
    if(!ready)throw Error('Home GPU preparation unavailable');
    const presetSetupStarted=performance.now();
    await initializeCurrentSurface(false,undefined,true);
    measureCanvasStage('prewarmed-editor-setup',presetSetupStarted);
    const storage=await storagePromise;
    if(!storage.ok)throw storage.error;
    foreground.bindDocumentPalette(controller.document.root.documentId);
    eyedropperSettings.refreshLayers();eyedropperSettings.apply();
    scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);
    updatePersistenceDisplay();
    updateQa();
  }catch(error){
    await storagePromise;
    entry.drawing.destroy();
    surface=null;
    documentReady=false;
    controller=new EditorController();
    throw error;
  }
}
async function createDocument(width:number,height:number,name='新しい作品',background:'transparent'|'white'='transparent',dpi=72,author='',description='',emptyDrawingLayer=false):Promise<boolean>{
  const createStarted=performance.now();
  const trigger=byId<HTMLButtonElement>('new');
  if(trigger.disabled)return false;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>8192||height>8192){
    byId('status').textContent='幅と高さを1〜8192pxで指定してください。';return false;
  }
  if(!qaMode&&!(await prepareWorkSwitch()))return false;
  measureCanvasStage('work-switch',createStarted);
  trigger.disabled=true;byId('status').textContent='キャンバスを準備しています。';
  try{
    const documentStarted=performance.now();
    const warm=emptyDrawingLayer?null:matchedBlankWarmup(width,height,name,background,dpi,author,description);
    if(!warm)discardBlankWarmup();
    const blank=warm?{document:warm.controller.document,selected:warm.selectedLayerId,whiteSurfaceKey:warm.whiteSurfaceKey}:newBlankDocument(width,height,name,background,dpi,author,description,emptyDrawingLayer);
    const {document,selected,whiteSurfaceKey}=blank;
    measureCanvasStage('new-document-model',documentStarted);
    if(warm)await activateFirstPrewarmedBlank(warm);
    else await activateOpened({document,selectedLayerId:selected,preserved:{manifestExtras:{},optionalSections:[]},generationId:'new',snapshotRevisionId:document.head},false,null,whiteSurfaceKey);
    if(!qaMode){void storeBlankThumbnail(document.root.documentId,document.head,background);void refreshWorks();}
    const selection=surface?.backendSelection as {fallbackUsed?:boolean;selected?:string;webgpu?:{stage?:string;error?:string|null}}|null;
    byId('status').textContent=selection?.fallbackUsed?'描画できます。WebGPUを使えなかったためWebGL2に切り替えました。':'描画できます。作業内容は自動的に保護されます。';
    updateQa();measureCanvasStage('click-to-editable',createStarted);return true;
  }catch(error){
    const message=surface?.initializationError||(error instanceof Error?error.message:String(error));
    updateQa();byId('status').textContent='描画を開始できませんでした。'+message;return false;
  }finally{trigger.disabled=false;}
}
byId<HTMLButtonElement>('new').onclick=()=>{
  if(homeUi&&!qaMode){homeUi.showNew();return;}
  void createDocument(Number(byId<HTMLInputElement>('newCanvasWidth').value)||512,Number(byId<HTMLInputElement>('newCanvasHeight').value)||384);
};
byId<HTMLButtonElement>('addLayer').onclick=()=>{if(!surface)return;if(surface.busy||historyPending){byId('status').textContent='今の操作が終わってからレイヤーを追加してください。';return;}try{const id=controller.addRasterLayer(),layer=controller.document.root.getLayer(id);surface.syncLayerStack();surface.discardRedoProjection();queueLatestCommit();renderLayers();updateHistoryButtons();byId('status').textContent=`${layer.name}を追加して選択しました。`;updateQa();}catch{byId('status').textContent='レイヤーを追加できませんでした。';}};

byId<HTMLButtonElement>('addLayerPage').onclick=()=>byId<HTMLButtonElement>('addLayer').click();

historyNavigation=new HistoryNavigation({
  admit:direction=>{const change=direction==='undo'?controller.undo():controller.redo();surface?.admitHistory(change);admittedHistoryChanges.push(change);},
  prepare:async()=>{await surface?.prepareHistory();},apply:applyHistoryBatch,
  state:()=>{historyPending=historyNavigation?.pending??false;surface?.setInputBarrier(historyPending);if(!historyPending)surface?.resumeHistory();updateHistoryButtons();updatePersistenceDisplay();updateQa();},
  failed:(message,unprocessed)=>{
    // Preparation can fail before applyHistoryBatch owns the admitted changes.
    // Refused capacity requests have no admitted change and must keep the queue.
    if(unprocessed)for(const change of admittedHistoryChanges.splice(0).filter(change=>change.changed).reverse()){
      const inverse=change.direction==='undo'?controller.redo():controller.undo();surface?.admitHistory(inverse);
    }
    byId('status').textContent=message+(unprocessed?' 未処理のUndo / Redo '+unprocessed+'件は反映していません。':'');
  },
},perfMode);
async function applyHistoryBatch(directions:readonly HistoryDirection[]){
  const changes:EditorHistoryChange[]=[],selectedBefore=controller.selectedLayerId;
  try{
    for(const direction of directions){const change=admittedHistoryChanges.shift();if(!change||change.direction!==direction)throw new Error('履歴操作の順序が一致しません。');if(change.changed)changes.push(change);}
    if(!changes.length){byId('status').textContent='これ以上その方向へ履歴を移動できません。';return;}
    updateQa();
    if(changes.some(change=>change.operations.some(op=>op.kind==='document.crop'||op.kind==='document.canvas-resize'||op.kind==='document.image-resize'||op.kind==='layer.delete'||op.kind==='layer.snapshot'||op.kind==='document.history-restore')))await reloadGeometryProjection();else await surface!.syncHistoryBatch(changes);
    undoCount+=changes.filter(c=>c.direction==='undo').length;redoCount+=changes.filter(c=>c.direction==='redo').length;
    renderLayers();persistence.noteNavigation(controller.document);noteCheckpointOperations(changes.flatMap(c=>c.operations));
    const last=changes.at(-1)!;byId('status').textContent=last.direction==='undo'?'前の状態に戻しました。':'取り消した操作をやり直しました。';
  }catch(error){
    for(const change of [...changes,...admittedHistoryChanges.splice(0)].filter(change=>change.changed).reverse()){if(change.direction==='undo')controller.redo();else controller.undo();}if(controller.document.root.hasLayer(selectedBefore))controller.selectLayer(selectedBefore);
    try{await reloadGeometryProjection();}catch(restoreError){throw new Error('Undo / Redoの表示復旧に失敗しました。'+String(restoreError)+' 原因：'+String(error));}
    throw new Error('Undo / Redoを反映できなかったため、直前の状態へ戻しました。'+String(error));
  }
}
function performHistory(direction:HistoryDirection){
  if(!documentReady||!surface||geometryBusy)return 'not-ready';if(surface.inputActive&&!historyPending)return 'active-input';
  const available=historyPending||(direction==='undo'?surface.canUndo:surface.canRedo);if(!available)return 'no-target';
  if(surface.navigatePending(direction)){if(direction==='undo')undoCount++;else redoCount++;byId('status').textContent=direction==='undo'?'線を取り消しました。':'取り消した線をやり直します。';updateHistoryButtons();updatePersistenceDisplay();updateQa();return 'accepted';}
  return historyNavigation!.enqueue(direction)?'accepted':'capacity-or-fault';
}
function bindHistoryButton(id:string,direction:'undo'|'redo'){
  const button=byId<HTMLButtonElement>(id);let press:number|null=null,touchHandled:number|null=null;
  button.style.touchAction='manipulation';
  button.addEventListener('pointerdown',event=>{press=button.disabled?null:event.pointerId;touchHandled=null;traceHistoryInput(button,direction,'down',event);});
  button.addEventListener('pointercancel',event=>{press=null;traceHistoryInput(button,direction,'cancel',event);});
  // Touch/pen releases are commands immediately, before a delayed compatibility
  // click. Each press owns its admission; keyboard activation stays native.
  button.addEventListener('pointerup',event=>{
    traceHistoryInput(button,direction,'up',event);if(event.pointerType==='mouse'||press!==event.pointerId||button.disabled)return;
    const target=document.elementFromPoint(event.clientX,event.clientY);if(!target||!button.contains(target)){press=null;return;}
    touchHandled=event.pointerId;const result=performHistory(direction);traceHistoryInput(button,direction,result==='accepted'?'accepted':'rejected',event,result);
  });
  button.onclick=event=>{
    // Chromium/Android can assign a different pointerId to the synthesized
    // click than to the pen's pointerup. A handled pen/touch release always
    // consumes its following compatibility click, regardless of click pointerId.
    // A genuinely new physical press resets touchHandled in pointerdown.
    if(event.detail>0&&touchHandled!==null){touchHandled=null;press=null;event.preventDefault();traceHistoryInput(button,direction,'compatibility-click',event);return;}
    if(event.detail>0&&press===null){blockedHistoryGhostClicks++;event.preventDefault();traceHistoryInput(button,direction,'rejected',event,'outside-press');updateQa();return;}
    press=null;const result=performHistory(direction);traceHistoryInput(button,direction,result==='accepted'?'accepted':'rejected',event,result);
  };
}
bindHistoryButton('undo','undo');bindHistoryButton('compactUndo','undo');bindHistoryButton('redo','redo');bindHistoryButton('compactRedo','redo');

function isTextEditingTarget(target:EventTarget|null){if(!(target instanceof HTMLElement))return false;if(target.isContentEditable||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement)return true;if(target instanceof HTMLInputElement){return !['button','checkbox','radio','range','submit','reset'].includes(target.type);}return false;}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&e.defaultPrevented)return;
  if(isTextEditingTarget(e.target)||e.altKey)return;
  const primary=e.ctrlKey||e.metaKey;if(!primary)return;const key=e.key.toLowerCase();
  const undo=key==='z'&&!e.shiftKey,redo=(key==='z'&&e.shiftKey)||(key==='y'&&e.ctrlKey&&!e.metaKey);
  if(!undo&&!redo)return;const direction=undo?'undo':'redo',available=direction==='undo'?surface?.canUndo:surface?.canRedo;
  if(!documentReady||!surface||(surface.inputActive&&!historyPending)||geometryBusy||(!available&&!historyPending))return;e.preventDefault();performHistory(direction);
});

const renderBrushCatalog=installBrushCatalogView(byId('brush'));
function refreshBrushOptions(){
 if(!surface)return;
 const search=byId<HTMLInputElement>('brushSearch').value;
 const group=byId<HTMLSelectElement>('brushGroup').value as BrushCatalogGroup;
 const selected=surface.preset?.id??'';
 const matches=filterBrushCatalog(surface.brushes,{query:search,group,isUser:id=>brushPresets.isUser(id),favoriteIds:brushUsage.favoriteIds,recentIds:brushUsage.recentIds});
 const picker=byId<HTMLSelectElement>('brush');picker.replaceChildren();
 // The active brush stays selectable even if excluded by the filter.
 const active=surface.brushes.find(p=>p.id===selected);
 const outside=Boolean(active&&!matches.some(p=>p.id===selected));
 if(active&&outside)picker.add(new Option('選択中 · '+active.name,active.id));
 for(const preset of matches){
   picker.add(new Option((brushUsage.isFavorite(preset.id)?'★ ':'')+preset.name+(brushPresets.isUser(preset.id)?' · 自作':''),preset.id));
 }
 if(selected)picker.value=selected;
 renderBrushCatalog(surface.brushes);
 byId('brushCatalogCount').textContent=matches.length+'本が該当します。'+(outside?'選択中のブラシは引き続き使用できます。':'');
 const favorite=byId<HTMLButtonElement>('brushFavorite');favorite.disabled=!selected;
 favorite.setAttribute('aria-pressed',String(brushUsage.isFavorite(selected)));
 favorite.textContent=brushUsage.isFavorite(selected)?'★ お気に入りを解除':'☆ お気に入り';
}
function refreshBrushCatalog(selectId?:string){
 if(!surface)return;
 surface.setBrushes(brushPresets.all(builtInBrushes));
 refreshBrushOptions();
 if(selectId)selectPreset(selectId);else if(surface.preset)selectPreset(surface.preset.id);
}
function selectPreset(id:string,remember=true){
 canvasToolRequest++;
 if(!surface||surface.inputActive)return;
 if(activeCanvasTool)leaveCanvasTool();
 surface.setSelectionMode(false);
 surface.panTool=false;byId('panView').setAttribute('aria-pressed','false');
 surface.setEyedropper(false);surface.selectById(id);brushUsage.markUsed(surface.brushId);
 const pending=brushDrafts.get(id);if(pending)surface.applyPreset(pending);
 surface.setForegroundColor([foreground.current.r,foreground.current.g,foreground.current.b],foreground.opacity);
 const erasing=surface.blendMode==='erase';selectedTool=erasing?'eraser':'brush';
 if(erasing)lastEraserPresetId=surface.brushId;else lastBrushPresetId=surface.brushId;
 lastDrawingTool=selectedTool;refreshBrushOptions();byId<HTMLSelectElement>('brush').value=surface.brushId;
 byId('erase').setAttribute('aria-pressed',String(erasing));byId('paint').setAttribute('aria-pressed',String(!erasing));
 syncPreset();reflectRailTool();
 if(remember)rememberWorkBrush();
}
function brushMessage(message:string){byId('brushLibraryStatus').textContent=message;}
function bindBrushNumber(input:HTMLInputElement,current:()=>number,apply:(value:number)=>void){
 const applyInput=()=>{
  const value=input.valueAsNumber;
  if(Number.isFinite(value)&&!input.validity.rangeUnderflow&&!input.validity.rangeOverflow&&value!==current())apply(value);
 };
 const reflect=()=>{input.value=String(current());};
 input.addEventListener('input',applyInput);
 input.addEventListener('change',()=>{applyInput();reflect();});
 input.addEventListener('blur',reflect);
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();input.blur();}});
}
function editBrushParameter(controlId:string,change:(preset:FoundationPreset,value:number)=>void){
 const input=byId<HTMLInputElement>(controlId);
 const changeValue=(number:number)=>{
  if(!applyBrushChange(p=>change(p,number/100)))syncPreset();
 };
 input.addEventListener('input',()=>changeValue(input.valueAsNumber));
 const number=document.getElementById(controlId+'Number') as HTMLInputElement|null;
 if(number)bindBrushNumber(number,()=>input.valueAsNumber,changeValue);
}
for(const [id,change] of [
 ['brushOpacity',(p:FoundationPreset,v:number)=>{p.opacity=v;}],
 ['brushFlow',(p:FoundationPreset,v:number)=>{p.flow=v;}],
 ['brushSpacing',(p:FoundationPreset,v:number)=>{p.spacing.value=v;}],
 ['brushPressure',(p:FoundationPreset,v:number)=>{p.pressure.smoothing=v;}],
 ['brushStabilization',(p:FoundationPreset,v:number)=>{p.stabilization.constant=v;}],
 ['brushTexture',(p:FoundationPreset,v:number)=>{p.texture.paper.strength=v;}]
] as const)editBrushParameter(id,change);
for(const [id,key] of [['brushAzimuth','azimuth'],['brushTwist','twist']] as const){
 byId<HTMLInputElement>(id).addEventListener('change',event=>{
  if(!applyBrushChange(p=>{p.tip[key]=(event.target as HTMLInputElement).checked;}))syncPreset();
 });
}
const brushHooks={
 getPreset:()=>surface?.preset??null,
 edit:applyBrushChange,
 message:brushMessage
};
advancedBrushEditor=installBrushAdvancedEditor(brushHooks);
dynamicsEditor=installBrushDynamicsEditor(brushHooks);
byId<HTMLSelectElement>('brushStabilizationScope').onchange=event=>{
 const choice=(event.target as HTMLSelectElement).value;
 if(!applyBrushChange(p=>{p.stabilization.scope=choice==='common'?'common':'brush';}))syncPreset();
};
const commonStabilizationInput=byId<HTMLInputElement>('commonStabilization');
commonStabilizationInput.value=String(Math.round(commonStabilization*100));
byId<HTMLOutputElement>('commonStabilizationValue').textContent=Math.round(commonStabilization*100)+'%';
const devicePressureInput=byId<HTMLInputElement>('devicePressureSensitivity');
devicePressureInput.value=String(Math.round(devicePressureSensitivity*100));
const pressureLabel=byId<HTMLOutputElement>('devicePressureSensitivityValue');
pressureLabel.textContent=devicePressureSensitivity===0.5?'標準':Math.round(devicePressureSensitivity*100)+'%';
devicePressureInput.oninput=()=>{
 devicePressureSensitivity=Math.max(0,Math.min(1,Number(devicePressureInput.value)/100));
 pressureLabel.textContent=devicePressureSensitivity===0.5?'標準':Math.round(devicePressureSensitivity*100)+'%';
 surface?.setPressureCalibration(devicePressureSensitivity);
 try{localStorage.setItem('illustro.device-pressure-midpoint.v1',String(devicePressureSensitivity));}catch{}
};
commonStabilizationInput.oninput=()=>{
 commonStabilization=Math.max(0,Math.min(1,Number(commonStabilizationInput.value)/100));
 byId<HTMLOutputElement>('commonStabilizationValue').textContent=Math.round(commonStabilization*100)+'%';
 surface?.setCommonStabilization(commonStabilization);
 try{localStorage.setItem('illustro.common-stabilization.v1',String(commonStabilization));}catch{}
};
byId<HTMLButtonElement>('brushReset').onclick=()=>{
 const current=surface?.preset;if(!current||surface?.inputActive)return;
 brushDrafts.delete(current.id);
 selectPreset(current.id);
 brushMessage('保存済みのブラシ設定に戻しました。');
};
byId<HTMLInputElement>('brushSearch').addEventListener('input',refreshBrushOptions);
byId<HTMLSelectElement>('brushGroup').addEventListener('change',refreshBrushOptions);
byId<HTMLButtonElement>('brushFavorite').onclick=()=>{
 const id=surface?.preset?.id;if(!id)return;
 const active=brushUsage.toggleFavorite(id);refreshBrushOptions();
 brushMessage(active?'お気に入りに登録しました。':'お気に入りを解除しました。');
};
// BRU-004: recover the actual saved Foundation brush, not its current catalog version.
byId<HTMLButtonElement>('brushRecoverLast').onclick=()=>{
 if(!documentReady){brushMessage('作品を開いてから使用してください。');return;}
 let recovered:FoundationPreset|null=null;
 const operations=controller.document.operationsTo();
 for(let i=operations.length-1;i>=0;i--){
  const operation=operations[i]!;
  if(operation.kind!=='brush.stroke'||operation.parameters.seamlessCopy===true)continue;
  const record=operation.parameters.strokeRecord as {preset?:{__foundation?:{preset?:FoundationPreset}}}|undefined;
  if(record?.preset?.__foundation?.preset){recovered=record.preset.__foundation.preset;break;}
 }
 if(!recovered){brushMessage('この作品には取り出せるブラシの線がありません。');return;}
 try{
  const restored=brushPresets.duplicate(recovered,recovered.name+'（作品から）');
  refreshBrushCatalog(restored.id);
  brushMessage('直前に描いた線のブラシ設定を、自作ブラシとして保存しました。');
 }catch(error){brushMessage('ブラシを取り出せません: '+String(error));}
};
byId<HTMLButtonElement>('brushDuplicate').onclick=()=>{
 if(!surface?.preset)return;
 try{const copy=brushPresets.duplicate(surface.preset,surface.preset.name+' のコピー');refreshBrushCatalog(copy.id);brushMessage('自作ブラシを保存しました。この端末で使用できます。');}
 catch(error){brushMessage('複製できません: '+String(error));}
};
byId<HTMLButtonElement>('brushSave').onclick=()=>{
 if(!surface?.preset)return;
 try{
  if(!brushPresets.isUser(surface.preset.id)){
   const created=brushPresets.duplicate(surface.preset,surface.preset.name+' のコピー');
   brushDrafts.delete(created.id);refreshBrushCatalog(created.id);brushMessage('標準ブラシから自作ブラシを作成して保存しました。');
  }else{const id=surface.preset.id;brushPresets.save(surface.preset);brushDrafts.delete(id);refreshBrushCatalog(id);brushMessage('自作ブラシの設定を保存しました。');}
 }catch(error){brushMessage('保存できません: '+String(error));}
};
byId<HTMLButtonElement>('brushRename').onclick=async()=>{
 const preset=surface?.preset;
 if(!preset||!brushPresets.isUser(preset.id))return;
 const title=await appPrompt('ブラシの名前',preset.name,{required:true,maxLength:100});if(title===null)return;
 if(surface?.preset?.id!==preset.id)return;
 try{const draft=structuredClone(preset);draft.name=title.trim();brushPresets.save(draft);refreshBrushCatalog(draft.id);brushMessage('名前を変更しました。');}
 catch(error){brushMessage('名前を変更できません: '+String(error));}
};
byId<HTMLButtonElement>('brushDelete').onclick=async()=>{
 const preset=surface?.preset;
 if(!preset||!brushPresets.isUser(preset.id))return;
 if(!await appConfirm('この自作ブラシを削除しますか？作品に描いた線は消えません。'))return;
 if(surface?.preset?.id!==preset.id)return;
 try{const id=preset.id;brushPresets.remove(id);brushDrafts.delete(id);brushUsage.remove(id);refreshBrushCatalog('foundation-g-pen');brushMessage('自作ブラシを削除しました。');}
 catch(error){brushMessage('削除できません: '+String(error));}
};
byId<HTMLButtonElement>('brushImport').onclick=()=>byId<HTMLInputElement>('brushImportFile').click();
byId<HTMLInputElement>('brushImportFile').onchange=async event=>{
 const input=event.target as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;
 try{if(file.size>32*1024*1024)throw Error('ファイルが大きすぎます');const count=brushPresets.importPack(await file.text());refreshBrushCatalog();brushMessage(count+'本のブラシを読み込みました。');}
 catch(error){brushMessage('読み込めません: '+String(error));}
};
byId<HTMLButtonElement>('brushExport').onclick=()=>{
 try{const json=brushPresets.exportPack(),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),anchor=document.createElement('a');
 anchor.href=url;anchor.download='illustro-brushes.json';anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);brushMessage('自作ブラシを書き出しました。');}
 catch(error){brushMessage('書き出せません: '+String(error));}
};
byId<HTMLSelectElement>('brush').onchange=e=>selectPreset((e.target as HTMLSelectElement).value);
const sizeSlider=byId<HTMLInputElement>('size'),sizeNumber=byId<HTMLInputElement>('sizeNumber');
const changeBrushSize=(size:number)=>{if(!applyBrushChange(p=>{p.size=size;}))syncPreset();};
const sizePreview=byId('brushSizePreview'),sizeCircle=sizePreview.querySelector<HTMLElement>('i')!,sizeLabel=sizePreview.querySelector('output')!;
let sizePreviewTimer:number|undefined,sizePointer:number|null=null;
function hideSizePreview(){window.clearTimeout(sizePreviewTimer);sizePreview.hidden=true;}
function showSizePreview(){
 const view=surface?.viewState;if(!surface||!view)return;
 const size=surface.brushSize,diameter=size*view.zoom,limit=Math.min(view.cssWidth,view.cssHeight)*.72;
 sizeCircle.style.width=sizeCircle.style.height=Math.min(diameter,limit)+'px';
 sizeLabel.textContent=size+' px'+(diameter>limit?'（表示を縮小）':'');
 sizePreview.hidden=false;
 window.clearTimeout(sizePreviewTimer);
 if(sizePointer===null)sizePreviewTimer=window.setTimeout(hideSizePreview,650);
}
sizeSlider.addEventListener('pointerdown',event=>{sizePointer=event.pointerId;showSizePreview();});
const finishSizePreview=(event:PointerEvent)=>{
 if(event.pointerId!==sizePointer)return;
 sizePointer=null;window.setTimeout(()=>{if(sizePointer===null)hideSizePreview();},0);
};
window.addEventListener('pointerup',finishSizePreview);
window.addEventListener('pointercancel',finishSizePreview);
window.addEventListener('blur',()=>{sizePointer=null;hideSizePreview();});
sizeSlider.addEventListener('blur',hideSizePreview);
sizeSlider.addEventListener('input',()=>{
 const preset=surface?.preset;if(!preset)return;
 changeBrushSize(sliderSize(preset,sizeSlider.valueAsNumber));
 showSizePreview();
});
bindBrushNumber(sizeNumber,()=>surface?.preset?.size??sizeSlider.valueAsNumber,changeBrushSize);
for(const [id,handler] of Object.entries({fitView:()=>surface?.fitView(),zoomOut:()=>surface?.zoomView(1/1.25),zoomIn:()=>surface?.zoomView(1.25),view100:()=>surface?.viewAt100(),actualPixels:()=>surface?.actualPixels(),resetRotation:()=>surface?.resetRotation(),flipH:()=>surface?.flipView('x'),flipV:()=>surface?.flipView('y')}))byId<HTMLButtonElement>(id).onclick=handler;
byId<HTMLInputElement>('zoomPercent').onchange=e=>{const n=Number((e.target as HTMLInputElement).value);surface?.setViewZoom(n/100);};
byId<HTMLInputElement>('angleDegree').onchange=e=>{const n=Number((e.target as HTMLInputElement).value);surface?.setViewRotation(n*Math.PI/180);};
// C02 BRU-012 / GST-004: hold E to temporarily use the eraser on PC.
// Preserve the active preset and drawing target, and never switch an in-progress stroke.
function restoreTemporaryEraser(){
 if(!temporaryEraserRestoreRequested)return;
 if(surface?.inputActive){window.setTimeout(restoreTemporaryEraser,32);return;}
 temporaryEraserRestoreRequested=false;
 const previous=temporaryEraserReturn;
 temporaryEraserReturn=null;
 if(previous&&surface&&documentReady&&selectedTool==='eraser'&&surface.brushes.some(brush=>brush.id===previous)){
  selectPreset(previous);
 }
}
document.addEventListener('keydown',event=>{
 if(event.key.toLowerCase()!=='e'||event.repeat||event.altKey||event.ctrlKey||event.metaKey||app.inert||document.querySelector('dialog[open]')
   ||isTextEditingTarget(event.target)||temporaryEraserReturn||!documentReady||!surface
   ||surface.inputActive||selectedTool!=='brush')return;
 const active=surface.brushId;
 if(!surface.brushes.some(brush=>brush.id===active))return;
 event.preventDefault();
 temporaryEraserReturn=active;
 const brushSize=surface.brushSize;
 try{
  selectPreset(lastEraserPresetId,false);
  if(inputPreferences.eraserSizeLink&&surface.preset){surface.applyPreset({...surface.preset,size:brushSize});syncPreset();}
 }catch{temporaryEraserReturn=null;}
});
const releaseTemporaryEraser=()=>{
 if(!temporaryEraserReturn||temporaryEraserRestoreRequested)return;
 temporaryEraserRestoreRequested=true;restoreTemporaryEraser();
};
document.addEventListener('keyup',event=>{
 if(event.key.toLowerCase()==='e')releaseTemporaryEraser();
});
window.addEventListener('blur',releaseTemporaryEraser);
byId<HTMLInputElement>('seamless').onchange=e=>surface?.setSeamless((e.target as HTMLInputElement).checked);
// C02 BRU-010: ruler changes affect the next stroke, not strokes already in progress.
function refreshGuideSettings(){
 guidePreferences=normalizeGuideSettings({
  enabled:byId<HTMLInputElement>('guideEnabled').checked,
  angle:Number(byId<HTMLInputElement>('guideAngle').value),
  strength:Number(byId<HTMLInputElement>('guideStrength').value)/100,
  applyEraser:byId<HTMLInputElement>('guideApplyEraser').checked
 });
 byId<HTMLOutputElement>('guideStrengthValue').textContent=Math.round(guidePreferences.strength*100)+'%';
 surface?.setGuideSettings(guidePreferences);
 try{localStorage.setItem('illustro.guide-settings.v1',JSON.stringify(guidePreferences));}catch{}
}
byId<HTMLInputElement>('guideEnabled').checked=guidePreferences.enabled;
byId<HTMLInputElement>('guideAngle').value=String(Math.round(guidePreferences.angle));
byId<HTMLInputElement>('guideStrength').value=String(Math.round(guidePreferences.strength*100));
byId<HTMLInputElement>('guideApplyEraser').checked=guidePreferences.applyEraser;
byId<HTMLOutputElement>('guideStrengthValue').textContent=Math.round(guidePreferences.strength*100)+'%';
for(const id of ['guideEnabled','guideAngle','guideStrength','guideApplyEraser'])
 byId<HTMLInputElement>(id).addEventListener('input',refreshGuideSettings);
const referenceToggle=document.getElementById('referencePattern') as HTMLInputElement|null;if(referenceToggle)referenceToggle.onchange=()=>surface?.setReferencePattern(referenceToggle.checked);
byId<HTMLInputElement>('force').onchange=e=>{if(!applyBrushChange(p=>{if(p.forceFade)p.forceFade.enabled=(e.target as HTMLInputElement).checked;}))syncPreset();updateQa();};for(const id of Object.keys(inputPreferences) as (keyof typeof inputPreferences)[]){
 const input=byId<HTMLInputElement>(id);
 input.checked=inputPreferences[id];
 input.onchange=()=>{
  inputPreferences[id]=input.checked;if(surface)applyInputPreferences(surface);
  if(id==='brushCursorEnabled'&&!input.checked)hideBrushCursor();
  try{localStorage.setItem('illustro.input-preferences.v1',JSON.stringify(inputPreferences));}catch{}
  updateQa();
 };
}
byId('erase').onclick=()=>selectPreset(lastEraserPresetId);byId('paint').onclick=()=>selectPreset(lastBrushPresetId);
byId('switchDrawingTool').onclick=()=>byId(lastDrawingTool==='eraser'?'paint':'erase').click();
installWorkspaceControls();
function toggleSelectionMode(){
 if(!surface||!documentReady)return;
 if(selectedTool==='eyedropper')restoreDrawingTool();
 surface.setEyedropper(false);
 surface.panTool=false;byId<HTMLButtonElement>('panView').setAttribute('aria-pressed','false');
 surface.setSelectionMode(!surface.selectingRectangle);
}
function selectCanvasTool(id:string,start?:()=>void){
 const request=++canvasToolRequest,drawing=surface,deadline=performance.now()+1500;
 const open=()=>{
   if(request!==canvasToolRequest||!drawing||surface!==drawing||!documentReady)return;
   if(drawing.inputActive){
     if(performance.now()<deadline)window.setTimeout(open,25);
     else byId('status').textContent='描画が終わってから道具を選び直してください。';
     return;
   }
   if(openCanvasTool(id))start?.();
 };
 open();
}
byId<HTMLButtonElement>('selection').onclick=()=>selectCanvasTool('selection',()=>c06Selection?.open());
byId('smartFill').onclick=()=>selectCanvasTool('smartFill',()=>fillPanel?.open());
for(const id of ['transform','move'])byId(id).onclick=()=>selectCanvasTool(id,
 ()=>transformPanel?.open(Boolean(c06Selection?.active()),id==='move'));
for(const id of ['shapes','rulers'])byId(id).onclick=()=>selectCanvasTool(id);
byId<HTMLButtonElement>('selectionStart').onclick=toggleSelectionMode;
byId<HTMLButtonElement>('selectionClear').onclick=()=>{
 if(c06Selection)c06Selection.clear();
 else surface?.clearRectangleSelection();
 if(surface)byId<HTMLElement>('status').textContent='選択範囲を解除しました。';
};
refreshSelectionControls();

byId<HTMLButtonElement>('open').onclick=()=>{if(homeUi&&!qaMode){homeUi.showNew('file');return;}byId<HTMLInputElement>('openFile').click();};
const workFileInput=byId<HTMLInputElement>('openFile');
workFileInput.multiple=true;
let openingWorkFiles=false;
workFileInput.onchange=async ()=>{
  const files=Array.from(workFileInput.files??[]);
  workFileInput.value='';
  if(!files.length||openingWorkFiles)return;
  openingWorkFiles=true;
  try{
    if(files.length===1){await openWorkFile(files[0]!);return;}
    if(!await appConfirm(files.length+'件の作品を復元します。同じ作品がある場合は別作品として保存します。続けますか？'))return;
    const failed:string[]=[];
    for(const file of files)if(!await openWorkFile(file,true))failed.push(file.name);
    const summary=(files.length-failed.length)+'件を復元しました。'+
      (failed.length?' 復元できなかったファイル（'+failed.length+'件）：'+failed.join('、'):'');
    byId('status').textContent=summary;
    if(failed.length)homeUi?.notify(summary);
  }finally{openingWorkFiles=false;}
};
async function openWorkFile(file:File,batch=false){
  byId('status').textContent='作品ファイルを確認しています。';let opened:PortableOpenResult;
  let migrationCopy=false;
  let migrationSource:(()=>Promise<FrozenExport>)|null=null,migrationNotices:readonly string[]=[];
  try{
    if(await isLegacyStrokeFile(file)){
      const migrated=await convertLegacyStrokeFile(file);
      opened=await persistence.decodePortable(migrated.bytes);
      migrationNotices=migrated.notices;
      if(!await appConfirm('旧Illustroの描線ファイルを別の作品として取り込みます。\n'+migrationNotices.join('\n')+'\n続けますか？'))return;
      migrationCopy=true;
      const converted=opened.document;
      migrationSource=()=>legacySourcePreview(file,converted);
    }else opened=await persistence.decodePortable(new Uint8Array(await file.arrayBuffer()));
  }catch(error){const message='この作品ファイルは安全に読み込めませんでした。'+(error instanceof Error?error.message:String(error));byId('status').textContent=message;homeUi?.notify(message);updateQa();return;}
  if(opened.legacyEditorState){
    const source=opened.legacyEditorState.version===0?'編集状態なし':'編集状態 v1';
    const explanation=opened.legacyEditorState.notices.join('\n');
    const decision=await appConfirm('旧形式の作品です（'+source+' → 編集状態 v2）。\n'+explanation+
      '\n\n元ファイルを変更せず、別の作品として取り込みます。新しい作品ファイルは「別名で保存」から作れます。続けますか？');
    if(!decision)return;
    const original=opened.document;
    migrationSource=async()=>captureExport(original);
    migrationNotices=opened.legacyEditorState.notices;
    const openedCopy=copyOpened(opened,opened.document.root.name.slice(0,4060)+'（形式移行）');
    opened={...openedCopy,preserved:{...openedCopy.preserved,manifestExtras:{
      ...openedCopy.preserved.manifestExtras,legacyMigration:{format:'illustro.container.v1',editorStateVersion:opened.legacyEditorState.version}
    }}};
    migrationCopy=true;
  }
  try{
    if(!qaMode){
      if(!(await prepareWorkSwitch()))return;
      const same=await getWork(opened.document.root.documentId);
      if(same&&batch){
        opened=copyOpened(opened,opened.document.root.name.slice(0,100)+'（バックアップ復元）');
      }else if(same){
        const copyChoice={value:'copy',label:'別作品として複製'} as const;
        const decision=await appChoose(
          '同じ識別番号の作品が'+(same.trashedAt?'ごみ箱に':'マイ作品に')+'あります。\n'
          +'既存の作品と元のファイルはそのまま残ります。',
          same.trashedAt?[copyChoice]:[{value:'existing',label:'既存作品を開く'},copyChoice],
        );
        if(decision===null){byId('status').textContent='作品ファイルの読み込みを取り消しました。';return;}
        if(decision==='existing'){await openWork(same.documentId);return;}
        if(!(await prepareWorkSwitch()))return;
        opened=copyOpened(opened,opened.document.root.name.slice(0,120-'（読み込み）'.length)+'（読み込み）');
      }
    }
    byId('status').textContent='作品を表示しています。';
    await activateOpened(opened,false);
    byId('status').textContent=migrationCopy
      ?'旧形式から移行コピーを開きました。元ファイルは変更していません。新形式を残すには「別名で保存」を押してください。'
      :'作品ファイルを開きました。自動保存を開始しました。';
    homeUi?.showEditor();
    if(migrationSource&&!batch)showMigrationDetails(migrationSource,opened.document,migrationNotices);
    if(!qaMode){scheduleWorkThumbnail();void refreshWorks();}
  }
  catch(error){const message='作品ファイルは正常ですが、表示の復元に失敗しました。'+(error instanceof Error?error.message:String(error));byId('status').textContent=message;homeUi?.notify(message);return false;}
  updateQa();return true;
}
function showMigrationDetails(source:()=>Promise<FrozenExport>,converted:CoreDocument,notices:readonly string[]){
  const dialog=document.createElement('dialog'),section=document.createElement('section');
  const title=document.createElement('h2'),message=document.createElement('p'),status=document.createElement('output');
  title.textContent='旧形式から移行した作品';
  message.textContent='元ファイルは変更されていません。移行コピーを新しい作品ファイルとして保存できます。';
  const details=document.createElement('ul');
  for(const notice of notices){const item=document.createElement('li');item.textContent=notice;details.append(item);}
  const compare=document.createElement('button'),save=document.createElement('button'),close=document.createElement('button');
  compare.type=save.type=close.type='button';
  compare.textContent='移行前後の絵を見比べる';
  save.textContent='新形式で別名保存';
  close.textContent='閉じる';
  const previews=document.createElement('div'),urls:string[]=[],views:Array<()=>void>=[];
  previews.className='artwork-history-previews';
  status.setAttribute('aria-live','polite');
  close.onclick=()=>dialog.close();
  save.onclick=()=>{dialog.close();if(controller.document===converted)void saveWork(true);};
  compare.onclick=async()=>{
    compare.disabled=true;
    status.textContent='移行前後の色・透明度を含む全画素を比較しています。';
    try{
      const fingerprints:VisualFingerprint[]=[];
      for(const [capture,label] of [[source,'移行前'],[async()=>captureExport(converted),'移行コピー']] as const){
        if(!dialog.open)return;
        const frozen=await capture();
        // Render only once for both the visual preview and exact pixel checksum.
        // Keep the first full-size buffer out of scope before replaying the next.
        const output=await (async()=>{
          const pixels=await renderFrozenArtwork(frozen);
          const fingerprint=await fingerprintRenderedPixels(pixels,frozen.width,frozen.height);
          const blob=await encodePng(pixels,frozen.width,frozen.height);
          return {blob,fingerprint,width:frozen.width,height:frozen.height};
        })();
        if(!dialog.open)return;
        fingerprints.push(output.fingerprint);
        const url=URL.createObjectURL(output.blob);urls.push(url);
        const view=createHistoryComparison(url,label,output.width,output.height);
        previews.append(view.figure);views.push(view.dispose);
      }
      status.textContent=fingerprints.length===2&&sameRenderedPixels(fingerprints[0]!,fingerprints[1]!)
        ?'描き出した画像の全画素（色・透明度）が一致しました。元ファイルと移行コピーの比較結果です。'
        :'移行前後の画像データに差があります。両方の絵を見比べ、元ファイルは残してください。';
    }catch(error){
      if(dialog.open)status.textContent='比較を完了できませんでした。'+(error instanceof Error?error.message:'');
    }
  };
  section.append(title,message,details,compare,save,close,status,previews);
  dialog.className='export-dialog artwork-history-dialog';
  dialog.setAttribute('aria-label','旧形式の移行結果');
  dialog.append(section);document.body.append(dialog);
  dialog.addEventListener('close',()=>{for(const dispose of views)dispose();for(const url of urls)URL.revokeObjectURL(url);dialog.remove();},{once:true});
  dialog.showModal();
}
function showExternalSaveConflict(error:ExternalFileConflict,local:CoreDocument){
  const dialog=document.createElement('dialog'),section=document.createElement('section'),title=document.createElement('h2');
  const details=document.createElement('p'),status=document.createElement('output'),previews=document.createElement('div');
  title.textContent='保存先に別の版があります';
  details.textContent=error.changedFile.name+' · '+new Date(error.changedFile.lastModified).toLocaleString('ja-JP');
  status.setAttribute('aria-live','polite');
  previews.className='artwork-history-previews';
  dialog.className='export-dialog artwork-history-dialog';dialog.setAttribute('aria-label',title.textContent);
  const save=document.createElement('button'),compare=document.createElement('button'),close=document.createElement('button');
  save.type=compare.type=close.type='button';
  save.textContent='別名で保存';compare.textContent='版を見比べる';close.textContent='閉じる';
  close.onclick=()=>dialog.close();
  save.onclick=()=>{dialog.close();if(controller.document===local)void saveWork(true);};
  const urls:string[]=[],views:Array<()=>void>=[];
  compare.onclick=async()=>{
    compare.disabled=true;status.textContent='比較画像を準備しています。';
    try{
      const external=await persistence.decodePortable(new Uint8Array(await error.changedFile.arrayBuffer()));
      for(const [artwork,label] of [[local,'作業中の作品'],[external.document,'保存先の作品']] as const){
        if(!dialog.open)return;
        const result=await exportImage(captureExport(artwork),'png');
        if(!dialog.open)return;
        const url=URL.createObjectURL(result.blob);urls.push(url);
        const view=createHistoryComparison(url,label,result.width,result.height);
        previews.append(view.figure);views.push(view.dispose);
      }
      status.textContent='';
    }catch(cause){
      if(dialog.open)status.textContent='比較できませんでした。'+(cause instanceof Error?cause.message:'');
    }
  };
  section.append(title,details,save,compare,close,status,previews);
  dialog.append(section);document.body.append(dialog);
  dialog.addEventListener('close',()=>{
    for(const dispose of views)dispose();
    for(const url of urls)URL.revokeObjectURL(url);
    dialog.remove();
  },{once:true});
  dialog.showModal();
}

async function saveWork(asCopy=false){
  if(!documentReady||!surface)return;
  if(persistence.state.saving){byId('status').textContent='保存中です。';return;}
  const drawing=surface,document=controller.document,layer=controller.selectedLayerId;
  const pending=historyPending
    ? historyNavigation!.barrier().then(()=>drawing.saveBoundary())
    : drawing.hasUncommittedInput?drawing.saveBoundary():undefined;
  byId('status').textContent='作品ファイルを作成しています。';
  try{
    const result=await persistence.save(document,layer,asCopy,pending,drawing.selectedRectangle);
    byId('status').textContent=explicitSaveStatus(result.output,result.verified,asCopy,formatFileSize(result.byteLength));
  }catch(error){
    if(error instanceof ExternalFileConflict)showExternalSaveConflict(error,document);
    byId('status').textContent=error instanceof DOMException&&error.name==='AbortError'
      ?'保存をキャンセルしました。':'作品ファイルを保存できませんでした。'+(error instanceof Error?error.message:String(error));
  }
  updateQa();
}
byId('save').onclick=()=>{void saveWork();};
byId('saveCopy').onclick=()=>{void saveWork(true);};

const exportDialog=byId<HTMLDialogElement>('exportDialog'),exportFormat=byId<HTMLSelectElement>('exportFormat'),exportQuality=byId<HTMLInputElement>('exportQuality');
function updateExportOptions(){
  const f=exportFormat.value as ImageFormat,lossy=f!=='png';
  byId<HTMLElement>('exportQualityRow').hidden=!lossy;
  byId('exportDpiRow').hidden=f!=='png'||controller.document.root.info.dpi===null;
  byId<HTMLOutputElement>('exportQualityValue').textContent=exportQuality.value+'%';
  byId('exportTransparencyInfo').textContent=f==='jpeg'
    ?'JPEGは透明部分を保存できません。背景を白にして書き出します（黒にはしません）。'
    :f==='png'?'PNGは透明度を保ち、画像の色を劣化させずに保存します。':'WebPは透明度を保ち、画質を調整できます。';
}
exportFormat.onchange=updateExportOptions;exportQuality.oninput=updateExportOptions;updateExportOptions();
byId<HTMLButtonElement>('exportImage').onclick=()=>{
  if(!documentReady)return;
  byId('exportStatus').textContent='';
  const inspected=surface?.inspectedLayer;
  const scope=byId<HTMLSelectElement>('exportLayerScope');
  scope.value='artwork';
  const soloOption=byId<HTMLOptionElement>('exportSoloOption');
  soloOption.disabled=!inspected;
  soloOption.textContent=inspected?inspected.name+'だけ':'単独表示レイヤーだけ';
  byId<HTMLOptionElement>('exportSelectionOption').disabled=!c06Selection?.active();
  byId<HTMLOptionElement>('exportActiveLayer').textContent=controller.selectedLayer.name+'だけ';
  updateExportOptions();
  exportDialog.showModal();
};
byId<HTMLButtonElement>('exportCancel').onclick=()=>{if(!exportBusy)exportDialog.close();};
byId<HTMLButtonElement>('exportRun').onclick=async()=>{
  if(exportBusy||!documentReady)return;
  const format=exportFormat.value as ImageFormat,quality=Number(exportQuality.value)/100;
  // The snapshot is captured synchronously: later brush transactions cannot enter it.
  let fixed:ReturnType<typeof captureExport>;
  const scope=byId<HTMLSelectElement>('exportLayerScope').value;
  const scale=byId<HTMLInputElement>('exportPixelScale');
  if(!scale.validity.valid){byId('exportStatus').textContent='整数倍の拡大率は1〜8で指定してください。';return;}
  let options:ImageExportOptions;
  try{
    await historyNavigation?.barrier();
    const solo=surface?.inspectedLayer;
    if(scope==='solo'&&!solo)throw new Error('単独表示を切り替えたため、書き出し範囲を選び直してください。');
    const selection=scope==='selection'?c06Selection?.active():null;
    if(scope==='selection'&&!selection)throw Error('書き出す範囲を選んでください。');
    const layer=scope==='active'?controller.selectedLayer.id:scope==='solo'?solo?.id:undefined;
    fixed=captureExport(controller.document,layer);
    const dpi=controller.document.root.info.dpi;
    options={pixelScale:scale.valueAsNumber,...(selection?{selection}:{}),
      ...(format==='png'&&dpi!==null&&byId<HTMLInputElement>('exportDpi').checked?{dpi}:{})};
  }
  catch(error){byId('exportStatus').textContent=String(error instanceof Error?error.message:error);return;}
  const filename=exportFileName(fixed.name,format);
  exportBusy=true;exportError=null;byId<HTMLButtonElement>('exportRun').disabled=true;byId<HTMLButtonElement>('exportCancel').disabled=true;
  // A modal dialog would block canvas input during encoding; close it before heavy work.
  exportDialog.close();byId('status').textContent='画像を書き出しています。描画は続けられます。';
  byId('exportStatus').textContent='画像を書き出しています。描画は続けられます。';updateQa();
  try{
    const result=await exportImage(fixed,format,quality,options);
    // Download works on Android and on browsers without the File System Access API.
    const url=URL.createObjectURL(result.blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=filename;anchor.hidden=true;document.body.append(anchor);anchor.click();anchor.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    const {blob,...evidence}=result;lastExport={...evidence,downloadBytes:blob.size};exportCount++;
    byId('exportStatus').textContent=filename+' を作成しました（'+result.width+'×'+result.height+'ピクセル、'+formatFileSize(blob.size)+'）。作品ファイルの保存状態は変わりません。';
    byId('status').textContent='画像を書き出しました（'+result.width+'×'+result.height+'ピクセル、'+formatFileSize(blob.size)+'）。引き続き描画できます。';
  }catch(error){
    exportError=error instanceof Error?error.message:String(error);
    byId('exportStatus').textContent='画像を書き出せませんでした。'+exportError;
    byId('status').textContent='書き出しに失敗しました。作品は変更されていません。';
  }finally{
    exportBusy=false;byId<HTMLButtonElement>('exportRun').disabled=false;byId<HTMLButtonElement>('exportCancel').disabled=false;updateQa();
  }
};

async function recoverCandidate(candidate:Candidate):Promise<boolean>{
  if(!qaMode&&!(await prepareWorkSwitch()))return false;
  byId('status').textContent='作業途中の状態を確認しています。';
  try{
    const recovered=await persistence.recover(candidate);
    const artwork=qaMode?recovered.document:recovered.document.forkCopy(recovered.document.root.name.slice(0,4070)+'（復元コピー）');
    const opened:PortableOpenResult={document:artwork,selectedLayerId:recovered.selectedLayerId,preserved:{manifestExtras:{},optionalSections:[]},
      generationId:'recovery',snapshotRevisionId:artwork.head,selection:recovered.selection,...(recovered.projectionCache?{projectionCache:recovered.projectionCache}:{})};
    await activateOpened(opened,true);
    if(!qaMode){await refreshWorks();void refreshRecoveryCandidates();}
    else recoveryCandidates=[];
    byId('status').textContent=qaMode?'自動保存された最新の作業状態へ戻しました。':'復元した状態を別の作品として開きました。';
    updatePersistenceDisplay();updateQa();return true;
  }catch(error){
    const message='作業途中の状態を戻せませんでした。'+(error instanceof Error?error.message:String(error));
    byId('status').textContent=message;homeUi?.notify(message);updatePersistenceDisplay();updateQa();return false;
  }
}
byId<HTMLButtonElement>('recover').onclick=()=>{
  if(homeUi&&!qaMode){homeUi.showRecovery();return;}
  const candidate=recoveryCandidates.find(item=>BigInt(item.protectedThrough)>0n);
  if(candidate)void recoverCandidate(candidate);
};
async function refreshRecoveryCandidates(){
  try{const values=await persistence.listRecoveryCandidates();recoveryCandidates=values;updatePersistenceDisplay();homeUi?.setRecoveryCandidates(values);if(recoveryCandidates.some(candidate=>BigInt(candidate.protectedThrough)>0n)&&!documentReady)byId('status').textContent='自動保存から戻せる作業があります。';}catch{}
}
function showStorageError(error:unknown){const text='アプリ内に保存できませんでした。'+(error instanceof Error?error.message:String(error));byId('status').textContent=text;homeUi?.notify(text);}
async function refreshWorks(){try{const result=await persistence.listWorks();works=result.works;lastWorkId=result.lastWorkId;homeUi?.setWorks(works,lastWorkId);scheduleThumbnailRepair();}catch(error){showStorageError(error);}}
// Missing previews for closed artworks are rebuilt from verified saved tiles,
// 16 at a time, while Home is visible. The input/UI path always takes priority.
function scheduleThumbnailRepair(delay=750){
  if(qaMode||!app.inert||thumbnailRepairRunning||thumbnailRepairTimer!==null)return;
  const candidate=works.find(w=>w.thumbnailRevision!==w.revisionId&&
    !thumbnailRepairSkipped.has(w.documentId+':'+w.revisionId));
  if(!candidate)return;
  thumbnailRepairTimer=window.setTimeout(()=>{
    thumbnailRepairTimer=null;
    if(!app.inert)return;
    thumbnailRepairRunning=true;
    void persistence.repairThumbnail(candidate.documentId).then(result=>{
      if(result.state==='unavailable')thumbnailRepairSkipped.add(candidate.documentId+':'+candidate.revisionId);
      if(result.state==='complete'||result.state==='current')void refreshWorks();
    }).catch(error=>{thumbnailRepairSkipped.add(candidate.documentId+':'+candidate.revisionId);console.warn('Saved preview repair deferred:',error);})
      .finally(()=>{thumbnailRepairRunning=false;if(app.inert)scheduleThumbnailRepair(60);});
  },delay);
}
function copyOpened(opened:PortableOpenResult,name:string):PortableOpenResult{
  const snapshot=opened.document.capturePersistenceSnapshot(),document=CoreDocument.restore({snapshot:namedSnapshot(snapshot,name,crypto.randomUUID()),blockPayloads:opened.document.persistenceBlockPayloads(snapshot)});
  return {...opened,document,snapshotRevisionId:document.head,generationId:'copy'};
}
// A new blank work needs no expensive full-resolution GPU readback.
// A pristine canvas is a solid color, so its preview never needs a new
// OffscreenCanvas/2D graphics context. On software GPUs that allocation was
// blocking the CREATE button for seconds, after the drawing host was ready.
// Both PNGs are exact, 1x1 RGBA images (white and transparent respectively).
const EMPTY_PREVIEW_PNG={
  white:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4////fwAJ+wP99djxmgAAAABJRU5ErkJggg==',
  transparent:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGBgAAAABQABeqhXUAAAAABJRU5ErkJggg=='
} as const;
async function storeBlankThumbnail(documentId:string,revisionId:string,background:'transparent'|'white'){
  try{
    const png=Uint8Array.from(atob(EMPTY_PREVIEW_PNG[background]),character=>character.charCodeAt(0));
    await persistence.storeThumbnail(documentId,revisionId,new Blob([png],{type:'image/png'}));
  }catch(error){console.warn('Initial thumbnail deferred:',error);}
}
async function createWorkThumbnail(){
  if(qaMode||!documentReady||!surface||surface.busy)return;
  const active=surface,doc=controller.document,revision=doc.head,documentId=doc.root.documentId;
  if(works.some(work=>work.documentId===documentId&&work.thumbnailRevision===revision))return;
  const blob=await active.captureWorkThumbnail();
  if(surface===active&&controller.document===doc&&doc.head===revision)await persistence.storeThumbnail(documentId,revision,blob);
}
// Never block opening or leaving a work on thumbnail generation. Retry busy GPU
// reads while Home is active, instead of silently abandoning the only attempt.
function scheduleWorkThumbnail(delay=120){
  if(qaMode||!documentReady||!surface)return;
  if(thumbnailTimer!==null)clearTimeout(thumbnailTimer);
  thumbnailTimer=window.setTimeout(()=>{
    thumbnailTimer=null;
    const retry=()=>{
      if(!app.inert||thumbnailRetryCount>=12)return;
      thumbnailRetryCount++;
      scheduleWorkThumbnail(Math.min(4000,250*2**Math.min(thumbnailRetryCount,4)));
    };
    const run=async()=>{
      if(!app.inert||!documentReady||!surface)return;
      if(thumbnailInProgress||surface.busy){retry();return;}
      thumbnailInProgress=true;
      try{await createWorkThumbnail();thumbnailRetryCount=0;await refreshWorks();}
      catch(error){console.warn('Thumbnail update deferred:',error);retry();}
      finally{thumbnailInProgress=false;}
    };
    const idle=(window as Window&{requestIdleCallback?:(callback:()=>void,options?:{timeout:number})=>number}).requestIdleCallback;
    if(idle)idle(()=>{void run();},{timeout:1500});else void run();
  },delay);
}
async function prepareWorkSwitch(){
  if(!documentReady)return true;
  if(persistence.state.saving){homeUi?.notify('作品ファイルの保存が終わってから切り替えてください。描画は続けられます。');return false;}
  if(surface?.busy||historyPending||geometryBusy){homeUi?.notify('描いている線や操作が終わってから切り替えてください。');return false;}
  const wasInert=app.inert;app.inert=true;
  try{librarySaving=true;await persistence.barrier();return true;}
  catch(error){showStorageError(error);return false;}finally{app.inert=wasInert;librarySaving=false;updatePersistenceDisplay();}
}
async function openWork(id:string):Promise<boolean>{
  if(workSwitchBusy)return false;workSwitchBusy=true;
  try{if(documentReady&&controller.document.root.documentId===id){homeUi?.showEditor();return true;}
    if(!(await prepareWorkSwitch()))return false;
    const loaded=await persistence.loadWork(id);await activateOpened(loaded.opened,false,loaded.entry.writerEpochId);homeUi?.showEditor();window.setTimeout(()=>void refreshWorks(),0);
    if(loaded.fallback)homeUi?.notify('最新の保存を読み込めなかったため、前の正常な保存から開きました。');return true;
  }catch(error){showStorageError(error);return false;}finally{workSwitchBusy=false;}
}
if(!qaMode){
  // The editor is inert while Home is active. Keep the native file picker outside
  // that subtree so a genuine Home button press may open the OS picker.
  document.body.append(byId<HTMLInputElement>('openFile'));
  homeUi=installHomeShell(app,{
    createDocument,
    onBlankDraftChange:(w,h,title,background,dpi,author,description)=>beginBlankWarmup(w,h,title,background,dpi,author,description),
    onEditorVisible:()=>surface?.refreshVisibleViewport(),
    openFile:()=>byId<HTMLInputElement>('openFile').click(),
    resume:async(documentId,writerEpochId)=>{
      if(!(await prepareWorkSwitch()))return false;
      const candidate=recoveryCandidates.find(item=>item.documentId===documentId&&item.writerEpochId===writerEpochId);
      return candidate?recoverCandidate(candidate):false;
    },
    prepareHome:async()=>{thumbnailRetryCount=0;scheduleWorkThumbnail();void refreshWorks();
      // Start durable protection after the Home screen has had a chance to paint.
      window.setTimeout(()=>{void persistence.barrier().then(()=>{void createProjectionCheckpoint();return refreshWorks();}).catch(showStorageError);},40);
      return true;},
    listWorks:async()=>{const result=await persistence.listWorks();works=result.works;lastWorkId=result.lastWorkId;return {works,lastWorkId};},
    openWork,
    exportWorks:entries=>openBatchExport(entries,async id=>{
      if(documentReady&&controller.document.root.documentId===id){
        await persistence.barrier();
        if(controller.document.root.documentId===id)return controller.document;
      }
      return (await persistence.loadWork(id)).opened.document;
    }),
    readThumbnail:(id,revisionId)=>persistence.readThumbnail(id,revisionId),
    previewRecovery:async(documentId,writerEpochId)=>{
      const candidate=recoveryCandidates.find(item=>item.documentId===documentId&&item.writerEpochId===writerEpochId);
      if(!candidate)throw new Error('作業の復元元が見つかりません。');
      const {document}=await persistence.recover(candidate,true);
      return historyThumbnail(document,document.head);
    },
    renameWork:async(id,name)=>{
      const isOpen=documentReady&&controller.document.root.documentId===id;
      if(isOpen&&!(await prepareWorkSwitch()))throw new Error('現在の操作が終わってから名前を変更してください。');
      await persistence.renameWork(id,name);
      if(isOpen){const loaded=await persistence.loadWork(id);await activateOpened(loaded.opened,false,loaded.entry.writerEpochId);}
      await refreshWorks();
    },
    duplicateWork:async(id)=>{
      if(!(await prepareWorkSwitch()))throw new Error('現在の作品を保存できませんでした。');
      if(documentReady&&controller.document.root.documentId===id)
        await c05References.flush();
      const loaded=await persistence.loadWork(id);
      let copy=copyOpened(loaded.opened,loaded.entry.name+' のコピー');
      // Copy the latest reference placements BEFORE exposing the new work.
      // Keep the image bytes in the shared asset library: they are not
      // deleted by a placement removal or by ordinary artwork duplication.
      const copied=await copyReferenceBoard(id,copy.document.root.documentId);
      if(copied>0){
        // A stale embedded board from a previous file import must not pop up
        // and replace the newer local placements we just copied.
        copy={...copy,preserved:{...copy.preserved,optionalSections:
          copy.preserved.optionalSections.filter(section=>section.id!=='c05.reference-board')}};
      }
      await activateOpened(copy);
      if(copied>0)homeUi?.notify(copied+'枚の参考資料を含めて作品を複製しました。');
      await refreshWorks();
    },
    deleteWork:async(id)=>{
      if(documentReady&&controller.document.root.documentId===id){
        if(!(await prepareWorkSwitch()))throw Error('現在の作品を保存してからゴミ箱へ移してください。');
      }
      await persistence.deleteWork(id);
      if(documentReady&&controller.document.root.documentId===id){
        surface?.destroy();surface=null;documentReady=false;resetCheckpointTracking();
      }
      await refreshWorks();
    },
    listTrashedWorks:async()=>(await listLocalWorks(true)).filter(work=>!!work.trashedAt),
    restoreWork:async id=>{await persistence.restoreWork(id);await refreshWorks();},
    purgeWork:async id=>{await persistence.purgeWork(id);await refreshWorks();},
    updateWorkCatalog:async(id,changes)=>{await updateLocalCatalog(id,changes);await refreshWorks();},
    resetWorks:async()=>{
      if(workSwitchBusy||!(await prepareWorkSwitch()))throw new Error('現在の操作が終わってから初期化してください。');
      workSwitchBusy=true;
      try{
        if(thumbnailTimer!==null){clearTimeout(thumbnailTimer);thumbnailTimer=null;}
        if(thumbnailRepairTimer!==null){clearTimeout(thumbnailRepairTimer);thumbnailRepairTimer=null;}
        surface?.destroy();surface=null;documentReady=false;resetCheckpointTracking();
        await persistence.resetWorks();
        works=[];lastWorkId=null;recoveryCandidates=[];thumbnailRetryCount=0;thumbnailRepairSkipped.clear();
        homeUi?.setRecoveryCandidates([]);await refreshWorks();updateHistoryButtons();
      }finally{workSwitchBusy=false;}
    },
    hasDocument:()=>documentReady,
  });
  byId<HTMLButtonElement>('home').onclick=()=>{void homeUi?.showHome();};
  // Warm exactly the size saved in the new-work dialog, not a hard-coded
  // 512×384 document. High-resolution users would otherwise compile a throwaway
  // renderer before the 4000×4000 renderer was even requested.
  window.setTimeout(()=>{
    if(initialBlankWarmup)return;
    try{
      const unit=byId<HTMLSelectElement>('ihNewUnit').value as 'px'|'mm';
      const selected=resolveDocumentDimensions(
        Number(byId<HTMLInputElement>('ihNewWidth').value),
        Number(byId<HTMLInputElement>('ihNewHeight').value),
        unit,Number(byId<HTMLInputElement>('ihNewDpi').value));
      beginBlankWarmup(selected.width,selected.height,
        byId<HTMLInputElement>('ihNewName').value,
        byId<HTMLSelectElement>('ihNewBackground').value as 'transparent'|'white',
        selected.dpi,
        byId<HTMLInputElement>('ihNewAuthor').value.trim(),
        byId<HTMLTextAreaElement>('ihNewDescription').value.trim());
    }catch{/* Invalid saved preferences do not block the new-work dialog. */}
  },300);
}
void refreshRecoveryCandidates();if(!qaMode)void refreshWorks();
if('serviceWorker' in navigator){const build=encodeURIComponent(import.meta.env.VITE_COMMIT_SHA??'dev');void navigator.serviceWorker.register('./sw.js?build='+build,{scope:'./'}).catch(()=>{});}

if(qaMode){
  const out=byId<HTMLPreElement>('qaGpuReport');
  byId<HTMLButtonElement>('qaDiagInitial').onclick=async()=>{
    out.textContent='GPUの状態を確認しています…';
    try{out.textContent=JSON.stringify(await surface?.inspectRendering(),null,2);}
    catch(e){out.textContent='診断失敗: '+String(e);}
  };
  byId<HTMLButtonElement>('qaDiagCopy').onclick=async()=>{
    const result={commit:(import.meta.env.VITE_COMMIT_SHA??'unknown'),
      gpu:await surface?.inspectRendering(),qa:JSON.parse(byId('qaAuto').textContent||'{}')};
    const txt=JSON.stringify(result,null,2);out.textContent=txt;
    try{await navigator.clipboard.writeText(txt);byId('qaDiagCopy').textContent='診断結果をコピーしました';}
    catch{byId('qaDiagCopy').textContent='下の結果を長押ししてコピーしてください';}
  };
}
if(qaMode){const state=byId<HTMLSelectElement>('qaState'),noteLabel=byId<HTMLLabelElement>('qaNoteLabel'),note=byId<HTMLTextAreaElement>('qaNote');const sync=()=>{const problem=state.value==='problem';noteLabel.hidden=!problem;note.disabled=!problem;updateQa();};state.onchange=sync;sync();byId<HTMLButtonElement>('qaCopy').onclick=async()=>{const result={result:state.value,note:state.value==='problem'?note.value:'',automatic:JSON.parse(byId('qaAuto').textContent||'{}')};try{await navigator.clipboard.writeText(JSON.stringify(result,null,2));byId('qaCopy').textContent='コピーしました';}catch{byId('qaCopy').textContent='コピーできませんでした';}};}
updateHistoryButtons();updatePersistenceDisplay();updateQa();addEventListener('resize',updateQa);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&documentReady){if(projectionCheckpointTimer!==null)clearTimeout(projectionCheckpointTimer);projectionCheckpointTimer=null;void createProjectionCheckpoint();}});addEventListener('pagehide',()=>{if(projectionCheckpointTimer!==null)clearTimeout(projectionCheckpointTimer);surface?.destroy();});

function formatFileSize(bytes:number){if(!Number.isFinite(bytes)||bytes<0)return 'サイズ不明';if(bytes<1024)return Math.round(bytes)+' B';if(bytes<1024*1024)return (bytes/1024).toFixed(bytes<10*1024?1:0)+' KB';return (bytes/(1024*1024)).toFixed(bytes<10*1024*1024?1:0)+' MB';}
function qaM09Markup(){return '<p class="qa-m09-full-app"><a id="m09FullApp" href="./app/">ホーム画面・マイ作品も確認する →</a></p>'+'<details id="qaPanel" class="qa-panel" open><summary>色の選択と保存の確認</summary><ol>'+[
'色の輪から自然に色を選べるか',
'明るさや鮮やかさを細かく調整しやすいか',
'数字を入れて正確な色にできるか',
'選んだ色ですぐ描けるか',
'スポイトでキャンバス上の色を正しく取れるか',
'最近使った色へすぐ戻れるか',
'パレットへ色を保存しやすいか',
'パレットの色を並べ替え・削除できるか',
'パレットを保存してもう一度読み込めるか',
'ペンや指で使いやすいか',
'色を操作中もキャンバスが重くならないか',
'今までの描画とキャンバス操作が壊れていないか',
'結果を「問題なし」または「問題あり」から選んでください'
].map(x=>'<li>'+x+'</li>').join('')+'</ol><details class="qa-auto"><summary>問題の調査用</summary><button id="qaDiagInitial" type="button">状態を記録する</button><button id="qaDiagCopy" type="button">結果をコピーする</button><pre id="qaGpuReport"></pre></details><label>結果<select id="qaState"><option value="unchecked">まだ確認していない</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3"></textarea></label><button id="qaCopy" type="button">確認結果をコピー</button><details class="qa-auto"><summary>詳しい動作記録</summary><pre id="qaAuto"></pre></details></details>';}
function qaM08Markup(){return '<details id="qaPanel" class="qa-panel" open><summary>キャンバスの操作と画質の確認</summary><ol>'+[
'指で用紙を動かしても、白い四角形だけが元の場所に残らないか',
'2本指で用紙を拡大・縮小して、用紙の枠と絵がずれないか',
'2本指で用紙を回して、枠と絵が一緒に回るか',
'左右・上下反転で、用紙の枠と絵がずれないか',
'100%表示で、線や細かい模様がぼやけないか',
'拡大・縮小・回転を繰り返しても、画質が不自然に崩れないか',
'描いている途中と、ペンを離した後で線の見た目が変わりすぎないか',
'右の作業欄を閉じても、描いた線がすぐ表示されるか',
'切り抜きで、作品の表示範囲が正しく変わるか',
'キャンバスのサイズ変更で、絵が勝手に引き伸ばされないか',
'画像のサイズ変更で、絵も指定した大きさに変わるか',
'端がつながるモードで、上下左右の境界をまたいで描けるか',
'元に戻す・やり直すが正常に動くか',
'保存して開き直しても、絵と変更内容が残っているか',
'2000〜3000pxの大きな作品でも操作が重くならないか',
'Androidなどの高密度画面でも線が粗く見えないか',
'問題なし、または問題ありを選んでください'
].map(x=>'<li>'+x+'</li>').join('')+'</ol><label class="checkbox-line"><input id="referencePattern" type="checkbox"> 画質確認用の細かい模様を表示（作品には影響しません）</label><details class="qa-auto"><summary>問題の調査用</summary><button id="qaDiagInitial" type="button">状態を記録する</button><button id="qaDiagCopy" type="button">結果をコピーする</button><pre id="qaGpuReport"></pre></details><label>結果<select id="qaState"><option value="unchecked">まだ確認していない</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3"></textarea></label><button id="qaCopy" type="button">確認結果をコピー</button><details class="qa-auto"><summary>詳しい動作記録</summary><pre id="qaAuto"></pre></details></details>';}
function qaMarkup(){return '<details id="qaPanel" class="qa-panel" open><summary>使いやすさと描画の確認</summary><ol>'+
['左のツール欄は見やすいですか？','ブラシと消しゴムをすぐ切り替えられますか？','右側が邪魔にならず描けますか？','右側の幅を簡単に変えられますか？','レイヤーボタンからレイヤー画面を開けますか？','その画面を開いたままでも描けますか？','元に戻す・やり直しはすぐ使えますか？','保存と画像書き出しへ迷わず行けますか？','ペンや指でボタンを押しやすいですか？','明るい見た目で制作に集中できますか？','右側を開閉しても描画が止まりませんか？','重くなっていませんか？'].map(x=>'<li>'+x+'</li>').join('')+
'</ol><details class="qa-auto"><summary>問題があるときの動作確認</summary><button id="qaDiagInitial" type="button">状態を記録する</button><button id="qaDiagCopy" type="button">結果をコピーする</button><pre id="qaGpuReport"></pre></details><label>結果<select id="qaState"><option value="unchecked">まだ確認していない</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3" placeholder="具体的に教えてください"></textarea></label><button id="qaCopy" type="button">確認結果をコピー</button><details class="qa-auto"><summary>詳しい動作記録</summary><pre id="qaAuto"></pre></details></details>';}

// C04 command entries forward to the installed real controls; do not duplicate their logic.
installFocusMode();
// These synchronous controls return from their real handler; history exposes
// its queue barrier instead of treating DOM click dispatch as completion.
const macroSynchronousControls=new Set(['paint','erase','eyedropper','fitView','view100','actualPixels',
  'resetRotation','flipH','flipV','zoomIn','zoomOut','panView','selection','selectionClear',
  'layer','colorPage','brushPage','workspaceToggle','c04FocusToggle','layerSoloToggle','layerAlphaLock','layerClipping']);
function macroExecutor(id:string):(()=>void|Promise<void>)|null{
  const ready=()=>{
    if(!documentReady||!surface||surface.busy||historyPending||geometryBusy||documentActivationPending)
      throw Error('今の操作が終わってから操作セットを実行してください。');
  };
  if(id==='undo'||id==='redo')return async()=>{
    ready();const drawing=surface!,artwork=controller.document;
    if(performHistory(id)!=='accepted')throw Error('この履歴操作は現在実行できません。');
    await historyNavigation!.barrier();await drawing.settleStrokes();
    if(controller.document!==artwork||surface!==drawing)throw Error('作品が切り替わりました。');
  };
  if(id.startsWith('brush:'))return ()=>{
    ready();const preset=id.slice(6);
    if(!surface!.brushes.some(brush=>brush.id===preset))throw Error('このブラシはもうありません。');
    selectPreset(preset);
    if(surface!.brushId!==preset)throw Error('ブラシを切り替えられませんでした。');
  };
  if(id==='guideEnabled')return ()=>{
    ready();const field=byId<HTMLInputElement>(id);field.checked=!field.checked;refreshGuideSettings();
  };
  if(!macroSynchronousControls.has(id))return null;
  return ()=>{
    ready();const control=byId<HTMLButtonElement>(id),handler=control.onclick;
    if(!handler)throw Error('この操作はまだ準備できていません。');
    const head=controller.document.head;
    const result=handler.call(control,new PointerEvent('click')) as unknown;
    if(result instanceof Promise)return result;
    if((id==='layerAlphaLock'||id==='layerClipping')&&controller.document.head===head)
      throw Error(byId('status').textContent||'レイヤーを変更できませんでした。');
  };
}
const c04Commands=installCommandPalette(shellUi,foreground,{
  layers:()=>{
    if(!documentReady)return [];
    const root=controller.document.root;
    return root.rootLayerIds.map(id=>{
      const layer=root.getLayer(id);
      return {id,name:layer.name,visible:root.isLayerVisible(id)};
    });
  },
  selectLayer:async id=>{
    if(!documentReady||!controller.document.root.hasLayer(id as LayerId))
      throw new Error('選ぼうとしたレイヤーが現在の作品にありません。');
    const selectedId=id as LayerId,root=controller.document.root,layer=root.getLayer(selectedId);
    shellUi.setLayerPage(true);
    if(layer.baseColor==='white'&&layer.visible&&!layer.locked){
      await materializeAndSelectWhiteLayer(selectedId);
      return;
    }
    controller.selectLayer(selectedId);
    renderLayers();updateHistoryButtons();updateQa();
    byId('status').textContent=layer.name+(root.isLayerVisible(selectedId)
      ?'を選びました。':'を選びました。描くにはレイヤーを表示してください。');
    if(!qaMode)await persistence.selectWorkLayer(selectedId);
  },
},{resolve:macroExecutor,contextKey:()=>documentReady&&!documentActivationPending?controller.document:null});
const c04MacroService=installSimpleMacros(c04Commands);
installEditorHelp();
const c04FloatingPanels=installFloatingPanels();
const c04Toolbar=installToolbarSettings();
const c04WorkspaceService=installWorkspaceProfiles(c04FloatingPanels,c04Toolbar);
installInputDeviceProfiles(()=>surface);
installGestureShortcuts();
installShortcutSettings(c04Commands,()=>!surface||!surface.inputActive);

// C05: personal asset vault and reference board remain independent of raster history.
const c05References=installReferenceBoard({
  getDocumentId:()=>documentReady?controller.document.root.documentId:null,
  color:foreground,
  getSampling:()=>{
    const {diameter,transparency}=eyedropperSettings.options();
    return {diameter,transparency};
  },
  onPickColor:async assetId=>{
    const entry=await getAsset(assetId);
    if(!entry||entry.deleted||!entry.mime.startsWith('image/'))throw Error('参考画像が見つかりません。');
    await eyedropperSettings.reference.openBlob(entry.data);
  }
});
c05ReferenceBoard=c05References;
installAssetPanel({
  openReference:assetId=>c05References.add(assetId),
  flushReferences:()=>c05References.flush(),
  applyBrushMaterial:async asset=>{
    const drawing=surface,source=drawing?.preset;
    if(!drawing||!source||drawing.busy)throw Error('描画が終わってからブラシを選んでください。');
    if(!['tip','paper','texture','pattern'].includes(asset.kind))throw Error('ブラシ用の素材ではありません。');
    const kind=asset.kind as BrushMaterialKind;
    const resource=await readBrushMaterial(asset.data,kind,asset.name);
    if(surface!==drawing||drawing.busy||drawing.preset!==source)
      throw Error('ブラシや作品が変わりました。もう一度適用してください。');
    const prepared=withBrushMaterial(source,kind,resource);
    const copy=brushPresets.duplicate(prepared,(source.name+' · '+asset.name).slice(0,100));
    refreshBrushCatalog(copy.id);
    brushMessage('素材を使う自作ブラシを保存しました。');
  },
  placeImage:async file=>{
    if(!documentReady||!surface)throw Error('作品を開いてください。');
    await c06Clipboard.importImage(file,file.name);
    await withClipboardAccess(async()=>{
      await c06Clipboard.paste(controller,'center');
      return 'edit';
    });
  },
  applyEditable:async asset=>{
    if(!documentReady||!surface)throw Error('作品を開いてください。');
    if(asset.data.size>1048576)throw Error('図形・グラデーションのデータが大きすぎます。');
    const content=validateEditableArtwork(JSON.parse(await asset.data.text()));
    if(!content)throw Error('素材に図形・グラデーションの編集データがありません。');
    if((asset.kind==='shape'&&content.kind!=='path')||
      (asset.kind==='gradient'&&content.kind!=='gradient'))
      throw Error('素材の種類と図形・グラデーションの内容が一致しません。');
    await artworkActions.save(content,asset.name);
  },
  importMacro:text=>{
    if(!c04MacroService)throw Error('操作セットの読み込み画面がありません。');
    return c04MacroService.importText(text);
  },
  importWorkspace:text=>{
    if(!c04WorkspaceService)throw Error('作業場設定の読み込み画面がありません。');
    return c04WorkspaceService.importText(text);
  }
});
document.querySelector('#referenceBoxBody')?.closest('.workspace-box')?.querySelector('.box-toggle')
  ?.addEventListener('click',()=>{void c05References.refreshIfChanged();});

// C06: copy/cut/paste operate through real Core transactions and one history step.
const c06Clipboard=new ArtworkClipboard();
async function withClipboardAccess(action:(drawing:BrushSurface)=>Promise<'edit'|'read'>){
  const drawing=surface,artwork=controller.document;
  if(!drawing||!documentReady||drawing.busy||drawing.inputActive||geometryBusy||historyPending||documentActivationPending)
    throw Error('描画や保存の処理が終わってから実行してください。');
  // Prevent a second clipboard mutation while preserving independent UI navigation.
  geometryBusy=true;
  drawing.setInputBarrier(true);
  try{
    const head=artwork.head;
    const result=await action(drawing);
    if(drawing!==surface||artwork!==controller.document)throw Error('作品が切り替わったため中止しました。');
    if(result==='edit'){
      if(head===artwork.head)throw Error('編集内容が作品に反映されませんでした。');
      queueLatestCommit();checkpointNeedsFullSeed=true;
      await drawing.restoreDocumentProjection();
      renderLayers();updateHistoryButtons();updateQa();
    }
  }finally{
    geometryBusy=false;
    if(surface===drawing)drawing.setInputBarrier(false);
    c06ClipboardUI?.refresh();
  }
}
const c06Download=(blob:Blob,fileName:string)=>{
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=fileName;document.body.append(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
};
timeline=installTimeline(byId('workspaceBoxBody'),()=>documentReady&&!documentActivationPending?controller.document:null,c06Download);
c04Commands.registerProvider(()=>[{
  id:'workTimeline',label:'制作記録を開く',category:'作品',aliases:'タイムラプス 動画',
  availability:()=>documentReady?null:'先に作品を開いてください。',
  execute:()=>{shellUi.openBox('workspaceBox');timeline?.open();}
}]);

c06Selection=installSelectionWorkbench({
  getSurface:()=>documentReady?surface:null,
  getDocument:()=>documentReady?{
    id:controller.document.root.documentId,
    width:controller.document.root.width,
    height:controller.document.root.height
  }:null,
  onMaskChanged:mask=>{
    c06Clipboard.setSelectionMask(mask);
    c06ClipboardUI?.refresh();
    // Free-form selection changes do not necessarily update BrushSurface.selectedRectangle.
    // Refresh the actual selection-mask action immediately.
    updateVectorMaskControls();
  },
  capturePixels:async source=>{
    const drawing=surface,artwork=controller.document,revision=artwork.head;
    if(!documentReady||!drawing||drawing.busy||drawing.inputActive||historyPending||geometryBusy)
      throw Error('描画が終わってから色による選択を実行してください。');
    const width=artwork.root.width,height=artwork.root.height;
    let result:Uint8Array|Uint8ClampedArray;
    if(source==='merged')result=await renderFrozenArtwork(captureExport(artwork));
    else{
      const layerId=controller.selectedLayer.id;
      const captured=await drawing.captureDocumentLayers(new Set([layerId]));
      const bytes=captured.get(layerId);
      if(!bytes)throw Error('選んだレイヤーを読み込めませんでした。');
      result=bytes;
    }
    if(drawing!==surface||artwork!==controller.document||artwork.head!==revision)
      throw Error('計算中に作品が変更されました。もう一度選択してください。');
    if(result.length!==width*height*4)throw Error('作品の画素が不足しています。');
    return new Uint8ClampedArray(result);
  },
  moveContent:async(dx,dy)=>{
    await withClipboardAccess(async drawing=>{
      await c06Clipboard.moveContent(controller,drawing,dx,dy);
      return 'edit';
    });
  }
});
persistence.setSaveAttachmentProvider(()=>{
  const preserved=persistence.preservedData;
  const documentPalette=foreground.exportDocumentPaletteSection();
  const recording=timeline?.exportNative(controller.document);
  const symmetry={id:SYMMETRY_SECTION,type:SYMMETRY_TYPE,required:false,bytes:new TextEncoder().encode(JSON.stringify(symmetrySettings))};
  const referenceDocumentId=controller.document.root.documentId;
  const safeReference=c05References.exportNative().catch(reason=>{
    // References are optional. An unreadable sidecar must never prevent the
    // artwork itself from being saved, but a stale old bundle must not survive.
    const warning='参考資料の書き出しに失敗しました。絵は保存しますが、このファイルの参考資料を復元できない可能性があります。'+
      (reason instanceof Error?reason.message:'');
    byId('status').textContent=warning;
    window.dispatchEvent(new CustomEvent('illustro:reference-save-warning',{
      detail:{message:warning,documentId:referenceDocumentId,omittedAssetIds:[]}
    }));
    return referenceUnavailableSection(referenceDocumentId);
  });
  const editingState=Promise.all([safeReference,c06Selection?.exportNative()??[]])
    .then(values=>({values}),error=>({error}));
  return async root=>{
    const result=await editingState;
    if('error' in result)throw result.error;
    const [reference,selections]=result.values,fonts=await exportFonts(root,preserved);
    return [...(reference?[reference]:[]),...selections,...fonts,...(documentPalette?[documentPalette]:[]),...(recording?[recording]:[]),symmetry];
  };
});
const unavailableImageLinks=new Set<string>();
function linkPreview(pixels:Uint8Array,width:number,height:number){
  const scale=Math.min(1,210/Math.max(width,height));
  const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
  const view=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const at=(Math.floor(height*y/h)*width+Math.floor(width*x/w))*4;
    view.set(pixels.subarray(at,at+4),(y*w+x)*4);
  }
  return new ImageData(view,w,h);
}
function pixelsInPlacement(artwork:CoreDocument,id:LayerId,link:LayerImageLink){
  const full=artwork.readBaseRasterPixels(id),{width:canvasWidth}=artwork.root;
  const {x,y,width,height}=link,local=new Uint8ClampedArray(width*height*4);
  for(let row=0;row<height;row++){
    const offset=((y+row)*canvasWidth+x)*4;
    local.set(full.subarray(offset,offset+width*4),row*width*4);
  }
  return new ImageData(local,width,height);
}
imageLinkPanel=installImageLinkPanel(byId('documentBoxBody'),{
  current:()=>{
    const layer=controller.selectedLayer,link=layer.imageLink??null;
    const missing=!!(link?.kind==='instance'&&!controller.document.root.layers.get(link.sourceId)?.imageLink||
      link?.kind==='linked'&&unavailableImageLinks.has(link.fileKey));
    return {name:layer.name,link,missing};
  },
  sources:()=>controller.layers.flatMap(layer=>layer.imageLink&&layer.imageLink.kind!=='instance'?[{id:layer.id,name:layer.name}]:[]),
  prepare:async(action,source,position)=>{
    if(!documentReady)throw Error('作品を開いてください。');
    const artwork=controller.document,head=artwork.head,root=artwork.root,selected=controller.selectedLayer;
    const {width,height}=root,existing=selected.imageLink;
    const fit=(w:number,h:number,x?:number,y?:number)=>{
      if(position&&(!Number.isSafeInteger(position.x)||!Number.isSafeInteger(position.y)))throw Error('配置座標は整数で指定してください。');
      const px=position?.x??x??Math.round((width-w)/2),py=position?.y??y??Math.round((height-h)/2);
      if(px<0||py<0||px+w>width||py+h>height)throw Error('画像がすべてキャンバスに収まる座標を指定してください。');
      return {x:px,y:py,width:w,height:h};
    };
    const placed=(image:ImageBitmap|ImageData,link:LayerImageLink)=>placedImage(width,height,image,link);
    const original=source&&root.layers.get(source);
    const create=action==='link'||action==='embed'||action==='instance';
    let edits:Array<{id:LayerId;pixels:Uint8Array;link:LayerImageLink}>=[];
    let fileToRemember:Parameters<typeof rememberImageHandle>|undefined;
    let staleFileKey:string|undefined;
    let needsManualUpdate=false;
    if(action==='instance'||action==='rebind'){
      const ref=original?.imageLink;
      if(!original||!ref||ref.kind==='instance'||original.id===selected.id&&action==='rebind')
        throw Error('リンクまたは埋め込みの元画像を選んでください。同じ画像を参照する複製は元にできません。');
      if(action==='rebind'&&existing?.kind!=='instance')throw Error('元を選び直す複製を選んでください。');
      const placement=fit(existing&&action==='rebind'?existing.width:ref.width,existing&&action==='rebind'?existing.height:ref.height,
        existing&&action==='rebind'?existing.x:ref.x,existing&&action==='rebind'?existing.y:ref.y);
      const link:LayerImageLink={kind:'instance',sourceId:original.id,name:ref.name,digest:ref.digest,...placement};
      edits=[{id:selected.id,pixels:placed(pixelsInPlacement(artwork,original.id,ref),link),link}];
    }else if(action==='move'){
      if(!existing||!position)throw Error('画像を選び、「配置する座標を指定」を有効にしてください。');
      const link={...existing,...fit(existing.width,existing.height)};
      edits=[{id:selected.id,pixels:placed(pixelsInPlacement(artwork,selected.id,existing),link),link}];
    }else{
      if(!create&&existing?.kind!=='linked')throw Error('外部リンクしている元画像のレイヤーを選んでください。');
      const update=existing?.kind==='linked'&&!create?existing:null;
      let opened;
      try{
        opened=action==='update'&&update?{file:await readLinkedFile(update.fileKey),handle:null}:await chooseLinkedImage();
      }catch(error){
        if(action==='update'&&update){unavailableImageLinks.add(update.fileKey);imageLinkPanel?.refresh();}
        throw error;
      }
      const loaded=await decodeLinkedImage(opened.file);
      try{
        if(action==='update'&&update?.digest===loaded.digest){unavailableImageLinks.delete(update.fileKey);imageLinkPanel?.refresh();return null;}
        // Only an automatic refresh may reuse the existing handle identity.
        // If the user picked a different file (or a browser input fallback),
        // use a new key so an older persisted handle cannot reopen it.
        const fileKey=nextLinkedImageFileKey(action==='update'?'update':action==='reselect'?'reselect':'link',
          update?.fileKey??null,()=>crypto.randomUUID());
        if(update&&fileKey!==update.fileKey)staleFileKey=update.fileKey;
        needsManualUpdate=action!=='embed'&&opened.handle===null;
        const natural=Math.min(1,width/loaded.bitmap.width,height/loaded.bitmap.height);
        const placement=update?{x:update.x,y:update.y,width:update.width,height:update.height}:
          fit(Math.max(1,Math.round(natural*loaded.bitmap.width)),Math.max(1,Math.round(natural*loaded.bitmap.height)));
        const common={name:loaded.name,digest:loaded.digest,...placement};
        const link:LayerImageLink=action==='embed'?{...common,kind:'embedded'}:{...common,kind:'linked',fileKey};
        if(opened.handle&&link.kind==='linked')fileToRemember=[fileKey,opened.handle];
        edits.push({id:selected.id,pixels:placed(loaded.bitmap,link),link});
        if(update){
          for(const layer of controller.layers){
            const related=layer.imageLink;
            if(related?.kind!=='instance'||related.sourceId!==selected.id)continue;
            const link:LayerImageLink={...related,name:loaded.name,digest:loaded.digest};
            edits.push({id:layer.id,pixels:placed(loaded.bitmap,link),link});
          }
        }
      }finally{loaded.bitmap.close();}
    }
    const first=edits[0]!;
    const old=create?null:linkPreview(artwork.readBaseRasterPixels(selected.id),width,height);
    const after=linkPreview(first.pixels,width,height);
    const description=(create?'画像を新しいレイヤーに配置します。':`${edits.length}枚の画像を更新します。`)+
      ' 元画像 '+first.link.name+'　版 '+first.link.digest.slice(0,10)+'。'+
      (needsManualUpdate?' このブラウザーでは元ファイルの自動更新ができません。変更したら「元ファイルを選び直す」を使ってください。':'');
    return {before:old,after,description,apply:async()=>{
      await withClipboardAccess(async()=>{
        if(artwork!==controller.document||artwork.head!==head||controller.selectedLayer.id!==selected.id)
          throw Error('作品が変わりました。候補を作り直してください。');
        const tx=artwork.begin(create?'参照画像を配置':'参照画像を更新');
        if(create){
          const id=tx.addRasterSnapshotAbove(selected.id,first.pixels,first.link.name);
          tx.setLayerImageLink(id,first.link);
          controller.lastPersistenceHandoff=tx.commit().persistence;
          controller.selectLayer(id);
        }else{
          for(const entry of edits)tx.updateLayerImagePixels(entry.id,entry.pixels,entry.link);
          controller.lastPersistenceHandoff=tx.commit().persistence;
        }
        if(first.link.kind==='linked'){
          if(needsManualUpdate)unavailableImageLinks.add(first.link.fileKey);
          else unavailableImageLinks.delete(first.link.fileKey);
        }
        return 'edit';
      });
      // The artwork has already been committed. A browser storage failure
      // must not convert a successful image edit into a misleading retry.
      if(fileToRemember){
        const saved=await rememberImageHandle(...fileToRemember);
        if(!saved)byId('status').textContent='参照画像を反映しました。この端末で元ファイルの参照を保存できなかったため、再起動後は元ファイルを選び直してください。';
      }
      if(staleFileKey){
        try{await forgetImageHandle(staleFileKey);}
        catch{byId('status').textContent='参照画像は更新しましたが、古いファイルの参照情報を片付けられませんでした。元画像へのリンクには新しい参照先を使います。';}
      }
    }};
  },
  finish:async action=>{
    const layer=controller.selectedLayer,link=layer.imageLink;
    if(!link)throw Error('リンク・埋め込み・複製の画像レイヤーを選んでください。');
    if(action==='embed'&&link.kind==='embedded')throw Error('この画像はすでに埋め込まれています。');
    if(action==='independent'&&!await appConfirm('現在の見た目を残し、元画像の更新から切り離しますか？'))return;
    const embedded:LayerImageLink={kind:'embedded',name:link.name,digest:link.digest,x:link.x,y:link.y,width:link.width,height:link.height};
    changeLayer(action==='embed'?'現在の画像を埋め込みました。':'独立した描画レイヤーに変換しました。',
      tx=>tx.setLayerImageLink(layer.id,action==='embed'?embedded:null));
  }
});
installLayoutPanel(byId('documentBoxBody'),async()=>{
  const artwork=controller.document,head=artwork.head,root=artwork.root,referenceId=controller.selectedLayer.id,drawing=surface;
  const ids=root.rootLayerIds.filter(id=>layerBatchIds.has(id));
  if(ids.length<2)throw Error('レイヤー画面で複数選択を開き、整列するレイヤーを2枚以上選んでください。');
  const captureIds=new Set([...ids,referenceId]);
  const pixels=new Map<LayerId,Uint8Array>();
  await withClipboardAccess(async viewport=>{
    for(const [id,rgba] of await viewport.captureDocumentLayers(captureIds))pixels.set(id,rgba);
    return 'read';
  });
  const {width,height}=root;
  const item=(id:LayerId)=>{
    const layer=root.getLayer(id),rgba=pixels.get(id);
    const bounds=rgba&&alphaBounds(rgba,width,height);
    if(!bounds)throw Error('「'+layer.name+'」には位置合わせできる絵がありません。');
    const fixed=root.isLayerContentLocked(id)||root.isLayerPositionLocked(id)||!!(layer.baseColor||layer.deformation||layer.lineRegions||layer.imageLink);
    return {id,name:layer.name,bounds,fixed};
  };
  const items=ids.map(item),reference=item(referenceId);
  const valid=()=>surface===drawing&&controller.document===artwork&&artwork.head===head&&controller.selectedLayer.id===referenceId&&
    ids.length===layerBatchIds.size&&ids.every(id=>layerBatchIds.has(id));
  return {items,reference,width,height,valid,applyGroup:async options=>{
    if(!valid())throw Error('作品または選択レイヤーが変更されました。');
    const {settings}=groupTransformPlan(items,width,height,options);
    const changes:Array<{
      id:LayerId;pixels:Uint8ClampedArray;deformation?:LayerDeformation;content?:EditableArtwork;
      mask:LayerMask|null
    }>=[];
    // Reject unsupported metadata before rendering or writing ANY selected layer.
    for(const item of items){
      const layer=root.getLayer(item.id),prefix='「'+layer.name+'」';
      if(root.isLayerContentLocked(item.id)||root.isLayerPositionLocked(item.id))throw Error(prefix+'のロックを解除してください。');
      if(layer.baseColor)throw Error(prefix+'は白背景です。描画レイヤーを選んでください。');
      if(layer.imageLink)throw Error(prefix+'は元画像の配置情報を持っています。参照先を保つため、画像の専用画面で個別に編集してください。');
      if(layer.lineRegions)throw Error(prefix+'は線画の領域番号を持っています。領域の対応を保つため、まとめて変形できません。');
      if(layer.editable)editableGroupTransform(layer.editable,settings);
    }
    // Compute one layer at a time. No flattened group image is created.
    for(const item of items){
      const layer=root.getLayer(item.id);
      const linked=!!(layer.vectorMask&&layer.vectorMask.linked!==false);
      const mask=linked?transformLinkedMask(layer.vectorMask!,settings,width,height):null;
      if(layer.editable){
        const content=editableGroupTransform(layer.editable,settings);
        const transformed=await runArtwork({content,width,height,outputWidth:width,outputHeight:height});
        if(!valid())throw Error('変形の計算中に作品または選択が変更されました。');
        changes.push({id:item.id,pixels:transformed,content,mask});continue;
      }
      const saved=layer.deformation;
      if(saved&&(saved.enabled===false||saved.mode!=='affine'||saved.selection||saved.postPaint?.length))
        throw Error('「'+layer.name+'」には範囲付き・ゆがみ・変形後の描画があります。個別に変形してください。');
      if(saved&&(saved.linkedMask!==linked||linked&&saved.maskDigest&&
        await digestLayerMask(layer.vectorMask!)!==saved.maskDigest))
        throw Error('「'+layer.name+'」のマスクが変形後に変更されています。先に個別の変形を確認してください。');
      const combined=saved?composeGroupAffine(savedTransformSettings(saved),settings):settings;
      const original=saved?artwork.revision(saved.sourceRevision).root.getLayer(saved.sourceLayerId??item.id):null;
      const input=saved&&original?await originalTransformPixels(artwork,original,saved.sourceRevision):pixels.get(item.id)!;
      const transformed=await runTransform({pixels:input,width,height,settings:combined,
        selection:null,outputWidth:width,outputHeight:height});
      if(!valid())throw Error('変形の計算中に作品または選択が変更されました。');
      const maskDigest=mask?await digestLayerMask(mask):undefined;
      const deformation:LayerDeformation={
        version:1,sourceRevision:saved?.sourceRevision??head,bounds:saved?.bounds??item.bounds,mode:'affine',
        ...(saved?.sourceLayerId?{sourceLayerId:saved.sourceLayerId}:{}),
        interpolation:settings.interpolation,selection:null,linkedMask:linked,
        affine:{dx:combined.dx,dy:combined.dy,sx:combined.sx,sy:combined.sy,
          angle:combined.angle,shear:combined.shear,cx:combined.cx,cy:combined.cy},
        ...(maskDigest?{maskDigest}:{})
      };
      changes.push({id:item.id,pixels:transformed,deformation,mask});
    }
    // A transformed source also updates linked results outside the selection.
    const changedPaths=new Map(changes.flatMap(change=>change.content?.kind==='path'?[[change.id,change.content] as const]:[]));
    const first=changedPaths.entries().next().value;
    if(first){
      const dependents=await linkedBooleanUpdates(root.rootLayerIds.flatMap(id=>{
        const content=root.getLayer(id).editable;return content?.kind==='path'?[{id,content}]:[];
      }),first[0],first[1],changedPaths);
      for(const update of dependents){
        const mask=root.getLayer(update.id).vectorMask??null;
        changes.push({id:update.id,content:update.content,mask:null,pixels:await runArtwork({
          content:update.content,width,height,outputWidth:width,outputHeight:height,mask})});
      }
    }
    await withClipboardAccess(async()=>{
      if(!valid())throw Error('作品が変更されました。変形をやり直してください。');
      const tx=artwork.begin('複数レイヤーをまとめて変形');
      try{
        tx.replaceLayerDeformationsBatch(changes.map(({mask:_mask,...entry})=>entry));
        for(const change of changes)if(change.mask)tx.setVectorLayerMask(change.id,change.mask);
        controller.lastPersistenceHandoff=tx.commit().persistence;
      }catch(error){tx.cancel();throw error;}
      return 'edit';
    });
  },apply:async moves=>{
    const updates=await Promise.all(moves.filter(move=>Math.abs(move.dx)+Math.abs(move.dy)>.01).map(async move=>{
      const {id}=move.item,layer=root.getLayer(id);
      if(move.item.fixed)throw Error('「'+layer.name+'」は移動できません。このレイヤーを基準にするかロックを解除してください。');
      const settings={...initialTransform,dx:move.dx,dy:move.dy};
      const rgba=await runTransform({pixels:pixels.get(id)!,width,height,settings,selection:null,outputWidth:width,outputHeight:height});
      const editable=layer.editable?moveEditableArtwork(layer.editable,move.dx,move.dy):null;
      const mask=layer.vectorMask&&layer.vectorMask.linked!==false
        ?transformLayerMask(layer.vectorMask,1,1,move.dx,move.dy):layer.vectorMask??null;
      return {id,pixels:rgba,editable,mask};
    }));
    const movedPaths=new Map(updates.flatMap(update=>update.editable?.kind==='path'
      ?[[update.id,update.editable] as const]:[]));
    const first=movedPaths.entries().next().value;
    if(first){
      const dependents=await linkedBooleanUpdates(root.rootLayerIds.flatMap(id=>{
        const content=root.getLayer(id).editable;
        return content?.kind==='path'?[{id,content}]:[];
      }),first[0],first[1],movedPaths);
      for(const dependent of dependents){
        const mask=root.getLayer(dependent.id).vectorMask??null;
        updates.push({id:dependent.id,editable:dependent.content,mask,pixels:await runArtwork({
          content:dependent.content,width,height,outputWidth:width,outputHeight:height,mask})});
      }
    }
    await withClipboardAccess(async()=>{
      if(!valid())throw Error('計算中に作品が変わりました。');
      const tx=artwork.begin('レイヤーの整列・均等配置');
      tx.placeRasterLayers(updates);
      controller.lastPersistenceHandoff=tx.commit().persistence;
      return 'edit';
    });
  }};
});
function savedTransformSettings(saved:NonNullable<ReturnType<CoreDocument['root']['getLayer']>['deformation']>):Transform{
  return {...initialTransform,mode:saved.mode,interpolation:saved.interpolation,
    ...('affine' in saved?saved.affine:'strokes' in saved?{liquify:saved.strokes}:
      'mesh' in saved?{mesh:{bounds:saved.bounds,controls:saved.mesh}}:
        {quadrilateral:{bounds:saved.bounds,corners:saved.corners}})};
}
async function originalTransformPixels(artwork:CoreDocument,original:ReturnType<CoreDocument['root']['getLayer']>,revision:RevisionId){
  const frozen=captureExport(artwork,original.id,revision),surfaceId=original.surface.descriptor.surfaceId;
  return new Uint8Array(await renderFrozenArtwork({...frozen,layers:[{surfaceId,visible:true,opacity:1}],
    strokes:frozen.strokes.filter(item=>item.surfaceId===surfaceId),
    basePixels:frozen.basePixels?.filter(item=>item.surfaceId===surfaceId)??[]}));
}
transformPanel=installTransformPanel(byId('documentBoxBody'),async target=>{
  const artwork=controller.document,head=artwork.head,layer=controller.selectedLayer;
  const {width,height}=artwork.root;
  const drawing=surface,activeSelection=c06Selection?.active()??null;
  if(!drawing)throw Error('作品を開いてください。');
  const saved=target==='boundary'?null:layer.deformation;
  if(saved&&target==='selected')throw Error('保存済みの変形を編集するには「レイヤー全体」を選んでください。');
  if(target!=='layer'&&!activeSelection)throw Error('先に範囲を選択してください。');
  if(target!=='boundary'&&(layer.baseColor==='white'||layer.editable||layer.imageLink||artwork.root.isLayerContentLocked(layer.id)||artwork.root.isLayerPositionLocked(layer.id)))
    throw Error('変形できる描画用レイヤーを選び、位置と内容のロックを解除してください。');
  const sourceRevision=saved?.sourceRevision??head;
  const original=artwork.revision(sourceRevision).root.getLayer(saved?.sourceLayerId??layer.id);
  const selection=saved?.selection?readSelectionMask(saved.selection,width,height):target==='layer'?null:activeSelection;
  let pixels:Uint8Array|undefined;
  const marks={x:[] as SnapMark[],y:[] as SnapMark[]};
  await withClipboardAccess(async viewport=>{
    if(target==='boundary'&&activeSelection){
      pixels=new Uint8Array(width*height*4);
      for(let i=0;i<activeSelection.alpha.length;i++){pixels[i*4]=255;pixels[i*4+1]=155;pixels[i*4+3]=activeSelection.alpha[i]!;}
    }else if(saved)pixels=await originalTransformPixels(artwork,original,sourceRevision);
    else pixels=(await viewport.captureDocumentLayers(new Set([layer.id]))).get(layer.id);
    const otherLayers=artwork.root.rootLayerIds.filter(id=>id!==layer.id&&layerBatchIds.has(id));
    if(otherLayers.length){
      const frames=await viewport.captureDocumentLayers(new Set(otherLayers));
      for(const [id,rgba] of frames){
        const outline=alphaBounds(rgba,width,height),name=artwork.root.getLayer(id).name;
        if(!outline)continue;
        for(const value of [outline.x,outline.x+outline.width/2,outline.x+outline.width])marks.x.push({value,name});
        for(const value of [outline.y,outline.y+outline.height/2,outline.y+outline.height])marks.y.push({value,name});
      }
    }
    return 'read';
  });
  if(!pixels)throw Error('変形する絵を読み込めません。');
  const bounds=saved?.bounds??(selection?boundsOfSelection(selection):alphaBounds(pixels,width,height))??{x:0,y:0,width,height};
  const linkedMask=Boolean((saved?saved.linkedMask:target==='layer')&&layer.vectorMask&&layer.vectorMask.linked!==false);
  const replacementOpacity=transformPreviewReplacementOpacity(artwork.root,layer.id,target);
  let previewScene:FrozenExport|undefined;
  const valid=()=>surface===drawing&&controller.document===artwork&&artwork.head===head&&
    controller.selectedLayer.id===layer.id&&(target==='layer'||c06Selection?.active()===activeSelection);
  return {
    width,height,bounds,name:target==='boundary'?'選択の枠':target==='selected'?'選択した絵':layer.name,
    pixels,selection:target==='boundary'?null:selection,drawing,valid,objectSnap:marks,originalAlphaLocked:!!original.alphaLocked,...(layer.vectorMask?{maskLink:linkedMask}:{}),
    ...(replacementOpacity===null?{}:{replacementLayerId:layer.id,replacementOpacity}),
    ...(target!=='boundary'&&replacementOpacity===null?{compositePreview:async(settings:Transform,originalPixels:Uint8Array,signal:AbortSignal)=>{
      signal.throwIfAborted();
      if(!valid())throw Error('作品が変わったため変形の確認表示を終了しました。');
      previewScene??=captureExport(artwork,undefined,head);
      // Calculate final layer pixels off-thread only after a pause in handle
      // movement. Composite all layers tile by tile, then shrink the result.
      const result=await runTransform({pixels:originalPixels,width,height,settings,selection,
        outputWidth:width,outputHeight:height,...(saved?.postPaint?{postPaint:saved.postPaint}:{})},signal);
      const sourceMask=saved?original.vectorMask:layer.vectorMask;
      const mask=linkedMask&&sourceMask?transformLinkedMask(sourceMask,settings,width,height):layer.vectorMask;
      const surfaceId=layer.surface.descriptor.surfaceId;
      const scene={...previewScene,layers:previewScene.layers.map(item=>item.surfaceId===surfaceId
        ?{...item,...(mask?{mask}:{})}:item)};
      const scale=Math.min(1,350/Math.max(width,height));
      const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
      const composite=await renderFrozenArtworkTiledPreview(scene,w,h,{replacement:{surfaceId,pixels:result},signal});
      if(!composite||!valid())throw Error('変形の重なりを表示できませんでした。');
      return new ImageData(new Uint8ClampedArray(composite),w,h);
    }}:{}),
    guides:guidePreferences.enabled?{
      x:[{value:guidePreferences.x??0,name:'定規の基準 X'}],y:[{value:guidePreferences.y??0,name:'定規の基準 Y'}]
    }:null,
    ...(saved?{initial:savedTransformSettings(saved),postPaint:saved.postPaint??[]}:{}),
    apply:async(settings,result,editedOriginal)=>{
      if(!valid())throw Error('変形を開始したときの対象から変更されています。');
      if(target==='boundary'){
        const alpha=new Uint8Array(width*height);
        for(let i=0;i<alpha.length;i++)alpha[i]=result[i*4+3]!;
        c06Selection?.replaceActive({width,height,alpha});
        return;
      }
      const quadrilateral=settings.quadrilateral;
      const mode=settings.mode;
      if(saved&&mode!=='affine'&&!cornerMode(mode)&&!meshMode(mode)&&mode!=='liquify')throw Error('元の絵と後から描いた線を保つには、移動・四隅・網・囲い・ゆがみを選んでください。');
      if(linkedMask&&saved?.maskDigest&&layer.vectorMask&&await digestLayerMask(layer.vectorMask)!==saved.maskDigest)
        throw Error('変形後にマスクを編集しています。編集したマスクを保つには、マスクのリンクを外してから変形してください。');
      const sourceMask=saved?original.vectorMask:layer.vectorMask;
      const mask=linkedMask&&sourceMask?transformLinkedMask(sourceMask,settings,width,height):null;
      const maskDigest=mask?await digestLayerMask(mask):null;
      let deformation:LayerDeformation|null=null;
      if(mode==='affine'||cornerMode(mode)||meshMode(mode)||mode==='liquify'){
        const base={version:1 as const,sourceRevision,bounds,interpolation:settings.interpolation,linkedMask,
          ...(saved?.sourceLayerId?{sourceLayerId:saved.sourceLayerId}:{}),
          ...(saved?.postPaint?{postPaint:saved.postPaint}:{}),
          selection:saved?.selection??(target==='selected'&&selection?selectionAsLayerMask(selection):null),
          ...(maskDigest?{maskDigest}:{})
        };
        if(mode==='affine'){
          const {dx,dy,sx,sy,angle,shear,cx,cy}=settings;
          deformation={...base,mode,affine:{dx,dy,sx,sy,angle,shear,cx,cy}};
        }
        if(cornerMode(mode)&&quadrilateral)deformation={...base,mode,corners:quadrilateral.corners};
        if(meshMode(mode)&&settings.mesh)deformation={...base,mode,mesh:settings.mesh.controls};
        if(mode==='liquify')deformation={...base,mode,strokes:settings.liquify??[]};
      }
      const pixels=saved?.postPaint?.length?await replayBrushPasses(saved.postPaint,width,height,new Uint8Array(result)):result;
      await withClipboardAccess(async()=>{
        if(!valid())throw Error('作品が変更されました。');
        const tx=artwork.begin(target==='selected'?'選択した絵を変形':'レイヤーを変形');
        if(deformation)tx.replaceLayerDeformation(layer.id,pixels,deformation);
        else tx.replaceLayerRaster(layer.id,pixels);
        if(mask)tx.setVectorLayerMask(layer.id,mask);
        if(editedOriginal)tx.replaceDeformationOriginal(layer.id,editedOriginal,original.vectorMask??null);
        controller.lastPersistenceHandoff=tx.commit().persistence;
        return 'edit';
      });
    }
  };
},async()=>{
  const artwork=controller.document,head=artwork.head,layer=controller.selectedLayer;
  if(!layer.deformation)throw Error('再編集できる変形を保持したレイヤーを選んでください。');
  if(!await appConfirm('現在の見た目を画像として残します。以後は、元の変形を調整できません。実行しますか？'))
    throw Error('焼き込みを取り消しました。');
  await withClipboardAccess(async()=>{
    if(controller.document!==artwork||artwork.head!==head||controller.selectedLayer.id!==layer.id)
      throw Error('選んだレイヤーが変更されました。');
    const tx=artwork.begin('変形を画像に焼き込む');
    tx.bakeLayerDeformation(layer.id);
    controller.lastPersistenceHandoff=tx.commit().persistence;
    return 'edit';
  });
},async()=>{
  const artwork=controller.document,head=artwork.head,reference=controller.selectedLayer.id;
  await withClipboardAccess(async()=>{
    if(controller.document!==artwork||artwork.head!==head||controller.selectedLayer.id!==reference)
      throw Error('選んだレイヤーが変わりました。');
    const tx=artwork.begin('変形の上に描くレイヤーを追加');
    const id=tx.addRasterLayerAbove(reference);
    tx.renameLayer(id,'変形の上に描くレイヤー');
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.selectLayer(id);return 'edit';
  });
},async remove=>{
  const artwork=controller.document,head=artwork.head,layer=controller.selectedLayer,saved=layer.deformation;
  if(!saved)throw Error('再編集できる変形を持つレイヤーを選んでください。');
  if(remove&&!await appConfirm('元の絵と後から描いた筆を残して変形を取り除きますか？'))return '';
  const original=artwork.revision(saved.sourceRevision).root.getLayer(saved.sourceLayerId??layer.id);
  const {width,height}=artwork.root;
  const settings=savedTransformSettings(saved),enable=!remove&&saved.enabled===false;
  const linked=!!(saved.linkedMask&&layer.vectorMask?.linked!==false&&original.vectorMask);
  if(linked&&saved.maskDigest&&layer.vectorMask&&await digestLayerMask(layer.vectorMask)!==saved.maskDigest)
    throw Error('変形後にマスクを編集しています。現在のマスクを保つにはリンクを外してください。');
  const mask=linked&&original.vectorMask?(enable?transformLinkedMask(original.vectorMask,settings,width,height):original.vectorMask):null;
  const digest=mask?await digestLayerMask(mask):undefined;
  const before=await originalTransformPixels(artwork,original,saved.sourceRevision);
  const transformed=enable?new Uint8Array(await runTransform({pixels:before,width,height,settings,
    selection:saved.selection?readSelectionMask(saved.selection,width,height):null,outputWidth:width,outputHeight:height})):before;
  const pixels=await replayBrushPasses(saved.postPaint??[],width,height,transformed);
  await withClipboardAccess(async()=>{
    if(controller.document!==artwork||artwork.head!==head||controller.selectedLayer.id!==layer.id)
      throw Error('作品が変更されました。');
    const tx=artwork.begin(remove?'変形のみを取り除く':enable?'変形を有効にする':'変形を無効にする');
    tx.replaceLayerDeformation(layer.id,pixels,remove?null:{...saved,enabled:enable,...(digest?{maskDigest:digest}:{})});
    if(mask)tx.setVectorLayerMask(layer.id,mask);
    controller.lastPersistenceHandoff=tx.commit().persistence;return 'edit';
  });
  return remove?'元の絵に戻して変形を外しました。':enable?'変形を表示しました。':'変形を隠しました。設定と元の絵は保存されています。';
});
async function collectFillMask(mask:LayerMask,width:number,height:number,valid:()=>boolean){
  const alpha=new Uint8Array(width*height);
  for(let y=0;y<height;y+=TILE){
    const tileHeight=Math.min(TILE,height-y);
    for(let x=0;x<width;x+=TILE){
      const tileWidth=Math.min(TILE,width-x);
      const tile=layerMaskTile(mask,(x/TILE)+','+(y/TILE));
      for(let dy=0;dy<tileHeight;dy++){
        const offset=(y+dy)*width+x;
        if(typeof tile==='number')alpha.fill(tile,offset,offset+tileWidth);
        else alpha.set(tile.subarray(dy*TILE,dy*TILE+tileWidth),offset);
      }
    }
    await new Promise<void>(resolve=>setTimeout(resolve,0));
    if(!valid())throw Error('塗る対象が変わりました。');
  }
  return {width,height,alpha};
}
fillPanel=installFillPanel(byId('documentBoxBody'),{
  onContextChanged:updateContextBar,
  drawing:()=>documentReady?surface:null,
  color:()=>hex(foreground.current),
  documentId:()=>controller.document.root.documentId,
  targetName:()=>controller.selectedLayer.name,
  references:()=>controller.layers.filter(layer=>!layer.lineRegions).map(layer=>({id:layer.id,name:layer.name,
    vector:layer.editable?.kind==='path',visible:controller.document.root.isLayerVisible(layer.id)&&layer.opacity>0})),
  regionLayers:()=>controller.layers.flatMap(layer=>layer.lineRegions?[{id:layer.id,name:layer.name,data:layer.lineRegions}]:[]),
  saveRegion:async(data,id)=>{
    const artwork=controller.document,layer=controller.selectedLayer;
    let created=id;
    await withClipboardAccess(async()=>{
      if(controller.document!==artwork||!artwork.hasRevision(data.sourceRevision))throw Error('元の線画が見つかりません。');
      if(id&&(!artwork.root.hasLayer(id)||!artwork.root.getLayer(id).lineRegions))throw Error('更新する線画領域が見つかりません。');
      const tx=artwork.begin(id?'線画領域を更新':'線画領域を作成');
      created=id??tx.addRasterLayerAbove(layer.id);
      tx.setLineRegions(created,data);
      if(created!==id){
        tx.renameLayer(created,'線画領域');
        tx.setLayerVisibility(created,false);
        tx.setLayerLocked(created,true);
      }
      controller.lastPersistenceHandoff=tx.commit().persistence;
      return 'edit';
    });
    return created!;
  },
  capture:async(reference,destination,layerIds,needTarget,stored,previewOnly)=>{
    const artwork=controller.document,head=artwork.head,root=artwork.root,layer=controller.selectedLayer;
    const drawing=surface,selection=c06Selection?.active()??null;
    if(!drawing)throw Error('作品を開いてください。');
    if(needTarget&&destination==='active'&&(layer.baseColor==='white'||layer.editable||layer.deformation||layer.lineRegions||layer.imageLink||layer.blend?.gradientMap||root.isLayerContentLocked(layer.id)))
      throw Error('塗れるレイヤーを選ぶか、新しいレイヤーに塗ってください。');
    if(needTarget&&destination==='under'&&layer.baseColor==='white')throw Error('白い背景より上に塗りレイヤーを作ってください。');
    if(needTarget&&destination!=='active'&&root.groupsForLayer(layer.id).some(group=>group.locked))
      throw Error('新しい彩色レイヤーを置くグループのロックを解除してください。');
    const revision=stored?.sourceRevision??head,referenceRoot=artwork.revision(revision).root;
    const mode=stored?.reference??reference;
    const sourceIds:readonly LayerId[]=stored?.sources??(mode==='active'?[layer.id]:mode==='merged'?[]:layerIds as readonly LayerId[]);
    let target:Uint8Array|null=null;
    const {width,height}=root;
    if(referenceRoot.width!==width||referenceRoot.height!==height)throw Error('保存した領域と現在の作品の大きさが違います。解析を更新してください。');
    if(previewOnly){
      // Frozen rendering reads committed artwork without taking the drawing
      // input barrier. A fill gesture can start while these pixels are prepared.
      if(needTarget&&destination==='active')target=await originalTransformPixels(artwork,layer,head);
    }else await withClipboardAccess(async active=>{
      if(needTarget&&destination==='active')target=(await active.captureDocumentLayers(new Set([layer.id]))).get(layer.id)??null;
      return 'read';
    });
    const source=await readFillReference(artwork,revision,mode,sourceIds);
    if(needTarget&&destination==='active'&&!target)throw Error('塗りつぶしに必要な画像を取得できません。');
    const valid=()=>surface===drawing&&controller.document===artwork&&artwork.head===head&&
      controller.selectedLayer.id===layer.id&&(c06Selection?.active()??null)===selection;
    const targetMask=needTarget&&destination==='active'&&layer.vectorMask?.enabled
      ?await collectFillMask(layer.vectorMask,width,height,valid):null;
    let applied:{revision:RevisionId;id:LayerId}|null=null;
    const canAdjust=()=>!!applied&&surface===drawing&&controller.document===artwork&&artwork.head===applied.revision&&
      controller.selectedLayer.id===applied.id&&!drawing.hasUncommittedInput&&!historyPending&&(c06Selection?.active()??null)===selection;
    return {
      name:mode==='merged'?'見えている絵':sourceIds.map(id=>referenceRoot.getLayer(id).name).join('、'),
      targetName:destination==='active'?layer.name:destination==='under'?'下に新規レイヤー':'上に新規レイヤー',
      key:root.documentId+':'+(mode==='merged'?'merged':(mode==='vector'||mode==='vector-visible'?mode+':':'')+sourceIds.join(',')),
      sourceIds,reference:mode,revision,
      referenceValid:()=>surface===drawing&&controller.document===artwork&&
        (mode==='merged'?(()=>{
          const original=referenceRoot.rootLayerIds.filter(id=>!referenceRoot.getLayer(id).lineRegions);
          const present=artwork.root.rootLayerIds.filter(id=>!artwork.root.getLayer(id).lineRegions);
          return original.length===present.length&&original.every((id,index)=>id===present[index]&&
            referenceRoot.getLayer(id)===artwork.root.getLayer(id)&&referenceRoot.isLayerVisible(id)===artwork.root.isLayerVisible(id));
        })():sourceIds.every(id=>artwork.root.hasLayer(id)&&artwork.root.getLayer(id)===referenceRoot.getLayer(id)))&&
        artwork.root.width===width&&artwork.root.height===height,
      width,height,source,target,selection,targetMask,alphaLocked:destination==='active'&&!!layer.alphaLocked,valid,canAdjust,
      select:mask=>c06Selection?.replaceActive(mask),
      apply:async(pixels,color,hints)=>withClipboardAccess(async()=>{
        if(applied?!canAdjust():!valid())throw Error('作品が変わったため塗りを取り消しました。');
        const tx=applied?artwork.beginAdjustment(applied.revision,'調整した塗りつぶし'):artwork.begin('塗りつぶす');
        const id=destination==='active'?layer.id:tx.addRasterSnapshotAbove(layer.id,pixels,hints?'色指示の彩色':fillLayerName(destination,color),false,true,destination==='under');
        if(destination==='active')tx.replaceLayerRaster(id,pixels);
        if(hints)tx.setLineRegions(hints.id,hints.recipe);
        const receipt=tx.commit();
        controller.lastPersistenceHandoff=receipt.persistence;
        controller.selectLayer(id);applied={revision:receipt.revision.id,id};
        return 'edit';
      })
    };
  }
});
const artworkActions:ArtworkActions={
  context:()=>{
    const drawing=surface,layer=controller.selectedLayer;
    if(!drawing||!documentReady)return null;
    const {width,height}=controller.document.root;
    return {width,height,color:hex(foreground.current),drawing,documentKey:controller.document,
      snapGuidedPath:points=>snapArtworkPathToGuide(points,controller.document.root.artworkGuides,
        guidePreferences,drawing.preferredArtworkGuideId),
      selected:{id:layer.id,name:layer.name,content:layer.editable??null,mask:layer.vectorMask??null},
      selectionMask:()=>{const selection=c06Selection?.active();return selection?selectionAsLayerMask(selection):null;},
      paths:controller.layers.flatMap(item=>item.editable?.kind==='path'?[{id:item.id,name:item.name,content:item.editable}]:[]),
      missingFontCandidates:controller.layers.flatMap(item=>item.editable?.kind==='text'
        ?textFontAssetIds(item.editable).map(assetId=>({name:item.name,assetId})):[])};
  },
  save:async(content,name,editing,initialMask,hideSourcePaths,output='vector',sourceOf,signal)=>{
    const artwork=controller.document,head=artwork.head,drawing=surface,selection=c06Selection?.active();
    if(!drawing||!documentReady)throw Error('作品を開いてください。');
    const {width,height}=artwork.root,reference=controller.selectedLayer.id;
    if(editing&&reference!==editing){
      const result=sourceOf===reference?artwork.root.getLayer(reference).editable:null;
      if(result?.kind!=='path'||!result.booleanOperands?.sourceLayerIds?.includes(editing))
        throw Error('編集するレイヤーを選び直してください。');
    }
    const sources=validatedBooleanSourceVisibility(artwork.root,hideSourcePaths??[],editing);
    const selected=editing?artwork.root.getLayer(editing):null;
    const previous=selected?.editable??null;
    const mask=selected?selected.vectorMask??null:
      initialMask!==undefined?initialMask:selection?selectionAsLayerMask(selection):null;
    if(content.kind==='path'&&previous?.kind==='path'&&previous.originalStrokeLayer)
      content={...content,opacity:previous.opacity??1,originalStrokeLayer:previous.originalStrokeLayer};
    const pixels=await runArtwork({content,width,height,outputWidth:width,outputHeight:height,mask});
    const linked=editing&&content.kind==='path'&&output==='vector'
      ?await linkedBooleanUpdates(artwork.root.rootLayerIds.flatMap(id=>{
        const item=artwork.root.getLayer(id).editable;
        return item?.kind==='path'?[{id,content:item}]:[];
      }),editing,content):[];
    const linkedPixels:Array<{id:LayerId;content:EditablePath;pixels:Uint8ClampedArray<ArrayBuffer>}>=[];
    for(const update of linked){
      const layer=artwork.root.getLayer(update.id);
      linkedPixels.push({...update,pixels:await runArtwork({content:update.content,width,height,
        outputWidth:width,outputHeight:height,mask:layer.vectorMask??null})});
    }
    if(signal?.aborted)throw Error('ベクター描画を取り消しました。');
    await withClipboardAccess(async()=>{
      if(signal?.aborted)throw Error('ベクター描画を取り消しました。');
      if(surface!==drawing||controller.document!==artwork||artwork.head!==head||controller.selectedLayer.id!==reference)
        throw Error('作品が変更されたため中止しました。');
      const tx=artwork.begin(editing?'図形・文字などを編集':'編集できるレイヤーを追加');
      let id:LayerId;
      if(editing&&linkedPixels.length){
        tx.replaceEditableArtworkBatch([{id:editing,pixels,content},...linkedPixels]);id=editing;
      }else id=saveArtworkSnapshot(tx,reference,pixels,content,name,editing,mask,output);
      // Keep the operands for future edits, but show only the boolean result.
      // Source visibility and result creation must share a single Undo step.
      for(const sourceId of sources)tx.setLayerVisibility(sourceId,false);
      controller.lastPersistenceHandoff=tx.commit().persistence;
      controller.selectLayer(sourceOf??id);
      return 'edit';
    });
  },
  remove:async id=>withClipboardAccess(async()=>{
    const artwork=controller.document,root=artwork.root;
    if(controller.selectedLayer.id!==id||root.getLayer(id).editable?.kind!=='path')
      throw Error('消すベクターレイヤーを選び直してください。');
    const tx=artwork.begin('ベクター線をまるごと消す');
    if(!tx.deleteRasterLayers(new Set([id]))){
      tx.cancel();throw Error('削除できるベクターレイヤーがありません。');
    }
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.reconcileSelection(root.rootLayerIds);
    return 'edit';
  }),
  rasterize:async id=>withClipboardAccess(async()=>{
    const artwork=controller.document,layer=artwork.root.getLayer(id);
    if(!layer.editable||artwork.root.isLayerContentLocked(id))throw Error('編集できるロックされていないレイヤーを選んでください。');
    const tx=artwork.begin('レイヤーを描画用に変換');
    tx.setEditableArtwork(id,null);
    controller.lastPersistenceHandoff=tx.commit().persistence;
    return 'edit';
  })
};
strokeCorrection=installStrokeCorrection(byId('documentBoxBody'),{
  latest:()=>surface?.correctionStroke??null,
  size:()=>controller.document.root,
  apply:async(source,path)=>withClipboardAccess(async drawing=>{
    const artwork=controller.document,{width,height}=artwork.root;
    if(drawing.correctionStroke!==source)throw Error('直前の線が変わりました。補正候補を開き直してください。');
    const selection=source.selection?selectionAsLayerMask(source.selection):null;
    const layer=artwork.root.getLayer(source.layer),mask=layer.vectorMask??null;
    const [corrected,original]=await Promise.all([
      runArtwork({content:path,width,height,outputWidth:width,outputHeight:height}),
      replayBrushPasses([{selection,records:[source.record]}],width,height,new Uint8Array(width*height*4))
    ]);
    if(surface!==drawing||controller.document!==artwork||artwork.head!==source.revision)
      throw Error('作品が変わったため中止しました。');
    const tx=artwork.beginAdjustment(source.revision,'手描き線の形状補正');
    const originalId=tx.addRasterSnapshotAbove(source.layer,original,'補正前の手描き線',true);
    const id=tx.addRasterSnapshotAbove(source.layer,corrected,'補正した形状',true);
    tx.setLayerVisibility(originalId,false);
    tx.setEditableArtwork(id,{...path,originalStrokeLayer:originalId});
    if(source.selection){
      const alpha=mask?Uint8Array.from(source.selection.alpha,(value,index)=>
        Math.round(value*layerMaskCoverage(mask,index%width,Math.floor(index/width)))):source.selection.alpha;
      tx.setVectorLayerMask(id,selectionAsLayerMask({width,height,alpha}));
    }
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.selectLayer(id);
    return 'edit';
  }),
  restore:async()=>withClipboardAccess(async()=>{
    const artwork=controller.document,layer=controller.selectedLayer,editable=layer.editable;
    const original=editable?.kind==='path'?editable.originalStrokeLayer as LayerId|undefined:undefined;
    if(!original||!artwork.root.hasLayer(original)||!layer.visible)
      throw Error('表示中の補正した形状レイヤーを選んでください。');
    const tx=artwork.begin('元の手描き線に戻す');
    tx.setLayerVisibility(layer.id,false);
    tx.setLayerVisibility(original,true);
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.selectLayer(original);
    return 'edit';
  })
});
c04Commands.registerProvider(()=>[{
  id:'strokeCorrection',label:'直前の手描き線を補正',category:'描画',aliases:'図形 形状補正',
  availability:()=>surface?.correctionStroke?null:'補正できる手描き線を描いてください。',
  execute:()=>{shellUi.openBox('documentBox');strokeCorrection?.show();}
}]);
installShapeGradientPanel(byId('documentBoxBody'),artworkActions);
function lastRasterFilter(artwork:CoreDocument,id:LayerId){
  const operation=artwork.operationsTo().findLast(op=>
    ['document.crop','document.canvas-resize','document.image-resize'].includes(op.kind)||
    op.targetEntityIds[0]===id&&['layer.snapshot','raster.strict-delta','brush.stroke'].includes(op.kind));
  const source=operation?.sourceRevisionIds.at(-1);
  const value=operation?.parameters.rasterFilter;
  if(!source||!value||typeof value!=='object'||!artwork.hasRevision(source))return null;
  const {version,steps,mask}=value as {version:unknown;steps:unknown;mask:Parameters<typeof validateLayerMask>[0]};
  const recipe=readEffectSteps(steps);
  if(version!==1||!recipe)return null;
  const decoded=mask?validateLayerMask(mask):null;
  if(decoded&&decoded.shape!=='pixels')return null;
  return {source,steps:recipe,mask:decoded};
}
const rasterEffectPanel=installRasterEffects(byId('effectsBoxBody'),{
  capture:async edit=>{
    const artwork=controller.document,head=artwork.head,root=artwork.root,layer=controller.selectedLayer,drawing=surface;
    if(!drawing||!documentReady)throw Error('作品を開いてください。');
    if(layer.baseColor||layer.editable||layer.deformation||layer.lineRegions||layer.imageLink||root.isLayerContentLocked(layer.id))
      throw Error('編集できる、ロックされていない描画レイヤーを選んでください。');
    const saved=edit?lastRasterFilter(artwork,layer.id):null;
    if(edit&&!saved)throw Error('再編集できる効果がありません。効果の後に描いた線がある場合はその編集を戻してください。');
    const {width,height}=root,source=saved?.source??head,original=artwork.revision(source).root;
    if(original.width!==width||original.height!==height||!original.hasLayer(layer.id))throw Error('効果の原本が見つかりません。');
    const currentSelection=c06Selection?.active()??null;
    const mask=saved?(saved.mask?readSelectionMask(saved.mask,width,height):null):currentSelection;
    const valid=()=>artwork===controller.document&&head===artwork.head&&controller.selectedLayer.id===layer.id&&
      surface===drawing&&(edit||(c06Selection?.active()??null)===currentSelection);
    const pixels=await originalTransformPixels(artwork,original.getLayer(layer.id),source);
    if(!valid())throw Error('選んだレイヤーや範囲が変更されました。');
    return {source:pixels,width,height,mask:mask?.alpha??null,alphaLocked:!!layer.alphaLocked,name:layer.name,
      steps:saved?.steps??[],valid,apply:async(result,steps)=>withClipboardAccess(async()=>{
        if(!valid())throw Error('効果の適用先が変わりました。');
        const tx=artwork.begin('レイヤーのフィルター');
        const savedMask=saved?.mask??(mask?selectionAsLayerMask(mask):null);
        tx.replaceLayerRaster(layer.id,result,source,undefined,undefined,{version:1,steps,mask:savedMask});
        controller.lastPersistenceHandoff=tx.commit().persistence;
        return 'edit';
      })};
  },
  bake:async()=>{
    const artwork=controller.document,head=artwork.head,layer=controller.selectedLayer;
    if(!lastRasterFilter(artwork,layer.id))throw Error('設定を保持しているフィルターのレイヤーを選んでください。');
    if(!await appConfirm('現在の効果を画素に固定します。効果の設定を開き直すには、この操作を取り消してください。実行しますか？'))
      throw Error('固定を取り消しました。');
    await withClipboardAccess(async()=>{
      if(artwork!==controller.document||artwork.head!==head||controller.selectedLayer.id!==layer.id)
        throw Error('対象が変わりました。');
      const result=await originalTransformPixels(artwork,layer,head),tx=artwork.begin('効果を画素に固定');
      tx.replaceLayerRaster(layer.id,result);controller.lastPersistenceHandoff=tx.commit().persistence;
      return 'edit';
    });
  }
});
c04Commands.registerProvider(()=>[{
  id:'rasterEffects',label:'レイヤーのフィルターを開く',category:'色',aliases:'ぼかし シャープ ごみ取り ノイズ',
  availability:()=>documentReady?null:'先に作品を開いてください。',
  execute:()=>{shellUi.openBox('effectsBox');rasterEffectPanel.open();}
}]);
const gradientMapPanel=installGradientMapPanel(byId('effectsBoxBody'),{
  storeColors:colors=>foreground.addSwatches(colors.map(color=>fromHex(color)!)),
  capture:async edit=>{
    const artwork=controller.document,revision=artwork.head,root=artwork.root,layer=controller.selectedLayer,drawing=surface;
    if(!drawing||!documentReady)throw Error('作品を開いてください。');
    const map=edit?layer.blend?.gradientMap??null:null;
    if(edit&&!map)throw Error('グラデーションマップのレイヤーを選んでください。');
    if(edit&&root.isLayerContentLocked(layer.id)||!edit&&root.groupsForLayer(layer.id).some(group=>group.locked))
      throw Error('レイヤーまたはグループのロックを解除してください。');
    const {width,height}=root;
    const selection=c06Selection?.active();
    const mask=edit?layer.vectorMask??null:selection?selectionAsLayerMask(selection):null;
    const frozen=captureExport(artwork,undefined,revision);
    const at=frozen.layers.findIndex(item=>item.surfaceId===layer.surface.descriptor.surfaceId);
    const groups=frozen.layers[at]?.isolation??[];
    const layers=frozen.layers.slice(0,at+(edit?0:1))
      .filter(item=>groups.every((id,index)=>id===item.isolation?.[index]))
      .map(item=>item.isolation?{...item,isolation:item.isolation.slice(groups.length)}:item);
    const ids=new Set(layers.map(item=>item.surfaceId));
    await withClipboardAccess(async()=>'read');
    const input=await renderFrozenArtwork({...frozen,layers,
      ...(frozen.basePixels?{basePixels:frozen.basePixels.filter(item=>ids.has(item.surfaceId))}:{}),
      strokes:frozen.strokes.filter(item=>ids.has(item.surfaceId))
    });
    const valid=()=>surface===drawing&&controller.document===artwork&&artwork.head===revision&&controller.selectedLayer.id===layer.id;
    if(!valid())throw Error('作品が変わったため、調整を開き直してください。');
    const scale=Math.min(1,320/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    const sourcePixels=new Uint8ClampedArray(w*h*4),coverage=new Uint8Array(w*h);
    const pixelsAt=(x:number,y:number)=>[Math.floor(x*width/w),Math.floor(y*height/h)] as const;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const [px,py]=pixelsAt(x,y),from=(py*width+px)*4,to=y*w+x;
      sourcePixels.set(input.subarray(from,from+4),to*4);
      coverage[to]=Math.round(255*layerMaskCoverage(mask,px,py)*(edit?layer.opacity:1));
    }
    // Capture the true 1:1 pixels before the full-size render is released.
    // A 128px crop avoids holding another 64MB image while editing a 4K work.
    const exactCrop=extractGradientMapCrop(input,width,height,
      (x,y)=>layerMaskCoverage(mask,x,y)*(edit?layer.opacity:1));
    return {
      map,source:new ImageData(sourcePixels,w,h),coverage,pixelsAt,
      exact:{
        source:new ImageData(exactCrop.rgba,exactCrop.width,exactCrop.height),
        coverage:exactCrop.coverage,x:exactCrop.x,y:exactCrop.y,
        pixelsAt:(x:number,y:number)=>[exactCrop.x+x,exactCrop.y+y] as const
      },
      apply:async gradientMap=>withClipboardAccess(async()=>{
        if(!valid())throw Error('作品が変わったため、調整を開き直してください。');
        const tx=artwork.begin(edit?'グラデーションマップを編集':'グラデーションマップを追加');
        const id=edit?layer.id:tx.addRasterLayerAbove(layer.id);
        const blend=edit?layer.blend!:{mode:'normal' as const,space:'encoded' as const,seed:0};
        const changed=tx.setLayerBlend(id,{...blend,gradientMap});
        if(edit&&!changed)return 'read';
        if(!edit){
          tx.renameLayer(id,'グラデーションマップ');
          if(mask)tx.setVectorLayerMask(id,mask);
        }
        controller.lastPersistenceHandoff=tx.commit().persistence;
        controller.selectLayer(id);
        return 'edit';
      })
    };
  }
});
c04Commands.registerProvider(()=>[{
  id:'gradientMap',label:'グラデーションマップを開く',category:'色',aliases:'色調整 明るさ 階調',
  availability:()=>documentReady?null:'作品を開いてください。',
  execute:()=>{
    shellUi.openBox('effectsBox');
    gradientMapPanel.show(!!controller.selectedLayer.blend?.gradientMap);
  }
}]);

installVectorPanel(byId('documentBoxBody'),artworkActions);
installTextPanel(byId('documentBoxBody'),artworkActions);
const artworkGuideStore:Parameters<typeof installRulerPanel>[2]={
  read:()=>controller.document.root.artworkGuides,
  save:(guides,label)=>withClipboardAccess(async()=>{
    const tx=controller.document.begin(label);
    if(!tx.setArtworkGuides(guides)){tx.cancel();return 'read';}
    controller.lastPersistenceHandoff=tx.commit().persistence;
    return 'edit';
  })
};
rulerPanel=installRulerPanel(byId('documentBoxBody'),artworkActions,artworkGuideStore);
installArtworkPresets(byId('documentBoxBody'),artworkActions,artworkGuideStore);
symmetryPanel=installSymmetryPanel(byId('documentBoxBody'),artworkActions,settings=>{
  if(!documentReady)return;
  symmetrySettings=settings;
  surface?.setSymmetry(settings);
  try{localStorage.setItem('illustro.symmetry.'+controller.document.root.documentId,JSON.stringify(settings));}catch{}
});
symmetryPanel.restore(symmetrySettings);
c06ClipboardUI=installClipboardPanel({
  canEdit:()=>documentReady&&!!surface&&!geometryBusy&&!historyPending&&!documentActivationPending,
  getView:()=>documentReady&&surface?{
    drawing:surface,width:controller.document.root.width,height:controller.document.root.height
  }:null,
  hasSelection:()=>!!surface?.selectedRectangle,
  copy:(merged,selection)=>withClipboardAccess(async drawing=>{
    await c06Clipboard.copy(controller,drawing,{merged,selectionOnly:selection});return 'read';
  }),
  copyGroup:()=>withClipboardAccess(async drawing=>{
    await c06Clipboard.copy(controller,drawing,{merged:false,selectionOnly:false,group:true});return 'read';
  }),
  cut:()=>withClipboardAccess(async drawing=>{
    await c06Clipboard.cut(controller,drawing);return 'edit';
  }),
  paste:placement=>withClipboardAccess(async()=>{
    await c06Clipboard.paste(controller,placement);return 'edit';
  }),
  exportPng:async()=>c06Download(await c06Clipboard.makePng(),'illustro-copy.png'),
  importFile:async(file:File)=>{
    await c06Clipboard.importImage(file,file.name);
    byId('status').textContent='「'+file.name+'」を貼り付け用に読み込みました。';
  },
  readSystem:async()=>{
    const image=await c06Clipboard.readSystemClipboard();
    byId('status').textContent='端末から '+image.width+'×'+image.height+' の画像を読み込みました。';
  },
  writeSystem:()=>c06Clipboard.writeSystemClipboard()
},c06Clipboard);
installImageDropRouting({
  canEdit:()=>documentReady&&!!surface&&!geometryBusy&&!historyPending,
  place:async file=>{
    await c06Clipboard.importImage(file,file.name);
    await withClipboardAccess(async()=>{
      await c06Clipboard.paste(controller,'center');return 'edit';
    });
  },
  reference:async file=>{
    const asset=await addAsset({kind:'reference',name:file.name,data:file});
    await c05References.add(asset.id);
  },
  asset:async file=>{
    await addAsset({kind:'texture',name:file.name,data:file});
    byId('status').textContent='素材庫に「'+file.name+'」を保存しました。';
  }
});

// Review-only performance controls: native disclosure + checkbox, no normal UI changes.
if(perfMode){
 (window as unknown as {__illustroPerformance:unknown}).__illustroPerformance={
  read:()=>({commit:import.meta.env.VITE_COMMIT_SHA,revision:controller.document.head,strokes:controller.committedStrokeCount,historyNavigation:historyNavigation?.diagnostics,historyInputs,...surface?.performanceDiagnostics,checkpointErrors}),
  saveExport:()=>({saveMs:persistence.state.saveDurationMs,snapshotMs:persistence.state.snapshotCaptureMs,
                    exportMs:lastExport?.totalMs,encodeMs:lastExport?.encodeMs}),
  probe:()=>surface?.handoffProbe(),
  isDrawingBusy:()=>surface?.busy??false,
  checkpoint:(fullSeed=false)=>{if(fullSeed)checkpointNeedsFullSeed=true;return createProjectionCheckpoint();},
  capture:async()=>{if(!surface)throw new Error('No document');const before=surface.performanceDiagnostics,delta=await surface.captureProjectionDelta(controller.document.head),after=surface.performanceDiagnostics;return {replace:delta.replace,tiles:delta.tiles.length,bytes:delta.tiles.reduce((n,t)=>n+t.pixels.byteLength,0),before,after};},
  exportCorners:async()=>{
    const doc=controller.document,originalBlocks=doc.canonicalRasterBytes,bitmap=await createImageBitmap((await exportImage(captureExport(doc),'png')).blob);
    const one=document.createElement('canvas');one.width=one.height=1;const ctx=one.getContext('2d')!;
    const read=(x:number,y:number)=>{ctx.clearRect(0,0,1,1);ctx.drawImage(bitmap,x,y,1,1,0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
    try{return {width:bitmap.width,height:bitmap.height,first:read(0,0),last:read(bitmap.width-1,bitmap.height-1),blocksBefore:originalBlocks,blocksAfter:doc.canonicalRasterBytes};}
    finally{bitmap.close();}
  },
  view:(zoom:number,angle:number)=>{surface?.setViewZoom(zoom,false);surface?.setViewRotation(angle,false);},
 };
 const panel=document.createElement('details');panel.id='canvasPerformance';panel.style.cssText='position:fixed;left:80px;bottom:calc(var(--bottom, 56px) + env(safe-area-inset-bottom) + 16px);z-index:80;max-width:min(420px,calc(100vw - 100px));max-height:45vh;overflow:auto;background:#fffaf0;color:#302c26;border:1px solid #decba4;border-radius:12px;padding:8px 12px;font-size:12px';
 panel.innerHTML='<summary>キャンバスの軽さを確認</summary><p>実機確認用の検証版です。性能合格は未判定です。</p><label style="display:block;padding:8px 0"><input id="performanceEnabled" type="checkbox"> 動作の測定を表示する</label><p>数値はGPUへの表示要求を測った目安です。画面そのものの更新や指から光までの時間は未測定です。</p><output id="performanceReadout" style="white-space:pre-wrap"></output><details id="performanceRawDetails"><summary>詳しい動作記録</summary><pre id="performanceRaw"></pre></details><p><a href="../../m09/" target="_blank" rel="noopener">改善前のM09を開く</a> · <a href="../evidence/qa-status.json" target="_blank" rel="noopener">検査結果と未確認事項</a></p>';
 document.body.append(panel);const enabled=byId<HTMLInputElement>('performanceEnabled');
 enabled.onchange=()=>{surface?.setPerformanceEnabled(enabled.checked);byId('performanceReadout').textContent='';};
 window.setInterval(()=>{if(!enabled.checked)return;surface?.setPerformanceEnabled(true);const data=surface?.performanceDiagnostics,metrics=data as Record<string,unknown>|undefined;
  // Enable only on transition; the history window must survive refreshes.
  const value=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1):'未測定';
  byId('performanceReadout').textContent='次の入力まで：'+value(data?.handoff.traces.at(-1)?.readyMs)+' ms\n正式確定まで：'+value(data?.handoff.traces.at(-1)?.logicalMs)+' ms\n処理待ち：'+((data?.handoff.pendingLogical??0)+(data?.handoff.pendingGpu??0))+' 筆\n入力の制限：'+(data?.handoff.rejected??0)+' 回\n表示要求：'+value(metrics?.submissionFps)+' 回/秒\n反映までの目安：'+value(metrics?.inputToPreviewSubmitP95Ms)+' ms\n遅い側の表示間隔：'+value(metrics?.frameIntervalP95Ms)+' ms\n位置・倍率・角度の変換要求：'+value(metrics?.viewTransformP95Ms)+' ms（画面表示時刻ではありません）\nGPU完了待ちの目安：'+value(metrics?.queueCompletionProxyMs)+' ms\n画像の読み出し：'+value(data?.checkpoint.lastMs)+' ms\nUndo / Redoの処理待ち：'+((historyNavigation?.diagnostics.queued??0)+(historyNavigation?.diagnostics.active??0))+' 件\n履歴キャッシュ上限：'+value(Number(metrics?.historyGpuBudgetBytes??0)/1048576)+' MiB\nGPUの処理時間：未測定';
  const preview=metrics?.instantPreview as Record<string,unknown>|undefined,selection=metrics?.previewSelection as Record<string,unknown>|undefined;
  byId('performanceReadout').textContent+='\n描画方式：'+(selection?.route==='gpu'?'GPUで直接表示':selection?.route==='cpu'?'仮線を併用':'測定前')+'\n選んだ理由：'+String(selection?.reason??'未測定')+'\n仮線の計算：'+value(preview?.rasterPixels)+' 画素'+'\n仮線の密度：'+value(preview?.samplesPerDocumentPixel)+' / 作品の1画素'+'\nCPUの最長処理：'+value(preview?.maxSliceMs)+' ms'+'\n方式変更：'+value(selection?.switches)+' 回';
  const receipt=historyInputs.findLast(x=>x.phase==='accepted'&&x.direction==='undo');
  if(receipt){const up=historyInputs.findLast(x=>x.phase==='up'&&x.button===receipt.button&&x.at<=receipt.at),visibility=data?.handoff.historyVisibility.findLast(x=>x.direction==='undo'&&x.at<=receipt.at);byId('performanceReadout').textContent+='\n取り消しの受付まで：'+value(receipt.at-receipt.eventAt)+' ms';if(up&&visibility)byId('performanceReadout').textContent+='\n線の表示を消す指示まで：'+value(visibility.invalidatedAt-up.at)+' ms';}
  if(byId<HTMLDetailsElement>('performanceRawDetails').open)byId('performanceRaw').textContent=JSON.stringify({backend:surface?.backend,...data,historyInputs,historyNavigation:historyNavigation?.diagnostics,checkpointErrors},null,2);
 },500);
}
