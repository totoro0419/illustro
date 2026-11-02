"""Finite 2D Effect reference kernels, version 1. No GPU/performance claim."""
import math
from numeric_color_v1 import finite,unit,clamp,lerp
from numeric_geometry_v1 import components
from functools import lru_cache

def aperture_inside(x,y,radius,blades=0,angle=0.):
    if radius<=0:return x==0 and y==0
    t=math.radians(angle);x,y=math.cos(t)*x+math.sin(t)*y,-math.sin(t)*x+math.cos(t)*y
    if blades==0:return x*x+y*y<=radius*radius
    if not isinstance(blades,int) or blades<3:raise ValueError('aperture blades')
    return all(x*math.cos((2*k+1)*math.pi/blades)+y*math.sin((2*k+1)*math.pi/blades)<=radius*math.cos(math.pi/blades) for k in range(blades))
def aperture_kernel(radius,blades=0,angle=0.,aa=8):
    finite(radius,angle)
    if radius<0 or not isinstance(aa,int) or aa<1:raise ValueError('aperture bounds')
    if not isinstance(blades,int) or blades not in (0,*range(3,13)):raise ValueError('aperture blades')
    if radius==0:return {(0,0):1.}
    extent=math.ceil(radius+.5);raw={}
    for y in range(-extent,extent+1):
      for x in range(-extent,extent+1):
        coverage=sum(aperture_inside(x+(sx+.5)/aa-.5,y+(sy+.5)/aa-.5,radius,blades,angle) for sy in range(aa) for sx in range(aa))/(aa*aa)
        if coverage:raw[x,y]=coverage
    total=sum(raw.values())
    return {k:v/total for k,v in raw.items()} if total else {(0,0):1.}

def depth_blur(image,depth,focus,focus_range,max_radius,blades=0,angle=0.,invert=False):
    finite(focus,focus_range,max_radius);unit(focus)
    if focus_range<=0 or max_radius<0:raise ValueError('depth blur bounds')
    aperture_kernel(0,blades,angle)
    h=len(image);w=len(image[0])
    if len(depth)!=h or any(len(r)!=w for r in depth):raise ValueError('depth shape')
    for row in depth:
        for v in row:unit(v)
    for row in image:
        for p in row:finite(*p);unit(p[3])
    z=[[1-v if invert else v for v in row] for row in depth]
    radii=[[max_radius*min(1,abs(v-focus)/focus_range) for v in row] for row in z]
    if max_radius==0 or all(r==0 for row in radii for r in row):return [[tuple(p) for p in row] for row in image]
    kernels={r:aperture_kernel(r,blades,angle) for row in radii for r in row}
    halo=math.ceil(max_radius+.5);out=[]
    for y in range(h):
        row=[]
        for x in range(w):
            acc=[0.]*4;total=0.
            for sy in range(y-halo,y+halo+1):
              for sx in range(x-halo,x+halo+1):
                iy,ix=min(h-1,max(0,sy)),min(w-1,max(0,sx))
                if z[iy][ix]>z[y][x]:continue # farther sources do not bleed over nearer geometry
                weight=kernels[radii[iy][ix]].get((x-sx,y-sy),0.)
                if not weight:continue
                total+=weight
                for k in range(4):acc[k]+=image[iy][ix][k]*weight
            if total:
                a=acc[3]/total;bounded=clamp(a);color=tuple((v/total)/a*bounded if a>0 else 0. for v in acc[:3]);row.append((*color,bounded))
            else:row.append(tuple(image[y][x]))
        out.append(row)
    return out

def lens_blur(image,radius,blades=0,angle=0.):
    depth=[[0. for _ in r] for r in image]
    return depth_blur(image,depth,1.,1.,radius,blades,angle)

def tone_area(radius):
    if radius<=0:return 0.
    if radius>=math.sqrt(.5):return 1.
    area=math.pi*radius*radius
    if radius>.5:area-=4*(radius*radius*math.acos(.5/radius)-.5*math.sqrt(radius*radius-.25))
    return area

@lru_cache(maxsize=4096)
def tone_radius(density):
    unit(density)
    if density==0:return 0.
    if density==1:return math.sqrt(.5)
    lo,hi=0.,math.sqrt(.5)
    for _ in range(48):
        m=(lo+hi)/2
        if tone_area(m)<density:lo=m
        else:hi=m
    return (lo+hi)/2

def tone_point(x,y,density,shape):
    if density==0:return False
    if density==1:return True
    if shape=='round':return x*x+y*y<=tone_radius(density)**2
    if shape=='square':return max(abs(x),abs(y))<=math.sqrt(density)/2
    if shape=='diamond':
        radius=math.sqrt(density/2) if density<=.5 else 1-math.sqrt((1-density)/2)
        return abs(x)+abs(y)<=radius
    if shape=='line':return abs(x)<=density/2
    raise ValueError('tone shape')

def tone_coverage(x,y,density,spacing,angle=0.,shape='round',origin=(0.,0.),aa=16):
    finite(x,y,spacing,angle,*origin);unit(density)
    if spacing<=0 or not isinstance(aa,int) or aa<1:raise ValueError('tone bounds')
    t=math.radians(angle);inside=0
    for iy in range(aa):
      for ix in range(aa):
        dx=x+(ix+.5)/aa-.5-origin[0];dy=y+(iy+.5)/aa-.5-origin[1]
        u=(math.cos(t)*dx+math.sin(t)*dy)/spacing;v=(-math.sin(t)*dx+math.cos(t)*dy)/spacing
        inside+=tone_point(u-math.floor(u)-.5,v-math.floor(v)-.5,density,shape)
    return inside/(aa*aa)

def median2d(image,radius):
    if radius<0 or not isinstance(radius,int):raise ValueError('median radius')
    h=len(image);w=len(image[0]);n=(2*radius+1)**2
    return [[sorted(image[iy][ix] if 0<=iy<h and 0<=ix<w else 0. for iy in range(y-radius,y+radius+1) for ix in range(x-radius,x+radius+1))[n//2] for x in range(w)] for y in range(h)]

def sobel(image):
    h=len(image);w=len(image[0]);out=[]
    KX=((-1,0,1),(-2,0,2),(-1,0,1));KY=((-1,-2,-1),(0,0,0),(1,2,1))
    for y in range(h):
        row=[]
        for x in range(w):
            a=b=0.
            for j in range(3):
              for i in range(3):
                yy,xx=min(h-1,max(0,y+j-1)),min(w-1,max(0,x+i-1));v=image[yy][xx]
                a+=KX[j][i]*v/8;b+=KY[j][i]*v/8
            row.append(math.hypot(a,b))
        out.append(row)
    return out

def thin(binary):
    """Guo-Hall two-subiteration topology-preserving thinning, zero exterior.
    Conditions use the 8-neighbor ring in N,NE,E,SE,S,SW,W,NW order.
    This is the v1 choice after Zhang-Suen erased isolated 2x2 components.
    """
    h=len(binary);w=len(binary[0]);a=[[bool(v) for v in r] for r in binary]
    def at(x,y):return a[y][x] if 0<=y<h and 0<=x<w else False
    while True:
        changed=False
        for phase in (0,1):
            remove=[]
            for y in range(h):
              for x in range(w):
                if not a[y][x]:continue
                p=[at(x,y-1),at(x+1,y-1),at(x+1,y),at(x+1,y+1),at(x,y+1),at(x-1,y+1),at(x-1,y),at(x-1,y-1)]
                C=sum(not p[k] and (p[(k+1)%8] or p[(k+2)%8]) for k in (0,2,4,6))
                N1=sum(p[(k-1)%8] or p[k] for k in (0,2,4,6))
                N2=sum(p[k] or p[k+1] for k in (0,2,4,6))
                m=((p[4] or p[5] or not p[7]) and p[6]) if phase==0 else ((p[0] or p[1] or not p[3]) and p[2])
                if C==1 and 2<=min(N1,N2)<=3 and not m:remove.append((x,y))
            for x,y in remove:a[y][x]=False
            changed|=bool(remove)
        if not changed:return a

def clean_edges(image,median_radius=0,gain=1.,threshold=.1,thinning=False,min_component=0):
    unit(threshold);finite(gain)
    if gain<0 or min_component<0:raise ValueError('edge bounds')
    filtered=median2d(image,median_radius);edge=[[clamp(v*gain) for v in r] for r in sobel(filtered)]
    if not thinning and min_component==0:return edge
    mask=[[v>=threshold for v in r] for r in edge]
    for r in components(mask,8):
        if len(r)<min_component:
            for x,y in r:mask[y][x]=False
    return thin(mask) if thinning else [[edge[y][x] if mask[y][x] else 0. for x in range(len(r))] for y,r in enumerate(mask)]

def widen_line(mask,width=1.):
    finite(width)
    if width<1:raise ValueError('line width')
    h=len(mask);w=len(mask[0]);r=(width-1)/2;extent=math.ceil(r)
    return [[any(0<=x+dx<w and 0<=y+dy<h and mask[y+dy][x+dx] and dx*dx+dy*dy<=r*r for dy in range(-extent,extent+1) for dx in range(-extent,extent+1)) for x in range(w)] for y in range(h)]

def line_rgba(coverage,ink=(0.,0.,0.),white_background=False,invert=False):
    for v in ink:unit(v)
    for row in coverage:
        for v in row:unit(v)
    c=tuple(1-v if invert else v for v in ink)
    return [[tuple(v*a+(1-a if white_background else 0) for v in c)+(1. if white_background else a,) for a in row] for row in coverage]

def signed_distance(mask):
    h=len(mask);w=len(mask[0]);inside=[(x,y) for y in range(h) for x in range(w) if mask[y][x]]
    outside=[(x,y) for y in range(-1,h+1) for x in range(-1,w+1) if not (0<=x<w and 0<=y<h and mask[y][x])]
    out=[]
    for y in range(h):
        row=[]
        for x in range(w):
            targets=outside if mask[y][x] else inside
            d=min((math.hypot(x-a,y-b) for a,b in targets),default=math.inf)-.5
            row.append(d if mask[y][x] else -d)
        out.append(row)
    return out

def gaussian2d(values,sigma):
    if sigma<0:raise ValueError('sigma')
    if sigma==0:return [list(r) for r in values]
    h=len(values);w=len(values[0]);r=math.ceil(3*sigma);weights=[math.exp(-i*i/(2*sigma*sigma)) for i in range(-r,r+1)];weights=[v/sum(weights) for v in weights]
    tmp=[[sum(values[y][min(w-1,max(0,x+i))]*weights[i+r] for i in range(-r,r+1)) for x in range(w)] for y in range(h)]
    return [[sum(tmp[min(h-1,max(0,y+j))][x]*weights[j+r] for j in range(-r,r+1)) for x in range(w)] for y in range(h)]

def bevel(mask,size,depth,softness=0.,angle=315.,altitude=45.,mode='inner'):
    finite(size,depth,softness,angle,altitude)
    if size<=0 or softness<0 or not 0<=altitude<=90 or mode not in ('inner','outer','emboss'):raise ValueError('bevel bounds')
    d=signed_distance(mask);h=len(mask);w=len(mask[0]);field=[]
    for y in range(h):
        row=[]
        for x in range(w):
            z=d[y][x]
            if mode=='inner':value=clamp(z/size)
            elif mode=='outer':value=clamp(1+z/size)
            else:value=clamp(.5+z/size)
            row.append(value)
        field.append(row)
    field=gaussian2d(field,softness);a=math.radians(angle);e=math.radians(altitude);L=(math.cos(e)*math.cos(a),math.cos(e)*math.sin(a),math.sin(e));out=[]
    for y in range(h):
        row=[]
        for x in range(w):
            dx=(field[y][min(w-1,x+1)]-field[y][max(0,x-1)])/2
            dy=(field[min(h-1,y+1)][x]-field[max(0,y-1)][x])/2
            n=(-depth*dx,-depth*dy,1.);length=math.sqrt(sum(v*v for v in n));s=sum(v*l/length for v,l in zip(n,L))-L[2]
            row.append((clamp(s),clamp(-s))) # bounded highlight/shadow coverage
        out.append(row)
    return field,out

def render_bevel(image,size,depth,softness=0.,angle=315.,altitude=45.,mode='inner',highlight=(1.,1.,1.),shadow=(0.,0.,0.),highlight_strength=1.,shadow_strength=1.):
    """Color oracle on supplied bounds (caller expands/pads original for outer).
    Nearest boundary color uses distance then y,x tie break. No source mutation.
    """
    unit(highlight_strength);unit(shadow_strength)
    for v in (*highlight,*shadow):unit(v)
    mask=[[p[3]>=.5 for p in r] for r in image]
    field,lighting=bevel(mask,size,depth,softness,angle,altitude,mode)
    if depth==0 or not any(map(any,mask)):return [[tuple(p) for p in r] for r in image]
    boundary=[(x,y) for y,r in enumerate(mask) for x,v in enumerate(r) if v and any(not (0<=y+dy<len(mask) and 0<=x+dx<len(r) and mask[y+dy][x+dx]) for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)))];out=[]
    for y,row in enumerate(image):
        result=[]
        for x,p in enumerate(row):
            a=p[3];c=tuple(v/a if a else 0. for v in p[:3])
            if mode!='inner' and field[y][x]>0 and a==0:
                bx,by=min(boundary,key=lambda q:((x-q[0])**2+(y-q[1])**2,q[1],q[0]));q=image[by][bx];c=tuple(v/q[3] for v in q[:3])
            if mode!='inner':a=max(a,field[y][x]*max(highlight_strength,shadow_strength))
            hi,lo=lighting[y][x];hi*=highlight_strength;lo*=shadow_strength
            c=tuple((v+(1-v)*h*hi)*(1-lo+s*lo) for v,h,s in zip(c,highlight,shadow))
            result.append(tuple(v*a for v in c)+(a,))
        out.append(result)
    return out
