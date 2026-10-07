import type {Preset,Sample as LegacySample,Point as LegacyPoint} from '../../brush/src/types';
import type {FoundationPreset,StrokeContext,CursorState} from './foundation';
export * from './foundation';
export type Sample=LegacySample&{origin?:string;phase?:'release'};
export type Point=LegacyPoint&{pointerType?:string;origin?:string;velocity?:number;direction?:number;distance?:number;elapsed?:number};
export type {Preset};
export type BackendName = 'auto'|'webgpu'|'webgl2';
export type LegacyStrokeRecord = Readonly<{version:2;engine:'illustro-rt-2.4'|'illustro-rt-2.5';smoothing:'local-regression-adaptive-48ms-bounded-2';fast:number;random:'philox4x32-10';seed:readonly [number,number];preset:Preset;raw:readonly Sample[];geometry:readonly Point[];commands:readonly (readonly number[])[]}>;
export type FoundationStrokeRecord=Omit<LegacyStrokeRecord,'version'|'engine'>&{version:3;engine:'illustro-foundation-1';foundation:FoundationPreset;context:StrokeContext;releaseInput?:Sample};
export type StrokeRecord=LegacyStrokeRecord|FoundationStrokeRecord;
export type StrokeDocument = {format:'illustro-rt-document-2';width:number;height:number;strokes:StrokeRecord[]};
export type CompletionProxy = {stage:'gpu-complete-proxy';revision:number;completedAt:number;inputAge:number;latestInputAge:number;tip:Point;previewTip:Point;previewQueueAge:number;oldestQueueAge:number;confirmedLag:number;obsoletePreviewCount:number;formalJobs:number;inFlightSubmissions:1};
export const VERSION:'illustro-rt-2.5';export const TILE:128;export const STRIDE:24;
export class Stabilizer {constructor(preset:Preset,fast?:number);accept(sample:Sample):Point;}
export class CanonicalBuilder {constructor(preset:Preset|FoundationPreset,seed?:[number,number],fast?:number,context?:StrokeContext);raw:Sample[];geometry:Point[];commands:Float64Array[];accept(sample:Sample):void;ready(finish?:boolean):Float64Array[];release(sample:Sample):void;finish():Float64Array[];record():StrokeRecord;}
export class LatestMailbox<T=unknown> {value:(T&{revision:number})|null;revision:number;obsolete:number;set(value:T):void;take():(T&{revision:number})|null;}
export type TileJob = {id:number;key:string;preset:Preset;commands:ArrayLike<number>[];offset:number;commit:boolean;skip?:boolean;t?:number|null};
export class TileDocument {constructor(width:number,height:number);width:number;height:number;jobs:TileJob[];count:number;readonly oldestTime:number;append(id:number,preset:Preset,commands:readonly ArrayLike<number>[]):void;end(id:number,preset:Preset):void;peek():TileJob|null;peekMany(limit?:number):TileJob[];complete(job:TileJob):void;reset():void;}
export type RendererCreateOptions = {webglDesynchronized?:boolean};
export class GpuRenderer {static create(canvas:HTMLCanvasElement,width:number,height:number,backend?:BackendName,options?:RendererCreateOptions):Promise<GpuRenderer>;document:TileDocument;confirmDelay:number;errors:string[];completions:CompletionProxy[];onComplete:((metric:CompletionProxy)=>void)|null;readonly info:Record<string,unknown>;frame(now:number):boolean;drain():Promise<void>;read():Promise<Uint8ClampedArray>;reset():Promise<void>;rebuildTiles(keys:readonly string[],entries:readonly {id:number;preset:Preset|FoundationPreset;commands:readonly ArrayLike<number>[]}[]):Promise<void>;undoCommit(id:number):Promise<boolean>;redoCommit(id:number):Promise<boolean>;dropHistory(ids:readonly number[]):void;destroy():void;}
export class RealtimeSession {constructor(renderer:GpuRenderer,workerUrl?:string|URL);renderer:GpuRenderer;records:StrokeRecord[];redoRecords:StrokeRecord[];active:unknown;prediction:boolean;browserPredictions:number;rawAccepted:number;lastRaw:Sample|null;errors:string[];historyPatchHits:number;historyReplayFallbacks:number;begin(preset:Preset|FoundationPreset,fast?:number,context?:StrokeContext):number;accept(sample:Sample,notify?:boolean):void;predictions(samples:Sample[]):void;flush():void;frame(now:number):boolean;end(release?:Sample|null):Promise<StrokeRecord|null>;cancel():Promise<void>;settle():Promise<void>;rebuild():Promise<void>;undo():Promise<void>;redo():Promise<void>;undoDerived(record:StrokeRecord,keys:readonly string[]):Promise<void>;redoDerived(record:StrokeRecord,keys:readonly string[]):Promise<void>;rollbackLatest(record:StrokeRecord):Promise<void>;discardRedo():void;export():StrokeDocument;load(document:unknown):Promise<void>;cursor(preset:FoundationPreset,sample:Sample,context?:StrokeContext):CursorState;geometry(preset:FoundationPreset,samples:Sample[]):Promise<StrokeRecord|null>;destroy():void;}
export function predict(points:readonly Point[],now:number,browser?:readonly Sample[]):(Point&{predicted:true})|null;
export function validateRecord(record:unknown):StrokeRecord;
export function cpuReference(record:StrokeRecord,width:number,height:number,base?:Uint8ClampedArray):Uint8ClampedArray;
export function continuous(preset:Preset):boolean;
export function liveAccumulation(preset:Preset):boolean;
