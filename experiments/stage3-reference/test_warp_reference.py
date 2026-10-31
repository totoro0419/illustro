"""AUD006 scoped evidence: geometry Warp + fixed edits + live effects, exact F."""
import json
import unittest
from copy import deepcopy
from fractions import Fraction as F
from warp_reference import (
    Z, rgba, over, barycentric, barycentric_independent, render_mesh,
    sample_bilinear, cubic_bspline, pipeline, post_edit, blur3, gain, live_fx, premul_valid,
)

def tri(src, dst):
    return {'src': [[F(a), F(b)] for a,b in src], 'dst': [[F(a), F(b)] for a,b in dst]}

def square(size=3, dx=0, dy=0):
    s=size
    return [
        tri([(0,0),(s,0),(0,s)],[(dx,dy),(s+dx,dy),(dx,s+dy)]),
        tri([(s,0),(s,s),(0,s)],[(s+dx,dy),(s+dx,s+dy),(dx,s+dy)]),
    ]

def ones(h,w):return [[F(1) for _ in range(w)] for _ in range(h)]

def src3():
    return [
        [rgba(1,0,0,F(1,2)),rgba(0,1,0,F(3,4)),rgba(0,0,1,1)],
        [rgba(1,1,0,1),rgba(0,1,1,F(1,2)),rgba(1,0,1,F(1,4))],
        [rgba(F(1,2),F(1,4),F(3,4),1),rgba(0,0,0,0),rgba(1,1,1,F(3,4))],
    ]

def folded_mesh():
    # The third triangle doubles back over part of the first two.
    return square(3)+[tri([(0,0),(2,0),(0,2)],[(F(1,2),F(1,2)),(F(5,2),F(1,2)),(F(1,2),F(5,2))])]

def flatten(image):return [p for row in image for p in row]

def fjson(v):
    if isinstance(v,F):return {'f':[v.numerator,v.denominator]}
    if isinstance(v,(tuple,list)):return [fjson(x) for x in v]
    if isinstance(v,dict):return {k:fjson(x) for k,x in v.items()}
    return v

def fromjson(v):
    if isinstance(v,list):return [fromjson(x) for x in v]
    if isinstance(v,dict):
        if set(v)=={'f'}:return F(*v['f'])
        return {k:fromjson(x) for k,x in v.items()}
    return v

class WarpReferenceTests(unittest.TestCase):
    def test_identity_real_triangles_not_premapped_fragments(self):
        src=src3()
        self.assertEqual(render_mesh(src,square(),3,3,samples=1),src)
        self.assertEqual(render_mesh(src,square(),3,3,samples=1,independent=True),src)

    def test_bilinear_midpoint_has_hand_computed_pixel(self):
        source=[[rgba(1,0,0),rgba(0,1,0)], [rgba(0,0,1),rgba(1,1,1)]]
        self.assertEqual(sample_bilinear(source,F(1),F(1)),(F(1,2),)*3+(F(1),))

    def test_two_triangulations_avoid_shared_seam_double_hit(self):
        image=[[rgba(1,1,1) for _ in range(3)] for _ in range(3)]
        a=render_mesh(image,square(3),3,3,samples=4)
        b=render_mesh(image,[square(3)[1],square(3)[0]],3,3,samples=4)
        self.assertEqual(a,b)
        self.assertEqual(a,[[rgba(1,1,1)]*3 for _ in range(3)])

    def test_fold_fragment_order_and_translucent_compositing(self):
        src=[[rgba(1,0,0,F(1,2)),rgba(0,0,1,F(1,2))]]
        d=[(0,0),(2,0),(0,2)]
        red=tri([(F(1,2),F(1,2))]*3,d)
        blue=tri([(F(3,2),F(1,2))]*3,d)
        out=render_mesh(src,[red,blue],2,2,samples=1)
        self.assertEqual(out[0][0],(F(1,4),F(0),F(1,2),F(3,4)))
        rev=render_mesh(src,[blue,red],2,2,samples=1)
        self.assertEqual(rev[0][0],(F(1,2),F(0),F(1,4),F(3,4)))
        self.assertNotEqual(out,rev)

    def test_live_effect_analytic_golden_and_order(self):
        black=rgba(0,0,0,1); q=[[Z]*3 for _ in range(3)]
        q[1]=[black,rgba(F(3,4),0,0,1),Z]
        blur=blur3(q)
        self.assertEqual(blur[1][1],(F(3,16),F(0),F(0),F(3,8)))
        self.assertEqual(blur[0][1],(F(3,32),F(0),F(0),F(3,16)))
        self.assertEqual(gain(blur,F(2))[1][1],(F(3,8),F(0),F(0),F(3,8)))
        self.assertEqual(blur3(gain(q,F(2)))[1][1],(F(1,4),F(0),F(0),F(3,8)))
        self.assertNotEqual(gain(blur,F(2)),blur3(gain(q,F(2))))

    def test_paint_erase_alpha_lock_and_fixed_smudge_after_real_warp_reedit(self):
        source=[[rgba(1,0,0),rgba(0,0,1)],[Z,Z]]
        warped=render_mesh(source,square(2),3,2,samples=1)
        # fixed sample is the completed color at capture time, not a new source read
        frozen=warped[0][0]
        cov=[[F(1),F(1),F(0)],[F(0)]*3]
        edits=[
            {'kind':'paint','coverage':[[F(0),F(1),F(0)],[F(0)]*3], 'source':rgba(0,1,0,F(1,2))},
            {'kind':'erase','coverage':[[F(1),F(0),F(0)],[F(0)]*3],'strength':F(1)},
            {'kind':'replace','coverage':[[F(0),F(1,2),F(0)],[F(0)]*3], 'samples':[[frozen]*3,[frozen]*3]},
            {'kind':'alpha_lock','coverage':cov,'source':rgba(0,1,0,F(1,2)), 'color':(F(0),F(1),F(0))}
        ]
        old=post_edit(warped,edits)
        newwarp=render_mesh(source,square(2,1,0),3,2,samples=1)
        updated=post_edit(newwarp,edits)
        self.assertEqual(old[0][0],Z)
        self.assertEqual(updated[0][0],Z)
        self.assertEqual(edits[2]['samples'][0][1],frozen)
        self.assertNotEqual(old[0][1],updated[0][1])
        self.assertTrue(premul_valid(updated))

    def test_full_fold_two_live_effects_mask_clip_and_versions(self):
        source=src3(); mesh=folded_mesh(); ms=ones(4,4); cs=ones(4,4)
        ms[1][1]=F(1,2);cs[1][1]=F(3,4);ms[2][0]=F(0)
        frozen=render_mesh(source,mesh,4,4,2)[1][1]
        paintcov=[[F(1,2) if (x+y)%2==0 else F(0) for x in range(4)] for y in range(4)]
        erasecov=[[F(1,2) if x==2 else F(0) for x in range(4)] for y in range(4)]
        replacecov=[[F(1,2) if (x,y)==(1,1) else F(0) for x in range(4)] for y in range(4)]
        ops=[{'kind':'paint','source':rgba(0,1,0,F(1,2)),'coverage':paintcov},
             {'kind':'erase','strength':F(1,2),'coverage':erasecov},
             {'kind':'replace','samples':[[frozen]*4 for _ in range(4)],'coverage':replacecov}]
        fx=[{'kind':'blur3'}, {'kind':'gain','factor':F(3,2)}]
        before=pipeline(source,mesh,4,4,ops,ms,cs,fx,2)
        self.assertEqual(before,pipeline(source,mesh,4,4,ops,ms,cs,fx,2,True))
        self.assertTrue(premul_valid(before))
        self.assertEqual(before[2][0][3]>0,True) # blur may spread beyond masked zero
        movedmesh=deepcopy(mesh)
        for node in movedmesh:
            node['dst']=[[x+F(1,2),y] for x,y in node['dst']]
        after=pipeline(source,movedmesh,4,4,ops,ms,cs,fx,2)
        self.assertEqual(after,pipeline(source,movedmesh,4,4,ops,ms,cs,fx,2,True))
        self.assertNotEqual(after,before)
        self.assertEqual(ops[2]['samples'][1][1],frozen)
        ms[1][1]=F(1)
        self.assertNotEqual(after,pipeline(source,movedmesh,4,4,ops,ms,cs,fx,2))
        self.assertTrue(premul_valid(after))

    def test_checkpoint_undo_redo_save_reload_keeps_old_warp_and_fixed_r(self):
        source=src3(); oldmesh=folded_mesh(); ms=ones(4,4);cs=ones(4,4)
        basis=render_mesh(source,oldmesh,4,4,2)
        op={'kind':'replace','coverage':[[F(1,2)]*4 for _ in range(4)],
            'samples':deepcopy(basis),'sample_basis':'rev-01'}
        state={'source':source,'mesh':oldmesh,'ops':[op],'mask':ms,'clip':cs,
               'effects':[{'kind':'blur3'},{'kind':'gain','factor':F(3,2)}]}
        snap0=deepcopy(state); saved=json.loads(json.dumps(fjson(snap0)))
        def evaluate(s):return pipeline(s['source'],s['mesh'],4,4,s['ops'],s['mask'],s['clip'],s['effects'],2)
        expected=evaluate(snap0)
        edited=deepcopy(snap0)
        for t in edited['mesh']:t['dst']=[[x+F(1,2),y] for x,y in t['dst']]
        moved=evaluate(edited)
        self.assertNotEqual(expected,moved)
        self.assertEqual(evaluate(snap0),expected) # undo
        self.assertEqual(evaluate(edited),moved) # redo
        self.assertEqual(evaluate(fromjson(saved)),expected) # save fence pinned earlier root
        self.assertEqual(evaluate(snap0),expected)
        self.assertEqual(edited['ops'][0]['samples'],snap0['ops'][0]['samples'])

    def test_multi_cell_bilinear_and_two_meshes_cross_oracle(self):
        source=src3()
        for samples in (1,2,3,4):
            for mesh in (square(),folded_mesh(),square(3,1,0)):
                ref=render_mesh(source,mesh,4,4,samples)
                alt=render_mesh(source,mesh,4,4,samples,independent=True)
                self.assertEqual(ref,alt)
                self.assertTrue(premul_valid(ref))

    def test_halo_required_for_live_effect_tiling(self):
        src=src3();mesh=folded_mesh()
        base=render_mesh(src,mesh,4,4,2)
        global_blur=blur3(base)
        # Decompose output into two horizontal bands with exact 1-row halo.
        upper=blur3(base[:3])[:2]
        lower=blur3(base[1:])[1:]
        self.assertEqual(global_blur,upper+lower)
        self.assertNotEqual(global_blur,blur3(base[:2])+blur3(base[2:]))

    def test_cubic_reference_golden_and_premul_bounds(self):
        grid=[[Z]*3 for _ in range(3)]
        grid[1]=[Z,rgba(1,0,0,1),Z]
        self.assertEqual(cubic_bspline(grid,F(3,2),F(3,2)),(F(4,9),F(0),F(0),F(4,9)))
        self.assertEqual(cubic_bspline([[rgba(1,0,1)]*3 for _ in range(3)],F(7,5),F(9,5)),rgba(1,0,1))
        result=render_mesh(src3(),folded_mesh(),4,4,3,interpolation='cubic-bspline')
        self.assertTrue(premul_valid(result))
        self.assertNotEqual(result,render_mesh(src3(),folded_mesh(),4,4,3,interpolation='bilinear'))
        with self.assertRaises(ValueError):
            render_mesh(src3(),square(),3,3,interpolation='unknown')

    def test_invalid_mesh_rejected(self):
        with self.assertRaises(ValueError):render_mesh(src3(),[tri([(0,0)]*3,[(0,0),(1,1),(2,2)])],2,2)
        with self.assertRaises(ValueError):render_mesh(src3(),[tri([(0,0)]*3,[(0,0),(0,2),(2,0)])],2,2)
        with self.assertRaises(ValueError):render_mesh(src3(),[],0,2)
        with self.assertRaises(ValueError):post_edit([[Z]],[{'kind':'erase','strength':F(1),'coverage':[[F(3,2)]]}])

if __name__=='__main__':unittest.main()
