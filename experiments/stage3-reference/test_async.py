import unittest,itertools
from async_reference import Graph,Store,Writer

class AsyncTests(unittest.TestCase):
    def test_required_sequence_reload_is_A(self):
        g=Graph();g.accept('A',1);g.accept('B',2,['A']);g.undo();f=g.save()
        self.assertTrue(g.complete('A'));g.redo();g.complete('B')
        s=Store();s.write(f['sequence'],g.materialize(f));self.assertEqual(s.reload(),{'ops':['A'],'values':[1]});self.assertEqual(g.past,['A','B'])
    def test_all_completion_orders_undo_branch_and_pinned_old_output(self):
        for order in itertools.permutations('ABC'):
            g=Graph();g.accept('A',1);g.accept('B',2);old=g.save();g.undo();g.accept('C',3);new=g.save()
            for k in order:
                before=tuple(g.past);g.complete(k);self.assertEqual(tuple(g.past),before)
                snap=g.snapshot();self.assertEqual(snap['formal']+snap['preview'],('A','C'))
                self.assertFalse(set(snap['formal'])&set(snap['preview']))
            self.assertEqual(g.materialize(old)['ops'],['A','B']);self.assertIn('B',g.pins())
            self.assertEqual(g.materialize(new)['ops'],['A','C'])
    def test_multi_save_reverse_publication(self):
        g=Graph();g.accept('A',1);a=g.save();g.accept('B',2);b=g.save();g.complete('B');g.complete('A')
        s=Store();s.write(b['sequence'],g.materialize(b));s.write(a['sequence'],g.materialize(a));self.assertEqual(s.reload()['ops'],['A','B'])
    def test_failure_dependent_only_rescue(self):
        g=Graph();g.accept('A',1);g.accept('B',2,['A']);g.accept('C',3);f=g.save();g.complete('C');g.fail('A')
        self.assertEqual([g.jobs[x]['state'] for x in 'ABC'],['failed','blocked','ready']);self.assertEqual(f['state'],'failed')
        with self.assertRaises(ValueError):g.rescue()
        g.rescue(True);new=g.save();self.assertEqual(g.materialize(new),{'ops':['C'],'values':[3]})
        self.assertIn('A',g.pins()) # failed original fence/input remains rescue evidence
    def test_retry_success(self):
        g=Graph();g.accept('A',1);g.fail('A',False);g.retry('A');g.complete('A');self.assertEqual(g.materialize(g.save())['values'],[1])
    def test_device_loss_stale_and_key_rejected_view_independent(self):
        g=Graph();g.accept('A',1);f=g.save();g.lose_device();g.view+=1
        self.assertFalse(g.complete('A',device=1));self.assertFalse(g.complete('A',device=2,identity='other'))
        self.assertEqual(g.snapshot()['view'],1);self.assertTrue(g.complete('A',device=2));self.assertEqual(g.materialize(f)['ops'],['A'])
    def test_crash_every_stage_quota_retry_preserve_previous(self):
        for stage in ['blocks','manifest','checked']:
            s=Store();s.write(1,{'ops':['A']});self.assertFalse(s.write(2,{'ops':['B']},crash=stage));self.assertEqual(s.reload(),{'ops':['A']})
            self.assertFalse(s.write(2,{'ops':['B']},quota=True));self.assertEqual(s.reload(),{'ops':['A']})
            self.assertTrue(s.write(2,{'ops':['B']}));self.assertEqual(s.reload(),{'ops':['B']})
    def test_writer_exhaustion_and_cancel(self):
        for reserve in [1,2,3]:
            w=Writer(4,reserve)
            for i in range(4-reserve):self.assertTrue(w.sample(i))
            self.assertFalse(w.sample('overflow'));self.assertIsNone(w.end());self.assertEqual(w.samples,list(range(4-reserve)));self.assertEqual(w.status,'recoverable')
        w=Writer(4);w.sample(1);self.assertIsNone(w.end(cancel=True));self.assertEqual(w.samples,[1])
        w=Writer(4);w.sample(1);w.sample(2);self.assertEqual(w.end(),(1,2))
    def test_graph_reject_unknown_dependency(self):
        g=Graph()
        with self.assertRaises(ValueError):g.accept('A',1,['B'])

if __name__=='__main__':unittest.main()
