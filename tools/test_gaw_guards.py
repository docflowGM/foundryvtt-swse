#!/usr/bin/env python3
"""Fail-closed negative mutation suite for the GAW publication ledger; no writes."""
import copy,json,importlib.util
from pathlib import Path
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('val',R/'tools/validate_gaw_local.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
l=json.loads((R/'data/canonical/droids/source-books/gaw.json').read_text())
e=json.loads((R/'data/audits/droids/gaw-field-evidence.json').read_text())
v=json.loads((R/'data/audits/droids/gaw-visual-field-review.json').read_text())
assert not m.validate(l,e,v),m.validate(l,e,v)
cases=[]
def case(label,fn):cases.append((label,fn))
def mutate(typ,index,field,value):
 def f(a,b,c):
  z={'l':a,'e':b,'v':c}[typ]
  p=z
  for k in index:p=p[k]
  p[field]=value
 return f
case('factory hero permission reversed',mutate('l',['sourceEntries',3,'pcConstruction'],'heroEligibility','allowed'))
case('uncertain hero granted',mutate('l',['sourceEntries',11,'pcConstruction'],'heroEligibility','allowed'))
case('banned model made allowed',mutate('l',['sourceEntries',10,'pcConstruction'],'heroEligibility','allowed'))
case('printed hero falsely banned',mutate('l',['sourceEntries',0,'pcConstruction'],'heroEligibility','prohibited'))
case('sentry base Reflex polluted by cover',mutate('l',['sourceEntries',11,'defenses'],'reflex',20))
case('sentry page175 receipt erased',mutate('e',['records',11,'alternatePrintPresentation'],'encounterReflex',15))
case('sentry cover rule removed',mutate('l',['sourceEntries',11,'defenses'],'conditionalDefenseRules',[]))
case('sentry cover activated',mutate('l',['sourceEntries',11,'defenses','conditionalDefenseRules',0],'executionStatus','certified-runtime'))
case('GAT authority reassigned droid',mutate('l',['sourceEntries',18,'classification'],'primaryActorAuthority','droid'))
case('GAT actor HP imported',mutate('l',['sourceEntries',18,'durability'],'hitPoints',175))
case('GAT DR evidence erased',mutate('e',['records',18,'nonActorPrintedStatblock','selectedFields'],'damageReduction',None))
case('GAT degree falsely assigned',mutate('l',['sourceEntries',18,'classification'],'publishedDegree',4))
case('squad authority reassigned actor',mutate('l',['sourceEntries',19,'classification'],'primaryActorAuthority','droid'))
case('squad HP imported as droid HP',mutate('l',['sourceEntries',19,'durability'],'hitPoints',20))
case('squad printed HP evidence erased',mutate('e',['records',19,'nonActorPrintedStatblock','selectedFields'],'hitPoints',None))
case('squad p220 duplicate falsely restored',mutate('e',['records',19],'samePublicationPresentations',[{'printedPage':220}]))
case('squad p220 census correction erased',mutate('e',['records',19],'censusPresentationDiscrepancy',{}))
case('Purge Trooper DR dropped',mutate('l',['sourceEntries',5,'defenses'],'damageReduction',0))
case('unverified attack given permission',mutate('l',['sourceEntries',0,'combat'],'attackGroups',[{'attackId':'illegal','operationStatus':'certified-executable'}]))
case('unverified system installed',mutate('l',['sourceEntries',0,'systems'],'installed',[{'instanceId':'illegal'}]))
case('feat grant without provenance',mutate('l',['sourceEntries',0,'progression'],'feats',[{'traitId':'illegal'}]))
case('talent grant without provenance',mutate('l',['sourceEntries',0,'progression'],'talents',[{'traitId':'illegal'}]))
case('locomotion installed without component',mutate('l',['sourceEntries',0,'movement'],'locomotionSystems',[{'instanceId':'illegal'}]))
case('fabricated PC build route',mutate('l',['sourceEntries',0,'pcConstruction'],'creationRoute','stock-model'))
case('fabricated base model inheritance',mutate('l',['sourceEntries',3,'identity'],'baseModelSourceKey','CORE-DROID-005'))
case('runtime rules global certified',mutate('l',['sourceEntries',0,'rules'],'mechanicalExecutionStatus','certified'))
case('claim mechanically certified',mutate('l',['sourceEntries',0,'certification'],'mechanicalStatus','certified'))
case('claim runtime certified',mutate('l',['sourceEntries',0,'certification'],'runtimeStatus','live-verified'))
case('source entry identity altered',mutate('l',['sourceEntries',0,'identity'],'sourceEntryKey','GAW-DROID-999'))
case('printed page altered',mutate('l',['sourceEntries',0,'publication'],'printedPageStart',52))
case('evidence field silently edited',mutate('e',['records',0,'pdfVisualFieldChecks','fieldValues'],'/durability/hitPoints',500))
case('visual comparison count forged',mutate('v',[],'directFieldComparisons',1))
case('review source hash altered',mutate('v',[],'sourcePdfHash','bad'))
case('price made invalid',mutate('l',['sourceEntries',0,'economics'],'newCredits',0))
case('untracked explicit null added',mutate('l',['sourceEntries',0,'abilities'],'con',None))
case('sentry source rule executed',mutate('l',['sourceEntries',11,'rules','conditionalMechanics',0],'effectRef','fake-effect'))
case('vehicle evidence ownership reversed',mutate('e',['records',18,'nonActorPrintedStatblock'],'owner','droid'))
case('sourcebook changed',mutate('l',[],'bookId','CLONE'))
passed=0
for label,fn in cases:
 a,b,c=copy.deepcopy(l),copy.deepcopy(e),copy.deepcopy(v)
 fn(a,b,c)
 errs=m.validate(a,b,c)
 if not errs:raise AssertionError('GUARD FAILED: '+label)
 passed+=1
print(f'GAW mutation regression suite PASS: {passed}/{len(cases)} negative cases + baseline PASS. No filesystem mutation.')
