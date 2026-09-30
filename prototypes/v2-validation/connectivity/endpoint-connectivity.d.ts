export interface Point { x:number; y:number; width?:number; pressure?:number|null; timestamp?:number|null; t?:number; pointerType?:string; tiltX?:number|null; tiltY?:number|null; twist?:number|null }
export interface Stroke { strokeId:string; points:Point[]; width?:number; cap?:'round'|'butt'|'square'; order?:number; geometryRevision?:string|null; meta?:unknown; pointerType?:string|null }
export interface Endpoint { endpointId:string; strokeId:string; end:'start'|'end'; position:{x:number;y:number}; tangent:{x:number;y:number}; outwardTangent:{x:number;y:number}; capTangent:{x:number;y:number}; width:number; neighborhoodWidth:number; localCurvature:number; localArcLength:number; descriptorQuality:number; trace:Point[]; degenerate:boolean; timestamp:number|null; terminalPressure:number|null }
export interface EndpointTarget { kind:'endpoint'; endpointId:string }
export interface SegmentReference { kind:'segment'; strokeId:string; arcFraction:number }
export interface SegmentTarget extends SegmentReference { segmentIndex:number; t:number; arcLength:number; position:{x:number;y:number}; width:number; tangent:{x:number;y:number}; robustTangent?:{x:number;y:number}; localCurvature?:number; geometryRevision?:string|null }
export type Target=EndpointTarget|SegmentTarget;
export type TruthConnection=[string,string]|{endpointA:string;endpointB:string}|{endpointA:string;target:SegmentReference};
export interface ModelScore {model:'contact'|'continuation'|'corner'|'cap'|'termination';score:number;cost:number;diagnostics:Record<string,unknown>}
export interface Candidate {candidateId:string;endpointA:string;endpointB:string|null;target:Target;effectiveGap:number;normalizedGap:number;confidence:number;confidenceStatus:'uncalibrated-geometry-score';modelScores:ModelScore[];connected:boolean;ambiguous:boolean;decision:'connected'|'disconnected'|'ambiguous';decisionReason:string;competingCandidates:Record<string,unknown[]>;competition:Record<string,unknown>;graphConflicts:unknown[];alternativeExplanations:string[]}
export interface Edge {edgeId:string;from:EndpointTarget;to:Target;candidateId:string;confidence:number;decisionReason:string;model:ModelScore['model']}
export interface ConnectivityGraph {schema:string;algorithmVersion:string;strokes:Stroke[];endpoints:Endpoint[];candidates:Candidate[];edges:Edge[];anchors:(SegmentTarget&{anchorId:string})[];strokeSpans:{kind:'stroke-span';strokeId:string;fromNode:string;toNode:string;startArcFraction:number;endArcFraction:number}[];implementedTargetKinds:('endpoint'|'segment')[];unresolvedTargetKinds:string[]}
export interface ResolverOptions {endpointToSegment?:boolean;inferSegmentGaps?:boolean;connectionThreshold?:number;highConfidenceThreshold?:number;competitionMargin?:number;highConfidenceMargin?:number;junctionContactThreshold?:number;candidateWidthMultiplier?:number;candidateArcMultiplier?:number;localArcFraction?:number;disableSpatialFilter?:boolean;manualConnections?:TruthConnection[];manualDisconnections?:TruthConnection[]}
export interface Metrics {trueConnection:number;falseConnection:number;missedConnection:number;precision:number;recall:number;f1:number;graphExactMatch:boolean;candidateGenerationMisses:number;confidenceCalibration:{status:'uncalibrated';scope:string;brier:number|null;candidateOnlyBrier:number|null;expectedCalibrationError:number|null;bins:{low:number;high:number;count:number;meanConfidence:number|null;observedRate:number|null}[]};modelStats:Record<string,unknown>;conditionStats:Record<string,unknown>;falseConnectionPairs:string[];missedConnectionPairs:string[]}
export declare const CONNECTIVITY_SCHEMA:string;
export declare const CONNECTIVITY_ALGORITHM_VERSION:string;
export declare function normalizeStroke(stroke:Stroke,index?:number):Stroke;
export declare function buildEndpointDescriptors(strokes:Stroke[],options?:ResolverOptions):{strokes:Stroke[];endpoints:Endpoint[]};
export declare function scoreEndpointPair(a:Endpoint,b:Endpoint,options?:ResolverOptions):Omit<Candidate,'ambiguous'|'decision'|'competition'|'graphConflicts'|'alternativeExplanations'>;
export declare function resolveStrokeConnectivity(strokes:Stroke[],options?:ResolverOptions):ConnectivityGraph;
export declare function evaluateConnectivity(graph:ConnectivityGraph,truth:TruthConnection[],options?:{calibrationBins?:number}):Metrics;
export declare function aggregateConnectivityEvaluations(metrics:Metrics[]):Record<string,unknown>;
export declare function projectPointToStroke(stroke:Stroke,point:{x:number;y:number}):(SegmentTarget&{distance:number})|null;
export declare function segmentTargetAtFraction(stroke:Stroke,arcFraction:number):SegmentTarget;
export declare function connectionSet(graph:ConnectivityGraph):Set<string>;
export declare function connectionKey(endpointA:string,target:Target):string;
export declare function targetKey(target:Target):string;
export declare function strokeFromSemanticRecord(record:{reconstructed:Point[];schemaVersion?:number},options:{strokeId:string;widthAtPoint:(point:Point,index:number)=>number;cap?:Stroke['cap'];order?:number}):Stroke;
