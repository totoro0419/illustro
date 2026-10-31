"""Numeric reference for predefined D65 spaces, not an arbitrary ICC CMM."""
import math,struct
SRGB=((.4123907992659595,.357584339383878,.1804807884018343),(.2126390058715104,.715168678767756,.0721923153607337),(.0193308187155918,.119194779794626,.9505321522496607))
P3=((.4865709486482162,.2656676931690931,.1982172852343625),(.2289745640697488,.6917385218365064,.079286914093745),(0.,.0451133818589026,1.043944368900976))
XYZ_SRGB=((3.2409699419045226,-1.537383177570094,-.4986107602930034),(-.9692436362808796,1.8759675015077202,.0415550574071756),(.0556300796969937,-.2039769588889765,1.0569715142428786))
def mat(m,v):return tuple(sum(a*b for a,b in zip(row,v)) for row in m)
def linear(x):return math.copysign(abs(x)/12.92 if abs(x)<=.04045 else ((abs(x)+.055)/1.055)**2.4,x)
def encoded(x):return math.copysign(12.92*abs(x) if abs(x)<=.0031308 else 1.055*abs(x)**(1/2.4)-.055,x)
def convert_p3_srgb(rgb):return tuple(encoded(v) for v in mat(XYZ_SRGB,mat(P3,tuple(map(linear,rgb)))))
def unorm(x,bits):return round(max(0.,min(1.,x))*((1<<bits)-1))
def half(x):return struct.unpack('<e',struct.pack('<e',x))[0]
def assign(raw,profile):return {'raw':bytes(raw),'profile':profile} # no numeric conversion
