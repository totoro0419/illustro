"""Bounded state reference; deliberately no real scheduler/storage implementation."""
from copy import deepcopy
import json, hashlib

class Graph:
    def __init__(self):
        self.jobs={};self.past=[];self.future=[];self.fences=[];self.device=1;self.view=0;self.sequence=0
    def accept(self,key,value,deps=()):
        if key in self.jobs or any(d not in self.jobs for d in deps):raise ValueError('identity/dependency')
        self.jobs[key]={'value':value,'deps':list(deps),'state':'pending','device':self.device,'key':key}
        self.past.append(key);self.future=[]
    def undo(self):
        if self.past:self.future.append(self.past.pop())
    def redo(self):
        if self.future:self.past.append(self.future.pop())
    def save(self):
        self.sequence+=1;f={'sequence':self.sequence,'ops':list(self.past),'state':'requested'};self.fences.append(f);return f
    def complete(self,key,device=None,identity=None):
        j=self.jobs[key]
        if device is not None and device!=self.device:return False
        if identity is not None and identity!=j['key']:return False
        if any(self.jobs[d]['state']!='ready' for d in j['deps']):return False
        j['state']='ready';return True
    def fail(self,key,permanent=True):
        self.jobs[key]['state']='failed' if permanent else 'retryable'
        if permanent:
            changed=True
            while changed:
                changed=False
                for j in self.jobs.values():
                    if j['state'] not in ('failed','blocked') and any(self.jobs[d]['state'] in ('failed','blocked') for d in j['deps']):j['state']='blocked';changed=True
            for f in self.fences:
                if any(self.jobs[k]['state'] in ('failed','blocked') for k in f['ops']):f['state']='failed'
    def retry(self,key):
        if self.jobs[key]['state']!='retryable':raise ValueError('not retryable')
        self.jobs[key]['state']='pending'
    def rescue(self,consent=False):
        if not consent:raise ValueError('explicit consent required')
        self.past=[k for k in self.past if self.jobs[k]['state'] not in ('failed','blocked')];self.future=[]
    def lose_device(self):
        self.device+=1
        for j in self.jobs.values():
            if j['state']=='pending':j['device']=self.device
    def materialize(self,fence):
        if fence['state']=='failed':raise ValueError('failed fence')
        if any(self.jobs[k]['state']!='ready' for k in fence['ops']):raise ValueError('not formal')
        return {'ops':fence['ops'],'values':[self.jobs[k]['value'] for k in fence['ops']]}
    def snapshot(self):
        # A ready prefix plus ordered previews is one immutable generation. Late old
        # branch output is retained in jobs, but cannot insert itself into current IDs.
        formal=[];preview=[];pending=False
        for k in self.past:
            pending=pending or self.jobs[k]['state']!='ready'
            (preview if pending else formal).append(k)
        return {'formal':tuple(formal),'preview':tuple(preview),'view':self.view}
    def pins(self):return set(self.past+self.future+[k for f in self.fences for k in f['ops']])

class Store:
    """Content-addressed immutable generations, validated before catalog publication."""
    def __init__(self): self.blocks={};self.catalog=None
    def write(self,sequence,payload,crash=None,quota=False):
        old=self.catalog
        raw=json.dumps(payload,sort_keys=True).encode();digest=hashlib.sha256(raw).hexdigest()
        if quota:return False
        self.blocks[digest]=raw
        if crash=='blocks':return False
        manifest={'sequence':sequence,'hash':digest}
        if crash=='manifest':return False
        if hashlib.sha256(self.blocks[digest]).hexdigest()!=digest:raise ValueError('corrupt')
        if crash=='checked':return False
        # Within one destination writer, older requests must not replace a newer save.
        if old is None or sequence>old['sequence']:self.catalog=manifest
        return True
    def reload(self):
        if self.catalog is None:return None
        raw=self.blocks[self.catalog['hash']]
        if hashlib.sha256(raw).hexdigest()!=self.catalog['hash']:raise ValueError('corrupt')
        return json.loads(raw)

class Writer:
    def __init__(self,capacity,output_reserve=1):
        if capacity<output_reserve:raise MemoryError('no admission')
        self.capacity=capacity-output_reserve;self.samples=[];self.first_rejected=None;self.rejected_count=0;self.status='writing';self.transaction=None
    def sample(self,v):
        if len(self.samples)==self.capacity or self.status!='writing':
            if self.first_rejected is None:self.first_rejected=len(self.samples)
            self.rejected_count+=1;self.status='paused';return False
        self.samples.append(v);return True
    def end(self,cancel=False):
        if cancel or self.status=='paused':self.status='recoverable';return None
        self.transaction=tuple(self.samples);self.status='accepted';return self.transaction

    def rescue_prefix(self,consent=False):
        if not consent or self.status!='recoverable':raise ValueError('explicit rescue required')
        self.transaction=tuple(self.samples);self.status='rescued-prefix';return self.transaction
