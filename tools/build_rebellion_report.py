#!/usr/bin/env python3
"""Rebuild Rebellion Markdown, mechanical backlog, and local checkpoint receipts."""
from pathlib import Path
from collections import Counter
import hashlib,json
R=Path(__file__).resolve().parents[1]
read=lambda p:json.loads((R/p).read_text())
L=read('data/canonical/droids/source-books/rebellion.json');E=read('data/audits/droids/rebellion-field-evidence.json');V=read('data/audits/droids/rebellion-visual-field-review.json')
assert len(L['sourceEntries'])==len(E['records'])==len(V['items'])==15
rows=[]
for idx,(r,e,v) in enumerate(zip(L['sourceEntries'],E['records'],V['items']),1):
 blocks=['inspect remaining narrative rules and source continuations beyond selected statblock fields',
 'resolve printed feats, talents, exact identities and option-level prerequisites with canonical rules authority',
 'separate printed Systems from Possessions and certify physical installed component instance provenance',
 'reconcile weapon instances, mount ownership, alternative attacks, ammunition and action economy',
 'certify all conditional defenses/movement/special rules with scope and errata/precedence',
 'prove legal player creation route for each published hero-eligible model; printed eligibility alone is insufficient',
 'validate against the upstream universal droid source JSON Schema 2020-12',
 'verify Foundry V13/V2 runtime attack, damage, effects, persistence and permissions']
 if idx==1:blocks+=['FX-7 has 0 stationary movement and is not eligible as a droid hero, despite a statblock and language knowledge']
 if idx in (4,5):blocks+=['p55 OCR interleaves two different models; page image and each printed column governs']
 if idx==5:blocks+=['B\'omarr brain-occupied variant is a conditional narrative replacement; never convert factory BT-16 into organic-occupant default']
 if idx in (6,7):blocks+=['RHTC-560 controls separate HT drone actors; drone expenses and weapon actions are not included free with controller purchase']
 if idx==8:blocks+=['spotter droid is not the separate artillery vehicle, nor does its statblock grant vehicle firing rights']
 if idx in (10,11,12):blocks+=['Dark Trooper phase-specific shield/armament and separate armor-as-suit presentation must not overlap with droid body']
 if idx==14:blocks+=['4-LOM named character and stock LOM-series must remain distinct; verify model association without wholesale inheritance']
 if idx==15:blocks+=['IG-88 narrative copies are not separate printed identities or multiple deployable bodies without individual source evidence']
 rows.append({'sourceEntryKey':r['identity']['sourceEntryKey'],'printedName':r['identity']['printedName'],
  'printedPageStart':r['publication']['printedPageStart'],'printedPageEnd':r['publication']['printedPageEnd'],
  'selectedFieldCount':v['verifiedFieldCount'],'actorAuthority':'droid',
  'heroEligibility':r['pcConstruction']['heroEligibility'],'selectedFirstPageReview':'complete',
  'mechanicalCertification':'BLOCKED','runtimeStatus':'NOT_TESTED','blockers':blocks})
back={'schema':'swse.droid.rebellion.mechanical-review-backlog/0.1','book':'Rebellion Era Campaign Guide',
  'publicationClaims':15,'selectedFirstPageVisualReviews':15,'mechanicallyCertified':0,'records':rows,
  'limitations':'Only selected source fields checked. No equipment, weapon, feat/talent or runtime certification.'}
p=R/'data/audits/droids/rebellion-review-backlog.json';p.write_text(json.dumps(back,indent=2,ensure_ascii=False)+'\n')
hero=Counter(x['heroEligibility'] or 'not-stated' for x in rows)
md=f'''# Rebellion Era Campaign Guide - Droid Publication Source Review (Book 6/14)

**LOCAL ONLY. Do not push, import, or change production compendiums without explicit authorization.**

| Measure | Rebellion Era | Overall six-book project |
|---|---:|---:|
| Draft publication identities | **15/15 (100%)** | **176/234 (75.2%)** |
| Selected first-page PDF reviews | **15/15 (100%)** | **176/234 (75.2%)** |
| Direct PDF field comparisons | **{V['directFieldComparisons']}** | **2,632** |
| Independently mechanically certified | **0/15** | **0/234** |
| Mechanically complete books | -- | **0/14** |

## Sources and scope

- Owner-provided *Rebellion Era Campaign Guide* PDF and searchable TXT independently SHA-256 fingerprinted in the local evidence.
- All **15 source identities** checked against printed statblock pages, including continuation and eligibility pages. Unique printed pages rendered: 52-57, 110, 127-130, 143-144.
- **15 droid-actor records**: thirteen ordinary model/statblocks plus named individuals **4-LOM** and **IG-88**. No squad- or vehicle-primary claim in this book.
- Verified source eligibility states: **{hero['allowed']} allowed, {hero['prohibited']} prohibited, {hero['not-stated']} not established/named NPC**. Allowed is not a certified PC creation route.
- Each of the {V['directFieldComparisons']} selected fields has a printed-page receipt, and the original TXT line window is retained solely for searchable index/provenance, not as mechanical authority.
- All feat/talent grants, component instances, attack-group rights and Foundry runtime effects remain **disabled/unmapped** until independently certified. No claim has mechanical certification.

## Critical source distinctions

1. **FX-7 (printed pp52-53):** statblock has stationary Speed 0, no vocabulator and printed hero prohibition. Interrogation reprogramming is narrative, not a universal unrestricted action.
2. **R4-Series and WED Treadwell (pp53-54):** hero eligibility is explicitly allowed; electroshock probe is an ion attack; swappable specialist arms do not establish unlimited free system changes.
3. **LOM-Series vs BT-16 (p55):** overlapping OCR fields from columns belong to two separate models. Factory LOM-Series can be used as a hero; BT-16 cannot.
4. **B'omarr conversion (p56):** monks place living brains in modified BT-16 bodies with documented changes. That conditional example does not alter factory BT-16 rules globally or create an extra model identity.
5. **RHTC-560 and HT Drone (pp56-57):** controller commands up to 6-12 physically separate drones. The controller cost **5,000 credits excludes drones**, while a drone costs **2,000 credits**; companion ownership and action delegation require their own certification.
6. **LV-38 (p110):** probe/spotter is a character-scale droid source record, separate from the adjacent mobile torpedo-launcher vehicle and its weapon system. No hero permission is inferred.
7. **Imperial Espionage Droid (p127):** printed hero eligibility is allowed; surveillance prose is not generic automatic eavesdropping permission.
8. **Dark Trooper I-III (pp128-129):** three distinct droid statblocks. Phase I wrist shield gives **conditional +2 armor only while not attacking**; Phase II/III have separate wearable armor descriptions that must not become the autonomous droid actor or grant stacked armor/shields. Phase III source SR20 remains source-only evidence.
9. **Imperial City Maintenance Droid (p130):** RC-M and IC-M designation history is a model alias, not two additional statblocks.
10. **4-LOM (p143):** a named bounty hunter using LOM-family chassis; individual nonheroic/noble/scoundrel/scout/bounty hunter progression is not the stock LOM model.
11. **IG-88 (pp143-144):** one named NPC source block; multiple A/B/C/D consciousness copies and station-core transfer are narrative entities, not additional publication statblocks.

## Selected-field per-entry register

| Source ID | Printed name | Printed page | Fields compared | Hero status | Mechanical status |
|---|---|---:|---:|---|---|
'''
for row in rows:
 md+=f"| {row['sourceEntryKey']} | {row['printedName']} | {row['printedPageStart']} | {row['selectedFieldCount']} | {row['heroEligibility'] or 'not established'} | BLOCKED |\n"
md+='''
## Unresolved mechanical certification gates

Each source claim has a complete blocker list in `data/audits/droids/rebellion-review-backlog.json`. Initial selected-field PDF review does **not** mean full book source review and is not a completed Foundry feature. The remaining work includes full printed/narrative rule reconciliation, canonical feat/talent records, component/weapon/attack-group authority, chargen source legality, upstream JSON Schema validation and V13 live runtime verification.

The validation and negative tests check the local ledger's conservation of source authority; they do **not** prove the unpublished mechanics are correct. Keep the book status `IN_PROGRESS_NOT_CERTIFIED` and maintain prior books unmodified.
'''
(R/'docs/audits/droids/hydration-rebellion-rolling.md').write_text(md)
receipt={'schema':'swse.droid.rebellion.local-state/0.1','bookId':'REBELLION','localCheckpoint':9,
 'sourceDraftEntries':15,'selectedFirstPageReviews':15,'directFieldComparisons':V['directFieldComparisons'],
 'printedPagesChecked':[52,53,54,55,56,57,110,127,128,129,130,143,144],
 'sourcePdfSha256':E['sourcePdfSha256'],'sourceTxtSha256':E['sourceTxtSha256'],
 'ledgerSha256':hashlib.sha256((R/'data/canonical/droids/source-books/rebellion.json').read_bytes()).hexdigest(),
 'mechanicallyCertifiedEntries':0,'gitHubWriteAuthorization':False,
 'outstanding':'Full narrative source checks, canonical feat/talent mapping, installed components and weapon attack ownership, PC legality, schema and Foundry V13 testing.'}
(R/'docs/audits/droids/rebellion-local-state.json').write_text(json.dumps(receipt,indent=2)+'\n')
print('Rebellion reports complete:',len(rows),'rows',V['directFieldComparisons'],'fields',dict(hero))
