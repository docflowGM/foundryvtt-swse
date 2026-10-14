"""Read-only Phase 0-B structural and deep-status gate (draft, no source certification).
Usage: python phase0b_certification_gate.py [--strict]
--strict fails if any null or empty list lacks an explicit fieldStates status.
Does not alter the JSON; an unknown field is NOT automatically marked not-stated.
"""
import json,sys
from pathlib import Path
from jsonschema import Draft202012Validator
D=Path(__file__).resolve().parent
schema=json.loads((D/'swse-phase0b-vehicle.schema.json').read_text())
v=Draft202012Validator(schema)

def escape(s): return str(s).replace('~','~0').replace('/','~1')
def gaps(obj,path=''):
 if obj is None: return [path]
 if isinstance(obj,list):
  return [path] if not obj else [z for i,x in enumerate(obj) for z in gaps(x,path+'/'+str(i))]
 if isinstance(obj,dict):
  return [z for k,x in obj.items() if k!='fieldStates' for z in gaps(x,path+'/'+escape(k))]
 return []

bad=0;incomplete=0;total=0
for fn in ('swse-phase0b-dryrun-fixtures.json','swse-phase0b-additional-vehicle-fixtures.json','swse-phase0b-variant-fixtures.json'):
 data=json.loads((D/fn).read_text())
 group=data['vehicles'] if 'vehicles' in data else data['fixtures']
 group=group.items() if isinstance(group,dict) else enumerate(group)
 for key,obj in group:
  total+=1
  err=list(v.iter_errors(obj))
  gap=set(gaps(obj))-set(obj['fieldStates'])
  if err:
   bad+=1;print('INVALID',fn,key,err[0].message)
  if gap:
   incomplete+=len(gap);print('INCOMPLETE',fn,key,len(gap),'examples:',', '.join(sorted(gap)[:3]))
print('SUMMARY:',total,'schema records;',bad,'invalid;',incomplete,'unclassified null/empty values')
if bad or ('--strict' in sys.argv and incomplete):
 sys.exit(2)
