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

**Phase 1 — Resolve the combat-AE dead pair (correctness): ✅ APPLIED in this PR (migrate-to-`changes` direction).**
2. Confirmed the `.updates` shape is dropped on persistence (no `ActiveEffect` schema field, no custom document class; target paths absent from `template.json`), so both readers were inert — `SWSEActorBase._applyActiveEffects` (ran every prepare) and `combat-utils.getEffectModifier` (also zero callers). User-facing impact: Fighting Defensively / Total Defense / Destiny attack bonuses granted a token icon + flag but no actual math.
   - **Fix:** `SWSEActiveEffectsManager` now emits real Foundry `changes[]` (normalized via `normalizeActiveEffectChangeForRuntime`), consistent with `combat-action-bar._doCharge`. Deleted the dead `_applyActiveEffects()` and `getEffectModifier()`.
   - **Verified readers:** `system.attackPenalty` is a base actor field (`template.json Actor.templates.base.attackPenalty`) read at `combat-roll-math.js:355`; the Reflex `system.defenses.reflex.misc.auto.combatAction` bonus is summed by `DefenseCalculator` (`defense-calculator.js:728`). So Fighting Defensively and Total Defense are now functionally restored.
   - **Follow-ups — both RESOLVED in this PR:**
     - *Attack bonus reader:* actor-level `system.attackBonus` has no roll-time reader, so Destiny Attack Bonus / Vengeance / Charge were **retargeted to the ModifierEngine attack domain** as SWSE Basic effect intents (`{category:'attack', target:'all'}` → `global.attack`), which `combat-roll-math.getBasicEffectIntentBonus(actor,'global.attack',…,{includeBroad:true})` already reads at attack-roll time (`combat-roll-math.js:388`). `_buildEffect` now attaches `flags['foundryvtt-swse'].effectIntent`; the loose `system.attackBonus` change is gone. Fighting Defensively keeps its `system.attackPenalty` change (real `template.json` field with a canonical reader, shared with the light-side talent).
     - *Destiny entry point:* implemented `SWSEActiveEffectsManager.applyDestinyEffect(actor, key)` (mirrors `applyCombatActionEffect`; idempotent replace, token status), wiring the previously-undefined call from `destiny-effects.js:115`. Destiny Defense Bonus is now real too (+2 to all three defenses via `misc.auto`, summed by `DefenseCalculator`). Noble Sacrifice remains a reminder — it grants **allies** defenses and can't auto-apply cross-actor.
   - **Related instance for Phase 2:** `vehicle-dogfighting.js:157` writes an actor-level `system.attackBonus` change on vehicles — same loose-field pattern; deferred to the Phase 2 raw-`changes` inventory rather than expanded here.

**Phase 2 — Bring core AE under the SSOT lens (design): ✅ INVENTORY COMPLETE in this PR (see "Phase 2 Inventory" section below).**
3. Inventoried every raw `changes` key emitted by feat/talent/force/vehicle generators (~180 distinct targets) and classified each. Headline: most of these writes hit fields **nothing reads** — the force-power derived output and the bulk of the talent capability-flag writes are inert. The documented allowed set is small. Fixes themselves are deferred to later phases (the *intent* behind the dead writes is real; only the wiring is broken). The `mode: 2`-labeled-"Override" in force-power-effects-engine is confirmed (see below).

**Phase 3 — Consolidate penalties (needs tests):**
4. Single condition-penalty function + single table + single field (a `ConditionTrackRules` helper). Use the existing `condition-penalty-regression-test.js` as the guard. Verify derived-vs-roll-time application is not double-applied before touching.

**Phase 4 — Verify the two roll-time double-counts (Question E)** before any change: instrument a known actor and compare sheet total vs rolled total for a Skill-Focus / always-on-feat skill.

---

## Phase 2 Inventory — Raw ActiveEffect `changes[]` Keys

Scope: every `changes[].key` authored by the effect generators (`feat-effect-registry`, `talent-effect-engine`, `talents.js`, `talent-effects-hooks`, the `*-talent-actions` / `*-talent-mechanics` files, `force-power-effects-engine`, `species-activated-ability-engine`, `grapple-state-engine`, `lightsaber-form-engine`, the vehicle engines, and `active-effects-manager`). ~180 distinct targets. Core `applyActiveEffects()` applies all of these to prepared actor data with no filtering.

**Headline:** the dominant problem is not double-counting — it is **dead writes**. A large majority of these change keys target fields that **no code reads**, or that `DerivedCalculator` overwrites every recalc. The talent/force effect layer is substantially aspirational.

### Class A — Derived-authority writes → DEAD or clobbered (must never be the pattern)

All authored by `force-power-effects-engine.js` (invoked live via `force-executor.js:340 applyPowerEffect`):

| Key | Status | Evidence |
|-----|--------|----------|
| `system.derived.shield.current` | dead — 0 readers | `force-power-effects-engine.js:215`; reader grep empty |
| `system.derived.damageReduction.energy` / `.all` | dead — 0 readers | `:252/396/432` |
| `system.derived.defense.all` | dead — 0 readers | `:325/362/529/641` |
| `system.derived.meleeBonus` / `weaponBonus` / `stealthBonus` / `attackBonus` / `damageBonus` | dead — 0 readers | `:535/571/703/647/605` |
| `system.derived.damageThreshold` | dead — **clobbered** | `DerivedCalculator` writes it every recalc (`derived-calculator.js:853`) |

`DerivedCalculator` owns `system.derived.*`; nothing consumes these particular sub-keys. So force-power shield/DR/defense/attack/damage effects apply an ActiveEffect that changes nothing. **The player-facing intent is real** (force powers *should* grant these) — the wiring is what's dead, so do not simply delete; redesign to route through `ModifierEngine` domains or calculator-input fields (own phase). Also fix the `mode: 2` (Foundry ADD) entries labeled "Override" at `:217/253` — Override is `mode: 5`.

### Class B — Base / SSOT writes (bypass the owning authority)

| Key | Authored by | Concern |
|-----|-------------|---------|
| `system.hp.max` | `talents.js` Toughness (+3) / Improved Toughness (+6) `:809/819` via `talent-effects-hooks` | Bypasses the HP SSOT (`ActorEngine.recomputeHP`) on the prepared layer; `DerivedCalculator` mirrors the AE-modified `hp.max` into `derived.hp`. May work, but it is exactly the raw-AE-into-a-base-authority pattern the audit flags. Route through the HP recompute inputs or a bonus, not raw AE. |
| `system.traits.size`, `system.speed` / `system.speed.base`, `system.movement.walk`, `system.damageThreshold.species` | talent/species engines | Write stored/base or size-authority inputs directly; verify against the owning calculators before trusting. |

### Class C — Calculator-input fields (legit **iff** actually read — this is the candidate "allowed set")

| Key pattern | Read? | Evidence |
|-------------|-------|----------|
| `system.defenses.<def>.misc.auto.<source>` | **Yes** | `DefenseCalculator.getMiscBonus` (`defense-calculator.js:726-734`) — this is the pattern Phase 1 used |
| `system.defenses.<def>.species` | **Yes** | `defense-calculator.js:605` |
| `system.attackPenalty` | **Yes** | `combat-roll-math.js:355` (real `template.json` actor field) |
| `system.skills.<skill>.misc` | **Suspect — likely dead** | canonical skill field is `miscMod`, not `misc` (`skill-normalization.js:157`); AE writes `.misc` |
| `system.skills.<skill>.species` / `.bonus` / `.trained`, `system.defenses.<def>.bonus` / `.droid` | **Unverified — no obvious reader** | not found in the calculators' read paths |

**Allowed set for numeric bonuses that must feed calculators = only the confirmed rows above.** Everything else numeric should route through `ModifierEngine` (intents / domains), not a raw actor-field write.

### Class D — Capability / state flags (architecturally-legit AE usage, but MANY are dead)

Boolean/state toggles such as `system.evasion`, `system.improvedEvasion`, `system.grapple.{pin,crush,improvedGrab}`, `system.doubleAttack.*`, `system.tripleAttack.*`, `system.combat.<group>.{ignoreDR,thresholdReduction}`, `system.attacks.*`, `system.inspire.*`, `system.leadership.*`, `system.mechanics.*`, `system.forcePowers.*`, `system.useTheForce.*`, `system.condition.{stunned,flatFooted}`, `system.concealment.total`, `system.action.limitedToSwiftAction`, `system.darkSide.*`, `system.armor.proficiency.*`, `system.dualWield.*`, `system.criticalHit.*`, `system.unarmed.*`, `system.rally.enabled`, `system.mounted.*`, `system.forceSensitive`, `system.forceVisions`, `system.secondWind.uses`, `system.damageReduction[.ignoreUntilEndOfTurn]`, etc.; plus `flags.swse.*` (`conditions.*`, `shapeshift.active`, `roller.actionRestrictions`, `defenses.denyDexToReflex`, `dexterityBased*.speciesBonus`, `metamorph.*`, `threatenedSquares.suppressed`, `attackPenalty.nextAttack`, `skillPenalty.poison`).

Toggling a capability/state flag via ActiveEffect is a **legitimate** use of core AE and is *not* the audit's SSOT concern. **However**, spot-checks found **no readers** for a sample of them (`system.evasion`, `system.doubleAttack`, `system.grapple.pin`, `system.action.limitedToSwiftAction`, `system.concealment.total` all returned zero non-authoring readers). So this class is legit *in principle* but **largely aspirational in practice** and needs a systematic reader-audit to prune the dead entries. This is a content/wiring problem, not an architecture violation — lower priority than Class A/B.

### Class E — Already correct / fixed in this PR

`system.attackPenalty` (Fighting Defensively + light-side talent), `system.defenses.reflex.misc.auto.{combatAction,destiny}` and the `global.attack` intents (Phase 1 + follow-ups).

### Class F — Vehicle subsystem (separate audit)

`system.vehicle.*` (9 keys: `speed`, `handling`, `combat`, `operational`, `hyperdriven`, `fullThrottle`, `evasiveAction`, `attackPattern`, `starshipTactics`) plus the actor-level `system.attackBonus` write at `vehicle-dogfighting.js:157` (the loose-field instance noted in Phase 1). Vehicles have their own derived builder; classify these against `vehicle-derived-builder` in a dedicated pass.

### Phase 2 recommendations (fixes deferred — this was inventory only)

1. **Class A (force-power derived writes)** — highest value. Redesign force-power effects to route through `ModifierEngine` domains (defense/attack/damage) or confirmed calculator-input fields. Do not delete; the mechanics are intended. Fix the mislabeled `mode` while there.
   - **Track A ✅ APPLIED in this PR** (attack/damage/defense/stealth/threshold). Force Defense, Resist Force, Battlemind, Valor, Force Weapon, Force Strike, Surge, Cloak, and Crucitorn now emit per-bonus Foundry ActiveEffects carrying an `effectIntent` flag (`defense.<def>` / `global.attack` / `global.damage` / `skill.stealth` / `defense.damageThreshold`), read by the existing DerivedCalculator/combat-roll-math intent consumers. All-defense powers fan out to three effects; Force Weapon emits both an attack and a damage intent. Generic `system.derived.bonus` deleted. **Critical detail:** these effects now use `origin: actor.uuid` — the ModifierEngine intent collectors skip `actor.effects` whose origin matches `/\bItem\b/` (item-transfer dedup), so the previous `origin: powerItem.uuid` would have made the new intents invisible.
   - **Deferred:** Prescience `system.derived.insight` (left on the legacy write pending the source text — target ambiguous between Perception/Initiative/defenses; not guessed).
   - **Track B — NOT STARTED** (shield/DR): `system.derived.shield.current`, `system.derived.damageReduction.{energy,all}` still write derived directly. The combat readers (`ShieldMitigationResolver`, `DamageReductionResolver`) read the *derived* layer, which nothing populates — so the correct fix needs a new DerivedCalculator resolution step from base/resource sources, not a raw-AE retarget. Separate pass. (Correction to the Phase 2 table: `derived.shield.current` and `derived.damageReduction.all` DO have readers — the Phase 2 grep missed them because the reader lines say `shield.current`/`damageReduction.all` without the word "derived".)
2. **Class B (`system.hp.max` via AE)** — route Toughness-style HP bonuses through the HP recompute inputs; measure for double-apply first (sensitive).
3. **Class C** — publish the confirmed allowed set; fix or remove the `skills.*.misc` vs `miscMod` mismatch.
4. **Class D** — systematic reader-audit; prune dead capability-flag writes (content cleanup).
5. **Class F** — fold into a vehicle-specific effects audit.

## Explicit "Do Not Refactor Yet" List

- **Do not remove/redirect the Foundry core AE `changes` path.** It is the *functional* authority for shield / damage-reduction / concealment / action-limit. Removing it without migration silently breaks force powers and talents.
- **Do not unify `system.activeEffects` (custom array) with Foundry ActiveEffects.** Explicitly flagged as a separate architecture decision (`active-effects-engine.js:5-13`); out of scope for a mechanical cleanup.
- **Do not "fix" the skill-roll `featSkillBonuses` addend** until the double-count is confirmed — it may be intentionally situational-only.
- **Do not touch `DerivedOverrideEngine`, `recomputeHP`, or the type `computeXDerived` builders** — they are in-bounds derived writers, and HP intentionally lives in `ActorEngine`, not `DerivedCalculator`.
- **Do not raise enforcement to `strict` in production as a "fix."** The guards don't cover the bypass paths (core AE / `setProperty`); flipping the level would throw on legitimate flows without closing the real holes.
