"""Frozen-input brush/media numerical reference. It never publishes product pixels."""
import math
from numeric_color_v1 import finite,clamp,unit,lerp,random_u

def smoothstep(a,b,x):
    if b<=a:raise ValueError('step interval')
    t=clamp((x-a)/(b-a));return t*t*(3-2*t)
def corrected_samples(samples,strength=0.,speed_strength=0.,pressure_tau=0.):
    """samples = (monotonic seconds, document x,y, pressure).
    EMA tau = strength + speed_strength*min(speed/1000,1), seconds.
    Final endpoint is an explicit final segment, never synthetic input/history.
    """
    finite(strength,speed_strength,pressure_tau)
    if min(strength,speed_strength,pressure_tau)<0:raise ValueError('negative tau')
    if not samples:return []
    for s in samples:finite(*s);unit(s[3])
    if any(b[0]<=a[0] for a,b in zip(samples,samples[1:])):raise ValueError('timestamps strictly increasing')
    out=[tuple(samples[0])]
    for prev,s in zip(samples,samples[1:]):
        t,x,y,p=s;dt=t-prev[0];v=math.hypot(x-prev[1],y-prev[2])/dt
        tau=strength+speed_strength*min(v/1000,1);alpha=1. if tau==0 else -math.expm1(-dt/tau)
        ap=1. if pressure_tau==0 else -math.expm1(-dt/pressure_tau)
        last=out[-1];out.append((t,last[1]+alpha*(x-last[1]),last[2]+alpha*(y-last[2]),last[3]+ap*(p-last[3])))
    if strength or speed_strength:
        # The formal path ends at the accepted raw endpoint. Preview is not formal input.
        last=samples[-1];out[-1]=(last[0],last[1],last[2],out[-1][3])
    return out

def curve(knots,x):
    finite(x)
    if len(knots)<2 or any(not all(math.isfinite(v) for v in p) for p in knots):raise ValueError('curve')
    if any(a[0]>=b[0] for a,b in zip(knots,knots[1:])):raise ValueError('curve x order')
    if x<=knots[0][0]:return knots[0][1]
    if x>=knots[-1][0]:return knots[-1][1]
    for (a,u),(b,v) in zip(knots,knots[1:]):
        if a<=x<=b:return u+(v-u)*(x-a)/(b-a)

def modulation(base,nodes,inputs,kind='unit'):
    """Ordered add/multiply/replace nodes. Sources are frozen at admission."""
    value=base;finite(value)
    for n in nodes:
        if n['source'] not in inputs:raise ValueError('unavailable sensor/mapping')
        v=curve(n['knots'],inputs[n['source']])
        op=n['operation']
        if op=='add':value+=v
        elif op=='multiply':value*=v
        elif op=='replace':value=v
        else:raise ValueError('modulation operation')
    finite(value)
    if kind=='unit':return clamp(value)
    if kind=='angle':return value%360
    if kind=='nonnegative':return max(0.,value)
    if kind=='signed':return value
    raise ValueError('modulation domain')

def dab_coverage(x,y,center=(0.,0.),radii=(1.,1.),angle=0.,hardness=1.,deform=(1.,0.,0.,1.)):
    unit(hardness);finite(x,y,*center,*radii,angle,*deform)
    if min(radii)<0:raise ValueError('negative radius')
    if min(radii)==0:return 0.
    dx,dy=x-center[0],y-center[1];t=math.radians(angle);u=(math.cos(t)*dx+math.sin(t)*dy)/radii[0];v=(-math.sin(t)*dx+math.cos(t)*dy)/radii[1]
    a,b,c,d=deform;det=a*d-b*c
    if abs(det)<1e-12:raise ValueError('singular dab deformation')
    u,v=(d*u-b*v)/det,(-c*u+a*v)/det;r=math.hypot(u,v)
    if r>=1:return 0.
    return 1. if r<=hardness or hardness==1 else 1-smoothstep(hardness,1.,r)

def rgba_mix(a,b,t):
    unit(t)
    premul(a);premul(b)
    return lerp(a,b,t) # inputs PREMIUL

def premul(p):
    if len(p)!=4:raise ValueError('RGBA')
    finite(*p);unit(p[3])
    if p[3]==0 and any(p[:3]):raise ValueError('noncanonical transparent premul')

def paint_over(dst,paint,amount):
    premul(dst);premul(paint)
    unit(amount);a=paint[3]*amount
    return tuple(paint[i]*amount+dst[i]*(1-a) for i in range(3))+(a+dst[3]*(1-a),)

def smudge_dab(dst,pickup,reservoir=None,strength=1.,pickup_rate=1.,paint=(0.,0.,0.,0.),paint_amount=0.,mask=1.,alpha_lock=False):
    unit(strength);unit(pickup_rate);unit(mask)
    R=pickup if reservoir is None else rgba_mix(reservoir,pickup,pickup_rate)
    R=paint_over(R,paint,paint_amount);out=rgba_mix(dst,R,strength*mask)
    if alpha_lock:
        a=dst[3];out=tuple(v*a/out[3] if out[3]>0 else 0. for v in out[:3])+(a,)
    return out,R

def blur_pickup(image,x,y,radius):
    if not isinstance(radius,int) or radius<0:raise ValueError('blur radius')
    n=(2*radius+1)**2;h=len(image);w=len(image[0]);acc=[0.]*4
    for iy in range(y-radius,y+radius+1):
      for ix in range(x-radius,x+radius+1):
        p=image[iy][ix] if 0<=iy<h and 0<=ix<w else (0.,)*4
        for k in range(4):acc[k]+=p[k]
    return tuple(v/n for v in acc)

def media_dab(dst,height,pickup,reservoir,coverage,pressure,dryness,paper,thickness,oil,paint):
    for v in (coverage,pressure,dryness,paper,oil):unit(v)
    finite(height,thickness)
    if min(height,thickness)<0:raise ValueError('height')
    gate=1-dryness+dryness*smoothstep(1-pressure,1-pressure+max(1e-6,pressure),paper)
    cov=coverage*gate
    out,R=smudge_dab(dst,pickup,reservoir,strength=cov,pickup_rate=oil,paint=paint,paint_amount=(1-oil))
    H=height+thickness*cov
    if H>65504:raise ValueError('height 16F overflow; preserve old root')
    return out,H,R

def stamp_random(seed,stamp,channel):return random_u(seed,stamp,channel)
