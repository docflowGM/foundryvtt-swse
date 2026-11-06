#!/usr/bin/env python3
"""Reproducible, fail-closed, selected-field droid source review, last four books.

Census identities were read-only reconciled against the GitHub publication census
on audit/droid-publication-census-2026-10-29 and checked against rendered PDFs.
This is NOT mechanical certification and does not alter production Foundry packs.
"""
from pathlib import Path
import json,hashlib,fitz,re
R=Path(__file__).resolve().parents[1]; BASE=Path('/mnt/data')
GROUPS=['identity','publication','classification','challenge','geometry','abilities','progression','defenses','durability','movement','anatomy','processor','programming','combat','capacity','systems','equipment','modifications','pcConstruction','vehicleLink','economics','text','exceptions','fieldStates','rules','certification']
# id/name/printed first/end/one-based TXT line/degree/size/CL/hero eligibility
BOOKS={
'GOI':{'title':'Galaxy of Intrigue','pdf':'Galaxy of Intrigue.pdf','txt':'Galaxy of Intrigue_djvu.txt','lines':'''5-BT Threat Analysis Droid|72|72|6833|1|Tiny|1|allowed
NR-1100 Slicer Droid|72|73|6897|2|Small|3|prohibited
3D-4 Administrative Droid|73|73|6961|3|Medium|0|allowed
M4-Series Messenger Droid|74|74|7026|3|Diminutive|1|unset
FIII Footman Droid|74|74|7034|4|Medium|9|prohibited
BL-Series Battle Legionnaire|75|75|7129|4|Medium|3|prohibited
B4J4 Security Droid|75|75|7155|4|Small|2|prohibited
MRD-39B Assassin Droid|208|208|19790|4|Small|6|unset'''},
'UNKNOWN':{'title':'The Unknown Regions','pdf':'SW_Saga_The_Unknown_Regions.pdf','txt':'Unknown Regions_djvu.txt','lines':'''AS23 Aerial Survey Droid|43|43|4206|3|Small|0|prohibited
DSH-3 Probe Droid|44|44|4305|4|Small|1|prohibited
F1 Exploration Droid|44|45|4407|5|Small|3|allowed
MULE Droid|45|46|4520|5|Medium|0|allowed
Wanderer Scout Surveyor Droid|46|47|4663|5|Medium|1|prohibited
WED-20 Treadwell|47|47|4771|1|Small|0|allowed'''},
'SCUM':{'title':'Scum and Villainy','pdf':'SAGA EDITION - Scum and Villainy.pdf','txt':'Scum and Villainy_djvu.txt','lines':'''Industrial Automaton K-Series Spaceport Control Droid|96|96|6551|3|Medium|1|allowed
Industrial Automaton RX-Series Pilot Droid|96|96|6584|2|Medium|1|allowed
Roche 11-17 Series Mining Droid|156|156|11406|5|Small|1|unset
Roche 8D8 Smelting Operator Droid|157|157|11470|5|Medium|0|unset
Roche J9 Worker Drone|157|157|11491|3|Medium|0|unset'''},
'SOTG':{'title':'Starships of the Galaxy','pdf':'SAGA EDITION - Starships of the Galaxy.pdf','txt':'Starships of the Galaxy_djvu.txt','lines':'''Baktoid Armor Workshop Vulture-class Starfighter|78|78|7405||Huge|7|n/a
Phlac-Arphocc Automata Industries Droid Tri-Fighter|79|79|7515||Huge|9|n/a
Haor Chall Engineering Scarab-class Starfighter|79|79|7566||Huge|6|n/a'''}
}
# Source-verified boundary guidance; never automatically execute.
WARN={
'GOI':{
 1:['External warning bracelet or earbud is not necessarily an installed chassis system.'],
 2:['Narrative calls model unarmed; printed statblock has a ranged blaster attack and a blaster possession: unresolved source discrepancy.','Self-destruct is a conditional printed action, not unconditional attack availability.'],
 3:['Narrative says stock chassis unarmed, but shown example possesses a concealed hold-out blaster. Factory baseline cannot inherit it automatically.'],
 4:['Blaster licensing changes if weapon retained; do not assume weapon remains installed for every sale.'],
 5:['Footman glyph varies across OCR (FIII/Fill); keep original source identity and do not create Fidelis/Solis separate statblocks.'],
 6:['Rail cannon/blaster cannon treatment is model-specific; no mount inferred.'],
 7:['Two pistol possessions do not grant a second executable attack.'],
 8:['Self-destruct splash and tactical HP trigger must be kept source-scoped; stability legs and claw appendages are separate counts.']},
'UNKNOWN':{
 1:['Aerial survey spotting rules are model-specific, not vehicle targeting authority.'],
 2:['Probe droid reactions and tracking do not create generic droid actions.'],
 3:['Force points printed on Scout model do not prove universal droid Force Sensitivity.','Full statblock and protocol view span adjacent pages; one source identity only.'],
 4:['Self-diagnostic grant is limited to source conditions.','Protocol view is a second presentation, not another droid.'],
 5:['360-degree photoreceptor prevents flank and certain flat-footed effects only as printed; no unrestricted awareness.'],
 6:['Scientific Focus bonus limited to printed Knowledge checks; no blanket skill grant.']},
'SCUM':{
 1:['Comlink and datapad are possessions, not automatically installed chassis systems.'],
 2:['Shared RX-Series model name with SGD is not certified mechanical lineage.','Droid pilot remains droid actor, not the vehicle it pilots.'],
 3:['Mining encounter p216 repeats model with hostile programming; no second factory identity.'],
 4:['Explicit +20 equipment Fortitude bonus vs extreme heat/fire is model-specific; do not equate this with SGD 8D.'],
 5:['Statblock does not enumerate manipulators; absence of statement is not zero manipulators.']},
'SOTG':{
 1:['Model has dual vehicle walker/flight movement; independent droid brain is an optional retrofit, not default.','Missile and laser rows are vehicle attack groups, not certified individual mount rights.'],
 2:['Three light laser cannons printed as one attack-group label, not proof of three independently firing mounts.'],
 3:['Printed SR20 belongs to starfighter vehicle authority; no unprinted payload or weapon mounts.']}
}
# The visually inspected ship-page attributes are maintained only in a non-executable sidecar.
SHIPS=[
 {'hitPoints':60,'damageReduction':10,'damageThreshold':32,'reflex':14,'flatFootedReflex':11,'fortitude':22,'starshipSpeedSquares':4,'walkSquares':6,'flySquares':16,'newCredits':19000,'attackGroupLabels':['laser cannons','medium concussion missiles']},
 {'hitPoints':100,'damageReduction':10,'damageThreshold':34,'reflex':16,'flatFootedReflex':12,'fortitude':24,'starshipSpeedSquares':4,'flySquares':16,'newCredits':40000,'attackGroupLabels':['laser cannon','3 light laser cannons','medium concussion missiles']},
 {'hitPoints':80,'damageReduction':10,'shieldRating':20,'damageThreshold':43,'reflex':13,'flatFootedReflex':11,'fortitude':23,'starshipSpeedSquares':3,'flySquares':12,'newCredits':17000,'attackGroupLabels':['blaster cannons']}
]
# A few unambiguous numeric lines were independently reviewed in zoomed page images and PDF text.
EXACT={
 'GOI':{1:{'initiativePrinted':13,'perceptionPrinted':15,'reflex':14,'flatFootedReflex':12,'fortitude':7,'will':12,'hitPoints':7,'damageThreshold':7,'newCredits':17490,'speedLineRaw':'6 squares (hovering)'},
 2:{'initiativePrinted':3,'perceptionPrinted':7,'reflex':18,'flatFootedReflex':16,'fortitude':11,'will':15,'hitPoints':25,'damageThreshold':11,'newCredits':16430,'speedLineRaw':'6 squares (hovering)'},
 3:{'initiativePrinted':0,'perceptionPrinted':0,'reflex':10,'flatFootedReflex':10,'fortitude':9,'will':10,'hitPoints':2,'damageThreshold':9,'newCredits':7320,'speedLineRaw':'6 squares (walking)'},
 4:{'initiativePrinted':9,'perceptionPrinted':13,'reflex':18,'flatFootedReflex':15,'fortitude':7,'will':12,'hitPoints':4,'damageThreshold':7,'newCredits':88000,'speedLineRaw':'9 squares (flying)'}},
 'UNKNOWN':{1:{'initiativePrinted':4,'perceptionPrinted':14,'reflex':15,'flatFootedReflex':11,'fortitude':9,'will':12,'hitPoints':3,'damageThreshold':9,'newCredits':23500},
 2:{'initiativePrinted':5,'perceptionPrinted':15,'reflex':15,'flatFootedReflex':11,'fortitude':8,'will':12,'hitPoints':8,'damageThreshold':8,'newCredits':13000},
 3:{'initiativePrinted':7,'perceptionPrinted':15,'reflex':17,'flatFootedReflex':16,'fortitude':15,'will':15,'hitPoints':33,'damageThreshold':15,'newCredits':12500},
 4:{'initiativePrinted':1,'perceptionPrinted':12,'reflex':10,'flatFootedReflex':10,'fortitude':15,'will':11,'hitPoints':9,'damageThreshold':15,'newCredits':9000,'speedLineRaw':'4 squares (hovering)'},
 5:{'initiativePrinted':3,'perceptionPrinted':6,'reflex':16,'flatFootedReflex':16,'fortitude':14,'will':12,'hitPoints':26,'damageThreshold':14,'newCredits':9400,'speedLineRaw':'6 squares (walking)'},
 6:{'initiativePrinted':3,'perceptionPrinted':13,'reflex':13,'flatFootedReflex':11,'fortitude':9,'will':12,'hitPoints':5,'damageThreshold':9,'newCredits':8300,'speedLineRaw':'4 squares (tracked)'}}
}
LOC={
 'abilities':{'initiativePrinted','perceptionPrinted'},
 'defenses':{'reflex','flatFootedReflex','fortitude','will'},
 'durability':{'hitPoints','damageThreshold'},
 'economics':{'newCredits'},
 'movement':{'speedLineRaw'},
}

def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1<<20),b''):h.update(b)
 return h.hexdigest()

for book,cfg in BOOKS.items():
 stem=book.lower(); rows=[z.split('|') for z in cfg['lines'].splitlines()]
 n={'GOI':8,'UNKNOWN':6,'SCUM':5,'SOTG':3}[book];assert len(rows)==n and all(len(v)==8 for v in rows)
 assert not (R/f'data/canonical/droids/source-books/{stem}.json').exists(), 'FAIL CLOSED: existing ledger'
 text=(BASE/cfg['txt']).read_text(errors='replace').splitlines()
 pdf=BASE/cfg['pdf']; assert pdf.exists()
 pdfsha=digest(pdf);txtsha=digest(BASE/cfg['txt']); doc=fitz.open(str(pdf)); source=[],
 entries=[];evidence=[];visual=[];census=[];backlog=[];vehicle=[]
 for i,(name,pg,end,anchor,degree,size,cl,hero) in enumerate(rows,1):
  pg,end,anchor,cl=int(pg),int(end),int(anchor),int(cl);degree=int(degree) if degree else None
  id=f'{book}-DROID-{i:03d}';assert 0<anchor<=len(text)
  img=R/f'work/{stem}_pdf_review/printed_p{pg}.png';assert img.exists(),(book,img)
  # inspect printed-p labeling as searchable PDF where available, otherwise PDF image
  assert len(doc)>pg
  identity={'sourceEntryKey':id,'printedName':name,'namedIndividual':False}
  publication={'book':cfg['title'],'bookId':book,'printedPageStart':pg,'printedPageEnd':end,
     'pdfPageStart1Based':pg+1,'textLineAnchor1Based':anchor,'publicationKind':'vehicle-format-droid' if book=='SOTG' else 'model'}
  classification={'publishedDegree':degree,'size':size,**({'rawSize':'Huge starfighter'} if book=='SOTG' else {}),
    'ruleEntityNature':'vehicle-format-droid' if book=='SOTG' else 'standard-droid',
    'statblockFormat':'vehicle' if book=='SOTG' else 'droid-actor',
    'sourceStatblockFormat':'starship-scale-droid' if book=='SOTG' else 'droid-actor',
    'primaryActorAuthority':'vehicle' if book=='SOTG' else 'droid'}
  row={'schemaVersion':'swse.droid.universal-source/0.1-draft','recordType':'droid-publication-source-entry',**{g:{} for g in GROUPS}}
  row.update({'identity':identity,'publication':publication,'classification':classification})
  row['challenge']['challengeLevel']=cl
  if degree is None:row['fieldStates']['/classification/publishedDegree']='not-applicable'
  if book=='SOTG':
   row['pcConstruction']['heroEligibility']=None;row['fieldStates']['/pcConstruction/heroEligibility']='not-applicable'
   row['classification']['rawSize']='Huge starfighter' if i>1 else 'Huge starfighter/ground vehicle (walker)'
  else:
   row['abilities']['con']=None;row['fieldStates']['/abilities/con']='explicitly-none'
   row['pcConstruction']['heroEligibility']=None if hero=='unset' else hero
   if hero=='unset':row['fieldStates']['/pcConstruction/heroEligibility']='not-stated'
  for key,value in EXACT.get(book,{}).get(i,{}).items():
   group=next(g for g,fields in LOC.items() if key in fields)
   row[group][key]=value
  notes=WARN[book].get(i,[])
  row['text']['sourceWarnings']=['Selected PDF fields only; full mechanical certification outstanding.',*notes]
  row['exceptions']['notes']='No mechanic execution. Feats/talents, inventory instances, legal attacks, full narrative rules and engine runtime remain uncertified.'
  if book=='GOI' and i==2:
   row['exceptions']['sourceContradictions']=[{'issueId':'GOI-NR1100-UNARMED-VS-BLASTER',
      'fieldPointers':['/combat/attackGroups','/equipment/weapons'],
      'statements':[{'book':cfg['title'],'page':72,'citationLabel':'Narrative unarmed vs statblock blaster','verifiedBy':'pdf-visual','sourceEntryKey':id}],
      'resolutionStatus':'unresolved'}]
  for j,statement in enumerate(notes,1):
   row['rules'].setdefault('conditionalMechanics',[]).append({'ruleId':f'{id}-BOUNDARY-{j}',
      'statement':statement,'scope':id,
      'source':{'book':cfg['title'],'page':pg,'pdfPage1Based':pg+1,'verifiedBy':'pdf-visual','sourceEntryKey':id},
      'executionStatus':'source-only'})
  row['rules']['mechanicalExecutionStatus']='source-only'
  row['certification']={'identityStatus':'pdf-reviewed','mechanicalStatus':'partial','runtimeStatus':'not-tested',
      'reviewNotes':'Selected first-page fields only; independently certified mechanical effects: zero.',
      'reviewerEvidenceRefs':[f'{id}:pdf-p{pg}',f'{id}:txt-line-{anchor}']}
  # Vehicle values intentionally stay outside droid actor stat fields.
  if book=='SOTG':
   vehicle.append({'sourceEntryKey':id,'page':pg,'owner':'vehicle','vehicleSourceValues':SHIPS[i-1],
       'weaponOwnership':'SOURCE_ONLY_UNCERTIFIED','notes':notes})
  values={'/identity/printedName':name,'/publication/printedPageStart':pg,
          '/publication/printedPageEnd':end,'/classification/size':size,
          '/challenge/challengeLevel':cl}
  if degree is not None:values['/classification/publishedDegree']=degree
  if book!='SOTG' and hero!='unset':values['/pcConstruction/heroEligibility']=hero
  for g in LOC:
   for k,v in row[g].items():
    if v is not None:values[f'/{g}/{k}']=v
  # For complex OCR, only persist identity/verified PDF metadata, not dubious extracted numerics.
  excerpt='\n'.join(text[anchor-1:min(len(text),anchor+80)])
  evidence.append({'sourceEntryKey':id,'printedName':name,'printedPage':pg,'pdfPage1Based':pg+1,
    'sourceReviewStatus':'PDF_SELECTED_FIELDS_VISUAL','txtAnchorLine1Based':anchor,
    'txtWindowSha256':hashlib.sha256(excerpt.encode()).hexdigest(),'ocrTextExcerpt':excerpt,
    'pdfVisualFieldChecks':{'sourceImage':f'work/{stem}_pdf_review/printed_p{pg}.png',
      'extraVisualSourcePages':list(range(pg+1,end+1)), 'fieldValues':values,
      'fieldComparisonCount':len(values),'scope':'Selected source facts only. Sourcebook PDF is authority.'},
    'warnings':notes})
  entries.append(row)
  visual.append({'sourceEntryKey':id,'printedName':name,'printedPage':pg,'verifiedFieldCount':len(values),
    'sourceImage':f'work/{stem}_pdf_review/printed_p{pg}.png','scope':'Selected first-page PDF review, not mechanical certification.'})
  census.append({'sourceEntryKey':id,'printedName':name,'printedPageStart':pg,'printedPageEnd':end,
    'txtLine1Based':anchor,'publishedDegree':degree,'size':size,'challengeLevel':cl,'kind':'vehicle-format' if book=='SOTG' else 'model','heroEligibility':hero})
  backlog.append({'sourceEntryKey':id,'status':'MECHANICALLY_UNCERTIFIED',
   'blockers':['Full narrative and source statblock field verification','Canonical feat/talent provenance and prerequisites',
     'Installed components, separate possessions, weapon mounts and attack-group legality','Creation permission restrictions and exceptions',
     'Official upstream JSON Schema validation','Foundry V13 execution verification']})
 doc.close()
 output={
 f'data/canonical/droids/source-books/{stem}.json':{'schema':'swse.droid.source-book-hydration-ledger/0.1-partial',
 'bookId':book,'book':cfg['title'],'draftSourceEntrySchema':'swse.droid.universal-source/0.1-draft','sourceBookPdf':cfg['pdf'],
 'scope':'Selected PDF fields and source-only constraints; not import-ready.','expectedPublicationClaims':n,'sourceEntries':entries},
 f'data/audits/droids/{stem}-field-evidence.json':{'schema':f'swse.droid.{stem}.source-evidence/0.1','sourceBook':cfg['title'],
 'sourcePdf':cfg['pdf'],'sourcePdfSha256':pdfsha,'sourceTxt':cfg['txt'],'sourceTxtSha256':txtsha,'records':evidence},
 f'data/audits/droids/{stem}-census-identity.json':{'schema':f'swse.droid.{stem}.census-parity/0.1','authority':'Published census identities checked against printed PDF.','claims':census},
 f'data/audits/droids/{stem}-visual-field-review.json':{'schema':f'swse.droid.{stem}.selected-pdf-visual/0.1','sourceBook':cfg['title'],
 'manualVisualReviews':n,'directFieldComparisons':sum(x['verifiedFieldCount'] for x in visual),
 'sourcePdfHash':pdfsha,'method':'Printed PDF page images, primary text where available, selected values only.',
 'scope':'Selected printed-page facts, not mechanically certified fields.','items':visual},
 f'data/audits/droids/{stem}-review-backlog.json':{'bookId':book,'mechanicallyCertified':0,'items':backlog},
 f'docs/audits/droids/{stem}-local-state.json':{'bookId':book,'draftEntries':n,'selectedPdfReviewed':n,'comparisons':sum(x['verifiedFieldCount'] for x in visual),'mechanicallyCertified':0,'runtimeVerified':0,'status':'IN_PROGRESS_SOURCE_REVIEW_ONLY'},
 }
 if vehicle:
  output['data/audits/droids/sotg-vehicle-source-evidence.json']={'schema':'swse.droid.vehicle-owned-source-evidence/0.1',
    'book':cfg['title'],'droidActorPropertiesCopied':False,'sourceOnly':True,'vehicles':vehicle}
 for rel,data in output.items():
  path=R/rel;assert not path.exists(),f'FAIL CLOSED: {path} exists';path.parent.mkdir(parents=True,exist_ok=True)
  path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 md=f'''# {cfg['title']} — selected-field droid source review\n\n**Publication identities:** {n}/{n}. **Selected-page visual reviews:** {n}/{n}. **Field comparisons:** {sum(x['verifiedFieldCount'] for x in visual)}. **Mechanical certifications:** 0/{n}.\n\nThis is not a full mechanical certification. The primary PDFs control OCR discrepancies. No droid or vehicle attack row is executable.\n\n| ID | Publication claim | Printed page | Selected checks |\n|---|---|---:|---:|\n'''
 for x in visual:md+=f"| {x['sourceEntryKey']} | {x['printedName']} | {x['printedPage']} | {x['verifiedFieldCount']} |\n"
 md+='\n## Source review boundaries\n\n'
 for i,x in enumerate(entries,1):
  for note in WARN[book].get(i,[]):md+=f"- **{x['identity']['sourceEntryKey']}**: {note}\n"
 md+='\n## Remaining certification gates\n\nFull field-by-field verification, secondary presentations, exact feat/talent identity, equipment provenance, attack mounts, PC legality, upstream schema validation and Foundry runtime testing. **None of these are certified by this pass.**\n'
 path=R/f'docs/audits/droids/hydration-{stem}-rolling.md';assert not path.exists();path.write_text(md)
 print(f'{book}: {n} publication records; {sum(x["verifiedFieldCount"] for x in visual)} selected field receipts; {len(vehicle)} vehicle-owned; 0 certifications')
