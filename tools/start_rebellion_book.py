#!/usr/bin/env python3
"""One-time read-only PDF-backed Rebellion source-review seed. LOCAL ONLY.

Values in FIELDS are selected visual transcriptions of sourcebook printed pages,
not a mechanical certification or a permission to execute Foundry effects.
NEVER run over an existing Rebellion ledger.
"""
from pathlib import Path
import hashlib, json
R=Path(__file__).resolve().parents[1]
TXT=Path('/mnt/data/Rebellion Era Campaign Guide_djvu.txt')
PDF=Path('/mnt/data/Star Wars Saga Edition - Rebellion Era Campaign Guide.pdf')
BOOK='Rebellion Era Campaign Guide'
# ID suffix|name|printed start|printed end|TXT anchor|degree|size|CL|eligibility|kind|price
RAW='''1|FX-7 Medical Droid|53|53|4659|1|Medium|0|prohibited|model|3800
2|R4-Series Agromech Droid|53|54|4736|2|Small|0|allowed|model|2500
3|WED Treadwell Repair Droid|54|54|4803|2|Small|0|allowed|model|3000
4|LOM-Series Protocol Droid|55|55|4916|3|Medium|0|allowed|model|2000
5|BT-16 Perimeter Security Droid|55|56|4906|4|Large|5|prohibited|model|4100
6|RHTC-560 Hunter Trainer|57|57|5016|4|Medium|6|prohibited|model|5000
7|HT Drone|57|57|5066|4|Small|1|prohibited|model|2000
8|LV-38 Spotter/Probe Droid|110|110|10368|4|Small|3|unset|model|
9|Imperial Espionage Droid|127|127|12090|3|Medium|1|allowed|model|5000
10|Dark Trooper Phase I|128|128|12165|4|Large|2|prohibited|model|10000
11|Dark Trooper Phase II|128|129|12219|4|Large|5|prohibited|model|50000
12|Dark Trooper Phase III|129|129|12322|4|Large|8|prohibited|model|85000
13|Imperial City Maintenance Droid|130|130|12469|5|Medium|0|allowed|model|500
14|4-LOM|143|143|13711|3|Medium|12|unset|named|
15|IG-88|144|144|13829|4|Medium|14|unset|named|'''
ROWS=[s.split('|') for s in RAW.splitlines()]
assert len(ROWS)==15 and all(len(r)==11 for r in ROWS)
# Selected page-image transcriptions in order: Init, Per, Ref, FF, Fort, Will, HP, Threshold,
# STR,DEX,INT,WIS,CHA, (CON is printed absent for all entries).
FIELDS='''1|5|10|10|9|12|5|9|9|10|15|14|9
4|3|14|11|8|10|7|8|7|16|15|10|7
4|6|14|11|8|10|5|8|7|16|13|10|7
0|0|10|10|9|10|2|9|8|11|13|11|15
6|18|17|15|20|16|39|25|20|14|9|14|10
10|11|20|18|19|17|47|19|13|14|14|13|10
8|9|17|14|12|13|24|11|10|16|12|15|11
11|16|21|17|13|14|16|13|8|18|14|14|8
0|8|9|9|9|12|6|9|8|9|13|14|15
4|10|18|17|12|10|18|12|14|12|10|10|6
5|11|21|20|17|12|39|22|16|12|10|10|6
5|12|22|22|21|15|56|26|18|10|10|10|6
-1|-1|9|9|9|9|3|14|8|8|10|8|6
7|12|27|26|24|25|54|24|10|12|16|12|15
15|16|31|28|29|28|91|29|17|17|16|14|12'''
NUMS=[list(map(int,s.split('|'))) for s in FIELDS.splitlines()]
assert len(NUMS)==15 and all(len(row)==13 for row in NUMS)
# Printed class and speed labels, transcribed from the rendered page (not engine grants).
CLASS=['nonheroic 2','nonheroic 2','nonheroic 2','nonheroic 1','nonheroic 6/scout 3','soldier 6','scout 1','nonheroic 1/scout 3','nonheroic 3','nonheroic 6','nonheroic 6/soldier 2','nonheroic 6/soldier 5','nonheroic 1','nonheroic 1/noble 1/scoundrel 5/scout 3/bounty hunter 3','scout 4/soldier 5/scoundrel 1/bounty hunter 4']
SPEED=['0 (stationary)','6 squares (wheeled)','6 squares (tracked)','6 squares (walking)','6 squares','6 squares (walking)','6 squares (hovering), 4 squares (walking)','6 squares (hovering)','6 squares (walking)','6 squares (walking)','6 squares (walking), fly 6 squares (jet pack)','6 squares (walking)','4 squares (tracked)','6 squares (walking)','6 squares (walking)']
# Source-only particular mechanics; each includes a printed-page citation.
RULES={
 1:[('STATIONARY','Stationary chassis: printed Speed 0; no implied locomotion system.',53),('REPROGRAMMING','Source mentions illicit interrogation reprogramming, but supplies no universal free reprogramming action.',52)],
 2:[('ION-PROBE','Printed electroshock probe uses ion damage; any attack requires certified installed weapon/attack ownership.',53)],
 3:[('SWAPPABLE-TOOLS','Specialty arms can be swapped, but the prose establishes no unlimited free equipment selection.',54)],
 4:[('FACTORY-PROTOCOL','Factory LOM-series protocol chassis is not the same source identity as the named bounty hunter 4-LOM.',55)],
 5:[('BOMARR-BRAIN','B\'omarr conversion replaces factory electronics with a living brain and source-specific changes; not a factory trait or separate stock model.',56),('VERTICAL-CLIMB','Climbing narrative and printed Climb skill require individual rules/movement reconciliation.',55)],
 6:[('HT-CONTROL','Hunter Trainer directs a separate group of 6–12 HT Drone actors; drones are not free intrinsic attacks or included in 5,000-credit price.',56),('DRONE-PRICE','Printed purchase price excludes its subordinate HT Drone units.',57)],
 7:[('LAST-COMMAND','A drone losing contact continues the last command for 20 hours before returning; not unrestricted autonomous AI.',56),('DUAL-MOVEMENT','Hovering and walking speeds are separate source movement modes.',57)],
 8:[('SPOTTER-ROLE','Artillery spotter operates with a distinct vehicle and has no automatic weapon/firing permission.',110)],
 9:[('ESPIONAGE','Information-transmission function is model-specific and grants no generic remote control or eavesdropping action.',127)],
 10:[('BLAST-SHIELD','Wrist shield gives +2 armor only when this droid is not attacking; never permanent base defense.',128)],
 11:[('WEARABLE-ARMOR','Phase II is both a droid design and a separately wearable armor suit; droid chassis is not an equipable armor instance.',128),('ASSAULT-CANNON','Integrated combined repeating blaster/missile launcher has multiple printed attack options requiring mount/ammunition provenance.',128)],
 12:[('WEARABLE-ARMOR','Phase III wearable armor is a distinct equipment use case from the autonomous droid statblock.',129),('RECONFIGURABLE-MISSILES','Printed shoulder missile rack may be replaced with an alternate launcher; do not activate both simultaneously.',129),('SHIELD','Printed SR20 is source evidence, not a second stacked shield effect.',129)],
 13:[('MODEL-ALIAS','Earlier designation RC-M and later designation IC-M are model history/aliases, not extra publication identities.',130)],
 14:[('NAMED-LOM','4-LOM is a unique printed NPC linked narratively to LOM-series; factory and individual stats cannot be merged.',143)],
 15:[('CONSCIOUSNESS','IG-88 A/B/C/D and narrative copied consciousness are not extra full published statblocks.',143),('NAMED-CHARACTER','This one printed IG-88 NPC statblock is not a generic starting model.',144)]
}
extra_pages={1:[52],5:[56],6:[56],7:[56],11:[129],14:[54],15:[143]}
need=['identity','publication','classification','challenge','geometry','abilities','progression','defenses','durability','movement','anatomy','processor','programming','combat','capacity','systems','equipment','modifications','pcConstruction','vehicleLink','economics','text','exceptions','fieldStates','rules','certification']
source=TXT.read_text(errors='replace').splitlines();sha=hashlib.sha256(TXT.read_bytes()).hexdigest();pdfhash=hashlib.sha256(PDF.read_bytes()).hexdigest()
ledger=[];ev=[];census=[];visual=[]
for idx,(parts,nums) in enumerate(zip(ROWS,NUMS),1):
 n,name,pg,end,anchor,degree,size,cl,hero,kind,price=parts
 assert int(n)==idx
 p=int(pg);last=int(end);at=int(anchor)
 key=f'REBELLION-DROID-{idx:03d}'
 # All page images used as evidence are mandatory, and never redistributed in the ZIP.
 image=f'work/rebellion_pdf_review/printed_p{p}.png'
 assert (R/image).exists(),image
 for ep in extra_pages.get(idx,[]): assert (R/f'work/rebellion_pdf_review/printed_p{ep}.png').exists()
 r={'schemaVersion':'swse.droid.universal-source/0.1-draft','recordType':'droid-publication-source-entry',**{g:{} for g in need},
    'identity':{'sourceEntryKey':key,'printedName':name,'namedIndividual':kind=='named'},
    'publication':{'book':BOOK,'bookId':'REBELLION','printedPageStart':p,'printedPageEnd':last,'pdfPageStart1Based':p+1,'textLineAnchor1Based':at,'publicationKind':'named-character' if kind=='named' else 'model'},
    'certification':{'identityStatus':'pdf-reviewed','mechanicalStatus':'partial','runtimeStatus':'not-tested',
                     'reviewNotes':'Selected first-page PDF fields only; full narrative, feat/talent, installed equipment/mount, PC construction and live Foundry certification outstanding.',
                     'reviewerEvidenceRefs':[f'{key}:pdf-printed-p{p}',f'{key}:txt-line-{at}']}}
 r['classification'].update({'publishedDegree':int(degree),'size':size,'statblockFormat':'droid-actor','sourceStatblockFormat':'droid-actor','primaryActorAuthority':'droid','ruleEntityNature':'standard-droid'})
 r['challenge']['challengeLevel']=int(cl)
 r['progression']['classLineRaw']=CLASS[idx-1]
 r['movement']['speedLineRaw']=SPEED[idx-1]
 init,per,ref,ff,fort,will,hp,threshold,str_,dex,int_,wis,cha=nums
 r['abilities'].update({'initiativePrinted':init,'perceptionPrinted':per,'str':str_,'dex':dex,'con':None,'int':int_,'wis':wis,'cha':cha})
 r['fieldStates']['/abilities/con']='explicitly-none'
 r['defenses'].update({'reflex':ref,'flatFootedReflex':ff,'fortitude':fort,'will':will})
 if idx==12:r['defenses']['shieldRating']=20
 r['durability'].update({'hitPoints':hp,'damageThreshold':threshold})
 if price:r['economics']['newCredits']=int(price)
 r['pcConstruction']['heroEligibility']=None if hero=='unset' else hero
 if hero=='unset':r['fieldStates']['/pcConstruction/heroEligibility']='not-applicable' if kind=='named' else 'not-stated'
 r['rules']['mechanicalExecutionStatus']='source-only'
 r['text']['sourceWarnings']=[
    'All recorded values are publication-source evidence only, not executable mechanical or player-creation authorization.',
    'Printed attack options, feat names and items are intentionally NOT converted into runtime grants without provenance and mount certification.'
 ]
 if idx in (4,5):r['text']['sourceWarnings'].append('OCR columns interleave LOM-series and BT-16 on printed p55; visual field receipt controls.')
 if idx in (11,12):r['text']['sourceWarnings'].append('Printed Dark Trooper wearable armor is not the same object as the autonomous droid actor.')
 if idx==14:r['text']['sourceWarnings'].append('Related stock LOM factory model: REBELLION-DROID-004; relationship is NOT automatic inherited mechanics.')
 if idx==15:r['text']['sourceWarnings'].append('Several IG-88 personality copies discussed, one printed IG-88 statblock.')
 for slug,statement,rulepage in RULES.get(idx,[]):
  r['rules'].setdefault('conditionalMechanics',[]).append({'ruleId':key+'-'+slug,'statement':statement,'scope':key,
   'source':{'book':BOOK,'page':rulepage,'pdfPage1Based':rulepage+1,'verifiedBy':'pdf-visual','sourceEntryKey':key},'executionStatus':'source-only'})
 if idx==10:
  r['defenses']['conditionalDefenseRules']=[r['rules']['conditionalMechanics'][0]]
 if idx==12:r['defenses']['conditionalDefenseRules']=[r['rules']['conditionalMechanics'][2]]
 # Do not invent missing inventory, weapon mounts, progression, or PC routes.
 r['exceptions']['notes']='Complete source-field and provenance certification outstanding. Printed PDF is final authority.'
 endline=min(len(source),at+125)
 chunk='\n'.join(source[at-1:endline]);ehash=hashlib.sha256(chunk.encode()).hexdigest()
 verified={
  '/identity/printedName':name,'/publication/printedPageStart':p,'/classification/publishedDegree':int(degree),
  '/classification/size':size,'/challenge/challengeLevel':int(cl),
  '/progression/classLineRaw':CLASS[idx-1],'/movement/speedLineRaw':SPEED[idx-1],
  **{'/abilities/'+k:v for k,v in dict(initiativePrinted=init,perceptionPrinted=per,str=str_,dex=dex,int=int_,wis=wis,cha=cha).items()},
  **{'/defenses/'+k:v for k,v in dict(reflex=ref,flatFootedReflex=ff,fortitude=fort,will=will).items()},
  '/durability/hitPoints':hp,'/durability/damageThreshold':threshold}
 if price:verified['/economics/newCredits']=int(price)
 if idx==12:verified['/defenses/shieldRating']=20
 if hero!='unset':verified['/pcConstruction/heroEligibility']=hero
 evidence={'sourceEntryKey':key,'printedName':name,'printedPage':p,'printedPageEnd':last,'pdfPage1Based':p+1,
    'sourceReviewStatus':'PDF_SELECTED_FIELDS_VISUAL','pdfVisualFieldChecks':{
       'sourceImage':image,'fieldValues':verified,'fieldComparisonCount':len(verified),
       'extraVisualSourcePages':extra_pages.get(idx,[]),'scope':'Source fields selected for visual transcription, not complete mechanical certification.'},
    'txtAnchorLine1Based':at,'txtWindowEnd1Based':endline,'txtWindowSha256':ehash,'ocrTextExcerpt':chunk,
    'warnings':['OCR source is an index only; may mix columns, omit glyphs and cross adjacent headings.',
      'Do not infer an enabled feat, talent, weapon mount, possession, movement action or PC creation route from printed statblock.']}
 ledger.append(r);ev.append(evidence)
 census.append({'sourceEntryKey':key,'printedName':name,'printedPageStart':p,'printedPageEnd':last,'pdfPage1Based':p+1,'txtLine1Based':at,
    'publishedDegree':int(degree),'size':size,'challengeLevel':int(cl),'censusHeroEligibility':hero,'nature':'named' if kind=='named' else 'stock-model'})
 visual.append({'sourceEntryKey':key,'printedName':name,'printedPage':p,'verifiedFieldCount':len(verified),'sourceImage':image,
   'heroEligibility':r['pcConstruction']['heroEligibility'],'scope':'selected-first-page-fields'})
assert len(ledger)==len(ev)==len(census)==len(visual)==15
outputs={
 R/'data/canonical/droids/source-books/rebellion.json':{
 'schema':'swse.droid.source-book-hydration-ledger/0.1-partial','bookId':'REBELLION','book':BOOK,'draftSourceEntrySchema':'swse.droid.universal-source/0.1-draft',
 'sourceBookPdf':PDF.name,'expectedPublicationClaims':15,'scope':'15 distinct publication statblocks; selected source-only visual facts; no executable mechanics.','sourceEntries':ledger},
 R/'data/audits/droids/rebellion-field-evidence.json':{'schema':'swse.droid.rebellion.source-evidence/0.1','sourceBook':BOOK,'sourcePdf':PDF.name,
  'sourcePdfSha256':pdfhash,'sourceTxt':TXT.name,'sourceTxtSha256':sha,'records':ev},
 R/'data/audits/droids/rebellion-census-identity.json':{'schema':'swse.droid.rebellion.census-parity/0.1','authority':'Read-only upstream published census; printed PDF governs.',
 'source':'data/audits/droids/droid-publication-census.json','claims':census},
 R/'data/audits/droids/rebellion-visual-field-review.json':{'schema':'swse.droid.rebellion.selected-pdf-visual/0.1','sourceBook':BOOK,'manualVisualReviews':15,
 'directFieldComparisons':sum(i['verifiedFieldCount'] for i in visual),'sourcePdfHash':pdfhash,
 'method':'Rendered and visually inspected printed pp52-57,110,127-130,143-144; fields transcribed from pages. Source rules are non-executable.',
 'scope':'Selected fields only; no complete mechanical, PC creation or runtime certification.','items':visual}}
for path in outputs:
 if path.exists():raise SystemExit('REFUSE overwrite existing reviewed file '+str(path))
for path,content in outputs.items():path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(content,indent=2,ensure_ascii=False)+'\n')
print('Rebellion seeded',len(ledger),'PDF-reviewed source-only entries, comparisons',sum(i['verifiedFieldCount'] for i in visual))
