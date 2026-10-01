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
for seed in range(50):
    rng = random.Random(seed); img = make(); d = ImageDraw.Draw(img)
    for k in range(15):
        points = [(rng.randint(20,940),rng.randint(20,700)) for _ in range(rng.randint(2,7))]
        d.line(points, fill=(rng.randint(0,90),)*3+(255,), width=rng.randint(4,40), joint='curve')
    save('stress-'+str(seed), img, 'runtime stress, no intention labels')
(p/'manifest.json').write_text(json.dumps(entries))
print(len(entries), 'Raster fixtures generated')
