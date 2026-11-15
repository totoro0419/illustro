#!/usr/bin/env python3
"""Static documentation audit only; does not run product, model, or benchmark code."""
import hashlib
import itertools
import json
import re
import subprocess
import sys
import unicodedata
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import unquote

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BASE = '26423662192ed05b1d1c535cd15091f17d52d0bd'
PRODUCT = '92daaf5ac23a015a834141f7d08275d903711404'
checks = []

def check(name, condition, evidence):
    checks.append({'name': name, 'passed': bool(condition), 'evidence': evidence})

def git_bytes(ref, path):
    return subprocess.check_output(['git', 'show', f'{ref}:{path}'], cwd=REPO)

def digest(b):
    return hashlib.sha256(b).hexdigest()

def readj(p):
    return json.loads(p.read_text())

def slug(s):
    s = re.sub(r'<[^>]+>', '', s).strip().lower()
    return ''.join(c for c in s if c.isspace() or c in '-_' or unicodedata.category(c)[0] in 'LN').replace(' ', '-')

def anchors(p):
    s = p.read_text()
    result = set(re.findall(r'<a\s+id="([^"]+)"', s))
    used = Counter()
    for h in re.findall(r'^#{1,6}\s+(.+?)\s*#*$', s, re.M):
        h = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', h)
        a = slug(h)
        n = used[a]
        used[a] += 1
        result.add(a + (f'-{n}' if n else ''))
    return result

src = readj(REPO/'docs/product-planning/features.json')
frozen = json.loads(git_bytes(PRODUCT, 'docs/product-planning/features.json'))
original_problem = readj(HERE/'problem_map.json')
problem = {f['feature_id']: f for f in original_problem}
payload = readj(HERE/'feature_integration.json')
data = payload['features']
rows = {f['feature_id']: f for f in data}
source = {f['id']: f for f in src}
check('source_matches_pr1_ledger', src == frozen, {'product_commit': PRODUCT})
check('247_unique_source_and_map', len(src) == len(source) == len(data) == len(rows) == 247, {'source': len(src), 'map': len(data), 'unique': len(rows)})
check('exact_id_bijection', set(rows) == set(source), {'missing': sorted(set(source)-set(rows)), 'extra': sorted(set(rows)-set(source))})
check('30_category_counts_match', Counter(f['category'] for f in src) == Counter(f['category'] for f in data) and len({f['category'] for f in data}) == 30, dict(Counter(f['category'] for f in data)))

bad = []
spec_bad = []
required = ['goal', 'source_spec', 'source_policy', 'research', 'dependencies', 'data', 'lifecycle', 'response_constraint', 'integration_judgment', 'design_principles', 'original_specific_issue', 'conflict_review', 'open_decisions', 'non_r_specific_requirement']
for i, f in rows.items():
    s = source[i]
    if any(not f.get(k) for k in required):
        bad.append([i, 'missing field'])
    if (f['name'], f['category'], f['goal'], f['source_policy']) != (s['name'], s['category'], s['purpose'], s['policy']):
        bad.append([i, 'source identity/policy mismatch'])
    if f['data']['canonical_feature_contract'] != s['detail']['persistence_undo'] or f['response_constraint'] != s['detail']['failure_quality']:
        bad.append([i, 'persistence or quality mismatch'])
    if f['source_json_sha256'] != digest(json.dumps(s, ensure_ascii=False, sort_keys=True).encode()):
        bad.append([i, 'source hash mismatch'])
    spec_path, anchor = s['spec'].split('#')
    spec_text = (REPO/'docs/product-planning'/spec_path).read_text()
    sections = re.split(r'<a id="([^"]+)"></a>\s*', spec_text)
    section_map = {sections[n]: sections[n+1] for n in range(1, len(sections), 2)}
    section = section_map.get(anchor, '')
    for exact in [s['id'], s['name'], s['purpose'], s['capability'], s['detail']['parameters'], s['detail']['direct_preview'], s['detail']['persistence_undo'], s['detail']['failure_quality']]:
        if exact not in section:
            spec_bad.append([i, exact[:70]])
check('all_nine_required_dimensions_and_source_values', not bad, bad)
check('all_247_original_md_sections_read_and_crosschecked', not spec_bad, spec_bad)
check('247_distinct_integration_judgments', len({f['integration_judgment'] for f in data}) == 247, {'unique': len({f['integration_judgment'] for f in data})})
check('lifecycle_and_data_fields_explicit', all(all(f['lifecycle'].get(k) for k in ['start', 'update', 'stop', 'failure']) and all(f['data'].get(k) for k in ['canonical', 'regenerable', 'disposal']) for f in data), 'Every feature has start/update/stop and canonical/derived/disposal contracts')

rs = payload['research_directions']
rmap = {r['id']: r for r in rs}
expected_r = {f'R{i:02}' for i in range(1, 15)}
check('all_14_directions_and_exact_source_hashes', len(rs) == 14 and set(rmap) == expected_r and all(digest((HERE/r['source']).read_bytes()) == r['source_sha256'] for r in rs), {r['id']: r['state'] for r in rs})
check('R10_R11_not_promoted', all('unconfirmed' in rmap[r]['state'] for r in ['R10', 'R11']) and all(x['state'] == rmap[x['id']]['state'] for f in data for x in f['research']), 'Each feature uses the same unconfirmed/recommended state for R10/R11')
check('no_individual_feature_adoption_inferred', all(f['source_approval'] == 'individual_feature_adoption_not_inferred' and f['status'] == 'basic_design_mapped_not_implemented_or_benchmarked' for f in data), 'Source policy retained; no implementation or benchmark status')
old_links = {(f['feature_id'], r) for f in original_problem for r in f['research']}
new_links = {(f['feature_id'], r['id']) for f in data for r in f['research']}
added = [(f['feature_id'], r) for f in data for r in f['research'] if r['relation'] == 'integration_added']
check('625_original_research_links_retained', len(old_links) == 625 and old_links <= new_links, {'original': len(old_links), 'current': len(new_links)})
check('additional_links_explained_and_ids_valid', all(r['reason'] for _, r in added) and all(r['id'] in expected_r for f in data for r in f['research']), {'additional': len(added)})
check('dependency_ids_valid_and_related_not_promoted', all(all(x['id'] in source and x['id'] != f['feature_id'] and x['when'] for x in f['dependencies']['features']) and f['dependencies']['original_relations_are_execution_dependencies'] is False for f in data), 'Conditional feature/schema relationships; original related list stays separate')

wet = {f['feature_id'] for f in data if any(c.get('decision') == 'D05' for c in f['conflict_review']['items'])}
check('watercolor_conflict_explicit_not_deleted', wet == {'WET-002', 'WET-003', 'WET-004', 'WET-005'} and all(rows[f'WET-{i:03}']['source_policy'] == source[f'WET-{i:03}']['policy'] for i in range(1, 8)), sorted(wet))
check('feature_specific_non_R_quality_retained', all(f['non_r_specific_requirement'] == source[f['feature_id']]['detail']['failure_quality'] and f['original_specific_issue']['issue'] == problem[f['feature_id']]['issue'] for f in data), 'All unique source constraints and original risks retained')

md = (HERE/'FEATURE_INTEGRATION_MAP.md').read_text()
md_ids = re.findall(r'^### ([A-Z0-9]+-\d{3}) — (.+)$', md, re.M)
check('markdown_247_ids_and_names', len(md_ids) == 247 and Counter(i for i, _ in md_ids) == Counter(source.keys()) and all(source[i]['name'] == name for i, name in md_ids), {'sections': len(md_ids)})
md_sections = re.split(r'^### ([A-Z0-9]+-\d{3}) — [^\n]+\n', md, flags=re.M)
md_rows = {md_sections[n]: md_sections[n+1] for n in range(1, len(md_sections), 2)}
check('markdown_each_row_has_all_dimensions', all(all(k in md_rows[i] for k in ['目的/原典', '研究/依存', '設計反映', '正本/派生', '起動/更新/停止', '固有制約', '矛盾/未決']) and f['integration_judgment'] in md_rows[i] and f['lifecycle']['stop'] in md_rows[i] for i, f in rows.items()), 'All 247 human-readable rows include lifecycle stop and individual integration judgment')

pairs = readj(HERE/'integration_pairs.json')
check('all_91_pairs_once', len(pairs) == 91 and Counter(tuple(x['research']) for x in pairs) == Counter(itertools.combinations(sorted(expected_r), 2)), {'pairs': len(pairs)})
audit = (HERE/'INTEGRATION_AUDIT.md').read_text()
design = (HERE/'UNIFIED_SYSTEM_DESIGN.md').read_text()
opens = (HERE/'OPEN_DECISIONS.md').read_text()
check('22_findings_and_residual_risks', all(f'IA{i:02}' in audit for i in range(1, 23)) and all(x in audit for x in ['原因', '比較', 'リスク', '三者以上', '旧Illustro']), 'IA01-22 with comparison/residual column and six multi-system scenarios')
u_ids = set(re.findall(r'^## (U\d{2}) ', design, re.M))
check('12_system_sections_and_feature_references', u_ids == {f'U{i:02}' for i in range(1, 13)} and all(set(f['design_principles']) <= u_ids for f in data) and all(set(p['design_principles']) <= u_ids for p in pairs), sorted(u_ids))
d_ids = set(re.findall(r'\| (D\d{2}) \|', opens))
check('18_open_decisions_and_feature_references', d_ids == {f'D{i:02}' for i in range(1, 19)} and all(set(f['open_decisions']) <= d_ids for f in data), sorted(d_ids))
check('four_approval_topics_separate_from_evidence', all(re.search(r'\| '+d+r' \|', opens) for d in ['D01','D02','D03','D05']) and '高度水彩を作り込まない方向自体は承認済み' in opens, 'D01/D02/D03/D05 recorded without re-opening already approved high-level policy')
check('critical_cross_flow_contracts_present', all(x in design for x in ['A未完 → Save S → Undo A', 'Aの全タイル', '消しゴム', '同じPresentation世代', '循環待ち', 'Device loss', '一意に戻せない', '未読込は透明/空白と区別']), 'Save-after-Undo, strict FIFO, erase/Mask preview, atomic presentation, budget deadlock, device loss, inverse ambiguity, staged I/O')

# Freeze all product and individually accepted research sources; preserve historical bodies.
tracked_base = subprocess.check_output(['git','ls-tree','-r','--name-only',BASE], cwd=REPO, text=True).splitlines()
product_paths = [x for x in tracked_base if x.startswith('docs/product-planning/') or x in ['README.md','docs/PRODUCT_VISION.md','docs/DEVELOPMENT_PROCESS.md']]
protected = product_paths + ['docs/performance-research/'+r['source'] for r in rs]
protected += [x for x in tracked_base if x.startswith('docs/performance-research/') and (x.endswith('.json') or x.endswith('.py') or x.startswith('docs/performance-research/experiments/'))]
historical = ['DECISIONS.md','CANDIDATE_DESIGN.md','USER_RESEARCH_CARDS.md','AI_INDEPENDENT_PROPOSALS.md','ROOT_PROBLEMS.md','FEATURE_PROBLEM_MAP.md','VALIDATION_PLAN.md','ROADMAP.md','REQUIREMENT_CROSSWALK.md','AUDIT.md','README.md']
protected += [x for x in tracked_base if x.startswith('docs/performance-research/') and x.removeprefix('docs/performance-research/') not in historical]
protected = sorted(set(protected))
changed_protected = [x for x in protected if (REPO/x).read_bytes() != git_bytes(BASE,x)]
check('all_protected_sources_byte_identical', not changed_protected, {'protected_files': len(protected), 'changed': changed_protected})
check('historical_bodies_preserved_and_current_entry_added', all((HERE/x).read_bytes().endswith(git_bytes(BASE,'docs/performance-research/'+x)) and 'INTEGRATION_AUDIT.md' in (HERE/x).read_text().split('\n\n')[0] for x in historical[:-1]) and (HERE/'README.md').read_bytes().endswith(git_bytes(BASE,'docs/performance-research/README.md')), 'Only current-reading prefixes added, no historical body removed')
changed = set(subprocess.check_output(['git','diff','--name-only',BASE],cwd=REPO,text=True).splitlines())
untracked = set(subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=REPO,text=True).splitlines())
check('documentation_only_scope', all(p.startswith('docs/performance-research/') for p in changed | untracked) and all(not p.endswith('.py') or p.endswith('/validate_integration.py') for p in changed), sorted(changed | untracked))

broken = []
link_count = 0
scan_docs = sorted(HERE.rglob('*.md'))
for p in scan_docs:
    s = p.read_text()
    for target in re.findall(r'\[[^\]]*\]\(([^\s)]+)\)', s):
        if re.match(r'^[a-z]+:', target):
            continue
        link_count += 1
        path, _, anchor = unquote(target).partition('#')
        dest = (p.parent/path).resolve() if path else p
        if not dest.is_file() or (anchor and dest.suffix == '.md' and anchor not in anchors(dest)):
            broken.append([str(p.relative_to(REPO)), target])
check('all_research_relative_links_and_anchors', not broken, {'checked': link_count, 'broken': broken})
json_bad = []
for p in HERE.rglob('*.json'):
    try:
        readj(p)
    except Exception as exc:
        json_bad.append([str(p), str(exc)])
check('all_research_json_parse', not json_bad, json_bad)
diff = subprocess.run(['git','diff','--check',BASE],cwd=REPO,capture_output=True,text=True)
check('git_diff_whitespace', diff.returncode == 0, diff.stdout+diff.stderr)
review = (HERE/'INTEGRATION_FINAL_REVIEW.md').read_text()
check('completion_limits_and_review_evidence_explicit', all(x in review for x in ['最終確定済みとは判定しない','別担当の独立承認ではない','実装/試作/性能実測は実施していない','D02','D05']), 'Conditional design handoff with major local approval boundaries, not empirical acceptance')

result = {
    'checked_at_jst': datetime.now(timezone(timedelta(hours=9))).isoformat(),
    'research_baseline_commit': BASE,
    'product_baseline_commit': PRODUCT,
    'scope': 'Static documentation/source/identity/link/approval-boundary audit by same author; no product/model/benchmark execution.',
    'check_count': len(checks),
    'checks': checks,
    'failed_checks': [x['name'] for x in checks if not x['passed']],
    'counts': {'features': len(data), 'categories': len({f['category'] for f in data}), 'research_directions': len(rs), 'pairs': len(pairs), 'research_links': len(new_links), 'additional_links': len(added), 'internal_links': link_count, 'protected_source_files': len(protected)},
    'source_sha256': {x: digest((REPO/x).read_bytes()) for x in protected},
    'artifact_sha256': {str(p.relative_to(REPO)): digest(p.read_bytes()) for p in sorted(HERE.iterdir()) if p.is_file() and p.name in ['INTEGRATION_AUDIT.md','FEATURE_INTEGRATION_MAP.md','UNIFIED_SYSTEM_DESIGN.md','OPEN_DECISIONS.md','INTEGRATION_FINAL_REVIEW.md','feature_integration.json','integration_pairs.json','validate_integration.py']},
}
(HERE/'integration_validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k: result[k] for k in ['check_count','failed_checks','counts']},ensure_ascii=False,indent=2))
if broken:
    print(json.dumps(broken[:12],ensure_ascii=False,indent=2))
sys.exit(bool(result['failed_checks']))
