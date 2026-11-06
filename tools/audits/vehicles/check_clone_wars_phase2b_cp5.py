#!/usr/bin/env python3
"""Clone Wars 41/41 source close-read validator. Does NOT certify physical weapon mounts."""
import argparse,json,hashlib,zipfile
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--repo',required=True,type=Path)
p.add_argument('--source-pdf',type=Path)
p.add_argument('--previous-cp4-zip',type=Path)
p.add_argument('--require-phase1',action='store_true')
a=p.parse_args();base=a.repo/'data/audits/vehicles'
def read(f):return json.loads((base/f).read_text(encoding='utf-8'))
L=read('swse-phase2b-clone-wars-cp5-book-source-closure-ledger.json')
M=read('swse-phase2b-clone-wars-cp5-book-source-closure-mount-backlog.json')
C=read('swse-phase2c-clone-wars-cp5-schema-discovery.json')
V='PDF_VERIFIED';S='SOURCE_SILENT_CONFIRMED';N='NOT_REVIEWED';P='SOURCE_CONFLICT_PRESERVED'
PDF_SHA='3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6'
PHASE1_BLOB_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
PREV_HASHES={'cw-azure-angel': '026ca2110ae5027c19836ee2d2201d10e663006bc496b183535f22efd213fed3',
 'cw-barloz-class-freighter': '2b3a89b90d0dad507a15d184b1d7df3bf66c47e983e36edad07eb508b8eeddc8',
 'cw-bc-714-luxury-transport': 'f762c0b8e7b3b0890c5b15b9c10008f789e1f36207017b70428b0297c3e820b6',
 'cw-belbullab-heavy-starfighter': '300ca1adb8203d9757180a3631ff69a4fade67e329ea14e5682de190dbd0aae9',
 'cw-c-9979-landing-craft': '1662ae79c655fe259af19ac9fd220707e57f4dd48023c494cc25f8298bba34ec',
 'cw-cis-advanced-starfighter': '7fd19bbfb982eb015a2f5a389812db57c2c5ef82d39b5b52124b1dc629de02e8',
 'cw-consular-class-cruiser-charger-c70-retrofit': 'e7d9bb7865a6ed712e8b790dca64dd7b5b0484bad921a04299130a04bacf4638',
 'cw-cr-20-troop-carrier': '036d05888cb735cc3446b87811cf092a3acd04c4f1ccac005868dfc9b7d85344',
 'cw-dagger-class-starfighter': '53ebda5f7c155b3332630e74acbf393936e49355278c0f7e74730bb7f66a5765',
 'cw-delta-7-aethersprite-interceptor-high-maneuver-variant': '65715a648a9244012c67202ab4d54ab5c4c47208e0504bf447c9e85a3085dd72',
 'cw-delta-7-aethersprite-interceptor-high-speed-variant': '60ac4a7f7a17e4631f3c0e37eb5bf80a449144a0ecc918125a86a9949736148c',
 'cw-diamond-class-cruiser': 'e29591cfffb4556e052b5509f688fbb090b552721d9ddac97ef8049398c9e0f6',
 'cw-dianoga-class-assault-starfighter': '351be0634f814326f65c61000b0100b193d44576765bc540e3ff2a58d0a97255',
 'cw-droch-class-boarding-ship': '83605952e98ea6fb3b9123426d4164cb41da5b877db978f5891f5b32f29219b5',
 'cw-eta-2-actis-interceptor-heavy-defenses-variant': '7a2629fd9e49886844842e13588c1abcbeedbb3354c8c8d7c782c3f4c80e1bfa',
 'cw-eta-2-actis-interceptor-high-maneuver-variant': '5a7e6f740ed573b96d7ac82a2b967f91a27c7665d735855a9ddef36d31b7a7a7',
 'cw-freefall-class-starfighter': '6e46ae66674878d1b194eddeba2f337185fc8b06fba4db3149292cf0c6d8f074',
 'cw-g9-rigger': '09c539fe68cb5fd541a501025810b7327f2e6992d04376f4019c26879a8a3bf7',
 'cw-gs-100-salvage-ship': '961a4354319663539701df097c63e72a0956f3e85cce6c281f2a48656b98ad49',
 'cw-hardcell-class-transport': '5f3d27bf446bfb4064d26985d360e5f1381552e2810fa8d6ab26d4a015ac4051',
 'cw-hyena-class-bomber': 'c74429622cb58cd5284391ffca6046fa97ef3bdc04754d7e41eaad90d7b22d12',
 'cw-kappa-class-shuttle': '8c4024a75b019962550f32e3f3d3bda1fc21f8cc3eac9b2b7e8944e61eaec4b2',
 'cw-koensayr-btl-s1-y-wing': '1887f2184369f27682d9def5751a6ac8c6a1a4bc3bb6970b5cdeed6a4a217047',
 'cw-kr-tb-doomtreader': '49a57ebada3b04f0d15c743c77a2aa204607eb9e4dcc85588f14fcdc1fba856f',
 'cw-medstar-class-frigate': 'a4553f4e8c2c89efd44cb65fce78002216dbcd999dff55a6d3df997bf7bd07a7',
 'cw-morningstar-a-assault-starfighter': 'c7af80d30ea06abc1a1c32e895f4fdaf709c42d29b94821be40f5e02065b13d3',
 'cw-nu-class-attack-shuttle': '13eb66ff55e5eb2895a237a4c43cbccdfaaf0085d673b6c9457b7d150fc85fbe',
 'cw-pelta-class-medical-frigate': 'a2ab2a4988c71b814cfa9de0fa2133667872ab3a91cfc733ef849846e883ecab',
 'cw-punworcca-116-class-sloop': '8071fe687d3985260401753414b19b152832b186b6b82abe49e513af60f9cef0',
 'cw-pursuer-class-enforcement-ship': '04e3c744394363b14cefc6c7ea6bd71430bd7905f42869b2475782d5b999373a',
 'cw-s40k-phoenix-hawk-class-light-pinnace': '469aa0075d3ff12bdadafc748fb84f81881c666e931bf15e620567c37a3b8cbf',
 'cw-scurrg-h-6-prototype-bomber': 'd7123dd5d3154d266ab4499e8d352b5aa2bad4e4fa1c31275961d3a1c25f6b00',
 'cw-soulless-one-modified-belbullab-22': 'e1517825664475888cac83416a458923911191ed3a57976c3aa77009ff389cb4',
 'cw-ubrikkian-seltiss-2-caravel': '19e62ae301512251e6540a19a75fa32d01cf3a83c7d1926d3e28bae81968fc3e',
 'cw-ubrikkian-seltiss-2-caravel-cabin': '33bf6262ff974761f1364a732cf3857cef1a2fc6b6054c284b83fe2b304602dc'}
PREV_CASE_HASH='4f5a7374d037f866be9b2c4a82a8560944bf2e74fbecfc5935e3d64c3244bf79'
NEW_KEYS=['cw-sheathipede-class-shuttle','cw-providence-class-destroyer','cw-invisible-hand','cw-subjugator-class-heavy-cruiser','cw-sabaoth-destroyer','cw-sabaoth-starfighter']
assert L['schema']=='swse.vehicle.clone-wars.phase2b.cp5.book-source-closure.v1'
assert M['schema']=='swse.vehicle.clone-wars.phase2b.cp5.mount-backlog.v1'
assert C['schema']=='swse.vehicle.clone-wars.phase2c.cp5.discovery-only.v1'
assert L['sourcePdfSha256']==M['sourcePdfSha256']==PDF_SHA
assert L['phase1ProvenanceBlobSha']==PHASE1_BLOB_SHA
assert L['sourceBook']=='Clone Wars Campaign Guide'
assert C['status']=='DISCOVERY_ONLY_NOT_FROZEN' and C['productionMutationAuthorized'] is False
assert len(C['cases'])==44==C['counts']['sourcebookLocalCases']
assert C['counts']['previousSotGGlobalCasesUnaffected']==155
assert {c['caseId'] for c in C['cases'][32:]}=={f'CWCP5-{i:02d}' for i in range(1,13)}
assert len({c['caseId'] for c in C['cases']})==44
assert all(c['productionMutationAuthorized'] is False for c in C['cases'])
assert hashlib.sha256(json.dumps(C['cases'][:32],sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==PREV_CASE_HASH
E=L['entries'];ix={e['sourceEntryKey']:e for e in E}; assert len(E)==len(ix)==41
assert len(PREV_HASHES)==35 and set(PREV_HASHES).isdisjoint(NEW_KEYS)
assert set(L['checkpoint5']['sourceEntriesReviewed'])==set(NEW_KEYS)
assert L['checkpoint5']['checkpoint1To4UnchangedRecordCount']==35
assert L['checkpoint5']['sourceReviewCompleteForBook'] is True
assert L['checkpoint5']['fullMechanicalBookCertification'] is False
assert L['checkpoint5']['universalSchemaFrozen'] is False
assert L['checkpoint5']['productionHydrationAuthorized'] is False
assert L['counts']=={'publicationShipClaims':41,'primaryPdfCloseReads':41,'primaryPdfCloseReadsOutstanding':0,'strictFullFieldAndPhysicalWeaponMountCertificates':0,'strictCertificatesOutstanding':41,'attackGroupRowsReviewed':79,'sourceConflictRecordCount':1}
assert len([e for e in E if e['reviewedPDFPages']])==41
assert all(e['endPageReviewStatus']==V and e['narrativeMechanicsStatus']==V for e in E)
assert all(e['fullFieldCertified'] is False and e['fullWeaponMountReconciled'] is False for e in E)
assert all(N not in e['fieldGroups'].values() for e in E)
for k,h in PREV_HASHES.items():
 e=ix[k]
 assert hashlib.sha256(json.dumps(e,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==h,'CP4 reviewed record mutated: '+k
assert sum(len(e['mountAndFiringGroups']) for e in E)==79
assert sum(len(ix[k]['mountAndFiringGroups']) for k in NEW_KEYS)==18
assert sum(1 for e in E for f in e['blockingFindings'] if f['status']==P)==1
assert ix['cw-ubrikkian-seltiss-2-caravel']['mountAndFiringGroups'][0]['printedRangedAttackBonus']==2
assert ix['cw-ubrikkian-seltiss-2-caravel']['mountAndFiringGroups'][0]['printedWeaponRowAttackBonus']==4
mounts={m['sourceEntryKey']:m for m in M['entries']}; assert len(mounts)==41 and set(mounts)==set(ix)
for e in E:
 assert set(e['fieldGroups'])==set(L['fieldGroups']) and set(e['fieldGroups'].values())<=set(L['stateSemantics'])
 assert e['blockingFindings'] and e['reviewedPDFPages']
 assert e['printedFacts']['durability']['hitPoints']>0
 assert e['sourceEvidence']['printedPages']==e['reviewedPDFPages']
 m=mounts[e['sourceEntryKey']]
 assert m['pdfCloseReadComplete'] is True and m['strictFieldAndMountCertified'] is False
 assert m['mountRowCount']==len(e['mountAndFiringGroups'])
 assert m['state']=='SOURCE_REVIEWED_MOUNT_INCOMPLETE'
 for fld in ('hardwareCount','firingArc','batteryCount'):
    assert m['sourceSilentMountIndices'][fld]==[i for i,g in enumerate(e['mountAndFiringGroups']) if g[fld]==S]
 for g in e['mountAndFiringGroups']:
    assert {'weaponLabel','station','attackBonus','damage','sourcePage','hardwareCount','firingArc','batteryCount'}<=set(g)
    assert g['sourcePage'] in e['reviewedPDFPages']
    assert type(g['attackBonus']) is int
    assert type(g['hardwareCount']) is int or g['hardwareCount']==S
    assert type(g['batteryCount']) is int or g['batteryCount']==S
    assert g['firingArc']==S
assert M['counts']=={'identities':41,'sourceReviewed':41,'unreviewed':0,'strictMechanicalCertificates':0,'attackGroupsReviewed':79,'hardwareCount':59,'firingArc':79,'batteryCount':57}
# Five book-close high-risk record sentinels.
s=ix['cw-sheathipede-class-shuttle']; assert (s['printedStatblockStartPage'],s['reviewedPDFPages'],s['sourceEvidence']['pdfPageIndices'])==(209,[210],[209])
assert s['printedFacts']['cl']==4 and s['printedFacts']['defenses']['shieldRating']==35 and not s['mountAndFiringGroups']
p=ix['cw-providence-class-destroyer']; h=ix['cw-invisible-hand']
assert (p['printedStatblockStartPage'],h['printedStatblockStartPage'])==(210,210)
assert p['reviewedPDFPages']==[208,209] and h['reviewedPDFPages']==[209]
assert (p['printedFacts']['cl'],h['printedFacts']['cl'])==(18,20)
assert (p['printedFacts']['crew'],h['printedFacts']['crew'])==('22,350 (skilled)','350 (expert)')
assert (p['printedFacts']['hyperspace']['hyperdrive'],h['printedFacts']['hyperspace']['hyperdrive'])==('x1.5','x1')
assert len(p['mountAndFiringGroups'])==len(h['mountAndFiringGroups'])==5
assert p['mountAndFiringGroups'][4]['batteryCount']==h['mountAndFiringGroups'][4]['batteryCount']==8
assert p['printedFacts']['payload']==h['printedFacts']['payload']=='2,800 proton torpedoes'
su=ix['cw-subjugator-class-heavy-cruiser']; assert su['printedFacts']['cl']==20 and len(su['mountAndFiringGroups'])==5
ion=su['mountAndFiringGroups'][4]
assert (ion['hardwareCount'],ion['attackBonus'],ion['damage'],ion['areaStarshipScaleRadiusSquares'])==(2,7,'9d10x10 ion',5)
assert 'three consecutive full-round' in ion['recharge']
assert ion['hit']=='normal ion damage and -2 condition steps'
assert ion['miss']=='half damage and -1 condition step'
sa=ix['cw-sabaoth-destroyer']; sf=ix['cw-sabaoth-starfighter']
assert (sa['printedFacts']['cl'],sf['printedFacts']['cl'])==(12,7)
assert len(sa['mountAndFiringGroups'])==2 and sa['printedFacts']['carriedCraft']=='12 starfighters'
assert sf['printedFacts']['cl']==7 and sf['mountAndFiringGroups'][0]['hardwareCount']==4
assert 'shieldRating' not in sf['printedFacts']['defenses'] and sf['printedFacts']['hyperspace'] is None
assert len(L['checkpoint5']['printPageDiscrepancies'])==4
assert {(t['sourceEntryKey'],t['storedPhase1PrintedPage'],t['actualObservedPrintedPage']) for t in L['checkpoint5']['printPageDiscrepancies']}=={('cw-punworcca-116-class-sloop',209,210),('cw-sheathipede-class-shuttle',209,210),('cw-providence-class-destroyer',210,209),('cw-invisible-hand',210,209)}
for cp in ('checkpoint1','checkpoint2','checkpoint3','checkpoint4'):
 assert L[cp]['sourceReviewCompleteForTranche'] and L[cp]['sourceReviewCompleteForBook'] is False
 assert L[cp]['fullMechanicalBookCertification'] is False and L[cp]['universalSchemaFrozen'] is False and L[cp]['productionHydrationAuthorized'] is False
if a.previous_cp4_zip:
 with zipfile.ZipFile(a.previous_cp4_zip) as z:
    pfx='data/audits/vehicles/'
    prev=json.loads(z.read(pfx+'swse-phase2b-clone-wars-cp4-per-entry-source-review-ledger.json'))
    assert all(e==ix[e['sourceEntryKey']] for e in prev['entries'] if e['sourceEntryKey'] in PREV_HASHES)
    prevmount=json.loads(z.read(pfx+'swse-phase2b-clone-wars-cp4-weapon-mount-backlog.json'))
    assert all(m==mounts[m['sourceEntryKey']] for m in prevmount['entries'] if m['sourceEntryKey'] in PREV_HASHES)
    prevcases=json.loads(z.read(pfx+'swse-phase2c-clone-wars-cp4-schema-discovery.json'))
    assert C['cases'][:32]==prevcases['cases']
 print('PASS: original CP4 ZIP exact continuity (35 records, corresponding mounts, 32 discovery cases)')
else:print('LIMIT: CP4 ZIP not supplied; locked SHA gates of 35 records passed')
if a.source_pdf:
 hsh=hashlib.sha256()
 with a.source_pdf.open('rb') as f:
  for data in iter(lambda:f.read(4*1024*1024),b''):hsh.update(data)
 assert hsh.hexdigest()==PDF_SHA
 print('PASS: scanned source PDF SHA256')
else:print('LIMIT: source PDF SHA256 not directly checked')
phase1=base/'swse-phase1-vehicle-provenance.json'
if a.require_phase1 or phase1.exists():
 prov=read('swse-phase1-vehicle-provenance.json'); bk=next(b for b in prov['books'] if b['book']=='Clone Wars Campaign Guide')
 identities={x['sourceEntryKey']:x['printedStatblockPage'] for x in bk['entries']}
 assert len(identities)==41 and identities=={e['sourceEntryKey']:e['printedStatblockStartPage'] for e in E}
 print('PASS: unchanged full Phase1 identity/page keys; four flagged print-page disagreements')
else:print('LIMIT: Phase1 full JSON not supplied locally; known remote blob SHA and internal 41 identities checked')
print('PASS: 41/41 source close reads; 79 attack groups; 44 discovery-only cases; 0 strict certificates')
print('PASS: no production hydration, 35 previous reviewed ship records unchanged')
print('LIMIT: SotG/global Phase0B old blockers unchanged; full repo regression separately required')
