/** Review-only boundary contracts. No production implementation or fixed storage schema. */
export type FeatureId = `${string}-${number}`;
export type Key = string;
export interface Identity { id: Key; lifetime: number }
export interface RevisionRef { document: Identity; branch: Key; revision: Key }
export interface TargetRef { document: Identity; target: Identity; component: 'content'|'mask'|'postPaint'|'original'|'structure' }
export interface ColorContract { space: 'sRGB'|'DisplayP3'; depth:'8U'|'16U'|'16F'; alpha:Key; transfer:Key; composition:Key; rounding:Key }
export interface Dependency { resource: Identity; version: Key; region: Key|'all' }
export type Quality = 'preview'|'formal';
export interface IntentEnvelope {
  operation: Key; feature: FeatureId; action: Key; origin:'rail'|'panel'|'context'|'search'|'quick'|'key'|'gesture'|'alternative';
  target: TargetRef; basis:RevisionRef; reads:readonly Dependency[]; writes:readonly Identity[];
  settingsVersion:Key; coordinateContract:Key; color:ColorContract;
}
export type Availability =
  | {kind:'ready'} | {kind:'needs-target'; reason:string; alternatives:readonly Key[]}
  | {kind:'dependency-wait'; operations:readonly Key[]; reason:string}
  | {kind:'session-conflict'; session:Key; target:TargetRef; choices:readonly ['apply','cancel','back']}
  | {kind:'unavailable'; reason:string; scope:'deferred'|'excluded_suite'|'capability'; alternatives:readonly FeatureId[]};
export interface ContextSnapshot { document?:Identity; target?:TargetRef; capabilities:ReadonlySet<Key>; session?:Key; selectionVersion?:Key }
export interface CommandDeclaration {
  feature:FeatureId; action:Key; owner:'view'|'settings'|'document'|'selection'|'assets'|'lifecycle';
  describeAvailability(context:ContextSnapshot):Availability; // Metadata only: no raster evaluation / GPU readback.
}
export type Admission = {accepted:true; operation:Key; order:bigint; transaction:Key; revision:RevisionRef; reservation:Key}
  | {accepted:false; reason:string; retainedInput:boolean; alternatives:readonly Key[]};
export interface Transaction { id:Key; intent:IntentEnvelope; order:bigint; logical:RevisionRef; materialization:'pending'|'partial'|'complete'|'failed' }
export type Consumer = {kind:'current'|'descendant'|'save'|'snapshot'|'recovery'|'recorder'|'clipboard'; id:Key};
export interface EvaluationJob {
  id:Key; transaction:Key; output:RevisionRef; reads:readonly Dependency[]; outputRegion:Key;
  requiredInputRegion:Key|'all'; propagationRegion:Key|'all'; quality:Quality;
  reservation:Key; checkpointContract:Key; consumers:readonly Consumer[]; deviceGeneration:number;
}
export interface FormalResult {
  job:Key; output:RevisionRef; target:TargetRef; dependencies:readonly Dependency[];
  settingsVersion:Key; color:ColorContract; blocks:readonly Key[];
  quality:'formal'; exactRecoveryRoot:Key;
}
export interface PresentationSnapshot {
  generation:Key; visibleRevision:RevisionRef; formalRoot:Key; previewContributions:readonly Key[];
  exclusiveCoverage:Key; viewId:Key; viewPoseVersion:Key; displayColorVersion:Key;
}
export interface SaveFence {
  id:Key; requested:RevisionRef; acceptedOperations:readonly Key[]; reachabilityRoot:Key;
  pendingSessions:readonly Key[]; outputCondition:Key; destination:Identity; destinationGeneration:Key;
}
export type SaveStatus =
  | {kind:'requested'|'evaluating'|'writing'|'checking'; fence:Key}
  | {kind:'verified'; fence:Key; revision:RevisionRef; destinationGeneration:Key; verificationEvidence:Key; newerEdits:boolean}
  | {kind:'failed'; fence:Key; reason:string; previousGoodGeneration?:Key; retry:Key};
export interface StatusSnapshot {
  sequence:bigint; document:Identity; acceptedCount:number; pendingCount:number; oldestPending?:Key;
  visibleRevision:Key; formalRevision?:Key; protectedRevision?:Key; saves:readonly SaveStatus[];
  // Precomputed metadata only; constructing/reading this object must not evaluate pixels.
}
