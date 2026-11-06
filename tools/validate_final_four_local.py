#!/usr/bin/env python3
"""Source-only semantic checks, four remaining books; not upstream schema validation."""
from pathlib import Path
import copy,json,sys
R=Path(__file__).resolve().parents[1]
TOTAL={'goi':8,'unknown':6,'scum':5,'sotg':3}
GROUPS={'identity','publication','classification','challenge','geometry','abilities','progression','defenses','durability','movement','anatomy','processor','programming','combat','capacity','systems','equipment','modifications','pcConstruction','vehicleLink','economics','text','exceptions','fieldStates','rules','certification'}
def paths(x,path=''):
 if x is None:yield path
 if isinstance(x,dict):
  for k,v in x.items():yield from paths(v,path+'/'+k.replace('~','~0').replace('/','~1'))
 if isinstance(x,list):
  for i,v in enumerate(x):yield from paths(v,path+'/'+str(i))
def run(book,ledger=None,evidence=None,visual=None,ship=None):
 b=book.upper();n=TOTAL[book]
 if ledger is None:ledger=json.loads((R/f'data/canonical/droids/source-books/{book}.json').read_text())
 if evidence is None:evidence=json.loads((R/f'data/audits/droids/{book}-field-evidence.json').read_text())
 if visual is None:visual=json.loads((R/f'data/audits/droids/{book}-visual-field-review.json').read_text())
 if b=='SOTG' and ship is None:ship=json.loads((R/'data/audits/droids/sotg-vehicle-source-evidence.json').read_text())
 entries=ledger['sourceEntries'];records=evidence['records'];recs=visual['items'];assert len(entries)==len(records)==len(recs)==n
 assert ledger['bookId']==b and ledger['expectedPublicationClaims']==n
 assert len({e['identity']['sourceEntryKey'] for e in entries})==n
 total=0
 for i,(e,v,j) in enumerate(zip(entries,records,recs),1):
  k=f'{b}-DROID-{i:03d}';assert e['identity']['sourceEntryKey']==v['sourceEntryKey']==j['sourceEntryKey']==k
  assert e['schemaVersion']=='swse.droid.universal-source/0.1-draft' and e['recordType']=='droid-publication-source-entry'
  assert GROUPS.issubset(e)
  assert e['rules']['mechanicalExecutionStatus']=='source-only'
  assert e['certification']['mechanicalStatus']!='certified' and e['certification']['runtimeStatus']=='not-tested'
  assert e['certification']['identityStatus']=='pdf-reviewed'
  assert not e['combat'].get('attackGroups') and not e['combat'].get('specialActions')
  assert not e['progression'].get('feats') and not e['progression'].get('talents')
  assert not e['systems'].get('installed') and not e['equipment'].get('weapons')
  assert not e['vehicleLink'].get('vehicleSourceKey')
  assert not any(t.get('executionStatus')!='source-only' or t.get('effectRef') for t in e['rules'].get('conditionalMechanics',[]))
  for p in paths(e):assert e['fieldStates'].get(p) in {'not-stated','not-applicable','explicitly-none','unclear-source','not-yet-reviewed','source-verified'},(k,p)
  if b=='SOTG':
   assert e['classification']['primaryActorAuthority']=='vehicle'
   assert e['classification']['statblockFormat']=='vehicle'
   assert e['classification']['ruleEntityNature']=='vehicle-format-droid'
   assert e['classification']['publishedDegree'] is None
   assert e['pcConstruction']['heroEligibility'] is None
   assert e['abilities']=={} and e['durability']=={} and e['defenses']=={}
  else:
   assert e['classification']['primaryActorAuthority']=='droid'
   assert e['classification']['statblockFormat']=='droid-actor'
   assert e['abilities']['con'] is None and e['fieldStates']['/abilities/con']=='explicitly-none'
   assert e['pcConstruction']['heroEligibility'] in ('allowed','prohibited',None)
  fields=v['pdfVisualFieldChecks']['fieldValues'];assert len(fields)==v['pdfVisualFieldChecks']['fieldComparisonCount']==j['verifiedFieldCount']
  assert (R/v['pdfVisualFieldChecks']['sourceImage']).exists()
  for path,val in fields.items():
   obj=e
   for part in path.split('/')[1:]:obj=obj[part]
   assert obj==val,(k,path,obj,val)
  total+=len(fields)
 assert total==visual['directFieldComparisons']
 if b=='GOI':
  assert entries[1]['pcConstruction']['heroEligibility']=='prohibited'
  assert entries[1]['exceptions']['sourceContradictions'][0]['resolutionStatus']=='unresolved'
  assert entries[2]['pcConstruction']['heroEligibility']=='allowed'
  assert entries[3]['pcConstruction']['heroEligibility'] is None
 if b=='UNKNOWN':
  assert entries[0]['durability']['hitPoints']==3
  assert entries[1]['defenses']['will']==12
  assert entries[2]['durability']['hitPoints']==33 and entries[2]['defenses']['reflex']==17
 if b=='SCUM':
  assert entries[2]['pcConstruction']['heroEligibility'] is None
  assert entries[3]['pcConstruction']['heroEligibility'] is None
 if b=='SOTG':
  assert ship['droidActorPropertiesCopied'] is False and ship['sourceOnly'] is True
  assert len(ship['vehicles'])==3
  assert all(x['owner']=='vehicle' and x['weaponOwnership']=='SOURCE_ONLY_UNCERTIFIED' for x in ship['vehicles'])
  assert ship['vehicles'][2]['vehicleSourceValues']['shieldRating']==20
 return {'book':b,'entries':n,'pdfSelectedReviews':n,'fieldComparisons':total,'mechanicalCertifications':0,
  'localSemantic':'PASS','upstreamSchemaCertified':False,'foundryRuntimeCertified':False}

if __name__=='__main__':
 for b in TOTAL:
  z=run(b)
  (R/f'docs/audits/droids/{b}-local-validation.json').write_text(json.dumps(z,indent=2)+'\n')
  print(b,z)
