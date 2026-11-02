"""Feature-specific design-reference checks. These do not certify production GPU/UX."""
import unittest,math,json,copy
from fractions import Fraction as F
import numeric_color_v1 as C
import numeric_brush_v1 as B
import numeric_geometry_v1 as G
import numeric_effects_v1 as E

class BrushNumericTests(unittest.TestCase):
 def test_BRU003_off_identity_and_endpoint(self):
  raw=[(0.,0.,0.,0.),(.01,1.,1.,.5),(.02,2.,-1.,1.),(.03,3.,0.,.8)]
  self.assertEqual(B.corrected_samples(raw),raw)
  out=B.corrected_samples(raw,.05,.02,.01)
  self.assertEqual(out[0],raw[0]);self.assertEqual(out[-1][1:3],raw[-1][1:3]);self.assertLess(abs(out[1][2]),abs(raw[1][2]))
 def test_BRU003_analytic_ema_and_invalid_time(self):
  out=B.corrected_samples([(0,0,0,0),(1,1,0,1),(2,2,0,1)],1,0,1)
  self.assertAlmostEqual(out[1][1],1-math.exp(-1));self.assertAlmostEqual(out[1][3],1-math.exp(-1))
  with self.assertRaises(ValueError):B.corrected_samples([(1,0,0,0),(1,1,1,1)])
 def test_BRU006_curve_order_endpoints_missing_sensor(self):
  nodes=[{'source':'pressure','knots':[(0,0),(1,2)],'operation':'multiply'},{'source':'tilt','knots':[(0,0),(1,1)],'operation':'add'}]
  self.assertEqual(B.modulation(10,nodes,{'pressure':.5,'tilt':.5},'nonnegative'),10.5)
  self.assertEqual(B.modulation(350,[{'source':'direction','knots':[(0,0),(1,20)],'operation':'add'}],{'direction':1},'angle'),10)
  with self.assertRaises(ValueError):B.modulation(1,nodes,{'pressure':.5})
 def test_BRU006_dab_shape_hardness_and_frozen_random(self):
  self.assertEqual(B.dab_coverage(0,0),1);self.assertEqual(B.dab_coverage(2,0),0)
  self.assertGreater(B.dab_coverage(.75,0,hardness=1),B.dab_coverage(.75,0,hardness=.25))
  self.assertAlmostEqual(B.dab_coverage(0,.5,radii=(2,1),angle=90),B.dab_coverage(.5,0,radii=(2,1)))
  self.assertEqual(B.stamp_random(17,3,2),B.stamp_random(17,3,2));self.assertNotEqual(B.stamp_random(17,3,2),B.stamp_random(17,4,2))
 def test_WET001_premul_mix_literal_no_black_fringe(self):
  red=(.5,0,0,.5);clear=(0,0,0,0)
  out,R=B.smudge_dab(red,clear,strength=.5)
  self.assertEqual(out,(.25,0,0,.25));self.assertEqual(R,clear)
  out,R=B.smudge_dab(clear,red,strength=.5);self.assertEqual(out,(.25,0,0,.25))
 def test_WET001_reservoir_paint_and_alpha_lock(self):
  out,R=B.smudge_dab((0,0,.5,.5),(.5,0,0,.5),(.5,0,0,.5),pickup_rate=0,strength=1,paint=(0,.5,0,.5),paint_amount=1)
  self.assertEqual(out,(.25,.5,0,.75))
  locked,_=B.smudge_dab((0,0,.5,.5),(.5,0,0,.5),strength=.5,alpha_lock=True)
  self.assertEqual(locked,(.25,0,.25,.5))
 def test_WET001_blur_reference_zero_exterior(self):
  p=(1,0,0,1);image=[[p,p,p],[p,p,p],[p,p,p]]
  self.assertEqual(B.blur_pickup(image,1,1,1),p)
  for v,e in zip(B.blur_pickup(image,0,0,1),(4/9,0,0,4/9)):self.assertAlmostEqual(v,e)
 def test_WET007_dry_paper_and_height_no_time_drift(self):
  args=dict(dst=(0,0,0,0),height=0,pickup=(0,0,0,0),reservoir=None,coverage=1,pressure=.5,dryness=1,paper=0,thickness=2,oil=0,paint=(1,0,0,1))
  a=B.media_dab(**args);self.assertEqual(a[1],0);self.assertEqual(a[0],(0,0,0,0))
  args['paper']=1;b=B.media_dab(**args);self.assertEqual(b[1],2);self.assertEqual(b[0],(1,0,0,1));self.assertEqual(B.media_dab(**args),b)
 def test_WET007_height_overflow_does_not_mutate_input(self):
  with self.assertRaises(ValueError):B.media_dab((1,0,0,1),65504,(1,0,0,1),None,1,1,0,1,1,0,(1,0,0,1))

class ColorNumericTests(unittest.TestCase):
 def test_NDE001_all_separable_literal_goldens(self):
  b=.25;s=.75
  expected={'normal':.75,'darken':.25,'lighten':.75,'multiply':.1875,'screen':.8125,'color-burn':0,'color-dodge':1,'hard-light':.625,'overlay':.375,'soft-light':.375,'difference':.5,'exclusion':.625,'linear-burn':0,'linear-dodge':1,'vivid-light':.5,'linear-light':.75,'pin-light':.5,'hard-mix':1,'subtract':0,'divide':1/3}
  self.assertEqual(set(expected),set(C.SEPARABLE))
  for mode,gold in expected.items():
   with self.subTest(mode=mode):self.assertAlmostEqual(C.blend_rgb((b,)*3,(s,)*3,mode)[0],gold)
 def test_NDE001_nonseparable_luminance_and_grey(self):
  b=(.2,.4,.6);s=(.8,.3,.1)
  for mode in ('hue','saturation','color'):self.assertAlmostEqual(C.lum(C.blend_rgb(b,s,mode)),C.lum(b))
  self.assertAlmostEqual(C.lum(C.blend_rgb(b,s,'luminosity')),C.lum(s))
  self.assertEqual(C.blend_rgb((.5,)*3,s,'saturation'),(.5,)*3)
 def test_NDE001_alpha_mask_clip_exact_fraction(self):
  out=C.compose((0,0,1,.5),(1,0,0,.5),'multiply',mask=.5,clip=.5)
  self.assertEqual(out,(.0625,0,.4375,.5625))
  self.assertEqual(C.compose((0,0,1,.5),(1,0,0,.5),'normal',mask=0),(0,0,.5,.5))
 def test_NDE001_all_modes_finite_domain_and_zero_edges(self):
  for mode in C.BLEND_MODES:
   for b in (0,.25,.5,1):
    for s in (0,.5,.75,1):
     out=C.compose((b,b,b,.5),(s,s,s,.5),mode,seed=4)
     self.assertTrue(all(math.isfinite(v) and -1e-12<=v<=1+1e-12 for v in out),(mode,b,s,out))
  self.assertEqual(C.dodge(0,1),0);self.assertEqual(C.burn(1,0),1)
 def test_NDE001_dissolve_mask_seed_reload(self):
  state={'seed':17,'mask':.5,'clip':.5};again=json.loads(json.dumps(state))
  a=[C.compose((0,0,0,1),(1,1,1,1),'dissolve',pixel=(x,0),**state) for x in range(100)]
  b=[C.compose((0,0,0,1),(1,1,1,1),'dissolve',pixel=(x,0),**again) for x in range(100)]
  self.assertEqual(a,b);self.assertEqual({v[0] for v in a},{0,1});self.assertTrue(all(v[3]==1 for v in a))
 def test_FX107_weights_neutral_and_luminance(self):
  rgb=(.2,.4,.6);a=C.color_balance(rgb,(0,0,0),(0,0,0),(0,0,0));self.assertEqual(a,rgb)
  b=C.color_balance(rgb,(.1,0,-.1),(.2,0,-.2),(0,0,.1))
  self.assertAlmostEqual(sum(x*y for x,y in zip(rgb,C.SRGB[1])),sum(x*y for x,y in zip(b,C.SRGB[1])))
 def test_FX107_three_weights_partition_and_isolate(self):
  self.assertEqual(C.color_balance((0,0,0),(.1,.2,.3),(0,0,0),(0,0,0),False),(.1,.2,.3))
  self.assertEqual(C.color_balance((1,1,1),(0,0,0),(0,0,0),(.1,.2,.3),False),(1.1,1.2,1.3))
 def test_FX108_neutral_and_relative_controls(self):
  self.assertEqual(C.relative_temperature((.5,)*3,.1,0),(.6,.5,.4))
  self.assertEqual(C.relative_temperature((.5,)*3,0,.1),(.55,.4,.55))
  self.assertEqual(C.adapt_xyz((.1,.2,.3),(.3127,.329),(.3127,.329)),(.1,.2,.3))
 def test_FX108_white_mapping_and_inverse(self):
  a=(.3127,.329);b=(.3457,.3585)
  actual=C.adapt_xyz(C.white_xyz(a),a,b)
  for x,y in zip(actual,C.white_xyz(b)):self.assertAlmostEqual(x,y,places=12)
  v=(.2,.3,.4);back=C.adapt_xyz(C.adapt_xyz(v,a,b),b,a)
  for x,y in zip(back,v):self.assertAlmostEqual(x,y,places=12)
 def test_FX109_six_hues_and_grey_independence(self):
  colors=((1,0,0),(1,1,0),(0,1,0),(0,1,1),(0,0,1),(1,0,1))
  for i,rgb in enumerate(colors):
   gains=[0.]*6;gains[i]=.1
   self.assertAlmostEqual(C.monochrome(rgb,gains)[0]-C.monochrome(rgb)[0],.1)
  self.assertEqual(C.monochrome((.5,)*3,(1,)*6),C.monochrome((.5,)*3))
 def test_FX109_tint_endpoints(self):
  self.assertEqual(C.monochrome((0,0,0),tint=(1,0,0),tint_strength=1),(0,0,0))
  self.assertEqual(C.monochrome((1,1,1),tint=(1,0,0),tint_strength=1),(1,0,0))
 def test_FX111_absolute_relative_targets_and_no_cmky_claim(self):
  self.assertEqual(C.selective_color((1,0,0),'red',(.1,0,0,0)),(.9,0,0))
  self.assertEqual(C.selective_color((0,1,0),'red',(.1,0,0,0)),(0,1,0))
  self.assertEqual(C.selective_color((.5,)*3,'neutral',(.2,0,0,0),False),(.3,.5,.5))
  self.assertEqual(C.selective_color((.5,)*3,'neutral',(.2,0,0,0),True),(.4,.5,.5))
 def test_FX124_seed_distribution_particle_and_domain(self):
  u=C.random_u(17,1,2,3);self.assertEqual(u,.5564965254588624)
  self.assertEqual(C.noise_delta(17,0,0,.1,particle=2),C.noise_delta(17,1,1,.1,particle=2))
  uniform=[C.noise_delta(17,x,0,.1) for x in range(2000)];normal=[C.noise_delta(17,x,0,.1,'gaussian') for x in range(2000)]
  self.assertLess(abs(sum(uniform)/len(uniform)),.005);self.assertTrue(all(-.1<=x<=.1 for x in uniform))
  self.assertLess(abs(sum(normal)/len(normal)),.01);self.assertAlmostEqual(sum(x*x for x in normal)/len(normal),.01,delta=.002)
 def test_COL011_author_roundtrip_and_primary(self):
  for rgb in ((1,0,0),(0,1,0),(0,0,1),(.1,.5,.9),(0,0,0),(1,1,1)):
   back=C.oklab_to_linear(C.linear_to_oklab(rgb))
   for x,y in zip(back,rgb):self.assertAlmostEqual(x,y,places=12)
  self.assertAlmostEqual(C.linear_to_oklab((1,0,0))[0],.6279553606,places=9)
 def test_COL011_published_yellow_boundary_and_both_gamuts(self):
  self.assertAlmostEqual(C.gamut_limit(.96476,110.23),.21094,delta=5e-6)
  for space in ('srgb','p3'):
   for L in (.1,.5,.9):
    for hue in range(0,360,30):
     c=C.gamut_limit(L,hue,space);a=C.oklch_rgb(L,c*.999,hue,space);b=C.oklch_rgb(L,c+1e-5,hue,space)
     self.assertGreaterEqual(min(a),-1e-8);self.assertLessEqual(max(a),1+1e-8)
     self.assertTrue(min(b)<0 or max(b)>1)

class GeometryNumericTests(unittest.TestCase):
 def test_LIN001_opaque_white_is_not_ink(self):
  self.assertEqual(G.line_ink((1,1,1,1)),0);self.assertEqual(G.line_ink((0,0,0,1)),1);self.assertEqual(G.line_ink((1,0,1,0)),0)
 def test_LIN001_hole_exterior_connectivity_and_scan_order(self):
  m=[[0]*7 for _ in range(7)]
  for i in range(1,6):m[1][i]=m[5][i]=m[i][1]=m[i][5]=1
  regions=G.segment_regions(m);inside=[r for r in regions if not r['exterior']]
  self.assertEqual(len(inside),1);self.assertEqual(len(inside[0]['pixels']),9)
  self.assertEqual(len(G.components([[1,0],[0,1]],4)),2);self.assertEqual(len(G.components([[1,0],[0,1]],8)),1)
 def test_LIN005_unchanged_and_shift_keep_only_unambiguous_ids(self):
  old={'R':frozenset((x,0) for x in range(5))};new=[frozenset((x,0) for x in range(1,6))]
  match,conflicts=G.match_regions(old,new);self.assertEqual(match,{'R':0});self.assertEqual(conflicts,[])
 def test_LIN005_split_merge_and_no_name_rebinding(self):
  a=frozenset((x,0) for x in range(5));b=frozenset((x,0) for x in range(5,10))
  self.assertEqual(G.match_regions({'A':a},[frozenset(list(a)[:1]),a-frozenset(list(a)[:1])])[1],['A'])
  self.assertEqual(G.match_regions({'A':a,'B':b},[a|b])[0],{})
 def test_LIN006_rank_direction_curvature_and_tie_determinism(self):
  a=G.gap_score((0,0),(2,0),(1,0),(-1,0),0,0,3)
  self.assertIsNone(G.gap_score((0,0),(2,0),(0,1),(0,-1),0,0,3))
  self.assertGreater(G.gap_score((0,0),(2,0),(1,0),(-1,0),1,0,3),a)
  records=[{'id':'a','p':(.5,.5),'tangent':(1,0)},{'id':'b','p':(2.5,.5),'tangent':(-1,0)}]
  self.assertEqual(G.gap_candidates(records,3),G.gap_candidates(list(reversed(records)),3))
 def test_LIN006_T_junction_and_estimated_tangent(self):
  c=G.endpoint_segment_candidate({'p':(0,1),'tangent':(1,0)},(2,0),(2,2),3)
  self.assertEqual(c['point'],(2,1));self.assertFalse(c['automatic'])
  tips=G.skeleton_endpoint_records([[0,0,0,0],[1,1,1,1],[0,0,0,0]])
  self.assertEqual(len(tips),2);self.assertEqual(tips[0]['tangent'],(-1,0));self.assertEqual(tips[1]['tangent'],(1,0))
 def test_FIL002_confirmed_bridge_seals_gap_without_line_mutation(self):
  m=[[0]*7 for _ in range(7)]
  for i in range(1,6):m[1][i]=m[5][i]=m[i][1]=m[i][5]=1
  m[1][3]=0;original=copy.deepcopy(m)
  self.assertEqual(len(G.segment_regions(m)),1)
  a={'id':'a','p':(2.5,1.5),'tangent':(1,0)};b={'id':'b','p':(4.5,1.5),'tangent':(-1,0)}
  bridge=G.gap_candidates([a,b],2)[0];virtual=copy.deepcopy(m)
  for x,y in bridge['cells']:virtual[y][x]=1
  inside=[r for r in G.segment_regions(virtual) if not r['exterior']]
  self.assertEqual(len(inside[0]['pixels']),9);self.assertEqual(m,original)
  self.assertEqual(G.gap_candidates([a,b],1),[])
 def test_FIL002_barrier_collision_and_zero_gap_rejected(self):
  a={'id':'a','p':(.5,.5),'tangent':(1,0)};b={'id':'b','p':(4.5,.5),'tangent':(-1,0)}
  self.assertEqual(G.gap_candidates([a,b],5,{(2,0)}),[])
  with self.assertRaises(ValueError):G.gap_candidates([a,b],0)
 def test_TRN004_protection_push_twirl_restore_boundary(self):
  self.assertEqual(G.liquify_point((1,0),(0,0),2,1,drag=(2,0),protect=1),(1,0))
  self.assertEqual(G.liquify_point((3,0),(0,0),2,1,drag=(2,0)),(3,0))
  self.assertEqual(G.liquify_point((0,0),(0,0),2,1,'twirl'),(0,0))
  self.assertEqual(G.liquify_point((1,0),(0,0),2,1,drag=(2,0)),(2.125,0))
 def test_TRN004_line_search_prevents_fold_and_inverse_matches(self):
  rest=[(0,0),(1,0),(1,1),(0,1)];faces=[(0,1,2),(0,2,3)]
  proposed=[(0,0),(-2,0),(1,1),(0,1)];out,t=G.safe_mesh_update_global(rest,rest,proposed,faces)
  self.assertLess(t,1);self.assertTrue(G.mesh_is_injective(out,faces))
  src=[(0,0),(2,0),(0,2)];dst=[(1,1),(5,1),(1,5)]
  self.assertEqual(G.inverse_triangle((2,2),src,dst),(.5,.5))
 def test_TRN006_checker_area_is_not_aliasing_nearest(self):
  image=[[(x+y)%2 for x in range(8)] for y in range(8)]
  self.assertEqual(G.area_resample(image,2,2),[[.5,.5],[.5,.5]])
  self.assertEqual([[image[y*4][x*4] for x in range(2)] for y in range(2)],[[0,0],[0,0]])
 def test_TRN006_fractional_scale_area_conservation_and_identity(self):
  image=[[0,1,0],[1,0,1]];self.assertEqual(G.area_resample(image,3,2),image)
  out=G.area_resample(image,2,1);self.assertAlmostEqual(sum(out[0])/2,.5)
  q=[(F(0),F(0)),(F(2),F(0)),(F(2),F(2)),(F(0),F(2))];r=[(F(1),F(1)),(F(3),F(1)),(F(3),F(3)),(F(1),F(3))]
  self.assertEqual(G.polygon_area(G.clip_convex(q,r)),1)

class EffectsNumericTests(unittest.TestCase):
 def test_FX120_focus_identity_and_constant_all_apertures(self):
  red=(1.,0.,0.,1.);image=[[red]*3 for _ in range(3)];depth=[[.5]*3 for _ in range(3)]
  self.assertEqual(E.depth_blur(image,depth,.5,.5,2),image)
  for n in (0,3,4,6):
   out=E.depth_blur(image,depth,0,1,1,n,20)
   for row in out:
    for p in row:self.assertEqual(p,red)
 def test_FX120_far_background_does_not_bleed_over_focused_front(self):
  image=[[(1,0,0,1),(0,0,1,1),(0,0,1,1)]];depth=[[0,1,1]]
  out=E.depth_blur(image,depth,0,1,2)
  self.assertEqual(out[0][0],(1,0,0,1));self.assertEqual(out[0][2],(0,0,1,1))
 def test_FX120_premul_transparency_aperture_and_invalid_map(self):
  k=E.aperture_kernel(2,0);self.assertAlmostEqual(sum(k.values()),1);self.assertEqual(k[1,0],k[-1,0])
  self.assertNotEqual(E.aperture_kernel(2,3,0),E.aperture_kernel(2,3,30))
  image=[[(0,0,0,0),(.5,0,0,.5)]];out=E.depth_blur(image,[[1,1]],0,1,1)
  for p in out[0]:self.assertAlmostEqual(p[0],p[3]);self.assertEqual(p[1:3],(0,0))
  with self.assertRaises(ValueError):E.depth_blur(image,[[1]],0,1,1)
 def test_FX129_analytic_round_dot_density_without_inverted_hole_jump(self):
  for d in (0,.1,.5,math.pi/4,.8,.95,1):self.assertAlmostEqual(E.tone_area(E.tone_radius(d)),d,places=12)
  self.assertLess(E.tone_radius(.78),E.tone_radius(.79))
 def test_FX129_all_shapes_area_and_periodic_origin(self):
  for shape in ('round','square','diamond','line'):
   avg=sum(E.tone_coverage(x+.5,y+.5,.5,8,shape=shape) for y in range(8) for x in range(8))/64
   self.assertAlmostEqual(avg,.5,delta=.015)
  a=E.tone_coverage(2.5,3.5,.5,8);self.assertEqual(a,E.tone_coverage(10.5,3.5,.5,8))
  self.assertEqual(E.tone_coverage(2.5,3.5,.5,8,origin=(1,1)),E.tone_coverage(1.5,2.5,.5,8))
 def test_FX130_sobel_flat_step_and_salt_cleanup(self):
  self.assertEqual(E.sobel([[1]*3 for _ in range(3)]),[[0]*3 for _ in range(3)])
  step=[[0,0,1,1] for _ in range(3)];self.assertEqual(E.sobel(step)[1],[0,.5,.5,0])
  noisy=[[0]*3 for _ in range(3)];noisy[1][1]=1;self.assertEqual(E.median2d(noisy,1),[[0]*3 for _ in range(3)])
 def test_FX130_thinning_topology_and_idempotence(self):
  block=[[0]*5,[0,1,1,1,0],[0,1,1,1,0],[0,1,1,1,0],[0]*5];out=E.thin(block)
  self.assertEqual(out,[[False]*5,[False]*5,[False,False,True,False,False],[False]*5,[False]*5]);self.assertEqual(E.thin(out),out)
  ring=[[1,1,1],[1,0,1],[1,1,1]];thin=E.thin(ring);self.assertEqual(len(G.components(thin,8)),1);self.assertFalse(thin[1][1])
 def test_FX136_zero_depth_identity_and_shared_light(self):
  mask=[[0]*7 for _ in range(7)]
  for y in range(2,5):
   for x in range(2,5):mask[y][x]=1
  field,out=E.bevel(mask,2,0);self.assertTrue(all(p==(0,0) for row in out for p in row))
  a=E.bevel(mask,2,2,angle=0)[1];b=E.bevel(mask,2,-2,angle=0)[1]
  self.assertGreater(a[3][1][1],0);self.assertGreater(b[3][1][0],0)
 def test_FX136_inner_outer_emboss_softness_and_empty(self):
  m=[[0,0,0],[0,1,0],[0,0,0]]
  fields=[E.bevel(m,1,1,mode=mode)[0] for mode in ('inner','outer','emboss')]
  self.assertNotEqual(fields[0],fields[1]);self.assertNotEqual(fields[1],fields[2])
  empty=E.bevel([[0]*3 for _ in range(3)],1,1)[1];self.assertTrue(all(p==(0,0) for row in empty for p in row))
  self.assertNotEqual(E.bevel(m,1,1,softness=1)[0],fields[0])

if __name__=='__main__':unittest.main()

class NumericInteractionTests(unittest.TestCase):
 def test_thinning_exhaustive_3x3_preserves_components_and_holes(self):
  for bits in range(512):
   a=[[bool(bits&(1<<(3*y+x))) for x in range(3)] for y in range(3)];b=E.thin(a)
   self.assertEqual(len(G.components(a,8)),len(G.components(b,8)),bits)
   def holes(m):
    padded=[[False]*5]+[[False]+r+[False] for r in m]+[[False]*5]
    return len(G.components([[not p for p in r] for r in padded],4))-1
   self.assertEqual(holes(a),holes(b),bits);self.assertEqual(E.thin(b),b)
 def test_liquify_restore_exact_and_tiny_global_overlap_rejected(self):
  self.assertEqual(G.restore_displacement((3,-2),(0,0),(0,0),10,1),(0,0))
  self.assertEqual(G.restore_displacement((3,-2),(0,0),(0,0),10,1,1),(3,-2))
  points=[(0.,0.),(1e-8,0.),(0.,1e-8),(1e-9,1e-9),(1.1e-8,1e-9),(1e-9,1.1e-8)]
  self.assertFalse(G.mesh_is_injective(points,[(0,1,2),(3,4,5)]))
  with self.assertRaises(ValueError):G.safe_mesh_update_global(points,points,points,[(0,1,2),(3,4,5)])
  # Zero-area contact between unrelated faces is also a non-injective map.
  self.assertFalse(G.mesh_is_injective([(0,0),(1,0),(0,1),(1,0),(2,0),(1,1)],[(0,1,2),(3,4,5)]))
  self.assertTrue(G.mesh_is_injective([(0,0),(1,0),(1,1),(0,1)],[(0,1,2),(0,2,3)]))
 def test_projective_destination_area_literal_and_mesh_split_equivalence(self):
  # Trapezoid area=3/2. Destination pixel areas: 1 and 1/2.
  q=[(F(0),F(0)),(F(2),F(0)),(F(1),F(1)),(F(0),F(1))]
  out=G.transformed_area([(q,1)],2,1)
  self.assertEqual(out,[[1.,.5]])
  tri=[([q[0],q[1],q[2]],1),([q[0],q[2],q[3]],1)]
  self.assertEqual(G.transformed_area(tri,2,1),out)
 def test_arbitrary_profile_discrete_mask_does_not_bridge_island(self):
  pred=lambda lab: math.hypot(lab[1],lab[2])<=.1 or math.hypot(lab[1],lab[2])>=.3
  self.assertEqual(C.sampled_profile_limit(.5,0,pred),204/2048)
 def test_effect_mask_clip_committed_mix_save_branch_and_root_isolation(self):
  # Selection=.5 and Clip=.5 must occur once; no UI/Proof in frozen input.
  base=(0,0,.5,.5);sample=(.5,0,0,.5)
  mixed,_=B.smudge_dab(base,sample,strength=1,mask=.25)
  self.assertEqual(mixed,(.125,0,.375,.5))
  snapshot=json.loads(json.dumps({'root':list(mixed),'seed':17,'profile':'srgb','kernel':'numeric-v1'}))
  downstream=tuple(mixed) # Document-coordinate committed Replace
  for new_transform_sample in ((0,1,0,1),(1,1,1,1)):
   _=C.compose(new_transform_sample,(1,0,0,.5),'multiply',mask=.5,clip=.5)
   self.assertEqual(downstream,tuple(snapshot['root']))
  adjusted=C.color_balance(tuple(v/mixed[3] for v in mixed[:3]),(.1,0,0),(0,0,0),(0,0,0))
  self.assertNotEqual(adjusted,mixed[:3]);self.assertEqual(snapshot['root'],[.125,0,.375,.5])
  with self.assertRaises(ValueError):B.smudge_dab(mixed,(1,0,0,0))

class NumericVariantTests(unittest.TestCase):
 def test_lens_all_blades_constant_and_invalid(self):
  image=[[(.2,.1,0,.5)]*3 for _ in range(3)]
  for blades in (0,*range(3,13)):
   out=E.lens_blur(image,1.2,blades,17)
   for row in out:
    for p in row:
     for a,b in zip(p,image[0][0]):self.assertAlmostEqual(a,b,places=12)
  with self.assertRaises(ValueError):E.lens_blur(image,0,2)
 def test_line_width_inversion_background_alpha(self):
  a=[[0,0,0],[0,1,0],[0,0,0]]
  self.assertEqual(sum(map(sum,E.widen_line(a,3))),5)
  self.assertEqual(E.widen_line(a),a)
  self.assertEqual(E.line_rgba([[.5]],invert=True),[[(.5,.5,.5,.5)]])
  self.assertEqual(E.line_rgba([[.5]],white_background=True),[[(.5,.5,.5,1.)]])
  with self.assertRaises(ValueError):E.widen_line(a,.5)
 def test_bevel_color_source_immutable_alpha_and_modes(self):
  clear=(0,0,0,0);image=[[clear]*7 for _ in range(7)]
  for y in range(2,5):
   for x in range(2,5):image[y][x]=(.5,0,0,1)
  original=copy.deepcopy(image)
  for mode in ('inner','outer','emboss'):
   self.assertEqual(E.render_bevel(image,2,0,mode=mode),image)
   out=E.render_bevel(image,2,2,mode=mode)
   self.assertTrue(all(math.isfinite(v) for r in out for p in r for v in p))
   if mode=='inner':self.assertEqual([[p[3] for p in r] for r in out],[[p[3] for p in r] for r in image])
   else:self.assertGreater(sum(p[3] for r in out for p in r),9)
  self.assertEqual(image,original)
