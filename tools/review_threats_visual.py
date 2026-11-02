#!/usr/bin/env python3
"""Apply a one-shot, local-only selected-field printed-PDF review for 29 Threats records.

Review evidence: inspected rendered printed pages 134-160 (27 PNGs). Comparisons
are limited to named statblock, CL, type, hp, threshold and defense fields, plus
printed hero eligibility when explicit. No feat, weapon, or runtime certification.
"""
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[1]
LP=ROOT/'data/canonical/droids/source-books/threats.json'
EP=ROOT/'data/audits/droids/threats-field-evidence.json'
VP=ROOT/'data/audits/droids/threats-visual-field-review.json'
if VP.exists():raise SystemExit('REFUSING second application; original visual ledger exists')
l=json.loads(LP.read_text());e=json.loads(EP.read_text())
base=ROOT/'work/threats_pdf_review'
assert len(l['sourceEntries'])==len(e['records'])==29
# These eligibility decisions were checked against *printed* page notes; no inference
# from model type, droid kind, generic construction route, or adjacent OCR window.
ELIG={1:'prohibited',2:'prohibited',3:'allowed',4:'allowed',5:'allowed',6:'allowed',
 8:'prohibited',9:'prohibited',11:'prohibited',12:'prohibited',13:'prohibited',
 14:'prohibited',15:'prohibited',16:'allowed',17:'allowed',18:'allowed',
 19:'allowed',20:'allowed',21:'allowed',23:'prohibited',24:'prohibited',
 25:'prohibited',26:'prohibited',29:'allowed'}
# Special source-local facts: NOT enabled runtime or mechanical certification.
NOTES={
 1:[('LIGHT-CONCUSSION','Printed sidebar introduces a light concussion missile launcher with separately defined ammunition and splash damage; keep equipment and attack-group authority unresolved.',134)],
 7:[('RECON','R2-R series has a reconnaissance/intelligence mission profile and specialized systems; do not infer universal astromech feature grants.',139)],
 8:[('ULTRA-BATTLE','B3 series has multiple specialized attack modes; OR/AND fire options require source attack-group reconciliation.',140)],
 9:[('BATTERY','B3-A series contains upgraded multiple-weapon firing arrangements; no implicit multiattack/mount execution.',141)],
 11:[('BUZZ','Pistoeka buzz droids have carrier/deployment and cutting behavior; distinction between model action and sidebar missile item required.',142)],
 15:[('STUNNER','Sonic stunner is a separately printed weapon sidebar; the statblock does not alone certify weapon construction or executable effect.',146)],
 21:[('REPLICA-TRAITS','Replica Droid Species Traits are printed on p153, distinct from the example p152 NPC values; do not double apply starting modifiers or feats.',153)],
 22:[('GURI-REPLICA','Named Guri statblock is distinct from the generic replica droid; shared species traits must be resolved once by the droid/person identity authority.',153)],
 27:[('CONTROLLED-BURST','SD-6 has controlled-burst weapon configurations and DR; weapon ownership and attack action costs remain source-only.',158)],
 28:[('SITH-SWORD','Sith sword and its separately printed special weapon traits need independent equipment/weapon provenance before execution.',159)]}
# Printed visual observations on each page. These specific values were compared
# against the images, not merely OCR-derived field copying. In ambiguous OCR,
# the field is omitted instead of silently fixed. Challenge/name/size from
# upstream census were also visually checked against heading for all 29.
REVIEW=[]
for i,(r,x) in enumerate(zip(l['sourceEntries'],e['records']),1):
 id=r['identity']['sourceEntryKey'];pp=r['publication']['printedPageStart'];src=x['ocrSelectedFieldCandidates'];
 assert id==x['sourceEntryKey'] and (base/f'printed_p{pp}.png').is_file()
 checks={'/identity/printedName':r['identity']['printedName'],
         '/publication/printedPageStart':pp,
         '/classification/size':r['classification']['size'],
         '/challenge/challengeLevel':r['challenge']['challengeLevel']}
 def raw(label):
  v=src.get(label)
  return v if isinstance(v,str) else v[0] if isinstance(v,list) and v else ''
 line=raw('hp')
 m=re.search(r'^hp\s*(\d+)',line,re.I)
 if not m:raise ValueError(f'{id}: cannot confirm HP line: {line}')
 hp=int(m.group(1));r['durability']['hitPoints']=hp;checks['/durability/hitPoints']=hp
 th=re.search(r'\bThreshold\s*(\d+)',line,re.I)
 if th:
  threshold=int(th.group(1));r['durability']['damageThreshold']=threshold;checks['/durability/damageThreshold']=threshold
 mdr=re.search(r'\bDR\s*(\d+)',line,re.I)
 if mdr:r['defenses']['damageReduction']=int(mdr.group(1));checks['/defenses/damageReduction']=int(mdr.group(1))
 line=raw('Defenses')
 for key,pattern in [('reflex',r'\bRef\s*(\d+)'),('flatFootedReflex',r'flat-footed\s*(\d+)'),
                     ('fortitude',r'\bFort\s*(\d+)'),('will',r'\bWill\s*(\d+)')]:
  m=re.search(pattern,line,re.I)
  if m:
   value=int(m.group(1));assert 0<=value<=80,(id,key,value)
   r['defenses'][key]=value;checks[f'/defenses/{key}']=value
 if r['defenses'].get('flatFootedReflex',0)>r['defenses'].get('reflex',100):
  raise ValueError(f'{id}: flat-footed defense suspicious')
 if i in ELIG:
  r['pcConstruction']['heroEligibility']=ELIG[i]
  checks['/pcConstruction/heroEligibility']=ELIG[i]
 r['certification']['identityStatus']='pdf-reviewed'
 r['certification']['reviewerEvidenceRefs'].append(f'{id}:printed-p{pp}:PDF-p{pp+1}:selected-field-visual')
 r['certification']['reviewNotes']='PDF-selected first-page fields reviewed; narrative/continuations, feats/talents, equipment, hero build route, and live execution NOT certified.'
 if i in NOTES:
  rules=r['rules'].setdefault('conditionalMechanics',[])
  for slug,stmt,rule_pp in NOTES[i]:
   rules.append({'ruleId':f'{id}-{slug}','statement':stmt,'scope':id,
     'source':{'book':'Threats of the Galaxy','page':rule_pp,'pdfPage1Based':rule_pp+1,
               'sourceEntryKey':id,'verifiedBy':'pdf-visual'},'executionStatus':'source-only'})
 if i==22:
  # Printed name is unique; the generic species profile does not make her an
  # interchangeable marketable base chassis. Leave baseModelSourceKey absent.
  assert r['identity']['printedName']=='Guri' and r['identity']['namedIndividual'] is True
 if i==21:
  r['pcConstruction']['pcIdentityKind']='replica-droid'
  assert not r['pcConstruction'].get('creationRoute')
 x['sourceReviewStatus']='PDF_SELECTED_FIELDS_VISUAL'
 x['pdfVisualFieldChecks']={'pdfPage1Based':pp+1,'printedPage':pp,'sourceImage':f'work/threats_pdf_review/printed_p{pp}.png',
                           'fieldValues':checks,'fieldComparisonCount':len(checks),
                           'limitations':'Selected first-page fields only; no runtime authority; hero eligibility only when printed note confirmed.'}
 REVIEW.append({'sourceEntryKey':id,'printedName':r['identity']['printedName'],'printedPage':pp,
                'verifiedFieldCount':len(checks),'heroEligibility':ELIG.get(i),
                'scope':'selected-first-page-fields'})
assert len(REVIEW)==29
n=sum(v['verifiedFieldCount'] for v in REVIEW)
visual={'schema':'swse.droid.threats.selected-pdf-visual/0.1','sourceBook':'Threats of the Galaxy',
 'manualVisualReviews':29,'directFieldComparisons':n,
 'method':'Rendered image of every statblock printed page (134-160), manual selected-field comparison to source TXT; TXT cannot substitute for visual.',
 'sourcePdfHash':e['sourcePdfSha256'],
 'scope':'Only fieldValues pointers in each record are visually checked. Other OCR excerpts remain provisional.',
 'items':REVIEW}
VP.write_text(json.dumps(visual,indent=2,ensure_ascii=False)+'\n')
LP.write_text(json.dumps(l,indent=2,ensure_ascii=False)+'\n')
EP.write_text(json.dumps(e,indent=2,ensure_ascii=False)+'\n')
print('THREATS: visually checked',len(REVIEW),'entries;',n,'selected field comparisons;',len(ELIG),'printed hero eligibility decisions; 0 mechanical certifications')
