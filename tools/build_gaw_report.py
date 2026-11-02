#!/usr/bin/env python3
"""Rebuild GAW local source-review report and mechanical-blocker register. No GitHub I/O."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
load=lambda p:json.loads((R/p).read_text())
L=load('data/canonical/droids/source-books/gaw.json');E=load('data/audits/droids/gaw-field-evidence.json');V=load('data/audits/droids/gaw-visual-field-review.json')
assert len(L['sourceEntries'])==len(E['records'])==len(V['items'])==22
assert sum(x['verifiedFieldCount'] for x in V['items'])==V['directFieldComparisons']
rows=[]
for n,(r,x,it) in enumerate(zip(L['sourceEntries'],E['records'],V['items']),1):
 c=r['classification'];a=c['primaryActorAuthority'];key=r['identity']['sourceEntryKey']
 blocks=['verify all printed narrative/continuation rules beyond selected fields',
 'resolve canonical feat and talent identities, selections and published prerequisites',
 'reconcile physical systems, possessions, installed components and component provenance',
 'certify distinct weapon instances, mounts, printed attack-group AND/OR modes and action economy',
 'reconcile model-specific conditional rules, modifiers and exception/errata precedence',
 'resolve printed legal PC construction route if source permits hero use',
 'validate against upstream universal-source JSON Schema 2020-12',
 'verify Foundry V13 V2 engine execution and persistence']
 if n==12:blocks+=['test p98 base Reflex 15 vs p175 conditional +5 cover to Reflex 20; never make cover permanent']
 if n==19:blocks+=['reconcile Ground Armored Tank against vehicle actor SSOT; crew droid brain, vehicle HP/DR/weapons and attacker authority remain vehicle-owned']
 if n==20:blocks+=['use squad aggregation rules; source printed p217 with three B1 droids; p220 census repetition claim rejected by PDF']
 if n in (4,7,14,15,16,17,18):blocks+=['source relation to previously published factory model does NOT authorize inherited mechanical identity without reconciliation']
 if n in (13,14,15,16,17,18,21,22):blocks+=['adventure statblock does not establish model hero eligibility; null cannot be treated as allowed']
 rows.append({'sourceEntryKey':key,'printedName':r['identity']['printedName'],'printedPage':r['publication']['printedPageStart'],
  'actorAuthority':a,'selectedFieldCount':it['verifiedFieldCount'],
  'firstPageSelectedReview':'complete','mechanicalCertification':'BLOCKED','runtimeExecution':'NOT_TESTED',
  'heroEligibility':r['pcConstruction']['heroEligibility'],'blockers':blocks})
back={'schema':'swse.droid.gaw.mechanical-review-backlog/0.1','book':'Galaxy at War','publicationClaims':22,
 'selectedFirstPageVisualReviews':len(V['items']),'mechanicallyCertified':0,'records':rows,
 'limitations':'All source reviews represent selected first-page fields, not complete book certification.'}
P=R/'data/audits/droids/gaw-review-backlog.json';P.write_text(json.dumps(back,indent=2,ensure_ascii=False)+'\n')
from collections import Counter
kinds=Counter(x['actorAuthority'] for x in rows); heroes=Counter((x['heroEligibility'] or 'not-stated') for x in rows)
md=f'''# Galaxy at War - SWSE Droid Source Hydration Local Review (Book 5/14)

**LOCAL ONLY; do not push or import without explicit authorization.**

| Measure | Galaxy at War | Overall through five books |
|---|---:|---:|
| Draft publication identities | **22/22 (100%)** | **161/234 (68.8%)** |
| Selected first-page PDF reviews | **22/22 (100%)** | **161/234 (68.8%)** |
| Selected visual field comparisons | **{V['directFieldComparisons']}** | **2,307** |
| Mechanically certified | **0/22** | **0/234** |
| Mechanically complete books | -- | **0/14** |

## Source, identity, and provenance

- Owner-provided *Galaxy at War* PDF and indexed text file were SHA-256 recorded in `gaw-field-evidence.json`.
- Read-only upstream census gives 22 separate publication claims; these remain separate from equivalent statblocks in Core/Clone Wars.
- Printed page images reviewed at pp51-57, 98, 175, 181 and 210-220. The 22 claims are distributed across 21 distinct rendered pages.
- Classification: {kinds['droid']} droid actors (including stationary sentry), {kinds['vehicle']} vehicle-primary Ground Armored Tank, {kinds['squad-aggregation']} B1 squad aggregate.
- Printed hero permissions for the first eleven chapter models: **4 allowed, 7 prohibited**. The nine other actor-format claims have no new GAW permission established, and vehicle/squad hero construction is not applicable.
- No printed attack row, listed feat, source relationship or conditional special ability is represented as executable V13 authority.

## Specific source decisions

1. **A-Series Medical Droid (p51):** model-specific Medical Droid healing talent requires a scoped implementation rather than a generic Treat Injury boost.
2. **KDY-4 and Chiba-DR10 (p52):** separate statblocks despite OCR interleaving; do not transfer KDY stability or Chiba weapon/system data to the other.
3. **Air Assault Super Battle Droid (p53):** integrated jet-pack charges and volatile fuel differ from universal defaults; no inferred activation.
4. **Eradicator (p53):** central-controller shutdown dependency remains conditional rather than an unconditional droid-processor feature.
5. **Purge Trooper (p54):** DR 10 is a defense value, with model-specific lightsaber/cortosis exception pending rule resolution.
6. **Sniper Droideka (p55):** exclusive wheeled locomotion, sniper attack modes, and shield rating remain source observations, not certified actions.
7. **Tactical Droid (p55, second presentation p213):** single GAW identity. Printed price **14,005 credits**, not the shorter, potentially misleading OCR numeral. Battle Analysis and Vehicle Combat require feat/talent reconciliation.
8. **Vigilant 2X (p56):** self-destruct, repeating blaster, launcher, and energy requirements require separate inventory/mount evidence.
9. **Automated Sentry Gun (p98 vs p175):** printed base Ref 15 (flat-footed 14) versus encounter Ref 20 (flat-footed 19) under +5 cover. Store situational modifier, not a permanent defense boost.
10. **Arakyd AZ-Series (p181):** printed double-attack option is not installed weapon permission.
11. **Ground Armored Tank (p216):** vehicle-primary. HP 175/DR 10 and vehicle weapons remain in evidence only; no duplicate droid actor.
12. **B1 squad (p217):** consists of three B1 droids; hp 20 and Large squad size remain squad-only source data. The upstream census claims an additional statblock on **p220**, but the rendered p220 has other named character blocks, **not** a B1 squad. Preserve this census discrepancy without creating a duplicate.
13. **Battle Droid Assassin (p218):** separate adventure variant, not interchangeable with a basic B1 factory record.
14. **LR-57 (p219):** passive standby and activation behavior must not silently become a universal ability.

## Per-entry selected-field register

| ID | Printed name | Page | Authority | Checked pointer fields | Mechanical certification |
|---|---|---:|---|---:|---|
'''
for x in rows:md+=f"| {x['sourceEntryKey']} | {x['printedName']} | {x['printedPage']} | {x['actorAuthority']} | {x['selectedFieldCount']} | BLOCKED |\n"
md+='''
## Scope of completion and next gates

This completes selected-field first-page PDF checks only. Source TXT/OCR windows are retained as untrusted extraction evidence, not certified rule implementations. Further work is required to verify all printed narrative facts and continuation pages, exact feat/talent identities and prerequisites, Systems versus Possessions, installed weapon provenance, legal PC creation and the complete action economy. Full upstream JSON Schema 2020-12 validation and live Foundry V13 runtime checks remain **NOT RUN**.

Local semantic checks and negative-mutation tests should pass before any next-book work. Keep this book at `IN_PROGRESS_NOT_CERTIFIED` and preserve source hashes and original printed-page citation receipts.
'''
(R/'docs/audits/droids/hydration-gaw-rolling.md').write_text(md)
S={'schema':'swse.droid.gaw.local-state/0.1','bookId':'GAW','localCheckpoint':8,
 'sourceDraftEntries':22,'selectedFirstPageReviews':22,'directFieldComparisons':V['directFieldComparisons'],
 'sourcePrintedPages':sorted(set(x['printedPage'] for x in rows)),
 'extraPrintedPageReview':[175,212,213,218,220],'sourcePdfSha256':E['sourcePdfSha256'],
 'sourceTxtSha256':E['sourceTxtSha256'],
 'ledgerSha256':hashlib.sha256((R/'data/canonical/droids/source-books/gaw.json').read_bytes()).hexdigest(),
 'mechanicallyCertifiedEntries':0,'gitHubWriteAuthorization':False,
 'outstanding':'Full narrative/feats/talents/systems/mount/PC-route certification, upstream JSON Schema and Foundry runtime.'}
(R/'docs/audits/droids/gaw-local-state.json').write_text(json.dumps(S,indent=2)+'\n')
print('GAW report/backlog updated',len(rows),'entries;',V['directFieldComparisons'],'visual comparisons;',dict(heroes),'hero statuses')
