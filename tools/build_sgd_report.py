#!/usr/bin/env python3
"""Regenerate local SGD report + machine-readable progress counters from live evidence.

Counts are computed from the working ledger; do not report book certification from
first-page visual source-field reviews. All paths remain local until owner approves.
"""
import json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
ledger=json.loads((root/'data/canonical/droids/source-books/sgd.json').read_text())
entries=ledger['sourceEntries']
evidence=json.loads((root/'data/audits/droids/sgd-field-evidence.json').read_text())['records']
visual=json.loads((root/'data/audits/droids/sgd-visual-field-review.json').read_text())['items']
qa=json.loads((root/'docs/audits/droids/sgd-local-validation.json').read_text())
backlog=json.loads((root/'data/audits/droids/sgd-review-backlog.json').read_text())
assert len(entries)==len(evidence)==len(visual)==len(backlog['models'])==46
assert qa['status']=='PASS' and qa['counts']['manualVisualFieldReviewRows']==46
c=qa['counts']; total=234
localdraft=len(entries); reviewed=len(visual); numerics=sum(v['verifiedFieldCount'] for v in visual)
mechanical=sum(x['certification']['mechanicalStatus']=='certified' for x in entries)
assert mechanical==0 and numerics==c['manualVisualFieldComparisons']
percent=lambda a,b:round(100*a/b,1) if b else None
categories=backlog['categories']
assert categories['SELECTED_FIELDS_PDF_VERIFIED']==46 and categories['OCR_ONLY']==categories['LAYOUT_ONLY_NO_FIELD_CERT']==0
pointers={ptr for x in evidence for ptr in (x.get('pdfVisualStatblockChecks') or {}).get('fieldValues',{})}
contradictions=[(x['identity']['sourceEntryKey'],t) for x in entries for t in x['exceptions'].get('sourceContradictions',[])]
blocked=[{'sourceEntryKey':x['identity']['sourceEntryKey'],'printedName':x['identity']['printedName'],'why':'source fields only; feat/talent scopes, runtime rights, systems/mounts and complete schema certification pending'} for x in entries]
progress={
 'schema':'swse.droid.local-progress-counter/0.1','workingBookId':'SGD','workstream':'droid-mechanical-hydration',
 'sourceBookTotal':14,'sourceBooksMechanicallyComplete':0,
 'overall':{'publicationClaimsTotal':234,'draftSourceEntries':46,'draftSourceCoveragePercent':percent(46,234),
            'selectedFieldPdfVisuallyReviewedEntries':reviewed,'selectedFieldPdfCoveragePercent':percent(reviewed,total),
            'independentlyMechanicalCertifiedEntries':0,'mechanicalCertificationPercent':0.0},
 'currentBook':{'id':'SGD','title':"Scavenger's Guide to Droids",'publishedClaimsTotal':46,
  'draftSourceEntries':46,'selectedFieldPdfVisuallyReviewedEntries':reviewed,'selectedFieldPdfPercent':percent(reviewed,46),
  'directPdfVisualFieldComparisons':numerics,'mechanicallyCertifiedEntries':mechanical,'mechanicalCertificationPercent':percent(mechanical,46),
  'status':'IN_PROGRESS_NOT_CERTIFIED','remainingUnvisuallyReviewedFirstPages':46-reviewed,
  'mechanicalCertificationsStillNeeded':46-mechanical},
 'remainingPublicationClaimsOutsideBook':234-46,'mechanicallyCertifiedOutsideBook':0,
 'caveat':'All 46 first-page statblocks had selected fields visually checked. This does NOT mean 46 full records are field-certified, attack-authorized, schema-certified, or ready for Foundry compendiums.',
 'githubWritesAuthorized':False,'repositorySyncState':'LOCAL_ONLY_UNPUSHED'}
progresspath=root/'data/audits/droids/droid-progress-counter.local.json'
progresspath.write_text(json.dumps(progress,indent=2,ensure_ascii=False)+'\n')
status={'schema':'swse.droid.local-checkpoint/0.2','bookId':'SGD','status':'IN_PROGRESS','expectedClaims':46,'identityRows':46,
        'pdfTextRows':46,'visuallyInspectedPageLayouts':c['visuallyInspectedPageLayouts'],
        'visualNumberFieldChecks':numerics,'visuallyFieldReviewedModels':reviewed,'mechanicalCertifiedClaims':0,
        'schemaDraftStatus':'PROPOSED_NOT_FROZEN','fullAuthoritativeSchemaValidated':False,
        'productionCompendiumsMutated':False,'githubWritesThisLocalPass':False,
        'repositorySyncState':'LOCAL_ONLY_UNPUSHED','sourcePdfSha256':backlog['sourcePdfSha256'],
        'ledgerSha256':qa['sha256Ledger'],'progressCounterPath':'data/audits/droids/droid-progress-counter.local.json',
        'nextAction':'Source field review is complete for selected first-page values; now reconcile remaining secondary views, systems/mounts, scoped feats/talents and independent full schema/engine certification before sourcebook promotion.'}
(root/'docs/audits/droids/sgd-local-state.json').write_text(json.dumps(status,indent=2)+'\n')
md=f'''# Scavenger's Guide to Droids - rolling mechanical hydration (LOCAL ONLY)

**Status: IN PROGRESS.** Printed source-first-page selected-field review has reached 46/46, but **no source record has been mechanically certified**. No GitHub writes, V13 production data edits, or sourcebook-promotion actions are authorized. The universal schema remains a draft.

## Rolling progress (generated from evidence)

| Dimension | Current SGD | Overall publication project |
|---|---:|---:|
| Publication claims indexed into local working source ledger | **46/46 ({percent(46,46)}%)** | **46/234 ({percent(46,234)}%)** |
| First-page source entries with selected fields visually cross-checked | **{reviewed}/46 ({percent(reviewed,46)}%)** | **{reviewed}/234 ({percent(reviewed,234)}%)** |
| Independently mechanically certified publication claims | **0/46 (0.0%)** | **0/234 (0.0%)** |
| Sourcebooks mechanically completed | -- | **0/14** |

The two axes must never be conflated: PDF visual **selected-field** inspection is not all-fields certification, and source-text mechanical paraphrase is not runtime permission.

## Evidence checkpoint

- **46 distinct source identities** (`SGD-DROID-001` to `SGD-DROID-046`), retaining source publication-specific identities.
- **45 droid-actor statblocks and one vehicle-format record** (DP-2, `SGD-DROID-008`). The latter remains governed by Vehicle authority, with no duplicated HP, defense, movement, geometry, or weapon attack groups.
- Printed primary statblock pages: **68, 70, ..., 158**, plus respective secondary/protocol text on adjoining pages up to 159. PDF page index is printed page +1 (1-based).
- **{numerics} separate visual field comparisons** in `data/audits/droids/sgd-field-evidence.json` (from selected visible first-page fields). All 46 now have concrete evidence pointers.
- Reviewed feat phrases **{c['rawFeatPhrases']}** and talent phrases **{c['rawTalentPhrases']}** are preserved as **source phrases**, *not canonical feat grants*. Skill expressions: **{c['rawSkillRows']}**.
- Factory-model hero eligibility is recorded provisionally as **{c['heroAllowedUncertified']} allowed** / **{c['heroProhibitedUncertified']} prohibited**; not a blanket chargen permission.
- PDF SHA-256: `{backlog['sourcePdfSha256']}`.
- Ledger SHA-256: `{qa['sha256Ledger']}`.
- Local semantic validator: **{qa['status']}**. **Full repository canonical JSON Schema and independent runtime verifier remain NOT RUN.**
- Unresolved source-text issue count: **{len(contradictions)} structured contradiction** and {c['unresolvedOCRWarnings']} nonblocking OCR/source-warning flag(s).

## Source-specific rules and model authority cautions

1. **DP-2 Probe Droid (p82):** vehicle-format statblock is primary; actor-level combat ownership/geometry must not be duplicated. Preserve crew, cargo and vehicle guns in the vehicle subsystem after source identity is resolved.
2. **MK-Series Maintenance Droid (p118):** main statblock explicitly shows *2nd-degree*, protocol view shows *3rd-degree*. Retained as structured unresolved `SGD-026-CONFLICT-DEGREE`. No silent adjudication.
3. **Droideka Mark II (p84) and Annihilator (p74):** mutually exclusive walking/wheeled modes and swift-action transformations; multiple attack rows do not certify individual installed weapon mounts.
4. **H-1ME (p106), R8 (p128), V6 (p152):** vehicle repair, shields and condition-track rules depend on exact action/DC, recharge prerequisites and vehicle authority.
5. **HK-77 (p108):** blaster surge has power-pack consumption and cooling restrictions; dual-rifle attack choice is not a free unconditional attack.
6. **HKB-3 (p110):** coordinated tracking, special sensors and simultaneous-fire damage must obey their printed target/group and aid-another conditions.
7. **KM1 (p112) / Colicoid T4 (p144):** different kinds of shield ratings and area attacks require explicit component and damage-type reconciliation.
8. **SD-9 (p136), Shadow Droid (p142), X-1 (p154), YVH (p158):** defensive/weapon interactions and energy variants cannot be represented as an undifferentiated generic attack.
9. **MEV (p116):** bed deployment changes occupied geometry conditionally; do not encode it as permanently 1x2.
10. **TT-8L (p148):** printed speed `0` is an intentional zero, not an unknown field.
11. **Model hero eligibility:** 30 allowed/16 prohibited represent the printed factory model only; legal PC construction and stock/custom routes require separate rules review.

## Remaining acceptance gates

- Review **secondary page narratives and protocol presentations** for every entry and reconcile unusual rules and printed conflicts; the 46/46 figure tracks *selected first-page fields*, not this entire step.
- Reconcile scoped feat/talent names to independently certified canonical registry identities. Parenthesized multiple scopes remain grouped source phrases until verified.
- Audit installed systems, possession distinctions, manipulation, capacity, weapon mounts and actor/vehicle delegation. Never infer mounting permissions from weapon attack strings.
- Resolve DP-2 against vehicle SSOT; no duplicate actor or independent vehicle attacks.
- Validate against upstream full JSON Schema 2020-12, including source-citation/ref semantics; then run independent mechanical certification and V13 runtime verification. Zero promotion until all gates pass.
- Keep every file local. **No GitHub writes until explicit user authorization.**

## Full publication source register

| Listing | Printed model | Printed page | CL | Hero availability (source-only) | Selected first-page checks | Mechanical cert |
|---|---|---:|---:|---|---:|---|
'''
for rec,ev in zip(entries,evidence):
 id=rec['identity']['sourceEntryKey'];name=rec['identity']['printedName'].replace('|','\\|');page=rec['publication']['printedPageStart'];level=rec['challenge'].get('challengeLevel');avail=rec['pcConstruction'].get('heroEligibility');cnt=len(ev['pdfVisualStatblockChecks']['fieldValues']);stat=rec['certification']['mechanicalStatus']
 md+=f'| {id} | {name} | {page} | {level} | {avail} | {cnt} | {stat} |\n'
md+='''
## Local working files

- `data/canonical/droids/source-books/sgd.json`: source records and draft mechanics, **uncertified**.
- `data/audits/droids/sgd-field-evidence.json`: primary-page statblock text plus verified field pointer/value evidence.
- `data/audits/droids/sgd-visual-field-review.json`: 46 source reviews / counted field checks.
- `data/audits/droids/sgd-review-backlog.json`: completed first-page inspection queue and pending deeper checks per source identity.
- `data/audits/droids/droid-progress-counter.local.json`: rolling current-book/overall counters used in user updates.
- `docs/audits/droids/sgd-local-state.json`: machine-readable checkpoint.
- `docs/audits/droids/sgd-local-validation.json`: explicit local semantic validation receipts, not canonical schema approval.
- `tools/extend_sgd_visual_review.py`, `tools/extend_sgd_visual_final_batch.py`, `tools/reconcile_sgd_first_seven.py`: cumulative, page-anchored review passes.

**Never overwrite source-ledger manual changes with the original text hydration generator.** The legacy 16-page writer rejects running against newer evidence. Rerun local validation and negative tests after any modification.
'''
(root/'docs/audits/droids/hydration-sgd-rolling.md').write_text(md)
(root/'docs/audits/droids/droid-progress-rolling.md').write_text('''# Rolling SWSE droid progress (LOCAL ONLY)\n\n| Counter | Current SGD | Overall project |\n|---|---:|---:|\n'''+f'| Source drafts | **46/46 (100%)** | **46/234 ({percent(46,234)}%)** |\n| Selected first-page PDF field reviews | **{reviewed}/46 ({percent(reviewed,46)}%)** | **{reviewed}/234 ({percent(reviewed,234)}%)** |\n| Mechanical certifications | **0/46 (0%)** | **0/234 (0%)** |\n| Sourcebooks mechanically complete | -- | **0/14** |\n\n{progress["caveat"]}\n')
print('Generated current-book and overall rolling progress; visual checks',numerics,'status',qa['status'])
