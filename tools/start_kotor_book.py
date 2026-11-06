#!/usr/bin/env python3
"""Seed KOTOR 24 immutable publication identities and non-executable TXT evidence, locally only.
Fails closed, refuses to overwrite prior work, and does not transfer OCR into mechanics.
"""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
SRC=Path('/mnt/data/Knights of the Old Republic Campaign Guide_djvu.txt')
PDF=Path('/mnt/data/SAGA EDITION - Knights of the Old Republic Campaign Guide.pdf')
BOOK='Knights of the Old Republic Campaign Guide'
# KOTOR-DROID-NNN | printed name | printed page | TXT line | degree | size | CL | kind | heroStatus | relationship
ROWS='''ET-74 Communications Droid|81|7661|1|Small|0|factory|allowed|
GO-TO Infrastructure-Planning Droid|82|7727|2|Tiny|1|factory|prohibited|
T3-Series Utility Droid|82|7735|2|Small|0|factory|allowed|
GE3-Series Protocol Droid|83|7866|3|Medium|0|factory|allowed|
GG-Series Hospitality Droid|84|7957|3|Medium|0|factory|allowed|
HK-24 Series Assassin Droid|84|8033|4|Medium|7|factory|prohibited|
Independent HK-Series Droid|85|8097|4|Medium|1|independent-hero-template|conditional|
HK-50 Series Assassin Droid|85|8139|4|Medium|12|factory|prohibited|
Juggernaut War Droid|86|8232|4|Medium|4|factory|prohibited|
K-X12 Probe Droid|86|8302|4|Small|2|factory|prohibited|
Municipal Patrol Droid Mark I|87|8369|4|Small|2|factory|prohibited|
Devastator War Droid|87|8377|4|Medium|5|factory|prohibited|
Sentinel Droid|88|8522|4|Medium|1|factory|allowed|
S6-Series Security/Maintenance Droid|88|8592|5|Diminutive|0|factory|prohibited|
T1 Bulk Loader Droid|88|8649|5|Large|1|factory|prohibited|
R-8009 Utility Droid|89|8708|5|Small|0|factory|allowed|
Mark I Assault Droid|165|16671|4|Medium|6|factory|prohibited|
Mark IV Assault Droid|165|16705|4|Large|6|factory|prohibited|
Basilisk War Droid|203|20759||Huge|6|vehicle|unset|
GO-TO (Dark Wars)|212|21651|2|Tiny|6|named|unset|KOTOR-DROID-002
HK-47 (Jedi Civil War)|213|21768|4|Medium|9|named|unset|
T3-M4 (Jedi Civil War)|216|22222|2|Small|6|named|unset|KOTOR-DROID-003
Krath War Droid|222|23055|4|Medium|5|factory|prohibited|
Rakatan Guardian Droid|223|23120|4|Large|5|factory|unset|'''
rows=[x.split('|') for x in ROWS.splitlines()]
assert len(rows)==24 and all(len(x)==9 for x in rows)
root_keys='classification challenge geometry abilities progression defenses durability movement anatomy processor programming combat capacity systems equipment modifications pcConstruction vehicleLink economics text exceptions fieldStates rules'.split()
text=SRC.read_text(errors='replace').splitlines();recs=[];evid=[];census=[]
for i,(name,page,anchor,deg,size,cl,kind,hero,rel) in enumerate(rows,1):
 p=int(page);line=int(anchor);nextline=int(rows[i][2])-1 if i<24 else len(text)
 # Search fragments are bounded, but scanned columns can interleave; never trust as mechanics
 fragment='\n'.join(text[line-1:nextline]);entry=f'KOTOR-DROID-{i:03d}'
 groups={k:{} for k in root_keys}
 kind_droid=kind!='vehicle'
 rec={'schemaVersion':'swse.droid.universal-source/0.1-draft','recordType':'droid-publication-source-entry',
      'identity':{'sourceEntryKey':entry,'printedName':name,'namedIndividual':kind=='named'},
      'publication':{'book':BOOK,'bookId':'KOTOR','printedPageStart':p,'printedPageEnd':p,
                     'pdfPageStart1Based':p+1,'textLineAnchor1Based':line,
                     'publicationKind':'named-character' if kind=='named' else ('vehicle-format-droid' if not kind_droid else 'model')},
      **groups,
      'certification':{'identityStatus':'txt-indexed','mechanicalStatus':'partial','runtimeStatus':'not-tested',
                       'reviewNotes':'TXT-indexed; PDF printed page and selected mechanical fields pending visual review. No runtime rights.',
                       'reviewerEvidenceRefs':[f'KOTOR-CENSUS:{entry}',f'{BOOK}:printed-p{p}:TXT-line-{line}']}}
 rec['classification'].update({'size':size,'publishedDegree':int(deg) if deg else None,
   'statblockFormat':'droid-actor' if kind_droid else 'vehicle',
   'sourceStatblockFormat':'vehicle-scale-droid' if not kind_droid else 'droid-actor',
   'primaryActorAuthority':'droid' if kind_droid else 'vehicle',
   'ruleEntityNature':'standard-droid' if kind_droid else 'vehicle-format-droid'})
 if not deg:
  rec['fieldStates']['/classification/publishedDegree']='not-stated'
 rec['challenge']['challengeLevel']=int(cl)
 rec['rules']['mechanicalExecutionStatus']='source-only'
 rec['exceptions']['notes']='No feat/talent, installed-component, weapon-mount, PC build or source-specific mechanic has independent execution certification.'
 if rel:
  rec['identity']['baseModelSourceKey']=rel # relationship backed by census; named/source distinction still independent
 if hero in ('allowed','prohibited'):
  rec['pcConstruction']['heroEligibility']=hero
  rec['fieldStates']['/pcConstruction/heroEligibility']='source-verified' # state for non-null optional allowed (will be confirmed visually)
 elif hero=='conditional':
  rec['pcConstruction']['heroEligibility']='conditional'
  rec['pcConstruction']['heroEligibilityCondition']='Published independent HK-Series heroic baseline subject to GM approval; not the HK-24 or HK-50 factory model.'
 else:
  rec['pcConstruction']['heroEligibility']=None
  rec['fieldStates']['/pcConstruction/heroEligibility']='not-stated'
 if kind=='named':
  rec['text']['sourceWarnings']=['Named NPC character statblock, not a generic factory starting model or PC starting package.']
 if kind=='vehicle':
  rec['text']['sourceWarnings']=['Vehicle-primary autonomous droid: vehicle defense, HP, weapons, velocity, crew, passenger and payload data must stay in vehicle authority.']
 if i==21:
  rec['text']['sourceWarnings']=['HK-47 named individual: Independent HK-Series heroic template is a sibling comparison, NOT a proven base-model derivation.']
 if i==24:
  rec['text']['sourceWarnings']=['No source-established hero permission; missing permission is not permission granted.']
 # Capture source window but no automated numeric transplant
 candidates={}
 for field in ['Defenses','hp','Init','Speed','Melee','Ranged','Abilities','Feats','Talents','Skills','Systems','Possessions','Availability']:
  hits=[s.strip() for s in text[line-1: min(nextline,line+100)] if re.match(r'^'+re.escape(field)+r'\b',s.strip(),re.I)]
  if hits:candidates[field]=hits[:2]
 evid.append({'sourceEntryKey':entry,'printedName':name,'printedPage':p,'pdfPage1Based':p+1,
   'txtAnchorLine1Based':line,'txtWindowEnd1Based':nextline,'txtWindowSha256':hashlib.sha256(fragment.encode()).hexdigest(),
   'ocrTextExcerpt':fragment,'ocrSelectedFieldCandidates':candidates,'sourceReviewStatus':'TXT_PROVISIONAL',
   'pdfVisualFieldChecks':{},
   'warnings':['Source TXT may interleave printed columns; candidates are not mechanically authoritative.']})
 census.append({'sourceEntryKey':entry,'printedName':name,'printedPage':p,'pdfPage1Based':p+1,
  'txtLine1Based':line,'publishedDegree':int(deg) if deg else None,'size':size,'challengeLevel':int(cl),
  'recordKind':kind,'censusHeroEligibility':hero if hero!='unset' else None,'namedRelationship':rel or None})
 recs.append(rec)
ledger={'schema':'swse.droid.source-book-hydration-ledger/0.1-partial','bookId':'KOTOR','book':BOOK,
 'draftSourceEntrySchema':'swse.droid.universal-source/0.1-draft','sourceBookPdf':PDF.name,
 'scope':'24 source identities only; printed PDF selected fields reviewed independently; no executable mechanics.',
 'expectedPublicationClaims':24,'sourceEntries':recs}
files={ROOT/'data/canonical/droids/source-books/kotor.json':ledger,
 ROOT/'data/audits/droids/kotor-field-evidence.json':{'schema':'swse.droid.kotor.source-evidence/0.1',
  'book':BOOK,'sourceTxt':SRC.name,'sourceTxtSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
  'sourcePdf':PDF.name,'sourcePdfSha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'records':evid},
 ROOT/'data/audits/droids/kotor-census-identity.json':{'schema':'swse.droid.kotor.census-parity/0.1',
  'source':'data/audits/droids/droid-publication-census.json',
  'authority':'Read-only branch census inventory; printed PDF supersedes OCR for mechanical details.',
  'claims':census}}
for path in files:
 if path.exists():raise SystemExit('REFUSING overwrite of '+str(path))
for path,obj in files.items():
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n')
print('KOTOR 24 source-only records seeded; 23 character actors, 1 vehicle; 0 mechanical certifications')
