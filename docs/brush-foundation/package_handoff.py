"""Export the relevant working source, standalone page and evidence for handoff."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--output', required=True)
p.add_argument('--snapshot-commit', required=True)
p.add_argument('--site-dir')
p.add_argument('--raw-evidence-dir')
args = p.parse_args()
root = Path(__file__).resolve().parents[2]
files = {}
for folder in ('packages/brush', 'packages/brush-rt', 'prototypes/brush-rt',
               'docs/brush', 'docs/brush-rt', 'docs/brush-foundation'):
    for source in sorted((root / folder).rglob('*')):
        if source.is_file() and not any(x in source.parts for x in
                ('node_modules', '.git', '__pycache__')) and source.suffix != '.zip':
            files['illustro/' + source.relative_to(root).as_posix()] = source
workflow = root / '.github/workflows/brush-rt-candidate.yml'
files['illustro/.github/workflows/brush-rt-candidate.yml'] = workflow
if args.site_dir:
    site = Path(args.site_dir)
    for name in ('dist/index.html', 'dist/baseline.html',
                 'dist/source-evidence.json', '.openai/hosting.json', 'README.md'):
        source = site / name
        if not source.is_file():
            raise FileNotFoundError(source)
        files['trial-site/' + name] = source
if args.raw_evidence_dir:
    for source in sorted(Path(args.raw_evidence_dir).glob('*.zip')):
        files['raw-ci-evidence/' + source.name] = source

manifest = {
    'format': 'illustro-foundation-handoff-1',
    'repository': 'totoro0419/illustro',
    'branch': 'brush/foundation-2026-10-03',
    'snapshotCommit': args.snapshot_commit,
    'testedEngineSource': '1f7cc3e1cd6558fdcfba75e8374702ae266d01a8',
    'standaloneGitBlob': 'bab16d11586e5d163a3f774935f0250d7b112589',
    'scope': 'Relevant self-contained working subset, not the complete Git repository/history.',
    'validation': {'nodePass': 65, 'webgl2': {'checks': 220, 'proxyPass': 38,
       'proxyFail': 0}, 'webgpu': {'checks': 220, 'proxyPass': 37, 'proxyFail': 1},
       'targetedWebgpuProxyPass': 3, 'targetedWebgpuProxyFail': 1,
       'physicalVisibleTip': 'UNVERIFIED'},
    'files': {}
}
for name, source in files.items():
    data = source.read_bytes()
    manifest['files'][name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
readme = '''# Illustro Brush Foundation handoff

Read MANIFEST.json and illustro/docs/brush-foundation/HANDOFF_STATE.md first.
This is the relevant working subset. GitHub at snapshotCommit is authoritative
for the entire repository; the tested engine source is separately pinned.
Node 24: cd illustro; node prototypes/brush-rt/build.mjs;
node --test packages/brush-rt/test/*.test.mjs
Standalone page: illustro/prototypes/brush-rt/dist/illustro-brush-rt.html
trial-site contains the exported private trial assets and accepted baseline engine.
raw-ci-evidence contains unmodified downloaded artifacts; retain failed results.
WebGPU has unresolved performance gates. Physical pen/display quality is unverified.
Do not merge the Draft PR or change the private site's audience.
No credentials or Git history are included.
'''
output = Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
def write(z, name, data):
    info = zipfile.ZipInfo(name, (2026, 10, 3, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    z.writestr(info, data)
with zipfile.ZipFile(output, 'w') as z:
    write(z, 'README.md', readme.encode())
    write(z, 'MANIFEST.json', (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode())
    for name, source in files.items():
        write(z, name, source.read_bytes())
print(json.dumps({'path': str(output), 'bytes': output.stat().st_size,
                  'files': len(files), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}))
