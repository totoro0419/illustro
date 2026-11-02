"""Limited real CMM comparison against independent CSS matrix arithmetic.
Does not certify arbitrary ICC LUT/Proof/CMYK or GPU. No production integration.
"""
import ctypes as C,ctypes.util,json,hashlib,struct,math
from pathlib import Path
from color_reference import convert_p3_srgb

class xyY(C.Structure):_fields_=[('x',C.c_double),('y',C.c_double),('Y',C.c_double)]
class Primaries(C.Structure):_fields_=[('r',xyY),('g',xyY),('b',xyY)]

def run():
    lib=C.CDLL(ctypes.util.find_library('lcms2'))
    def fn(name,rest,args):
        f=getattr(lib,name);f.restype=rest;f.argtypes=args;return f
    ptr=C.c_void_p;u=C.c_uint32
    create_srgb=fn('cmsCreate_sRGBProfile',ptr,[])
    curve=fn('cmsBuildParametricToneCurve',ptr,[ptr,C.c_int,C.POINTER(C.c_double)])
    make=fn('cmsCreateRGBProfile',ptr,[C.POINTER(xyY),C.POINTER(Primaries),C.POINTER(ptr)])
    transform=fn('cmsCreateTransform',ptr,[ptr,u,ptr,u,u,u]);do=fn('cmsDoTransform',None,[ptr,ptr,ptr,u])
    close=fn('cmsCloseProfile',C.c_int,[ptr]);freecurve=fn('cmsFreeToneCurve',None,[ptr]);freetrans=fn('cmsDeleteTransform',None,[ptr])
    save=fn('cmsSaveProfileToMem',C.c_int,[ptr,ptr,C.POINTER(u)])
    version=fn('cmsGetEncodedCMMversion',u,[])()
    reopen=fn('cmsOpenProfileFromMem',ptr,[ptr,u])
    trc=curve(None,4,(C.c_double*5)(2.4,1/1.055,.055/1.055,1/12.92,.04045))
    assert trc
    srgb=create_srgb();p3=make(C.byref(xyY(.3127,.3290,1)),C.byref(Primaries(xyY(.68,.32,1),xyY(.265,.69,1),xyY(.15,.06,1))),(ptr*3)(trc,trc,trc))
    assert srgb and p3
    fmt=(1<<22)|(4<<16)|(3<<3) # floating, RGB, 3 channels, double encoded as bytes=0
    handle=transform(p3,fmt,srgb,fmt,1,0x0100) # relative colorimetric, NOOPTIMIZE
    assert handle
    samples=[(.2,.3,.4),(.5,.5,.5),(.7,.4,.3),(.1,.2,.15),(1.,1.,1.),(0.,0.,0.)]
    rows=[];format_rows=[];reloaded=None
    try:
        size=u();assert save(p3,None,C.byref(size));buf=C.create_string_buffer(size.value);assert save(p3,buf,C.byref(size));profile_hash=hashlib.sha256(buf.raw).hexdigest();reloaded=reopen(buf,size.value);assert reloaded
        for rgb in samples:
            inp=(C.c_double*3)(*rgb);out=(C.c_double*3)();do(handle,inp,out,1);expected=convert_p3_srgb(rgb)
            error=max(abs(a-b) for a,b in zip(out,expected));rows.append({'input':rgb,'lcms':list(out),'matrix':expected,'max_error':error,'within_16u_one_code':error<=1/65535})
        for label,f in [('8U',(4<<16)|(3<<3)|1),('16U',(4<<16)|(3<<3)|2),('16F',(1<<22)|(4<<16)|(3<<3)|2),('reloaded-profile-DBL',fmt)]:
            h=transform(reloaded if label.startswith('reloaded') else p3,f,srgb,f,1,0x0100);assert h,label
            try:
                for rgb in samples:
                    if label in ('8U','16U'):
                        maximum=255 if label=='8U' else 65535;ctype=C.c_uint8 if label=='8U' else C.c_uint16
                        inp=(ctype*3)(*(round(v*maximum) for v in rgb));out=(ctype*3)();actual_input=tuple(v/maximum for v in inp);do(h,inp,out,1)
                        exp=[round(max(0,min(1,v))*maximum) for v in convert_p3_srgb(actual_input)];err=max(abs(a-b) for a,b in zip(out,exp));ok=err<=1
                    elif label=='16F':
                        packed=struct.pack('<3e',*rgb);actual_input=struct.unpack('<3e',packed);inp=C.create_string_buffer(packed);out=C.create_string_buffer(6);do(h,inp,out,1)
                        expected=struct.unpack('<3e',struct.pack('<3e',*convert_p3_srgb(actual_input)));actual=struct.unpack('<3e',out.raw)
                        ulp=lambda v:max(2**-24,2**(math.floor(math.log2(abs(v)))-10)) if v else 2**-24
                        err=max(abs(a-b)/ulp(b) for a,b in zip(actual,expected));ok=err<=1
                    else:
                        inp=(C.c_double*3)(*rgb);out=(C.c_double*3)();do(h,inp,out,1);err=max(abs(a-b) for a,b in zip(out,convert_p3_srgb(rgb)));ok=err<=1/65535
                    format_rows.append({'format':label,'input':rgb,'max_error_codes_or_ulps_or_absolute':err,'pass':ok})
            finally:freetrans(h)
    finally:
        if reloaded:close(reloaded)
        freetrans(handle);close(srgb);close(p3);freecurve(trc)
    result={'kind':'real CPU CMM limited matrix-profile comparison','cmm_encoded_version':version,'p3_profile_hash':profile_hash,'intent':1,'BPC':False,'threshold':1/65535,'rows':rows,'format_rows':format_rows,'pass':all(r['within_16u_one_code'] for r in rows) and all(r['pass'] for r in format_rows),'unverified':['arbitrary ICC LUT','Proof','CMYK','GPU','full gamut']}
    (Path(__file__).parent/'evidence'/'icc-probe.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));return result['pass']
if __name__=='__main__':raise SystemExit(0 if run() else 1)
