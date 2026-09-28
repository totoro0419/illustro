import type { RevisionId } from './ids';
export class RecoveryState{
  latest:RevisionId|null=null;
  mark(id:RevisionId){if(this.latest===null||id>this.latest)this.latest=id;return this.latest;}
}
