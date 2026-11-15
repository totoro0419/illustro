import type {LayerBlend} from './layerBlend';
import type {LayerId} from './ids';

export type LayerComp = Readonly<{
  id: LayerId;
  name: string;
  saveVisibility: boolean;
  saveOpacity: boolean;
  saveBlend?: boolean;
  layers: readonly Readonly<{id:LayerId;visible?:boolean;opacity?:number;blend?:LayerBlend|null}>[];
  groups: readonly Readonly<{id:LayerId;visible:boolean}>[];
}>;
