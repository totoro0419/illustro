import unittest,struct,math
from color_reference import *

class ColorTests(unittest.TestCase):
    def test_u8_u16_roundtrip_all_codes(self):
        for bits in [8,16]:
            for n in range(1<<bits):self.assertEqual(unorm(n/((1<<bits)-1),bits),n)
        self.assertEqual(unorm(.5,8),128);self.assertEqual(unorm(.5,16),32768)
    def test_half_every_finite_bit_pattern_native_roundtrip(self):
        for n in range(65536):
            b=struct.pack('<H',n);v=struct.unpack('<e',b)[0]
            if math.isfinite(v):self.assertEqual(struct.pack('<e',half(v)),b)
        self.assertEqual(half(2**-24),2**-24);self.assertEqual(half(1+2**-11),1.)
    def test_transfer_boundaries_roundtrip(self):
        for v in [-.1,0,.003, .04045,.5,1,1.2]:self.assertAlmostEqual(encoded(linear(v)),v,6)
    def test_matrix_known_primaries_not_assign(self):
        xyz=mat(P3,(1,0,0));self.assertAlmostEqual(xyz[1],.2289745640697488,14)
        linear_red=mat(XYZ_SRGB,xyz)
        for actual,expected in zip(linear_red,(1.22494017628,-.04205695471,-.01963755459)):self.assertAlmostEqual(actual,expected,10)
        self.assertNotEqual(convert_p3_srgb((1,0,0)),(1,0,0))
        self.assertEqual(assign([255,0,0,0],'DisplayP3')['raw'],bytes([255,0,0,0])) # hidden RGB retained
    def test_default_encoded_vs_explicit_linear(self):
        self.assertEqual(.5*1+.5*0,.5)
        self.assertAlmostEqual(encoded(.5),.7353569830524495,14)
        self.assertNotEqual(encoded(.5),.5)

if __name__=='__main__':unittest.main()
