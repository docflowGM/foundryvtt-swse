#!/usr/bin/env python3
"""Clone Wars CP4 audit-only validator; not a mechanical certificate.

Primary PDF visual review is the authority. This validator preserves identities,
source-side uncertainty, previous checkpoint data, and high-risk source sentinels.
"""
import argparse,json,hashlib,zipfile
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--repo',required=True,type=Path)
p.add_argument('--source-pdf',type=Path)
p.add_argument('--previous-cp3-zip',type=Path)
p.add_argument('--require-phase1',action='store_true')
a=p.parse_args();base=a.repo/'data/audits/vehicles'
def read(name):return json.loads((base/name).read_text(encoding='utf-8'))
L=read('swse-phase2b-clone-wars-cp4-per-entry-source-review-ledger.json')
M=read('swse-phase2b-clone-wars-cp4-weapon-mount-backlog.json')
C=read('swse-phase2c-clone-wars-cp4-schema-discovery.json')
V='PDF_VERIFIED';S='SOURCE_SILENT_CONFIRMED';N='NOT_REVIEWED';P='SOURCE_CONFLICT_PRESERVED'
PDF_SHA='3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6'
PHASE1_BLOB_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
PREVIOUS_HASHES={'cw-azure-angel': '026ca2110ae5027c19836ee2d2201d10e663006bc496b183535f22efd213fed3',
 'cw-barloz-class-freighter': '2b3a89b90d0dad507a15d184b1d7df3bf66c47e983e36edad07eb508b8eeddc8',
 'cw-consular-class-cruiser-charger-c70-retrofit': 'e7d9bb7865a6ed712e8b790dca64dd7b5b0484bad921a04299130a04bacf4638',
 'cw-cr-20-troop-carrier': '036d05888cb735cc3446b87811cf092a3acd04c4f1ccac005868dfc9b7d85344',
 'cw-dagger-class-starfighter': '53ebda5f7c155b3332630e74acbf393936e49355278c0f7e74730bb7f66a5765',
 'cw-delta-7-aethersprite-interceptor-high-maneuver-variant': '65715a648a9244012c67202ab4d54ab5c4c47208e0504bf447c9e85a3085dd72',
 'cw-delta-7-aethersprite-interceptor-high-speed-variant': '60ac4a7f7a17e4631f3c0e37eb5bf80a449144a0ecc918125a86a9949736148c',
 'cw-dianoga-class-assault-starfighter': '351be0634f814326f65c61000b0100b193d44576765bc540e3ff2a58d0a97255',
 'cw-eta-2-actis-interceptor-heavy-defenses-variant': '7a2629fd9e49886844842e13588c1abcbeedbb3354c8c8d7c782c3f4c80e1bfa',
 'cw-eta-2-actis-interceptor-high-maneuver-variant': '5a7e6f740ed573b96d7ac82a2b967f91a27c7665d735855a9ddef36d31b7a7a7',
 'cw-freefall-class-starfighter': '6e46ae66674878d1b194eddeba2f337185fc8b06fba4db3149292cf0c6d8f074',
 'cw-g9-rigger': '09c539fe68cb5fd541a501025810b7327f2e6992d04376f4019c26879a8a3bf7',
 'cw-gs-100-salvage-ship': '961a4354319663539701df097c63e72a0956f3e85cce6c281f2a48656b98ad49',
 'cw-kappa-class-shuttle': '8c4024a75b019962550f32e3f3d3bda1fc21f8cc3eac9b2b7e8944e61eaec4b2',
 'cw-koensayr-btl-s1-y-wing': '1887f2184369f27682d9def5751a6ac8c6a1a4bc3bb6970b5cdeed6a4a217047',
 'cw-kr-tb-doomtreader': '49a57ebada3b04f0d15c743c77a2aa204607eb9e4dcc85588f14fcdc1fba856f',
 'cw-medstar-class-frigate': 'a4553f4e8c2c89efd44cb65fce78002216dbcd999dff55a6d3df997bf7bd07a7',
 'cw-morningstar-a-assault-starfighter': 'c7af80d30ea06abc1a1c32e895f4fdaf709c42d29b94821be40f5e02065b13d3',
 'cw-nu-class-attack-shuttle': '13eb66ff55e5eb2895a237a4c43cbccdfaaf0085d673b6c9457b7d150fc85fbe',
 'cw-pelta-class-medical-frigate': 'a2ab2a4988c71b814cfa9de0fa2133667872ab3a91cfc733ef849846e883ecab',
 'cw-pursuer-class-enforcement-ship': '04e3c744394363b14cefc6c7ea6bd71430bd7905f42869b2475782d5b999373a',
 'cw-s40k-phoenix-hawk-class-light-pinnace': '469aa0075d3ff12bdadafc748fb84f81881c666e931bf15e620567c37a3b8cbf',
 'cw-scurrg-h-6-prototype-bomber': 'd7123dd5d3154d266ab4499e8d352b5aa2bad4e4fa1c31275961d3a1c25f6b00',
 'cw-ubrikkian-seltiss-2-caravel': '19e62ae301512251e6540a19a75fa32d01cf3a83c7d1926d3e28bae81968fc3e',
 'cw-ubrikkian-seltiss-2-caravel-cabin': '33bf6262ff974761f1364a732cf3857cef1a2fc6b6054c284b83fe2b304602dc'}
PREVIOUS_DISCOVERY_HASH='c1f32031a2414a54e1a69f7124eaeac2eacba7179321795d88c48819b9eff158'
NEW_KEYS=['cw-bc-714-luxury-transport',
 'cw-belbullab-heavy-starfighter',
 'cw-soulless-one-modified-belbullab-22',
 'cw-c-9979-landing-craft',
 'cw-cis-advanced-starfighter',
 'cw-diamond-class-cruiser',
 'cw-droch-class-boarding-ship',
 'cw-hardcell-class-transport',
 'cw-hyena-class-bomber',
 'cw-punworcca-116-class-sloop']
assert L['schema']=='swse.vehicle.clone-wars.phase2b.cp4.per-entry-mechanical-source-review.v1'
assert L['sourcePdfSha256']==M['sourcePdfSha256']==PDF_SHA
assert L['phase1ProvenanceBlobSha']==PHASE1_BLOB_SHA
assert L['sourceBook']=='Clone Wars Campaign Guide'
assert C['schema']=='swse.vehicle.clone-wars.phase2c.cp4.discovery-only.v1'
assert C['status']=='DISCOVERY_ONLY_NOT_FROZEN' and C['productionMutationAuthorized'] is False
assert C['counts']=={'sourcebookLocalCases':32,'previousSotGGlobalCasesUnaffected':155}
assert len(C['cases'])==32 and len({c['caseId'] for c in C['cases']})==32
assert {c['caseId'] for c in C['cases'][20:]}=={f'CWCP4-{i:02d}' for i in range(1,13)}
assert all(c['productionMutationAuthorized'] is False for c in C['cases'])
assert hashlib.sha256(json.dumps(C['cases'][:20],ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()==PREVIOUS_DISCOVERY_HASH
E=L['entries']; ix={e['sourceEntryKey']:e for e in E}
assert len(E)==len(ix)==41
assert len(PREVIOUS_HASHES)==25 and len(NEW_KEYS)==10
assert set(NEW_KEYS).isdisjoint(PREVIOUS_HASHES)
assert set(L['checkpoint4']['sourceEntriesReviewed'])==set(NEW_KEYS)
assert L['checkpoint4']['checkpoint1To3ReviewedEntriesPreservedUnmodified']
assert L['checkpoint4']['checkpoint1To3UnchangedRecordCount']==25
assert L['checkpoint4']['neighborEntriesNotReviewed']==['cw-sheathipede-class-shuttle']
assert L['checkpoint4']['pdfImageIndicesUsed']==list(range(203,211))
assert len([e for e in E if e['reviewedPDFPages']])==35
assert len([e for e in E if not e['reviewedPDFPages']])==6
assert set(e['sourceEntryKey'] for e in E if e['reviewedPDFPages'])==set(PREVIOUS_HASHES)|set(NEW_KEYS)
assert L['counts']=={'publicationShipClaims':41,'primaryPdfCloseReads':35,'primaryPdfCloseReadsOutstanding':6,'strictFullFieldAndPhysicalWeaponMountCertificates':0,'strictCertificatesOutstanding':41,'attackGroupRowsReviewed':61,'sourceConflictRecordCount':1}
for cp in ('checkpoint1','checkpoint2','checkpoint3','checkpoint4'):
    state=L[cp]
    assert state['sourceReviewCompleteForTranche'] and not state['sourceReviewCompleteForBook']
    assert not state['fullMechanicalBookCertification'] and not state['universalSchemaFrozen'] and not state['productionHydrationAuthorized']
for k,h in PREVIOUS_HASHES.items():
    got=hashlib.sha256(json.dumps(ix[k],ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    assert got==h,'Prior 25-record mutation '+k
mounts={m['sourceEntryKey']:m for m in M['entries']}
assert len(mounts)==41 and set(ix)==set(mounts)
for e in E:
    k=e['sourceEntryKey']; reviewed=bool(e['reviewedPDFPages'])
    assert set(e['fieldGroups'])==set(L['fieldGroups'])
    assert set(e['fieldGroups'].values())<=set(L['stateSemantics'])
    assert not e['fullFieldCertified'] and not e['fullWeaponMountReconciled']
    if reviewed:
       assert e['endPageReviewStatus']==V and e['narrativeMechanicsStatus']==V
       assert e['sourceEvidence']['printedPages']==e['reviewedPDFPages']
       assert N not in e['fieldGroups'].values()
       assert e['printedFacts']['durability']['hitPoints']>0
       assert e['blockingFindings']
       if k!='cw-punworcca-116-class-sloop':assert e['printedStatblockStartPage'] in e['reviewedPDFPages']
    else:
       assert e['endPageReviewStatus']==N and e['narrativeMechanicsStatus']==N
       assert set(e['fieldGroups'].values())=={N}
       assert not e['printedFacts'] and not e['mountAndFiringGroups']
    for g in e['mountAndFiringGroups']:
       assert {'weaponLabel','station','attackBonus','damage','sourcePage','hardwareCount','firingArc','batteryCount'}<=set(g)
       assert g['sourcePage'] in e['reviewedPDFPages']
       assert isinstance(g['attackBonus'],int)
       assert isinstance(g['hardwareCount'],int) or g['hardwareCount']==S
       assert isinstance(g['batteryCount'],int) or g['batteryCount']==S
       assert isinstance(g['firingArc'],str)
    m=mounts[k]
    assert m['printedPage']==e['printedStatblockStartPage']
    assert m['pdfCloseReadComplete']==reviewed and not m['strictFieldAndMountCertified']
    assert m['mountRowCount']==len(e['mountAndFiringGroups'])
    for fld in ('hardwareCount','firingArc','batteryCount'):
        assert m['sourceSilentMountIndices'][fld]==[i for i,g in enumerate(e['mountAndFiringGroups']) if g[fld]==S]
assert M['counts']=={'identities':41,'sourceReviewed':35,'unreviewed':6,'strictMechanicalCertificates':0,'attackGroupsReviewed':61,'hardwareCount':43,'firingArc':61,'batteryCount':53}
assert sum(len(e['mountAndFiringGroups']) for e in E)==61
assert sum(len(ix[k]['mountAndFiringGroups']) for k in NEW_KEYS)==16
assert sum(1 for e in E for finding in e['blockingFindings'] if finding['status']==P)==1
assert ix['cw-ubrikkian-seltiss-2-caravel']['mountAndFiringGroups'][0]['printedRangedAttackBonus']==2
assert ix['cw-ubrikkian-seltiss-2-caravel']['mountAndFiringGroups'][0]['printedWeaponRowAttackBonus']==4

# Printed PDF sentinel values, selected for subtle rules and source-silent distinctions.
bc=ix['cw-bc-714-luxury-transport']; assert (bc['printedFacts']['cl'],bc['printedFacts']['durability']['hitPoints'],bc['printedFacts']['defenses']['shieldRating'],bc['printedFacts']['hyperspace']['hyperdrive'])==(5,135,45,'x1') and not bc['mountAndFiringGroups']
b=ix['cw-belbullab-heavy-starfighter'];bf=b['printedFacts'];bg=b['mountAndFiringGroups']
assert (bf['cl'],bf['durability']['hitPoints'],bf['payload'])==(13,160,'12 concussion missiles (Belbullab-24 only)')
assert [(w['hardwareCount'],w['damage']) for w in bg]==[(2,'5d10x2'),(2,'6d10x2'),(2,'9d10x2')]
s=ix['cw-soulless-one-modified-belbullab-22'];assert (s['printedFacts']['cl'],s['printedFacts']['hyperspace']['hyperdrive'],s['printedFacts']['crew'])==(14,'x2','1 (expert)')
assert s['mountAndFiringGroups'][0]['autofireAttackBonus']==4 and len(s['mountAndFiringGroups'])==1
c=ix['cw-c-9979-landing-craft'];cf=c['printedFacts'];assert cf['carriedCraft']=='28 Trade Federation troop carriers; 114 AATs; 11 MTTs' and cf['hyperspace'] is None and all(g['hardwareCount']==2 for g in c['mountAndFiringGroups'])
ci=ix['cw-cis-advanced-starfighter']; assert ci['printedFacts']['payload']=='24 proton torpedoes' and ci['printedFacts']['hyperspace']['hyperdrive']=='x6' and len(ci['mountAndFiringGroups'])==2
di=ix['cw-diamond-class-cruiser'];assert di['printedFacts']['cl']==13 and di['printedFacts']['crew']=='148 (normal)' and di['mountAndFiringGroups'][0]['batteryCount']==2
assert '600 OG-9' in di['printedFacts']['carriedCraft']
dr=ix['cw-droch-class-boarding-ship']; assert dr['printedFacts']['cl']==7 and dr['printedFacts']['hyperspace'] is None and 'shieldRating' not in dr['printedFacts']['defenses']
assert dr['mountAndFiringGroups'][1]['weaponLabel']=='boarding drill' and dr['mountAndFiringGroups'][1]['hardwareCount']==1
assert any('ignores target SR' in f['finding'] for f in dr['configurationAndRuleFindings'])
ha=ix['cw-hardcell-class-transport']; assert ha['printedFacts']['durability']['hitPoints']==800 and ha['printedFacts']['durability']['damageReduction']==25
assert ha['printedFacts']['skills']['mechanicsWithoutAstromech']==6 and ha['mountAndFiringGroups'][0]['batteryCount']==2
assert any('triple damage' in f['finding'] for f in ha['configurationAndRuleFindings'])
hy=ix['cw-hyena-class-bomber'];assert (hy['printedFacts']['initiative'],hy['printedFacts']['crew'],hy['printedFacts']['payload'])==(8,'0 (expert)','6 proton torpedoes; 6 concussion missiles')
assert len(hy['mountAndFiringGroups'])==3 and hy['printedFacts']['hyperspace'] is None
pu=ix['cw-punworcca-116-class-sloop'];pf=pu['printedFacts']
assert pu['printedStatblockStartPage']==209 and pu['reviewedPDFPages']==[210]
assert pu['sourceEvidence']['pdfPageIndices']==[209]
assert (pf['cl'],pf['skills']['initiativeOnlyFA4'],pf['skills']['perceptionOnlyFA4'],pf['skills']['pilotOnlyFA4'],pf['skills']['useComputerOnlyFA4'])==(6,13,4,13,13)
assert pu['mountAndFiringGroups'][0]['damage']=='— (grapple +14)'
assert pu['sourceEvidence']['printedPageMismatch']=={'phase1PrintedStartPage':209,'observedPrintedStartPage':210,'zeroBasedPdfPageIndex':209,'adjacentSwappedPage':{'zeroBasedPdfIndex':210,'observedPrintedPage':209},'disposition':'PRESERVE_PHASE1_RECORD_KEY_AND_FLAG_PROVENANCE_CORRECTION_REQUIRED'}
assert not ix['cw-sheathipede-class-shuttle']['reviewedPDFPages']

if a.previous_cp3_zip:
    with zipfile.ZipFile(a.previous_cp3_zip) as z:
        root='data/audits/vehicles/'
        prev=json.loads(z.read(root+'swse-phase2b-clone-wars-cp3-per-entry-source-review-ledger.json'))
        assert all(prev['entries'][i]==E[i] for i in range(41) if E[i]['sourceEntryKey'] in PREVIOUS_HASHES)
        prevmount=json.loads(z.read(root+'swse-phase2b-clone-wars-cp3-weapon-mount-backlog.json'))
        before={m['sourceEntryKey']:m for m in prevmount['entries']}
        assert all(before[k]==mounts[k] for k in PREVIOUS_HASHES)
        prevcase=json.loads(z.read(root+'swse-phase2c-clone-wars-cp3-schema-discovery.json'))
        assert prevcase['cases']==C['cases'][:20]
    print('PASS: original CP3 ZIP exact continuity of 25 ledgers, 25 mount rows and first 20 discovery cases')
else:print('LIMIT: original CP3 ZIP not supplied; 25 locked per-entry SHA256 gates passed')
if a.source_pdf:
    h=hashlib.sha256()
    with a.source_pdf.open('rb') as f:
        for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
    assert h.hexdigest()==PDF_SHA
    print('PASS: original scanned PDF SHA256')
else:print('LIMIT: original scanned PDF SHA256 not checked')
phase1=base/'swse-phase1-vehicle-provenance.json'
if a.require_phase1 or phase1.exists():
    prov=read('swse-phase1-vehicle-provenance.json')
    bk=next(b for b in prov['books'] if b['book']=='Clone Wars Campaign Guide')
    source={x['sourceEntryKey']:x['printedStatblockPage'] for x in bk['entries']}
    assert len(source)==41 and source=={e['sourceEntryKey']:e['printedStatblockStartPage'] for e in E}
    print('PASS: phase1 41 ids and STORED pages preserved; one visible p209->p210 discrepancy documented')
else:print('LIMIT: full Phase1 JSON not locally present; immutable blob SHA and stored record keys checked')
print('PASS: 35/41 source reviewed; 6 pending; 61 attack rows; 0 strict mechanical certifications')
print('PASS: 12 CP4 discovery cases; 20 preceding unchanged; source page swap p209/p210 documented')
print('PASS: all ten CP4 ship sentinels, 25 earlier source records unchanged, no production mutation')
print('LIMIT: SotG/global Phase0B regression suite requires full repository files; historical blockers not cleared')
