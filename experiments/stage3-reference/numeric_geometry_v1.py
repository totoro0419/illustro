"""2D segmentation/gap, field deformation and exact-area reference algorithms.
The candidate score is an Illustro design choice, NOT a probability of author intent.
"""
import math
from fractions import Fraction
from collections import deque
from numeric_color_v1 import finite,unit,clamp

def components(mask,connectivity=4):
    h=len(mask);w=len(mask[0]) if h else 0
    if any(len(r)!=w for r in mask) or connectivity not in (4,8):raise ValueError('grid/connectivity')
    remaining={(x,y) for y in range(h) for x in range(w) if mask[y][x]};out=[]
    offsets=[(1,0),(-1,0),(0,1),(0,-1)]
    if connectivity==8:offsets += [(1,1),(1,-1),(-1,1),(-1,-1)]
    while remaining:
        first=min(remaining,key=lambda p:(p[1],p[0]));remaining.remove(first);region={first};todo=deque([first])
        while todo:
            x,y=todo.popleft()
            for dx,dy in offsets:
                p=(x+dx,y+dy)
                if p in remaining:remaining.remove(p);region.add(p);todo.append(p)
        out.append(frozenset(region))
    return out

def segment_regions(alpha,threshold=.5):
    unit(threshold)
    if not alpha or not alpha[0]:return []
    for row in alpha:
        for a in row:unit(a)
    regions=components([[a<threshold for a in row] for row in alpha],4);h=len(alpha);w=len(alpha[0])
    return [{'candidate_id':'candidate-'+str(i+1),'pixels':r,'exterior':any(x in (0,w-1) or y in (0,h-1) for x,y in r)} for i,r in enumerate(regions)]

def match_regions(old,new):
    """Preserve IDs only for reciprocal unique >50% overlap in BOTH regions.
    Splits/merges/ties do not auto-rebind manual edits. Exact unchanged sets win.
    """
    result={};conflicts=[];claimed=set()
    for oid,op in old.items():
        exact=[n for n,np in enumerate(new) if np==op]
        candidates=exact or [n for n,np in enumerate(new) if len(op & np)*2>len(op) and len(op & np)*2>len(np)]
        if len(candidates)!=1:conflicts.append(oid);continue
        n=candidates[0];np=new[n]
        reciprocal=[o for o,p in old.items() if p==np or (len(p & np)*2>len(p) and len(p & np)*2>len(np))]
        # Any genuine split/merge is a manual decision conflict even when one part dominates.
        overlaps=[k for k,p in enumerate(new) if op & p]
        parents=[o for o,p in old.items() if p & np]
        if len(reciprocal)!=1 or len(overlaps)!=1 or len(parents)!=1 or n in claimed:conflicts.append(oid);continue
        result[oid]=n;claimed.add(n)
    return result,conflicts

def normalize(v):
    n=math.hypot(*v)
    if n==0:raise ValueError('zero tangent')
    return (v[0]/n,v[1]/n)
def gap_score(p,q,tp,tq,kp,kq,max_gap,side_ambiguous=False):
    finite(*p,*q,*tp,*tq,kp,kq,max_gap)
    if max_gap<=0:raise ValueError('max gap')
    dx,dy=q[0]-p[0],q[1]-p[1];d=math.hypot(dx,dy)
    if d==0 or d>max_gap:return None
    u=(dx/d,dy/d);a=normalize(tp);b=normalize(tq)
    # tangents point OUT of each endpoint, so q tangent should face -u.
    ca=max(-1.,min(1.,a[0]*u[0]+a[1]*u[1]));cb=max(-1.,min(1.,-b[0]*u[0]-b[1]*u[1]))
    if min(ca,cb)<.5:return None # >60 degree mismatch stays unresolved
    cost=.35*d/max_gap+.35*((1-ca)+(1-cb))/2+.2*min(1.,abs(kp+kq)*d)+.1*int(side_ambiguous)
    return cost

def hermite_bridge(p,q,tp,tq,steps=32):
    if not isinstance(steps,int) or steps<2:raise ValueError('bridge samples')
    d=math.dist(p,q);a=normalize(tp);b=normalize(tq);out=[]
    for i in range(steps+1):
        t=i/steps;h00=2*t**3-3*t*t+1;h10=t**3-2*t*t+t;h01=-2*t**3+3*t*t;h11=t**3-t*t
        out.append(tuple(h00*p[k]+h10*d*a[k]+h01*q[k]-h11*d*b[k] for k in range(2)))
    return out

def supercover(p,q):
    """All grid cells intersecting closed line segment; exact slabs for float inputs."""
    out=set();dx=q[0]-p[0];dy=q[1]-p[1]
    for y in range(math.floor(min(p[1],q[1])),math.floor(max(p[1],q[1]))+1):
      for x in range(math.floor(min(p[0],q[0])),math.floor(max(p[0],q[0]))+1):
        lo,hi=0.,1.
        for start,delta,a,b in ((p[0],dx,x,x+1),(p[1],dy,y,y+1)):
            if delta==0:
                if not a<=start<=b:lo,hi=1.,0.;break
            else:
                u,v=(a-start)/delta,(b-start)/delta;lo=max(lo,min(u,v));hi=min(hi,max(u,v))
        if lo<=hi:out.add((x,y))
    return out

def gap_candidates(endpoints,max_gap,barrier=frozenset()):
    """Endpoint records: id,p,tangent,curvature. Rank then ID tie-break; no blind apply."""
    out=[]
    for i,a in enumerate(endpoints):
      for b in endpoints[i+1:]:
        score=gap_score(a['p'],b['p'],a['tangent'],b['tangent'],a.get('curvature',0),b.get('curvature',0),max_gap)
        if score is None:continue
        points=hermite_bridge(a['p'],b['p'],a['tangent'],b['tangent']);cells=set()
        for p,q in zip(points,points[1:]):cells.update(supercover(p,q))
        cells.discard(tuple(map(math.floor,a['p'])));cells.discard(tuple(map(math.floor,b['p'])))
        if cells & barrier:continue
        out.append({'ends':tuple(sorted((a['id'],b['id']))),'score':score,'cells':frozenset(cells),'automatic':False})
    return sorted(out,key=lambda c:(c['score'],c['ends']))

def signed_area(a,b,c):return ((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2

def polygon_area(p):return abs(sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(p,p[1:]+p[:1])))/2 if len(p)>2 else 0.
def clip_polygon(poly,axis,bound,keep_greater):
    if not poly:return []
    out=[]
    def inside(p):return p[axis]>=bound if keep_greater else p[axis]<=bound
    a=poly[-1]
    for b in poly:
        ia,ib=inside(a),inside(b)
        if ia!=ib:
            t=(bound-a[axis])/(b[axis]-a[axis]);out.append(tuple(a[k]+t*(b[k]-a[k]) for k in (0,1)))
        if ib:out.append(b)
        a=b
    return out

def area_resample(image,out_w,out_h):
    """Exact overlap integral of piecewise-constant source pixels, axis-aligned.
    More general mesh/projective path uses the same convex polygon clipping in
    DESTINATION coordinates, not a constant source-area Jacobian approximation.
    """
    if min(out_w,out_h)<1 or int(out_w)!=out_w or int(out_h)!=out_h:raise ValueError('output dimensions')
    h=len(image);w=len(image[0]);sx=w/out_w;sy=h/out_h;out=[]
    for oy in range(out_h):
        row=[]
        for ox in range(out_w):
            x0,x1=ox*sx,(ox+1)*sx;y0,y1=oy*sy,(oy+1)*sy;s=0.
            for y in range(math.floor(y0),math.ceil(y1)):
              for x in range(math.floor(x0),math.ceil(x1)):
                weight=max(0,min(x1,x+1)-max(x0,x))*max(0,min(y1,y+1)-max(y0,y))
                s+=image[y][x]*weight/(sx*sy)
            row.append(s)
        out.append(row)
    return out

def liquify_point(point,center,radius,amount,kind='push',drag=(0.,0.),protect=0.,pressure=1.):
    finite(*point,*center,radius,amount,*drag);unit(protect);unit(pressure)
    if radius<=0:raise ValueError('radius')
    x,y=point[0]-center[0],point[1]-center[1];r=math.hypot(x,y)/radius
    if r>=1:return tuple(point)
    w=(1-r*r)**2*amount*(1-protect)*pressure
    if kind=='push':d=(drag[0]*w,drag[1]*w)
    elif kind in ('inflate','pinch'):
        s=w if kind=='inflate' else -w;d=(x*s,y*s)
    elif kind=='twirl':d=(math.cos(w)*x-math.sin(w)*y-x,math.sin(w)*x+math.cos(w)*y-y)
    else:raise ValueError('liquify kind')
    return (point[0]+d[0],point[1]+d[1])

def safe_mesh_update(rest,current,proposed,faces,min_area_ratio=1e-4):
    """Reference line search. Faces must be nondegenerate, same winding.
    Production contract additionally checks nonadjacent overlap and boundary simplicity.
    """
    for a,b,c in faces:
        if signed_area(rest[a],rest[b],rest[c])<=0:raise ValueError('invalid rest face')
    for exponent in range(25):
        t=2.**(-exponent);candidate=[tuple(a[k]+t*(b[k]-a[k]) for k in (0,1)) for a,b in zip(current,proposed)]
        if all(signed_area(candidate[a],candidate[b],candidate[c])>=min_area_ratio*signed_area(rest[a],rest[b],rest[c]) for a,b,c in faces):return candidate,t
    raise ValueError('cannot admit deformation; preserve candidate')

def inverse_triangle(p,src,dst):
    den=2*signed_area(*dst)
    if den==0:raise ValueError('singular triangle')
    w=[2*signed_area(p,dst[1],dst[2])/den,2*signed_area(dst[0],p,dst[2])/den,2*signed_area(dst[0],dst[1],p)/den]
    if min(w)<-1e-12:return None
    return tuple(sum(w[i]*src[i][k] for i in range(3)) for k in (0,1))

def line_ink(rgba,mode='dark'):
    from numeric_color_v1 import linear,SRGB
    r,g,b,a=rgba;unit(a);finite(r,g,b)
    if mode=='alpha':return a
    Y=clamp(sum(c*w for c,w in zip(map(linear,(r,g,b)),SRGB[1])))
    if mode=='dark':return a*(1-Y)
    if mode=='light':return a*Y
    raise ValueError('line polarity')

def skeleton_endpoint_records(skeleton):
    h=len(skeleton);w=len(skeleton[0]);points={(x,y) for y in range(h) for x in range(w) if skeleton[y][x]}
    def neighbors(p):return sorted((q for q in points if q!=p and max(abs(q[0]-p[0]),abs(q[1]-p[1]))==1),key=lambda q:(q[1],q[0]))
    out=[]
    for p in sorted(points,key=lambda q:(q[1],q[0])):
        if len(neighbors(p))!=1:continue
        path=[p];prev=None;cur=p
        for _ in range(5):
            nxt=[q for q in neighbors(cur) if q!=prev]
            if len(nxt)!=1:break
            prev,cur=cur,nxt[0];path.append(cur)
        if len(path)<2:continue
        tp=normalize((p[0]-path[-1][0],p[1]-path[-1][1]));k=0.
        if len(path)>2:
            a,b,c=path[0],path[len(path)//2],path[-1];den=math.dist(a,b)*math.dist(b,c)*math.dist(c,a)
            if den:k=-4*signed_area(a,b,c)/den
        out.append({'id':f'end-{p[1]}-{p[0]}','p':(p[0]+.5,p[1]+.5),'tangent':tp,'curvature':k})
    return out

def endpoint_segment_candidate(endpoint,a,b,max_gap):
    """T-junction candidate; segment tangent is not required to face the tip."""
    vx,vy=b[0]-a[0],b[1]-a[1];den=vx*vx+vy*vy
    if not den:return None
    p=endpoint['p'];t=((p[0]-a[0])*vx+(p[1]-a[1])*vy)/den
    if not 0<t<1:return None
    q=(a[0]+t*vx,a[1]+t*vy);d=math.dist(p,q)
    if not 0<d<=max_gap:return None
    u=normalize((q[0]-p[0],q[1]-p[1]));tip=normalize(endpoint['tangent']);alignment=sum(x*y for x,y in zip(u,tip))
    if alignment<.5:return None
    cost=.45*d/max_gap+.35*(1-alignment)+.2*min(1,abs(endpoint.get('curvature',0))*d)
    return {'point':q,'score':cost,'kind':'end-segment','automatic':False}

def clip_convex(subject,clip):
    """Sutherland-Hodgman, CCW convex clip polygon, exact arithmetic if inputs Fraction."""
    out=list(subject)
    for a,b in zip(clip,clip[1:]+clip[:1]):
        source=out;out=[]
        if not source:break
        def side(p):return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
        p=source[-1];sp=side(p)
        for q in source:
            sq=side(q)
            if (sp>=0)!=(sq>=0):
                t=sp/(sp-sq);out.append(tuple(p[k]+t*(q[k]-p[k]) for k in (0,1)))
            if sq>=0:out.append(q)
            p,sp=q,sq
    return out

def mesh_is_injective(points,faces):
    # Exact predicates for the admitted binary64 coordinates. Absolute epsilon
    # must not admit tiny overlaps or reject legitimately small documents.
    points=[tuple(Fraction(v) for v in p) for p in points]
    boundary={}
    for tri in faces:
        if signed_area(*(points[i] for i in tri))<=0:return False
        for a,b in zip(tri,tri[1:]+tri[:1]):
            key=tuple(sorted((a,b)));boundary[key]=boundary.get(key,0)+1
    # Positive-area overlaps of any different triangle are forbidden, including
    # triangles that share a vertex but overlap away from that vertex.
    for i,t in enumerate(faces):
      for u in faces[i+1:]:
        contact=clip_convex([points[k] for k in t],[points[k] for k in u])
        if polygon_area(contact)>0:return False
        common=sorted(set(t)&set(u))
        if not common and contact:return False
        if len(common)==1 and any(p!=points[common[0]] for p in contact):return False
        if len(common)==2:
            a,b=(points[k] for k in common)
            for p in contact:
                if signed_area(a,b,p)!=0 or any(not min(a[k],b[k])<=p[k]<=max(a[k],b[k]) for k in (0,1)):return False
    return True

def safe_mesh_update_global(rest,current,proposed,faces,min_area_ratio=1e-4):
    if len(rest)!=len(current) or len(rest)!=len(proposed):raise ValueError('mesh size')
    for p in (*rest,*current,*proposed):finite(*p)
    if not mesh_is_injective(rest,faces):raise ValueError('invalid rest mesh')
    if not mesh_is_injective(current,faces):raise ValueError('invalid current mesh')
    for e in range(25):
        t=2.**(-e);c=[tuple(a[k]+t*(b[k]-a[k]) for k in (0,1)) for a,b in zip(current,proposed)]
        if all(signed_area(*(c[i] for i in tri))>=min_area_ratio*signed_area(*(rest[i] for i in tri)) for tri in faces) and mesh_is_injective(c,faces):return c,t
    raise ValueError('cannot admit deformation')

def restore_displacement(displacement,point,center,radius,strength,protect=0.):
    unit(strength);unit(protect);finite(*displacement,*point,*center,radius)
    if radius<=0:raise ValueError('radius')
    r=math.dist(point,center)/radius
    w=0. if r>=1 else (1-r*r)**2*strength*(1-protect)
    return tuple(v*(1-w) for v in displacement)

def transformed_area(source_cells,out_w,out_h):
    """Integrate nonoverlapping CCW convex destination polygons (polygon,value).
    Transparent outside the transformed footprint. Destination pixels have unit
    area; affine/projective per-source-pixel quads and mesh-split triangles work.
    This oracle deliberately avoids a source-space constant-Jacobian shortcut.
    """
    if min(out_w,out_h)<1:raise ValueError('dimensions')
    out=[[0. for _ in range(out_w)] for _ in range(out_h)]
    for poly,value in source_cells:
        finite(value,*(v for p in poly for v in p))
        if polygon_area(poly)==0:continue
        for y in range(out_h):
          for x in range(out_w):
            square=[(x,y),(x+1,y),(x+1,y+1),(x,y+1)]
            out[y][x]+=value*polygon_area(clip_convex(poly,square))
    return out
