#!/usr/bin/env python3
"""Append a second, explicitly page-inspected SGD field-review tranche.

Evidence is from manually inspected rendered PDF p104..p134, NOT from OCR alone.
This script only updates source draft fields and source-only rule notes. Never
promotes or enables runtime execution. Safe to rerun; never rebuilds the ledger.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
L=ROOT/'data/canonical/droids/source-books/sgd.json'
E=ROOT/'data/audits/droids/sgd-field-evidence.json'
V=ROOT/'data/audits/droids/sgd-visual-field-review.json'
book="Scavenger's Guide to Droids"
ledger=json.loads(L.read_text()); evidence=json.loads(E.read_text()); visual=json.loads(V.read_text())
rby={int(r['identity']['sourceEntryKey'][-3:]):r for r in ledger['sourceEntries']}
eby={int(r['sourceEntryKey'][-3:]):r for r in evidence['records']}
vby={int(r['sourceEntryKey'][-3:]):r for r in visual['items']}
# CL,size,degree,Ref,flat-footed,Fort,Will,hp,DT,STR,DEX,INT,WIS,CHA,Init,Perception,price,availability
# Each tuple below was compared against the RENDERED page by the reviewer.
EXPECTED={
 19:(1,'Medium',3,13,12,10,15,18,10,8,12,15,15,16,6,9,11855,'Licensed'),
 20:(1,'Small',2,17,14,11,11,24,11,8,16,17,11,11,8,0,10565,'Restricted'),
 21:(4,'Medium',4,21,18,18,15,55,18,14,16,13,12,10,10,10,19865,'Restricted'),
 22:(6,'Medium',4,18,17,19,15,32,19,14,13,12,10,8,5,11,19130,'Military'),
 23:(2,'Large',5,17,17,17,9,31,22,24,10,10,8,8,3,2,21880,'Licensed'),
 24:(2,'Medium',2,14,14,18,14,28,23,20,10,12,14,8,1,15,12285,'Licensed'),
 26:(1,'Medium',2,14,12,12,11,24,12,9,14,15,10,13,7,5,11080,'Licensed'),
 27:(5,'Medium',1,13,13,12,17,26,12,8,8,16,14,12,3,11,15000,'Licensed'),
 30:(3,'Medium',5,17,15,15,15,13,15,15,12,12,13,11,3,15,14800,'Licensed'),
 31:(0,'Small',2,12,11,9,10,5,9,9,13,14,10,8,2,8,7990,'Licensed'),
 32:(0,'Medium',3,9,9,8,10,3,8,7,8,12,10,14,-1,0,5505,'Licensed'),
 33:(1,'Medium',2,12,10,10,9,10,10,10,15,13,8,12,4,1,9855,'Licensed'),
 34:(0,'Small',2,11,11,10,12,4,10,11,10,16,14,11,1,8,8625,'Licensed')
}
FEATS={
19:['Linguist','Skill Focus (Gather Information)','Weapon Proficiency (pistols, simple weapons)'],
20:['Skill Focus (Mechanics)','Weapon Proficiency (pistols, rifles, simple weapons)'],
21:['Armor Proficiency (light, medium)','Dual Weapon Mastery I','Point Blank Shot','Toughness','Weapon Focus (rifles)','Weapon Proficiency (pistols, rifles, simple weapons)'],
22:['Armor Proficiency (light)','Coordinated Attack','Point Blank Shot','Rapid Shot','Skill Training (Stealth)','Weapon Focus (rifles)','Weapon Proficiency (heavy weapons, pistols, rifles, simple weapons)'],
23:['Armor Proficiency (light, medium)','Slammer','Toughness','Weapon Proficiency (pistols, simple weapons)'],
24:['Improved Damage Threshold','Skill Focus (Perception)','Weapon Proficiency (pistols, rifles, simple weapons)'],
26:['Shake It Off','Skill Focus (Mechanics)','Skill Focus (Use Computer)*','Skill Training (Use Computer)*','Weapon Proficiency (simple weapons)'],
27:['Linguist','Skill Focus (Gather Information)','Skill Focus (Knowledge [bureaucracy])','Skill Focus (Knowledge [galactic lore])','Skill Training (Deception)','Skill Training (Knowledge [galactic lore])','Skill Training (Persuasion)','Skill Training (Use Computer)','Weapon Proficiency (simple weapons)'],
30:['Martial Arts I','Pin','Quick Draw','Skill Focus (Perception)','Skill Training (Deception)','Skill Training (Mechanics)','Weapon Proficiency (simple weapons)'],
31:['Skill Focus (Mechanics, Pilot, Use Computer)','Skill Training (Pilot)'],
32:['Skill Focus (Knowledge [galactic lore], Persuasion)','Skill Training (Deception, Knowledge [bureaucracy])'],
33:['Skill Focus (Pilot)','Skill Training (Knowledge [galactic lore], Mechanics)','Vehicular Combat','Weapon Proficiency (heavy weapons)'],
34:['Skill Focus (Knowledge [technology], Mechanics, Use Computer)','Toughness']
}
TALENTS={19:['Educated'],20:['Jury-Rigger'],21:['Indomitable','Weapon Specialization (rifles)'],22:['Acute Senses','Expert Tracker','Weapon Specialization (rifles)'],24:['Acute Senses'],26:['Jury-Rigger'],27:['Educated','Inspire Haste'],30:['Disruptive','Walk the Line']}
# Concise evidence-backed conditional semantics. These are NOT executable rule commands.
RULES={
19:[('ANALYZE-DATA','Swift action, once per turn: assist a Gather Information check by granting +2 when it succeeds.'),('DIAGNOSIS','Free action: Knowledge (life sciences) check with +5 bonus to identify a disease/injury and communicate the diagnosis.'),('EXPERT-OPINION','Swift action: Knowledge (life sciences), (galactic lore), or (physical sciences) check; report findings.')],
20:[('PREVENTIVE-MAINTENANCE','Per 8 hours spent working on a vehicle, restore hit points equal to CL, capped at the vehicle maximum; can work during hyperspace travel.'),('RECHARGE-SHIELDS','Two swift actions: DC 20 Mechanics check restores 5 shield rating to a starship, up to its normal maximum.'),('REGULATE-POWER','Two swift actions: DC 20 Mechanics check moves a ship one step up the condition track.')],
21:[('BLASTER-SURGE','As full-round action, overcharge one blaster rifle for 5d8+4 damage, consume extra five shots, and do not fire that weapon next round while cooling.'),('SALVO','Two swift actions: two ranged attack rolls at +3 each using the printed two-weapon configuration, not an unconditional free attack.')],
22:[('COORDINATED-TRACKING','Up to four HKB-3 droids tracking the same target and within 30 squares of at least one other share highest Survival result; automatic aid on same check.'),('HUNTING-SENSOR','Ignores cover and concealment bonuses only on Perception checks, not attack rolls.'),('SIMULTANEOUS-FIRE','When aiding another HKB-3 attack roll, successful attack gains +1d6 damage per 5 points it exceeds target Reflex; stack aid attack bonuses, but damage bonus applies only once.')],
23:[('MINING-SHIELD-GENERATOR','Built-in SR 10; can reroll Endurance checks against environmental damage/effects and keep better result.'),('STABILITY','+5 bonus to avoid being knocked prone.'),('ADAPTABLE-PROGRAMMING','Reduce Use Computer DC to reprogram this model by 5.'),('SLAMMER','If 1d6+18 melee slammer damage exceeds target damage threshold, the target receives a persistent condition.')],
24:[('ADVANCED-SENSORS','With successful Perception check, detect EM energy, radiation or seismic activity within 500m and motion within 12 squares.')],
26:[('LATERAL-THINKER','When spending Force Point to improve a Mechanics or Use Computer check, use a larger die for that Force Point (d6 becomes d8, d8 becomes d10).'),('VERSATILE-APPENDAGES','The claw appendages count as having a tool kit; do not grant extra component slot capacity.')],
27:[('SUPERIOR-ANALYSIS','When failing Knowledge check, make a Perception check and add half its result to the original Knowledge check; take new result.'),('TIMELY-OBSERVATION','Once per encounter as free action, DC 20 Perception to observe weakness; give self or eligible ally +1 to next attack/opposed skill check against that opponent.')],
30:[('INSTANT-HELP','Once per encounter as reaction, move up to speed and automatically aid an ally with an attack roll or trained skill check.'),('QUICK-FIX','Once per encounter, perform Jury-Rig Mechanics use as standard rather than full-round action.')],
31:[('NAVIGATION-CHARTS','Can calculate hyperspace course without HoloNet access; printed memory bank also has timing and Use Computer ramifications.'),('RECHARGE-SHIELDS','Two swift actions restore 5 SR by successful Mechanics check, up to normal maximum.'),('REGULATE-POWER','Two swift actions, successful Mechanics check can improve vehicle condition track one step.')],
32:[('MIMIC','Swift action: reroll Deception to imitate selected character mannerisms and gestures, must keep second result; protocol format separately has +2 disguise-appearance bonus.')],
33:[('HOT-SHOT-PILOT','Reroll Pilot check against collision; once per encounter as reaction, Piloting vs incoming missile/torpedo attack roll may dodge it for the round.'),('ENGAGE-ENEMY','Free action at battle start: use Pilot check instead of Initiative check.')],
34:[('FOCUSED-REPAIRS','Successful Mechanics check reduces repair time by 2 minutes per margin over DC; minimum 10 minutes.'),('REROLL-MECHANICS','Protocol focused repair offers a master reroll their Mechanics check, must keep second result.')]
}
# Selected printed attack alternatives, preserving original source structure only.
ATTACKS={
19:[('unarmed','Melee unarmed -1 (1d3-1)',-1),('by-weapon','Ranged by weapon +1',1)],
20:[('unarmed','Melee unarmed -1 (1d2-1)',-1),('by-weapon','Ranged by weapon +3',3)],
21:[('unarmed','Melee unarmed +6 (1d3+4)',6),('rifle','Ranged blaster rifle +8 (3d8+4) or',8),('rifle-paired','Ranged blaster rifle +3/+3 (3d8+4)',None)],
22:[('unarmed','Melee unarmed +8 (1d3+4)',8),('rifle','Ranged blaster rifle +8 (3d8+4) or',8),('rifle-rapid','Ranged blaster rifle +6 (4d8+4) with Rapid Shot',6)],
23:[('unarmed','Melee unarmed +11 (1d4+7)',11),('laser-cutter','Ranged laser cutter +4 (3d8)',4)],
24:[('unarmed','Melee unarmed +6 (1d3+6)',6),('by-weapon','Ranged by weapon +1',1)],
26:[('claw','Melee claw -1',-1)],
27:[('unarmed','Melee unarmed +5 (1d3)',5),('by-weapon','Ranged by weapon +5',5)],
30:[('unarmed','Melee unarmed +4 (1d4+3) or',4),('club','Melee club +4 (1d6+3) or',4),('stun-baton','Melee stun baton +4 (1d6+3/2d6 stun)',4),('by-weapon','Ranged by weapon +3',3)],
31:[('electroshock','Melee electroshock probe +0 (1d8-1 ion)',0),('laser-welder','Ranged laser welder +2 (3d6)',2)],
32:[('unarmed','Melee unarmed -2 (1d3-2)',-2),('by-weapon','Ranged by weapon -1',-1)],
33:[('claw','Melee claw +3 (1d4)',3),('by-weapon','Ranged by weapon +5',5)],
34:[('unarmed','Melee unarmed +1 (1d3)',1),('by-weapon','Ranged by weapon +1',1)]
}
fields=['challenge/challengeLevel','classification/size','classification/publishedDegree','defenses/reflex','defenses/flatFootedReflex','defenses/fortitude','defenses/will','durability/hitPoints','durability/damageThreshold','abilities/str','abilities/dex','abilities/int','abilities/wis','abilities/cha','abilities/initiativePrinted','abilities/perceptionPrinted','economics/newCredits','economics/availability']
changes=[]
for n,vals in EXPECTED.items():
 r=rby[n];e=eby[n];page=66+n*2;pdf=page+1
 assert page==r['publication']['printedPageStart'] and e['printedPage']==page
 ptrvals={'/'+k:v for k,v in zip(fields,vals)}
 corrections=[]
 for ptr,v in ptrvals.items():
  g,k=ptr.strip('/').split('/')
  old=r[g].get(k)
  if old!=v:
   # All sources for corrections must be exact rendered, manually transcribed page.
   corrections.append({'pointer':ptr,'ocrValue':old,'pdfValue':v,'reason':'Direct comparison against printed-page PDF rendering'})
   r[g][k]=v
   # An explicitly unknown OCR null can gain value ONLY when PDF visual confirms it.
   if v is not None and r['fieldStates'].get(ptr) in ('not-stated','unclear-source'):
    r['fieldStates'].pop(ptr,None)
   e['fieldTranscriptions'][ptr]=f'Printed p{page}: {v} (visual; prior OCR {old})'
 if corrections: changes.append((n,corrections))
 cite={'book':book,'page':page,'pdfPage1Based':pdf,'verifiedBy':'pdf-visual','sourceEntryKey':r['identity']['sourceEntryKey']}
 def traits(names,group):
  return [{'traitId':f'SGD-DROID-{n:03d}-{group}-{j:02}','name':name,'source':cite.copy()} for j,name in enumerate(names,1)]
 r['progression']['feats']=traits(FEATS[n],'feats')
 if n in TALENTS:r['progression']['talents']=traits(TALENTS[n],'talents')
 else:assert not r['progression'].get('talents'),f'{n} unexpected existing talents'
 r['combat']['attackGroups']=[{'attackId':'printed-'+slug,'raw':raw,'operationStatus':'source-only',**({'attackBonus':ab} if ab is not None else {})} for slug,raw,ab in ATTACKS[n]]
 for slug,statement in RULES.get(n,[]):
  rid=f'SGD-{n:03d}-{slug}'; rules=r['rules'].setdefault('conditionalMechanics',[])
  rules[:]=[s for s in rules if s.get('ruleId')!=rid]
  rules.append({'ruleId':rid,'statement':statement,'scope':r['identity']['printedName'],'source':cite.copy(),'executionStatus':'source-only'})
 if n==26:
  # A printed contradiction exists within this very page: main statblock and protocol header.
  # The source makes inconsistent degree claims in two views on p118.
  contradiction={'issueId':'SGD-026-CONFLICT-DEGREE','fieldPointers':['/classification/publishedDegree','/classification/contextualDegreeHeading'],
   'statements':[{'book':book,'page':page,'pdfPage1Based':pdf,'citationLabel':'Primary statblock: Medium droid (2nd-degree)','verifiedBy':'pdf-visual','sourceEntryKey':r['identity']['sourceEntryKey']},
                 {'book':book,'page':page,'pdfPage1Based':pdf,'citationLabel':'Protocol view: Medium droid (3rd-degree)','verifiedBy':'pdf-visual','sourceEntryKey':r['identity']['sourceEntryKey']}],
   'resolutionStatus':'unresolved'}
  notes=r['exceptions'].setdefault('sourceContradictions',[])
  notes[:]=[x for x in notes if not isinstance(x,str) and x.get('issueId')!='SGD-026-CONFLICT-DEGREE']
  notes.append(contradiction)
 if n==31:r['movement']['locomotionSystems']=[{'instanceId':'sgd-031-wheeled','mode':'wheeled','speedSquares':6},{'instanceId':'sgd-031-walking','mode':'walking','speedSquares':4,'restricted':'exclusive'}]
 if n==23: # Source has an actual shield rating and condition on the droid itself.
  pass
 e['pdfVisualLayoutChecked']=True
 e['pdfVisualStatblockChecks']={'printedPage':page,'pdfPage1Based':pdf,'method':'rendered-PDF-visual','fieldValues':ptrvals,'sourceCertificationScope':'selected visible statblock fields only, NOT comprehensive mechanical certification','printedFeatPhrases':FEATS[n],'printedTalentPhrases':TALENTS.get(n,[]),'printedAttacks':[x[1] for x in ATTACKS[n]]}
 if corrections:e['pdfVisualStatblockChecks']['corrections']=corrections
 r['certification']['identityStatus']='pdf-reviewed'
 r['certification'].setdefault('reviewerEvidenceRefs',[])
 ref=f'SGD:p{page}:PDF-p{pdf}:visual-statblock-field-review'
 if ref not in r['certification']['reviewerEvidenceRefs']:r['certification']['reviewerEvidenceRefs'].append(ref)
 vby[n]={'sourceEntryKey':r['identity']['sourceEntryKey'],'printedName':r['identity']['printedName'],'printedPage':page,'pdfPage1Based':pdf,'verifiedFieldCount':len(ptrvals),'verifiedFieldPointers':list(ptrvals),'printedFeatPhrasesReviewed':True,'printedTalentPhrasesReviewed':n in TALENTS,'attackTextReviewed':True,'issuesCorrected':corrections,'mechanicalCertification':'PARTIAL_NOT_CERTIFIED'}
assert len(vby)>=29,(len(vby),vby.keys())
visual['items']=[vby[int(x['identity']['sourceEntryKey'][-3:])] for x in ledger['sourceEntries'] if int(x['identity']['sourceEntryKey'][-3:]) in vby]
visual['visuallyReviewedInThisPass']=len(visual['items'])
visual['fieldComparisons']=sum(x['verifiedFieldCount'] for x in visual['items'])
visual['newReviewTranche']={'count':len(EXPECTED),'printedPages':[66+n*2 for n in EXPECTED]}
ledger['scope']='46/46 provisional mechanical drafts, 29 source entries with selected-field PDF visual reviews; NOT mechanically certified.'
for r in ledger['sourceEntries']:
 assert r['certification']['mechanicalStatus']!='certified' and r['rules']['mechanicalExecutionStatus']=='source-only'
 for a in r['combat'].get('attackGroups',[]):assert a['operationStatus']=='source-only'
L.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n');E.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n');V.write_text(json.dumps(visual,ensure_ascii=False,indent=2)+'\n')
print('New PDF visual rows',len(EXPECTED),'total',len(vby),'fields added',len(EXPECTED)*18,'total fields',visual['fieldComparisons'])
print('Numeric OCR corrected',sum(len(y) for _,y in changes),'entries',json.dumps(changes,ensure_ascii=False))
