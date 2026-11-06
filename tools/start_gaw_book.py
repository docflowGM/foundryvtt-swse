#!/usr/bin/env python3
"""Seed 22 GAW publication identities into LOCAL, source-only, fail-closed ledger.
Census facts from read-only upstream droid-publication-census.json, 2026-10-29.
DO NOT run again over hydrated records. Printed PDF governs, TXT is an index.
"""
from pathlib import Path
import hashlib,json,re
R=Path(__file__).resolve().parents[1]
TXT=Path('/mnt/data/Galaxy At War_djvu.txt')
PDF=Path('/mnt/data/SW_Saga_Galaxy_at_War.pdf')
BOOK='Galaxy at War'
# name|printed page|TXT line|degree|size|CL|kind|census hero eligibility|relation
RAW='''A-Series Medical Droid|51|4938|1|Small|1|factory|allowed|
KDY-4 Tech Droid|52|5042|2|Medium|1|factory|allowed|
Chiba-DR10 Protocol Droid|52|5050|3|Small|1|factory|allowed|
Air Assault Super Battle Droid|53|5173|4|Medium|4|factory|prohibited|CORE-DROID-005
Eradicator-Series Battle Droid|53|5250|4|Large|2|factory|prohibited|
Purge Trooper|54|5318|4|Large|8|factory|prohibited|
Sniper Droideka|55|5394|4|Large|7|factory|prohibited|CORE-DROID-006
Tactical Droid|55|5404|4|Medium|1|factory|allowed|
Vigilant 2X Picket Droid|56|5538|4|Medium|3|factory|prohibited|
CLL-M2 Ordnance Lifter Droid|56|5576|5|Large|1|factory|prohibited|
MR-200 Series Minesweeper Droid|57|5677|5|Large|1|factory|prohibited|
Automated Sentry Gun|98|10010|4|Small|2|battlefield-device|unset|
Arakyd AZ-Series Battle Droid|181|17777|4|Large|6|factory|unset|
B1-Series Battle Droid|210|20591|4|Medium|1|reprint|unset|CORE-DROID-004
B2-Series Super Battle Droid|210|20643|4|Medium|2|reprint|unset|CORE-DROID-005
Droideka Series Destroyer Droid|211|20689|4|Large|4|reprint|unset|CORE-DROID-006
Droid Commando|214|21095|4|Medium|6|factory|unset|CLONE-DROID-024
OOM-Series Battle Droid|215|21169|4|Medium|2|factory|unset|CLONE-DROID-031
Ground Armored Tank|216|21327||Huge|10|vehicle|not-applicable|CLONE-DROID-034
B1-Series Battle Droid Squad|217|21399|4|Large|3|squad|not-applicable|CLONE-DROID-014
Battle Droid Assassin|218|21609|4|Medium|4|variant|unset|
LR-57 Combat Droid|219|21681|4|Large|3|factory|unset|'''
rows=[v.split('|') for v in RAW.splitlines()];assert len(rows)==22 and all(len(x)==9 for x in rows)
source=TXT.read_text(errors='replace').splitlines();keys='classification challenge geometry abilities progression defenses durability movement anatomy processor programming combat capacity systems equipment modifications pcConstruction vehicleLink economics text exceptions fieldStates rules'.split()
records=[];evidence=[];census=[]
for i,(name,page,anchor,degree,size,cl,kind,hero,relation) in enumerate(rows,1):
 p=int(page);at=int(anchor);end=min(len(source),at+175,int(rows[i][2])-1 if i<22 else len(source));chunk='\n'.join(source[at-1:end]);key=f'GAW-DROID-{i:03d}'
 groups={k:{} for k in keys}
 r={'schemaVersion':'swse.droid.universal-source/0.1-draft','recordType':'droid-publication-source-entry',
    'identity':{'sourceEntryKey':key,'printedName':name,'namedIndividual':False},
    'publication':{'book':BOOK,'bookId':'GAW','printedPageStart':p,'printedPageEnd':p,
                   'pdfPageStart1Based':p+1,'textLineAnchor1Based':at,
                   'publicationKind':'vehicle-format-droid' if kind=='vehicle' else ('other' if kind in ('squad','battlefield-device') else 'model')},
    **groups,'certification':{'identityStatus':'txt-indexed','mechanicalStatus':'partial','runtimeStatus':'not-tested',
      'reviewNotes':'Publication-index record. No runtime mechanics; selected-page visual verification pending.',
      'reviewerEvidenceRefs':[f'GAW-CENSUS:{key}',f'{BOOK}:printed-p{p}:TXT-line-{at}']}}
 c=r['classification'];c['size']=size
 if degree:c['publishedDegree']=int(degree)
 if kind=='vehicle':
  c.update({'statblockFormat':'vehicle','sourceStatblockFormat':'vehicle','primaryActorAuthority':'vehicle','ruleEntityNature':'vehicle-format-droid'})
  r['fieldStates']['/classification/publishedDegree']='not-stated'
 elif kind=='squad':
  c.update({'statblockFormat':'squad','sourceStatblockFormat':'droid-squad','primaryActorAuthority':'squad-aggregation','ruleEntityNature':'standard-droid'})
 else:
  c.update({'statblockFormat':'droid-actor','sourceStatblockFormat':'droid-actor','primaryActorAuthority':'droid','ruleEntityNature':'standard-droid'})
 r['challenge']['challengeLevel']=int(cl)
 r['rules']['mechanicalExecutionStatus']='source-only'
 r['exceptions']['notes']='Printed publication identity is source-only. No feat/talent grants, installed systems, weapon mounts or runtime effects certified.'
 r['pcConstruction']['heroEligibility']=None
 r['fieldStates']['/pcConstruction/heroEligibility']='not-applicable' if kind in ('vehicle','squad') else 'not-stated'
 if kind=='vehicle':r['text']['sourceWarnings']=['Vehicle-primary droid brain: do not duplicate HP, defenses, speeds, weapons, crew and payload in a droid actor.']
 if kind=='squad':r['text']['sourceWarnings']=['Battle-droid squad is an aggregate of individual B1 droids; never treat Large squad size/HP as a chassis.']
 if kind=='reprint':r['text']['sourceWarnings']=['Same factory family printed in a different source; this GAW statblock is a distinct publication claim, not a new canonical factory family by name alone.']
 if kind=='battlefield-device':r['text']['sourceWarnings']=['Stationary sentry with battlefield placement and cover conditions; p175 alternate contextual presentation.']
 if relation:r['text'].setdefault('sourceWarnings',[]).append('Census reports related model '+relation+'; relationship NOT an automatic system/stat inheritance permission.')
 if i==8:r['text'].setdefault('sourceWarnings',[]).append('Reprinted Tactical Droid on p213 is same publication identity, not an extra droid claim.')
 candidates={}
 for label in ['Init','Languages','Defenses','hp','Speed','Melee','Ranged','Base Atk','Abilities','Talents','Feats','Skills','Systems','Possessions','Availability']:
  found=[x.strip() for x in source[at-1:end] if re.match('^'+re.escape(label)+r'\b',x.strip(),re.I)]
  if found:candidates[label]=found[:3]
 recEvidence={'sourceEntryKey':key,'printedName':name,'printedPage':p,'pdfPage1Based':p+1,'txtAnchorLine1Based':at,
  'txtWindowEnd1Based':end,'txtWindowSha256':hashlib.sha256(chunk.encode()).hexdigest(),'ocrTextExcerpt':chunk,
  'ocrSelectedFieldCandidates':candidates,'sourceReviewStatus':'TXT_PROVISIONAL','pdfVisualFieldChecks':{},
  'censusHeroStatus':hero,'censusRelatedModelSourceKey':relation or None,
  'warnings':['OCR may interleave neighboring columns; never promote its numbers or hero statements without printed-PDF comparison.']}
 evidence.append(recEvidence)
 census.append({'sourceEntryKey':key,'printedName':name,'printedPage':p,'pdfPage1Based':p+1,'txtLine1Based':at,
  'degree':int(degree) if degree else None,'size':size,'challengeLevel':int(cl),'sourceNature':kind,'censusHeroEligibility':hero,'relatedModelKey':relation or None})
 records.append(r)
assert len(records)==len({x['identity']['sourceEntryKey'] for x in records})==22
ledger={'schema':'swse.droid.source-book-hydration-ledger/0.1-partial','bookId':'GAW','book':BOOK,
 'draftSourceEntrySchema':'swse.droid.universal-source/0.1-draft','sourceBookPdf':PDF.name,
 'scope':'22 GAW source identities; selected visible facts only after independent page inspection. No executable mechanics.',
 'expectedPublicationClaims':22,'sourceEntries':records}
files={R/'data/canonical/droids/source-books/gaw.json':ledger,
 R/'data/audits/droids/gaw-field-evidence.json':{'schema':'swse.droid.gaw.source-evidence/0.1','book':BOOK,
 'sourceTxt':TXT.name,'sourceTxtSha256':hashlib.sha256(TXT.read_bytes()).hexdigest(),
 'sourcePdf':PDF.name,'sourcePdfSha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'records':evidence},
 R/'data/audits/droids/gaw-census-identity.json':{'schema':'swse.droid.gaw.census-parity/0.1','source':'data/audits/droids/droid-publication-census.json','authority':'Read-only upstream census; printed PDF controls rules; related-model keys are evidence, not inheritance.','claims':census}}
for f in files:
 if f.exists():raise SystemExit('REFUSING to overwrite '+str(f))
for f,v in files.items():f.parent.mkdir(parents=True,exist_ok=True);f.write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
print('GAW seeded 22 source-only claims, 20 individual/statblock devices + one squad + one vehicle; no mechanical certifications')
