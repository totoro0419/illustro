"""Small deterministic scalar/1D oracles for the added acceptance fixtures.
These are independent design references, not the production Effect implementation.
Input is straight encoded scalar unless explicitly linear; blur filters premul components.
"""
from fractions import Fraction as F
from math import exp,ceil,isfinite

def finite(*values):
    if not all(isfinite(x) for x in values): raise ValueError('nonfinite parameter')
def clamp(v):return min(1,max(0,v))
def brightness(c,b=0,k=1):
    finite(c,b,k)
    if k<0:raise ValueError('negative contrast')
    return clamp((c-F(1,2))*k+F(1,2)+b)
def levels(c,lo=0,hi=1,gamma=1,outlo=0,outhi=1):
    finite(c,lo,hi,gamma,outlo,outhi)
    if hi<=lo or gamma<=0:raise ValueError('invalid levels')
    return outlo+(outhi-outlo)*float(clamp((c-lo)/(hi-lo)))**(1/gamma)
def exposure(c,ev=0,offset=0,gamma=1):
    finite(c,ev,offset,gamma)
    if gamma<=0:raise ValueError('invalid gamma')
    return max(0,c*2**ev+offset)**(1/gamma)
def posterize(c,n):
    if not isinstance(n,int) or n<2:raise ValueError('levels >= 2')
    return F(round(clamp(c)*(n-1)),n-1)
def threshold(c,t):
    finite(c,t)
    if not 0<=t<=1:raise ValueError('threshold bounds')
    return int(c>=t)
def box(v,r):
    if not isinstance(r,int) or r<0:raise ValueError('integer radius')
    return [sum((v[j] if 0<=j<len(v) else 0 for j in range(i-r,i+r+1)),F(0))/(2*r+1) for i in range(len(v))]
def gaussian(v,sigma):
    finite(sigma)
    if sigma<0:raise ValueError('sigma bounds')
    if sigma==0:return list(v)
    r=ceil(3*sigma);w=[exp(-(x*x)/(2*sigma*sigma)) for x in range(-r,r+1)];total=sum(w)
    return [sum((v[i+x] if 0<=i+x<len(v) else 0)*w[x+r] for x in range(-r,r+1))/total for i in range(len(v))]
def offset(v,dx,mode):
    if not isinstance(dx,int) or mode not in ['wrap','transparent','extend']:raise ValueError('offset parameters')
    if not v:return []
    def at(i):
        if mode=='wrap':return v[i%len(v)]
        if mode=='extend':return v[min(len(v)-1,max(0,i))]
        return v[i] if 0<=i<len(v) else 0
    return [at(i-dx) for i in range(len(v))]
def median(v,r):
    if not isinstance(r,int) or r<0:raise ValueError('median radius')
    return [sorted(v[j] if 0<=j<len(v) else 0 for j in range(i-r,i+r+1))[r] for i in range(len(v))]
def effect_mask(original,effected,mask):return [a+(b-a)*m for a,b,m in zip(original,effected,mask)]
def cache_key(root,order,mask,clip,profile,precision):return (root,tuple(order),tuple(mask),clip,profile,precision)
