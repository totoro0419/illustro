"""Deterministic Raster fixtures; execution/structure checks, not quality grading.
Requires Pillow. python generate-fixtures.py && node test-raster.cjs
"""
from PIL import Image, ImageDraw
from pathlib import Path
import random, json
p = Path(__file__).parent / 'fixtures'
p.mkdir(exist_ok=True)
entries = []
def make():
    return Image.new('RGBA', (960, 720), (255, 255, 255, 255))
def save(name, img, category):
    img = img.resize((240, 180), Image.Resampling.LANCZOS)
    img.save(p / (name + '.png'))
    (p / (name + '.rgba')).write_bytes(img.tobytes())
    entries.append(dict(name=name, category=category, width=240, height=180, file=name+'.rgba'))
for width in [1, 2, 4, 12, 28]:
    img = make(); d = ImageDraw.Draw(img)
    d.ellipse((120, 100, 780, 620), outline='black', width=width*4)
    save('ring-width-'+str(width), img, 'closed ring')
img = make(); d = ImageDraw.Draw(img)
d.rectangle((100,100,850,620), outline='black', width=16)
d.line((100,360,850,360), fill='black', width=16)
d.line((475,100,475,360), fill='black', width=16)
save('T-cross', img, 'T and crossing')
img = make(); d = ImageDraw.Draw(img)
for b in [80, 180, 290]:
    d.ellipse((b,b,b+960-2*b,b+720-2*b), outline='black', width=8)
save('nested-holes', img, 'nested loops')
for gap in [0,4,8,16,24]:
    img = make(); d = ImageDraw.Draw(img)
    d.line([(160,600),(100,140),(230,80),(360,140),(160+gap*4,600)], fill='black', width=12, joint='curve')
    save('tip-gap-'+str(gap), img, 'terminal cap')
img = make(); d = ImageDraw.Draw(img)
for x in [100,300,500,700]:
    d.line([(x+45,620),(x,130),(x+85,80),(x+160,130),(x+72,620)], fill='black', width=12, joint='curve')
save('dense-tips', img, 'dense terminal caps')
img = make(); d = ImageDraw.Draw(img)
d.line((100,150,850,150), fill='black', width=20)
d.line((475,170,475,620), fill='black', width=20)
save('open-T', img, 'endpoint to interior')
img = make(); d = ImageDraw.Draw(img)
d.line((350,100,350,620), fill='black', width=16)
d.line((382,100,382,620), fill='black', width=16)
save('parallel-open', img, 'near nonconnected lines')
img = make(); d = ImageDraw.Draw(img)
for i, r in enumerate([5,9,13,20,28,40]):
    d.ellipse((75+i*135-r,350-r,75+i*135+r,350+r), outline='black', width=4)
save('tiny-loops', img, 'small areas')
def feedback_lines(name, lines, category):
    img=make();d=ImageDraw.Draw(img)
    for line in lines:d.line([(x*4,y*4) for x,y in line],fill='black',width=12,joint='curve')
    save(name,img,category)
feedback_lines('feedback-taper',[
    [(48,15),(44,42),(47,75),(58,112),(72,141),(84,150)],
    [(97,22),(88,54),(85,91),(89,131),(99,148),(99,154)]
], 'separate converging sides with overshoot')
feedback_lines('feedback-contour',[
    [(110,152),(78,140),(45,102),(40,40),(67,18)],
    [(71,15),(135,15),(195,38),(190,100),(159,135),(128,156)]
], 'continuation closes contour after short root link')
feedback_lines('feedback-open-continuation',[
    [(25,82),(90,82)],[(104,82),(200,82)]
], 'same gap without a closing contour')
feedback_lines('feedback-competing-tips',[
    [(30,20),(40,75),(58,126),(80,150)],
    [(83,20),(77,85),(80,130),(90,151)],
    [(108,20),(103,80),(99,127),(100,150)]
], 'multiple comparable terminal candidates')
feedback_lines('feedback-taper-with-boundary-ahead',[
    [(48,15),(44,42),(47,75),(58,112),(72,141),(84,150)],
    [(97,22),(88,54),(85,91),(89,131),(99,148),(99,154)],
    [(20,170),(200,170)]
], 'same taper facing a shared nearby boundary')
feedback_lines('extension-both-forward',[
    [(20,75),(80,90)],[(100,20),(100,80)]
], 'both forward rays meet; join endpoints directly')
feedback_lines('extension-one-to-interior',[
    [(20,70),(85,85)],[(100,30),(100,140)]
], 'one extended side lands inside another boundary')
feedback_lines('extension-obstructed',[
    [(20,75),(80,90)],[(100,20),(100,80)],[(90,10),(90,150)]
], 'a third boundary blocks virtual meeting')
feedback_lines('relaxed-short-taper',[
    [(40,30),(45,50),(50,65)],[(75,30),(68,50),(64,65)]
], 'short converging sides previously lack long tangent samples')
for seed in range(50):
    rng = random.Random(seed); img = make(); d = ImageDraw.Draw(img)
    for k in range(15):
        points = [(rng.randint(20,940),rng.randint(20,700)) for _ in range(rng.randint(2,7))]
        d.line(points, fill=(rng.randint(0,90),)*3+(255,), width=rng.randint(4,40), joint='curve')
    save('stress-'+str(seed), img, 'runtime stress, no intention labels')
(p/'manifest.json').write_text(json.dumps(entries))
print(len(entries), 'Raster fixtures generated')
