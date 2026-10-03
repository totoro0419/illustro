import {parentPort} from 'node:worker_threads';
import {registerTestMaterial} from './test-material-provider.mjs';

globalThis.self={postMessage:value=>parentPort.postMessage(value)};
registerTestMaterial();
await import('../../dist/rt/canonical.worker.mjs');
parentPort.on('message',data=>self.onmessage({data}));
