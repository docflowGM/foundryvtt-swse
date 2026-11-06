#!/usr/bin/env python3
"""CP16 final primary-source-close-read continuity certification gate (not full mounts)."""
import argparse,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--repo',type=Path,required=True);p.add_argument('--source-pdf',type=Path)
a=p.parse_args();D=a.repo.resolve()/'data/audits/vehicles'
read=lambda filename:json.loads((D/filename).read_text(encoding='utf-8'))
old=read('swse-phase2b-sotg-cp15-per-entry-certification-ledger.json')
cur=read('swse-phase2b-sotg-cp16-per-entry-certification-ledger.json')
roll=read('swse-phase2b-sotg-rolling-book-status.json')
r={x['sourceEntryKey']:x for x in roll['sourceEntryStatus']}
O={x['sourceEntryKey']:x for x in old['entries']}
C={x['sourceEntryKey']:x for x in cur['entries']}
assert len(O)==len(C)==len(r)==104 and O.keys()==C.keys()==r.keys()
assert cur['sourcePdfSha256']==old['sourcePdfSha256']
assert cur['fieldGroups']==old['fieldGroups'] and cur['stateSemantics']==old['stateSemantics']
for n in range(8,16):assert old['checkpoint'+str(n)]==cur['checkpoint'+str(n)],'CP'+str(n)+' historical metadata mutated'
new=[]
for k,e in C.items():
 prev=O[k]
 assert e['printedName']==prev['printedName']==r[k]['printedName']
 assert e['printedStatblockStartPage']==prev['printedStatblockStartPage']==r[k]['proposedPrintedStatblockStartPage']
 if prev['reviewedPDFPages']:
  assert e==prev,'Historical source entry changed: '+k
 else:
  new.append(e)
  assert e['printedStatblockStartPage'] in e['reviewedPDFPages']
  assert all(154<=z<=160 for z in e['reviewedPDFPages'])
  assert e['endPageReviewStatus']=='PDF_VERIFIED' and e['narrativeMechanicsStatus']=='PDF_VERIFIED'
  assert e['weaponMountReconciliationStatus']=='PDF_VERIFIED_PARTIAL'
  assert not e['fullFieldCertified'] and not e['fullWeaponMountReconciled']
  assert set(e['fieldGroups'])==set(cur['fieldGroups'])
  assert set(e['fieldGroups'].values())<=set(cur['stateSemantics'])
  assert 'NOT_REVIEWED' not in e['fieldGroups'].values()
  assert e['printedFacts'] and e['mountAndFiringGroups'] and e['configurationAndRuleFindings']
  assert e['sourceEvidence']['printedPages']==e['reviewedPDFPages']
  for row in e['mountAndFiringGroups']:
   assert {'weaponLabel','station','attackBonus','damage','sourcePage','hardwareCount','firingArc','batteryCount'}<=set(row)
   assert row['sourcePage'] in e['reviewedPDFPages']
  assert e['blockingFindings'] and all('status' in b for b in e['blockingFindings'])
assert len(new)==8
assert sorted(e['printedStatblockStartPage'] for e in new)==[154,155,156,156,158,159,159,160]
assert sum(bool(e['reviewedPDFPages']) for e in C.values())==104
assert len([e for e in C.values() if e['fullFieldCertified']])==4
assert len([e for e in C.values() if e['fullWeaponMountReconciled']])==4
assert cur['counts']==dict(historicalSotGSourceClaims=104,newFullPageStatblockAndImmediateNarrativeVisualReviews=104,completeFieldCertified=4,completePhysicalWeaponMountReconciliations=4,fullBookCertification=False,unreviewedCompleteSourceClaims=0)
assert cur['checkpoint16']['sourceCloseReadComplete'] is True
assert cur['checkpoint16']['sourceCompleteButMechanicalCertificationIncomplete'] is True
assert cur['checkpoint16']['productionHydrationAuthorized'] is False and cur['checkpoint16']['schemaFreeze'] is False
assert set(cur['checkpoint16']['reviewedSourceKeys'])=={e['sourceEntryKey'] for e in new}
byname={e['printedName']:e for e in new}
a0=byname['Corellian YT-1300 Transport']; assert a0['printedFacts']['defenses'].get('shieldRating') is None
assert a0['printedFacts']['specialDefensesOrRules']['unusedEmplacements']['points']==10
assert a0['reviewedPDFPages']==[154,157]
a2=byname['Corellian YT-2000'];assert a2['printedFacts']['skills']['pilot']==-2
assert a2['printedFacts']['skills']['pilotPrintedToken']=='Pilot + -2'
assert a2['mountAndFiringGroups'][0]['hardwareCount']==2
assert a2['printedFacts']['specialDefensesOrRules']['mechanicsModifyOrRepair']['modifier']==-2
a24=byname['Corellian YT-2400'];assert a24['printedFacts']['skills']['pilot']==-1
assert a24['printedFacts']['skills']['pilotPrintedToken']=='Pilot + -1'
assert a24['printedFacts']['specialDefensesOrRules']['escapePod']['modifier']==5
falcon=byname['Millennium Falcon'];assert falcon['printedFacts']['cl']==12
assert falcon['printedFacts']['specialDefensesOrRules']['sizeClassificationOverride']['effectiveSize']=='Gargantuan starfighter'
assert falcon['mountAndFiringGroups'][0]['hardwareCount']==2
assert falcon['mountAndFiringGroups'][2]['damage']=='3d12, character scale only'
assert falcon['printedFacts']['payload']=='8 medium concussion missiles'
y=byname['Koensayr BTL-S3 Y-wing'];assert y['mountAndFiringGroups'][1]['hardwareCount']==2
assert y['printedFacts']['skills']['mechanicsWithAstromechPrinted']==13
lp=byname['Koensayr BTL-A4 LP "Longprobe"']
assert lp['printedFacts']['crew']['printed'].startswith('1 plus astromech')
assert all(w['station']=='pilot' for w in lp['mountAndFiringGroups'])
assert lp['printedFacts']['skills']['useComputerSensorsWithAstromechPrinted']==18
courier=byname['Koensayr BTL-S3 "Courier"']
assert len(courier['mountAndFiringGroups'])==2
assert courier['printedFacts']['specialDefensesOrRules']['escapeCockpit']['acrobaticsCheckRequiredToEnter'] is False
assert courier['printedFacts']['payload']=='4 proton torpedoes'
z=byname['Incom/Subpro Z-95 Headhunter']
assert z['printedFacts']['specialDefensesOrRules']['stockHyperdriveAbsent']['explicitlyPrintedInNarrative']
assert z['printedFacts']['payload']=='6 medium concussion missiles'
sold=read('swse-phase2c-vehicle-v06-pressure-cases-cp15.json');snew=read('swse-phase2c-vehicle-v06-pressure-cases-cp16.json')
assert snew['cases'][:132]==sold['cases']
assert snew['count']==155==len(snew['cases'])
assert snew['checkpoint16NewCases']==23
assert len({x['caseId'] for x in snew['cases']})==155
assert all(x['gateStatus']=='OPEN_SCHEMA_DESIGN_TEST' and x['productionMutationAuthorized'] is False for x in snew['cases'])
assert snew['status']=='DISCOVERY_ONLY_NOT_FROZEN'
closure=read('swse-phase2b-sotg-cp16-book-source-closure-mount-backlog.json')
assert closure['gates']['sourceReview']=='PASS' and closure['gates']['fullBookCertification'] is False
assert closure['gates']['productionHydration']=='NOT_AUTHORIZED'
assert closure['sourcePdfSha256']==cur['sourcePdfSha256']
assert closure['counts']['bookSourceEntries']==closure['counts']['bookSourceCloseReads']==104
assert closure['counts']['completeStrictFieldAndMountCertificates']==4
assert closure['counts']['remainingStrictCertifications']==100
assert len(closure['entries'])==104
assert {x['sourceEntryKey'] for x in closure['entries']}==C.keys()
assert closure['counts']['publishedAttackGroupRecords']==sum(len(e['mountAndFiringGroups']) for e in C.values())==258
assert all(x['primaryPdfCloseReadCompleted'] for x in closure['entries'])
for row in closure['entries']:
 e=C[row['sourceEntryKey']]
 assert row['printedName']==e['printedName'] and row['printedStatblockStartPage']==e['printedStatblockStartPage']
 assert row['strictFieldCertified']==e['fullFieldCertified']
 assert row['strictWeaponMountReconciled']==e['fullWeaponMountReconciled']
 assert row['mountGroupCount']==len(e['mountAndFiringGroups'])
 for f,indices in row['mountRowSourceSilentByField'].items():
  assert all(e['mountAndFiringGroups'][i][f]=='SOURCE_SILENT_CONFIRMED' for i in indices)
 for f,indices in row['mountRowLegacyMissingFieldByField'].items():
  assert all(f not in e['mountAndFiringGroups'][i] for i in indices)
if a.source_pdf:
 h=hashlib.sha256()
 with a.source_pdf.open('rb') as f:
  for block in iter(lambda:f.read(1048576),b''):h.update(block)
 assert h.hexdigest()==cur['sourcePdfSha256'],'Mismatched primary PDF SHA'
print('PASS CP16: 104/104 original publication identities preserved, all source close-reads present')
print('PASS CP16: all 96 prior reviewed entries immutable; 8 p154-160 new reviews')
print('PASS CP16: 4 strict certifications unchanged; 100 noncertified source entries remain')
print('PASS CP16: YT-family, Falcon, Y-wing variants and Z-95 source-specific rules validated')
print('PASS CP16: pilot skill source anomalies preserved without changing -2 and -1 to positive')
print('PASS CP16: 155 append-only discovery cases; schema and production hydration remain blocked')
print('PASS CP16: 104-entry source-close-read closure backlog matches 258 mounted/firing attack groups')
print('LIMIT: structural validation does not independently certify complete physical weapon mounts or all primary PDF transcription')
