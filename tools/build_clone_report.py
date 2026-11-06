#!/usr/bin/env python3
"""Emit Clone Wars book report, backlog and checkpoint metadata. Local only."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
J=lambda p:json.loads((R/p).read_text())
ledger=J('data/canonical/droids/source-books/clone.json');r=ledger['sourceEntries']
qa=J('docs/audits/droids/clone-local-validation.json')
ev=J('data/audits/droids/clone-field-evidence.json');visual=J('data/audits/droids/clone-visual-field-review.json')
assert len(r)==len(ev['records'])==40
assert qa['status']=='PASS' and visual['directFieldComparisons']==sum(item['verifiedFieldCount'] for item in visual['items'])
assert qa['sha256Ledger']==__import__('hashlib').sha256((R/'data/canonical/droids/source-books/clone.json').read_bytes()).hexdigest()
reviewids={i['sourceEntryKey'] for i in visual['items']}
remaining=[]
for x in r:
 id=x['identity']['sourceEntryKey'];p=x['publication'];kind=x['classification']['primaryActorAuthority'];did=id in reviewids
 remaining.append({'sourceEntryKey':id,'printedName':x['identity']['printedName'],
  'printedPage':p['printedPageStart'],'selectedFirstPageFieldReview':'COMPLETE' if did else 'PENDING',
  'nextReview':['full page/source text/layout match','continuation and special rules','exact feat/talent prerequisite provenance',
   'installed components versus possessions','weapon ownership and attack alternatives','hero/stock PC rules',
   'full official JSON schema, engine test'],
  'authority':kind})
backlog={'schema':'swse.droid.clone.review-backlog/0.1','bookId':'CLONE','sourceClaims':40,
  'sourceDraftIdentities':40,'selectedFieldVisualReviews':len(reviewids),'unreviewedFirstPages':40-len(reviewids),
  'pendingFullMechanicalCertifications':40,'priorityNotes':[
   'CLONE-DROID-014: original census p95 is a source-index error; printed B1 squad statblock p94.',
   'CLONE-DROID-015: FX-6 statblock starts on printed p160 and continues printed p161.',
   'CLONE-DROID-020 and -021: two-column TXT interleaves B1-A with Battle Droid Assassin; do not assert OCR-derived feats or attacks.',
   'CLONE-DROID-034..040: all vehicle/starship-owned stats and firing groups must stay under Vehicle/Starship authority.',
   'CLONE-DROID-033: Ultra Droideka printed p197 PC prohibition verified; complex p198 attack modes/mounts remain unverified.',
   'All 32 individual-droid hero permissions were verified on the printed page; do not grant those to squad/vehicle format.',
   'CLONE-DROID-018: A-DSD main statblock begins printed p188 and continues p189; leg shield Ref 14/18 is a conditional defense mode.',
   'CLONE-DROID-027: JK-13 killing rage remains source-only and pending engine reconciliation.',
   'CLONE-DROID-030: Octuptarra persistent virus burst is not ordinary weapon damage.'
  ],'entries':remaining}
(R/'data/audits/droids/clone-review-backlog.json').write_text(json.dumps(backlog,indent=2)+'\n')
source=ledger['book'];md=f'''# Clone Wars Campaign Guide - Publication droid hydration (ROLLING LOCAL)

**Book 2 of 14. Status: IN PROGRESS, NOT MECHANICALLY CERTIFIED.**

## Current / overall counts

| Progress axis | Clone Wars | Entire project |
|---|---:|---:|
| Local source identity drafts | **40/40 (100%)** | **86/234 (36.8%)** |
| Selected-field printed PDF review | **{len(reviewids)}/40 ({round(100*len(reviewids)/40,1)}%)** | **{46+len(reviewids)}/234 ({round(100*(46+len(reviewids))/234,1)}%)** |
| Independently mechanically certified | **0/40 (0%)** | **0/234 (0%)** |
| Fully mechanically completed sourcebooks | -- | **0/14** |

The source identity pass is not the mechanical-source pass. **All feats, talents, mounts, attack alternatives, model hero routes, and V13 runtime execution remain uncertified.**

## Evidence

- Reused the **40 immutable `CLONE-DROID-###` identities** from the read-only publication census.
- Kept **32 individual droids**, **one B1 squad aggregation**, and **seven vehicle/starship-format droid claims** separate.
- **{len(reviewids)} rendered source entries** were selectively inspected across printed pages with **{visual['directFieldComparisons']} PDF field comparisons**.
- **{qa['counts']['printedHeroEligibilityVisuallyVerified']} factory-model hero permissions/prohibitions** were sight-read directly from visible PDF text; squad/vehicle eligibility remains absent. A factory model being allowed does not itself define a legal stock-route build.
- CLONE draft ledger SHA-256: `{qa['sha256Ledger']}`.
- Source PDF SHA-256: `{ev['sourcePdfSha256']}`.
- Local semantic checks: **{qa['status']}**. Mutation-based negative tests: **22/22 PASS**. Official upstream full JSON Schema and V13 engine tests: **NOT RUN**.

## High-priority discoveries / source corrections

1. **DD-13 (p66):** official printed cost **4,150**, not 4,950 as found in OCR. Checked against the rendered PDF. No permission to play this factory model as a droid hero.
2. **B1-Series Battle Droid Squad:** the prior upstream census points to printed **p95**, but the visible statblock is on printed **p94**. Retained source-only correction in this local ledger; no upstream GitHub writes. A squad is a derived aggregation, not a stock individual droid.
3. **FX-6 Medical Assistance Droid:** the main statblock spans printed **pp160-161**; the census page-end was incomplete. No field may be treated as absent merely because p160 ends.
4. **Hero-eligibility OCR bleed:** proximity-based text windows silently assigned NEXT model permission to preceding model (such as DD-13, BCA-11/X, CLL-6). All OCR-only permissions were cleared before selected reviewed model permissions were restored from PDF images.
5. **B1-A / Battle Droid Assassin (p190):** two-column OCR is heavily interleaved. Both distinct publication identities remain, but mechanical values and model permission have not been assigned from the mixed text.
6. **Ultra Droideka (p198):** source first-page statistics and price sight-read, but alternative attacks, independent mounts and use of wheeled locomotion remain only source claims.
7. **Ground Armored Tank (p198) and Hyena-class Bomber (p208):** these remain Vehicle/Starship-primary records. The sidecar captures some printed vehicle numbers, but the source ledger does **not** turn them into droid-actor HP, movement or weapon permissions.
8. **Batch 2:** inspected 20 additional entries on printed pages 188-202 (including split/mixed columns), and corrected the Ultra Droideka p197 hero prohibition. Source-only special rules include A-DSD leg shields, JK-13 killing rage, Octuptarra virus burst, and OG-9 critical leg damage.
9. **Language nuances:** P2 Series Astromech has Basic **understand-only**; not a proof that it speaks Basic. Similar limits on other droids require independent source-specific language mapping.

## Outstanding

- Selected first-page visual checks are completed for {len(reviewids)} publication claims; finish full secondary/continuation and source-mechanical rules for all 40.
- Reconcile printed feat/talent phrasing with certified canonical registry IDs and exact scopes.
- Map systems, manipulators, inventory and mounted weapons to actual authority, not merely statblock attack lines.
- Resolve vehicle/starship/squad-specific sources and any printed contradictions; no weapon execution rights until owner-reviewed certified components.
- Run upstream full authoritative draft schema validation, independent mechanical certification and Foundry V13 execution tests. No production compendium mutations.

## Per-publication register

| Census identity | Printed name | Printed page | Actor authority | Visual selected fields | Mechanical cert |
|---|---|---:|---|---|---|
'''
for x in r:
 id=x['identity']['sourceEntryKey'];name=x['identity']['printedName'].replace('|','\\|')
 p=x['publication']['printedPageStart'];aut=x['classification']['primaryActorAuthority']
 count=len(ev['records'][int(id[-3:])-1]['pdfVisualFieldChecks'].get('fieldValues',{}))
 md+=f'| {id} | {name} | {p} | {aut} | {count} | pending |\n'
md+='\n**Local-only checkpoint.** No GitHub commits or pushes. No Foundry production writes.\n'
(R/'docs/audits/droids/hydration-clone-rolling.md').write_text(md)
state={'schema':'swse.droid.clone.local-checkpoint/0.1','bookId':'CLONE','status':'IN_PROGRESS',
 'expectedClaims':40,'draftSourceClaims':40,'selectedFirstPageFieldReviews':len(reviewids),
 'directPdfFieldComparisons':visual['directFieldComparisons'],'mechanicalCertified':0,
 'nextUnreviewedSourceIdentity':next((x['sourceEntryKey'] for x in remaining if x['selectedFirstPageFieldReview']=='PENDING'),None),
 'fullOfficialSchemaValidated':False,'runtimeCertified':False,'sourcePdfSha256':ev['sourcePdfSha256'],
 'ledgerSha256':qa['sha256Ledger'],'localSemanticGuardsPass':qa['status']=='PASS',
 'productionCompendiumsMutated':False,'githubWritesThisPass':False,
 'repositorySyncState':'LOCAL_ONLY_UNPUSHED'}
(R/'docs/audits/droids/clone-local-state.json').write_text(json.dumps(state,indent=2)+'\n')
print('Clone report updated:',len(reviewids),'/40 visuals,',visual['directFieldComparisons'],'visual fields, 0/40 certified')
