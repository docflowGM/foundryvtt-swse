#!/usr/bin/env python3
"""Apply 20 additional sight-read Clone Wars selected-field PDF receipts.

Not a mechanical certification. Does not create physical weapon mounts, Foundry
permissions or vehicle-as-droid stats. Refuses reapplication.
"""
from pathlib import Path
import json, hashlib, copy
R=Path(__file__).resolve().parents[1]
LED=R/'data/canonical/droids/source-books/clone.json'
EVD=R/'data/audits/droids/clone-field-evidence.json'
VIS=R/'data/audits/droids/clone-visual-field-review.json'
L=json.loads(LED.read_text());E=json.loads(EVD.read_text());V=json.loads(VIS.read_text())
assert len(L['sourceEntries'])==len(E['records'])==40
assert len(V['items'])==20 and V['directFieldComparisons']==277, 'Unexpected starting visual checkpoint'
# idx, page, scores (Str Dex Int Wis Cha), (Ref flatfoot Fort Will), HP, DT, cost,
# sight-read model PC eligibility. Page 189 continues the A-DSD from p188.
ACTORS={
18:(188,(26,7,9,9,7),(14,14,31,12),59,46,25000,'prohibited'),
19:(189,(14,14,12,11,11),(26,24,27,19),67,27,14000,'prohibited'),
20:(190,(13,13,9,10,10),(15,14,16,13),24,16,2100,'prohibited'),
21:(190,(13,13,10,10,9),(15,14,16,13),24,16,6460,'prohibited'),
22:(191,(18,9,10,11,7),(10,10,14,10),31,19,5500,'prohibited'),
23:(192,(14,11,10,11,7),(19,19,17,13),40,17,25000,'prohibited'),
24:(192,(10,16,14,16,8),(19,16,17,18),37,17,17900,'prohibited'),
25:(193,(14,16,13,10,8),(13,10,12,10),15,12,2700,'prohibited'),
26:(193,(15,16,10,12,8),(21,18,20,18),58,20,27000,'prohibited'),
27:(194,(17,14,10,13,11),(24,22,29,23),120,44,50000,'prohibited'),
28:(194,(32,7,10,14,8),(16,16,21,12),145,71,40000,'prohibited'),
29:(195,(24,12,10,15,8),(16,15,17,12),33,22,16000,'prohibited'),
30:(196,(14,13,11,8,7),(10,9,12,9),32,17,2500,'prohibited'),
31:(196,(12,11,11,9,9),(10,10,11,10),21,11,900,'prohibited'),
32:(197,(13,13,12,10,9),(18,17,17,15),30,17,15750,'prohibited')}
# Published stats/weapon groups are evidence-only, owned by Vehicle/Starship.
# idx, page, (Ref, flatfoot, Fort, HP, DR, DT, credits), crew, payload facts
VEHICLES={
35:(199,(13,11,19,60,10,29,60000),'droid brain (skilled)', '30 hailfire missiles; missile launchers and laser cannon'),
36:(200,(14,11,17,75,10,27,22000),'droid brain (normal)', '12 torpedoes; laser cannons and torpedo launchers'),
37:(201,(14,13,17,70,10,27,70000),'droid brain (skilled)', 'laser cannon and heavy repeating blaster; 3x3 space'),
38:(201,(14,13,20,120,15,30,49000),'droid brain (skilled)', '48 thermal detonators, 12 concussion missiles, 4 homing missiles, 2 dumbfire torpedoes'),
39:(202,(14,13,22,160,15,32,100000),'droid brain (skilled)', '48 heavy ordnance shells; gunner-controlled launcher'),
}
assert len(ACTORS)==15 and len(VEHICLES)==5
existing={x['sourceEntryKey'] for x in V['items']}
assert not existing.intersection({f'CLONE-DROID-{i:03d}' for i in list(ACTORS)+list(VEHICLES)})
# Sidecar receipts for nuanced printed claims. The statements are paraphrases,
# not an extension of the rules engine.
RULES={
18:(188,'A-DSD leg shields','As a move action, can pull legs close to increase armor bonus to +11 until start of next turn; printed Reflex 18 with shields vs 14 normally.'),
27:(194,'JK-13 killing rage','Reducing a target to 0 HP triggers +2 rage bonus on melee attack and damage and permits Use the Force checks; attacks nearest target until raging droid is destroyed.'),
30:(196,'Octuptarra virus burst','Alternate version releases virus affecting living creatures in a burst; failed Fortitude hit imposes persistent condition-step effect and repeats daily until treated (DC 15 Treat Injury).'),
37:(200,'OG-9 critical leg vulnerability','When a critical hit equals or exceeds its damage threshold, OG-9 speed drops to zero until repaired; firing remains possible.'),
}
items=[]
for i in sorted(list(ACTORS)+list(VEHICLES)):
 rec=L['sourceEntries'][i-1];e=E['records'][i-1];pid=f'CLONE-DROID-{i:03d}'
 assert rec['identity']['sourceEntryKey']==e['sourceEntryKey']==pid
 assert not e.get('pdfVisualFieldChecks'),f'{pid}: refusing overwrite existing review'
 if i in ACTORS:
  page,abilities,defenses,hp,dt,cost,elig=ACTORS[i]
  assert rec['classification']['primaryActorAuthority']=='droid'
  fields={'/challenge/challengeLevel':rec['challenge']['challengeLevel'],
          '/classification/size':rec['classification']['size']}
  for name,val in zip(('str','dex','int','wis','cha'),abilities):
   rec['abilities'][name]=val;fields[f'/abilities/{name}']=val
  rec['abilities']['con']=None;rec['fieldStates']['/abilities/con']='explicitly-none';fields['/abilities/con']=None
  for name,val in zip(('reflex','flatFootedReflex','fortitude','will'),defenses):
   rec['defenses'][name]=val;fields[f'/defenses/{name}']=val
  rec['durability']['hitPoints']=hp;fields['/durability/hitPoints']=hp
  rec['durability']['damageThreshold']=dt;fields['/durability/damageThreshold']=dt
  rec['economics']['newCredits']=cost;fields['/economics/newCredits']=cost
  rec['pcConstruction']['heroEligibility']=elig;fields['/pcConstruction/heroEligibility']=elig
  e['verifiedEligibility']='source-printed '+elig
  sourceOnly={}
  if i==18:
   # This first-page presentation runs through the next printed page.
   rec['publication']['printedPageEnd']=189
   sourceOnly['reflexWithLegShields']=18
   sourceOnly['flatFootedReflexWithLegShields']=18
   rec['exceptions'].setdefault('transcriptionWarnings',[]).append('A-DSD main statblock starts p188, continues on printed p189; Ref 14/18 is conditional leg-shield mode. Do not collapse alternate defenses.')
  if i==23:
   sourceOnly['lightsaberOnlyDamageReduction']=5
  if i==27:
   sourceOnly['shieldRating']=20
  if i==30:
   sourceOnly['virusBurst']='Persistent condition-track attack, not ordinary damage'
  # Exact eligibility witness location where narrative sentence is on prior page.
  eligibility_page=191 if i==23 else 192 if i==25 else page
 else:
  page,numbers,crew,payload=VEHICLES[i]
  assert rec['classification']['primaryActorAuthority']=='vehicle'
  assert all(not rec[g] for g in ('defenses','durability','combat','movement','geometry'))
  fields={'/challenge/challengeLevel':rec['challenge']['challengeLevel'],
          '/classification/size':rec['classification']['size']}
  sourceOnly=dict(zip(('reflex','flatFootedReflex','fortitude','hitPoints','damageReduction','damageThreshold','newCredits'),numbers))
  sourceOnly['crew']=crew;sourceOnly['weaponPayloadNotes']=payload
  eligibility_page=None
 if i in RULES:
  rp,label,statement=RULES[i]
  obj={'ruleId':f'{pid}-SOURCE-LOCAL-01','statement':statement,'scope':pid,
       'source':{'book':'Clone Wars Campaign Guide','page':rp,'verifiedBy':'pdf-visual','sourceEntryKey':pid},
       'executionStatus':'source-only'}
  rec['rules'].setdefault('conditionalMechanics',[]).append(obj)
  # No engine reference/effectId or executable grant.
 rec['certification']['identityStatus']='pdf-reviewed'
 rec['certification']['mechanicalStatus']='partial'
 rec['certification']['reviewerEvidenceRefs'].append(f'CLONE:printed-p{page}:PDF-page-{page+1}:selected-visual-fields:batch2')
 if i==18:rec['certification']['reviewerEvidenceRefs'].append('CLONE:printed-p189:PDF-page-190:A-DSD-continuation')
 if i in ACTORS and eligibility_page!=page:
  rec['certification']['reviewerEvidenceRefs'].append(f'CLONE:printed-p{eligibility_page}:model-hero-eligibility')
 e['pdfVisualLayoutChecked']=True
 e['sourceReviewStatus']='PDF_SELECTED_FIELDS_VISUAL'
 e['pdfVisualFieldChecks']={'printedPage':page,'pdfPage1Based':page+1,
  'fieldValues':fields,'sourceOnlyPrintedValues':sourceOnly,
  'fieldComparisonCount':len(fields),
  'inspectionScope':'Selected visible PDF fields; no runtime rights, mount, complete mechanical certification'}
 if i==18:e['pdfVisualFieldChecks']['statblockContinuationPages']=[188,189]
 if i==20 or i==21:
  e['warnings'].append('Two-column p190 reconstructed from printed visual columns, not interleaved TXT. Initial OCR attack parsing is not trusted.')
 if i in VEHICLES:
  e['warnings'].append('Printed vehicle HP/DR/weapon facts are sidecar vehicle-only values, not individual droid actor traits.')
 items.append({'sourceEntryKey':pid,'printedName':rec['identity']['printedName'],
  'printedPage':page,'verifiedFieldCount':len(fields),
  'sourceOwnedNonActorValues':sourceOnly,
  'scope':'selected-fields' if i in ACTORS else 'source-authority-format',
  'batch':2})
assert len(items)==20
for r in L['sourceEntries']:
 assert r['rules']['mechanicalExecutionStatus']=='source-only'
 assert r['certification']['mechanicalStatus']!='certified'
 for a in r['combat'].get('attackGroups',[]):
  assert a.get('operationStatus')=='source-only' and not a.get('weaponComponentId')
assert len({r['identity']['sourceEntryKey'] for r in L['sourceEntries']})==40
assert all(x['certification']['identityStatus']=='pdf-reviewed' for x in L['sourceEntries'])
# Audit snapshot: preserve current batch-1 ledger without touching original seed backup.
for p in [LED,EVD,VIS]:
 dest=R/'work'/('clone-batch1-'+p.name)
 if not dest.exists():dest.write_bytes(p.read_bytes())
L['scope']='All 40 source identities now have selected printed-PDF fields sight-read. This is NOT full secondary rules, canonical mechanics, schema or runtime certification.'
V['items'].extend(items)
V['manualVisualReviews']=len(V['items'])
V['directFieldComparisons']=sum(x['verifiedFieldCount'] for x in V['items'])
V['visualMethod']='Selected printed-page PDF visual checks for all 40 claims; source-owned vehicle stats remain sidecar-only'
V['batch2']={'additionalSourceEntries':20,'additionalComparisons':sum(x['verifiedFieldCount'] for x in items),
             'printedPageCoverage':[188,189,190,191,192,193,194,195,196,197,199,200,201,202],
             'importantBoundary':'All source-only; no executable weapon, trait grant or complete mechanics certification.'}
LED.write_text(json.dumps(L,indent=2,ensure_ascii=False)+'\n')
EVD.write_text(json.dumps(E,indent=2,ensure_ascii=False)+'\n')
VIS.write_text(json.dumps(V,indent=2,ensure_ascii=False)+'\n')
print('CLONE batch 2:',len(items),'new reviews;',sum(x['verifiedFieldCount'] for x in items),'new comparisons')
print('CLONE cumulative:',V['manualVisualReviews'],'/40 reviews;',V['directFieldComparisons'],'comparisons')
