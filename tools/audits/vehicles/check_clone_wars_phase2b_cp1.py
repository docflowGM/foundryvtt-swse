#!/usr/bin/env python3
"""Clone Wars Checkpoint 1: audit-only structural / source-continuity validator.

Not a mechanical certificate. Primary printed text cannot be proven by JSON checks;
PDF visual inspection is the distinct source-authority operation.
"""
import argparse
import hashlib
import json
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--repo',type=Path,required=True)
parser.add_argument('--source-pdf',type=Path)
parser.add_argument('--require-phase1',action='store_true')
args=parser.parse_args()
root=args.repo.resolve(); data=root/'data/audits/vehicles'
read=lambda name:json.loads((data/name).read_text(encoding='utf-8'))
ledger=read('swse-phase2b-clone-wars-cp1-per-entry-source-review-ledger.json')
mounts=read('swse-phase2b-clone-wars-cp1-weapon-mount-backlog.json')
pressure=read('swse-phase2c-clone-wars-cp1-schema-discovery.json')
assert ledger['sourceBook']=='Clone Wars Campaign Guide'
assert ledger['sourcePdfSha256']==mounts['sourcePdfSha256']
assert not ledger['checkpoint1']['fullMechanicalBookCertification']
assert not ledger['checkpoint1']['productionHydrationAuthorized']
assert not ledger['checkpoint1']['universalSchemaFrozen']
assert not pressure['productionMutationAuthorized'] and pressure['status']=='DISCOVERY_ONLY_NOT_FROZEN'
entries=ledger['entries']
keys={e['sourceEntryKey'] for e in entries}
assert len(entries)==len(keys)==41,'Exactly 41 unique Phase 1 identities must remain'
assert len(mounts['entries'])==41 and {x['sourceEntryKey'] for x in mounts['entries']}==keys
assert all(e['sourceEntryKey'].startswith('cw-') for e in entries)
source_reviewed={e['sourceEntryKey']:e for e in entries if e['reviewedPDFPages']}
pending={e['sourceEntryKey']:e for e in entries if not e['reviewedPDFPages']}
assert len(source_reviewed)==13 and len(pending)==28
assert {e['printedStatblockStartPage'] for e in source_reviewed.values()}=={76,78,79,80,81,82,83,84,85}
assert len(ledger['checkpoint1']['printedPages'])==10 and ledger['checkpoint1']['printedPages']==list(range(76,86))
assert set(ledger['checkpoint1']['sourceEntriesReviewed'])==set(source_reviewed)
assert ledger['counts']==dict(publicationShipClaims=41,primaryPdfCloseReads=13,primaryPdfCloseReadsOutstanding=28,
 strictFullFieldAndPhysicalWeaponMountCertificates=0,strictCertificatesOutstanding=41,attackGroupRowsReviewed=20,sourceConflictRecordCount=1)
for e in entries:
 assert set(e['fieldGroups'])==set(ledger['fieldGroups'])
 assert not e['fullFieldCertified'] and not e['fullWeaponMountReconciled']
 assert e['printedStatblockStartPage']>0
 if e['sourceEntryKey'] in pending:
  assert e['endPageReviewStatus']=='NOT_REVIEWED'
  assert not e['printedFacts'] and not e['mountAndFiringGroups']
  assert e['narrativeMechanicsStatus']=='NOT_REVIEWED'
  assert set(e['fieldGroups'].values())=={'NOT_REVIEWED'}
  continue
 assert e['endPageReviewStatus']=='PDF_VERIFIED'
 assert e['narrativeMechanicsStatus']=='PDF_VERIFIED'
 assert e['sourceEvidence']['printedPages']==e['reviewedPDFPages']
 assert e['printedStatblockStartPage'] in e['reviewedPDFPages']
 assert set(e['fieldGroups'].values())<=set(ledger['stateSemantics'])-{'NOT_REVIEWED'}
 assert e['printedFacts']['cl']>=0 and e['printedFacts']['durability']['hitPoints']>0
 assert e['printedFacts']['combat']['ranged'] is not None
 assert e['blockingFindings'] and all(f['status'] in ('SOURCE_SILENT_CONFIRMED','SOURCE_CONFLICT_PRESERVED') for f in e['blockingFindings'])
 assert e['configurationAndRuleFindings']
 for weapon in e['mountAndFiringGroups']:
  assert {'weaponLabel','station','attackBonus','damage','sourcePage','hardwareCount','firingArc','batteryCount'}<=set(weapon)
  assert weapon['sourcePage'] in e['reviewedPDFPages']
  assert weapon['damage'] and weapon['weaponLabel']
assert sum(len(e['mountAndFiringGroups']) for e in source_reviewed.values())==20
assert mounts['counts']['attackGroupsReviewed']==20
assert mounts['counts']['sourceReviewed']==13 and mounts['counts']['unreviewed']==28
index={e['sourceEntryKey']:e for e in mounts['entries']}
for e in entries:
 row=index[e['sourceEntryKey']]
 assert row['printedPage']==e['printedStatblockStartPage']
 assert row['pdfCloseReadComplete']==bool(e['reviewedPDFPages'])
 assert row['mountRowCount']==len(e['mountAndFiringGroups'])
 assert not row['strictFieldAndMountCertified']
 for field, indices in row['sourceSilentMountIndices'].items():
  assert indices==[n for n,weapon in enumerate(e['mountAndFiringGroups']) if weapon[field]=='SOURCE_SILENT_CONFIRMED']
for field in ('hardwareCount','firingArc','batteryCount'):
 assert mounts['counts'][field]==sum(len(x['sourceSilentMountIndices'][field]) for x in mounts['entries'])
assert pressure['counts']=={'sourcebookLocalCases':7,'previousSotGGlobalCasesUnaffected':155}
assert len(pressure['cases'])==7 and len({e['caseId'] for e in pressure['cases']})==7
for case in pressure['cases']:
 assert case['gateStatus']=='OPEN_SCHEMA_DESIGN_TEST' and case['productionMutationAuthorized'] is False
 assert set(case['sourceEntryKeys'])<=keys
# Specific high-risk source sentinels
bar=source_reviewed['cw-barloz-class-freighter']
assert bar['mountAndFiringGroups'][0]['hardwareCount']==1 and bar['reviewedPDFPages']==[75,76,77]
g9=source_reviewed['cw-g9-rigger']
assert len(g9['mountAndFiringGroups'])==2 and g9['mountAndFiringGroups'][1]['station']=='copilot'
kr=source_reviewed['cw-kr-tb-doomtreader']
assert kr['printedFacts']['skills']['mechanicsWithAstromech']==13
pursuer=source_reviewed['cw-pursuer-class-enforcement-ship']
assert pursuer['printedFacts']['passengers']=={'total':7,'passengers':2,'prisoners':5}
main=source_reviewed['cw-ubrikkian-seltiss-2-caravel'];cabin=source_reviewed['cw-ubrikkian-seltiss-2-caravel-cabin']
assert main['printedFacts']['cl']==9 and cabin['printedFacts']['cl']==3
assert main['mountAndFiringGroups'][0]['printedRangedAttackBonus']==2
assert main['mountAndFiringGroups'][0]['printedWeaponRowAttackBonus']==4
assert sum(x['status']=='SOURCE_CONFLICT_PRESERVED' for e in source_reviewed.values() for x in e['blockingFindings'])==1
assert cabin['printedFacts']['type']=='Huge space transport' and not cabin['mountAndFiringGroups']
dagger=source_reviewed['cw-dagger-class-starfighter']
assert 'multiplier not printed' in dagger['printedFacts']['hyperspace']['hyperdrive']
dianoga=source_reviewed['cw-dianoga-class-assault-starfighter']
assert dianoga['mountAndFiringGroups'][0]['hardwareCount']==4
freefall=source_reviewed['cw-freefall-class-starfighter']
assert freefall['printedFacts']['payload']=='20 proton bombs' and len(freefall['mountAndFiringGroups'])==2
morning=source_reviewed['cw-morningstar-a-assault-starfighter']
assert morning['printedFacts']['payload']=='4 missiles' and morning['mountAndFiringGroups'][1]['hardwareCount']==1
phoenix=source_reviewed['cw-s40k-phoenix-hawk-class-light-pinnace']
assert phoenix['printedFacts']['crew']=='1 or 2'
scurrg=source_reviewed['cw-scurrg-h-6-prototype-bomber']
assert scurrg['mountAndFiringGroups'][0]['hardwareCount']==6
assert scurrg['mountAndFiringGroups'][2]['vsSmallerThanColossalAttackBonus']==-13
assert any('10 rounds' in f['finding'] for f in scurrg['configurationAndRuleFindings'])
# Original Phase 1 provenance is an authoritative external identity gate, not overwritten by this package.
phase1path=data/'swse-phase1-vehicle-provenance.json'
if phase1path.exists():
 prov=json.loads(phase1path.read_text(encoding='utf-8'))
 book=next(b for b in prov['books'] if b['book']=='Clone Wars Campaign Guide')
 assert len(book['entries'])==41
 assert {x['sourceEntryKey']:(x['shipName'],x['printedStatblockPage']) for x in book['entries']}=={x['sourceEntryKey']:(x['printedName'],x['printedStatblockStartPage']) for x in entries},'Mismatch from authoritative Phase 1 Clone Wars identities/pages'
 print('PASS: all 41 original Phase 1 publication identities and page references unchanged')
else:
 assert not args.require_phase1,'--require-phase1 set but authoritative provenance not supplied'
 print('WARNING: Phase 1 provenance not in the supplied changed-files-only overlay; compare to actual repository when integrated')
if args.source_pdf:
 sha=hashlib.sha256()
 with args.source_pdf.open('rb') as stream:
  for chunk in iter(lambda:stream.read(1024*1024),b''):sha.update(chunk)
 assert sha.hexdigest()==ledger['sourcePdfSha256'],'Unexpected primary PDF fingerprint'
 print('PASS: primary Clone Wars scanned PDF hash matches CP1 ledger')
print('PASS: 13/41 visually reviewed, 28 not reviewed; 20 attack groups; 0 strict mechanical certificates')
print('PASS: Seltiss main/cabin separation, original battery attack conflict, four-laser Dianoga, conditional crew/freefall and Scurrg evidence retained')
print('PASS: seven discovery-only schema cases, no schema freeze or production hydration')
print('LIMIT: structural validators cannot independently certify handwritten transcription or source-silent mount fields')
