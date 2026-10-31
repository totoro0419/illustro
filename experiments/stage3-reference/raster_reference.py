"""Exact rational oracle for a small post-transform layer. No GPU or product renderer."""
from fractions import Fraction as F
from copy import deepcopy
import json

Z=(F(0),)*4

def pixel(r,g,b,a):
    a=F(a); return (F(r)*a,F(g)*a,F(b)*a,a)

def over(src,dst):
    return tuple(src[i]+dst[i]*(1-src[3]) for i in range(4))

def scale(p,k): return tuple(x*k for x in p)

def mix(a,b,k): return tuple(x*(1-k)+y*k for x,y in zip(a,b))

def evaluate(doc):
    # Mapping is forward-rasterized output -> ordered source fragments. A folded
    # mesh may have multiple fragments; triangle order is explicit, never inverse guessed.
    out=[]
    for fragments in doc['mapping']:
        p=Z
        for source_index,coverage in fragments:
            p=over(scale(doc['original'][source_index],coverage),p)
        out.append(p)
    for op in doc['ops']:
        for i,cov in enumerate(op['coverage']):
            p=out[i]
            if op['kind']=='paint':
                if op.get('alpha_lock'):
                    # Lock preserves the CURRENT destination alpha; zero alpha cannot grow.
                    # Fixed document-space brush/selection, not a moving source mask.
                    unassociated=tuple(v/p[3] for v in p[:3]) if p[3] else (F(0),)*3
                    strength=op['source'][3]*cov
                    color=mix(unassociated,op['color'],strength)
                    out[i]=tuple(v*p[3] for v in color)+(p[3],)
                else: out[i]=over(scale(op['source'],cov),p)
            elif op['kind']=='erase': out[i]=scale(p,1-op['strength']*cov)
            elif op['kind']=='replace': out[i]=mix(p,op['samples'][i],cov)
            else: raise ValueError(op['kind'])
    # Live downstream layer mask / clipping alpha multiply exactly once.
    return [scale(p,doc['mask'][i]*doc['clip'][i]) for i,p in enumerate(out)]

def capture_smudge(doc,coverage,samples_from):
    before=evaluate({**doc,'mask':[F(1)]*len(doc['mapping']),'clip':[F(1)]*len(doc['mapping'])})
    return {'kind':'replace','coverage':coverage,'samples':[before[j] for j in samples_from],
            'sample_basis':doc['revision']}

def encode(v):
    if isinstance(v,F): return {'rational':[v.numerator,v.denominator]}
    if isinstance(v,dict): return {k:encode(x) for k,x in v.items()}
    if isinstance(v,(tuple,list)): return [encode(x) for x in v]
    return v

def decode(v):
    if isinstance(v,dict):
        if set(v)=={'rational'}: return F(*v['rational'])
        return {k:decode(x) for k,x in v.items()}
    if isinstance(v,list): return [decode(x) for x in v]
    return v

def reload(doc): return decode(json.loads(json.dumps(encode(doc))))

class History:
    def __init__(self,doc): self.roots=[deepcopy(doc)];self.cursor=0;self.saves=[]
    @property
    def doc(self): return self.roots[self.cursor]
    def edit(self,fn):
        d=deepcopy(self.doc);fn(d);d['revision']+=1
        self.roots=self.roots[:self.cursor+1]+[d];self.cursor+=1
    def undo(self): self.cursor=max(0,self.cursor-1)
    def redo(self): self.cursor=min(len(self.roots)-1,self.cursor+1)
    def save(self): self.saves.append(reload(self.doc));return self.saves[-1]
