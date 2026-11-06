#!/usr/bin/env python3
"""Clone Wars CP2: audit-only cumulative structural regression / identity and fingerprint gates.

Original PDF visual inspection remains separate and authoritative; this script
checks source transcription shape, anti-merging sentinels, and continuity. It does
NOT certify missing physical weapon mounts or prove every stat transcribed correctly.
"""
import argparse,hashlib,json,zipfile
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--repo',type=Path,required=True)
p.add_argument('--source-pdf',type=Path)
p.add_argument('--require-phase1',action='store_true')
p.add_argument('--previous-cp1-zip',type=Path)
a=p.parse_args()
root=a.repo.resolve(); base=root/'data/audits/vehicles'
def read(name):return json.loads((base/name).read_text(encoding='utf-8'))
ledger=read('swse-phase2b-clone-wars-cp2-per-entry-source-review-ledger.json')
mounts=read('swse-phase2b-clone-wars-cp2-weapon-mount-backlog.json')
cases=read('swse-phase2c-clone-wars-cp2-schema-discovery.json')
CP1_HASHES={'cw-barloz-class-freighter': '2b3a89b90d0dad507a15d184b1d7df3bf66c47e983e36edad07eb508b8eeddc8',
 'cw-dagger-class-starfighter': '53ebda5f7c155b3332630e74acbf393936e49355278c0f7e74730bb7f66a5765',
 'cw-dianoga-class-assault-starfighter': '351be0634f814326f65c61000b0100b193d44576765bc540e3ff2a58d0a97255',
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
CP2_KEYS=['cw-delta-7-aethersprite-interceptor-high-speed-variant','cw-delta-7-aethersprite-interceptor-high-maneuver-variant','cw-azure-angel','cw-eta-2-actis-interceptor-high-maneuver-variant','cw-eta-2-actis-interceptor-heavy-defenses-variant']
S='SOURCE_SILENT_CONFIRMED'; V='PDF_VERIFIED'
assert ledger['sourceBook']=='Clone Wars Campaign Guide'
assert ledger['sourcePdfSha256']==mounts['sourcePdfSha256']
assert ledger['phase1ProvenanceBlobSha']=='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
assert ledger['checkpoint1']['sourceReviewCompleteForTranche'] and not ledger['checkpoint1']['fullMechanicalBookCertification']
assert ledger['checkpoint2']['sourceReviewCompleteForTranche']
for cp in ('checkpoint1','checkpoint2'):
 assert not ledger[cp]['sourceReviewCompleteForBook']
 assert not ledger[cp]['fullMechanicalBookCertification']
 assert not ledger[cp]['universalSchemaFrozen']
 assert not ledger[cp]['productionHydrationAuthorized']
assert not cases['productionMutationAuthorized'] and cases['status']=='DISCOVERY_ONLY_NOT_FROZEN'
assert cases['counts']=={'sourcebookLocalCases':12,'previousSotGGlobalCasesUnaffected':155}
assert len(cases['cases'])==12
assert len({c['caseId'] for c in cases['cases']})==12
assert len(mounts['entries'])==41
E=ledger['entries']; keys=[e['sourceEntryKey'] for e in E];idx={e['sourceEntryKey']:e for e in E}
assert len(E)==len(set(keys))==41
assert {r['sourceEntryKey'] for r in mounts['entries']}==set(keys)
assert len([e for e in E if e['reviewedPDFPages']])==18
assert len([e for e in E if not e['reviewedPDFPages']])==23
assert ledger['counts']==dict(publicationShipClaims=41,primaryPdfCloseReads=18,primaryPdfCloseReadsOutstanding=23,strictFullFieldAndPhysicalWeaponMountCertificates=0,strictCertificatesOutstanding=41,attackGroupRowsReviewed=28,sourceConflictRecordCount=1)
assert mounts['counts']==dict(identities=41,sourceReviewed=18,unreviewed=23,strictMechanicalCertificates=0,attackGroupsReviewed=28,hardwareCount=19,firingArc=28,batteryCount=28)
assert set(ledger['checkpoint1']['sourceEntriesReviewed'])==set(CP1_HASHES)
assert set(ledger['checkpoint2']['sourceEntriesReviewed'])==set(CP2_KEYS)
assert ledger['checkpoint1']['printedPages']==list(range(76,86))
assert ledger['checkpoint2']['printedPages']==[137,138,139]
assert set(ledger['checkpoint1']['sourceEntriesReviewed']).isdisjoint(CP2_KEYS)
assert all(idx[k]['printedStatblockStartPage'] in (137,138,139) for k in CP2_KEYS)

for key,hash_expected in CP1_HASHES.items():
 record=idx[key]
 encoded=json.dumps(record,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()
 assert hashlib.sha256(encoded).hexdigest()==hash_expected,'CP1 record modified: '+key

for e in E:
 key=e['sourceEntryKey']; reviewed=bool(e['reviewedPDFPages'])
 assert set(e['fieldGroups'])==set(ledger['fieldGroups'])
 assert not e['fullFieldCertified'] and not e['fullWeaponMountReconciled']
 assert e['printedStatblockStartPage']>0
 if not reviewed:
  assert e['endPageReviewStatus']=='NOT_REVIEWED'
  assert not e['printedFacts'] and not e['mountAndFiringGroups']
  assert e['narrativeMechanicsStatus']=='NOT_REVIEWED'
  assert set(e['fieldGroups'].values())=={'NOT_REVIEWED'}
  continue
 assert e['endPageReviewStatus']==V and e['narrativeMechanicsStatus']==V
 assert e['sourceEvidence']['printedPages']==e['reviewedPDFPages']
 assert e['printedStatblockStartPage'] in e['reviewedPDFPages']
 assert set(e['fieldGroups'].values())<=set(ledger['stateSemantics'])-{'NOT_REVIEWED'}
 assert e['printedFacts']['cl']>=0 and e['printedFacts']['durability']['hitPoints']>0
 assert e['blockingFindings']
 for g in e['mountAndFiringGroups']:
  assert {'weaponLabel','station','attackBonus','damage','sourcePage','hardwareCount','firingArc','batteryCount'}<=set(g)
  assert g['sourcePage'] in e['reviewedPDFPages']
  assert g['weaponLabel'] and g['damage']
  assert g['hardwareCount']==S or isinstance(g['hardwareCount'],int)
  assert g['firingArc']==S or isinstance(g['firingArc'],str)

M={e['sourceEntryKey']:e for e in mounts['entries']}
for e in E:
 m=M[e['sourceEntryKey']]; groups=e['mountAndFiringGroups']
 assert m['printedPage']==e['printedStatblockStartPage']
 assert m['pdfCloseReadComplete']==bool(e['reviewedPDFPages'])
 assert m['mountRowCount']==len(groups)
 assert not m['strictFieldAndMountCertified']
 for f,inds in m['sourceSilentMountIndices'].items():
  assert inds==[i for i,g in enumerate(groups) if g[f]==S]
for field in ('hardwareCount','firingArc','batteryCount'):
 assert mounts['counts'][field]==sum(len(e['sourceSilentMountIndices'][field]) for e in mounts['entries'])
assert sum(len(x['mountAndFiringGroups']) for x in E)==28
assert len([g for k in CP2_KEYS for g in idx[k]['mountAndFiringGroups']])==8
assert sum(1 for e in E for f in e['blockingFindings'] if f['status']=='SOURCE_CONFLICT_PRESERVED')==1
assert idx['cw-ubrikkian-seltiss-2-caravel']['mountAndFiringGroups'][0]['printedRangedAttackBonus']==2
assert idx['cw-ubrikkian-seltiss-2-caravel']['mountAndFiringGroups'][0]['printedWeaponRowAttackBonus']==4

# Primary publication variant distinctions: do not normalize, merge, or inherit.
high=idx['cw-delta-7-aethersprite-interceptor-high-speed-variant']['printedFacts']
mane=idx['cw-delta-7-aethersprite-interceptor-high-maneuver-variant']['printedFacts']
azure=idx['cw-azure-angel']['printedFacts']
eta=idx['cw-eta-2-actis-interceptor-high-maneuver-variant']['printedFacts']
heavy=idx['cw-eta-2-actis-interceptor-heavy-defenses-variant']['printedFacts']
assert high['cl']==10 and mane['cl']==10 and azure['cl']==12
assert (high['initiative'],high['defenses']['reflex'],high['abilities']['dex'])==(13,18,24)
assert (mane['initiative'],mane['defenses']['reflex'],mane['abilities']['dex'])==(16,21,30)
assert (high['movement']['characterScale']['squares'],high['movement']['starshipScale']['squares'],high['movement']['maxVelocityKmH'])==(18,6,1260)
assert (mane['movement']['characterScale']['squares'],mane['movement']['starshipScale']['squares'],mane['movement']['maxVelocityKmH'])==(16,5,1150)
assert high['skills']['pilotWhenIncreasingVehicleSpeed']==20 and high['skills']['pilot']==13
assert all(x['hyperspace']['hyperdrive']=='x1 with booster ring' for x in (high,mane,eta,heavy))
assert azure['hyperspace']['hyperdrive']=='x1' and azure['payload']=='16 proton torpedoes'
assert azure['economics']['saleStatus']=='Not available for sale' and azure['economics']['newCredits'] is None
assert (azure['initiative'],azure['sensesPerception'],azure['durability']['hitPoints'],azure['abilities']['dex'])==(19,12,71,28)
assert len(idx['cw-azure-angel']['mountAndFiringGroups'])==2
assert idx['cw-azure-angel']['mountAndFiringGroups'][1]['damage']=='9d10x2'
assert idx['cw-azure-angel']['mountAndFiringGroups'][1]['hardwareCount']==S
assert (eta['initiative'],eta['defenses']['reflex'],eta['durability']['hitPoints'],eta['abilities']['dex'])==(21,22,70,32)
assert (heavy['initiative'],heavy['defenses']['reflex'],heavy['durability']['hitPoints'],heavy['abilities']['dex'])==(18,20,77,26)
assert 'shieldRating' not in eta['defenses']
assert idx['cw-eta-2-actis-interceptor-high-maneuver-variant']['sourceFieldStates']['shieldRating']==S
assert heavy['defenses']['shieldRating']==15
assert heavy['defenses']['armorBonus']==4 and eta['defenses']['armorBonus']==3
assert all(g['station']=='pilot' and g['attackBonus']==14 for k in CP2_KEYS if 'eta-2' in k for g in idx[k]['mountAndFiringGroups'])
assert all(any('ion' in g['damage'] for g in idx[k]['mountAndFiringGroups']) for k in CP2_KEYS if 'eta-2' in k)
assert {c['caseId'] for c in cases['cases']}=={f'CWCP1-{i:02}' for i in range(1,8)}|{f'CWCP2-{i:02}' for i in range(1,6)}
for c in cases['cases']:
 assert c['gateStatus']=='OPEN_SCHEMA_DESIGN_TEST' and not c['productionMutationAuthorized']
 assert set(c['sourceEntryKeys'])<=set(keys)

# Original Phase 1 identities and pages must be checked when the actual repo is available.
prov=base/'swse-phase1-vehicle-provenance.json'
if prov.exists():
 d=json.loads(prov.read_text(encoding='utf-8'));b=next(b for b in d['books'] if b['book']=='Clone Wars Campaign Guide')
 assert {x['sourceEntryKey']:(x['shipName'],x['printedStatblockPage']) for x in b['entries']}=={e['sourceEntryKey']:(e['printedName'],e['printedStatblockStartPage']) for e in E}
 print('PASS: 41/41 original Phase 1 identities and printed pages verified')
else:
 assert not a.require_phase1,'Phase 1 provenance required but absent; overlay ZIP intentionally excludes unchanged repository files'
 print('WARNING: Phase 1 source not installed into overlay; compare when integrated with existing repository')
if a.previous_cp1_zip:
 with zipfile.ZipFile(a.previous_cp1_zip) as z:
  prev=json.loads(z.read('data/audits/vehicles/swse-phase2b-clone-wars-cp1-per-entry-source-review-ledger.json'))
  assert [x for x in prev['entries'] if x['reviewedPDFPages']]==[x for x in E if x['sourceEntryKey'] in CP1_HASHES]
 print('PASS: CP1 ZIP cross-check exact 13 source records preserved')
if a.source_pdf:
 h=hashlib.sha256()
 with a.source_pdf.open('rb') as f:
  for chunk in iter(lambda:f.read(1<<20),b''):h.update(chunk)
 assert h.hexdigest()==ledger['sourcePdfSha256']
 print('PASS: original scanned Clone Wars PDF hash matches certified navigation/source fingerprint')
print('PASS: 41 identities, 18 PDF-reviewed, 23 pending, 28 attack groups, no strict complete mechanical certifications')
print('PASS: 5 new variants/unique named ships, CP1 fingerprint continuity, print-preserving variant facts')
print('PASS: 12 discovery-only cases, 1 original conflict, no production changes or universal schema freeze')
print('LIMIT: validator checks structural transcription and source continuity; only close read can establish printed facts')
