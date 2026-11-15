import type {LayerId} from './ids';

export type LayerComp = Readonly<{
  id: LayerId;
  name: string;
  saveVisibility: boolean;
  saveOpacity: boolean;
  layers: readonly Readonly<{id:LayerId;visible?:boolean;opacity?:number}>[];
  groups: readonly Readonly<{id:LayerId;visible:boolean}>[];
}>;
