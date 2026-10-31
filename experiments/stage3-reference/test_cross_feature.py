import unittest
from fractions import Fraction as F
from raster_reference import pixel,blend

def acyclic(edges):
    visiting=set();done=set()
    def visit(n):
        if n in visiting:raise ValueError('cycle')
        if n in done:return
        visiting.add(n)
        for d in edges.get(n,[]):visit(d)
        visiting.remove(n);done.add(n)
    for n in edges:visit(n)
    return True

def blur(values,r):return [sum(values[max(0,i-r):min(len(values),i+r+1)])/len(values[max(0,i-r):min(len(values),i+r+1)]) for i in range(len(values))]

class CrossTests(unittest.TestCase):
    def test_mask_clip_multiply_alpha_exact(self):
        s=pixel(1,0,0,F(1,2));d=pixel(0,0,1,F(1,2))
        self.assertEqual(blend(s,d,'multiply'),(F(1,4),F(0),F(1,4),F(3,4)))
        self.assertEqual(blend(s,d,'normal'),(F(1,2),F(0),F(1,4),F(3,4)))
    def test_clip_cycle_rejected_and_acyclic_reference_valid(self):
        self.assertTrue(acyclic({'layerB':['layerA'],'layerA':[]}))
        with self.assertRaises(ValueError):acyclic({'layerB':['layerA'],'layerA':['layerB']})
        with self.assertRaises(ValueError):acyclic({'group':['child'],'child':['group']})
    def test_halo_filter_tiling_equals_global(self):
        v=list(map(F,[0,0,0,1,0,0,0,0,1,0,0,0]));gold=blur(v,2);out=[]
        for start in range(0,len(v),4):
            lo=max(0,start-2);hi=min(len(v),start+4+2)
            part=blur(v[lo:hi],2);out+=part[start-lo:start-lo+4]
        self.assertEqual(out,gold)
        no_halo=sum((blur(v[i:i+4],2) for i in range(0,len(v),4)),[]);self.assertNotEqual(no_halo,gold)
    def test_fill_connectivity_propagates_beyond_halo(self):
        def fill(line):
            connected=[]
            for i,v in enumerate(line):
                if v:break
                connected.append(i)
            return connected
        self.assertEqual(fill([0]*20),list(range(20)))
        self.assertEqual(fill([0,0,1]+[0]*17),[0,1])
        self.assertIn(19,set(fill([0]*20))-set(fill([0,0,1]+[0]*17)))

if __name__=='__main__':unittest.main()
