"""Generate independent synthetic fixtures; real image encoders, no renamed files."""
import sys,json,hashlib,subprocess,zipfile,struct,ctypes,ctypes.util
from pathlib import Path
from PIL import Image,ImageDraw,ImageCms
root=Path(sys.argv[1] if len(sys.argv)>1 else 'r2-audit-fixtures');root.mkdir(parents=True,exist_ok=True)
def image(name,draw,size=(128,96),bg=(0,0,0,0)):
    im=Image.new('RGBA',size,bg);draw(ImageDraw.Draw(im));im.save(root/name);return im
black=(0,0,0,255)
def lines(d):
    d.rectangle((8,8,38,40),outline=black,width=2)
    for x,w in [(48,2),(88,6)]:
        d.line([(x+15,8),(x+30,8),(x+30,40),(x,40),(x,8),(x+15-w,8)],fill=black,width=2)
    d.line([(8,58),(35,58),(25,70),(35,88),(8,88),(8,58)],fill=black,width=2)
    d.line([(50,58),(78,58),(78,88)],fill=black,width=2);d.line([(50,65),(70,65)],fill=black,width=2)
    d.ellipse((92,57,120,87),outline=black,width=2);d.ellipse((101,65,111,78),outline=black,width=2)
image('line-art.png',lines)
def dots(d):
    for p,c in [((2,2),(255,0,0,255)),((3,2),(0,255,0,255)),((2,3),(0,0,255,255)),((3,3),(255,255,0,255))]:d.point(p,fill=c)
pixel=image('pixel.png',dots,(16,16));pixel.resize((64,64),Image.Resampling.NEAREST).save(root/'pixel-4x.png')
shift=Image.new('RGBA',pixel.size);shift.paste(pixel,(4,3));shift.save(root/'pixel-shift.png')
def colors(d):
    for i,c in enumerate([(0,0,0,255),(64,64,64,255),(128,128,128,255),(255,255,255,255),(255,0,0,255),(0,255,0,255),(0,0,255,255),(255,255,0,128)]):
        x=(i%4)*32;y=(i//4)*48;d.rectangle((x,y,x+31,y+47),fill=c)
col=image('colors.png',colors)
def repair(d):
    for x in range(0,128,8):d.rectangle((x,0,x+3,95),fill=(40,100,180,255))
clean=image('repair-clean.png',repair,bg=(220,220,220,255));bad=clean.copy();ImageDraw.Draw(bad).rectangle((46,44,50,48),fill=(255,0,0,255));bad.save(root/'repair-damaged.png')
a=image('shape-a.png',lambda d:d.rectangle((12,12,63,63),fill=(255,0,0,255)))
b=image('shape-b.png',lambda d:d.rectangle((40,36,91,87),fill=(0,0,255,255)))
for op,pred in [('union',lambda a,b:a or b),('difference',lambda a,b:a and not b),('intersection',lambda a,b:a and b)]:
    im=Image.new('RGBA',a.size);im.putdata([(0,0,0,255) if pred(x[3]>0,y[3]>0) else (0,0,0,0) for x,y in zip(a.getdata(),b.getdata())]);im.save(root/f'boolean-{op}.png')
Image.alpha_composite(a,b).save(root/'shapes-merged.png')
with zipfile.ZipFile(root/'two-layers.ora','w') as z:
    z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
    z.writestr('stack.xml','<image w="128" h="96" name="QA"><stack><layer name="B" src="data/b.png" opacity="1.0" visibility="visible" x="0" y="0" composite-op="svg:src-over"/><layer name="A" src="data/a.png" opacity="1.0" visibility="visible" x="0" y="0" composite-op="svg:src-over"/></stack></image>')
    for src,dst in [('shape-a.png','data/a.png'),('shape-b.png','data/b.png'),('shapes-merged.png','mergedimage.png')]:z.write(root/src,dst)
with zipfile.ZipFile(root/'two-layers.ora') as z:assert z.testzip() is None
(root/'shapes.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="96"><rect x="12" y="12" width="52" height="52" fill="red"/><rect x="40" y="36" width="52" height="52" fill="blue"/></svg>',encoding='utf8')
(root/'reference.json').write_text(json.dumps({'name':'QA synthetic','source':'https://example.invalid/qa','rights':'self-generated test only'},indent=2),encoding='utf8')
(root/'srgb.icc').write_bytes(ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes())
class XY(ctypes.Structure):_fields_=[('x',ctypes.c_double),('y',ctypes.c_double),('Y',ctypes.c_double)]
class Triple(ctypes.Structure):_fields_=[('Red',XY),('Green',XY),('Blue',XY)]
lib=ctypes.CDLL(ctypes.util.find_library('lcms2'));ptr=ctypes.c_void_p
lib.cmsBuildGamma.argtypes=[ptr,ctypes.c_double];lib.cmsBuildGamma.restype=ptr
lib.cmsCreateRGBProfile.argtypes=[ctypes.POINTER(XY),ctypes.POINTER(Triple),ctypes.POINTER(ptr)];lib.cmsCreateRGBProfile.restype=ptr
lib.cmsSaveProfileToFile.argtypes=[ptr,ctypes.c_char_p];lib.cmsSaveProfileToFile.restype=ctypes.c_int
lib.cmsCloseProfile.argtypes=[ptr];lib.cmsFreeToneCurve.argtypes=[ptr]
gamma=lib.cmsBuildGamma(None,2.2);assert gamma
white=XY(.3127,.3290,1);prim=Triple(XY(.55,.34,1),XY(.31,.50,1),XY(.20,.14,1));prof=lib.cmsCreateRGBProfile(ctypes.byref(white),ctypes.byref(prim),(ptr*3)(gamma,gamma,gamma));assert prof
assert lib.cmsSaveProfileToFile(prof,str(root/'narrow.icc').encode());lib.cmsCloseProfile(prof);lib.cmsFreeToneCurve(gamma)
for n in ['srgb.icc','narrow.icc']:assert ImageCms.getProfileName(str(root/n)).strip()
def run(*cmd):
    p=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if p.returncode:raise RuntimeError(' '.join(cmd)+'\n'+p.stderr.decode(errors='replace')[-3000:])
    return p.stdout
errors={}
for n,flag in [('colors.avif','-A'),('colors.heic',None)]:
    try:
        p=root/n;args=['heif-enc','-q','95']+([flag] if flag else [])+['-o',str(p),str(root/'colors.png')];run(*args)
        assert p.read_bytes()[4:8]==b'ftyp';run('heif-info',str(p));decoded=root/(n+'.decoded.png');run('heif-convert',str(p),str(decoded));im=Image.open(decoded).convert('RGBA');assert im.size==col.size
        for xy in [(16,24),(48,24),(80,24),(112,24),(16,72),(48,72),(80,72)]:assert max(abs(x-y) for x,y in zip(im.getpixel(xy),col.getpixel(xy)))<=25,(n,xy,im.getpixel(xy),col.getpixel(xy))
        decoded.unlink()
    except Exception as e:errors[n]=str(e);(root/n).unlink(missing_ok=True)
try:
    run('ffmpeg','-v','error','-y','-i',str(root/'colors.png'),'-pix_fmt','gbrapf32le','-c:v','exr',str(root/'colors.exr'))
    assert (root/'colors.exr').read_bytes()[:4]==bytes.fromhex('762f3101')
    raw=run('ffmpeg','-v','error','-i',str(root/'colors.exr'),'-f','rawvideo','-pix_fmt','gbrapf32le','-');assert len(raw)==128*96*4*4
    for xy,expected in [((16,72),(0,0,1,1)),((48,72),(1,0,0,1))]:
        i=xy[1]*128+xy[0];got=[struct.unpack_from('<f',raw,4*(i+k*128*96))[0] for k in range(4)];assert max(abs(x-y) for x,y in zip(got,expected))<.03,(got,expected)
except Exception as e:errors['colors.exr']=str(e);(root/'colors.exr').unlink(missing_ok=True)
files={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(root.iterdir()) if p.is_file() and p.name!='manifest.json'}
(root/'manifest.json').write_text(json.dumps({'files':files,'errors':errors},indent=2),encoding='utf8');print('Verified',len(files),'fixtures; codec errors:',errors)
if errors:sys.exit(1)
