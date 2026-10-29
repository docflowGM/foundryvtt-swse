#!/usr/bin/env python3
"""Read-only universal SWSE droid source-schema semantic checks. No canonical source mutation."""
import json, sys
from pathlib import Path
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[3] / 'data/audits/droids'
SCHEMA=json.loads((ROOT/'universal-droid-source-entry.schema.json').read_text())
DRAFT=Draft202012Validator(SCHEMA)

def pointer(path):return '/'+'/'.join(str(p).replace('~','~0').replace('/','~1') for p in path)

def values(obj,path=()):
 if isinstance(obj,dict):
  for k,v in obj.items():
   if k=='fieldStates' and not path:continue
   yield from values(v,path+(k,))
 elif isinstance(obj,list):
  if not obj:yield path,obj
  else:
   for i,v in enumerate(obj):yield from values(v,path+(i,))
 else:yield path,obj

def verify(x,require_complete=False):
 errors=[f'JSON schema: {e.json_path} {e.message}' for e in DRAFT.iter_errors(x)]
 if errors:return errors
 states=x.get('fieldStates',{})
 all_seen=set()
 for path,v in values(x):
  ptr=pointer(path)
  all_seen.add(ptr)
  if v is None and states.get(ptr) not in ('not-stated','not-applicable','explicitly-none','unclear-source'):
   errors.append(f'{ptr}: persisted null needs pointer evidence; never represents allowed or approved')
  if v==[] and states.get(ptr)!='explicitly-none':
   errors.append(f'{ptr}: explicit empty array requires explicitly-none evidence; omitted array means unreviewed/unlisted')
  if v is not None and not isinstance(v,(dict,list)) and states.get(ptr) in ('not-stated','not-applicable','explicitly-none','unclear-source'):
   errors.append(f'{ptr}: source-absence status contradicts known nonnull value')
 for ptr,status in states.items():
  if status=='not-yet-reviewed' and require_complete:errors.append(f'{ptr}: not yet reviewed')
  if status=='unclear-source' and require_complete:errors.append(f'{ptr}: unresolved printed ambiguity')
  if ptr not in all_seen and status in ('explicitly-none','source-verified'):
   errors.append(f'{ptr}: state claims proof on omitted property')
 if require_complete:
  if x['certification']['identityStatus']!='source-verified':errors.append('identity not source-verified')
  if x['certification']['mechanicalStatus']!='certified':errors.append('mechanics not certified')
  if x['exceptions'].get('unmappedFacts'):errors.append('source facts still unmapped')
  for c in x['exceptions'].get('sourceContradictions',[]) or []:
   if c.get('resolutionStatus')=='unresolved':errors.append('source contradiction unresolved '+str(c.get('issueId')))
 return errors

def fixture(label,mutator=None):
 x=json.loads((ROOT/'universal-droid-source-entry.blank.json').read_text())
 x['identity']={'sourceEntryKey':'SYNTH-001','printedName':'Synthetic test droid'}
 x['publication']={'book':'SYNTHETIC TEST — NOT A PUBLICATION'}
 if mutator:mutator(x)
 return x

# Positive: known sibling remains while not stated child is null.
def positive(x):
 x['defenses']={'reflex':15,'will':None}
 x['fieldStates']['/defenses/will']='not-stated'
 x['abilities']={'con':None}
 x['fieldStates']['/abilities/con']='explicitly-none'
 x['equipment']={'possessions':[]}
 x['fieldStates']['/equipment/possessions']='explicitly-none'
 x['classification']={'publishedDegree':None}
 x['fieldStates']['/classification/publishedDegree']='not-stated'
 x['systems']=None
 x['fieldStates']['/systems']='not-stated'
 x['pcConstruction']={'heroEligibility':None}
 x['fieldStates']['/pcConstruction/heroEligibility']='not-stated'

checks=[
 ('positive known sibling, confirmed source silence, literal printed absence',positive,True),
 ('null cannot mean permission',lambda x:x.update({'systems':None}),False),
 ('blank array not evidence of printed none',lambda x:x.update({'systems':{'installed':[]}}),False),
 ('unknown child cannot erase known parent',lambda x:x.update({'abilities':{'str':14,'dex':None}}),False),
 ('no numeric zero substituted for unknown',lambda x:x.update({'abilities':{'con':None},'fieldStates':{'/abilities/con':'not-stated'}}),True),
 ('unknown weapon listing must not create installed attacks',lambda x:x.update({'combat':{'attackGroups':None},'fieldStates':{'/combat/attackGroups':'not-stated'}}),True),
]
for label,fn,expected in checks:
 x=fixture(label,fn)
 errors=verify(x)
 got=not errors
 if got!=expected:
  print('FAIL:',label,'expected',expected,'errors:',errors[:5]);sys.exit(1)
 print('PASS:',label,'accepted' if got else 'rejected')
blank=json.loads((ROOT/'universal-droid-source-entry.blank.json').read_text())
assert not verify(blank),verify(blank)
print('PASS: universal blank draft structurally valid, NOT certified')
assert verify(blank,require_complete=True)
print('PASS: source-only blank fails independent mechanical certification')
print('PASS: semantic checks completed')
