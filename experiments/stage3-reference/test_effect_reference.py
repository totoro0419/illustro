import unittest
from fractions import Fraction as F
from effect_reference import brightness,levels,exposure,posterize,threshold,box,gaussian,offset,median,effect_mask,cache_key
class EffectAcceptanceTests(unittest.TestCase):
 def test_brightness_analytic_ramp(self):
  ramp=list(map(F,[0,F(1,4),F(1,2),F(3,4),1]))
  self.assertEqual([brightness(x,k=2) for x in ramp],[0,0,F(1,2),1,1])
 def test_levels_analytic_ramp_and_invalid(self):
  self.assertEqual([levels(x,F(1,4),F(3,4)) for x in [0,F(1,4),F(1,2),F(3,4),1]],[0,0,.5,1,1])
  with self.assertRaises(ValueError):levels(.5,.5,.5)
 def test_linear_exposure_not_encoded_brightness(self):
  self.assertEqual([exposure(x,1) for x in [.25,.5,1]],[.5,1,2])
 def test_posterize_ties_even_and_threshold_inclusive(self):
  self.assertEqual([posterize(x,4) for x in [0,F(1,4),F(1,2),F(3,4),1]],[0,F(1,3),F(2,3),F(2,3),1])
  self.assertEqual([threshold(x,.5) for x in [.49,.5,.51]],[0,1,1])
 def test_box_exact_impulse_zero_exterior(self):
  self.assertEqual(box([0,0,1,0,0],1),[0,F(1,3),F(1,3),F(1,3),0])
  self.assertEqual(box([1],1),[F(1,3)]) # no edge renormalization
 def test_gaussian_constant_interior_symmetry_and_identity(self):
  v=gaussian([0]*4+[1]+[0]*4,1)
  self.assertEqual(v,list(reversed(v)));self.assertAlmostEqual(sum(v),1,places=14)
  self.assertEqual(gaussian([F(1,3),F(1,2)],0),[F(1,3),F(1,2)])
  self.assertAlmostEqual(gaussian([1]*11,1)[5],1,places=14)
 def test_tile_halo_versus_deliberately_wrong_cache(self):
  v=list(map(F,[0,1,0,0,0,0,0,1,0,0]));gold=box(v,1);out=[]
  for start in range(0,len(v),4):
   # Explicit global-coordinate read, unlike independently renormalized boundary chunks.
   halo=[v[i] if 0<=i<len(v) else F(0) for i in range(start-1,min(len(v),start+4)+1)]
   out.extend(box(halo,1)[1:-1])
  self.assertEqual(out,gold)
  self.assertNotEqual(box(v[:4],1)+box(v[4:8],1)+box(v[8:],1),gold)
 def test_offset_literal_oracles_and_negative_wrap(self):
  self.assertEqual(offset(['R','G','B'],1,'wrap'),['B','R','G'])
  self.assertEqual(offset(['R','G','B'],1,'transparent'),[0,'R','G'])
  self.assertEqual(offset(['R','G','B'],-1,'wrap'),['G','B','R'])
 def test_median_impulse_and_invalid_nonfinite(self):
  self.assertEqual(median([0,1,0],1),[0,0,0])
  for fn,args in [(brightness,(float('nan'),)),(gaussian,([1],float('inf'))),(exposure,(.5,0,0,0)),(posterize,(.5,1))]:
   with self.assertRaises(ValueError):fn(*args)
 def test_mask_effect_order_clip_and_fence_immutable(self):
  original=[F(0),F(1,2),F(1)];gain=[x*2 for x in original]
  effect=box(gain,1);masked=effect_mask(original,effect,[F(1,2)]*3)
  self.assertEqual(masked,[F(1,6),F(3,4),F(1)])
  clip=[F(1),F(1,2),F(0)];self.assertEqual([a*b for a,b in zip(masked,clip)],[F(1,6),F(3,8),0])
  fence=tuple(masked);original[0]=F(1);self.assertEqual(fence,(F(1,6),F(3,4),F(1)))
 def test_cache_identity_cannot_ignore_order_mask_clip_icc_depth(self):
  args=['R',['gain','blur'],[1,.5],'.5','profileA','16U'];key=cache_key(*args)
  for index,value in [(1,['blur','gain']),(2,[1,1]),(3,'1'),(4,'profileB'),(5,'8U')]:
   other=args.copy();other[index]=value;self.assertNotEqual(key,cache_key(*other))
if __name__=='__main__':unittest.main()
