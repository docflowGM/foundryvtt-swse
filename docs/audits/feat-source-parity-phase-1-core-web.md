# Feat Source Parity Phase 1: Core Rulebook + Web Enhancement

## Purpose

Phase 1 narrows feat parity to the baseline that must be stable before later books are audited: Star Wars Saga Edition core-rulebook feat families plus Saga Edition Web Enhancement 1 **Tech Specialist**.

This phase is intentionally conservative. It does **not** copy full protected feat text, and it does **not** try to automate every contextual rule. It adds a repeatable local audit that checks whether the current feat source of truth is present, whether core scoped/tiered feat families are represented safely, whether prerequisites are visible to the progression legality path, and whether automation/manual-workflow classifications are honest.

## Current repo findings from `foundryvtt-swse-main (3).zip`

The uploaded repo is much healthier than the earlier GitHub snapshot:

- `packs/feats.db` is populated.
- `data/feat-catalog.json` is populated.
- Both sources currently contain 401 feat documents.
- `data/feat-effects.json` exists.
- `scripts/data/authority/feat-prerequisite-authority.js` exists.

The Phase 1 manifest was corrected against this repo state. Two stale checklist entries were explicitly removed from Phase 1 expectations:

- **Devastating Attack**: appears as talent/special-action terminology in stat blocks, not as a core feat family that should be required by this feat parity pass.
- **Improved Initiative**: not present as a SWSE core feat in the uploaded source scan or current repo feat catalog.

## Files added

- `data/feat-source-parity/core-web-feat-parity-manifest.json`
- `scripts/dev/audit-core-web-feat-parity.mjs`
- `docs/audits/feat-source-parity-phase-1-core-web.md`
- `docs/audits/feat-source-parity-phase-1-implementation-prompt.md`
- `docs/audits/generated/core-web-feat-parity-report.json`
- `docs/audits/generated/core-web-feat-parity-report.md`

## How to run

```bash
node scripts/dev/audit-core-web-feat-parity.mjs
```

Generated reports:

```text
docs/audits/generated/core-web-feat-parity-report.json
docs/audits/generated/core-web-feat-parity-report.md
```

Useful failure modes:

```bash
# Fail only if the feat pack/catalog are both empty.
node scripts/dev/audit-core-web-feat-parity.mjs --fail-on-empty

# Fail if required manifest entries are missing.
node scripts/dev/audit-core-web-feat-parity.mjs --fail-on-missing

# Fail if anything is missing or needs review.
node scripts/dev/audit-core-web-feat-parity.mjs --strict
```

## Scope decisions

### Scoped feat families

The following core feat families must be modeled as scoped choices or separate scoped documents:

- Armor Proficiency
- Weapon Proficiency
- Weapon Focus
- Skill Focus
- Skill Training
- Force Training
- Double Attack
- Triple Attack
- Triple Crit
- Exotic Weapon Proficiency

The audit accepts either canonical model, but flags unsafe cases where a single unscoped document could silently grant every scope.

### Tiered feat families

The following must retain tier identity:

- Dual Weapon Mastery I/II/III
- Martial Arts I/II/III

### Manual workflow feats

These should remain legal to acquire when prerequisites are met, but they should not fake automation until dedicated workflows exist:

- Tech Specialist
- Cybernetic Surgery
- Starship Designer
- Linguist, which is better handled through chargen language selection

For these, the UI should show an advisory/detail-rail warning instead of pretending a permanent actor/item mutation happened.

## Phase 1 acceptance criteria

Phase 1 is complete when:

1. `packs/feats.db` and `data/feat-catalog.json` are populated and report the same expected feat set.
2. Every core/Web Enhancement manifest entry is found in the current feat source of truth.
3. Every scoped/tiered feat has explicit choice metadata or scoped/tiered documents.
4. Every feat with prerequisites has legality data consumed by the same progression path used by level-up.
5. Every feat with passive or active math is tied to the same calculation path used by the final roll/stat breakdown.
6. Every manual-workflow feat is visible, selectable when legal, and clearly marked as manual/advisory.

## What not to do in Phase 1

- Do not import or copy full sourcebook feat text into the repo.
- Do not create a second feat catalog parallel to the real source of truth.
- Do not hardcode feat behavior in the sheet when an engine/registry path already exists.
- Do not fake Tech Specialist item modification; make it advisory until the dedicated modification workflow exists.
- Do not silently grant all scopes from one unscoped feat document.
- Do not add Devastating Attack or Improved Initiative to the feat catalog just to satisfy a stale audit checklist.
