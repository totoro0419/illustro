#!/usr/bin/env python3
"""Local filesystem failure injection, not power-loss or browser durability proof."""
import hashlib,json,os,tempfile
from pathlib import Path

def raw(v):return json.dumps(v,sort_keys=True,separators=(',',':')).encode()
def h(b):return hashlib.sha256(b).hexdigest()
def durable_write(p,b):
    with p.open('wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
def valid(root,p):
    try:
        m=json.loads(p.read_bytes());objects=[]
        for e in m['objects']:
            b=(root/e['name']).read_bytes()
            if h(b)!=e['sha256']:return None
            objects.append(json.loads(b))
        return m['generation'],objects
    except (OSError,ValueError,KeyError,TypeError):return None

def recover(root):
    candidates=[valid(root,p) for p in root.glob('manifest.*.json')]
    candidates=[v for v in candidates if v]
    return max(candidates,key=lambda v:v[0]) if candidates else None

def main():
    # Fault after each stage. Files are local temporary artifacts only.
    reports=[]
    for fault in ['before_data','truncated_data','after_data','truncated_manifest','after_manifest_temp','after_publish','corrupt_published_data']:
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);old={'pixels':[1,2,3],'layer':'A','selection':[0,1,0]}
            new={'pixels':[3,2,1],'layer':'A','selection':[1,1,0]}
            ob=raw(old);nb=raw(new)
            durable_write(root/'object0',ob)
            durable_write(root/'manifest.0.json',raw({'generation':0,'objects':[{'name':'object0','sha256':h(ob)}]}))
            if fault!='before_data':durable_write(root/'object1',nb[:7] if fault=='truncated_data' else nb)
            if fault not in ['before_data','truncated_data','after_data']:
                mb=raw({'generation':1,'objects':[{'name':'object1','sha256':h(nb)}]})
                durable_write(root/'manifest.tmp',mb[:12] if fault=='truncated_manifest' else mb)
            if fault in ['after_publish','corrupt_published_data']:
                os.replace(root/'manifest.tmp',root/'manifest.1.json')
            if fault=='corrupt_published_data':durable_write(root/'object1',b'corrupt')
            got=recover(root)
            expected=(1,[new]) if fault=='after_publish' else (0,[old])
            assert got==expected,(fault,got)
            assert (root/'object0').read_bytes()==ob
            reports.append({'fault':fault,'recovered_generation':got[0],'old_data_unchanged':True})
    result={'kind':'local_filesystem_functional_failure_injection','cases':reports,'assertions_passed':True,
      'source_sha256':h(Path(__file__).read_bytes()),
      'limits':['No real power failure, process kill, directory fsync or disk-controller ordering tested',
                'No multi-process external conflict, quota or browser storage tested',
                'A hash detects corruption, not whether the document graph is semantically complete',
                'Recovery result in this scratch filesystem is not a product protection guarantee']}
    Path(__file__).with_name('storage_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
