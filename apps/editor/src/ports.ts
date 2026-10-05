import type {LayerId} from '@illustro/core';
import type {StrokeRecord} from '@illustro/brush-rt';

// The source core is provisional V1. This is NOT a native file schema.
export interface DrawingTarget {layerId:LayerId; width:number; height:number; baseRevision:number}
export interface DocumentPort {
  target():DrawingTarget;
  // Production implementation validates target revision and atomically commits
  // semantic stroke + strict dirty Raster together, or rejects both.
  commitStroke(target:DrawingTarget,record:StrokeRecord):Promise<void>;
}
export interface LayerPort {addRaster():Promise<LayerId>;select(id:LayerId):Promise<void>}
export interface HistoryPort {undo():Promise<void>;redo():Promise<void>}
export interface SavePort {save():Promise<void>;restore():Promise<void>;exportPng():Promise<Blob>}
export interface RecoveryPort {protect():Promise<void>}
export interface EditorPorts {
  document?:DocumentPort;layers?:LayerPort;history?:HistoryPort;save?:SavePort;recovery?:RecoveryPort;
}
