import {CoreDocument} from '@illustro/core';
import type {DrawingTarget,EditorPorts} from './ports';
import type {StrokeRecord} from '@illustro/brush-rt';

export class EditorController {
  readonly document:CoreDocument;
  readonly ports:EditorPorts;
  previewStrokeCount=0;
  constructor(width=512,height=384,ports:EditorPorts={}) {
    this.document=new CoreDocument({width,height,tileSize:256,name:'新しい作品'});
    this.ports=ports;
  }
  target():DrawingTarget {
    return {layerId:this.document.defaultRasterLayerId,width:this.document.root.width,
      height:this.document.root.height,baseRevision:this.document.head};
  }
  async finishStroke(target:DrawingTarget,record:StrokeRecord) {
    if(this.ports.document) await this.ports.document.commitStroke(target,record);
    else this.previewStrokeCount++; // Explicit preview only; never mark saved.
  }
}
