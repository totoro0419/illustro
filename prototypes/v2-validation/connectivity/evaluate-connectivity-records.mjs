import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveStrokeConnectivity, evaluateConnectivity, aggregateConnectivityEvaluations, CONNECTIVITY_ALGORITHM_VERSION, connectionKey } from './endpoint-connectivity.js';

// Recompute from stroke geometry and human truth. Exported self-reported scores
// and graph edges are deliberately ignored. Duplicate records never inflate n.
export function evaluateRecords(payloads) {
  const records=payloads.flatMap(p=>Array.isArray(p.records)?p.records:[p]);
  const seen=new Set(),rows=[],excluded=[];
  for(const record of records) {
    const id=record.recordId??JSON.stringify([record.strokes,record.truthConnections]);
    if(seen.has(id)){excluded.push({recordId:id,reason:'duplicate'});continue;}seen.add(id);
    if(!record.session?.truthFinalized){excluded.push({recordId:id,reason:'truth-not-finalized'});continue;}
    if(record.session.reviewedAfterDrawing!==true){excluded.push({recordId:id,reason:'post-drawing-human-review-not-confirmed'});continue;}
    // Explicit annotations from automation remain suitable for UI QA only.
    const untrusted=record.session.inputCounts?.untrusted??null;
    const graph=resolveStrokeConnectivity(record.strokes),metrics=evaluateConnectivity(graph,record.truthConnections);
    rows.push({recordId:id,algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,inputEvidence:{trusted:record.session.inputCounts?.trusted??null,untrusted,automaticPreviewBeforeTruth:record.session.automaticPreviewBeforeTruth??null},metrics,falseConnections:metrics.falseConnectionPairs.map(pair=>({pair,candidate:graph.candidates.find(c=>connectionKey(c.endpointA,c.target)===pair)})),missedConnections:metrics.missedConnectionPairs.map(pair=>({pair,candidate:graph.candidates.find(c=>connectionKey(c.endpointA,c.target)===pair)??null}))});
  }
  const eligible=rows.filter(r=>r.inputEvidence.untrusted===0&&r.inputEvidence.trusted>0);
  return {schema:'illustro.stroke-connectivity-dataset-analysis.v2',algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,generatedAt:new Date().toISOString(),aggregate:aggregateConnectivityEvaluations(rows.map(r=>r.metrics)),trustedInputSubset:aggregateConnectivityEvaluations(eligible.map(r=>r.metrics)),note:'Trusted browser events do not independently prove human input. Human authorship and labels require provenance review; untrusted events are not real-device accuracy evidence.',records:rows,excluded};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const files=process.argv.slice(2);if(!files.length){console.error('Usage: node evaluate-connectivity-records.mjs file.json [file2.json ...]');process.exitCode=2;}
  else console.log(JSON.stringify(evaluateRecords(await Promise.all(files.map(async p=>JSON.parse(await readFile(p,'utf8'))))),null,2));
}
