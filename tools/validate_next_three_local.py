#!/usr/bin/env python3
"""Fail-closed semantic checks for CORE/LEGACY/FORCE local draft source ledgers.
Does not claim full upstream JSON Schema validation or runtime mechanical certification.
"""
from pathlib import Path
import json,hashlib,sys
R=Path(__file__).resolve().parents[1]
C={'core':13,'legacy':12,'force':11}
GROUPS={'identity','publication','classification','challenge','geometry','abilities','progression','defenses','durability','movement','anatomy','processor','programming','combat','capacity','systems','equipment','modifications','pcConstruction','vehicleLink','economics','text','exceptions','fieldStates','rules','certification'}

def collect_nulls(o,path=''):
 if o is None:
  yield path
 elif isinstance(o,dict):
  for k,v in o.items():yield from collect_nulls(v,path+'/'+k.replace('~','~0').replace('/','~1'))
 elif isinstance(o,list):
  for i,v in enumerate(o):yield from collect_nulls(v,path+'/'+str(i))

def run(book,ledger=None,evidence=None,review=None):
 lid=book.upper();ledger=ledger if ledger is not None else json.loads((R/f'data/canonical/droids/source-books/{book}.json').read_text())
 evidence=evidence if evidence is not None else json.loads((R/f'data/audits/droids/{book}-field-evidence.json').read_text())
 review=review if review is not None else json.loads((R/f'data/audits/droids/{book}-visual-field-review.json').read_text())
 a=ledger['sourceEntries'];n=C[book]
 assert ledger['bookId']==lid and len(a)==n
 assert len(evidence['records'])==len(review['items'])==n
 assert review['manualVisualReviews']==n and len(set(x['identity']['sourceEntryKey'] for x in a))==n
 cmp=0
 for i,(r,e,v) in enumerate(zip(a,evidence['records'],review['items']),1):
  k=f'{lid}-DROID-{i:03d}'; assert r['identity']['sourceEntryKey']==e['sourceEntryKey']==v['sourceEntryKey']==k
  assert r['recordType']=='droid-publication-source-entry' and r['schemaVersion']=='swse.droid.universal-source/0.1-draft'
  assert GROUPS.issubset(r) and r['classification']['primaryActorAuthority']=='droid'
  assert r['classification']['statblockFormat']=='droid-actor' and r['classification']['ruleEntityNature']=='standard-droid'
  assert r['rules']['mechanicalExecutionStatus']=='source-only'
  assert r['certification']['identityStatus']=='pdf-reviewed' and r['certification']['mechanicalStatus']!='certified'
  assert r['certification']['runtimeStatus']=='not-tested'
  assert r['abilities']['con'] is None and r['fieldStates']['/abilities/con']=='explicitly-none'
  assert r['pcConstruction']['heroEligibility'] in ('allowed','prohibited','conditional',None)
  assert not r['combat'].get('attackGroups') and not r['progression'].get('feats') and not r['progression'].get('talents')
  assert not r['systems'].get('installed') and not r['equipment'].get('weapons')
  rules=r['rules'].get('conditionalMechanics',[])
  assert not any(vv.get('executionStatus')!='source-only' or vv.get('effectRef') for vv in rules)
  assert all(vv.get('source',{}).get('book')==ledger['book'] and
             isinstance(vv.get('source',{}).get('page'),int) and
             vv.get('source',{}).get('sourceEntryKey')==k for vv in rules)
  assert all(not x.get('enabledInRuntime') for g in ('immunities','resistances') for x in r['defenses'].get(g,[]))
  for nk in ('hitPoints','damageThreshold'):
   if nk in r['durability']:assert 0<=r['durability'][nk]<=999
  for nk in ('reflex','flatFootedReflex','fortitude','will'):
   if nk in r['defenses']:assert 0<=r['defenses'][nk]<=60
  for path in collect_nulls(r):
   # nested optional nulls in source citations (there are none here) are still tracked.
   assert r['fieldStates'].get(path) in ('not-stated','not-applicable','explicitly-none','unclear-source','not-yet-reviewed','source-verified'),(k,path)
  checks=e['pdfVisualFieldChecks']['fieldValues'];assert len(checks)==e['pdfVisualFieldChecks']['fieldComparisonCount']==v['verifiedFieldCount']
  assert (R/e['pdfVisualFieldChecks']['sourceImage']).exists(),k
  for path,value in checks.items():
   obj=r
   for part in path.split('/')[1:]:obj=obj[part]
   assert obj==value,(k,path,obj,value)
  cmp+=len(checks)
 assert review['directFieldComparisons']==cmp
 # Critical high-risk invariants, include both source and procedural correctness.
 if book=='core':
  assert a[3]['pcConstruction']['heroEligibility']=='prohibited' and a[4]['pcConstruction']['heroEligibility']=='allowed'
  assert a[5]['challenge']['challengeLevel']==4
  assert any('CL 6' in s for s in a[5]['exceptions']['transcriptionWarnings'])
  assert a[6]['challenge']['challengeLevel']==3 and a[8]['challenge']['challengeLevel']==6
  assert a[11]['identity']['namedIndividual'] and a[12]['identity']['namedIndividual']
  assert a[12]['progression']['classLineRaw']=='nonheroic 1/noble 5'
 if book=='legacy':
  assert a[7]['classification']['publishedDegree'] is None
  assert a[7]['classification']['contextualDegreeHeading']==4
  assert a[7]['fieldStates']['/classification/publishedDegree']=='not-stated'
  assert a[8]['pcConstruction']['heroEligibility']=='allowed'
  assert not a[9]['combat'].get('attackGroups')
 if book=='force':
  assert a[3]['classification']['publishedDegree'] is None and a[4]['classification']['publishedDegree'] is None and a[5]['classification']['publishedDegree'] is None
  assert a[3]['defenses']['reflex']==14 and a[3]['defenses']['flatFootedReflex']==11
  assert a[6]['pcConstruction']['heroEligibility']=='conditional' and a[6]['pcConstruction']['heroEligibilityCondition']
  assert a[8]['identity']['namedIndividual'] and a[8]['rules']['mechanicalExecutionStatus']=='source-only'
  assert a[2]['economics']['newCredits']==25000 and a[2]['economics']['usedCredits']==8000
  assert a[9]['combat'].get('attackGroups') is None
 return {'bookId':lid,'sourceEntries':n,'pdfVisualReviews':n,'directComparedFields':cmp,'mechanicallyCertified':0,
  'semanticValidation':'PASS','fullUpstreamJsonSchema202012Validated':False,'foundryV13RuntimeCertified':False,
  'scope':'Selected field review, not entire mechanical source field or narrative certification.'}

if __name__=='__main__':
 for book in C:
  result=run(book)
  path=R/f'docs/audits/droids/{book}-local-validation.json';path.write_text(json.dumps(result,indent=2)+'\n')
  print(book.upper(),result['sourceEntries'],'entries',result['directComparedFields'],'comparisons; PASS')
