#!/usr/bin/env python3
"""One-time selected-field human visual transcriptions of GAW printed source pages.
NOT full mechanical certification. Source citations refer to original owner PDF images;
no unverified OCR data unlocks Foundry runtime or executable attacks.
"""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
LP=R/'data/canonical/droids/source-books/gaw.json';EP=R/'data/audits/droids/gaw-field-evidence.json'
VP=R/'data/audits/droids/gaw-visual-field-review.json'
if VP.exists():raise SystemExit('REFUSING to overwrite existing visual review')
l=json.loads(LP.read_text());e=json.loads(EP.read_text());base=R/'work/gaw_pdf_review'
# index | Init | Perception | Ref | FFRef | Fort | Will | HP | Threshold | DR | SR | new credits | used credits
# Values read from original book page renders at /work/gaw_pdf_review, not OCR.
# A blank means NO verified field/claim, not a zero or permission.
RAW='''1|5|7|13|13|10|15|18|10|||9740|
2|1|1|10|10|13|10|4|13|||4400|
3|4|3|14|11|9|12|7|9|||9500|
4|6|4|21|19|15|12|26|15|||16225|
5|6|9|16|14|14|10|29|19||5|21500|
6|13|9|20|18|26|17|78|31|10||31900|
7|9|21|19|16|17|17|41|22||20|30565|
8|6|7|18|17|13|13|30|13|||14005|
9|11|19|20|18|11|13|22|11|||32500|
10|1|6|18|18|20|10|17|25|||15000|
11|1|14|14|14|15|12|36|25|||15000|
12|8|16|15|14|10|13|13|10|||2500|1000
13|10|12|21|19|23|18|77|33|||15630|5210
14|0|6|9|9|11|11|10|11|||1800|
15|3|8|12|12|12|10|21|12|||3300|
16|8|13|16|14|13|12|40|18||20|21000|
17|13|13|19|16|17|18|37|17|||17900|
18|3|7|10|10|11|10|21|11|||900|
19|6|5|17|14|23||175|33|10||17500|11000
20|0|6|8|8|11|10|20|21|||5400|
21|4|10|15|14|16|13|24|16|||6460|
22|5|18|16|15|17|12|33|22|||16000|'''
rows=[[v.strip() for v in s.split('|')] for s in RAW.splitlines()]
assert len(rows)==22 and all(len(x)==13 for x in rows)
# Source prose eligibility explicitly checked for the first 11 model entries. Later
# adventure reprints have no printed permission; do not inherit from other books.
ELIG={1:'allowed',2:'allowed',3:'allowed',4:'prohibited',5:'prohibited',6:'prohibited',7:'prohibited',8:'allowed',9:'prohibited',10:'prohibited',11:'prohibited'}
# Citations of locally printed special conditions: no executable mappings.
NOTES={
 1:[('MEDICAL-TALENT','The model-specific Medical Droid talent changes Treat Injury healing benefits; no generic Treat Injury bonus is granted.',51)],
 2:[('EXTRA-LEG','An additional leg grants a printed +5 stability bonus to resist being knocked prone.',52)],
 4:[('JET-PACK','The integrated jet pack has a model-specific capacity of 100 charges and a volatile fuel hazard; ordinary jet-pack defaults are insufficient.',53)],
 5:[('REMOTE-SHUTDOWN','A central operating computer is a point of shutdown vulnerability, despite the printed basic processor.',53)],
 6:[('CORTOSIS','The purge trooper has printed DR 10 with a particular lightsaber interaction requiring source-specific rule resolution.',54)],
 7:[('EXCLUSIVE-WHEELS','Wheeled locomotion is printed exclusive; walking and wheel modes must not be combined or freely executed.',55)],
 8:[('BATTLE-ANALYSIS','The Battle Analysis talent and Vehicle Combat feat are published traits but require canonical provenance and action certification.',55)],
 9:[('SELF-DESTRUCT','This model has a specified self-destruct mechanism and separate integrated repeating blaster and grenade launcher.',56)],
 11:[('MINE-SWEEP','The minesweeper has a chain roller offensive mode plus mine mapping and demolition equipment.',57)],
 12:[('SENTRY-COVER','The p175 presentation adds +5 cover to Reflex Defense (20 vs base 15 on p98); do not apply +5 unconditionally.',175),
     ('SENTRY-FIXED-FIRE','The sentry is stationary with braced weapon housing and IFF, whose firing field is subject to placement and configuration.',98)],
 13:[('DOUBLE-ATTACK','Two blaster cannon attack expressions are a printed option; weapon rights remain pending.',181)],
 19:[('VEHICLE-OWNERSHIP','The Ground Armored Tank is a vehicle with a droid brain; attacks, durability and passenger/crew rules belong to the vehicle system.',216)],
 20:[('SQUAD-AGGREGATE','The printed squad consists of three B1 droids. Squad HP, damage, area attacks and size are aggregation rules, not individual chassis grants.',217)],
 21:[('ASSASSIN-VARIANT','The Battle Droid Assassin is a distinct B1-derived adventure configuration with its own feat and attack choices.',218)],
 22:[('STANDBY','The LR-57 has model-specific passive standby, command activation and target-acquisition constraints.',219)]}
items=[]
for ix,(r,x,raw) in enumerate(zip(l['sourceEntries'],e['records'],rows),1):
 i=int(raw[0]);assert i==ix
 key=r['identity']['sourceEntryKey'];p=r['publication']['printedPageStart'];src=f'work/gaw_pdf_review/printed_p{p}.png'
 assert (R/src).is_file(),(key,src)
 c=r['classification'];atype=c['primaryActorAuthority']
 fields={'/identity/printedName':r['identity']['printedName'],'/publication/printedPageStart':p,
         '/classification/size':c['size'],'/challenge/challengeLevel':r['challenge']['challengeLevel']}
 numbers={k:int(v) for k,v in zip(['initiativePrinted','perceptionPrinted','reflex','flatFootedReflex','fortitude','will','hitPoints','damageThreshold','damageReduction','shieldRating','newCredits','usedCredits'],raw[1:]) if v}
 if atype=='droid':
  for label in ('initiativePrinted','perceptionPrinted'):
   if label in numbers:r['abilities'][label]=numbers[label];fields['/abilities/'+label]=numbers[label]
  for label in ('reflex','flatFootedReflex','fortitude','will','damageReduction','shieldRating'):
   if label in numbers:r['defenses'][label]=numbers[label];fields['/defenses/'+label]=numbers[label]
  for label in ('hitPoints','damageThreshold'):
   if label in numbers:r['durability'][label]=numbers[label];fields['/durability/'+label]=numbers[label]
  for label in ('newCredits','usedCredits'):
   if label in numbers:r['economics'][label]=numbers[label];fields['/economics/'+label]=numbers[label]
 else:
  x['nonActorPrintedStatblock']={'owner':atype,'sourcePrintedPage':p,'selectedFields':numbers,
    'nonTransferableToDroidActor':True}
  # no squad/vehicle numbers in actor-specific fields; only source identity values count in field reviews
 if i in ELIG:
  r['pcConstruction']['heroEligibility']=ELIG[i]
  del r['fieldStates']['/pcConstruction/heroEligibility']
  fields['/pcConstruction/heroEligibility']=ELIG[i]
 elif atype=='droid':
  assert r['pcConstruction']['heroEligibility'] is None
  assert r['fieldStates']['/pcConstruction/heroEligibility']=='not-stated'
 r['certification']['identityStatus']='pdf-reviewed'
 r['certification']['reviewNotes']='Selected first-page PDF fields verified; full narrative/continuation, feats/talents, equipment, mounts, chargen and runtime NOT certified.'
 r['certification']['reviewerEvidenceRefs'].append(f'{key}:printed-p{p}:PDF-p{p+1}:selected-field-review')
 for slug,statement,rulepage in NOTES.get(i,[]):
  rule={'ruleId':f'{key}-{slug}','statement':statement,'scope':key,
        'source':{'book':'Galaxy at War','page':rulepage,'pdfPage1Based':rulepage+1,
                  'sourceEntryKey':key,'verifiedBy':'pdf-visual'},'executionStatus':'source-only'}
  r['rules'].setdefault('conditionalMechanics',[]).append(rule)
 if i==12:
  x['alternatePrintPresentation']={'printedPage':175,'pdfPage1Based':176,'context':'Encounter sentry gun behind +5 cover',
    'baseReflex':15,'baseFlatFootedReflex':14,'encounterReflex':20,'encounterFlatFootedReflex':19,
    'status':'PDF_VISUAL_CONTEXTUAL_NOT_GLOBAL',
    'sourceImage':'work/gaw_pdf_review/printed_p175.png'}
  r['defenses']['conditionalDefenseRules']=[r['rules']['conditionalMechanics'][0]]
 if i in (8,14,15,16):
  refs={8:[213],14:[212],15:[212],16:[218]}[i]
  x['samePublicationPresentations']=[{'printedPage':pp,'pdfPage1Based':pp+1,'status':'SECOND_PRESENTATION_NOT_NEW_IDENTITY'} for pp in refs]
  for pp in refs:
   assert (R/f'work/gaw_pdf_review/printed_p{pp}.png').exists()
 x['sourceReviewStatus']='PDF_SELECTED_FIELDS_VISUAL'
 x['pdfVisualFieldChecks']={'printedPage':p,'pdfPage1Based':p+1,'sourceImage':src,
  'fieldValues':fields,'fieldComparisonCount':len(fields),'actorAuthority':atype,
  'limitations':'Only listed pointer fields visually checked. Vehicle/squad numbers deliberately kept in non-actor evidence. Narrative, feat/talent and runtime unreviewed.'}
 items.append({'sourceEntryKey':key,'printedName':r['identity']['printedName'],'printedPage':p,
  'verifiedFieldCount':len(fields),'scope':'selected-first-page-fields',
  'primaryActorAuthority':atype,'heroEligibility':ELIG.get(i)})
assert len(items)==22
visual={'schema':'swse.droid.gaw.selected-pdf-visual/0.1','sourceBook':'Galaxy at War',
 'manualVisualReviews':22,'directFieldComparisons':sum(x['verifiedFieldCount'] for x in items),
 'sourcePdfHash':e['sourcePdfSha256'],
 'method':'Owner-provided PDF rendered and manually inspected on printed pp51-57,98,175,181,210-220. Selected numeric fields transcribed from the visible statblock images; disagreements with OCR resolved in favor of print.',
 'scope':'Source fieldValues only; 0 mechanical certifications; 0 Foundry runtime permissions.',
 'items':items}
VP.write_text(json.dumps(visual,indent=2,ensure_ascii=False)+'\n')
LP.write_text(json.dumps(l,indent=2,ensure_ascii=False)+'\n')
EP.write_text(json.dumps(e,indent=2,ensure_ascii=False)+'\n')
print('GAW PDF reviews',len(items),'visual pointer comparisons',visual['directFieldComparisons'],'source-only; certified=0')
