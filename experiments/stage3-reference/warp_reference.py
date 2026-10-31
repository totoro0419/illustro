"""AUD006: exact rational, geometry-driven triangle-mesh reference (not product GPU)."""
from fractions import Fraction as F
from math import floor

Z = (F(0), F(0), F(0), F(0))
ONE = F(1)

def frac(value):
    return value if isinstance(value, F) else F(value)

def rgba(r, g, b, a=1):
    a = frac(a)
    return (frac(r)*a, frac(g)*a, frac(b)*a, a)

def over(s, d):
    return tuple(s[k] + (1-s[3])*d[k] for k in range(4))

def orient(a, b, p):
    return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])

def edge_inclusive(a, b):
    dx, dy = b[0]-a[0], b[1]-a[1]
    # Positive polygon orientation in increasing-downward pixel coordinates.
    return dy < 0 or (dy == 0 and dx > 0)

def barycentric(dest, p):
    a, b, c = dest
    det = orient(a, b, c)
    if det == 0:
        raise ValueError('degenerate output triangle')
    if det < 0:
        raise ValueError('triangle destination must have positive winding')
    weights = (orient(b, c, p), orient(c, a, p), orient(a, b, p))
    inclusive = (edge_inclusive(b, c), edge_inclusive(c, a), edge_inclusive(a, b))
    if not all(w > 0 or (w == 0 and inc) for w, inc in zip(weights, inclusive)):
        return None
    return tuple(w / det for w in weights)

def barycentric_independent(dest, p):
    # Independent affine-inverse formulation (not edge-function interpolation).
    a, b, c = dest
    dx, dy = b[0]-a[0], b[1]-a[1]
    ex, ey = c[0]-a[0], c[1]-a[1]
    det = dx*ey-dy*ex
    if det <= 0:
        raise ValueError('positive, nondegenerate winding required')
    px, py = p[0]-a[0], p[1]-a[1]
    v = (px*ey-py*ex)/det
    w = (dx*py-dy*px)/det
    u = 1-v-w
    bary = (u, v, w)
    inclusive = (edge_inclusive(b, c), edge_inclusive(c, a), edge_inclusive(a, b))
    if any(z < 0 or (z == 0 and not incl) for z, incl in zip(bary, inclusive)):
        return None
    return bary

def sample_bilinear(src, x, y):
    # Coordinates: pixel centers (0.5,0.5); clamp-to-edge premultiplied RGBA.
    h, w = len(src), len(src[0])
    x = min(max(x-F(1, 2), F(0)), F(w-1))
    y = min(max(y-F(1, 2), F(0)), F(h-1))
    x0, y0 = floor(x), floor(y)
    x1, y1 = min(x0+1, w-1), min(y0+1, h-1)
    tx, ty = x-x0, y-y0
    return tuple(
        (1-ty)*((1-tx)*src[y0][x0][i] + tx*src[y0][x1][i])
        + ty*((1-tx)*src[y1][x0][i] + tx*src[y1][x1][i])
        for i in range(4))

def sample_bilinear_independent(src, x, y):
    h, w = len(src), len(src[0])
    x = min(max(x-F(1, 2), F(0)), F(w-1))
    y = min(max(y-F(1, 2), F(0)), F(h-1))
    lo_x, lo_y = floor(x), floor(y)
    weights_x = ((lo_x, 1-(x-lo_x)), (min(lo_x+1, w-1), x-lo_x))
    weights_y = ((lo_y, 1-(y-lo_y)), (min(lo_y+1, h-1), y-lo_y))
    return tuple(sum(src[iy][ix][k]*wy*wx for iy, wy in weights_y for ix, wx in weights_x)
                 for k in range(4))


def cubic_bspline(src, x, y):
    """Nonnegative separable cubic B-spline on premul RGBA with clamped edge.

    This is a correctness/quality reference candidate, not a product default.
    """
    h, w = len(src), len(src[0])
    fx, fy = x-F(1, 2), y-F(1, 2)
    ix, iy = floor(fx), floor(fy)
    tx, ty = fx-ix, fy-iy
    def weights(t):
        return ((1-t)**3/F(6), (3*t**3-6*t**2+4)/6,
                (-3*t**3+3*t**2+3*t+1)/6, t**3/6)
    wx, wy = weights(tx), weights(ty)
    return tuple(sum(wx[a]*wy[b]*src[min(max(iy+b-1, 0), h-1)][min(max(ix+a-1, 0), w-1)][k]
                     for a in range(4) for b in range(4)) for k in range(4))

def render_mesh(src, triangles, width, height, samples=2, independent=False, interpolation='bilinear'):
    """Draw source triangles in explicit order; sample over each fold before averaging."""
    if not src or not src[0] or width <= 0 or height <= 0 or samples < 1:
        raise ValueError('invalid dimensions')
    if any(len(row) != len(src[0]) for row in src):
        raise ValueError('ragged image')
    bfunc = barycentric_independent if independent else barycentric
    if interpolation not in ('bilinear','cubic-bspline'):
        raise ValueError('unknown interpolation')
    interp = cubic_bspline if interpolation == 'cubic-bspline' else (
        sample_bilinear_independent if independent else sample_bilinear)
    out = []
    for row in range(height):
        pixels = []
        for col in range(width):
            aggregate = [F(0)]*4
            for v in range(samples):
                for u in range(samples):
                    point = (F(col) + F(2*u+1, 2*samples), F(row) + F(2*v+1, 2*samples))
                    color = Z
                    for tri in triangles:
                        if len(tri['src']) != 3 or len(tri['dst']) != 3:
                            raise ValueError('triangles need three vertices')
                        bary = bfunc(tri['dst'], point)
                        if bary is None:
                            continue
                        px = sum(w*tri['src'][i][0] for i, w in enumerate(bary))
                        py = sum(w*tri['src'][i][1] for i, w in enumerate(bary))
                        color = over(interp(src, px, py), color)
                    for k in range(4):
                        aggregate[k] += color[k]
            pixels.append(tuple(v / (samples*samples) for v in aggregate))
        out.append(pixels)
    return out

def post_edit(image, edits):
    out = [[tuple(p) for p in row] for row in image]
    for op in edits:
        coverage = op['coverage']
        for y, row in enumerate(out):
            for x, d in enumerate(row):
                c = coverage[y][x]
                if not (0 <= c <= 1):
                    raise ValueError('coverage outside 0..1')
                if op['kind'] == 'paint':
                    s = tuple(c*z for z in op['source'])
                    row[x] = over(s, d)
                elif op['kind'] == 'erase':
                    row[x] = tuple(z*(1-c*op['strength']) for z in d)
                elif op['kind'] == 'replace':
                    r = op['samples'][y][x]
                    row[x] = tuple((1-c)*d[k]+c*r[k] for k in range(4))
                elif op['kind'] == 'alpha_lock':
                    if d[3]:
                        straight = [z/d[3] for z in d[:3]]
                        t = c*op['source'][3]
                        rgb = [(1-t)*z+t*op['color'][k] for k,z in enumerate(straight)]
                        row[x] = tuple(z*d[3] for z in rgb)+(d[3],)
                    else:
                        row[x] = Z
                else:
                    raise ValueError('unrecognized edit')
    return out

def mask_and_clip(img, mask, clip):
    return [[tuple(c*mask[y][x]*clip[y][x] for c in p)
             for x,p in enumerate(row)] for y,row in enumerate(img)]

def blur3(img):
    # Live gaussian-like kernel [1,2,1]/4 separable; transparent black beyond edges.
    h, w = len(img), len(img[0]); weights = (1,2,1)
    def at(x, y, k):
        return img[y][x][k] if 0 <= x < w and 0 <= y < h else F(0)
    return [[tuple(sum(F(weights[j]*weights[i],16)*at(x+i-1, y+j-1, k)
                       for j in range(3) for i in range(3)) for k in range(4))
             for x in range(w)] for y in range(h)]

def gain(img, scale):
    # Live gain: RGB channels only, constrained to premultiplied alpha.
    return [[tuple(min(p[k]*scale, p[3]) for k in range(3))+(p[3],)
             for p in row] for row in img]

def live_fx(img, effects):
    out = img
    for effect in effects:
        if effect['kind'] == 'blur3':
            out = blur3(out)
        elif effect['kind'] == 'gain':
            out = gain(out, effect['factor'])
        else:
            raise ValueError('unknown live effect')
    return out

def pipeline(src, mesh, width, height, edits, mask, clip, effects, samples=2, independent=False):
    warped=render_mesh(src,mesh,width,height,samples,independent=independent)
    edited=post_edit(warped,edits)
    masked=mask_and_clip(edited,mask,clip)
    return live_fx(masked,effects)

def premul_valid(img):
    return all(0 <= q[3] <= 1 and all(0 <= v <= q[3] for v in q[:3])
               for row in img for q in row)
