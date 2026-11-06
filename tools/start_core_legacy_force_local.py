#!/usr/bin/env python3
"""Local-only source-only records for Core, Legacy and Force Unleashed.

Sourcebook PDFs are rendered independently and individually inspected. Text OCR is
only an index and is not trusted when its columns merge. No GitHub or runtime writes.
Refuses to overwrite existing book ledgers.
"""
from pathlib import Path
import re,json,hashlib
R=Path(__file__).resolve().parents[1]
BASE=Path('/mnt/data')
CFG={
'CORE':{'title':'Saga Edition Core Rulebook','pdf':'Star Wars Saga Edition.pdf','txt':'Core Rulebook_djvu.txt','records':'''2-1B Medical Droid|197|197|18637|1|Medium|0|model|allowed
R2 Series Astromech Droid|198|198|18706|2|Small|0|model|allowed
3PO Series Protocol Droid|198|198|18777|3|Medium|0|model|allowed
B1 Series Battle Droid|199|199|18837|4|Medium|1|model|prohibited
B2 Series Super Battle Droid|199|199|18884|4|Medium|2|model|allowed
Droideka Series Destroyer Droid|200|200|18968|4|Large|4|model|prohibited
Dwarf Spider Droid|200|201|19032|4|Large|3|model|unset
Crab Droid Scout|201|201|19082|4|Large|4|model|unset
IG-100 Series MagnaGuard|201|202|19147|4|Medium|6|model|unset
Viper Series Probe Droid|202|203|19224|4|Large|1|model|prohibited
ASP Series Labor Droid|203|203|19301|5|Medium|0|model|allowed
R2-D2 (Episode VI)|267|267|25872|2|Small|6|named|unset
C-3PO (Episode VI)|267|268|25942|3|Medium|5|named|unset'''},
'LEGACY':{'title':'Legacy Era Campaign Guide','pdf':'Star Wars Saga Edition - Legacy Era Campaign Guide.pdf','txt':'Legacy Era Campaign Guide_djvu.txt','records':'''PI-Series Medical Assistant Droid|69|69|6089|1|Small|0|model|prohibited
3Z3 Medical Droid|70|70|6175|1|Medium|1|model|allowed
BL-39 Interrogator Droid|71|71|6244|1|Small|1|model|allowed
FEG-Series Pilot Droid|71|71|6328|2|Medium|1|model|allowed
Holocam Droid|72|72|6399|2|Tiny|0|model|prohibited
Roving Eye Observation Droid|73|73|6479|2|Diminutive|0|model|prohibited
Z65 Patrol Droid|74|74|6524|4|Medium|3|model|prohibited
LV8-Series Guard Droid|74|74|6622||Medium|4|model|prohibited
Aggressor-Series Battle Droid|75|75|6688|4|Medium|1|model|allowed
IX-6 Heavy Combat Droid|76|76|6780|4|Medium|5|model|prohibited
LON-29 Battle Droid Commander|76|77|6861|4|Medium|6|model|prohibited
HV-7 Loading Droid|77|77|6953|5|Small|1|model|allowed'''},
'FORCE':{'title':'Force Unleashed Campaign Guide','pdf':'SAGA EDITION - Force Unleashed Campaign Guide.pdf','txt':'Force Unleashed Campaign Guide_djvu.txt','records':'''FX-6 Medical Droid|103|103|9835|1|Medium|0|model|prohibited
Q7 Series Astromech Droid|104|104|9933|2|Small|0|model|allowed
BD-3000 Luxury Droid|105|105|10059|3|Medium|0|model|allowed
Junk Droid|106|106|10173||Medium|1|model|allowed
Brute Junk Droid|107|107|10206||Large|3|model|prohibited
Behemoth Junk Droid|107|107|10243||Huge|4|model|prohibited
IT-O Interrogator|195|195|19621|2|Small|1|model|conditional
RA-7 Protocol Droid|196|196|19732|3|Medium|1|model|allowed
PROXY|197|197|19802|4|Medium|13|named|unset
R-1 Recon Droid|197|197|19876|4|Small|1|model|allowed
MSE-6 Repair Droid|198|198|19978|5|Tiny|0|model|prohibited'''}}
GROUPS=['identity','publication','classification','challenge','geometry','abilities','progression','defenses','durability','movement','anatomy','processor','programming','combat','capacity','systems','equipment','modifications','pcConstruction','vehicleLink','economics','text','exceptions','fieldStates','rules','certification']
# Deliberately conservative manual page-visual corrections for ambiguous OCR.
CORE={
4:{'initiativePrinted':0,'perceptionPrinted':6,'reflex':9,'flatFootedReflex':9,'fortitude':11,'will':11,'hitPoints':10,'damageThreshold':11,'str':13,'dex':9,'int':9,'wis':10,'cha':10,'classLineRaw':'nonheroic 3','speedLineRaw':'6 squares (walking)'},
7:{'initiativePrinted':3,'perceptionPrinted':12,'reflex':13,'flatFootedReflex':13,'fortitude':16,'will':11,'hitPoints':32,'damageThreshold':26,'str':22,'dex':9,'int':10,'wis':12,'cha':8,'classLineRaw':'nonheroic 9','speedLineRaw':'8 squares (walking)'},
8:{'perceptionPrinted':13,'reflex':18,'flatFootedReflex':18,'fortitude':17,'will':12,'hitPoints':80,'damageThreshold':42,'str':24,'dex':9,'int':10,'wis':14,'cha':8,'classLineRaw':'nonheroic 12','speedLineRaw':'6 squares (walking), climb 3 squares'},
9:{'initiativePrinted':9,'perceptionPrinted':12,'reflex':17,'flatFootedReflex':16,'fortitude':17,'will':18,'hitPoints':53,'damageThreshold':17,'str':13,'dex':13,'int':14,'wis':14,'cha':10,'classLineRaw':'soldier 6','speedLineRaw':'6 squares (walking)'},
10:{'initiativePrinted':6,'perceptionPrinted':9,'reflex':14,'flatFootedReflex':13,'fortitude':14,'will':13,'hitPoints':34,'damageThreshold':19,'str':18,'dex':12,'int':12,'wis':15,'cha':11,'classLineRaw':'scout 1','speedLineRaw':'6 squares (hovering)'},
11:{'initiativePrinted':2,'perceptionPrinted':1,'reflex':15,'flatFootedReflex':14,'fortitude':13,'will':10,'hitPoints':5,'damageThreshold':13,'str':17,'dex':12,'int':6,'wis':11,'cha':5,'classLineRaw':'nonheroic 2','speedLineRaw':'6 squares (walking)'},
}
# Owner-relevant source distinctions; do not derive engine effects from these.
SPECIAL={
 'CORE':{4:['B1 model is explicitly prohibited as a droid hero (printed p199).'],5:['B2 is explicitly permitted as a droid hero (printed p199), unlike B1.'],6:['Printed CL 4, upstream census CL 6: retain disagreement; printed p200 controls source record.','SR 20 and wheeled mode are source facts, not executed shield or transformation.'],7:['Printed CL 3, census value absent. Statblock starts printed p200 and continues p201.'],9:['IG-100 printed CL 6, census value absent. Statblock continues on p202.'],10:['Viper printed CL 1, census value absent; its statblock continues onto printed p203.'],12:['Named R2-D2 is not the stock R2 starting profile.'],13:['Named C-3PO continues onto printed p268 and is not the stock 3PO starting profile.']},
 'LEGACY':{1:['Printed PI uses capital I; do not transform into P1.'],3:['Medical reprogramming is narrative; no general free-chassis reconfiguration entitlement.'],4:['FEG pilots vehicles but is itself a droid actor; do not transfer vehicle authority.'],8:['Printed statblock omits degree; fourth-degree is the contextual heading only.'],9:['Printed starting soldier bonus feat replacement is conditional on this starting route; not free feat stacking.'],10:['Two blaster rifles in possessions do not establish two executable attacks.'],11:['Battle Analysis and Deployment Tactics require canonical rules and sharing conditions.'],12:['Repulsor-assisted lifting is source-specific, not a global cargo coefficient.']},
 'FORCE':{1:['Force Unleashed FX-6 and Clone Wars FX-6 are separate publication claims.'],3:['New price 25,000 credits; used price 8,000 credits are distinct fields.'],4:['No degree printed; contextual fourth-degree heading is not explicit degree.'],5:['No degree printed; source describes a distinct Large junk variant.'],6:['No degree printed; Huge junk variant and optional passenger space are not fixed chassis capacities.'],7:['Hero route conditional on reprogramming; not unconditional allowed.'],9:['PROXY is a named droid with Jedi levels and Force points; neither implies universal Force sensitivity for droids.'],10:['Integral blaster is described in narrative but listed as a possession; must reconcile weapon/component ownership.'],11:['Reach 0 and model-specific reaction are not universal droid weaknesses.']}}
REVIEW_EXTRA={'CORE':{7:[201],9:[202],10:[203],13:[268]},'LEGACY':{11:[77]},'FORCE':{}}

def parse_ocr(lines,book,idx):
 s='\n'.join(lines)
 out={}
 # These patterns are exact field hints. Visual review is required for persisted values.
 m=re.search(r'\bInit\s*([+\-]\d+)\s*;[^\n]*?Perception\s*([+\-]?\d+)',s,re.I)
 if m:out['initiativePrinted']=int(m.group(1));out['perceptionPrinted']=int(m.group(2))
 m=re.search(r'Defenses\s+Ref\s+(\d+)\s*\((?:flat.footed|fiat.footed)\s+(\d+)(?:[^)]*)\)\s*,\s*Fort\s+(\d+)\s*,\s*Will\s+(\d+)',s,re.I)
 if m:out.update(zip(('reflex','flatFootedReflex','fortitude','will'),map(int,m.groups())))
 m=re.search(r'\bhp\s+(\d+)\s*;\s*(?:SR\s+(\d+)\s*;\s*)?Threshold\s+(\d+)',s,re.I)
 if m:
  out['hitPoints']=int(m.group(1));out['damageThreshold']=int(m.group(3))
  if m.group(2):out['shieldRating']=int(m.group(2))
 m=re.search(r'Abilities\s+Str\s+(\d+)\s*,\s*Dex\s+(\d+)\s*,\s*Con\s*[—=\-]+\s*,\s*Int\s+(\d+)\s*,\s*Wis\s+(\d+)\s*,\s*Cha\s+(\d+)',s,re.I)
 if m:out.update(zip(('str','dex','int','wis','cha'),map(int,m.groups())))
 m=re.search(r'^(?:Medium|Small|Large|Tiny|Diminutive|Huge)\s+droid(?:\s*\([^)]*\))?\s+([^\n]+)',s,re.I|re.M)
 if m:out['classLineRaw']=m.group(1).strip()
 m=re.search(r'^Speed\s+([^\n]+)',s,re.I|re.M)
 if m:out['speedLineRaw']=m.group(1).strip()
 return out

def putpath(r,path,val):
 group,name=path.split('/')[1:];r[group][name]=val

for book,cfg in CFG.items():
 key=book.lower();ledgerpath=R/f'data/canonical/droids/source-books/{key}.json'
 if ledgerpath.exists():raise SystemExit('REFUSE_OVERWRITE: '+str(ledgerpath))
 rows=[x.split('|') for x in cfg['records'].splitlines()]
 assert len(rows)=={'CORE':13,'LEGACY':12,'FORCE':11}[book] and all(len(x)==9 for x in rows)
 src=BASE/cfg['txt'];pdf=BASE/cfg['pdf'];assert src.exists() and pdf.exists()
 lines=src.read_text(errors='replace').splitlines();pdfhash=hashlib.sha256(pdf.read_bytes()).hexdigest();txthash=hashlib.sha256(src.read_bytes()).hexdigest()
 entries=[];receipts=[];census=[];review=[];backlog=[]
 for i,(name,pg,end,anchor,degree,size,cl,kind,elig) in enumerate(rows,1):
  pg,end,anchor,cl=int(pg),int(end),int(anchor),int(cl)
  degree=int(degree) if degree else None
  identity=f'{book}-DROID-{i:03d}'
  assert 0<anchor<=len(lines),(book,i,anchor)
  assert (R/f'work/{key}_pdf_review/printed_p{pg}.png').exists(),(book,pg)
  extra=REVIEW_EXTRA.get(book,{}).get(i,[])
  assert all((R/f'work/{key}_pdf_review/printed_p{p}.png').exists() for p in extra)
  textwin=lines[anchor-1:anchor+65]
  # Source-index extraction only; interleaved columns can corrupt an individual field.
  parsed=parse_ocr(textwin,book,i)
  if book=='CORE':
   if i in CORE:parsed=CORE[i]
   if i==6:parsed['shieldRating']=20
   # a verified printed error in the census is not silently inherited
  if book=='FORCE' and i==9:
   # Extra textual defense "Lightsaber Defense 33" is not a permanent Ref statistic
   parsed['reflex']=30;parsed['flatFootedReflex']=27;parsed['fortitude']=29;parsed['will']=27
  r={'schemaVersion':'swse.droid.universal-source/0.1-draft','recordType':'droid-publication-source-entry',**{g:{} for g in GROUPS}}
  r['identity']={'sourceEntryKey':identity,'printedName':name,'namedIndividual':kind=='named'}
  r['publication']={'book':cfg['title'],'bookId':book,'printedPageStart':pg,'printedPageEnd':end,'pdfPageStart1Based':pg+1,'textLineAnchor1Based':anchor,'publicationKind':'named-character' if kind=='named' else 'model'}
  r['classification']={'publishedDegree':degree,'size':size,'ruleEntityNature':'standard-droid','statblockFormat':'droid-actor','sourceStatblockFormat':'droid-actor','primaryActorAuthority':'droid'}
  if degree is None:r['fieldStates']['/classification/publishedDegree']='not-stated'
  if book=='LEGACY' and i==8:r['classification']['contextualDegreeHeading']=4
  if book=='FORCE' and i in (4,5,6):r['classification']['contextualDegreeHeading']=4
  r['challenge']['challengeLevel']=cl
  r['abilities']['con']=None;r['fieldStates']['/abilities/con']='explicitly-none'
  for prop,val in parsed.items():
   where=next((g for g,fields in {
    'abilities':{'initiativePrinted','perceptionPrinted','str','dex','int','wis','cha'},
    'defenses':{'reflex','flatFootedReflex','fortitude','will','shieldRating'},
    'durability':{'hitPoints','damageThreshold'},
    'progression':{'classLineRaw'},'movement':{'speedLineRaw'}}.items() if prop in fields),None)
   assert where,prop
   if prop=='speedLineRaw' and ('<' in val or len(val)>130):continue
   r[where][prop]=val
  # Printed-page corrections to OCR artifacts, especially cross-column spillover.
  if book=='FORCE' and i==4:
   r['defenses'].update({'reflex':14,'flatFootedReflex':11,'fortitude':13,'will':10})
  if book=='FORCE' and i==5:r['movement']['speedLineRaw']='8 squares (walking)'
  if book=='FORCE' and i==7:r['movement']['speedLineRaw']='6 squares (hovering)'
  if book=='CORE' and i==12:r['progression']['classLineRaw']='nonheroic 2/scoundrel 6'
  if book=='CORE' and i==13:r['progression']['classLineRaw']='nonheroic 1/noble 5'
  if book=='FORCE' and i==3:
   r['economics']['newCredits']=25000
   r['economics']['usedCredits']=8000
  if book=='CORE' and i==6:r['defenses']['shieldRating']=20
  # Factory permission only where explicit prose was checked; absent status fails closed.
  r['pcConstruction']['heroEligibility']=None if elig=='unset' else elig
  if elig=='conditional':r['pcConstruction']['heroEligibilityCondition']='Source requires reprogramming; not a generic unrestricted starting choice.'
  if elig=='unset':r['fieldStates']['/pcConstruction/heroEligibility']='not-applicable' if kind=='named' else 'not-stated'
  r['rules']['mechanicalExecutionStatus']='source-only'
  r['text']['sourceWarnings']=['Selected first-page printed fields only. OCR is not final authority.',
      'No weapon mount, feat, talent, runtime effect or character-creation entitlement may be inferred from a statblock.']
  caveats=SPECIAL.get(book,{}).get(i,[])
  if caveats:r['text']['sourceWarnings']+=caveats
  if book=='CORE' and i==6:
   r['exceptions']['transcriptionWarnings']=['Earlier publication census lists CL 6; printed Core Rulebook p200 instead lists CL 4. Not a source-book contradiction: correct census before future merge.']
  r['exceptions']['notes']='Publication source claim only: complete equipment, combat, feat/talent, secondary-page, PC route, JSON Schema, and Foundry runtime certification outstanding.'
  for j,statement in enumerate(caveats,1):
   # Commentary flags are NOT universal or executable source mechanics.
   r['rules'].setdefault('conditionalMechanics',[]).append({'ruleId':identity+'-BOUNDARY-'+str(j),
     'statement':statement,'scope':identity,
     'source':{'book':cfg['title'],'page':pg,'pdfPage1Based':pg+1,'verifiedBy':'pdf-visual','sourceEntryKey':identity},'executionStatus':'source-only'})
  r['certification']={'identityStatus':'pdf-reviewed','mechanicalStatus':'partial','runtimeStatus':'not-tested',
   'reviewNotes':'Selected fields reviewed visually against printed PDF; no complete mechanical certification.',
   'reviewerEvidenceRefs':[identity+f':pdf-p{pg}',identity+f':txt-line-{anchor}']}
  # Exact applied field receipt; additional source text is retained separately, not treated as certified fields.
  vals={
   '/identity/printedName':name,'/publication/printedPageStart':pg,
   '/classification/size':size,'/challenge/challengeLevel':cl,
   **({'/classification/publishedDegree':degree} if degree is not None else {})}
  for group in ('abilities','progression','defenses','durability','movement'):
   vals.update({f'/{group}/{k}':v for k,v in r[group].items() if v is not None})
  if elig!='unset':vals['/pcConstruction/heroEligibility']=elig
  if book=='FORCE' and i==3:
   vals['/economics/newCredits']=25000;vals['/economics/usedCredits']=8000
  count=len(vals)
  ex='\n'.join(lines[anchor-1:min(len(lines),anchor+85)])
  entries.append(r)
  receipts.append({'sourceEntryKey':identity,'printedName':name,'printedPage':pg,'pdfPage1Based':pg+1,
    'sourceReviewStatus':'PDF_SELECTED_FIELDS_VISUAL','txtAnchorLine1Based':anchor,
    'txtWindowSha256':hashlib.sha256(ex.encode()).hexdigest(),'ocrTextExcerpt':ex,
    'pdfVisualFieldChecks':{'sourceImage':f'work/{key}_pdf_review/printed_p{pg}.png',
      'extraVisualSourcePages':extra,'fieldValues':vals,'fieldComparisonCount':count,
      'scope':'Selected printed statblock facts, NOT complete field-by-field mechanics certification.'},
    'warnings':caveats+['OCR columns may interleave. Only retained selected field values are reviewed source facts.']})
  census.append({'sourceEntryKey':identity,'printedName':name,'printedPageStart':pg,'printedPageEnd':end,
    'txtLine1Based':anchor,'publishedDegree':degree,'size':size,'challengeLevel':cl,'kind':kind,
    'heroEligibility':elig})
  review.append({'sourceEntryKey':identity,'printedName':name,'printedPage':pg,
    'verifiedFieldCount':count,'sourceImage':f'work/{key}_pdf_review/printed_p{pg}.png',
    'scope':'Selected first-page visual review, not mechanical certification.'})
  backlog.append({'sourceEntryKey':identity,'status':'MECHANICALLY_UNCERTIFIED',
    'blockers':['Canonical feat and talent identity/provenance','Installed vs possessions component inventory and weapon mount legality',
      'Detailed source-rule/secondary-page reconciliation','Full upstream JSON Schema validation','Foundry V13 runtime verification']})
 assert len(entries)==len(review)==len(census)==len(receipts)==len(rows)
 outfiles={
 R/f'data/canonical/droids/source-books/{key}.json':{'schema':'swse.droid.source-book-hydration-ledger/0.1-partial','bookId':book,
  'book':cfg['title'],'draftSourceEntrySchema':'swse.droid.universal-source/0.1-draft',
  'sourceBookPdf':cfg['pdf'],'expectedPublicationClaims':len(entries),'scope':'Selected PDF-source facts, no executable mechanics; not an import-ready pack.','sourceEntries':entries},
 R/f'data/audits/droids/{key}-field-evidence.json':{'schema':f'swse.droid.{key}.source-evidence/0.1','sourceBook':cfg['title'],
 'sourcePdf':cfg['pdf'],'sourcePdfSha256':pdfhash,'sourceTxt':cfg['txt'],'sourceTxtSha256':txthash,'records':receipts},
 R/f'data/audits/droids/{key}-census-identity.json':{'schema':f'swse.droid.{key}.census-parity/0.1',
 'authority':'Read-only upstream publication census cross-checked to printed PDF, with printed corrections recorded locally.',
 'claims':census},
 R/f'data/audits/droids/{key}-visual-field-review.json':{'schema':f'swse.droid.{key}.selected-pdf-visual/0.1',
  'sourceBook':cfg['title'],'manualVisualReviews':len(entries),'directFieldComparisons':sum(z['verifiedFieldCount'] for z in review),
  'sourcePdfHash':pdfhash,'method':'PDF printed pages visually reviewed; selected source fields compared with searchable text as index.',
  'scope':'Selected first-page fields only; no complete mechanical certification.','items':review},
 R/f'data/audits/droids/{key}-review-backlog.json':{'bookId':book,'mechanicallyCertified':0,'items':backlog},
 R/f'docs/audits/droids/{key}-local-state.json':{'bookId':book,'draftEntries':len(entries),'selectedPdfReviewed':len(review),
  'comparisons':sum(z['verifiedFieldCount'] for z in review),'mechanicallyCertified':0,'runtimeVerified':0,'status':'IN_PROGRESS_SOURCE_REVIEW_ONLY','githubWrites':False}}
 for path,data in outfiles.items():
  assert not path.exists(),f'Would overwrite {path}'
  path.parent.mkdir(parents=True,exist_ok=True)
  path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
 # A human-readable blocker and provenance checkpoint for the next reconciliation pass.
 md=f'''# {cfg['title']} — local source hydration checkpoint\n\n**Source identities:** {len(entries)}/{len(entries)}. **Selected first-page PDF reviews:** {len(review)}/{len(entries)}.\n**Selected fields compared:** {sum(z['verifiedFieldCount'] for z in review)}. **Mechanical certifications:** 0/{len(entries)}.\n\nThese are source-review receipts only. The sourcebook PDF and adjacent narrative pages control any mismatch with searchable TXT or old census.\n\n## Publication records and blockers\n\n| Key | Source identity | Printed page | Selected checks |\n|---|---|---:|---:|\n'''
 for v in receipts:md+=f"| {v['sourceEntryKey']} | {v['printedName']} | {v['printedPage']} | {v['pdfVisualFieldChecks']['fieldComparisonCount']} |\n"
 md+='\n## Source caveats\n\n'
 for i,entry in enumerate(entries,1):
  caveats=SPECIAL.get(book,{}).get(i,[])
  for c in caveats:md+=f"- **{entry['identity']['sourceEntryKey']}**: {c}\n"
 md+='\n## Mechanical certification gates\n\n- Resolve printed narrative rules and all statblock fields beyond the selected review.\n- Canonize feat and talent names with primary-source provenance.\n- Distinguish factory installed systems, possessions, physical mounts and ammunition.\n- Verify PC creation permissions and all conditional restrictions.\n- Complete upstream JSON Schema and Foundry V13 runtime tests before any executable mapping.\n- Keep this work local; no GitHub writes are authorized.\n'
 (R/f'docs/audits/droids/hydration-{key}-rolling.md').write_text(md)
 print(book,'entries',len(entries),'selected fields',sum(z['verifiedFieldCount'] for z in review),'PDF',pdfhash[:12])
