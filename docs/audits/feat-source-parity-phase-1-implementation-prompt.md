# Claude/Codex Prompt: Phase 1 Core/Web Feat Parity

You are working in the SWSE Foundry VTT v13/v2 migration repository.

## Non-Negotiable Behavior

1. **Think Before Coding**: inspect the current feat source of truth, registry, progression, prerequisite, and effect code before editing.
2. **Simplicity First**: prefer data and metadata fixes over new systems.
3. **Surgical Changes**: change only the files required for Phase 1 parity.
4. **Goal-Driven Execution**: every edit must move toward source parity for core/Web Enhancement feats.

## Goal

Implement Phase 1: make core rulebook feat families and Saga Edition Web Enhancement 1 Tech Specialist auditable and honest in the system.

Start by running:

```bash
node scripts/dev/audit-core-web-feat-parity.mjs
```

If Phase 0 is present in this branch, also run:

```bash
node scripts/dev/audit-feat-source-parity.mjs --fail-on-empty
```

## Required behavior

### Source of truth

- Use the existing feat pack/catalog source of truth.
- Do not create a parallel runtime catalog.
- If `packs/feats.db` and `data/feat-catalog.json` are both empty, stop and repair Phase 0 before continuing.
- In the uploaded `foundryvtt-swse-main (3).zip`, both `packs/feats.db` and `data/feat-catalog.json` were populated with 401 feat docs, so this branch should continue from the existing data rather than rebuilding from scratch.

### Core/Web manifest

Use `data/feat-source-parity/core-web-feat-parity-manifest.json` as the Phase 1 checklist.

For each entry:

1. Confirm the feat/family exists in the source of truth.
2. Confirm scoped feats have either explicit choice metadata or separate scoped documents.
3. Confirm prerequisites are represented in the path used by level-up legality.
4. Confirm passive/active effects are represented in the same engine path that produces the actual roll/stat breakdown.
5. Confirm manual-workflow feats are marked advisory/manual in the UI rather than fake-automated.

### Must-handle feats/families

Prioritize these first:

1. `Force Training`: legal only with Force Sensitivity; repeatable; opens/selects Force powers through the proper workflow.
2. `Skill Focus` and `Skill Training`: scoped to a skill; sheet skill math and hover breakdown must match the actual calculator.
3. `Weapon Proficiency`, `Weapon Focus`, `Exotic Weapon Proficiency`: scoped to weapon group/weapon and reflected in attack/proficiency math.
4. `Improved Defenses`, `Improved Damage Threshold`, `Toughness`, `Force Boon`: passive actor math must show in derived-stat breakdowns.
5. `Point Blank Shot`, `Precise Shot`, `Rapid Shot`, `Rapid Strike`, `Power Attack`: active/contextual roll options must not be hidden or double-counted.
6. `Tech Specialist`: selectable if legal, but manual/advisory until a dedicated item/droid/vehicle modification workflow exists.

### Explicit non-targets for Phase 1

Do **not** add these as feats to satisfy a stale checklist:

- `Devastating Attack`: treat as talent/special-action terminology, not a Phase 1 core feat family.
- `Improved Initiative`: not a SWSE core feat in the uploaded source scan/current catalog.

### Manual/advisory policy

The following are intentionally not fully automated in Phase 1 unless the required workflow already exists:

- Tech Specialist
- Cybernetic Surgery
- Starship Designer
- Linguist, except through chargen language handling

These should show clear notes/warnings to GM/player.

## Validation

After edits, run:

```bash
node scripts/dev/audit-core-web-feat-parity.mjs --strict
```

Also test in Foundry by creating a new actor and checking level-up/feat selection for:

- Force Sensitivity -> Force Training
- Skill Training -> Skill Focus
- Weapon Proficiency -> Weapon Focus
- Improved Defenses
- Improved Damage Threshold
- Toughness
- Point Blank Shot / Rapid Shot
- Tech Specialist

## Deliverable

Return only changed files. Do not include a full repo zip.
