"""Stage III numerical design reference v1, not production rendering.
W3C blend definitions: CRD-compositing-1-20240321 §10. Oklab: Ottosson
2021-01-25 public-domain coefficient set. Other equations are Illustro choices.
All blend arguments are STRAIGHT normalized encoded RGB. Alpha composition
is premultiplied; color adjustment explicitly uses linear or encoded inputs.
"""
import math, colorsys, hashlib, struct
from color_reference import SRGB, P3, XYZ_SRGB, mat, linear, encoded

def finite(*xs):
    if not all(math.isfinite(x) for x in xs): raise ValueError('nonfinite')
def clamp(x): return max(0.,min(1.,x))
def unit(x):
    finite(x)
    if not 0<=x<=1:raise ValueError('unit interval')
    return x
def lerp(a,b,t):return tuple(x+(y-x)*t for x,y in zip(a,b))
def inverse(m):
    a,b,c=m[0];d,e,f=m[1];g,h,i=m[2]
    det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g)
    if abs(det)<1e-15:raise ValueError('singular matrix')
    return tuple(tuple(x/det for x in r) for r in ((e*i-f*h,c*h-b*i,b*f-c*e),(f*g-d*i,a*i-c*g,c*d-a*f),(d*h-e*g,b*g-a*h,a*e-b*d)))

def random_u(seed,*counter):
    if not isinstance(seed,int) or not 0<=seed<2**64:raise ValueError('uint64 seed')
    b=b'Illustro.Numeric.v1\0'+struct.pack('>Q',seed)
    for n in counter:
        if not isinstance(n,int) or not -(2**63)<=n<2**63:raise ValueError('int64 counter')
        b+=struct.pack('>q',n)
    return (int.from_bytes(hashlib.sha256(b).digest()[:8],'big')>>11)/2**53

def lum(c):return .3*c[0]+.59*c[1]+.11*c[2]
def clip_color(c):
    L=lum(c);n=min(c);x=max(c)
    if n<0:c=tuple(L+(v-L)*L/(L-n) for v in c)
    if x>1:c=tuple(L+(v-L)*(1-L)/(x-L) for v in c)
    return c
def set_lum(c,L):return clip_color(tuple(v+L-lum(c) for v in c))
def set_sat(c,s):
    order=sorted(range(3),key=lambda i:(c[i],i));lo,mid,hi=order;out=[0.]*3
    if c[hi]>c[lo]:out[mid]=(c[mid]-c[lo])*s/(c[hi]-c[lo]);out[hi]=s
    return tuple(out)
def dodge(b,s):return 0. if b==0 else 1. if s==1 else min(1.,b/(1-s))
def burn(b,s):return 1. if b==1 else 0. if s==0 else 1-min(1.,(1-b)/s)
def soft(b,s):
    D=((16*b-12)*b+4)*b if b<=.25 else math.sqrt(b)
    return b-(1-2*s)*b*(1-b) if s<=.5 else b+(2*s-1)*(D-b)
SEPARABLE={
 'normal':lambda b,s:s,'darken':min,'lighten':max,'multiply':lambda b,s:b*s,
 'screen':lambda b,s:b+s-b*s,'color-burn':burn,'color-dodge':dodge,
 'hard-light':lambda b,s:2*b*s if s<=.5 else 1-2*(1-b)*(1-s),
 'overlay':lambda b,s:2*b*s if b<=.5 else 1-2*(1-b)*(1-s),
 'soft-light':soft,'difference':lambda b,s:abs(b-s),'exclusion':lambda b,s:b+s-2*b*s,
 'linear-burn':lambda b,s:max(0.,b+s-1),'linear-dodge':lambda b,s:min(1.,b+s),
 'vivid-light':lambda b,s:burn(b,2*s) if s<.5 else dodge(b,2*s-1),
 'linear-light':lambda b,s:clamp(b+2*s-1),
 'pin-light':lambda b,s:min(b,2*s) if s<=.5 else max(b,2*s-1),
 'hard-mix':lambda b,s:float((burn(b,2*s) if s<.5 else dodge(b,2*s-1))>=.5),
 'subtract':lambda b,s:max(0.,b-s),'divide':lambda b,s:1. if s==0 else min(1.,b/s)
}
BLEND_MODES=tuple(SEPARABLE)+('hue','saturation','color','luminosity','dissolve')
def blend_rgb(back,src,mode):
    for v in (*back,*src):unit(v)
    if mode in SEPARABLE:return tuple(SEPARABLE[mode](b,s) for b,s in zip(back,src))
    if mode=='hue':return set_lum(set_sat(src,max(back)-min(back)),lum(back))
    if mode=='saturation' and max(back)==min(back):return tuple(back)
    if mode=='saturation':return set_lum(set_sat(back,max(src)-min(src)),lum(back))
    if mode=='color':return set_lum(src,lum(back))
    if mode=='luminosity':return set_lum(back,lum(src))
    raise ValueError('unknown blend mode')
def compose(back,src,mode='normal',seed=0,pixel=(0,0),mask=1.,clip=1.,opacity=1.):
    if len(back)!=4 or len(src)!=4:raise ValueError('RGBA')
    for v in (*back,*src,mask,clip,opacity):unit(v)
    b=back[:3];s=src[:3];ab=back[3];a=src[3]*mask*clip*opacity
    if mode=='dissolve':a=float(random_u(seed,pixel[0],pixel[1],0)<a);mode='normal'
    B=blend_rgb(b,s,mode);outa=a+ab*(1-a)
    out=tuple((1-a)*ab*b[i]+(1-ab)*a*s[i]+a*ab*B[i] for i in range(3))
    return (*out,outa) # PREMIUL output; no second mask at presentation

def color_balance(rgb,shadows,midtones,highlights,preserve=True,weights=SRGB[1]):
    finite(*rgb,*shadows,*midtones,*highlights)
    weights=tuple(w/sum(weights) for w in weights)
    Y=sum(a*b for a,b in zip(weights,rgb));y=clamp(Y)
    ws=((1-y)**2,2*y*(1-y),y*y)
    delta=tuple(sum(ws[k]*v[i] for k,v in enumerate((shadows,midtones,highlights))) for i in range(3))
    result=tuple(c+d for c,d in zip(rgb,delta))
    if preserve:
        d=sum(a*b for a,b in zip(weights,result))-Y
        result=tuple(c-d for c in result)
    return result # no hidden clamp in floating point document
BRADFORD=((.8951,.2664,-.1614),(-.7502,1.7135,.0367),(.0389,-.0685,1.0296))
def white_xyz(xy):
    x,y=xy;finite(x,y)
    if y<=0 or x<0 or x+y>1:raise ValueError('invalid white xy')
    return (x/y,1.,(1-x-y)/y)
def adapt_xyz(xyz,source_xy,dest_xy):
    finite(*xyz)
    if tuple(source_xy)==tuple(dest_xy):return tuple(xyz)
    source=mat(BRADFORD,white_xyz(source_xy));dest=mat(BRADFORD,white_xyz(dest_xy))
    if min(source)<=0 or min(dest)<=0:raise ValueError('nonpositive cone white')
    return mat(inverse(BRADFORD),tuple(v*d/s for v,d,s in zip(mat(BRADFORD,xyz),dest,source)))
def relative_temperature(rgb,warm,tint):
    finite(*rgb,warm,tint)
    return tuple(c+d for c,d in zip(rgb,(warm+tint/2,-tint,-warm+tint/2)))
def hue_weights(rgb):
    h,s,v=colorsys.rgb_to_hsv(*map(clamp,rgb));u=h*6;i=int(u)%6;t=u-int(u);w=[0.]*6
    w[i]=1-t;w[(i+1)%6]=t
    return tuple(w),s,v

def monochrome(rgb,contributions=(0.,)*6,tint=None,tint_strength=0.,weights=SRGB[1]):
    finite(*rgb,*contributions);unit(tint_strength)
    w,s,v=hue_weights(rgb);g=sum(a*b for a,b in zip(weights,map(linear,rgb)))/sum(weights)+s*sum(a*b for a,b in zip(w,contributions))
    base=(g,g,g)
    if tint is None:return base
    for x in tint:unit(x)
    return lerp(base,tuple(g*x for x in tint),tint_strength)
def selective_color(rgb,target,delta,relative=False):
    for c in rgb:unit(c)
    if len(delta)!=4:raise ValueError('CMYK-like delta')
    finite(*delta);w,s,v=hue_weights(rgb)
    names=('red','yellow','green','cyan','blue','magenta')
    if target in names:weight=s*w[names.index(target)]
    elif target=='white':weight=(1-s)*max(0,2*v-1)
    elif target=='black':weight=max(0,1-2*v)
    elif target=='neutral':weight=(1-s)*(1-abs(2*v-1))
    else:raise ValueError('unknown selective target')
    change=tuple(-delta[i]-delta[3] for i in range(3))
    return tuple(c+weight*d*((1-c) if d>0 else c) if relative else c+weight*d for c,d in zip(rgb,change))
def noise_delta(seed,x,y,amount,distribution='uniform',channel=0,particle=1):
    finite(amount,particle)
    if amount<0 or particle<1:raise ValueError('noise range')
    ix,iy=math.floor(x/particle),math.floor(y/particle)
    u=random_u(seed,ix,iy,channel,0)
    if distribution=='uniform':return amount*(2*u-1)
    if distribution=='gaussian':return amount*math.sqrt(-2*math.log(max(u,2**-53)))*math.cos(2*math.pi*random_u(seed,ix,iy,channel,1))
    raise ValueError('unknown distribution')
# Ottosson public-domain linear-sRGB matrices (not encoded RGB).
M1=((.4122214708,.5363325363,.0514459929),(.2119034982,.6806995451,.1073969566),(.0883024619,.2817188376,.6299787005))
M2=((.2104542553,.7936177850,-.0040720468),(1.9779984951,-2.4285922050,.4505937099),(.0259040371,.7827717662,-.8086757660))
I1,I2=inverse(M1),inverse(M2)
def linear_to_oklab(rgb):return mat(M2,tuple(math.copysign(abs(v)**(1/3),v) for v in mat(M1,rgb)))
def oklab_to_linear(lab):return mat(I1,tuple(v**3 for v in mat(I2,lab)))
def oklch_rgb(L,C,h,space='srgb'):
    finite(L,C,h)
    if C<0:raise ValueError('negative chroma')
    srgb=oklab_to_linear((L,C*math.cos(math.radians(h)),C*math.sin(math.radians(h))))
    if space=='srgb':return srgb
    if space=='p3':return mat(inverse(P3),mat(SRGB,srgb))
    raise ValueError('unsupported predefined gamut')
def gamut_limit(L,h,space='srgb'):
    """First radial gamut boundary; cubic extrema split avoids assuming a convex ray."""
    finite(L,h)
    if not 0<L<1:return 0.
    a=mat(I2,(L,0,0));b=mat(I2,(0,math.cos(math.radians(h)),math.sin(math.radians(h))))
    # Get exact cubic coefficients from the linear target transform, not samples.
    T=I1
    if space=='p3':
        Q=inverse(P3);T=tuple(tuple(sum(Q[i][k]*SRGB[k][j] for k in range(3)) for j in range(3)) for i in range(3))
        T=tuple(tuple(sum(T[i][k]*I1[k][j] for k in range(3)) for j in range(3)) for i in range(3))
    elif space!='srgb':raise ValueError('gamut')
    coeff=[(sum(row[k]*a[k]**3 for k in range(3)),sum(row[k]*3*a[k]**2*b[k] for k in range(3)),sum(row[k]*3*a[k]*b[k]**2 for k in range(3)),sum(row[k]*b[k]**3 for k in range(3))) for row in T]
    def polynomial(c,x):return ((c[3]*x+c[2])*x+c[1])*x+c[0]
    roots=[]
    for c in coeff:
      for bound in (0.,1.):
        cc=(c[0]-bound,*c[1:]);A,B,D=3*c[3],2*c[2],c[1];cuts=[0.,8.]
        if abs(A)>1e-18:
            disc=B*B-4*A*D
            if disc>=0:cuts.extend(x for x in ((-B-math.sqrt(disc))/(2*A),(-B+math.sqrt(disc))/(2*A)) if 0<x<8)
        elif abs(B)>1e-18:
            x=-D/B
            if 0<x<8:cuts.append(x)
        cuts=sorted(cuts)
        for lo,hi in zip(cuts,cuts[1:]):
            fl,fh=polynomial(cc,lo),polynomial(cc,hi)
            if lo>1e-12 and abs(fl)<1e-14:roots.append(lo)
            if fl*fh<0:
                for _ in range(64):
                    mid=(lo+hi)/2;fm=polynomial(cc,mid)
                    if fl*fm<=0:hi=mid
                    else:lo=mid;fl=fm
                if (lo+hi)/2>1e-12:roots.append((lo+hi)/2)
    for c in sorted(roots):
        v=oklch_rgb(L,c+1e-8,h,space)
        if min(v)<0 or max(v)>1:return c
    raise ValueError('gamut boundary unresolved')

def sampled_profile_limit(L,h,membership,chroma_max=.5,steps=1024):
    """Explicit discrete mask for arbitrary ICC LUT gamuts (not continuous hull).
    membership is the pinned CMM roundtrip DeltaE-OK predicate. Sampling is part
    of the public contract; isolated islands after first failure are excluded.
    """
    unit(L);finite(h,chroma_max)
    if chroma_max<=0 or steps<1 or not isinstance(steps,int):raise ValueError('gamut grid')
    if not membership((L,0.,0.)):return 0.
    last=0.
    for i in range(1,steps+1):
        c=chroma_max*i/steps;lab=(L,c*math.cos(math.radians(h)),c*math.sin(math.radians(h)))
        if not membership(lab):break
        last=c
    return last
