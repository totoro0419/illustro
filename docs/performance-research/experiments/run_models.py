#!/usr/bin/env python3
"""Independent semantic models. No editor, GPU, OS input or device speed benchmark."""
import copy, hashlib, heapq, json, math, os, platform, random, sys
from collections import deque
from pathlib import Path

OUT=Path(__file__).resolve().parent

def digest(v):
    return hashlib.sha256(json.dumps(v,sort_keys=True).encode()).hexdigest()

def apply(state, op):
    kind,t,v=op
    if kind=='add': state[t]+=v
    elif kind=='mul': state[t]*=v
    elif kind=='copy': state[t]=state[v]+1

def footprints(op):
    k,t,v=op
    return ({t,v} if k=='copy' else {t}),{t}

def deps(ops):
    d=[set() for _ in ops]
    for j,b in enumerate(ops):
        rb,wb=footprints(b)
        for i,a in enumerate(ops[:j]):
            ra,wa=footprints(a)
            if wa&(rb|wb) or wb&ra: d[j].add(i)
    return d

def replay(ops, omit=set()):
    st={'A':1,'B':2,'C':3}
    for i,op in enumerate(ops):
        if i not in omit: apply(st,op)
    return st

def scheduled(ops,d,rng,omit=set()):
    pending=set(range(len(ops)))-omit;done=set(omit);st={'A':1,'B':2,'C':3}
    order=[]
    while pending:
        ready=[i for i in pending if d[i]<=done]
        assert ready, 'cycle'
        i=rng.choice(sorted(ready));apply(st,ops[i]);pending.remove(i);done.add(i);order.append(i)
    return st,order

def transaction_model():
    permutations=0;bad=0;cancel_cases=0;save_cases=0
    for seed in range(250):
        rng=random.Random(seed)
        ops=[]
        for _ in range(24):
            k=rng.choice(['add','mul','copy']);t=rng.choice('ABC')
            v=rng.choice([s for s in 'ABC' if s!=t]) if k=='copy' else rng.randint(1,3)
            ops.append((k,t,v))
        d=deps(ops);expected=replay(ops)
        for _ in range(4):
            got,order=scheduled(ops,d,rng);assert got==expected;permutations+=1
        victim=rng.randrange(len(ops));omit={victim}
        # Explicit dependent-cancellation option, not silent cancellation of descendants.
        changed=True
        while changed:
            changed=False
            for i in range(len(ops)):
                if i not in omit and d[i]&omit:omit.add(i);changed=True
        got,_=scheduled(ops,d,rng,omit);assert got==replay(ops,omit);cancel_cases+=1
        cutoff=rng.randrange(1,len(ops));prefix=ops[:cutoff]
        protected,_=scheduled(prefix,deps(prefix),rng);frozen=copy.deepcopy(protected)
        assert frozen==replay(prefix)
        current=copy.deepcopy(protected)
        for op in ops[cutoff:]:apply(current,op)
        assert frozen==replay(prefix);assert current==expected;save_cases+=1
        shuffled=list(range(len(ops)));rng.shuffle(shuffled);st={'A':1,'B':2,'C':3}
        for i in shuffled:apply(st,ops[i])
        bad+=st!=expected
    assert bad>0
    # Independent edit must survive session cancellation; full-root rollback fails.
    before={'A':1,'B':2};current={'A':9,'B':5}
    selective={**current,'A':before['A']}
    assert selective=={'A':1,'B':5} and before!=selective
    return dict(seeds=250,safe_schedules=permutations,cancel_closures=cancel_cases,
                save_fences=save_cases,naive_completion_order_failures=bad,
                selective_cancel_keeps_independent_edit=True,
                limit='Pure integer commands with exact read/write sets; no pixels, I/O, crash or asynchronous runtime.')

def pct(a,p):
    return sorted(a)[math.ceil(len(a)*p)-1]

def scheduler(chunk):
    # Abstract single non-preemptive server. Units deliberately NOT milliseconds.
    arrivals=[float(i) for i in range(0,256,8)]
    pending=deque(arrivals);now=0.;responses=[];work=256.
    while pending or work:
        if pending and pending[0]<=now:
            a=pending.popleft();now+=.25;responses.append(now-a)
        elif work:
            used=min(work,chunk);now+=used;work-=used
        else:now=pending[0]
    return dict(chunk_work_units=chunk,p50=pct(responses,.5),p95=pct(responses,.95),
                p99=pct(responses,.99),max=max(responses),total_work_units=256,
                end_time_units=now,input_count=len(responses))

def topology():
    n=65;mid=n//2
    blocked={(mid,y) for y in range(n)}
    def reach(b):
        q=deque([(0,mid)]);seen={(0,mid)}
        while q:
            x,y=q.popleft()
            for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if 0<=p[0]<n and 0<=p[1]<n and p not in b and p not in seen:
                    seen.add(p);q.append(p)
        return seen
    old=reach(blocked);new=reach(blocked-{(mid,mid)});delta=new-old
    far={p for p in delta if max(abs(p[0]-mid),abs(p[1]-mid))>4}
    assert far and (64,32) in delta
    # Threshold the same signal with two seeds: cache independent of seed is invalid.
    return dict(grid=[n,n],edited_cells=1,changed_reachable_cells=len(delta),
                changed_outside_radius4=len(far),far_point_now_reachable=[64,32],
                limit='Binary grid connectivity only, not thick-line extraction or artistic intent.')

def roi():
    rng=random.Random(42);x=[rng.random() for _ in range(101)]
    radius=5;weights=[math.exp(-k*k/8) for k in range(-radius,radius+1)]
    total=sum(weights);weights=[v/total for v in weights]
    def direct(seq,idx):
        return sum(w*seq[max(0,min(len(seq)-1,idx+k-radius))] for k,w in enumerate(weights))
    lo,hi=40,60;full=[direct(x,i) for i in range(lo,hi)]
    cropped=x[lo:hi];naive=[direct(cropped,i) for i in range(len(cropped))]
    halo=x[lo-radius:hi+radius];safe=[direct(halo,i+radius) for i in range(hi-lo)]
    err=max(abs(a-b) for a,b in zip(full,safe));bad=max(abs(a-b) for a,b in zip(full,naive))
    assert err==0 and bad>0
    # Output mask does not limit input support. Negative example for one-pixel recolor.
    premul=lambda rgb,a:(rgb*a,a)
    c0,a0=premul(1,1);c1,a1=premul(0,0)
    c,a=(c0+c1)/2,(a0+a1)/2
    straight=c/a
    naive_straight=(1+0)/2
    assert straight==1 and naive_straight==.5
    return dict(filter='1D finite truncated Gaussian, radius=5, clamp global boundary',
                output_range=[lo,hi],safe_max_abs_error=err,
                cropped_without_halo_max_abs_error=bad,
                opaque_white_transparent_black_correct_straight=straight,
                naive_straight_average=naive_straight,
                limit='No 2D, ICC, GPU, infinite-support Gaussian, lens blur or deep stack tested.')

def sparse():
    # Analytic payload model over identical touched cells, not allocation measurement.
    w,h,layers=4096,4096,1000;bpp=8;touched=4096
    models=[]
    rng=random.Random(9)
    scenes={'compact':[(x,y) for x in range(64) for y in range(64)],
            'scattered':[(rng.randrange(w),rng.randrange(h)) for _ in range(touched)]}
    for name,pts in scenes.items():
        for side in [64,128,256,512]:
            blocks={(x//side,y//side) for x,y in pts}
            payload=len(blocks)*side*side*bpp
            assert payload<=w*h*bpp
            models.append(dict(scene=name,block_side=side,blocks=len(blocks),payload_bytes=payload))
    return dict(dimensions=[w,h],layers=layers,bpp=bpp,
                dense_all_layers_payload_bytes=w*h*layers*bpp,one_touched_layer=models,
                limit='Payload arithmetic only. Excludes metadata, GPU padding, copies, mips, compression and allocator overhead. No block size selected.')

def deterministic_noise():
    def noise(x,y,seed):
        a=(x*73856093 ^ y*19349663 ^ seed)&0xffffffff
        a^=a>>16;a=(a*0x7feb352d)&0xffffffff;a^=a>>15
        return a&65535
    coords=[(x,y) for y in range(32) for x in range(32)]
    expected={f'{x},{y}':noise(x,y,123) for x,y in coords}
    shuffled=coords[:];random.Random(44).shuffle(shuffled)
    actual={f'{x},{y}':noise(x,y,123) for x,y in shuffled}
    assert actual==expected
    return dict(samples=len(coords),matches=True,digest=digest(actual),
                limit='Integer toy hash, not chosen as brush RNG; distribution and GPU portability not assessed.')

def main():
    result={'schema':1,'kind':'independent_semantic_models_not_product_performance',
            'python':sys.version,'platform':platform.platform(),'seed_policy':'fixed per test',
            'experiments':{'E01':transaction_model(),'E02':[scheduler(c) for c in [256,32,8,2]],
                           'E03':topology(),'E04':roi(),'E05':sparse(),'E06':deterministic_noise()},
            'source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'assertions_passed':True,
            'not_measured':['OS input','display latency','GPU','CPU usage','actual RAM','energy','temperature','usability','competitor performance','durability']}
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
