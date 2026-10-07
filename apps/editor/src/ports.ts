import type {DocumentId,LayerId,OperationKey,PersistenceHandoff,RasterSurfaceId,RevisionId} from '@illustro/core';
import type {StrokeRecord} from '@illustro/brush-rt';
export interface DrawingTarget{documentId:DocumentId;layerId:LayerId;surfaceId:RasterSurfaceId;width:number;height:number;baseRevision:RevisionId}
export interface StrokeCommitResult{revisionId:RevisionId;operationKey:OperationKey;dirtyTileCount:number;persistence:PersistenceHandoff}
export interface DocumentPort{target():DrawingTarget;commitStroke(target:DrawingTarget,record:StrokeRecord):Promise<StrokeCommitResult>}
export interface LayerPort{addRaster():Promise<LayerId>;select(id:LayerId):Promise<void>}
export interface HistoryPort{undo():Promise<void>;redo():Promise<void>}
export interface SavePort{save():Promise<void>;restore():Promise<void>;exportPng():Promise<Blob>}
export interface RecoveryPort{protect():Promise<void>}
export interface EditorPorts{document?:DocumentPort;layers?:LayerPort;history?:HistoryPort;save?:SavePort;recovery?:RecoveryPort}
