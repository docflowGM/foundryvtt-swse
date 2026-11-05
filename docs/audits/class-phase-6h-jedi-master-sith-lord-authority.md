# Class Phase 6H — Jedi Master and Sith Lord source-authority checkpoint

**Branch:** `feat/class-phase-6h-jedi-master-sith-lord-source`  
**Baseline:** merged main `62169f621e15409268ca8f91efd846a3a2c118d9`  
**Source of truth:** *Saga Edition Core Rulebook*, printed Jedi Master pp. 219–220; Sith Lord pp. 223–224. The searchable text identifies the rules; the printed PDF remains the final authority for disputed passages.  
**Status:** source reconciliation and metadata correction; NOT runtime certification.

## Class identities

The core prestige class is named **Sith Lord**, not "Sith Master". Both it and Jedi Master are five-level apex prestige classes, gain +3 to Reflex/Fortitude/Will at their first class level, receive a Force Secret at class levels 2–5, and select talents at levels 1, 3, and 5. These progression grants already belong to progression; do not implement duplicate feature rewards.

### Jedi Master

- **Fearless:** immunity to fear effects. Require an actual fear-effect eligibility gate, not just a tooltip or archetype signal.
- **Serenity — enter:** full-round action to enter an aware meditative trance; character **loses Dexterity bonus to Reflex Defense** while in the trance. The published text does **not** impose the helpless condition. Prior data had `setHelplessExceptAwareness`: corrected in `data/class-features.json`.
- **Serenity — exit:** swift action to emerge; the **first attack roll OR Use the Force check in the following round** is treated as a **natural 20**. This must remain an actual d20 outcome for rules that inspect a natural 20, not a fabricated check total of 20, an arbitrary +20 bonus, or an unbounded all-roll buff.
- **Temporal obligations:** record the entry, while-active defense restriction, exit action, next-round activation, first eligible-roll consumption, expiry, actor identity, and reset when an encounter ends. Check action validity against V2 action economy. Explicitly adjudicate how the natural-20 result interacts with the existing roll authority (critical threats, automatic successes, opposed checks, bonus handling) before enabling.

### Sith Lord

- **Fearless:** same fear-effect immunity, subject to the Sith class access condition.
- **Temptation — initial check:** standard action; Persuasion versus **one enemy's Will Defense** in line of sight. No application when the check fails.
- **Temptation — delayed event:** if the affected enemy spends a **Force Point before the Sith Lord's next turn**, it must choose **+1 Dark Side Score or -1 condition step**. Spending a **Destiny Point** instead triggers **+2 DSP or -2 condition steps**. The **target** makes the consequence choice; the Sith Lord does not impose it on the initial Persuasion roll.
- **Trigger and expiry:** the authority must consume an actual resource-spend event and actor/turn identity. Do not infer spending from changes to totals, substitute a generic skill dialog, or trigger once simply because a target has Force Points.
- **Ongoing class-access restriction:** Core pp. 223–224 explicitly suspend Sith Lord class features while Dark Side Score is below Wisdom, restoring them if it again equals Wisdom. This rule also applies to Sith Apprentice. Do not delete earned levels, talents, or stored choices; evaluate access at use time using the canonical DSP and actor-stat authorities.
- **State/mutation:** trigger subscriptions must deduplicate events and expire on the Sith Lord's next turn. DSP increments and condition movement must use their existing mutation authorities. On an unverified target, line of sight, event, or action ledger, fail closed or request GM adjudication.

## Implementation sequencing

1. **6H-0 (this branch):** Correct published-rule metadata and record exact requirements without claiming execution.
2. **6H-1:** Implement common Fearless immunity via the central fear-effect consumer and verified class ownership / Sith DSP gate; avoid hand-built immunity flags.
3. **6H-2:** Implement Jedi Master Serenity as a typed temporal state machine. Prove the enter/exit action receipts, defense restriction, exact next-round first-use consumption, natural-20 handling, and encounter cleanup.
4. **6H-3:** Implement Sith Lord Temptation with the central Persuasion/target/line-of-sight gateway, event-driven FP/DP spend hooks, target-owned choice, correct DSP/condition mutations, class-access suspension, and expiry.
5. **6H-4:** Run cross-feature regression and live Foundry v13 scene acceptance against the exact integration head. Independent review before merge.

## Acceptance boundaries

- Both new active features are still STUB records until their live consumers are wired and tested.
- Do not implement a second roll or resource mutation engine.
- Do not treat thematic association with Sith as proof of class levels.
- Document the printed rules and preserve the no-premature-runtime-certification policy. The change to the Serenity metadata is a correctness fix, **not** a functioning Serenity action.
- Saboteur integration work is in a separate draft PR #1105; it is **not** part of the Phase 6H branch.

## Phase 6H-1 implementation checkpoint (2026-11-05)

- Added `scripts/engine/progression/utils/apex-class-feature-access.js`, a read-only central resolver. It requires an actually owned class Item with a positive level and canonical/legacy class identity, not a feat, talent, or a suggestive name.
- Jedi Master class features remain active when owned. Sith Lord and Sith Apprentice feature access evaluates the **ongoing** printed DSP ≥ Wisdom rule through `DSPEngine.getValue()` and `SchemaAdapters.getAbilityScore()`, independently of GM house rules for **entry** thresholds; missing Wisdom provenance fails closed. Levels and choices are preserved.
- The same resolver identifies Fearless for the two apex classes, with no Fearless grant to Sith Apprentice. It recognizes explicitly tagged Fear effects or a power named precisely `Fear`, never generic intimidation, mind-affecting-only effects, or names containing “fear”.
- `ForcePowerEffectsEngine.applyPowerEffect()` now suppresses explicitly fear-sourced effects when a **distinct, explicitly supplied target actor** has Fearless. It does not infer a target from the caster fallback.
- Added `tests/class-phase-6h1-apex-feature-access.test.mjs` for threshold restoration, class-spoof denial, source identification, fear boundary, and wiring.
- **Runtime boundary:** the existing Force-power debuff builder is still a no-op and no all-sources fear application authority has been certified. This guard is only one verified entry point. Fearless is **not** fully runtime certified, and Serenity/Temptation remain STUB.
- **Follow-up acceptance:** audit all fear-bearing active-effect, condition, skill and Force-power consumers for a single suppression policy; enforce Sith feature suspension at their actual action/derived-stat consumers, not by deleting class data. Exact-head CI and Foundry v13 still required.
