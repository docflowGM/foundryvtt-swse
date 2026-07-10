# Batch B — Force Progression Hardening (Plan)

**Date:** 2026-07-10
**Status:** PLAN ONLY — prepared after the Progression Runtime Integrity Audit (#886) and Batch A.
**Do not broadly implement without explicit instruction.** This document grounds the next batch in
the actual repo data/code so implementation does not drift into a Force-system refactor.

Both the progression audit and the feat/species/class audit converged on Force progression as the
next high-risk area. This plan separates **what the data already proves (static)** from **what still
needs Foundry runtime verification**, so the eventual patch is surgical.

---

## 0. Grounded cadence (confirmed from repo data — NOT from memory)

Two representations of Force grants exist; **they agree**.

**Authoritative runtime source** — `packs/classes.db` → `system.level_progression[].features[]` with
`type: force_technique_choice | force_secret_choice`, consumed by
`buildLevelUpEntitlementManifest.countChoices()` (`scripts/engine/progression/utils/levelup-entitlement-manifest.js`):

| Class | Grant | Class levels (from `level_progression`) | Matches expectation |
|---|---|---|---|
| **Jedi Knight** | Force Technique | L2, L4, L6, L8, L10 (even) | ✅ |
| **Sith Apprentice** | Force Technique | L2, L4, L6, L8, L10 (even) | ✅ |
| **Force Adept** | Force Technique | L2, L4, L6, L8, L10 (even) | ✅ |
| **Imperial Knight** | Force Technique | even levels | ✅ (bonus — same cadence) |
| **Jedi Master** | Force Secret | L2, L3, L4, L5 (each ≥2) | ✅ |
| **Sith Lord** | Force Secret | L2, L3, L4, L5 (each ≥2) | ✅ |
| **Force Disciple** | Force Secret | L2, L3, L4, L5 (each ≥2) | ✅ |

**Parallel descriptive source** — `data/class-features.json` encodes the same cadence as
`choice: { pool: 'forceTechniques'|'forceSecrets', grant: 1, when: 'evenLevels'|'level>=2EachLevel' }`.
This agrees with `level_progression`, but the coverage tool reports **`class-features.json` has no
consumer in `scripts/`** — i.e. it is descriptive/parallel, not the runtime authority.

### Implication for Batch B

- **Do NOT change the cadence data.** It is correct and internally consistent across both
  representations. Any "fix" that edits these levels would be a regression.
- The real risk is **runtime/UI/finalizer**, not data: whether the correctly-computed entitlement is
  actually surfaced as a step, hydrated in the detail rail, deduped, and materialized identically via
  both the full finalizer and the single-step path.
- Flag (low priority): `class-features.json` (53 abilities) being consumer-less is a latent
  drift source — if someone edits one representation the other won't follow. Consider making
  `level_progression` the sole authority or adding a parity assertion (report-only). **Investigate,
  do not refactor.**

---

## 1. Target areas (investigate → verify → fix only if a real defect is found)

Each item lists the **seam to inspect first** and whether it is static-confirmable or runtime-verify.

| # | Area | First seam to inspect | Type |
|---|---|---|---|
| B1 | Force **technique** cadence surfaced as a step | `progression-node-definitions.js` (force-techniques node), `active-step-computer.js`, manifest `choices.forceTechniqueChoices` | runtime-verify |
| B2 | Force **secret** cadence surfaced as a step | same node registry + `force-secret-step.js` | runtime-verify |
| B3 | Force **regimen** visibility + selection | `force-regimen-step.js`, `getForceDocument(_, 'regimen')` | runtime-verify |
| B4 | **Force Power Mastery** repeatable choices | finalizer `_getForcePowerMasteryChoice` / `_isForcePowerMasteryName` (allowDuplicates branch) | static + runtime-verify |
| B5 | **Detail-rail hydration** for technique/secret/regimen | `selected-rail-context.js`, `force-technique-step.js` render/detail methods | runtime-verify |
| B6 | **Duplicate** technique/secret entries | finalizer dedupe (`existingByTypeAndName` + `existingBySessionMarker`, `allowDuplicates:false` for techniques/secrets) | static-confirmed (guard exists) → runtime-verify |
| B7 | **Class cadence visibility** for the 6 classes | manifest `countChoices` vs steps offered (B1/B2) | runtime-verify |
| B8 | **Finalizer receipt parity** for selected Force items | `levelup-finalization-audit.js` (`validateLevelUpRequiredSelections`, receipt) | static + runtime-verify |
| B9 | **Single-step vs full-finalizer parity** for Force choices | `ProgressionFinalizer.finalizeSingleStep` vs `finalize` → `_compileProgressionAbilityItems` | static + runtime-verify |

### Already-confirmed statics (do not re-litigate)

- Finalizer creates correct dedicated item types (`force-technique`, `force-secret`, `force-regimen`,
  `force-power`) — audit §9.
- Technique/secret dedupe guard exists and Force Power Mastery correctly bypasses it (audit §8.11).
- Entitlement manifest computes the correct per-domain choice counts from `level_progression`
  (audit §6; cadence table §0 above).
- **R1 finalization prereq re-check (Batch A)** already covers Force techniques/secrets/regimens
  (they are in `PREREQ_DOMAINS`), so illegal Force picks now fail closed at finalize.

---

## 2. Suspected highest-value runtime checks (where a real bug would live)

1. **Owed-choice vs surfaced-step mismatch (B1/B2/B7).** Manifest says "1 Force Technique owed at
   Jedi Knight L2" — does the Force Technique step actually appear, and does it disappear only when
   filled? This is the exact "mall map hides a required store" failure the audit's Batch C targets;
   worth a dev diagnostic (see §4).
2. **Detail-rail hydration on step re-entry (B5).** After selecting a technique and backtracking,
   does the rail re-show the selection or blank out?
3. **Single-step parity (B9).** Sheet/Holonet "add a Force secret" vs full level-up: same item type,
   same locked/provenance flags, same dedupe?

---

## 3. Non-goals (hard limits for Batch B)

- No broad feat/talent automation.
- No refactor of the Force system.
- No combat-math changes.
- No ActorEngine architecture changes.
- No broad compendium rewrites — **and specifically no edits to the Force cadence data**, which §0
  proves is correct. Touch data only if a concrete shape mismatch is found to block progression.

---

## 4. Queued later batches (unchanged from audit; not part of Batch B)

- **Batch C — Active-step / owed-choice diagnostics.** Dev-only report comparing active steps ↔
  entitlement manifest ↔ finalizer required-choice validation ↔ `draftSelections` counts, to catch
  "finalizer requires 1 Force Technique but the step is hidden." (Force is the ideal first consumer —
  see §2.1.)
- **Batch D — Mirrored-state reduction.** Document/isolate `draftSelections` vs `buildIntent` vs
  `committedSelections` authority before any removal (scanner already labels writers
  transitional/suspicious).
- **Batch E — Single-step parity.** Feats/talents/techniques/secrets/regimens/attributes single-step
  vs full-finalizer behavior.
- **Batch F — Rollback stress / created-actor cleanup.** Runtime-verify the Batch A CREATE-bucket
  rollback deletes created world actors and leaves no orphan follower/NPC on induced failure.

---

## 5. Runtime verification the plan depends on

Batch B cannot be declared done from static analysis. Minimum Foundry smoke set:

1. Jedi Knight L1→L2: Force Technique step appears, offers legal techniques, materializes one
   `force-technique` item; step gone after fill.
2. Jedi Master / Sith Lord / Force Disciple gaining a Force Secret at the correct class level.
3. Sith Apprentice / Force Adept Force Technique cadence.
4. Force Power Mastery taken twice with distinct choices → two items, not deduped away.
5. Backtrack after a Force selection → detail rail re-hydrates the pick.
6. Single-step "add Force secret" from the sheet == the same result inside a full level-up.
7. Attempt an illegal Force technique (missing prereq power) → blocked at finalize (Batch A R1).

---

## 6. Batch B — Implementation results (2026-07-10)

Investigate → verify → fix. Static verification only; runtime items still per §5. The Force
progression system was found **largely structurally sound** — most target areas verified consistent
statically, so the implemented change set is deliberately small (two surgical fixes), not a refactor.

### Verified sound (static — no change needed)

- **B1/B2/B7 — step activation ↔ entitlement agreement.** Step activation
  (`active-step-computer._hasForceTechnique/SecretChoices` → `resolveForce*Entitlements`) and the
  finalizer's required-selection check (`validateLevelUpRequiredSelections` →
  `manifest.choices.force*Choices`) both derive owed counts from the **same** `level_progression`
  features at the current class level (`countClassFeatureChoicesAtLevel` / manifest `countChoices`).
  No "finalizer-requires-but-step-hidden" soft-lock exists for the confirmed cadence.
- **B4/B6 — Force Power Mastery + dedupe.** Finalizer dedupe uses session-marker + type::name with
  `allowDuplicates:false` for techniques/secrets, and FPM entries correctly bypass type::name dedupe
  via `_getForcePowerMasteryChoice`/`_isForcePowerMasteryName` and are stamped `repeatable:true`.
  Distinct repeats are preserved; accidental duplicates are collapsed.
- **Cadence data** — confirmed correct and consistent across `level_progression` and
  `class-features.json` (§0). **Not touched.**

### Fixed (static-provable defects)

- **B9 — single-step / full-finalizer prerequisite parity.** `finalizeSingleStep` (sheet buttons,
  Holonet tasks) did **not** run the Batch A R1 finalization prerequisite re-check that `finalize`
  now runs, so a single-step Force technique/secret/feat/talent add could materialize an
  illegal pick. Fixed: `finalizeSingleStep` now runs `validateFinalProgressionPrerequisites`
  **scoped to the domain being finalized** (so unrelated stale draft entries can never block a
  scoped job), before `_applyMutationPlan`. Fail-closed on proven illegality; advisory → warnings.
- **B7/B8 — count-primitive consistency.** `countClassFeatureChoicesAtLevel` (used by step
  activation) read only `feature.value`; the manifest's `featureQuantity` (used by the finalizer
  required-selection check) read `value ?? quantity ?? count`. Aligned the former to the latter so
  the two authorities can never disagree on owed counts. **No-op on current data** (every choice
  feature defaults to 1) — purely a latent soft-lock guard.

### Left as runtime-verify (no static defect; do not speculatively change)

- **B3 — Force regimen visibility/selection** and **B5 — detail-rail hydration on step re-entry** are
  per-step runtime behaviors (`renderDetailsPanel`/`getSelection`, rail context) that cannot be
  proven from source. See §5 smoke items 5.
- **`class-features.json` consumer-less parallel representation** (§0) remains a latent drift source;
  flagged for a future report-only parity assertion, not changed here.

### Files changed (Batch B)

- `scripts/apps/progression-framework/shell/progression-finalizer.js` — B9 single-step prereq parity.
- `scripts/engine/progression/utils/levelup-event-context.js` — B7/B8 count-primitive alignment.

### Checks run (all report-only, exit 0)

`node --check` on both touched files + the validator; `check-progression-integrity`,
`check-architecture-boundaries`, `check-combat-math-ssot`, `check-feature-implementation-coverage
--no-write`. No new direct mutations; ActorEngine remains the sole gateway.

### Runtime verification still needed

§5 smoke set — cadence steps surface for all six classes; FPM repeats not deduped; detail-rail
re-hydration on backtrack; **single-step add now blocks illegal Force picks (new B9 path)**; illegal
technique blocked at full finalize (Batch A R1).
