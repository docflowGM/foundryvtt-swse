# Implementation Prompt: Phase 2 Starships of the Galaxy Feat Parity

You are working in the Foundry VTT SWSE v13/v2 migration repo.

## Non-Negotiable Behavior

1. Think Before Coding
   - Inspect existing feat catalog, pack data, registries, and audit scripts before editing.
   - Identify the single source of truth for any data you touch.

2. Simplicity First
   - Prefer metadata and validation over new runtime systems unless the existing system already has a clear hook.
   - Do not create a starship construction engine for this phase.

3. Surgical Changes
   - Change only the files required for Starships of the Galaxy feat parity.
   - Do not refactor feat registries, progression, vehicle sheets, or starship combat unless a failing audit proves it is necessary.

4. Goal-Driven Execution
   - The goal is accurate feat representation and honest automation boundaries.
   - A feat that cannot be faithfully automated should be explicit metadata, not a hidden TODO.

## Required commands

Run:

```bash
node --check scripts/dev/audit-starships-feat-parity.mjs
node scripts/dev/audit-starships-feat-parity.mjs --strict
```

## Required Starship Designer policy

`Starship Designer` must remain metadata-only.

Use this player/GM-facing note:

> Starship Designer is intentionally metadata-only. For ship design, rebuilds, and custom modifications, consult Starships of the Galaxy with your GM.

Required metadata values:

- `abilityMeta.implementationStatus`: `metadata_only_consult_sotg`
- `abilityMeta.mechanicsMode`: `metadata_only`
- `abilityMeta.applicationScope`: `gm_player_starship_design_reference`
- `abilityMeta.staticSheetPolicy`: `exclude`

Do not describe this as punted, deferred, backlog, pending UI, or future automation. The point is that the source rule is not a good automation target.

## Audit expectations

The audit must verify:

- `Starship Designer` has the metadata-only consult-SOTG classification.
- `Starship Tactics` preserves selected-choice/maneuver grant metadata.
- `Tactical Genius` remains conditional resource-refresh metadata requiring runtime context.
- `Tech Specialist` remains available as prerequisite support.
- Core feats with SOTG vehicle notes remain represented and do not gain false static bonuses.

## Stop conditions

Stop and report instead of coding if:

- `packs/feats.db` and `data/feat-catalog.json` disagree on Starship Designer metadata.
- The current branch has no populated feat catalog.
- A proposed change would require building a starship construction workbench or ship economy subsystem.
