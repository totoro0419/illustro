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
line_art=image('line-art.png',lines)
(root/'line-art.rgba').write_bytes(line_art.tobytes())
