#!/usr/bin/env python3
"""Rebuild Threats local rolling Markdown + backlog from frozen selected PDF evidence."""
import json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1]
get=lambda p:json.loads((R/p).read_text())
ledger=get('data/canonical/droids/source-books/threats.json')
ev=get('data/audits/droids/threats-field-evidence.json')
vis=get('data/audits/droids/threats-visual-field-review.json')
val=get('docs/audits/droids/threats-local-validation.json')
recs=ledger['sourceEntries'];assert len(recs)==29 and val['status']=='PASS'
assert len(vis['items'])==29
special={1:'Light concussion missile launcher sidebar, missile ammunition and attack ownership',
 7:'Reconnaissance-specific systems, no universal astromech permissions',
 8:'B3 multiple weapon firing options and grouped attacks',
 9:'B3-A upgrades, multiattack groups and weapon mounts',
 11:'Pistoeka buzz droid carrier, cutting and discord missile interactions',
 12:'Colossal construction model: locomotion, grapple and scale rules',
 13:'Gargantuan demolitions model: construction tools, target restrictions',
 15:'TO-D sonic stunner weapon sidebar vs actual equipment',
 21:'Replica Droid NPC profile vs distinct species creation modifiers',
 22:'Guri named NPC vs factory template; replica traits must not double apply',
 25:'Diminutive seeker: stealth, equipment, surveillance rules',
 27:'SD-6 DR 3 plus controlled-burst configurations; not yet executable',
 28:'Sith sword source item vs Sith Warbot instance and attack options'}
back=[]
for i,r in enumerate(recs,1):
 id=r['identity']['sourceEntryKey'];c=r['certification']
 back.append({'sourceEntryKey':id,'name':r['identity']['printedName'],
 'printedPageStart':r['publication']['printedPageStart'],
 'sourceIdentityStatus':c['identityStatus'],'selectedFirstPageVisualReview':'COMPLETE',
 'fullSourceNarrativeReview':'PENDING','featAndTalentIdentity':'PENDING',
 'systemsAndWeaponInstanceOwnership':'PENDING','PCStartingRoute':'PENDING',
 'foundryV13Runtime':'NOT_TESTED','mechanicalCertification':'PENDING',
 'heroEligibility':r['pcConstruction'].get('heroEligibility'),
 'specialFocus':special.get(i,'Complete statblock/encounter prose, feat identity, possessions, attack ownership and legal creation route')})
(R/'data/audits/droids/threats-review-backlog.json').write_text(json.dumps({
 'schema':'swse.droid.threats.mechanical-backlog/0.1','scope':'All 29 first-page selected-field PDF reviews done; NO complete mechanical certification',
 'unreviewedFirstPages':0,'fullMechanicalReconciliationsOutstanding':29,
 'nextRecommended':'Identity-checked narrative continuation and exact feat/talent plus systems/possessions component provenance',
 'records':back},indent=2)+'\n')
state={'schema':'swse.droid.threats.local-state/0.1','bookId':'THREATS','checkpoint':'local-source-review-1',
 'sourceBookPdf':ev['sourcePdf'],'sourceBookPdfSha256':ev['sourcePdfSha256'],
 'sourceBookTxt':ev['sourceTxt'],'sourceBookTxtSha256':ev['sourceTxtSha256'],
 'sourceEntryCount':29,'selectedFirstPagePdfVisualReviews':len(vis['items']),
 'directVisualFieldComparisons':vis['directFieldComparisons'],
 'mechanicallyCertified':0,'runtimeCertified':0,
 'ledgerSha256':hashlib.sha256((R/'data/canonical/droids/source-books/threats.json').read_bytes()).hexdigest(),
 'schemaVersion':ledger['draftSourceEntrySchema'],
 'upstreamJsonSchemaFullPass':False,'githubWrites':0}
(R/'docs/audits/droids/threats-local-state.json').write_text(json.dumps(state,indent=2)+'\n')
counts={'prohibited':0,'allowed':0,'unspecified':0}
for r in recs:
 h=r['pcConstruction'].get('heroEligibility')
 counts[h if h else 'unspecified']+=1
md=f'''# Threats of the Galaxy — Droid source hydration (local rolling checkpoint)

**Book 3/14. Local source-review phase complete for selected first-page fields; NOT mechanical certification.** No commits, pushes, Foundry imports or production data edits.

## Rolling counters

| Measure | Threats | Overall project |
|---|---:|---:|
| Publication source records drafted | **29/29 (100%)** | **115/234 (49.1%)** |
| Selected first-page PDF review | **29/29 (100%)** | **115/234 (49.1%)** |
| Mechanically certified | **0/29** | **0/234** |
| Mechanically complete books | -- | **0/14** |

**Source-backed selected-field comparisons:** {vis['directFieldComparisons']} on 27 rendered printed pages (pp134–160). Cumulative PDF comparisons: **1,653** (SGD 811; Clone 528; Threats {vis['directFieldComparisons']}).

## What is actually verified

- Immutable source identities **THREATS-DROID-001..029**, exact census page citations and PDF offsets, actor authority, degree/size/CL as printed.
- Selected printed first-page numeric fields: HP, threshold, Reflex/Fortitude/Will, selected flat-footed defenses and SD-6 printed DR 3. Specific checks appear as JSON pointers in `threats-field-evidence.json`.
- **Replica Droid** (p152) and **Guri** (p153) remain distinct source records; Replica Droid Species Traits (p153) are referenced, not applied twice.
- **Printed hero eligibility:** {counts['allowed']} allowed, {counts['prohibited']} prohibited, {counts['unspecified']} not explicitly assigned. Missing permission cannot become implicit allow; NPC eligibility does not itself certify a legal stock PC build.
- Special rules remain source-only: VX light concussion missile launcher, Pistoeka buzz droid deployment, TO-D sonic stunner, B3/B3-A group firing, SD-6 controlled bursts, Sith sword.
- SD-6 DR 3 is correctly typed as `defenses.damageReduction`, **not** `durability.damageReduction`.

## Source/reconciliation blocks

- PDF is image-only. The supplied TXT is a searchable, potentially misordered OCR layer. It is **not** sufficient for exact attack-group, model name, hero permission or installed-system provenance.
- All **29** still need complete statblock, traits, source narrative, encounter page, ability score, feat and talent identity checks. Only the specifically recorded JSON Pointer fields count as PDF reviewed.
- No individual feat or talent is executable; no weapon mount or factory component instance has been certified. Source mechanics are suggestions for reconciliation, not activation rights.
- No starting droid chargen route is authorized. Replica species mechanics remain delegated to the appropriate droid-species/runtime authority.
- Full upstream schema validation and live Foundry V13 runtime tests have **not** run. Local semantic checks alone cannot upgrade certification.

## Identity-by-identity book ledger

| ID | Model/individual | Page | Visual checks | Hero eligibility | Mechanical certification |
|---|---|---:|---:|---|---|
'''
for r in recs:
 id=r['identity']['sourceEntryKey'];idx=int(id.rsplit('-',1)[1])-1
 h=r['pcConstruction'].get('heroEligibility') or 'not stated/assigned'
 md+=f"| {id} | {r['identity']['printedName']} | {r['publication']['printedPageStart']} | {vis['items'][idx]['verifiedFieldCount']} | {h} | **pending** |\n"
md+='''
## Next work before any certification

1. Finish narrative/encounter and every printed mechanical line for each of the 29 publication entries.
2. Reconcile published feats and talents against canonical SSOT IDs and exact printed prerequisites; preserve raw and source provenance until certified.
3. Resolve all source systems and possessions into installed component instances; attach weapons to verified mounts and keep attack expressions source-only.
4. Reconcile source-specific edge rules and the replica species/individual split with existing V2 engine authority; no duplicated effects.
5. Execute full upstream JSON Schema 2020-12 checks, negative tests and Foundry V13 runtime verification prior to independent certification.

**GitHub policy:** Local rolling files only until owner explicitly authorizes upload.
'''
(R/'docs/audits/droids/hydration-threats-rolling.md').write_text(md)
print('THREATS REPORT: 29 entries,',vis['directFieldComparisons'],'selected field receipts, hero eligibility',counts)
