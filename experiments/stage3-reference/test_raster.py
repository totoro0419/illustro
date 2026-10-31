import unittest
from fractions import Fraction as F
from copy import deepcopy
from raster_reference import *

RED=pixel(1,0,0,1); BLUE=pixel(0,0,1,1); WHITE=pixel(1,1,1,1)
def doc(): return dict(original=[RED,BLUE],mapping=[[(0,F(1))],[(1,F(1))],[],[]],ops=[],mask=[F(1)]*4,clip=[F(1)]*4,revision=0)
def paint(coverage,alpha=F(1,2),lock=False):return dict(kind='paint',source=pixel(0,1,0,alpha),color=(F(0),F(1),F(0)),coverage=list(map(F,coverage)),alpha_lock=lock)

class RasterTests(unittest.TestCase):
    def test_erase_not_overlay(self):
        d=doc();d['ops']=[dict(kind='erase',strength=F(1),coverage=[F(1),F(0),F(0),F(0)])]
        self.assertEqual(evaluate(d),[Z,BLUE,Z,Z]);self.assertEqual(d['original'],[RED,BLUE])
        self.assertNotEqual(over(Z,RED),Z) # rejected candidate counterexample
    def test_half_paint_half_erase_mask_clip_literal(self):
        d=doc();d['ops']=[paint([1,0,0,0]),dict(kind='erase',strength=F(1,2),coverage=[F(1),F(0),F(0),F(0)])]
        d['mask'][0]=F(1,2);d['clip'][0]=F(1,2)
        self.assertEqual(evaluate(d)[0],(F(1,16),F(1,16),F(0),F(1,8)))
    def test_reedit_fixed_brush_position_and_undo_save(self):
        h=History(doc());h.edit(lambda d:d['ops'].append(paint([1,0,0,0])))
        first=h.save();h.edit(lambda d:d.update(mapping=[[],[],[(0,F(1))],[(1,F(1))]]))
        self.assertEqual(evaluate(h.doc),[pixel(0,1,0,F(1,2)),Z,RED,BLUE])
        h.undo();self.assertEqual(evaluate(h.doc),[(F(1,2),F(1,2),F(0),F(1)),BLUE,Z,Z])
        h.redo();saved=h.save();self.assertEqual(evaluate(reload(saved)),evaluate(h.doc))
        self.assertEqual(evaluate(first)[0],(F(1,2),F(1,2),F(0),F(1)))
        self.assertEqual(saved['original'],[list(RED),list(BLUE)])
    def test_smudge_captures_color_no_resample_no_double_coverage(self):
        d=doc();op=capture_smudge(d,[F(0),F(1,2),F(0),F(0)],[0,0,0,0]);d['ops'].append(op)
        self.assertEqual(evaluate(d)[1],(F(1,2),F(0),F(1,2),F(1)))
        d['mapping']=[[(1,F(1))],[],[],[]]
        self.assertEqual(evaluate(d)[1],pixel(1,0,0,F(1,2)))
        self.assertEqual(evaluate(reload(d)),evaluate(d))
    def test_alpha_lock_preserves_current_alpha(self):
        d=doc();d['original'][0]=pixel(1,0,0,F(1,4));d['ops']=[paint([1,0,1,0],lock=True)]
        self.assertEqual(evaluate(d)[0],(F(1,8),F(1,8),F(0),F(1,4)))
        self.assertEqual(evaluate(d)[2],Z)
        d['mapping']=[[],[(0,F(1))],[],[]]
        self.assertEqual(evaluate(d)[0],Z) # lock cannot paint into newly transparent space
    def test_fold_order_selection_and_mask_live(self):
        d=doc();d['mapping']=[[(0,F(1)),(1,F(1,2))],[],[],[]]
        d['ops']=[paint([F(1,2),0,0,0])];d['mask'][0]=F(1,2)
        self.assertEqual(evaluate(d)[0],(F(3,16),F(1,8),F(3,16),F(1,2)))
        # Mask changes downstream; selection coverage remains captured.
        d['mask'][0]=F(1);self.assertEqual(evaluate(d)[0],(F(3,8),F(1,4),F(3,8),F(1)))
    def test_rejected_baked_delta_does_not_survive_upstream_reedit(self):
        # Delta after erasing opaque red = -red; applied after red moved away goes negative.
        delta=tuple(-x for x in RED);self.assertLess((Z[3]+delta[3]),0)
    def test_replace_dependency_stays_immutable(self):
        d=doc();op=capture_smudge(d,[F(0),F(1),F(0),F(0)],[0,0,0,0]);d['ops']=[op]
        d['original'][0]=BLUE;self.assertEqual(evaluate(d)[1],RED)

if __name__=='__main__':unittest.main()
