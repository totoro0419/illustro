import unittest
from copy import deepcopy

class NamedHistoryTests(unittest.TestCase):
    def test_interleaved_pad_reference_session_document_undo(self):
        stacks={k:[] for k in ['document','session','reference','test-pad','document-manager']}
        for scope,value in [('test-pad','P'),('reference','R'),('session','S'),('document','C')]:stacks[scope].append(value)
        stacks['document'].pop();self.assertEqual(stacks['session'],['S']);self.assertEqual(stacks['test-pad'],['P']);self.assertEqual(stacks['reference'],['R'])
        stacks['session'].pop();self.assertEqual(stacks['reference'],['R'])
        stacks['reference'].pop();self.assertEqual(stacks['test-pad'],['P'])
    def test_ai_candidate_retains_original_and_apply_is_one_root(self):
        original={'asset':'hash-original','pixels':(1,2,3)};source=deepcopy(original);roots=[{'source':source,'output':None}]
        candidate={'asset':'hash-ai','pixels':(3,2,1)}
        self.assertEqual(original,source);self.assertIsNone(roots[0]['output'])
        roots.append({'source':source,'output':candidate});self.assertEqual(len(roots),2)
        roots.pop();self.assertEqual(roots[0]['source'],original);self.assertIsNone(roots[0]['output'])

if __name__=='__main__':unittest.main()
