"""Build a standalone browser preview; no product engine is imported."""
from pathlib import Path
import importlib.util,sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('routes',ROOT/'tools/build_ui_routes.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);mod.build()
p=ROOT/'qa/ui-prototype'
html=(p/'shell.html').read_text()
for marker,name in [('STYLE','style.css'),('ROUTES','routes.js'),('MODEL','model.js'),('APP','app.js')]:
 html=html.replace('/* '+marker+' */',(p/name).read_text().replace('</script','<\\/script'))
(p/'index.html').write_text(html)
print('standalone preview:',len(html.encode()),'bytes')
