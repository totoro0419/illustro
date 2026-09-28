export type OpaqueRoundBrushV1=Readonly<{
  kind:'opaque-round-v1';
  brushId:string;
  brushVersion:number;
  diameterPx:number;
  minPressureDiameterPx:number;
  spacingPx:number;
  color:readonly [number,number,number,255];
}>;

export function createOpaqueRoundBrushV1(input:Readonly<{
  brushId:string;
  brushVersion:number;
  diameterPx:number;
  minPressureDiameterPx?:number;
  spacingPx:number;
  color:readonly [number,number,number,255];
}>):OpaqueRoundBrushV1{
  const brushId=input.brushId.trim();
  if(!brushId)throw new Error('brushId must not be empty');
  if(!Number.isSafeInteger(input.brushVersion)||input.brushVersion<=0)throw new Error('brushVersion must be a positive safe integer');
  if(!Number.isFinite(input.diameterPx)||input.diameterPx<=0)throw new Error('diameterPx must be positive');
  const min=input.minPressureDiameterPx??input.diameterPx;
  if(!Number.isFinite(min)||min<=0||min>input.diameterPx)throw new Error('invalid minPressureDiameterPx');
  if(!Number.isFinite(input.spacingPx)||input.spacingPx<=0)throw new Error('spacingPx must be positive');
  for(const channel of input.color){
    if(!Number.isInteger(channel)||channel<0||channel>255)throw new Error('invalid brush color');
  }
  return Object.freeze({
    kind:'opaque-round-v1',
    brushId,
    brushVersion:input.brushVersion,
    diameterPx:input.diameterPx,
    minPressureDiameterPx:min,
    spacingPx:input.spacingPx,
    color:Object.freeze([...input.color]) as readonly [number,number,number,255],
  });
}

export function diameterForPressure(style:OpaqueRoundBrushV1,pressure:number,pressureValid:boolean):number{
  if(!pressureValid)return style.diameterPx;
  return style.minPressureDiameterPx+(style.diameterPx-style.minPressureDiameterPx)*pressure;
}
