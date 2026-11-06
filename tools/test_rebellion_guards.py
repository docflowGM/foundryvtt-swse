#!/usr/bin/env python3
"""Negative mutation regression cases; pure memory mutations, no file writes or GitHub calls."""
from pathlib import Path
import copy,importlib.util,json
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('reb',R/'tools/validate_rebellion_local.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
l=json.loads((R/'data/canonical/droids/source-books/rebellion.json').read_text())
e=json.loads((R/'data/audits/droids/rebellion-field-evidence.json').read_text())
v=json.loads((R/'data/audits/droids/rebellion-visual-field-review.json').read_text())
assert not m.validate(l,e,v)
cases=[]
def change(label,which,path,value):
 def f(a,b,c):
  obj={'l':a,'e':b,'v':c}[which]
  for part in path[:-1]:obj=obj[part]
  obj[path[-1]]=value
 cases.append((label,f))
change('incorrectly unlock FX7 hero','l',['sourceEntries',0,'pcConstruction','heroEligibility'],'allowed')
change('incorrectly prohibit R4 hero','l',['sourceEntries',1,'pcConstruction','heroEligibility'],'prohibited')
change('grant unknown LV38 hero','l',['sourceEntries',7,'pcConstruction','heroEligibility'],'allowed')
change('grant named 4LOM hero','l',['sourceEntries',13,'pcConstruction','heroEligibility'],'allowed')
change('grant named IG88 hero','l',['sourceEntries',14,'pcConstruction','heroEligibility'],'allowed')
change('swap two named character identities','l',['sourceEntries',14,'identity','sourceEntryKey'],'REBELLION-DROID-014')
change('named 4LOM converted into stock model','l',['sourceEntries',13,'identity','namedIndividual'],False)
change('IG88 falsely inherits factory statblock','l',['sourceEntries',14,'identity','baseModelSourceKey'],'REBELLION-DROID-004')
change('FX7 gained walking speed','l',['sourceEntries',0,'movement','speedLineRaw'],'6 squares (walking)')
change('HT drone lost hover option','l',['sourceEntries',6,'movement','speedLineRaw'],'4 squares (walking)')
change('RHTC price includes free drones','l',['sourceEntries',5,'economics','newCredits'],29000)
change('Phase I shield made permanent','l',['sourceEntries',9,'defenses','conditionalDefenseRules'],[])
change('Phase II wearable armor rule dropped','l',['sourceEntries',10,'rules','conditionalMechanics'],[])
change('Phase III SR20 doubled','l',['sourceEntries',11,'defenses','shieldRating'],40)
change('Phase III armor rule converted to runtime effect','l',['sourceEntries',11,'rules','conditionalMechanics',0,'executionStatus'],'certified-runtime')
change('BT16 B omarr conversion deleted','l',['sourceEntries',4,'rules','conditionalMechanics'],[])
change('IG88 multiple-copy identity deleted','l',['sourceEntries',14,'rules','conditionalMechanics'],[])
change('4LOM clone progression granted without provenance','l',['sourceEntries',13,'progression','talents'],[{'traitId':'auto'}])
change('RHTC subordinated HT drone mistaken for installed weapon','l',['sourceEntries',5,'systems','installed'],[{'instanceId':'drone'}])
change('HT drone blast attack made executable','l',['sourceEntries',6,'combat','attackGroups'],[{'attackId':'blaster','operationStatus':'certified-executable'}])
change('Dark Trooper droid inventory turns into wearable suit','l',['sourceEntries',10,'equipment','installed'],[{'instanceId':'phase2-suit'}])
change('FABRICATED chargen starting profile','l',['sourceEntries',1,'pcConstruction','creationRoute'],'stock-model')
change('CON missing evidence state','l',['sourceEntries',0,'fieldStates','/abilities/con'],'not-stated')
change('untracked new null','l',['sourceEntries',0,'processor','unreviewedId'],None)
change('flatfooted defense inflated','l',['sourceEntries',12,'defenses','flatFootedReflex'],55)
change('HP became negative','l',['sourceEntries',12,'durability','hitPoints'],-1)
change('selected source field evidence doctored','e',['records',0,'pdfVisualFieldChecks','fieldValues','/durability/hitPoints'],900)
change('visual comparison count forged','v',['directFieldComparisons'],3)
change('PDF source hash receipt changed','v',['sourcePdfHash'],'invalid')
change('source printed page moved','l',['sourceEntries',10,'publication','printedPageStart'],130)
change('printed language trait unexpectedly active','l',['sourceEntries',0,'rules','mechanicalExecutionStatus'],'certified')
change('claim mechanically certified without review','l',['sourceEntries',0,'certification','mechanicalStatus'],'certified')
change('runtime certification unverified','l',['sourceEntries',0,'certification','runtimeStatus'],'live-verified')
change('publication identity remapped','l',['bookId'],'CORE')
for name,mutation in cases:
 a,b,c=copy.deepcopy(l),copy.deepcopy(e),copy.deepcopy(v)
 mutation(a,b,c)
 errors=m.validate(a,b,c)
 if not errors:raise AssertionError('GUARD NOT TRIGGERED: '+name)
print(f'Rebellion negative regression suite PASS {len(cases)}/{len(cases)}, clean baseline also PASS; no files modified.')
