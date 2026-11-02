#!/usr/bin/env python3
"""Regenerate local KOTOR visual/source status and complete certification backlog."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
source=lambda f:json.loads((R/f).read_text())
l=source('data/canonical/droids/source-books/kotor.json')
e=source('data/audits/droids/kotor-field-evidence.json')
v=source('data/audits/droids/kotor-visual-field-review.json')
assert len(l['sourceEntries'])==len(e['records'])==len(v['items'])==24
assert v['directFieldComparisons']==sum(x['verifiedFieldCount'] for x in v['items'])
rows=[]
for i,(r,x,it) in enumerate(zip(l['sourceEntries'],e['records'],v['items']),1):
 c=r['classification'];name=r['identity']['printedName'];key=r['identity']['sourceEntryKey'];p=r['publication']['printedPageStart']
 blockers=['complete original printed page and continuation-rule reconciliation','canonical feat/talent identity and provenance','published Systems/Possessions installation-vs-carried provenance','weapon instance/mount and attack-group legality','model-specific conditional effects and action economy','hero creation route and starting level (if applicable)','upstream JSON Schema 2020-12 validation','Foundry V13 live runtime verification']
 if c['primaryActorAuthority']=='vehicle':
  blockers+=['vehicle engine actor mapping; passenger/crew weapon-control delegation; preserve vehicle-owned statistics']
 if i in (6,7,8,21):blockers+=['preserve independent HK heroic template vs factory assassin vs HK-47 named character identity']
 if i in (20,22):blockers+=['named instance and stock chassis are separate canonical claims; no automatic NPC starting profile']
 if i==24:blockers+=['hero eligibility not source-established; null prohibits inferred permission']
 rows.append({'sourceEntryKey':key,'printedName':name,'printedPage':p,'actorAuthority':c['primaryActorAuthority'],
  'selectedFieldCount':it['verifiedFieldCount'],'firstPageSelectedReview':'complete',
  'mechanicalCertification':'BLOCKED','runtimeExecution':'NOT_TESTED',
  'heroEligibility':r['pcConstruction']['heroEligibility'],
  'blockers':blockers})
 backlog={'schema':'swse.droid.kotor.mechanical-review-backlog/0.1','book':'Knights of the Old Republic Campaign Guide',
  'count':24,'selectedVisualReviewCount':24,'mechanicallyCertified':0,'claims':rows}
p=R/'data/audits/droids/kotor-review-backlog.json';p.write_text(json.dumps(backlog,indent=2,ensure_ascii=False)+'\n')
kind=lambda i:('vehicle' if i==19 else ('named NPC' if i in (20,21,22) else ('independent heroic template' if i==7 else 'factory/stock entry')))
hero=[r['pcConstruction']['heroEligibility'] for r in l['sourceEntries']]
counts={k:hero.count(k) for k in ('allowed','prohibited','conditional',None)}
md=f'''# Knights of the Old Republic - Droid Publication Hydration (Local checkpoint 7)

**Scope:** 24 book-specific publication claims. **Local only**, no GitHub writes or Foundry imports. Selected statblock first-page PDF verification is not full mechanical certification.

| Measure | KOTOR | Overall (4 books) |
|---|---:|---:|
| Draft source records | 24/24 | 139/234 (59.4%) |
| Selected-first-page PDF review | 24/24 | 139/234 (59.4%) |
| Selected exact-page visual field comparisons | {v['directFieldComparisons']} | 2,022 |
| Mechanically certified | 0/24 | 0/234 |
| Mechanically complete books | -- | 0/14 |

**Source:** Knights of the Old Republic Campaign Guide, printed pp81-89, 165, 203, 212-213, 216, 222-223. PDF source SHA-256: `{e['sourcePdfSha256']}`. Text is an indexing layer, not the final authority.

**Actor formats:** 23 character-scale droid records (including three named individuals and one independent HK heroic template) plus one **Basilisk vehicle-primary**. **Hero eligibility source overlay:** {counts['allowed']} allowed; {counts['prohibited']} prohibited; {counts['conditional']} conditional; {counts[None]} not established / named character not a PC template. These labels are not authorization to instantiate a starting PC without a legal route.

## Important source decisions and unresolved items

- **HK source identities (printed pp84-85, 213):** HK-24 and HK-50 assassin factories are explicitly not playable as droid heroes. The Independent HK-Series heroic baseline is a separate GM-conditional template. HK-47 is a named NPC with an independent career history and is **not** established as derived from the heroic template. No accidental transfer of levels, weapons, or talents.
- **GO-TO and T3-M4 (printed pp82, 212, 216):** Both named characters have separate publication claims and retain a census-backed reference to their factory/series model. This relationship does not enable automatic mechanic duplication.
- **Basilisk (printed p203):** Huge air vehicle (droid), not a regular droid actor. Printed 70 hp, DR 5, passenger, droid-brain crew, velocity, attack group, weapon ammunition and value belong to **vehicle-only source evidence**. Passenger substitution/control rule is source-only, not executable.
- **K-X12 (printed p86):** Self-destruct and drone/deployment context are pending standalone action/equipment authority.
- **Mark I versus Mark IV Assault Droid (printed p165):** Different printed attack modes, durability and loadouts; source weapons are not certified mounts.
- **Krath War Droid (printed p222):** Basic is understood but not spoken; preserve separate capabilities.
- **Rakatan Guardian (printed p223):** Printed integrated weaponry is a possessions statement, not a certified weapon instance list.
- **Cross-page eligibility:** GO-TO factory prohibition appears in narrative on printed p81; HK-50 factory prohibition is printed on p84. Their visual source receipts are separate from the main statblock-page numeric comparison counts.
- **Labels:** The existing census sometimes drops manufacturer prefixes from complete printed statblock headings. Census IDs/names are retained for identity parity; do not claim the normalized title is a verbatim full heading.

## Mechanical certification backlog

All 24 records remain blocked by at least these gates: full rule/narrative reading, canonical feats/talents and source citations, installed component provenance, weapon-mount and attack-group authority, creation-route legality, full upstream schema validation, and Foundry V13 runtime execution. See `data/audits/droids/kotor-review-backlog.json`.

## Per-entry selected PDF review

| ID | Publication claim | Printed page | Authority | Selected fields | Mechanical gate |
|---|---|---:|---|---:|---|
'''
for i,x in enumerate(rows,1):
 md+=f"| KOTOR-DROID-{i:03d} | {x['printedName']} | {x['printedPage']} | {kind(i)} | {x['selectedFieldCount']} | BLOCKED |\n"
md+='''
## Verification boundaries

- KOTOR local typed/source-field validator and independent negative-mutation suite must pass.
- Printed PDF images are preserved in the local `work/` folder, but omitted from the distributable ZIP because original copyrighted books are not redistributed.
- Full upstream canonical JSON Schema 2020-12 validation **has not run**. V13 live runtime verification **has not run**.
- No production compendiums, actor data, schema authority, GitHub branch, commit or PR have been modified.
'''
(R/'docs/audits/droids/hydration-kotor-rolling.md').write_text(md)
status={'schema':'swse.droid.kotor.local-state/0.1','bookId':'KOTOR','localCheckpoint':7,
  'selectedFirstPageReviews':24,'selectedFieldComparisons':v['directFieldComparisons'],'sourceDraftEntries':24,
  'sourcePrintedPages':sorted(set(x['printedPage'] for x in rows)),
  'pdfSha256':e['sourcePdfSha256'],'textSha256':e['sourceTxtSha256'],
  'ledgerSha256':hashlib.sha256((R/'data/canonical/droids/source-books/kotor.json').read_bytes()).hexdigest(),
  'mechanicalCertification':0,'gitHubWriteAuthorization':False,'pending':'Full rule and executable mechanic certification; upstream schema and live V13 checks.'}
(R/'docs/audits/droids/kotor-local-state.json').write_text(json.dumps(status,indent=2)+'\n')
print('KOTOR report:',len(rows),'entries,',v['directFieldComparisons'],'compared fields; 0 certified')
