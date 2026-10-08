export type ProjectionCacheLayerV1=Readonly<{surfaceId:string;pixels:Uint8Array}>;

export type ProjectionCacheV1=Readonly<{
  version:1;
  revisionId:string;
  width:number;
  height:number;
  layers:readonly ProjectionCacheLayerV1[];
}>;
