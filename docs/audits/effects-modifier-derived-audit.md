# Independent Audit — Active Effects / Modifier / Derived Pipeline

**Repository:** docflowGM/foundryvtt-swse
**Base commit:** `main` @ `63fc9b3`
**Method:** Independent, double-blind. Conclusions drawn only from current sources cited by `file:line`. No prior audit consulted. Read-only — no pipeline changes proposed here are applied.

---

## Executive Verdict

The pipeline has **one intended spine that is basically sound** — source collection → `ModifierEngine` → `DerivedCalculator` → `system.derived.*`, with `ActorEngine` as the persisted-write facade — but it is **surrounded by three additional effect-application mechanisms the spine does not control**, and the governance guards meant to enforce SSOT **do not sit on the paths that actually bypass it**.

Concretely:

- **Foundry core `applyActiveEffects()` is fully live and unguarded.** The system never overrides it and never registers a custom `ActiveEffect` document class. Feat/talent/force effect generators emit raw `changes[]` keys (`system.derived.shield.current`, `system.derived.damageReduction.energy`, `system.concealment.total`, `system.action.limitedToSwiftAction`) that core writes straight onto prepared actor data — outside `DerivedCalculator`, `ModifierEngine`, and `ActorEngine`.
- **`ModifierEngine.applyComputedBundle` / `computeModifierBundle` / `applyAll` are dead.** No reachable caller. The recalc pipeline explicitly removed the bundle pass. (No dynamic/string references — verified.)
- **A whole effect subsystem (`SWSEActiveEffectsManager`, combat) writes a non-Foundry `effect.updates` shape that Foundry silently drops** — its combat-action defense/attack bonuses very likely never apply. The custom reader `_applyActiveEffects()` that consumes `.updates` runs on every prepare but has no data to act on.
- **Condition penalties are computed in ~5 places from 4 duplicated tables**, plus one consumer reading a *different* field entirely.

**Answers in brief:** B — not a single clean SSOT; one primary path plus several parallel ones. G — `DerivedCalculator` is primary but not the only derived authority. C/D — yes, raw effects reach base and derived authority paths. F — dead.

---

## Effect Authority Map (Question A)

| # | Authority | Status | Writes to actor data? | Evidence |
|---|-----------|--------|-----------------------|----------|
| 1 | **Foundry core `applyActiveEffects()`** (applies `effect.changes`) | **LIVE, unguarded** | **Yes** — directly, each prepare, between base & derived | No `CONFIG.ActiveEffect.documentClass` / `extends ActiveEffect` anywhere; no override of `applyActiveEffects`. Consumers: `feat-effect-applier.js:54`, `talent-effect-engine.js:1368/1444/1783/1852`, `force-power-effects-engine.js:213…762` |
| 2 | **SWSE custom `_applyActiveEffects()`** (applies `effect.updates`) | **LIVE code / DEAD data** | Would `setProperty` any path, unguarded | `swse-actor-base.js:52-85`; called `:39` every `prepareDerivedData`. `updates` is not a Foundry AE schema field and no custom AE class registers it → dropped on persistence |
| 3 | **`actor.system.activeEffects`** custom array | LIVE (read-only into modifiers) | No (feeds ModifierEngine) | `active-effects-engine.js`; consumed by `ModifierEngine._getActiveEffectModifiers` (`:2050`) |
| 4 | **SWSE Basic effect intents** (flags on real AEs) | LIVE | No (feeds ModifierEngine) | `EffectIntentEngine`; consumed by `ModifierEngine._getEffectIntentModifiers` (`:2096`). Basic authoring sets `changes: []` (`effect-intent-engine.js:1631`) |
| 5 | **`SWSEActiveEffectsManager`** (combat) | **Invoked but ineffective** | Intends raw paths via `.updates`; dropped | `active-effects-manager.js:_buildEffect :19`; targets `system.attackBonus`, `system.defenses.reflex.misc.auto.combatAction` (`:106-174`); created via stock `createEmbeddedDocuments` (`:212`). Callers: combat-action-bar, character-sheet, destiny-effects |

The header comment in `active-effects-engine.js:5-13` already acknowledges #3 and #4 as "TWO effect systems running in parallel." The audit finds it is really **four to five**, once core-AE (#1), the dead custom applier (#2), and the combat manager (#5) are counted.

---

## Modifier Authority Map (Question B)

**Primary spine (intended SSOT):** `ModifierEngine.getAllModifiers()` (`:255`) collects 11 source types → `aggregateAll()` (`:487`) groups/stacks → returns `modifierMap` consumed by `DerivedCalculator.computeAll()` (`:207-210`). This path is coherent.

**Competing / parallel modifier math (NOT routed through the spine):**

- **`ModifierEngineExtensions.getPenaltyForCategory()`** — independent condition/encumbrance/armor penalty computation with its own `#getConditionPenalty` (`ModifierEngineExtensions.js:342`); consumed at roll time by `ModifierDomainResolver` (`:53/139/230/306`).
- **`combat-roll-math.js`** — independent attack-side math (`attackPenalty`/`attackBonus`, `:179/285/329/355`).
- **`SkillFeatResolver.getSkillCheckBonuses()`** — feat skill bonuses added to roll `baseBonus` *outside* ModifierEngine (`skills.js:184,193`).
- **Foundry core AE `changes`** — see authority #1.

Verdict: **one primary path, several live parallel paths.** Not a single SSOT.

---

## Derived Authority Map (Question G)

`DerivedCalculator` is the **primary** derived authority and self-declares SSOT (`derived-calculator.js:1-23`), but it is **not the only writer** of `system.derived.*` / derived-authority fields:

- **`ActorEngine.recomputeHP`** is the *sole* writer of `system.hp.max` (`actor-engine.js:3704-3809`; guarded at `:620`). `DerivedCalculator` only mirrors it (`:303-312`). So HP authority ≠ DerivedCalculator.
- **Foundry core AE** writes `system.derived.shield.current`, `system.derived.damageReduction.energy` (force-power-effects-engine) — subfields DerivedCalculator does not own, so they survive as a *second* derived writer.
- **`DerivedOverrideEngine.apply()`** mutates the updates object but runs *inside* `computeAll` (`:886-888`) — in-bounds.
- **Type builders** (`computeCharacterDerived`, `computeXpDerived`, `_applyV2ConditionTrackDerived`) write `system.derived.*` in `base-actor.js:_performDerivedCalculation` (`:80-105`) — additional in-bounds writers, but "derived" is authored across several files.

---

## Unsafe Write Paths (Questions C & D)

**Can effect paths write to `system.attributes.*`, `abilities.*`, `skills.*.total`, `derived.*`, `hp.max`, `defenses.*`? — YES.**

1. **Core AE `changes` → any key, unfiltered.** `EffectSanitizer` only strips invalid `type` values (`effect-sanitizer.js:21-50`); it never inspects `changes[].key`. The Advanced effect builder deliberately exposes raw authority paths as `advancedPath`: `system.hp.max` (`:285`), `system.derived.defenses.<def>.total` (`:250-253`), `system.derived.skills.<k>.total` (`:266`), `system.attributes.<x>.base` (`:731-735`). Proven live writes: `system.derived.shield.current`, `system.derived.damageReduction.energy`, `system.concealment.total`, `system.action.limitedToSwiftAction`.
2. **`_applyActiveEffects()` → any path via `setProperty`** (`swse-actor-base.js:82`), no path allow-list. Dormant only because `updates` doesn't persist.
3. **Bypass of governance:** the derived-write guard (`_validateDerivedWriteAuthority`, `:319`) and HP-SSOT guard (`:620`) live **inside `ActorEngine.updateActor`**. Core AE and `setProperty` never call `updateActor`, so the guards never fire on the paths that actually bypass SSOT. In production the enforcement level is `'normal'` = **warn-only, not throw** (`MutationInterceptor.js:47,91,118`).

**Secondary bug:** `force-power-effects-engine.js:217/253` use `mode: 2` (Foundry ADD) while the inline comment says "Override" (Override is `mode: 5`). Shield/DR values are additive, not set.

---

## Likely Double-Count Risks (Question E)

| Risk | Severity | Status |
|------|----------|--------|
| **Same ActiveEffect carrying BOTH an intent flag AND raw `changes`** for one stat → counted once via ModifierEngine intent (#4) and once via core AE (#1). Basic builder mitigates with `changes:[]`, but hand-authored/compendium effects are unguarded. | High | **PLAUSIBLE** |
| **Skill roll `baseBonus = canonicalTotal + featSkillBonuses.total`** (`skills.js:193`). `canonicalTotal` is `derived.skills.total`, which already includes ModifierEngine feat bonuses (`derived-calculator.js:598-613`). `SkillFeatResolver` is a *separate* resolver; any always-on feat present in both double-counts. `skipStaticModifiers:true` stops RollCore re-adding but not this manual addend. | High | **PLAUSIBLE — verify SkillFeatResolver scope** |
| **Condition penalty applied in the derived defense/skill total AND again at roll time** by `ModifierDomainResolver.getPenaltyForCategory('condition')`. | Med-High | **PLAUSIBLE** (see Question H) |
| Item-origin intent effects on `actor.effects` vs `item.effects` | — | **Mitigated** (`ModifierEngine._getEffectIntentModifiers :2116-2128` skips `/\bItem\b/` origin) |
| Broad self-intent re-added at roll time | — | **Mitigated** (`getEffectIntentModifiersForContext :427` returns early for broad) |
| Skill Focus checkbox vs Skill Focus feat modifier | — | **Mitigated** (explicit de-dup `derived-calculator.js:597-612`) |

---

## Dead / Deprecated Code (Question F)

- **`ModifierEngine.applyComputedBundle` — was DEAD (only caller was `applyAll`). REMOVED in this PR.**
- **`ModifierEngine.applyAll` — was DEAD & self-deprecated (deprecation warning, zero call sites). REMOVED in this PR.** The `applyAll` hits in `repair-panel.js`, `selection-modifier-hook-registry.js`, and `force-authority-engine.js` are *different* `applyAll` methods, not `ModifierEngine.applyAll`.
- **`ModifierEngine.computeModifierBundle` — was DEAD (only used by `applyAll`). REMOVED in this PR.** `recalcAll` had already removed the runtime bundle pass; `base-actor.js` already forbade running it. The impurity worry previously tracked in `actor-engine.js` and `docs/audits/actor-engine-responsibility-audit.md:317` is now moot — the code no longer exists.
- **No dynamic references:** grep for `applyComputedBundle` / `computeModifierBundle` / `applyAll` and for `ModifierEngine[` dispatch confirmed no string/bracket call sites before removal.
- **`SWSEActiveEffectsManager` `updates` shape + `SWSEActorBase._applyActiveEffects` — DEAD DATA PAIR.** Writer authors `updates`, Foundry drops it (no schema field, no custom doc class), reader finds nothing. The combat-action reflex/attack bonuses this pair implements likely **do not apply at all** — a latent functional bug, not just cleanup.
- **`skills-reference.js` `_calculateSkills` (`:272`)** reads `system.conditionTrack.penalty` — a field `DerivedCalculator` does not write (it uses `system.derived.damage.conditionPenalty`). Appears to be a stale/legacy skill calculator; flag for confirmation.

---

## Condition / Armor / Passive Penalties in Multiple Places (Question H)

**Condition penalty — computed/applied in at least 5 places, from 4 duplicated tables:**

- Written: `base-actor.js:333` → `system.derived.damage.conditionPenalty`, via `getConditionPenalty` table `base-actor.js:285`.
- Applied to defenses: `defense-calculator.js:746` (own table `:742`).
- Applied to skills: `derived-calculator.js:644`.
- Applied at roll time: `ModifierEngineExtensions.js:342` (own `#getConditionPenalty`), through `ModifierDomainResolver` ×4.
- Duplicate table also in `combat-utils.js:29`.
- **Divergent field:** `skills-reference.js:275` reads `system.conditionTrack.penalty` (different from the derived field).

**Armor check penalty — multiple sites:** `derived-calculator.js:636`, `engine/skills/rules/armor-rule.js`, plus `DefenseCalculator` armor terms.

The identical `[0, -1, -2, -5, -10, 0]` table is hard-coded in **3 files** (`defense-calculator.js:742`, `base-actor.js:285`, `combat-utils.js:29`) plus a 4th resolver — the concrete divergence hazard: a rules tweak must be made in four places or totals silently disagree between sheet, defense, and roll.

---

## Recommended Phases

**Phase 0 — Zero-risk cleanup (do first): ✅ APPLIED in this PR.**
1. Deleted `applyComputedBundle`, `computeModifierBundle`, `applyAll` from `ModifierEngine.js` (291 lines) and rewrote the stale impurity comments in `actor-engine.js`, `base-actor.js`, and `passive-adapter.js`. No dynamic/string refs — confirmed. Shrinks the audit surface and removes the single most misleading "is this live?" question.

**Phase 1 — Resolve the combat-AE dead pair (correctness):**
2. Runtime-confirm that `SWSEActiveEffectsManager` effects lose `.updates` on persistence and that combat-action defense/attack bonuses currently do nothing. Then decide: migrate those to Basic intents (#4) or real `changes` (#1), and either fix or delete `_applyActiveEffects()`. This is a *bug*, not just tidy-up.

**Phase 2 — Bring core AE under the SSOT lens (design):**
3. Inventory every raw `changes` key emitted by feat/talent/force generators. Decide per-key whether it should route through the modifier pipeline or remain a legitimate core-AE write, and document the allowed set. Fix the `mode: 2`-labeled-"Override" in force-power-effects-engine.

**Phase 3 — Consolidate penalties (needs tests):**
4. Single condition-penalty function + single table + single field (a `ConditionTrackRules` helper). Use the existing `condition-penalty-regression-test.js` as the guard. Verify derived-vs-roll-time application is not double-applied before touching.

**Phase 4 — Verify the two roll-time double-counts (Question E)** before any change: instrument a known actor and compare sheet total vs rolled total for a Skill-Focus / always-on-feat skill.

---

## Explicit "Do Not Refactor Yet" List

- **Do not remove/redirect the Foundry core AE `changes` path.** It is the *functional* authority for shield / damage-reduction / concealment / action-limit. Removing it without migration silently breaks force powers and talents.
- **Do not unify `system.activeEffects` (custom array) with Foundry ActiveEffects.** Explicitly flagged as a separate architecture decision (`active-effects-engine.js:5-13`); out of scope for a mechanical cleanup.
- **Do not "fix" the skill-roll `featSkillBonuses` addend** until the double-count is confirmed — it may be intentionally situational-only.
- **Do not touch `DerivedOverrideEngine`, `recomputeHP`, or the type `computeXDerived` builders** — they are in-bounds derived writers, and HP intentionally lives in `ActorEngine`, not `DerivedCalculator`.
- **Do not raise enforcement to `strict` in production as a "fix."** The guards don't cover the bypass paths (core AE / `setProperty`); flipping the level would throw on legitimate flows without closing the real holes.
