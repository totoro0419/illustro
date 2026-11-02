"""Small independent-operation oracles for supplementary Stage III contracts."""
import math
from fractions import Fraction as F
from numeric_color_v1 import unit,finite,clamp

def selection(a,b,mode):
    unit(a);unit(b)
    return {'replace':lambda:b,'add':lambda:max(a,b),'subtract':lambda:max(0,a-b),'intersect':lambda:min(a,b)}[mode]()

def morphology(mask,radius,erode=False):
    finite(radius)
    if radius<0:raise ValueError('radius')
    h=len(mask);w=len(mask[0]);r=math.ceil(radius)
    offsets=[(x,y) for y in range(-r,r+1) for x in range(-r,r+1) if x*x+y*y<=radius*radius]
    fn=min if erode else max
    return [[fn(mask[y+dy][x+dx] if 0<=y+dy<h and 0<=x+dx<w else 0 for dx,dy in offsets) for x in range(w)] for y in range(h)]

def taper(s,total,start,end,minimum=0.):
    finite(s,total,start,end);unit(minimum)
    if min(total,start,end)<0 or not 0<=s<=total:raise ValueError('taper distance')
    if total==0:return minimum
    def smooth(t):t=clamp(t);return t*t*(3-2*t)
    f=(smooth(s/start) if start else 1)*(smooth((total-s)/end) if end else 1)
    return max(minimum,f)

def gradient_stop(stops,t,midpoints=None):
    """Scalar oracle; equal position uses last stable-ID stop at/right."""
    finite(t)
    s=sorted(stops,key=lambda v:(v[0],v[1]))
    if not s:raise ValueError('stops')
    if t<s[0][0]:return s[0][2]
    if t>=s[-1][0]:return s[-1][2]
    for i in range(len(s)-1):
        a,b=s[i],s[i+1]
        if a[0]<=t<b[0]:
            f=(t-a[0])/(b[0]-a[0]);m=(midpoints or {}).get(a[1],.5)
            if not 0<m<1:raise ValueError('midpoint')
            u=.5*f/m if f<=m else .5+.5*(f-m)/(1-m)
            return a[2]+(b[2]-a[2])*u

def poisson_heal_scalar(source,destination,mask):
    """Exact rational Gaussian elimination oracle, four-neighbor Dirichlet.
    Product may use sparse solvers with the separately specified residual bound.
    """
    h=len(mask);w=len(mask[0]);points=[(x,y) for y in range(h) for x in range(w) if mask[y][x]];idx={p:i for i,p in enumerate(points)};n=len(points)
    def at(a,x,y):return F(a[y][x]) if 0<=y<h and 0<=x<w else F(0)
    A=[[F(0) for _ in range(n+1)] for _ in range(n)]
    for p,i in idx.items():
        x,y=p;A[i][i]=4
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            q=(x+dx,y+dy);A[i][-1]+=at(source,x,y)-at(source,*q)
            if q in idx:A[i][idx[q]]-=1
            else:A[i][-1]+=at(destination,*q)
    for col in range(n):
        pivot=next((r for r in range(col,n) if A[r][col]),None)
        if pivot is None:raise ValueError('singular patch')
        A[col],A[pivot]=A[pivot],A[col];div=A[col][col];A[col]=[v/div for v in A[col]]
        for r in range(n):
            if r==col:continue
            mul=A[r][col];A[r]=[a-mul*b for a,b in zip(A[r],A[col])]
    out=[[F(v) for v in row] for row in destination]
    for (x,y),i in idx.items():out[y][x]=A[i][-1]
    return out
