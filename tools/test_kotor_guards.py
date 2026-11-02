#!/usr/bin/env python3
"""Fail-closed negative mutation tests for KOTOR local selected-source semantics."""
from pathlib import Path
import sys,copy,json
sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate_kotor_local import validate
R=Path(__file__).resolve().parents[1]
l=json.loads((R/'data/canonical/droids/source-books/kotor.json').read_text())
e=json.loads((R/'data/audits/droids/kotor-field-evidence.json').read_text())
v=json.loads((R/'data/audits/droids/kotor-visual-field-review.json').read_text())
assert not validate(l,e,v,external=False)
def check(label,mutate):
 a,b,c=copy.deepcopy((l,e,v));mutate(a,b,c)
 errors=validate(a,b,c,external=False)
 assert errors,f'UNSAFE MUTATION ACCEPTED: {label}'
 print('PASS',label,':',errors[0]);return True
checks=[
 ('source duplicate',lambda a,b,c:a['sourceEntries'][1]['identity'].__setitem__('sourceEntryKey','KOTOR-DROID-001')),
 ('page anchor drift',lambda a,b,c:a['sourceEntries'][0]['publication'].__setitem__('printedPageStart',99)),
 ('HK-24 hero override',lambda a,b,c:a['sourceEntries'][5]['pcConstruction'].__setitem__('heroEligibility','allowed')),
 ('HK-50 hero override',lambda a,b,c:a['sourceEntries'][7]['pcConstruction'].__setitem__('heroEligibility','allowed')),
 ('Independent HK unconditional',lambda a,b,c:a['sourceEntries'][6]['pcConstruction'].__setitem__('heroEligibility','allowed')),
 ('HK estimated value changed to retail',lambda a,b,c:a['sourceEntries'][5]['economics'].__setitem__('forSale',True)),
 ('Basilisk gains droid actor authority',lambda a,b,c:a['sourceEntries'][18]['classification'].__setitem__('primaryActorAuthority','droid')),
 ('Basilisk actor HP leak',lambda a,b,c:a['sourceEntries'][18]['durability'].__setitem__('hitPoints',70)),
 ('Basilisk actor DR leak',lambda a,b,c:a['sourceEntries'][18]['defenses'].__setitem__('damageReduction',5)),
 ('Basilisk invented degree',lambda a,b,c:a['sourceEntries'][18]['classification'].__setitem__('publishedDegree',4)),
 ('Basilisk source vehicle stats lost',lambda a,b,c:b['records'][18]['vehiclePrintedStatblock'].__setitem__('hitPoints',None)),
 ('Certified executable attack injected',lambda a,b,c:a['sourceEntries'][5]['combat'].__setitem__('attackGroups',[{'attackId':'hack','operationStatus':'certified-executable'}])),
 ('Unreviewed factory feat injected',lambda a,b,c:a['sourceEntries'][5]['progression'].__setitem__('feats',[{'traitId':'attack-all','enabledInRuntime':True}])),
 ('Premature mechanical certification',lambda a,b,c:a['sourceEntries'][12]['certification'].__setitem__('mechanicalStatus','certified')),
 ('Named HK-47 made generic',lambda a,b,c:a['sourceEntries'][20]['identity'].__setitem__('namedIndividual',False)),
 ('HK-47 falsely derived from HK heroic template',lambda a,b,c:a['sourceEntries'][20]['identity'].__setitem__('baseModelSourceKey','KOTOR-DROID-007')),
 ('T3-M4 stock relationship lost',lambda a,b,c:a['sourceEntries'][21]['identity'].__setitem__('baseModelSourceKey',None)),
 ('Source PDF evidence mismatched',lambda a,b,c:c.__setitem__('sourcePdfHash','wrong')),
 ('Field receipt silently changed',lambda a,b,c:a['sourceEntries'][0]['defenses'].__setitem__('reflex',35)),
 ('Unattributed null',lambda a,b,c:a['sourceEntries'][18]['fieldStates'].pop('/classification/publishedDegree')),
 ('Executable conditional rule grant',lambda a,b,c:a['sourceEntries'][18]['rules']['conditionalMechanics'][0].__setitem__('executionStatus','certified-runtime')),
 ('Unproven starting profile',lambda a,b,c:a['sourceEntries'][6]['pcConstruction'].__setitem__('startingProfileRef','factory-unproven')),
 ('Unproven creation route',lambda a,b,c:a['sourceEntries'][5]['pcConstruction'].__setitem__('creationRoute','stock-model')),
 ('Printed speed overwritten by derived description',lambda a,b,c:a['sourceEntries'][9]['movement'].__setitem__('speedLineRaw','fictional')),
 ('Installed component without certification',lambda a,b,c:a['sourceEntries'][8]['systems'].__setitem__('installed',[{'instanceId':'invented'}])),
 ('Visual counter tampered',lambda a,b,c:c.__setitem__('directFieldComparisons',999)),
]
for label,fn in checks:check(label,fn)
print('KOTOR_NEGATIVE_TESTS',len(checks),'/',len(checks),'PASS')
