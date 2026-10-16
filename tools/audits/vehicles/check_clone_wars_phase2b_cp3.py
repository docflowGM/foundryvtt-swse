#!/usr/bin/env python3
"""CP3 Clone Wars original-PDF mechanical source review STRUCTURAL validator.

Does not replace visual close reading, repair old Phase 0B blockers, freeze a schema,
or certify physical weapon mounts. New checkpoints contain audit data only.
"""
import argparse,hashlib,json,zipfile
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--repo',required=True,type=Path)
p.add_argument('--source-pdf',type=Path)
p.add_argument('--previous-cp2-zip',type=Path)
p.add_argument('--require-phase1',action='store_true')
a=p.parse_args()
base=a.repo/'data/audits/vehicles'
def read(f):return json.loads((base/f).read_text(encoding='utf-8'))
ledger=read('swse-phase2b-clone-wars-cp3-per-entry-source-review-ledger.json')
mounts=read('swse-phase2b-clone-wars-cp3-weapon-mount-backlog.json')
cases=read('swse-phase2c-clone-wars-cp3-schema-discovery.json')
V='PDF_VERIFIED';S='SOURCE_SILENT_CONFIRMED';N='NOT_REVIEWED'
EXPECTED_PDF='3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6'
EXPECTED_PHASE1_BLOB='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
CP2_ENTRY_HASHES={'cw-azure-angel': 'b101dd99aa863f1a2beca442c01eaf5d66c2287410fc331f354e1113b7cad376',
 'cw-barloz-class-freighter': '2b3a89b90d0dad507a15d184b1d7df3bf66c47e983e36edad07eb508b8eeddc8',
 'cw-dagger-class-starfighter': '53ebda5f7c155b3332630e74acbf393936e49355278c0f7e74730bb7f66a5765',
 'cw-delta-7-aethersprite-interceptor-high-maneuver-variant': '65715a648a9244012c67202ab4d54ab5c4c47208e0504bf447c9e85a3085dd72',
 'cw-delta-7-aethersprite-interceptor-high-speed-variant': '60ac4a7f7a17e4631f3c0e37eb5bf80a449144a0ecc918125a86a9949736148c',
 'cw-dianoga-class-assault-starfighter': '351be0634f814326f65c61000b0100b193d44576765bc540e3ff2a58d0a97255',
 'cw-eta-2-actis-interceptor-heavy-defenses-variant': '7a2629fd9e49886844842e13588c1abcbeedbb3354c8c8d7c782c3f4c80e1bfa',
 'cw-eta-2-actis-interceptor-high-maneuver-variant': '5a7e6f740ed573b96d7ac82a2b967f91a27c7665d735855a9ddef36d31b7a7a7',
 'cw-freefall-class-starfighter': '6e46ae66674878d1b194eddeba2f337185fc8b06fba4db3149292cf0c6d8f074',
 'cw-g9-rigger': '09c539fe68cb5fd541a501025810b7327f2e6992d04376f4019c26879a8a3bf7',
 'cw-gs-100-salvage-ship': '961a4354319663539701df097c63e72a0956f3e85cce6c281f2a48656b98ad49',
 'cw-kr-tb-doomtreader': '49a57ebada3b04f0d15c743c77a2aa204607eb9e4dcc85588f14fcdc1fba856f',
 'cw-morningstar-a-assault-starfighter': 'c7af80d30ea06abc1a1c32e895f4fdaf709c42d29b94821be40f5e02065b13d3',
 'cw-pursuer-class-enforcement-ship': '04e3c744394363b14cefc6c7ea6bd71430bd7905f42869b2475782d5b999373a',
 'cw-s40k-phoenix-hawk-class-light-pinnace': '469aa0075d3ff12bdadafc748fb84f81881c666e931bf15e620567c37a3b8cbf',
 'cw-scurrg-h-6-prototype-bomber': 'd7123dd5d3154d266ab4499e8d352b5aa2bad4e4fa1c31275961d3a1c25f6b00',
 'cw-ubrikkian-seltiss-2-caravel': '19e62ae301512251e6540a19a75fa32d01cf3a83c7d1926d3e28bae81968fc3e',
 'cw-ubrikkian-seltiss-2-caravel-cabin': '33bf6262ff974761f1364a732cf3857cef1a2fc6b6054c284b83fe2b304602dc'}
CP2_CASE_HASH='4fd72b2b0d1fec12b5d6167eff4c523bc9ab7fc2edcbc4187f8cdf7ed8635754'

CP3_KEYS={'cw-cr-20-troop-carrier':166,'cw-consular-class-cruiser-charger-c70-retrofit':170,
'cw-kappa-class-shuttle':171,'cw-medstar-class-frigate':171,'cw-nu-class-attack-shuttle':172,
'cw-pelta-class-medical-frigate':172,'cw-koensayr-btl-s1-y-wing':173}
assert ledger['sourcePdfSha256']==mounts['sourcePdfSha256']==EXPECTED_PDF
assert ledger['phase1ProvenanceBlobSha']==EXPECTED_PHASE1_BLOB
assert ledger['sourceBook']=='Clone Wars Campaign Guide'
assert not cases['productionMutationAuthorized'] and cases['status']=='DISCOVERY_ONLY_NOT_FROZEN'
assert len(cases['cases'])==20 and cases['counts']=={'sourcebookLocalCases':20,'previousSotGGlobalCasesUnaffected':155}
assert hashlib.sha256(json.dumps(cases['cases'][:12],sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==CP2_CASE_HASH
assert len({c['caseId'] for c in cases['cases']})==20
assert {c['caseId'] for c in cases['cases'][-8:]}=={f'CWCP3-{i:02}' for i in range(1,9)}
assert all(c['productionMutationAuthorized'] is False for c in cases['cases'])
for cp in ('checkpoint1','checkpoint2','checkpoint3'):
 ck=ledger[cp]
 assert ck['sourceReviewCompleteForTranche'] and not ck['sourceReviewCompleteForBook']
 assert not ck['fullMechanicalBookCertification'] and not ck['universalSchemaFrozen'] and not ck['productionHydrationAuthorized']
assert set(ledger['checkpoint3']['sourceEntriesReviewed'])==set(CP3_KEYS)
assert ledger['checkpoint3']['printedPages']==list(range(166,174))
E=ledger['entries'];idx={e['sourceEntryKey']:e for e in E}
assert len(idx)==len(E)==41
assert set(CP2_ENTRY_HASHES)<=set(idx)
assert set(CP3_KEYS)=={e['sourceEntryKey'] for e in E if e['reviewedPDFPages']}-set(CP2_ENTRY_HASHES)
assert len([e for e in E if e['reviewedPDFPages']])==25
assert len([e for e in E if not e['reviewedPDFPages']])==16
assert ledger['counts']==dict(publicationShipClaims=41,primaryPdfCloseReads=25,primaryPdfCloseReadsOutstanding=16,strictFullFieldAndPhysicalWeaponMountCertificates=0,strictCertificatesOutstanding=41,attackGroupRowsReviewed=45,sourceConflictRecordCount=1)
for k,v in CP2_ENTRY_HASHES.items():
 if k=='cw-azure-angel': continue  # explicit corrective addendum below
 d=json.dumps(idx[k],sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()
 assert hashlib.sha256(d).hexdigest()==v,'Unexpected CP1/CP2 record mutation: '+k
assert ledger['checkpoint3']['checkpoint1And2UnchangedRecordCount']==17
assert ledger['checkpoint3']['checkpoint1And2RecordsRetainedUnmodified'] is False
assert ledger['checkpoint3']['carryForwardCorrections']==[{'sourceEntryKey':'cw-azure-angel','printedPage':138,'field':'printedFacts.defenses.shieldRating','oldLedgerState':S,'correctedFromOriginalPDF':15,'kind':'PRIOR_CHECKPOINT_TRANSCRIPTION_ERROR_NOT_SOURCE_CONFLICT'}]
azure=idx['cw-azure-angel']
assert azure['printedFacts']['defenses']['shieldRating']==15
assert azure['sourceFieldStates']['shieldRating']==V
assert azure['configurationAndRuleFindings'][-1]['finding'].startswith('CP3 corrective addendum to CP2 transcription')
assert all('No shield rating printed' not in b['issue'] for b in azure['blockingFindings'])
assert set(ledger['checkpoint1']['sourceEntriesReviewed'])|set(ledger['checkpoint2']['sourceEntriesReviewed'])==set(CP2_ENTRY_HASHES)
assert len(set(ledger['checkpoint1']['sourceEntriesReviewed'])|set(ledger['checkpoint2']['sourceEntriesReviewed']))==18
assert set(ledger['checkpoint3']['sourceEntriesReviewed']).isdisjoint(CP2_ENTRY_HASHES)
assert len(mounts['entries'])==41
M={m['sourceEntryKey']:m for m in mounts['entries']};assert set(M)==set(idx)
for e in E:
 k=e['sourceEntryKey']; reviewed=bool(e['reviewedPDFPages'])
 assert not e['fullFieldCertified'] and not e['fullWeaponMountReconciled']
 assert set(e['fieldGroups'])==set(ledger['fieldGroups'])
 assert set(e['fieldGroups'].values())<=set(ledger['stateSemantics'])
 if not reviewed:
  assert e['endPageReviewStatus']==N and e['narrativeMechanicsStatus']==N
  assert not e['printedFacts'] and not e['mountAndFiringGroups']
  assert set(e['fieldGroups'].values())=={N}
 else:
  assert e['endPageReviewStatus']==V and e['narrativeMechanicsStatus']==V
  assert e['sourceEvidence']['printedPages']==e['reviewedPDFPages']
  assert e['printedStatblockStartPage'] in e['reviewedPDFPages']
  assert not any(val==N for val in e['fieldGroups'].values())
  assert e['printedFacts']['cl']>=0 and e['printedFacts']['durability']['hitPoints']>0
  assert e['blockingFindings']
 for g in e['mountAndFiringGroups']:
  assert {'weaponLabel','station','attackBonus','damage','sourcePage','hardwareCount','firingArc','batteryCount'}<=set(g)
  assert g['sourcePage'] in e['reviewedPDFPages']
  assert isinstance(g['attackBonus'],int)
  assert isinstance(g['hardwareCount'],int) or g['hardwareCount']==S
  assert isinstance(g['batteryCount'],int) or g['batteryCount']==S
  assert g['firingArc']==S or isinstance(g['firingArc'],str)
 m=M[k];assert m['printedPage']==e['printedStatblockStartPage']
 assert m['pdfCloseReadComplete']==reviewed and not m['strictFieldAndMountCertified']
 assert m['mountRowCount']==len(e['mountAndFiringGroups'])
 for fld in ('hardwareCount','firingArc','batteryCount'):
  assert m['sourceSilentMountIndices'][fld]==[i for i,g in enumerate(e['mountAndFiringGroups']) if g[fld]==S]
for f in ('hardwareCount','firingArc','batteryCount'):
 assert mounts['counts'][f]==sum(len(m['sourceSilentMountIndices'][f]) for m in mounts['entries'])
assert mounts['counts']==dict(identities=41,sourceReviewed=25,unreviewed=16,strictMechanicalCertificates=0,attackGroupsReviewed=45,hardwareCount=33,firingArc=45,batteryCount=39)
assert sum(map(lambda e:len(e['mountAndFiringGroups']),E))==45
assert sum(len(idx[k]['mountAndFiringGroups']) for k in CP3_KEYS)==17
assert sum(1 for e in E for f in e['blockingFindings'] if f['status']=='SOURCE_CONFLICT_PRESERVED')==1
assert idx['cw-ubrikkian-seltiss-2-caravel']['mountAndFiringGroups'][0]['printedRangedAttackBonus']==2
assert idx['cw-ubrikkian-seltiss-2-caravel']['mountAndFiringGroups'][0]['printedWeaponRowAttackBonus']==4

# Checkpoint 3 high-risk primary-source identity/mechanics sentinels.
cr=idx['cw-cr-20-troop-carrier']; f=cr['printedFacts']; g=cr['mountAndFiringGroups']
assert (f['cl'],f['durability']['hitPoints'],f['defenses']['shieldRating'],f['crew'],f['carriedCraft'])==(13,300,25,'6 (expert)','12 speeder bikes')
assert [(x['station'],x['attackBonus'],x['autofireAttackBonus'],x['damage']) for x in g]==[('pilot',10,5,'6d10x5'),('co-pilot',8,3,'6d10x5')]
ch=idx['cw-consular-class-cruiser-charger-c70-retrofit']; cf=ch['printedFacts']; cg=ch['mountAndFiringGroups']
assert ch['sourceEntryKey']!='sotg-consular-class-cruiser'
assert (cf['cl'],cf['durability']['hitPoints'],cf['defenses']['shieldRating'],cf['hyperspace']['hyperdrive'])==(16,960,120,'x1.5')
assert [(g['batteryCount'],g['hardwareCount']) for g in cg]==[(2,S),(S,2)]
assert cg[0]['attackBonusAgainstSmallerThanColossal']==-12
k=idx['cw-kappa-class-shuttle'];kf=k['printedFacts'];kg=k['mountAndFiringGroups']
assert (kf['cl'],kf['crew'],kf['carriedCraft'],kf['hyperspace']['backup'])==(11,'4 (expert)','2 AT-RT walkers or 2 ISP platforms','x18')
assert [(g['attackScale'],g['station'],g['hardwareCount']) for g in kg]==[('starship','co-pilot',2),('character','gunners',2)]
me=idx['cw-medstar-class-frigate'];mf=me['printedFacts']; mg=me['mountAndFiringGroups']
assert (mf['cl'],mf['crew'],mf['passengers'],mf['carriedCraft'])==(15,'440 (skilled)',655,'up to 12 Colossal vessels')
assert [(g['batteryCount'],g['station']) for g in mg]==[(1,'5 gunners'),(2,'5 gunners'),(S,'pilot/copilot/gunner')]
nu=idx['cw-nu-class-attack-shuttle'];nf=nu['printedFacts']; ng=nu['mountAndFiringGroups']
assert (nf['cl'],nf['durability']['threshold'],nf['defenses']['shieldRating'],nf['crew'])==(12,25,30,'2 (expert)')
assert nf['hyperspace'] is None and nu['fieldGroups']['hyperdrive']==S and nu['sourceFieldStates']['hyperdrive']==S
assert [g['station'] for g in ng]==['pilot','copilot']
pe=idx['cw-pelta-class-medical-frigate'];pf=pe['printedFacts'];pg=pe['mountAndFiringGroups']
assert pe['reviewedPDFPages']==[172,173] and pf['cl']==16 and pf['durability']['hitPoints']==760
assert pf['printedAttackOptionsLiteral']=='if any' and pf['combat']['attackOptions']==['printed token: if any']
assert [(g['batteryCount'],g['station'],g['attackBonus']) for g in pg]==[(2,'6 gunners',17),(3,'6 gunners',17),(1,'3 gunners',11)]
assert (pg[0]['attackBonusAgainstSmallerThanColossal'],pg[2]['attackBonusAgainstSmallerThanColossal'])==(-3,-9)
y=idx['cw-koensayr-btl-s1-y-wing']; yf=y['printedFacts']; yg=y['mountAndFiringGroups']
assert (yf['cl'],yf['durability']['hitPoints'],yf['defenses']['shieldRating'],yf['payload'])==(10,110,10,'10 proton torpedoes')
assert [(g['station'],g['attackBonus']) for g in yg]==[('pilot',7),('gunner',5),('gunner',5)]
assert yg[1]['damage']=='4d10x2 ion' and yg[2]['damage']=='9d10x2; 4-square splash'
assert yf['skills']['mechanicsWithAstromech']==13 and yf['skills']['useComputerWithAstromech']==13
assert all(g['firingArc']==S for k in CP3_KEYS for g in idx[k]['mountAndFiringGroups'])

# Optional baseline comparisons; absence of full repo cannot be relabeled a pass.
if a.previous_cp2_zip:
 with zipfile.ZipFile(a.previous_cp2_zip) as z:
  prefix='data/audits/vehicles/'
  past=json.loads(z.read(prefix+'swse-phase2b-clone-wars-cp2-per-entry-source-review-ledger.json'))
  pastcases=json.loads(z.read(prefix+'swse-phase2c-clone-wars-cp2-schema-discovery.json'))
  assert past['sourcePdfSha256']==EXPECTED_PDF
  old={e['sourceEntryKey']:e for e in past['entries'] if e['reviewedPDFPages']}
  assert {k:v for k,v in old.items() if k!='cw-azure-angel'}=={k:idx[k] for k in CP2_ENTRY_HASHES if k!='cw-azure-angel'}
  oldaz=old['cw-azure-angel']
  assert 'shieldRating' not in oldaz['printedFacts']['defenses'] and oldaz['sourceFieldStates']['shieldRating']==S
  assert len(azure['configurationAndRuleFindings'])==len(oldaz['configurationAndRuleFindings'])+1
  assert azure['configurationAndRuleFindings'][:-1]==oldaz['configurationAndRuleFindings']
  assert len(oldaz['blockingFindings'])==len(azure['blockingFindings'])+1
  assert oldaz['blockingFindings'][:-1]==azure['blockingFindings']
  assert pastcases['cases']==cases['cases'][:12]
 print('PASS: CP2 ZIP - 17 exact retained records, one explicit Azure SR15 correction; 12 prior cases intact')
else:print('LIMIT: CP2 ZIP byte-level comparison not run (embedded 18-record SHA gates passed)')
if a.source_pdf:
 h=hashlib.sha256()
 with a.source_pdf.open('rb') as z:
  for chnk in iter(lambda:z.read(4*1024*1024),b''):h.update(chnk)
 assert h.hexdigest()==EXPECTED_PDF
 print('PASS: original scanned PDF SHA256 fingerprint')
else:print('LIMIT: no PDF fingerprint tested')
phase1=base/'swse-phase1-vehicle-provenance.json'
if a.require_phase1 or phase1.exists():
 p1=json.loads(phase1.read_text())
 b=next(b for b in p1['books'] if b['book']=='Clone Wars Campaign Guide')
 source={e['sourceEntryKey']:e['printedStatblockPage'] for e in b['entries']}
 assert len(source)==41 and source=={e['sourceEntryKey']:e['printedStatblockStartPage'] for e in E}
 print('PASS: actual Phase1 JSON 41 keys/pages match')
else:print('LIMIT: full Phase1 JSON integration not run (remote provenance separately checked)')
print('PASS: 41 identities, 25 visually reviewed source records, 16 pending, 45 attack groups')
print('PASS: 17 CP1/CP2 records unchanged, Azure Angel SR15 source correction, 20 discovery-only schema cases, original Seltiss-2 conflict retained')
print('PASS: CP3 seven ship-specific source sentinels, no production mutation, no full mechanical certification')
print('LIMIT: full old SotG validator suite and historical Phase0B gate require original repository overlay')
