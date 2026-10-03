import type {Preset,Sample,Point} from '../../brush/src/types';
export type {Preset,Sample,Point};
export type BackendName = 'auto'|'webgpu'|'webgl2';
export type StrokeRecord = Readonly<{version:2;engine:'illustro-rt-2.4';smoothing:'local-regression-adaptive-48ms-bounded-2';fast:number;random:'philox4x32-10';seed:readonly [number,number];preset:Preset;raw:readonly Sample[];geometry:readonly Point[];commands:readonly (readonly number[])[]}>;
export type StrokeDocument = {format:'illustro-rt-document-2';width:number;height:number;strokes:StrokeRecord[]};
export type CompletionProxy = {stage:'gpu-complete-proxy';revision:number;completedAt:number;inputAge:number;latestInputAge:number;tip:Point;previewTip:Point;previewQueueAge:number;oldestQueueAge:number;confirmedLag:number;obsoletePreviewCount:number;formalJobs:number;inFlightSubmissions:1};
export const VERSION:'illustro-rt-2.4';export const TILE:128;export const STRIDE:24;
export class Stabilizer {constructor(preset:Preset,fast?:number);accept(sample:Sample):Point;}
export class CanonicalBuilder {constructor(preset:Preset,seed?:[number,number],fast?:number);raw:Sample[];geometry:Point[];commands:Float64Array[];accept(sample:Sample):void;ready(finish?:boolean):Float64Array[];finish():Float64Array[];record():StrokeRecord;}
export class LatestMailbox<T=unknown> {value:(T&{revision:number})|null;revision:number;obsolete:number;set(value:T):void;take():(T&{revision:number})|null;}
export type TileJob = {id:number;key:string;preset:Preset;commands:ArrayLike<number>[];offset:number;commit:boolean;skip?:boolean;t?:number|null};
export class TileDocument {constructor(width:number,height:number);width:number;height:number;jobs:TileJob[];count:number;readonly oldestTime:number;append(id:number,preset:Preset,commands:readonly ArrayLike<number>[]):void;end(id:number,preset:Preset):void;peek():TileJob|null;peekMany(limit?:number):TileJob[];complete(job:TileJob):void;reset():void;}
export class GpuRenderer {static create(canvas:HTMLCanvasElement,width:number,height:number,backend?:BackendName):Promise<GpuRenderer>;document:TileDocument;confirmDelay:number;errors:string[];completions:CompletionProxy[];onComplete:((metric:CompletionProxy)=>void)|null;readonly info:Record<string,unknown>;frame(now:number):boolean;drain():Promise<void>;read():Promise<Uint8ClampedArray>;reset():Promise<void>;destroy():void;}
export class RealtimeSession {constructor(renderer:GpuRenderer,workerUrl?:string|URL);renderer:GpuRenderer;records:StrokeRecord[];redoRecords:StrokeRecord[];active:unknown;prediction:boolean;browserPredictions:number;rawAccepted:number;lastRaw:Sample|null;errors:string[];begin(preset:Preset,fast?:number):number;accept(sample:Sample):void;predictions(samples:Sample[]):void;flush():void;frame(now:number):boolean;end():Promise<StrokeRecord|null>;cancel():Promise<void>;settle():Promise<void>;rebuild():Promise<void>;undo():Promise<void>;redo():Promise<void>;export():StrokeDocument;load(document:unknown):Promise<void>;destroy():void;}
export function predict(points:readonly Point[],now:number,browser?:readonly Sample[]):(Point&{predicted:true})|null;
export function validateRecord(record:unknown):StrokeRecord;
export function cpuReference(record:StrokeRecord,width:number,height:number,base?:Uint8ClampedArray):Uint8ClampedArray;
export function continuous(preset:Preset):boolean;
export function liveAccumulation(preset:Preset):boolean;
