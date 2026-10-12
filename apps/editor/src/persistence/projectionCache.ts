export type ProjectionCacheLayerV1=Readonly<{surfaceId:string;pixels:Uint8Array}>;

export type ProjectionCacheV1=Readonly<{
  version:1;
  revisionId:string;
  width:number;
  height:number;
  layers:readonly ProjectionCacheLayerV1[];
}>;

export type ProjectionTileDeltaV2=Readonly<{
  surfaceId:string;
  key:string;
  pixels:Uint8Array;
}>;

export type ProjectionCheckpointDeltaV2=Readonly<{
  version:2;
  revisionId:string;
  width:number;
  height:number;
  tileSize:number;
  surfaceIds:readonly string[];
  tiles:readonly ProjectionTileDeltaV2[];
}>;
