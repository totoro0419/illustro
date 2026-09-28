import type { LayerId } from '../ids';
import type { CoreDocument } from '../coreDocument';
import type { DocumentTransaction } from '../transaction';
import type { OpaqueRoundBrushV1 } from './style';

export function rasterizeOpaqueRoundDab(
  document:CoreDocument,
  transaction:DocumentTransaction,
  layerId:LayerId,
  style:OpaqueRoundBrushV1,
  centerX:number,
  centerY:number,
  diameter:number,
):void{
  const radius=diameter/2;
  const width=document.root.width,height=document.root.height;
  const minX=Math.max(0,Math.floor(centerX-radius));
  const minY=Math.max(0,Math.floor(centerY-radius));
  const maxX=Math.min(width-1,Math.ceil(centerX+radius)-1);
  const maxY=Math.min(height-1,Math.ceil(centerY+radius)-1);
  if(maxX<minX||maxY<minY)return;

  const tileSize=document.tileSize;
  const tx0=Math.floor(minX/tileSize),ty0=Math.floor(minY/tileSize);
  const tx1=Math.floor(maxX/tileSize),ty1=Math.floor(maxY/tileSize);
  const radiusSquared=radius*radius;
  const [red,green,blue,alpha]=style.color;

  for(let tileY=ty0;tileY<=ty1;tileY++){
    for(let tileX=tx0;tileX<=tx1;tileX++){
      const gx0=Math.max(minX,tileX*tileSize);
      const gy0=Math.max(minY,tileY*tileSize);
      const gx1=Math.min(maxX,(tileX+1)*tileSize-1);
      const gy1=Math.min(maxY,(tileY+1)*tileSize-1);

      transaction.editTile(layerId,tileX,tileY,(bytes)=>{
        for(let gy=gy0;gy<=gy1;gy++){
          const dy=gy+0.5-centerY;
          for(let gx=gx0;gx<=gx1;gx++){
            const dx=gx+0.5-centerX;
            if(dx*dx+dy*dy>radiusSquared)continue;
            const localX=gx-tileX*tileSize,localY=gy-tileY*tileSize;
            const offset=(localY*tileSize+localX)*4;
            bytes[offset]=red;bytes[offset+1]=green;bytes[offset+2]=blue;bytes[offset+3]=alpha;
          }
        }
      });
    }
  }
}
