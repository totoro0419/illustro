import unittest,math
from fractions import Fraction as F
import numeric_additional_v1 as N
class AdditionalNumericTests(unittest.TestCase):
 def test_soft_selection_set_algebra_not_double_alpha(self):
  self.assertEqual(N.selection(.5,.5,'add'),.5)
  self.assertEqual(N.selection(.5,.25,'intersect'),.25)
  self.assertEqual(N.selection(.5,.25,'subtract'),.25)
  self.assertEqual(N.selection(.5,0,'replace'),0)
 def test_euclidean_disk_and_zero_exterior(self):
  a=[[0]*5 for _ in range(5)];a[2][2]=1
  b=N.morphology(a,1);self.assertEqual(sum(map(sum,b)),5)
  self.assertEqual(N.morphology(b,1,True),a)
  self.assertEqual(N.morphology([[1]*3 for _ in range(3)],1,True),[[0,0,0],[0,1,0],[0,0,0]])
 def test_taper_overlap_never_exceeds_diameter(self):
  self.assertAlmostEqual(N.taper(1,2,3,3),49/729,delta=1e-15)
  self.assertEqual(N.taper(1,2,0,0),1)
  self.assertEqual(N.taper(0,0,1,1,.2),.2)
  for i in range(101):self.assertTrue(0<=N.taper(i/50,2,3,3)<=1)
 def test_gradient_hard_stop_stable_ids_and_midpoint(self):
  stops=[(0,'a',0),(.5,'b',.25),(.5,'c',.75),(1,'d',1)]
  self.assertEqual(N.gradient_stop(stops,.5),.75)
  self.assertAlmostEqual(N.gradient_stop(stops,.5-1e-10),.25,places=8)
  self.assertEqual(N.gradient_stop([(0,'a',0),(1,'b',1)],.25,{'a':.25}),.5)
 def test_poisson_impulse_literal_preserved_gradient(self):
  src=[[0,0,0],[0,1,0],[0,0,0]];dst=[[0]*3 for _ in range(3)];mask=[[0,0,0],[0,1,0],[0,0,0]]
  self.assertEqual(N.poisson_heal_scalar(src,dst,mask),src)
  # A constant source has no gradients: destination boundary determines heal.
  self.assertEqual(N.poisson_heal_scalar([[1]*3 for _ in range(3)],dst,mask),dst)
 def test_poisson_boundary_literal_fraction_and_fullmask(self):
  src=[[0]*3 for _ in range(3)];dst=[[0,1,0],[1,0,0],[0,0,0]];mask=[[0,0,0],[0,1,0],[0,0,0]]
  self.assertEqual(N.poisson_heal_scalar(src,dst,mask)[1][1],F(1,2))
  self.assertEqual(N.poisson_heal_scalar(src,src,[[1]*3 for _ in range(3)]),src)
