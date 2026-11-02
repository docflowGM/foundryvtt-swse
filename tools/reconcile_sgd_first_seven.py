#!/usr/bin/env python3
"""Visually reviewed seven earlier layout-only entries, including DP-2 vehicle.

Source book original printed p68,p80,p82,p84,p86,p88,p90, source PDF p+1.
DP-2 fields remain vehicle-owned and no executable attacks are promoted.
"""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'data/canonical/droids/source-books/sgd.json';ep=root/'data/audits/droids/sgd-field-evidence.json';vp=root/'data/audits/droids/sgd-visual-field-review.json'
L=json.loads(p.read_text()); E=json.loads(ep.read_text());V=json.loads(vp.read_text())
by={int(a['identity']['sourceEntryKey'][-3:]):a for a in L['sourceEntries']};ev={int(a['sourceEntryKey'][-3:]):a for a in E['records']};visual={int(a['sourceEntryKey'][-3:]):a for a in V['items']}
paths=['challenge/challengeLevel','classification/size','classification/publishedDegree','defenses/reflex','defenses/flatFootedReflex','defenses/fortitude','defenses/will','durability/hitPoints','durability/damageThreshold','abilities/str','abilities/dex','abilities/int','abilities/wis','abilities/cha','abilities/initiativePrinted','abilities/perceptionPrinted','economics/newCredits','economics/availability']
VALUES={
1:(0,'Medium',5,15,15,14,10,4,14,18,10,8,10,8,-2,2,7250,'Licensed'),
7:(0,'Medium',3,10,10,9,11,3,9,8,10,15,12,14,0,6,8280,'Licensed'),
9:(8,'Large',4,18,15,19,16,80,29,17,16,8,14,7,16,15,31435,'Military'),
10:(2,'Large',4,11,11,16,11,38,21,22,11,10,12,5,3,11,13725,'Military'),
11:(1,'Medium',4,17,15,15,11,30,15,15,14,11,10,10,7,0,11330,'Restricted'),
12:(7,'Medium',4,24,23,23,17,74,23,18,13,11,11,12,9,10,28535,'Military'),
}
FEATS={
1:['Mighty Swing','Skill Focus (Endurance)','Skill Training (Endurance)','Weapon Proficiency (simple weapons)'],
7:['Linguist','Skill Focus (Knowledge [bureaucracy], Use Computer)','Skill Training (Perception)'],
9:['Armor Proficiency (light)','Burst Fire','Dual Weapon Mastery I','Dual Weapon Mastery II','Improved Damage Threshold','Rapid Shot','Running Attack','Skill Training (Initiative)','Triple Crit','Weapon Focus (rifles)','Weapon Proficiency (heavy weapons, rifles)'],
10:['Armor Proficiency (light)','Point Blank Shot','Rapid Shot','Toughness','Weapon Proficiency (heavy weapons, rifles)'],
11:['Armor Proficiency (light, medium)','Weapon Focus (simple weapons)','Weapon Proficiency (pistols, rifles, simple weapons)'],
12:['Armor Proficiency (light, medium, heavy)','Point Blank Shot','Precise Shot','Rapid Shot','Weapon Proficiency (heavy weapons, pistols, rifles, simple weapons)']}
TALENTS={9:['Devastating Attack (rifles)','Penetrating Attack (rifles)'],11:['Weapon Specialization (simple weapons)'],12:['Acute Senses','Battle Analysis','Cover Fire','Devastating Attack (heavy weapons)']}
RULES={
1:[('HEAT-RESISTANT','On exposure to fire or extreme heat, takes half damage on successful fire attack or no damage on failed attack; no condition track movement. Do not treat as blanket immunity.')],
7:[('COMLINK-JAMMER','Standard action to block all comlinks within 12 squares until end of next turn, including encrypted ones.'),('COMLINK-RELAY','Long-range encrypted communications relay may assist other characters in contact with droid.')],
8:[('EXTENDED-SENSOR','Vehicle-scale droid protocol view allows sensor reroll for master via telemetry, not a second droid actor.'),('EXTENDED-WEAPON-RANGE','Telemetry may reduce two range categories of penalties when both droid and master have line of effect.'),('PATCH-JOB','Fast temporary repair as printed, preserving the Vehicle actor as primary authority.'),('SPACE-BEACON','Sixteen space beacons, blaster cannon and claw are printed vehicle-owned weapons/cargo; DO NOT duplicate into droid actor.')],
9:[('WHEELED-TRANSFORM','Two swift movement actions in one turn change walking mode (2 squares) into wheeled mode (10 squares).'),('ATTACK-CHOICE','Laser vs ion cannon attacks and single/multiattack with burst fire are mutually constrained, not executable weapon mounts inferred from printed attack text.')],
10:[('BARRAGE','Forgo normal actions for one round to launch three grenades against adjacent foes, giving allies within three squares +2 circumstance Reflex against attacks from those foes until next turn.')],
11:[('FENCING-ASSISTANCE','Swift action grants +2 attack assistance; not an unconditional extra melee attack.')],
12:[('HUNTER-SEEKER-MISSILES','Target lock permits one attack attempt per round up to five rounds or until missile hits.'),('NEUROTOXIN-DARTS','Needler gun poison causes Paralytic Poison effect on a living creature only after a successful dart attack; separate poisoning rules required.')],
}
corrections=[]
for n in [1,7,8,9,10,11,12]:
 rec=by[n];er=ev[n];page=66+2*n
 assert er['printedPage']==page
 is_vehicle=n==8
 if is_vehicle:
  ptrvals={'/challenge/challengeLevel':6,'/classification/size':'Large','/classification/contextualDegreeHeading':2,
           '/economics/newCredits':36500,'/economics/availability':'Licensed',
           '/abilities/str':18,'/abilities/dex':14,'/abilities/int':14}
 else:ptrvals={'/'+key:v for key,v in zip(paths,VALUES[n])}
 fixes=[]
 for ptr,value in ptrvals.items():
  group,key=ptr.lstrip('/').split('/');old=rec[group].get(key)
  if old!=value:
   fixes.append({'pointer':ptr,'ocrValue':old,'pdfValue':value,'reason':'Compared to printed page rendering'});rec[group][key]=value
   if value is not None and rec['fieldStates'].get(ptr) in ('not-stated','unclear-source'):rec['fieldStates'].pop(ptr,None)
   er['fieldTranscriptions'][ptr]=f'Printed p{page}: {value} (visual, prior OCR: {old})'
 corrections.extend([(n,x) for x in fixes])
 cite={'book':"Scavenger's Guide to Droids",'page':page,'pdfPage1Based':page+1,'verifiedBy':'pdf-visual','sourceEntryKey':rec['identity']['sourceEntryKey']}
 if not is_vehicle:
  rec['progression']['feats']=[{'traitId':f'SGD-DROID-{n:03d}-feats-{j:02}','name':name,'source':cite.copy()} for j,name in enumerate(FEATS[n],1)]
  if n in TALENTS:rec['progression']['talents']=[{'traitId':f'SGD-DROID-{n:03d}-talents-{j:02}','name':name,'source':cite.copy()} for j,name in enumerate(TALENTS[n],1)]
  else:assert not rec['progression'].get('talents')
 for slug,statement in RULES[n]:
  ruleid=f'SGD-{n:03}-{slug}';arr=rec['rules'].setdefault('conditionalMechanics',[])
  arr[:]=[x for x in arr if x.get('ruleId')!=ruleid]
  arr.append({'ruleId':ruleid,'statement':statement,'scope':rec['identity']['printedName'],'source':cite.copy(),'executionStatus':'source-only'})
 if n==9:
  rec['movement']['locomotionSystems']=[{'instanceId':'sgd-009-walking','mode':'walking','speedSquares':2},{'instanceId':'sgd-009-wheeled','mode':'wheeled','speedSquares':10,'restricted':'exclusive','requiresAction':'Two swift movement actions in the same turn'}]
 er['pdfVisualLayoutChecked']=True
 er['pdfVisualStatblockChecks']={'printedPage':page,'pdfPage1Based':page+1,'method':'rendered-PDF-visual','fieldValues':ptrvals,'sourceCertificationScope':'vehicle primary authority only (NO actor-owned stats)' if is_vehicle else 'selected printed statblock fields, NOT mechanical certification'}
 if not is_vehicle:
  er['pdfVisualStatblockChecks']['printedFeatPhrases']=FEATS[n];er['pdfVisualStatblockChecks']['printedTalentPhrases']=TALENTS.get(n,[])
 if fixes:er['pdfVisualStatblockChecks']['corrections']=fixes
 rec['certification']['identityStatus']='pdf-reviewed'
 ref=f'SGD:p{page}:PDF-p{page+1}:visual-statblock-field-review'; refs=rec['certification'].setdefault('reviewerEvidenceRefs',[])
 if ref not in refs:refs.append(ref)
 visual[n]={'sourceEntryKey':rec['identity']['sourceEntryKey'],'printedName':rec['identity']['printedName'],'printedPage':page,'pdfPage1Based':page+1,'verifiedFieldCount':len(ptrvals),'verifiedFieldPointers':list(ptrvals),'printedFeatPhrasesReviewed':not is_vehicle,'printedTalentPhrasesReviewed':n in TALENTS,'attackTextReviewed':False,'issuesCorrected':fixes,'mechanicalCertification':'PARTIAL_NOT_CERTIFIED'}
assert len(visual)==46
V['items']=[visual[int(rec['identity']['sourceEntryKey'][-3:])] for rec in L['sourceEntries']]
V['visuallyReviewedInThisPass']=len(V['items']);V['fieldComparisons']=sum(x['verifiedFieldCount'] for x in V['items']);V['priorLayoutOnlyCompletion']={'count':7,'pages':[66+2*n for n in [1,7,8,9,10,11,12]],'vehicleFormat':'SGD-DROID-008'}
L['scope']='SGD source-book 46/46 statblock first-page selected-field PDF visual review completed; all mechanical certification still pending.'
assert not by[8]['defenses'] and not by[8]['durability'] and not by[8]['movement'] and not by[8]['combat'] and not by[8]['geometry']
for rec in L['sourceEntries']:
 assert rec['certification']['mechanicalStatus']!='certified' and rec['rules']['mechanicalExecutionStatus']=='source-only'
 for attack in rec['combat'].get('attackGroups',[]):assert attack['operationStatus']=='source-only'
p.write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n');ep.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');vp.write_text(json.dumps(V,ensure_ascii=False,indent=2)+'\n')
print('SGD visual review',len(visual),'of 46; field compares',V['fieldComparisons'],'OCR corrections',corrections)
