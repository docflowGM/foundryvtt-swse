# Feat / Species / Class Feature Implementation Audit — Combined Report

**Date:** 2026-07-09
**Type:** Audit / reporting only — no runtime implementation code was changed.

## Scope

Implementation status of feats (400), species (161), and class features (37 heroic classes + 434 nonheroic) in the SWSE v2 migration. Companion documents:

- `docs/audits/feat-implementation-audit.md` + `feat-implementation-status.json`
- `docs/audits/species-feature-implementation-audit.md` + `species-feature-implementation-status.json`
- `docs/audits/class-feature-implementation-audit.md` + `class-feature-implementation-status.json`
- Evidence generator: `tools/check-feature-implementation-coverage.mjs`

## Method

Static evidence: compendium data (`packs/*.db`), data registries (`data/*.json`), and runtime-consumer inspection (`scripts/engine`, `scripts/actors/derived`, `scripts/governance`). Each item is placed on the layered model — *data → selection → prerequisites → application → runtime automation → display → runtime-verified* — and given a **provisional** A–F/P bucket. **No Foundry runtime was executed** (the repo has no test runner or CI), so nothing is marked "runtime-verified." Buckets are starting points for a runtime pass, not verdicts.

## Evidence reviewed

- `packs/feats.db` (400), `packs/species.db` (161), `packs/classes.db` (37), `packs/nonheroic.db` (434)
- `data/feat-effects.json`, `data/class-features.json`, `data/prestige-class-prerequisites.json`, species trait data
- Canonical consumers: `ModifierEngine`, `derived-calculator.js`, `combat-roll-math.js`, `weapons-engine.js`, progression engine/finalizer, chargen
- `scripts/engine/feats/` (92 modules) + `register-feat-runtime.js` manifest
- Prior audits under `docs/audits/` (combat feat status, per-source readiness)

## Limitations

- Static only; field population and "consumer exists" do not prove the effect fires.
- "No consumer found" is a grep result, not proof of absence (dynamic key access can hide a consumer).
- The A–F line cannot be fully drawn from data; the bulk of wired items sit at **B (needs runtime verification)**.

## Feat implementation summary

- **331 / 400** declare a runtime path (`abilityMeta.modifiers`, applied ActiveEffect, or UNLOCK/ACTIVE) → **provisional B**.
- **70 / 400** are data/text-only with no declared mechanics → **provisional D**.
- Only **~10–15** feats apply a persistent `transfer:true` ActiveEffect; most automation flows through `abilityMeta.modifiers` → ModifierEngine → derived-calculator/combat-roll-math.
- Strongest (verify → A): combat options (Power Attack/Rapid Shot), Skill Focus, Grapple, Rage.
- `grantsBonuses` is populated on **all 400** and is **non-discriminating** — not evidence of implementation.

## Species feature implementation summary

- Core application (size, speed, movement, languages, ability mods) and **defense** bonuses have concrete paths → **B**.
- **Species do NOT declare flat attack/damage combat bonuses** (0/161). The legacy `combat-utils.js` species attack/damage addition is **dead data** for all shipped species; the canonical resolvers correctly omit it. (Species **defense** bonuses ARE live via `defense-calculator`.)
- **Dead/unconsumed data fields:** `combatTraits` (161/161 populated, no reader), `bonusTrainedSkills` (1/161, no reader).
- **Trait-representation ambiguity:** `canonicalTraits`/`traitIds` vs the individual `*Traits` fields — decide which is authoritative.

## Class feature implementation summary

- HP, BAB, defenses, level progression, talent-tree access populated for **37/37** → **B**.
- **5 base classes** are data-complete (skills/feats/credits) → strongest, verify → A.
- **32 prestige classes**: features live in `level_progression` (B); **`class_skills` empty is by design** — prestige classes are additive layers, not starter chassis, so they carry no starting package (reclassified, see progression audit §0 addendum). Additive fields (talent trees / level progression / BAB / defenses) are **32/32**. **Prerequisites data-complete** in `prestige-class-prerequisites.json` (verify enforcement is fail-closed).
- Class resolution is fail-closed (`ClassesRegistry.resolveModel` returns `null`, no fabricated fallback).

## Cross-system findings

### Top 10 systemic risks

1. **Silent no-op data fields:** species `combatTraits` (all 161) and `bonusTrainedSkills` have no consumer — they read as "implemented" in data but do nothing.
2. **Dead legacy combat path:** `combat-utils.js` species attack/damage bonus reads fields no species populates (compounds the deprecated duplicate math from PR #885).
3. **Trait-representation duplication:** two parallel species trait models (`canonicalTraits`/`traitIds` vs `*Traits`) risk drift and partial application.
4. **Prestige `class_skills` empty — by design, not a gap** (reclassified). Prestige classes are additive and carry no starter skill list. Residual is the *additive* question: verify a PrC's own granted class skills (where any) add correctly — low priority. Do not backfill base-style lists.
5. **Prerequisite enforcement uncertainty:** prestige prereqs exist as data + a checker, but it's unverified whether progression finalization *blocks* on them or only advises.
6. **70 data-only feats** — static-bonus feats that *should* be passive modifiers are indistinguishable from genuinely-manual feats without review.
7. **`class-features.json` (53 abilities)** — a second data-first feature registry parallel to `abilityMeta`; verify a single applier consumes it (no orphaned registry).
8. **UNLOCK/RULE feats (70)** depend on the rules engine / progression unlock actually consuming them — no static proof.
9. **Display vs roll parity** — tooltips use the canonical resolvers (good, PR #885) but data-only feats/species traits with no consumer won't appear in breakdowns, so "missing from tooltip" is ambiguous (could be no-op).
10. **Non-discriminating schema defaults** (`grantsBonuses`, near-universal `combatTraits`) can mask true coverage in any automated scan.

### Top 10 fastest wins

1. Retire or wire species `combatTraits` / `bonusTrainedSkills` (data hygiene; removes false coverage).
2. Finalize retirement of `combat-utils.js` species attack/damage (already deprecated; static-confirmed dead).
3. Runtime-verify the 5 base classes (one smoke pass → promote B→A).
4. Runtime-verify the strong combat feats (Power Attack, Rapid Shot, Grapple, Rage, Skill Focus).
5. Decide the authoritative species trait representation; drop the dead one.
6. Triage the 70 data-only feats into manual(P/D) vs should-be-passive-modifier.
7. Confirm prestige prerequisite checker is fail-closed.
8. Verify `class-features.json` has a consumer (or mark it a future registry).
9. Verify GoI Noble talent-tree visibility and Jedi Knight force technique/secret offering.
10. Add per-field "unconsumed data" reporting to the coverage script for ongoing hygiene.

### Recommended implementation order

- **Batch 1 — Broken wiring / visibility fixes:** unconsumed species fields (`combatTraits`, `bonusTrainedSkills`), trait-representation ambiguity, `class-features.json` consumer, GoI Noble / Jedi Knight visibility.
- **Batch 2 — Data-only → passive modifiers:** convert static-bonus bucket-D feats to `abilityMeta.modifiers`. (Prestige `class_skills` backfill removed — empty is by design; do not add base-style starter lists.)
- **Batch 3 — Combat & tooltip parity:** finish `combat-utils` retirement after the species-parity runtime check; confirm roll = breakdown for the strong feat families.
- **Batch 4 — Runtime hooks for conditional feats/species features:** verify UNLOCK/RULE feats and conditional species traits fire.
- **Batch 5 — Picker/UI-blocked:** Tech Specialist, Force Regimen Mastery (held by design).

### Should remain punted / manual (P)

- Nonheroic as a player choice; Beasts/Followers (talent/level-granted); Tech Specialist & Force Regimen Mastery (need pickers); Starship Designer & Cybernetic Surgery (GM/player); Skill Challenge feats (no subsystem). Linguist is treated as implemented via chargen language selection.

### Needs dedicated UI / picker work

Tech Specialist, Force Regimen Mastery, and any feat with `grantsActions`/choice metadata but no picker surface.

### Needs runtime Foundry verification (everything at bucket B/C)

The bulk of this audit. Priority list below.

## Runtime verification checklist

1. **Base classes ×5** — create each; confirm HP, BAB, defenses, class skills, trained-skill count, starting feats, talent access at L1.
2. **Prestige entry** — attempt a prestige class without meeting prereqs; confirm it is **blocked**.
3. **Prestige class skills (additive)** — where a PrC source grants class skills, confirm they add to the character's list correctly. Empty `class_skills` on prestige is by design; do not expect a base-style starter list.
4. **Strong combat feats** — Power Attack, Rapid Shot, Grapple, Rage, Skill Focus: confirm the roll/derived total changes and the tooltip matches.
5. **Species core** — 2–3 species (incl. one Force-sensitive, one droid): confirm ability mods, size, speed, languages, defense bonuses; log `actor.system.speciesCombatBonuses` to confirm attack/damage sub-keys are empty (parity).
6. **Jedi Knight** — force technique/secret choices offered and applied.
7. **GoI Noble** — Galaxy of Intrigue talent trees visible in the picker.
8. **UNLOCK feats** — a proficiency/access UNLOCK feat actually grants access.

## Do-not-touch / punted-by-design list

- Nonheroic player selectability; Beasts/Followers granting model; Tech Specialist; Force Regimen Mastery; Starship Designer; Cybernetic Surgery; Skill Challenge feats. These are project-decided GM/player-handled or picker-blocked. Do not implement as part of this audit.
- `ActorEngine` mutation gateway, derived-calc sequencing, progression finalization internals (see `docs/audits/actor-engine-extraction-plan.md` do-not-move list) — out of scope for feature work.
