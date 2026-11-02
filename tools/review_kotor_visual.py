#!/usr/bin/env python3
"""One-time selected-field manual visual review of rendered KOTOR printed pages.
The numeric rows below were transcribed from displayed printed page images, NOT
from an OCR parser. Source-only evidence is not executable/mechanically certified.
"""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
LP=R/'data/canonical/droids/source-books/kotor.json'
EP=R/'data/audits/droids/kotor-field-evidence.json'
VP=R/'data/audits/droids/kotor-visual-field-review.json'
if VP.exists():raise SystemExit('REFUSING to overwrite reviewed visual data')
l=json.loads(LP.read_text());e=json.loads(EP.read_text())
# ID : Init, Perception, Ref, FFRef, Fort, Will, hp, Threshold, speed, [DR, SR], [new price or appraisal]
# Careful: null is not zero; omitted optional fields are intentionally not established.
DATA='''
1|1|0|12|11|8|10|3|8|4||2700
2|4|4|15|13|9|11|10|9|4|SR10|60000
3|2|3|12|11|9|10|5|9|4||3500
4|0|2|10|9|10|11|5|9|6||2500
5|3|7|12|10|9|11|5|9|6||4000
6|12|8|22|19|19|16|43|19|6||A24000
7|8|8|18|15|15|12|30|15|6||
8|15|11|26|22|26|21|75|26|6|DR2|A33000
9|12|6|20|17|16|14|26|16|6||20000
10|4|17|17|15|13|16|12|13|4||6000
11|11|10|15|12|9|13|12|9|6||4700
12|13|11|18|15|16|13|46|16|6||12000
13|8|1|16|14|13|10|8|13|6||2400
14|6|15|20|15|7|12|5|7|9||2000
15|1|1|17|17|17|10|15|22|8||6000
16|-2|5|10|10|9|10|4|9|4||800
17|8|13|20|18|12|12|30|12|4|SR10|14910
18|12|12|19|18|14|12|52|19|6|SR10|16270
19|6|11|13|11|19||70|29||DR5|A70000
20|7|6|18|16|9|12|28|9|4|SR10|
21|11|12|24|21|23|20|76|23|6|DR1|
22|2|3|21|11|15|18|26|15|4||
23|7|5|22|19|20|14|26|20|6||11000
24|9|15|19|17|10|11|38|10|8||'''
lines=[x.strip().split('|') for x in DATA.splitlines() if x.strip()]
assert len(lines)==24 and all(len(x)==12 for x in lines)
mapline={int(a[0]):a[1:] for a in lines}
# Source-only effects independently tied to the printed model/pages; never activate.
NOTES={
 7:[('HK-HERO-ROUTE','The independent HK-Series heroic character template is GM-conditional, not a free licence to select either factory HK-24 or HK-50 build.',85)],
 9:[('MULTIMODE','Juggernaut has flying, walking, swimming movement and multiple dissimilar weapons; confirm movement system and mounts before execution.',86)],
 10:[('SELF-DESTRUCT','K-X12 missile self-destruction requires source-specific conditions and owner certification, not a generic attack action.',86)],
 17:[('TWO-RIFLES','Mark I printed single and combined rifle attacks are mutually contextual alternatives, not three installed fire rights.',165)],
 18:[('LOGIC-UPGRADE','Mark IV source-specific Logic Upgrade: Self Defense is conditional; do not implement without registered authority.',165)],
 19:[('PASSENGER-DELEGATION','Authorized passenger may substitute their attack or skill bonuses for the droid brain; commands of authorized passengers must be obeyed. Vehicle engine owns delegation.',203)],
 21:[('NAMED-NPC','HK-47 is a named evolved character with DR and class levels; cannot be substituted for Independent HK-Series creation template.',213)],
 22:[('NAMED-NPC','T3-M4 named instance has distinct heroic class levels and equipment; not the stock T3-series starting profile.',216)],
 23:[('LANGUAGE-LIMIT','Krath War Droid understands Basic but cannot speak it; keep speaking and understanding separate.',222)],
 24:[('INTEGRATED-MULTIWEAPON','Rakatan Guardian integrated weapons list three distinct modalities; possession label alone is not sufficient weapon-mount evidence.',223)],
}
review=[]
for i,(r,x) in enumerate(zip(l['sourceEntries'],e['records']),1):
 id=f'KOTOR-DROID-{i:03d}';p=r['publication']['printedPageStart'];c=r['classification']
 assert x['sourceEntryKey']==id==r['identity']['sourceEntryKey']
 assert (R/f'work/kotor_pdf_review/printed_p{p}.png').is_file()
 nums=mapline[i];init,perc,ref,ff,fort,will,hp,threshold,speed,defextra,price=nums
 vals={'/identity/printedName':r['identity']['printedName'],
       '/classification/size':c['size'],
       '/challenge/challengeLevel':r['challenge']['challengeLevel'],
       '/classification/statblockFormat':c['statblockFormat'],
       '/classification/primaryActorAuthority':c['primaryActorAuthority']}
 if i!=19:vals['/classification/publishedDegree']=c['publishedDegree']
 # The Basilisk has a vehicle statblock: preserve numeric facts only under the
 # separate evidence layer. Never copy vehicle hp/DR/speed/weapons to actor.
 if i==19:
  x['vehiclePrintedStatblock']={'reflex':13,'flatFootedReflex':11,'fortitude':19,
   'hitPoints':70,'damageReduction':5,'threshold':29,'flySquares':12,
   'starshipScaleFlySquares':3,'maximumKmh':550,'crew':'1 (skilled, droid brain)',
   'passengers':1,'payload':'4 concussion missiles, 2 space mines',
   'availability':'Military, Rare','estimatedValueCredits':70000,
   'note':'Vehicle engine only, no droid-actor stat grant or attack permissions.'}
 else:
  for k,v in [('initiativePrinted',init),('perceptionPrinted',perc)]:
   if v:r['abilities'][k]=int(v);vals['/abilities/'+k]=int(v)
  for k,v in [('reflex',ref),('flatFootedReflex',ff),('fortitude',fort),('will',will)]:
   if v:r['defenses'][k]=int(v);vals['/defenses/'+k]=int(v)
  for k,v in [('hitPoints',hp),('damageThreshold',threshold)]:
   if v:r['durability'][k]=int(v);vals['/durability/'+k]=int(v)
  # Movement speed is retained as evidence data until mode/transition parsing is certified.
  x['visuallyObservedSpeedSquares']=int(speed) if speed else None
  if defextra:
   if defextra.startswith('DR'):r['defenses']['damageReduction']=int(defextra[2:]);vals['/defenses/damageReduction']=int(defextra[2:])
   elif defextra.startswith('SR'):r['defenses']['shieldRating']=int(defextra[2:]);vals['/defenses/shieldRating']=int(defextra[2:])
  if price:
   if price.startswith('A'):
    r['economics']['estimatedValueCredits']=int(price[1:]);vals['/economics/estimatedValueCredits']=int(price[1:])
    r['economics']['forSale']=False;vals['/economics/forSale']=False
   else:r['economics']['newCredits']=int(price);vals['/economics/newCredits']=int(price)
  if r['pcConstruction']['heroEligibility'] is not None and i in (2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,23):
   vals['/pcConstruction/heroEligibility']=r['pcConstruction']['heroEligibility']
  if i==16: # Printed Utility Droid speed and source only, no assumptions from fiction
   assert r['identity']['printedName']=='R-8009 Utility Droid'
 r['certification']['identityStatus']='pdf-reviewed'
 r['certification']['reviewNotes']='Rendered printed-page selected fields checked. No full narrative, feat/talent, installation, attack ownership, hero build, or V13 runtime certification.'
 r['certification']['reviewerEvidenceRefs'].append(f'{id}:printed-p{p}:PDF-p{p+1}:visual-selected')
 if i in NOTES:
  for slug,stmt,pp in NOTES[i]:
   r['rules'].setdefault('conditionalMechanics',[]).append({'ruleId':f'{id}-{slug}',
     'statement':stmt,'scope':id,'source':{'book':l['book'],'page':pp,
       'pdfPage1Based':pp+1,'verifiedBy':'pdf-visual','sourceEntryKey':id},
     'executionStatus':'source-only'})
 x['sourceReviewStatus']='PDF_SELECTED_FIELDS_VISUAL'
 x['pdfVisualFieldChecks']={'printedPage':p,'pdfPage1Based':p+1,
   'sourceImage':f'work/kotor_pdf_review/printed_p{p}.png','fieldValues':vals,
   'fieldComparisonCount':len(vals),
   'limitations':'Selected statblock fields only. Numeric speed not counted as exact, primary weapon and component claims blocked.'}
 review.append({'sourceEntryKey':id,'printedName':r['identity']['printedName'],
                'printedPage':p,'verifiedFieldCount':len(vals),'scope':'selected-first-page-fields',
                'primaryActorAuthority':c['primaryActorAuthority']})
assert sum(v['primaryActorAuthority']=='vehicle' for v in review)==1
visual={'schema':'swse.droid.kotor.selected-pdf-visual/0.1','sourceBook':l['book'],
 'manualVisualReviews':len(review),'directFieldComparisons':sum(v['verifiedFieldCount'] for v in review),
 'method':'Printed book pages manually visually inspected as rendered PNGs; statblock field candidates independently transcribed. No text-extraction-only claim may be marked visual.',
 'sourcePdfHash':e['sourcePdfSha256'],
 'scope':'Only explicit pointer fields listed in evidence are visually checked; model narrative, equipment, feats, talents and runtime not certified.',
 'items':review}
VP.write_text(json.dumps(visual,indent=2,ensure_ascii=False)+'\n')
LP.write_text(json.dumps(l,indent=2,ensure_ascii=False)+'\n')
EP.write_text(json.dumps(e,indent=2,ensure_ascii=False)+'\n')
print('KOTOR PDF selected field reviews',len(review),'comparisons',visual['directFieldComparisons'],'mechanically certified 0')
