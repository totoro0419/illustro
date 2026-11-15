"""Audit-artifact consistency only; not a product-quality pass."""
import collections, hashlib, json, re
from pathlib import Path
E=Path(__file__).resolve().parent; ROOT=E.parents[3]; OUT=ROOT/'docs/audits'
def get(p):return json.loads((E/p).read_text())
rows=get('feature-audit.json'); findings=get('findings.json'); baseline=get('target-manifest.json')
formal=json.loads((ROOT/'docs/product-planning/FINAL_PRODUCT_SCOPE.json').read_text())['feature_rows']
expected={x['id']:x for x in formal}; ids=[r['id']for r in rows]; fids={f['id']for f in findings}
checks=[]
def check(name,condition):
 checks.append({'name':name,'passed':bool(condition)})
 if not condition:raise AssertionError(name)
check('247 unique IDs equal formal scope',len(ids)==len(set(ids))==247 and set(ids)==set(expected))
check('30 categories',len({r['category']for r in rows})==30)
check('all names/categories/scope exact',all(all(r[k]==expected[r['id']][k]for k in ['name','category','final_scope'])for r in rows))
check('12 dimensions for each row',all(len(r['dimensions'])==12 for r in rows))
check('all finding links resolve',all(set(r['findings'])<=fids for r in rows))
check('all finding feature links resolve',all(set(f['features'])<=set(ids)for f in findings))
check('severity counts',collections.Counter(f['severity']for f in findings)=={'P1':7,'P2':11,'P3':1})
md=(OUT/'feature-audit-matrix.md').read_text()
check('247 Markdown rows each exactly once',all(len(re.findall(r'^\|\['+re.escape(i)+r' ',md,re.M))==1 for i in ids))
fm=(OUT/'findings.md').read_text()
check('19 finding sections',len(re.findall(r'^## AUD-',fm,re.M))==19)
check('finding headings and severities agree',all('## '+f['id']+' — '+f['severity']+' '+f['title'] in fm for f in findings))
broken=[]
for p in OUT.rglob('*.md'):
 for url in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if '://' in url or url.startswith('#'):continue
  name=url.split('#')[0]
  if name and not (p.parent/name).is_file():broken.append(str(p.relative_to(ROOT))+':'+url)
check('relative Markdown file links exist',not broken)
check('all 184 target files byte-identical',len(baseline['protected_files'])==184 and all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in baseline['protected_files'].items()))
b=get('browser/routes-desktop.json');p=get('browser/routes-phone.json')
check('247 desktop DOM entries',len(b)==len({x['id']for x in b})==247 and all(x['visible']for x in b))
check('30 phone category representatives',len(p)==30 and len({x['id'].split('-')[0]for x in p})==30 and all(x['visible']for x in p))
check('scope-excluded entries have no start',all((x['start']>0)==(expected[x['id']]['final_scope']in ['included','included_limited'])for x in b))
adv={x['id']:x for x in get('adversarial-model-results.json')['checks']}
check('two model counterexamples reproduced',not adv['M01']['contractHolds'] and not adv['M02']['contractHolds'])
check('positive preservation examples retained',adv['M03']['contractHolds'] and adv['M04']['contractHolds'])
check('recorded layer counterexample',get('browser/layer-state.json')['layerUndo']['rows']==4 and get('browser/layer-state.json')['eyeOff']=='false' and get('browser/layer-state.json')['eyeAfter']=='true')
check('recorded session occlusion',get('browser/session-occlusion.json')['covered'])
result={'kind':'audit-artifact-consistency-not-product-acceptance','checks':checks,'count':len(checks),'all_passed':True,'limits':['No product performance or real device acceptance','Counterexamples and unknowns remain documented']}
(E/'verification-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
