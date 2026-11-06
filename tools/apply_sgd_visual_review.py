#!/usr/bin/env python3
"""Idempotent, source-page-anchored manual review of selected SGD entries. Local only.

Do not run after an independent later certification without reconciling the review
ledger; this is a narrow visual pass over pages explicitly inspected below.
"""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'data/canonical/droids/source-books/sgd.json'
EP=ROOT/'data/audits/droids/sgd-field-evidence.json'
VP=ROOT/'data/audits/droids/sgd-visual-field-review.json'
L=json.loads(P.read_text());E=json.loads(EP.read_text());records=L['sourceEntries']
previous_review={r['sourceEntryKey']:r for r in json.loads(VP.read_text()).get('items',[])} if VP.exists() else {}
if len(previous_review)>16: raise SystemExit('Refusing to run legacy 16-page review writer against newer rolling evidence; use tranche-specific scripts.')
by={int(r['identity']['sourceEntryKey'][-3:]):r for r in records}
eby={int(e['sourceEntryKey'][-3:]):e for e in E['records']}
BOOK="Scavenger's Guide to Droids"

# These values were read from rendered images of the printed first page of
# each statblock, NOT extracted or silently corrected from text/OCR.
# Order: CL / size / degree / Ref, FF, Fort, Will / HP, DT / STR DEX INT WIS CHA.
EXPECTED={
2:(0,'Medium',1,10,10,10,10,7,10,10,11,14,10,12),
3:(1,'Medium',1,16,14,13,13,30,13,10,15,16,15,10),
4:(12,'Huge',4,21,19,27,20,120,42,25,15,8,15,7),
5:(0,'Medium',5,15,14,12,9,4,12,15,12,6,8,16),
6:(4,'Medium',4,17,15,14,12,40,14,18,15,11,14,12),
13:(8,'Medium',2,22,21,19,20,36,19,None,None,None,None,None),
14:(3,'Medium',3,13,13,12,16,10,12,8,9,13,12,12),
15:(5,'Large',4,19,17,22,14,32,22,22,15,12,11,8),
16:(0,'Small',2,12,11,10,10,3,10,10,13,15,11,8),
17:(5,'Medium',5,19,17,17,16,44,17,10,15,14,12,9),
18:(6,'Medium',4,24,21,20,14,35,20,16,16,10,8,13),
25:(1,'Medium',1,18,16,11,11,18,11,12,15,14,13,10),
28:(0,'Large',2,8,8,15,10,15,20,20,8,14,11,6),
29:(1,'Medium',5,18,18,13,10,11,13,14,8,8,9,4),
38:(9,'Huge',4,23,19,28,16,120,38,30,18,12,10,10),
41:(0,'Large',3,6,6,10,12,13,15,10,4,13,14,16),
}

# Source-side grouped labels, not flattened mechanical feats. A phrase like
# "Skill Focus (Pilot, Mechanics)" is ONE source phrase with multiple printed
# specializations pending independent canonical feat identity mapping.
INIT_PERCEPTION={
2:(1,1),3:(7,7),4:(17,17),5:(1,-1),6:(8,15),13:(11,13),14:(1,3),
15:(6,11),16:(1,7),17:(9,10),18:(18,9),25:(9,5),28:(0,8),
29:(0,0),38:(21,17),41:(-3,14)}
PRICES={2:(6880,'Licensed'),3:(13840,'Military'),4:(59275,'Military'),
5:(8995,'Licensed'),6:(33720,'Military'),14:(11380,'Licensed'),
15:(31375,'Military'),16:(5210,'Licensed'),17:(17430,'Licensed'),
18:(23305,'Restricted'),25:(13425,'Licensed'),28:(7280,'Licensed'),
29:(6990,'Military'),38:(123000,'Military'),41:(5970,'Licensed')}

FEATS={
2:['Distracting Droid','Skill Focus (Gather Information, Knowledge [bureaucracy], Use Computer)'],
3:['Armor Proficiency (light, medium)','Skill Focus (Mechanics)','Weapon Proficiency (pistols, rifles, simple weapons)'],
4:['Armor Proficiency (light)','Burst Fire','Dual Weapon Mastery I','Dual Weapon Mastery II','Improved Damage Threshold','Point Blank Shot','Precise Shot','Rapid Shot','Running Attack','Skill Training (Initiative)','Sniper','Triple Crit','Weapon Focus (rifles)','Weapon Proficiency (heavy weapons, rifles)'],
5:['Armor Proficiency (light)','Skill Focus (Endurance)','Skill Training (Mechanics, Use Computer)'],
6:['Armor Proficiency (light)','Dual Weapon Mastery I','Rapid Shot','Skill Focus (Stealth)','Skill Training (Stealth)','Weapon Proficiency (advanced melee weapons, rifles, simple weapons)'],
14:['Coordinated Attack','Droid Focus (5th-degree)','Linguist','Skill Focus (Mechanics, Persuasion)','Skill Training (Knowledge [technology], Mechanics)'],
15:['Armor Proficiency (light, medium)','Point Blank Shot','Running Attack','Skill Training (Endurance)','Weapon Focus (rifles)','Weapon Proficiency (heavy weapons, rifles, simple weapons)'],
16:['Skill Focus (Knowledge [technology], Mechanics, Use Computer)'],
17:['Armor Proficiency (light)','Point Blank Shot','Skill Focus (Pilot)','Skill Training (Use Computer)','Vehicular Combat','Weapon Proficiency (heavy weapons, rifles, simple weapons)'],
18:['Armor Proficiency (light, medium)','Improved Defenses','Point Blank Shot','Rapid Shot','Skill Focus (Initiative)','Skill Training (Perception)','Weapon Focus (blaster rifles)','Weapon Proficiency (rifles, simple weapons)'],
25:['Armor Proficiency (light)','Cybernetic Surgery','Skill Focus (Treat Injury)','Skill Training (Initiative)','Surgical Expertise'],
28:['Skill Focus (Mechanics, Use Computer)','Toughness','Weapon Proficiency (heavy weapons)'],
29:['Armor Proficiency (light, medium)','Improved Defenses','Skill Focus (Mechanics)'],
38:['Armor Proficiency (light, medium, heavy)','Damage Conversion','Skill Focus (Initiative, Perception, Pilot, Use Computer)','Turn and Burn','Vehicular Combat','Weapon Focus (heavy weapons)','Weapon Proficiency (heavy weapons, pistols, rifles, simple weapons)'],
41:['Linguist','Skill Focus (Perception, Persuasion)','Skill Training (Knowledge [bureaucracy])']
}
TALENTS={
3:["Harm's Way"],4:['Armored Defense','Devastating Attack (rifles)','Improved Armored Defense','Penetrating Attack (rifles)'],
14:['Demand Surrender','Presence'],15:['Indomitable','Devastating Attack (rifles)'],
17:['Acute Senses','Devastating Attack (heavy weapons)','Improved Initiative'],
18:['Evasion',"Harm's Way",'Weapon Specialization (rifles)'],
38:['Indomitable',"Harm's Way",'Weapon Specialization (heavy weapons)']
}
# Concise paraphrases of statblock-specific mechanical statements; separate
# print-source claims from runtime executable rules.
RULES={
2:[('ARCHIVE-PROCESSOR','Full-round action: reroll Gather Information or Knowledge while retrieving material from a computer network; must keep the second result.')],
4:[('WHEELED-TRANSFORM','Taking two swift movement actions in the same turn changes walking locomotion to wheeled and moves 10 squares.')],
5:[('JACK-OF-ALL-TRADES','Once per encounter as a standard action, may make any skill check as though trained in that skill.')],
6:[('PENETRATE-HULL','With vibroblades, rolls maximum damage when cutting through vehicle hulls, solid walls, or doors.')],
15:[('NIGHTMARE','Once per encounter, may attempt a Persuasion intimidation check as a free action while making a melee attack against the same target; intimidation takes effect after its turn.'),('ZERO-RANGE-ATTACK','After successfully grabbing or grappling a target with its claw appendage, it can immediately attack with its arm-mounted blaster rifle.')],
16:[('PATCH-JOB','Can make temporary repairs to a disabled electronic or mechanical device as a standard action rather than the usual full-round action.')],
17:[('SENSOR-CROWN','Swift action: lock on to a visible vehicle, creature or object; gain +2 equipment bonus on Perception against that target through encounter end.'),('SIMULTANEOUS-OPERATION','Twice per encounter, gain an additional swift action usable only for vehicle-system operation or a vehicle combat action.'),('VEHICLE-LINK','Standard action: issue a routine command to an automated vehicle system if the vehicle computer is friendly to the droid.')],
18:[('REPOSITIONING-ROUTINES','When an ally within 12 squares drops to zero HP, the droid can move up to half its speed as a reaction without provoking opportunity attacks.'),('SMALL-APPENDAGES','Two small hands allow picking up or retrieving a stowed object as a free action once on its turn.')],
28:[('SUPERIOR-WEAPON-REPAIR','For the first encounter after this droid performs or helps with vehicle-weapon repairs/upgrades, each affected weapon gets +1 to attack rolls.')],
29:[('FAILSAFE-WITHDRAWAL','After the first attack targeting this droid in an encounter resolves, it can move up to its speed as a reaction.')],
41:[('STUBBORN','When another creature makes a Persuasion check against this droid, its Will Defense also gains its Charisma bonus.')]
}

# Visual transcriptions of particular attack alternatives where prior OCR
# yielded a plainly wrong or nonsensical total. They remain source-only.
ATTACKS={
2:[('unarmed','Melee unarmed +1 (1d3)',1),('by-weapon','Ranged by weapon +1',1)],
3:[('unarmed','Melee unarmed +1 (1d3)',1),('by-weapon','Ranged by weapon +3',3)],
5:[('unarmed','Melee unarmed +2 (1d3+2)',2),('by-weapon','Ranged by weapon +1',1)],
13:[('unarmed','Melee unarmed +7 (1d3+3)',7),('rifle-base','Ranged blaster rifle +8 (3d8+3) or',8),('rifle-rapid','Ranged blaster rifle +6 (4d8+3) with Rapid Shot',6)],
14:[('unarmed','Melee unarmed +1 (1d3)',1),('by-weapon','Ranged by weapon +1',1)],
16:[('unarmed','Melee unarmed +0 (1d2)',0),('by-weapon','Ranged by weapon +1',1)],
17:[('unarmed','Melee unarmed +4 (1d3+2)',4),('by-weapon','Ranged by weapon +6',6)],
25:[('unarmed','Melee unarmed +4 (1d3+1)',4),('by-weapon','Ranged by weapon +5',5)],
28:[('unarmed','Melee unarmed +6 (1d6+5)',6),('laser-welder','Ranged laser welder +0 (3d6)',0)],
29:[('unarmed','Melee unarmed +4 (1d3+2)',4),('by-weapon','Ranged by weapon +1',1)],
38:[('laser-cannon','Ranged laser cannon +17 (4d10+5 x2) or',17),('ion-cannon','Ranged ion cannon +17 (3d10+5 ion) or',17),('repeating-blaster','Ranged repeating blaster cannon +12 (3d10+5, 2x2 area) or',12),('concussion-missiles','Ranged concussion missiles +17 (8d10+5 x2) or',17),('proton-torpedoes','Ranged proton torpedoes +17 (9d10+5 x2)',17)],
41:[('unarmed','Melee unarmed +0 (1d4)',0)],
4:[('melee-unarmed','Melee unarmed +24 (1d6+11)',24),('laser-base','Ranged laser cannon +20 (3d8+4) or',20),('laser-rapid','Ranged laser cannon +18 (4d8+4) with Rapid Shot or',18),('laser-burst','Ranged laser cannon +15 (5d8+4) with Burst Fire or',15),('laser-double','Ranged laser cannon +18/+18 (3d8+4) or',None),('laser-double-rapid','Ranged laser cannon +16/+16 (4d8+4) with Rapid Shot or',None),('laser-double-burst','Ranged laser cannon +13/+13 (5d8+4) with Burst Fire',None)],
6:[('vibroblade','Melee vibroblade +13 (2d6+4)',13),('rifle-base','Ranged blaster rifle +11 (3d8) or',11),('rifle-rapid','Ranged blaster rifle +9 (4d8) with Rapid Shot',9)],
15:[('claw','Melee claw +13 (1d6+8)',13),('heavy-rifle','Ranged heavy blaster rifle +10 (3d10+2) or',10),('blaster-rifle','Ranged blaster rifle +10 (3d8+2) or',10),('missile-launcher','Ranged missile launcher +9 (6d6+2, 2-square radius)',9)],
18:[('unarmed','Melee unarmed +10 (1d3+5)',10),('heavy-rifle','Ranged heavy blaster rifle +11 (3d10+4) or',11),('heavy-rifle-rapid','Ranged heavy blaster rifle +9 (4d10+4) with Rapid Shot',9)]
}

review=[]
for i,tuple_ in EXPECTED.items():
 r=by[i];ev=eby[i]; page=66+2*i; pdfpage=page+1
 assert r['publication']['printedPageStart']==page
 valnames=['challenge/challengeLevel','classification/size','classification/publishedDegree','defenses/reflex','defenses/flatFootedReflex','defenses/fortitude','defenses/will','durability/hitPoints','durability/damageThreshold','abilities/str','abilities/dex','abilities/int','abilities/wis','abilities/cha']
 vals={k:v for k,v in zip(valnames,tuple_) if v is not None}
 ini,perc=INIT_PERCEPTION[i]
 vals['abilities/initiativePrinted']=ini
 vals['abilities/perceptionPrinted']=perc
 if i in PRICES:
  price,avail=PRICES[i]
  vals['economics/newCredits']=price
  vals['economics/availability']=avail
 corrections=[]
 for path,v in vals.items():
  group,key=path.split('/')
  actual=r[group].get(key)
  if actual != v:
   # The rendered page is positive evidence; preserve correction for audit.
   if (group=='defenses' and key=='flatFootedReflex' and i==16 and actual==111) or (i==38 and group=='abilities' and key in ('initiativePrinted','perceptionPrinted') and actual is None):
    corrections.append({'pointer':'/'+path,'ocrValue':actual,'pdfValue':v,'reason':'Rendered PDF resolves missing or malformed OCR numeric value'})
    r[group][key]=v
   else:
    raise AssertionError(f'SGD-{i:03} /{path} expected {v} got {actual} -- manual reconciliation needed')
 historical=previous_review.get(r['identity']['sourceEntryKey'],{}).get('issuesCorrected',[])
 # Preserve first-observed OCR corrections across future reruns.
 if not corrections: corrections=historical
 ev['pdfVisualLayoutChecked']=True
 ev['pdfVisualStatblockChecks']={'printedPage':page,'pdfPage1Based':pdfpage,'method':'rendered-PDF-visual','fieldValues':{'/'+k:v for k,v in vals.items()},'sourceCertificationScope':'selected visibly checked numeric fields only; NOT entire-model mechanical certification'}
 if corrections:
  ev['pdfVisualStatblockChecks']['corrections']=corrections
  
  for fix in corrections:ev['fieldTranscriptions'][fix['pointer']]=f"Printed p{page}: {fix['pdfValue']} (PDF-visual; original OCR value {fix['ocrValue']})"
 if i in FEATS:
  ev['pdfVisualStatblockChecks']['printedFeatPhrases']=FEATS[i]
  r['progression']['feats']=[{'traitId':f'SGD-DROID-{i:03d}-feats-{j:02}', 'name':name,'source':{'book':BOOK,'page':page,'pdfPage1Based':pdfpage,'verifiedBy':'pdf-visual','sourceEntryKey':r['identity']['sourceEntryKey']}} for j,name in enumerate(FEATS[i],1)]
 if i in TALENTS:
  ev['pdfVisualStatblockChecks']['printedTalentPhrases']=TALENTS[i]
  r['progression']['talents']=[{'traitId':f'SGD-DROID-{i:03d}-talents-{j:02}','name':name,'source':{'book':BOOK,'page':page,'pdfPage1Based':pdfpage,'verifiedBy':'pdf-visual','sourceEntryKey':r['identity']['sourceEntryKey']}} for j,name in enumerate(TALENTS[i],1)]
 if i in ATTACKS:
  ev['pdfVisualStatblockChecks']['printedAttacks']=[x[1] for x in ATTACKS[i]]
  r['combat']['attackGroups']=[{'attackId':'printed-'+aid,'raw':raw,'operationStatus':'source-only',**({'attackBonus':ab} if ab is not None else {})} for aid,raw,ab in ATTACKS[i]]
 for slug,statement in RULES.get(i,[]):
  ruleid=f'SGD-{i:03}-{slug}'
  rules=r['rules'].setdefault('conditionalMechanics',[])
  rules[:]=[rule for rule in rules if rule.get('ruleId')!=ruleid]
  rules.append({'ruleId':ruleid,'statement':statement,'scope':r['identity']['printedName'],
    'source':{'book':BOOK,'page':page,'pdfPage1Based':pdfpage,'verifiedBy':'pdf-visual','sourceEntryKey':r['identity']['sourceEntryKey']},'executionStatus':'source-only'})
 if i==4:
  r['movement']['locomotionSystems']=[{'instanceId':'sgd-004-walking','mode':'walking','speedSquares':2},{'instanceId':'sgd-004-wheeled','mode':'wheeled','speedSquares':10,'restricted':'exclusive','requiresAction':'Two swift movement actions in the same turn (per printed protocol view)'}]
 if i==6:
  r['movement']['locomotionSystems']=[{'instanceId':'sgd-006-walking','mode':'walking','speedSquares':6},{'instanceId':'sgd-006-climbing','mode':'climbing','speedSquares':3}]
 if i==15:
  r['movement']['locomotionSystems']=[{'instanceId':'sgd-015-walking','mode':'walking','speedSquares':6},{'instanceId':'sgd-015-jetpack','mode':'flying-with-jetpack','speedSquares':6}]
 if i==41:
  assert r['movement']['locomotionSystems'][0]['speedSquares']==0
 # Scope-tag note: PDF visual sample is not full source cert.
 r['certification']['identityStatus']='pdf-reviewed'
 refs=r['certification'].setdefault('reviewerEvidenceRefs',[])
 cite=f'SGD:p{page}:PDF-p{pdfpage}:visual-statblock-field-review'
 if cite not in refs:refs.append(cite)
 review.append({'sourceEntryKey':r['identity']['sourceEntryKey'],'printedName':r['identity']['printedName'],
   'printedPage':page,'pdfPage1Based':pdfpage,'verifiedFieldCount':len(vals),
   'verifiedFieldPointers':['/'+k for k in vals], 'printedFeatPhrasesReviewed':i in FEATS,
   'printedTalentPhrasesReviewed':i in TALENTS, 'attackTextReviewed':i in ATTACKS,
   'issuesCorrected':corrections,'mechanicalCertification':'PARTIAL_NOT_CERTIFIED'})

# Invariant checks: source data stays fail-closed. Review only the explicitly
# inspected pages; the remainder retains OCR-provisional status.
assert all(r['certification']['mechanicalStatus']!='certified' for r in records)
assert not by[8]['defenses'] and not by[8]['combat'] and not by[8]['durability']
assert len(review)==len(EXPECTED)==16
L['scope']='46/46 SGD publication identities with provisional text hydration; selected fields visually reconciled for 16 additional statblocks. Not mechanically certified.'
P.write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n')
EP.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
VP.write_text(json.dumps({'schema':'swse.droid.sgd.visual-field-review/0.1','sourceBook':'SGD','method':'direct visual comparison with rendered pages of supplied PDF',
 'sourcePagePolicy':'PDF 1-based = printed +1','items':review,'visuallyReviewedInThisPass':len(review),
 'fieldComparisons':sum(x['verifiedFieldCount'] for x in review),
 'certifiedMechanicalClaims':0,'remainingIssue':'Many fields, secondary page text, component instantiation, exact feat scope and mount evidence still pending.'},ensure_ascii=False,indent=2)+'\n')
print('Manual source review applied:',len(review),'pages,',sum(x['verifiedFieldCount'] for x in review),'field comparisons;',sum(len(x['issuesCorrected']) for x in review),'OCR corrections')
