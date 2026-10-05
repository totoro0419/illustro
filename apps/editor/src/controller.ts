import {CoreDocument} from '@illustro/core';
import type {DrawingTarget,EditorPorts,StrokeCommitResult} from './ports';
import type {StrokeRecord} from '@illustro/brush-rt';
import {CoreStrokeDocumentPort} from './strokeCommit';
export class EditorController{
  readonly document:CoreDocument;readonly ports:EditorPorts;committedStrokeCount=0;lastCommit:StrokeCommitResult|null=null;
  constructor(width=512,height=384,ports:EditorPorts={}){this.document=new CoreDocument({width,height,name:'新しい作品'});this.ports={...ports,document:ports.document??new CoreStrokeDocumentPort(this.document)};}
  target():DrawingTarget{const port=this.ports.document;if(!port)throw new Error('Document connection unavailable');return port.target();}
  async finishStroke(target:DrawingTarget,record:StrokeRecord){const port=this.ports.document;if(!port)throw new Error('Document connection unavailable');const result=await port.commitStroke(target,record);this.committedStrokeCount++;this.lastCommit=result;return result;}
}
