"""Record only actually executed reference checks; no product or device claims."""
import unittest,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent
class Results(unittest.TextTestResult):
    def __init__(self,*a,**k):super().__init__(*a,**k);self.cases=[]
    def addSuccess(self,test):super().addSuccess(test);self.cases.append({'case':test.id(),'status':'pass'})
    def addFailure(self,test,err):super().addFailure(test,err);self.cases.append({'case':test.id(),'status':'fail'})
    def addError(self,test,err):super().addError(test,err);self.cases.append({'case':test.id(),'status':'error'})
    def addSkip(self,test,reason):super().addSkip(test,reason);self.cases.append({'case':test.id(),'status':'unverified','reason':reason})
suite=unittest.defaultTestLoader.discover(str(ROOT))
r=unittest.TextTestRunner(verbosity=2,resultclass=Results).run(suite)
report={'kind':'CPU-limited-reference','cases':r.cases,'testsRun':r.testsRun,'success':r.wasSuccessful(),
        'source_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(ROOT.glob('*.py'))},
        'unverified':['production renderer','GPU performance','arbitrary ICC','Native/OPFS durability','physical stylus/touch','full production Warp/Liquify/ICC and GPU rasterization'],
        'assertion':'Rational literal pixels, limited triangle geometry and finite state transitions only'}
(ROOT/'evidence'/'reference-results.json').write_text(json.dumps(report,indent=2)+'\n')
raise SystemExit(0 if r.wasSuccessful() else 1)
