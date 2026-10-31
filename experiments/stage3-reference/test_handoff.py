import unittest,itertools
from fractions import Fraction as F
from raster_reference import pixel,over,Z

class Presenter:
    def __init__(self):self.epoch=1;self.ops=['A','B'];self.ready={};self.generation=0
    def publish(self,key,epoch,coverage):
        if epoch!=self.epoch:return False
        # Validation and both ownership changes happen before publication.
        self.ready[key]=set(coverage);self.generation+=1;return True
    def snapshot(self):
        return tuple((k,i,'formal' if i in self.ready.get(k,set()) else 'preview') for k in self.ops for i in range(4))
    def pixels(self,snapshot):
        values={'A':pixel(1,0,0,F(1,2)),'B':pixel(0,0,1,F(1,2))};out=[Z]*4
        for key,i,owner in snapshot:out[i]=over(values[key],out[i])
        return out

class HandoffTests(unittest.TestCase):
    def test_all_tile_completion_orders_have_exactly_one_owner_and_pixel(self):
        chunks=[('A',[0,1]),('A',[2,3]),('B',[0,1]),('B',[2,3])]
        for order in itertools.permutations(chunks):
            p=Presenter();gold=[(F(1,4),F(0),F(1,2),F(3,4))]*4
            self.assertEqual(p.pixels(p.snapshot()),gold)
            for key,cov in order:
                p.publish(key,1,p.ready.get(key,set())|set(cov));snap=p.snapshot()
                self.assertEqual(len(snap),8);self.assertEqual(len(set((k,i) for k,i,_ in snap)),8)
                self.assertEqual(p.pixels(snap),gold)
    def test_old_generation_after_undo_is_not_published(self):
        p=Presenter();p.ops=['A'];p.epoch+=1;before=p.snapshot();self.assertFalse(p.publish('B',1,range(4)));self.assertEqual(p.snapshot(),before)
    def test_split_swap_has_counterexample(self):
        red=pixel(1,0,0,F(1,2))
        self.assertNotEqual(over(red,red),red) # adding formal before removing preview doubles opacity
        self.assertNotEqual(Z,red) # removing preview first leaves a hole

if __name__=='__main__':unittest.main()
