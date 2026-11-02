#!/usr/bin/env python3
"""Checkpoint10 documentation receipt; source drafts remain uncertified and local only."""
from pathlib import Path
import json,hashlib,shutil
R=Path(__file__).resolve().parents[1]
P=R/'data/audits/droids/droid-progress-counter.local.json'
p=json.loads(P.read_text());assert p['overall']['draftSourceEntries']==212
assert p['overall']['selectedFieldPdfVisuallyReviewedEntries']==212
assert p['overall']['independentlyMechanicalCertifiedEntries']==0
assert p['overall']['directPdfVisualFieldComparisons']==3375
books={x:{'core':13,'legacy':12,'force':11}[x] for x in ('core','legacy','force')}
validation=json.loads((R/'docs/audits/droids/core-local-validation.json').read_text())
assert validation['semanticValidation']=='PASS'
updates={
'checkpoint':'10','status':'LOCAL_SOURCE_REVIEW_COMPLETE_FOR_THREE_BOOKS_MECHANICS_UNCERTIFIED',
'books':{x.upper():{'sourceEntries':n,'selectedFieldReviews':n,'comparedFields':json.loads((R/f'data/audits/droids/{x}-visual-field-review.json').read_text())['directFieldComparisons'],'mechanicalCertifications':0} for x,n in books.items()},
'cumulative':p['overall'],
'validation':{'priorSixBookSemantic':'6/6 PASS','newThreeBookSemantic':'3/3 PASS','newThreeBookNegativeMutationTests':'36/36 PASS',
  'allNineBookSemantic':'9/9 PASS', 'allNineBookMutationSuitesRerun':False,
  'fullJsonSchemaValidated':False, 'foundryRuntimeValidated':False},
'criticalSourceFindings':['Core Rulebook printed Droideka CL 4; earlier upstream census CL 6 is incorrect (local correction only).',
 'Core Dwarf Spider Droid CL 3, IG-100 Series MagnaGuard CL 6, Viper Series Probe Droid CL 1 verified in print.',
 'Core B1 droid hero prohibited; B2 explicitly allowed; stock models are not named R2-D2 or C-3PO.',
 'Legacy LV8 does not print a degree, although under fourth-degree section.',
 'Force Unleashed regular Junk Droid has Ref 14 (flat-footed 11), unlike its OCR neighboring Brute.',
 'Force IT-O hero permission requires reprogramming.',
 'Force PROXY Jedi levels/Force points do not grant droid-wide Force abilities.',
 'Force BD-3000 25,000 new / 8,000 used credits are distinct economic claims.'],
'githubWritesAuthorized':False,
'nextSourcebook':'Galaxy of Intrigue (8 claims)',
'otherOpenWork':'Full field/narrative review, feat/talent provenance, installed systems, mounts, hero construction, schema validation, runtime certification for all drafted claims.'}
(R/'docs/audits/droids/checkpoint10-three-books.local.json').write_text(json.dumps(updates,indent=2)+'\n')
intro='''# SWSE Droid Publication Hydration — Local Rolling Workspace

**Checkpoint 10 — Three-book source-review pass. LOCAL ONLY. No GitHub commits/pushes, Foundry imports, production pack writes or schema promotions authorized.**

## Progress: Core / Legacy / Force Unleashed

| Gate | Core | Legacy | Force Unleashed | 14-book total |
|---|---:|---:|---:|---:|
| Draft source identities | 13/13 | 12/12 | 11/11 | **212/234 (90.6%)** |
| Selected-field PDF reviews | 13/13 | 12/12 | 11/11 | **212/234 (90.6%)** |
| Selected printed PDF comparisons | 263 | 251 | 229 | **3,375** |
| Independently mechanically certified | 0/13 | 0/12 | 0/11 | **0/234** |
| Mechanically complete books | — | — | — | **0/14** |

**Book-level semantic validators:** Nine of nine pass (all six earlier ledgers and all three new ledgers). **New negative mutation tests:** 36/36 pass (Core 12, Legacy 12, Force 12). This does not constitute a complete rerun of earlier mutation suites, upstream universal schema validation, or V13 runtime testing.

### Critical print-over-OCR decisions

- Core Droideka **CL 4** appears in the printed Core Rulebook p200. The earlier census says CL 6; do not silently adopt that erroneous census figure or misrepresent it as an official printed contradiction.
- Core Dwarf Spider Droid CL 3, IG-100 MagnaGuard CL 6, Viper Probe Droid CL 1 are visible in the original statblocks, notwithstanding missing census CL fields.
- Stock Core B1 **cannot** be a droid hero, whereas B2 **can**. Named R2-D2/C-3PO are not factory starting-profile identities.
- Legacy LV8-Series Guard Droid does not explicitly print a degree; the fourth-degree section heading is preserved separately from publishedDegree=null.
- Force regular Junk Droid is **Ref 14 (flat-footed 11)**, not Brute's Ref 13. Regular, Brute and Behemoth are distinct source claims, with no explicitly printed degree on any of their own statblocks.
- Force IT-O must be **reprogrammed** for its conditional hero use. PROXY is a named character; no droid-wide Force permission is implied.
- Force BD-3000 new 25,000 / used 8,000 credits are distinct prices.
- Printed attacks, listed feats/talents, equipment mounts, and rare special mechanics remain **non-executable** until independent source-and-engine certification.

### New local outputs

Each of `core`, `legacy`, and `force` has the following files:

- `data/canonical/droids/source-books/<id>.json` — immutable source identities and selected source-only mechanics.
- `data/audits/droids/<id>-census-identity.json` — mapping to upstream source census.
- `data/audits/droids/<id>-field-evidence.json` — source hashes, TXT windows, visual field receipts.
- `data/audits/droids/<id>-visual-field-review.json` — evidence/counts per identity.
- `data/audits/droids/<id>-review-backlog.json` — independent mechanical certification blockers.
- `docs/audits/droids/hydration-<id>-rolling.md` — Markdown source review report.
- `docs/audits/droids/<id>-local-state.json` and `<id>-local-validation.json` — scope and results.

Also included: `tools/start_core_legacy_force_local.py`, `tools/render_next_three.py`, `tools/validate_next_three_local.py`, `tools/test_next_three_guards.py`, the data-derived rolling progress counter, and `docs/audits/droids/checkpoint10-three-books.local.json`.

**Reproducibility:** One-time seed scripts refuse overwrite and must not replace later reviewed values. Source PDFs and rendered images are deliberately excluded from the ZIP; local receipts include PDF SHA256 and source-image references, and source owners retain primary files.

### Next work

Next in source-review queue: **Galaxy of Intrigue, 8 claims**. 22 publication claims remain unreviewed across five books, while mechanical certification remains outstanding for 212 drafted claims. Before import: reconcile every book's narrative, feats/talents, inventories/mounts, PC routes, schema and Foundry runtime.

---

## Previous checkpoint history (preserved)

'''
old=(R/'README_LOCAL.md').read_text()
assert old.startswith('# SWSE Droid Publication Hydration'),old[:100]
(R/'README_LOCAL.md').write_text(intro+old)
# Rollback copy is separate from new archive, never distributed in its parent archive.
archive=R/'work/archives';archive.mkdir(exist_ok=True,parents=True)
oldz=Path('/mnt/data/SWSE_Droid_Hydration_Rolling_Local.zip')
backup=archive/'SWSE_Droid_Hydration_Checkpoint9.zip'
if oldz.exists() and not backup.exists():shutil.copy2(oldz,backup)
print('Checkpoint10 README, report and rollback ready.')
