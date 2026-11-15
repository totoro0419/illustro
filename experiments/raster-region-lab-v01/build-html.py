from pathlib import Path
p=Path(__file__).parent
(p/'illustro-raster-region-lab.html').write_text((p/'template.html').read_text().replace('/* ENGINE_INLINE */',(p/'engine.js').read_text()))
