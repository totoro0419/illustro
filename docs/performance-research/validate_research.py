#!/usr/bin/env python3
"""Independent structural/content checks against the frozen product source."""
import ast,hashlib,json,re,subprocess,sys,unicodedata
from collections import Counter
from datetime import datetime,timezone,timedelta
from pathlib import Path
R=Path(__file__).resolve().parent;REPO=R.parents[1];P=R.parent/'product-planning'
checks=[]
def check(name,ok,evidence):checks.append({'name':name,'passed':bool(ok),'evidence':evidence})
def readj(p):return json.loads(p.read_text())
def sh(p):return hashlib.sha256(p.read_bytes()).hexdigest()
source=readj(P/'features.json');src={v['id']:v for v in source};data=readj(R/'problem_map.json');rows={v['feature_id']:v for v in data}
manifest=readj(R/'baseline_manifest.json');base=manifest['base_commit']
check('source_exact_247',len(source)==len(src)==247,len(src))
check('map_bijective_247',len(data)==len(rows)==247 and set(rows)==set(src),{'missing':sorted(set(src)-set(rows)),'extra':sorted(set(rows)-set(src))})
check('all_30_categories',Counter(v['category'] for v in data)==Counter(v['category'] for v in source) and len({v['category'] for v in data})==30,dict(Counter(v['category'] for v in data)))
required=['goal','required_capability','necessary_work','issue','evidence_class','evidence_reason','priority','related_features','research','resource_and_wait_review','unnecessary_work_or_premise_question','discriminating_test','source_section_sha256','spec_parameters','spec_direct_interaction','spec_persistence','spec_constraint','additional_issue_status']
bad=[v['feature_id'] for v in data if any(not v.get(k) for k in required)]
check('substantive_fields_present',not bad,bad)
check('individually_authored_unique_findings',len({v['issue'] for v in data})==247 and len({v['discriminating_test'] for v in data})==247 and min(len(v['issue']) for v in data)>20,{'unique_issues':len({v['issue'] for v in data}),'unique_tests':len({v['discriminating_test'] for v in data})})
check('risk_not_fabricated_product_bug',all(v['evidence_class']=='technical_risk' and not v['confirmed_product_issue'] for v in data),'All feature findings are conditional specification risks, not observed product defects.')
# Parse source sections independently, using explicit anchors instead of generator heading regex.
sec={}
for p in P.glob('features/*.md'):
    text=p.read_text();parts=re.split(r'\n(?=<a id="[a-z0-9]+-\d+">)',text)
    for part in parts:
        m=re.search(r'^## ([A-Z0-9]+-\d+) — [^\n]+',part,re.M)
        if m:
            start=m.start();body=part[start:];sec[m[1]]=hashlib.sha256(body.encode()).hexdigest()
# Generator's section includes trailing newlines before next anchor. split above retains all but one delimiter newline.
# Compare content independently by canonicalizing whitespace, rather than trusting stored hash alone.
source_matches=[];spec_issues=[]
for v in data:
    f=src[v['feature_id']];content=(P/f['spec'].split('#')[0]).read_text()
    anchor='<a id="'+v['feature_id'].lower()+'"></a>'
    part=content.split(anchor,1)[1].split('<a id=',1)[0]
    m=re.search(r'## '+re.escape(v['feature_id'])+r' — [^\n]+\n',part)
    if not m:spec_issues.append(v['feature_id']);continue
    # Generator begins exactly at ## and ends before newline preceding next anchor.
    expected=part[m.start():]
    if expected.endswith('\n'):expected=expected[:-1]
    variants={hashlib.sha256(z.encode()).hexdigest() for z in [expected,expected+'\n']}
    if v['source_section_sha256'] not in variants:spec_issues.append(v['feature_id'])
    if any(v[k]!=f['detail'][j] for k,j in [('spec_parameters','parameters'),('spec_direct_interaction','direct_preview'),('spec_persistence','persistence_undo'),('spec_constraint','failure_quality')]):spec_issues.append(v['feature_id'])
check('all_feature_source_fields_and_section_hashes',not spec_issues,sorted(set(spec_issues)))
unchanged=[]
for rel,h in manifest['source_hashes'].items():
    if sh(REPO/rel)!=h:unchanged.append(rel)
check('baseline_input_hashes_unchanged',not unchanged,unchanged)
# Compare every pre-existing baseline blob, not merely files listed in the manifest.
oldfiles=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=REPO,text=True).splitlines();changed=[]
for fn in oldfiles:
    original=subprocess.check_output(['git','show',base+':'+fn],cwd=REPO)
    current=REPO/fn
    if not current.exists() or current.read_bytes()!=original:changed.append(fn)
check('all_existing_repository_files_unchanged',not changed,{'files_checked':len(oldfiles),'changed':changed})
extra_src=[fn for fn in oldfiles if not fn.endswith(('.md','.json'))]
check('baseline_has_no_product_executable_source',not extra_src,extra_src)
feature_md={}
for p in (R/'features').glob('*.md'):
    for fid in re.findall(r'^## ([A-Z0-9]+-\d+) —',p.read_text(),re.M):feature_md.setdefault(fid,[]).append(p.name)
check('individual_markdown_247',set(feature_md)==set(src) and all(len(v)==1 for v in feature_md.values()) and len(list((R/'features').glob('*.md')))==30,{'sections':len(feature_md)})
roots=readj(R/'root_coverage.json');rids={r['id'] for r in roots};related_invalid=[]
for v in data:
    if not set(v['research'])<=rids or not set(v['related_features'])<=set(src):related_invalid.append(v['feature_id'])
for r in roots:
    if set(r['features'])!={v['feature_id'] for v in data if r['id'] in v['research']}:related_invalid.append(r['id'])
check('bidirectional_feature_root_mapping',not related_invalid,{'relations':sum(len(r['features']) for r in roots),'invalid':related_invalid})
check('all_QR_22',set().union(*(set(r['quality']) for r in roots))==set(range(1,23)),sorted(set().union(*(set(r['quality']) for r in roots))))
check('all_NB_12',set().union(*(set(r['nb']) for r in roots))==set(range(1,13)),sorted(set().union(*(set(r['nb']) for r in roots))))
cross=(R/'REQUIREMENT_CROSSWALK.md').read_text();exp=re.findall(r'^\| EXP-(\d+) \|',cross,re.M)
check('all_EXP_25',len(exp)==25 and set(map(int,exp))==set(range(1,26)),exp)
cards=(R/'USER_RESEARCH_CARDS.md').read_text();check('14_cards_six_fields',len(re.findall(r'^## R\d+ —',cards,re.M))==14 and all(cards.count('**'+s)==14 for s in ['① 対象機能','② 理想の制作体験','③ 現在考えられる問題','④ 一般的な解決方法','⑤ 根本的な問い','⑥ 技術上の制約']),'Each card has all six requested fields.')
check('ideation_open_and_separate','AI_INDEPENDENT_PROPOSALS.md' not in cards and cards.count('ユーザー未回答・自由発案の機会を保持')==14,'Card file does not embed/link solution list; user answers remain open.')
candidates=readj(R/'candidate_decisions.json');ai=(R/'AI_INDEPENDENT_PROPOSALS.md').read_text()
check('42_alternatives_recorded',len(candidates)==42 and len({c['id'] for c in candidates})==42 and len(re.findall(r'^\| [ABC] ',ai,re.M))==42,{'records':len(candidates),'proposal_rows':len(re.findall(r'^\| [ABC] ',ai,re.M))})
check('no_formal_adoption_or_device_pass',all(not c['formal_adoption'] and c['state']=='verification_pending' and set(c['measurements'].values())=={'not_executed_on_product_or_device'} for c in candidates),'All 42 candidates are explicitly pending, all required metric dimensions unmeasured on product/device.')
source_text=(R/'SOURCES.md').read_text();sids=set(re.findall(r'^\| (S\d+) \|',source_text,re.M));used=set().union(*(set(r['sources']) for r in roots))
check('primary_source_ids_resolve',used<=sids and len(sids)==21,{'ids':sorted(sids),'missing':sorted(used-sids)})
# Relative file links and explicit/standard heading fragments.
def slug(s):
    s=re.sub(r'<[^>]*>','',s);s=s.strip().lower();s=re.sub(r'[^\w\-\s]','',s,flags=re.U);return s.replace(' ','-')
def anchors(p):
    t=p.read_text();return set(re.findall(r'<a id="([^"]+)"',t))|{slug(m) for m in re.findall(r'^#{1,6} (.+)$',t,re.M)}
links=0;broken=[]
for p in R.rglob('*.md'):
    for link in re.findall(r'\]\(([^)]+)\)',p.read_text()):
        if '://' in link or link.startswith('mailto:'):continue
        links+=1;file,sep,fragment=link.partition('#');target=(p.parent/file).resolve() if file else p
        if not target.exists():broken.append([str(p.relative_to(R)),link,'missing file'])
        elif fragment and target.suffix=='.md' and fragment not in anchors(target):broken.append([str(p.relative_to(R)),link,'missing anchor'])
check('relative_links_and_anchors',not broken,{'links':links,'broken':broken[:50]})
# Experiments did run: source hashes and discriminating observed assertions, not just saved status.
results=readj(R/'experiments/results.json');storage=readj(R/'experiments/storage_results.json')
check('experiment_source_hashes',results['source_sha256']==sh(R/'experiments/run_models.py') and storage['source_sha256']==sh(R/'experiments/storage_fault_model.py'),'Recorded scripts match actual files.')
e=results['experiments'];check('model_evidence_values',e['E01']['safe_schedules']==1000 and e['E01']['naive_completion_order_failures']>0 and e['E03']['changed_outside_radius4']>0 and e['E04']['safe_max_abs_error']==0 and e['E04']['cropped_without_halo_max_abs_error']>0 and e['E06']['matches'],{'E01':e['E01'],'E03':e['E03'],'E04':e['E04']})
check('storage_fault_evidence',len(storage['cases'])==7 and all(c['old_data_unchanged'] for c in storage['cases']) and sum(c['recovered_generation']==1 for c in storage['cases'])==1,storage['cases'])
syntax=[]
for p in R.rglob('*.py'):
    try:ast.parse(p.read_text())
    except SyntaxError as ex:syntax.append([p.name,str(ex)])
check('research_python_syntax',not syntax,syntax)
# Read every JSON, no invalid UTF-8 or JSON silently ignored.
jsonbad=[]
for p in R.rglob('*.json'):
    try:readj(p)
    except Exception as ex:jsonbad.append([p.name,str(ex)])
check('all_json_parse',not jsonbad,jsonbad)
tracked_changed=subprocess.check_output(['git','diff','--name-only',base],cwd=REPO,text=True).splitlines()
check('diff_scope_research_only',all(x.startswith('docs/performance-research/') for x in tracked_changed),tracked_changed)
for fn in ['FEATURE_PROBLEM_MAP.md','ROOT_PROBLEMS.md','USER_RESEARCH_CARDS.md','AI_INDEPENDENT_PROPOSALS.md','SOURCES.md','COMPETITIVE_COMPARISON.md','VALIDATION_PLAN.md','DECISIONS.md','CANDIDATE_DESIGN.md','ROADMAP.md']:
    check('deliverable_'+fn,(R/fn).exists() and len((R/fn).read_text())>800,{'bytes':(R/fn).stat().st_size})
fail=[c['name'] for c in checks if not c['passed']]
result={'checked_at_jst':datetime.now(timezone(timedelta(hours=9))).isoformat(),'base_commit':base,
        'check_count':len(checks),'checks':checks,'failed_checks':fail,
        'scope':'Structural/source/consistency/model-evidence audit by same author; not independent reviewer or product acceptance.',
        'artifact_sha256':{str(p.relative_to(R)):sh(p) for p in sorted(R.rglob('*')) if p.is_file() and p.name!='validation_results.json' and '__pycache__' not in str(p)}}
(R/'validation_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'check_count':len(checks),'failed_checks':fail,'links':links,'issues':broken[:10]},ensure_ascii=False,indent=2));sys.exit(bool(fail))
