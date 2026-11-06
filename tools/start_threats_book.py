#!/usr/bin/env python3
"""Local-only Threats of the Galaxy census and mechanically gated source index.

Source identities come from the read-only 234-claim census on branch
`audit/droid-publication-census-2026-10-29`. PDF page anchors are printed page + 1.
TXT is a search index, not mechanic or hero-playability authority.
Never overwrites an existing ledger or evidence file.
"""
from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1]
SRC=Path('/mnt/data/Threats of the Galaxy_djvu.txt')
PDF=Path('/mnt/data/SAGA EDITION - Threats of the Galaxy.pdf')
BOOK='Threats of the Galaxy'
# immutable identity | source page | TXT line | degree | size | CL | nature
ROWS='''VX Series Artillery Droid|134|12933|4|Medium|12|factory
ASN-121 Assassin Droid|135|13041|4|Small|9|factory
R3 Series Astromech Droid|136|13150|2|Small|1|factory
R4 Series Astromech Droid|137|13263|2|Small|1|factory
R5 Series Astromech Droid|138|13367|2|Small|1|factory
R7 Series Astromech Droid|138|13454|2|Small|2|factory
R2-R Series Reconnaissance Astromech Droid|139|13535|2|Small|1|factory
B3 Series Ultra Battle Droid|140|13588|4|Large|3|factory
B3-A Series Ultra Battle Droid|141|13686|4|Large|5|factory
IG Series Battle Droid|141|13773|4|Medium|2|factory
Pistoeka Buzz Droid|142|13833|4|Tiny|3|factory
EVS Construction Droid|143|13963|5|Colossal|8|factory
GRZ-6B Demolitions Droid|144|14045|5|Gargantuan|8|factory
3PX Espionage Droid|145|14171|4|Medium|6|factory
TO-D Interrogation Droid|146|14232|1|Medium|4|factory
GH-7 Medical Droid|147|14329|1|Small|1|factory
EG-6 Series Power Droid|148|14430|5|Small|1|factory
DRK-1 Probe Droid|149|14510|4|Small|1|factory
M-3PO Series Military Protocol Droid|150|14612|3|Medium|1|factory
TC Series Protocol Droid|151|14724|3|Medium|1|factory
Replica Droid|152|14795||Medium|4|replica
Guri|153|14885||Medium|10|named-replica
WSB-15 Sabotage Droid|154|15008|4|Small|7|factory
501-Z Police/Security Droid|155|15135|4|Medium|10|factory
Mark VII Inquisitor Series Seeker Droid|156|15211|4|Diminutive|6|factory
Imperial Mark IV Series Sentry Droid|157|15299|4|Diminutive|2|factory
SD-6 Hulk Infantry Droid|158|15395|4|Large|14|factory
Sith Elite Warbot|159|15533|4|Medium|5|factory
PK Worker Droid|160|15614|5|Small|2|factory'''
rows=[x.split('|') for x in ROWS.splitlines()]
assert len(rows)==29 and all(len(x)==7 for x in rows)
TXT=SRC.read_text(errors='replace').splitlines()
root_keys='classification challenge geometry abilities progression defenses durability movement anatomy processor programming combat capacity systems equipment modifications pcConstruction vehicleLink economics text exceptions fieldStates rules'.split()
records=[];evidence=[];census=[]
for i,(name,pp,a,deg,size,cl,nature) in enumerate(rows,1):
 pp=int(pp);a=int(a);end=(int(rows[i][2])-1 if i<29 else min(len(TXT),a+150))
 block=TXT[a-1:end];fragment='\n'.join(block)
 id=f'THREATS-DROID-{i:03d}'
 groups={k:{} for k in root_keys}
 r={'schemaVersion':'swse.droid.universal-source/0.1-draft','recordType':'droid-publication-source-entry',
    'identity':{'sourceEntryKey':id,'printedName':name},
    'publication':{'book':BOOK,'bookId':'THREATS','printedPageStart':pp,'printedPageEnd':pp,'pdfPageStart1Based':pp+1,
                  'textLineAnchor1Based':a,'publicationKind':'named-character' if nature=='named-replica' else 'model'},
    **groups,'certification':{'identityStatus':'txt-indexed','mechanicalStatus':'partial','runtimeStatus':'not-tested',
       'reviewNotes':'TXT-indexed publication identity; selected mechanical fields await PDF visual evidence; all runtime mechanics blocked.',
       'reviewerEvidenceRefs':[f'THREATS-CENSUS:{id}',f'{BOOK}:printed-p{pp}:TXT-line-{a}']}}
 r['classification'].update({'size':size,'statblockFormat':'droid-actor','sourceStatblockFormat':('replica-droid-actor' if 'replica' in nature else 'droid-actor'),
    'ruleEntityNature':'replica-droid' if 'replica' in nature else 'standard-droid','primaryActorAuthority':'droid'})
 if deg:r['classification']['publishedDegree']=int(deg)
 r['identity']['namedIndividual']=(nature=='named-replica')
 r['challenge']['challengeLevel']=int(cl)
 r['rules']['mechanicalExecutionStatus']='source-only'
 r['exceptions']['notes']='Canonical feats, talents, systems, weapon provenance, conditional rules and PC creation routes are not independently certified.'
 if 'replica' in nature:
  r['pcConstruction']['pcIdentityKind']='replica-droid'
  r['rules']['globalRuleReferences']=['Threats of the Galaxy, printed p153, Replica Droid Species Traits (source reference only; NO executable trait grant)']
  r['text']['sourceWarnings']=['Replica species rules are distinct from the printed individual NPC statblock; do not auto-apply traits a second time.']
 if nature=='named-replica':
  r['text']['sourceWarnings'].append('Guri is an individual named replica; do not convert into factory chassis or unrestricted PC model.')
 # Raw searchable lines for human review - DO NOT transplant mechanically until PDF verification.
 patterns=['Init','Languages','Defenses','hp','Speed','Melee','Ranged','Base Atk','Abilities','Talents','Feats','Skills','Systems','Possessions','Availability']
 selected={}
 for label in patterns:
  found=[s.strip() for s in block if re.match(r'^'+re.escape(label)+r'\b',s.strip(),re.I)]
  if found:selected[label]=found[:3] if len(found)>1 else found[0]
 evidence.append({'sourceEntryKey':id,'printedName':name,'printedPage':pp,'pdfPage1Based':pp+1,
  'txtAnchorLine1Based':a,'txtWindowEnd1Based':end,'txtWindowSha256':hashlib.sha256(fragment.encode()).hexdigest(),
  'ocrTextExcerpt':fragment,'ocrSelectedFieldCandidates':selected,
  'sourceReviewStatus':'TXT_PROVISIONAL','pdfVisualFieldChecks':{},
  'warnings':['Printed PDF has image-only text; OCR/TXT candidates are not executable or source-certification.']})
 census.append({'sourceEntryKey':id,'printedName':name,'printedPage':pp,'pdfPage1Based':pp+1,'textLineAnchor1Based':a,
  'degree':int(deg) if deg else None,'size':size,'challengeLevel':int(cl),'sourceNature':nature})
 records.append(r)
assert len(records)==29 and len({r['identity']['sourceEntryKey'] for r in records})==29
ledger={'schema':'swse.droid.source-book-hydration-ledger/0.1-partial','bookId':'THREATS','book':BOOK,
 'draftSourceEntrySchema':'swse.droid.universal-source/0.1-draft','sourceBookPdf':PDF.name,
 'scope':'Publication-specific 29 entry source index. No source mechanics may execute until independent certification.',
 'expectedPublicationClaims':29,'sourceEntries':records}
files={ROOT/'data/canonical/droids/source-books/threats.json':ledger,
 ROOT/'data/audits/droids/threats-field-evidence.json':{'schema':'swse.droid.threats.source-evidence/0.1',
 'book':BOOK,'sourceTxt':SRC.name,'sourceTxtSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
 'sourcePdf':PDF.name,'sourcePdfSha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'records':evidence},
 ROOT/'data/audits/droids/threats-census-identity.json':{'schema':'swse.droid.threats.census-parity/0.1',
 'source':'data/audits/droids/droid-publication-census.json',
 'authority':'Read-only 2026-10-29 upstream census; local copy. Printed PDF supersedes OCR for mechanical details.',
 'claims':census}}
for p in files:
 if p.exists():raise SystemExit(f'REFUSING to overwrite existing file: {p}')
for p,obj in files.items():
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n')
print('Seeded 29 immutable Threats identities: 27 standard droids, 2 replicas (one named individual). 0 mechanical certifications. No GitHub writes.')
