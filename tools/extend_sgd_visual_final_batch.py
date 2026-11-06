#!/usr/bin/env python3
"""Second late-book SGD tranche: direct visual p136-158 PDF comparisons. Local-only.

Run after extend_sgd_visual_review.py. Does not certify or enable mechanics.
"""
import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=r/'data/canonical/droids/source-books/sgd.json';ep=r/'data/audits/droids/sgd-field-evidence.json';vp=r/'data/audits/droids/sgd-visual-field-review.json'
L=json.loads(p.read_text());E=json.loads(ep.read_text());V=json.loads(vp.read_text());
by={int(x['identity']['sourceEntryKey'][-3:]):x for x in L['sourceEntries']};ev={int(x['sourceEntryKey'][-3:]):x for x in E['records']};visual={int(x['sourceEntryKey'][-3:]):x for x in V['items']}
# CL/size/degree, defense, durability, abilities, initiative, perception, economics:
VALUES={
 35:(16,'Large',4,30,27,39,26,108,44,29,15,10,11,8,15,15,51405,'Military'),
 36:(9,'Medium',4,28,24,24,21,68,24,16,14,12,14,10,11,13,25705,'Military'),
 37:(0,'Medium',3,10,10,8,10,3,8,7,11,12,10,14,0,5,6260,'Licensed'),
 39:(3,'Large',4,14,11,11,11,32,11,13,16,10,12,6,17,5,26940,'Military'),
 40:(1,'Medium',4,16,13,11,12,18,11,11,16,10,10,13,3,5,20380,'Restricted'),
 42:(1,'Medium',4,15,13,12,12,24,12,11,14,13,12,8,7,6,10755,'Military'),
 43:(0,'Small',2,13,11,10,11,8,10,10,15,16,13,9,2,6,7950,'Licensed'),
 44:(8,'Huge',4,18,17,27,15,110,42,32,12,12,12,8,14,14,43000,'Military'),
 45:(0,'Medium',5,14,14,12,12,4,12,14,10,8,14,10,0,12,9600,'Licensed'),
 46:(9,'Medium',4,27,24,27,20,67,27,18,14,12,13,12,11,12,28830,'Military'),
}
paths=['challenge/challengeLevel','classification/size','classification/publishedDegree','defenses/reflex','defenses/flatFootedReflex','defenses/fortitude','defenses/will','durability/hitPoints','durability/damageThreshold','abilities/str','abilities/dex','abilities/int','abilities/wis','abilities/cha','abilities/initiativePrinted','abilities/perceptionPrinted','economics/newCredits','economics/availability']
RULES={
35:[('PLASMA-BURST','If plasma burst cannon damage exceeds target damage threshold, add a die of plasma heat damage; not an ordinary extra damage die on all attacks.'),('DEFENSE-MODE','Swift action to designate defense target; one reaction attack against enemy who attacks that target once per encounter.'),('SWIFT-ASSAULT','Once per encounter, can attack as swift action with -10 penalty while also taking two move actions that turn.'),('DELAY-DAMAGE','Reaction: delay effect of a single attack, ability or effect used against the droid until the end of its next turn.')],
36:[('CONCEALED-VIBRODAGGERS','Hidden finger vibrodaggers extend as a swift action; multiple dagger damage already included in printed attack.'),('STEALTH-COATING','In darkness/shadow, +5 Stealth; opposed Stealth against scanning sensor operator Use Computer.'),('THREAT-SCAN','Full-round action with DC 20 Perception to detect nearby living beings, explosives, and obvious threats within 30 meters.')],
37:[('EMPATHIC','Reroll Persuasion check to improve intended target attitude, keeping better result; only relevant to attitude-change checks.')],
39:[('CUTTING-LASER','Area attack targets five contiguous squares; +9 vs targets Reflex, ignoring DR, 3d10 energy/fire damage or half on miss.'),('STABILITY','+5 bonus to avoid being knocked prone.')],
40:[('DASTARDLY-STRIKE','Successful concealed knife/pistol attack moves target one step down condition track only if target denied Dexterity bonus to Reflex.')],
42:[('SILENT-ACTION','Swift action to aid character Stealth check for +2 bonus, not a permanent party-wide Stealth buff.')],
43:[('STAY-ON-TARGET','As swift action make Pilot check at -5, opposed by target Pilot check; success engages in dogfight.')],
44:[('MOLECULAR-SHIELDING','After ranged energy attack misses droid, redirect at attacker using opponent roll minus 10 versus attacker Reflex.'),('DEEP-SEA-DIVER','Published separate modification, not the stock X-1 configuration; no automatic equipment grant.')],
45:[('QUICK-SCAN','DC 20 Perception in 6-square radius reduces cover/concealment penalties by half for master; optional Use Computer check retrieves network info in half time.'),('HOVER-LOCOMOTION','Walking and hovering speeds both 6; hovering explicitly limited in systems listing.')],
46:[('REPULSOR-LEAP','Limited booster reduces Jump DCs by half, free action.'),('YV-SCAN','Full-round action; enhanced Perception against Yuuzhan Vong Stealth/Deception within 12 squares.'),('YV-TAUNT','As free action droid may force affected Yuuzhan Vong to target it next turn after successful Intimidation; does not grant unrestricted control.'),('VARIABLE-POWER-WEAPON','Normal and increased-power cannon shots consume different ammo; increased power adds one damage die and doubles shot consumption.')],
}
FEATS={
35:['Armor Proficiency (light, medium, heavy)','Burst Fire','Dual Weapon Mastery I','Dual Weapon Mastery II','Martial Arts I','Point Blank Shot','Running Attack','Skill Training (Knowledge [tactics])','Weapon Focus (heavy weapons)','Weapon Proficiency (heavy weapons, pistols, rifles, simple weapons)'],
36:['Aiming Accuracy','Armor Proficiency (light, medium, heavy)','Martial Arts I','Martial Arts II','Point Blank Shot','Precise Shot','Skill Training (Stealth)','Weapon Proficiency (advanced melee weapons, pistols, rifles, simple weapons)'],
37:['Skill Focus (Perception, Persuasion, Treat Injury)','Skill Training (Treat Injury)'],
39:['Armor Proficiency (light)','Dual Weapon Mastery I','Point Blank Shot','Rapid Shot','Skill Focus (Initiative)','Weapon Focus (heavy weapons)','Weapon Proficiency (heavy weapons)'],
40:['Point Blank Shot','Skill Focus (Deception)','Weapon Proficiency (pistols, simple weapons)'],
42:['Skill Focus (Stealth)','Weapon Proficiency (pistols, rifles, simple weapons)'],
43:['Skill Focus (Pilot)','Weapon Proficiency (simple weapons, heavy weapons)'],
44:['Armor Proficiency (light, medium, heavy)','Burst Fire','Distracting Droid','Double Attack','Improved Damage Threshold','Ion Shielding','Point Blank Shot','Weapon Focus (heavy weapons)','Weapon Proficiency (heavy weapons, pistols, rifles, simple weapons)'],
45:['Armor Proficiency (light)','Skill Focus (Perception, Use Computer)','Skill Training (Use Computer)'],
46:['Armor Proficiency (light, medium, heavy)','Martial Arts I','Mechanical Martial Arts','Point Blank Shot','Precise Shot','Weapon Proficiency (advanced melee weapons, heavy weapons, pistols, rifles, simple weapons)'],
}
TALENTS={
35:['Armored Defense','Devastating Attack (heavy weapons)','Greater Devastating Attack (heavy weapons)','Greater Penetrating Attack (heavy weapons)','Greater Weapon Focus (heavy weapons)','Multiattack Proficiency (heavy weapons)','Penetrating Attack (heavy weapons)','Weapon Specialization (heavy weapons)'],
36:['Armored Defense',"Harm's Way",'Hidden Movement','Improved Stealth','Total Concealment'],
40:['Dastardly Strike'],42:['Improved Stealth'],44:['Devastating Attack (heavy weapons)','Penetrating Attack (heavy weapons)'],
46:['Acute Senses','Armored Defense','Battle Analysis','Devastating Attack (heavy weapons)','Improved Initiative','Tough as Nails']}
corrections=[]
for n,values in VALUES.items():
 rec=by[n];er=ev[n];page=66+n*2;assert er['printedPage']==page
 ptrvals={'/'+a:v for a,v in zip(paths,values)};fixes=[]
 for ptr,value in ptrvals.items():
  a,b=ptr.lstrip('/').split('/');old=rec[a].get(b)
  if old!=value:
   fixes.append({'pointer':ptr,'ocrValue':old,'pdfValue':value,'reason':'Manually visually checked against printed page'});rec[a][b]=value
   if value is not None and rec['fieldStates'].get(ptr) in ('not-stated','unclear-source'):rec['fieldStates'].pop(ptr,None)
   er['fieldTranscriptions'][ptr]=f'Printed p{page}: {value} (visual, previous OCR: {old})'
 corrections.extend([(n,f) for f in fixes])
 ref={'book':"Scavenger's Guide to Droids",'page':page,'pdfPage1Based':page+1,'verifiedBy':'pdf-visual','sourceEntryKey':rec['identity']['sourceEntryKey']}
 def traits(labels,group):
  return [{'traitId':f'SGD-DROID-{n:03d}-{group}-{j:02}','name':label,'source':ref.copy()} for j,label in enumerate(labels,1)]
 rec['progression']['feats']=traits(FEATS[n],'feats')
 if n in TALENTS:rec['progression']['talents']=traits(TALENTS[n],'talents')
 else:assert not rec['progression'].get('talents'),f'SGD {n} unexpected talents'
 for slug,statement in RULES.get(n,[]):
  ruleid=f'SGD-{n:03}-{slug}';arr=rec['rules'].setdefault('conditionalMechanics',[])
  arr[:]=[x for x in arr if x.get('ruleId')!=ruleid]
  arr.append({'ruleId':ruleid,'statement':statement,'scope':rec['identity']['printedName'],'source':ref.copy(),'executionStatus':'source-only'})
 if n==45:
  rec['movement']['locomotionSystems']=[{'instanceId':'sgd-045-walking','mode':'walking','speedSquares':6},{'instanceId':'sgd-045-hover','mode':'hovering','speedSquares':6,'restricted':'limited','usageCondition':'Limited hovering locomotion per printed systems line'}]
 er['pdfVisualLayoutChecked']=True
 er['pdfVisualStatblockChecks']={'printedPage':page,'pdfPage1Based':page+1,'method':'rendered-PDF-visual','fieldValues':ptrvals,'printedFeatPhrases':FEATS[n],'printedTalentPhrases':TALENTS.get(n,[]),'sourceCertificationScope':'selected primary-statblock fields only; not mechanical certification'}
 if fixes:er['pdfVisualStatblockChecks']['corrections']=fixes
 rec['certification']['identityStatus']='pdf-reviewed';refKey=f'SGD:p{page}:PDF-p{page+1}:visual-statblock-field-review'
 evid=rec['certification'].setdefault('reviewerEvidenceRefs',[])
 if refKey not in evid:evid.append(refKey)
 visual[n]={'sourceEntryKey':rec['identity']['sourceEntryKey'],'printedName':rec['identity']['printedName'],'printedPage':page,'pdfPage1Based':page+1,'verifiedFieldCount':len(ptrvals),'verifiedFieldPointers':list(ptrvals),'printedFeatPhrasesReviewed':True,'printedTalentPhrasesReviewed':n in TALENTS,'attackTextReviewed':False,'issuesCorrected':fixes,'mechanicalCertification':'PARTIAL_NOT_CERTIFIED'}
assert len(visual)>=39,(len(visual),visual.keys())
V['items']=[visual[int(rec['identity']['sourceEntryKey'][-3:])] for rec in L['sourceEntries'] if int(rec['identity']['sourceEntryKey'][-3:]) in visual]
V['visuallyReviewedInThisPass']=len(V['items']);V['fieldComparisons']=sum(x['verifiedFieldCount'] for x in V['items']);V['newLateBookReviewTranche']={'count':10,'pages':[66+n*2 for n in VALUES]}
L['scope']='46 SGD publication source records, 39 model statblocks selected-field visually verified; no mechanical certification.'
for rec in L['sourceEntries']:
 assert rec['certification']['mechanicalStatus']!='certified' and rec['rules']['mechanicalExecutionStatus']=='source-only'
 for attack in rec['combat'].get('attackGroups',[]):assert attack['operationStatus']=='source-only'
p.write_text(json.dumps(L,ensure_ascii=False,indent=2)+'\n');ep.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n');vp.write_text(json.dumps(V,ensure_ascii=False,indent=2)+'\n')
print('Visually reviewed models',len(visual),'numeric reviewed fields',V['fieldComparisons'],'corrections',corrections)
