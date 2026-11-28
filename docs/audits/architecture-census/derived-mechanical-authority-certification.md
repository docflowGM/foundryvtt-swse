# Derived Mechanical Authority Certification Report (3N-DC) — 2026-11-27

Status vocabulary (CLAUDE.md §6): SOURCE_VERIFIED, DATA_RECONCILED, MECHANIC_SPECIFIED, IMPLEMENTED, OFFLINE_TESTED, FOUNDRY_TESTED, DEFERRED_RULES_REVIEW.
**Nothing in this report is FOUNDRY_TESTED.** Live Foundry V13 acceptance is deferred by owner policy until after the refactor merges; every row with a runtime cue is `FOUNDRY_ACCEPTANCE_PENDING` and its scenario is listed in the last section. This is an offline certification: source-to-code review plus regression tests, not a claim that every feat/talent/species/equipment combination was exercised. Rulebook page citations come from the owner's rulings and independent audit; the implementer had no rulebook text, so SOURCE_VERIFIED is claimed only where an owner ruling states the source.

## 1. Certified single authorities (IMPLEMENTED + OFFLINE_TESTED)

| Mechanic | Authority | Rule basis | Evidence (tests in `tests/`) |
|---|---|---|---|
| Half level for skills | `level-split.js#getHalfCharacterLevel` | owner ruling 3N-DC P0 (character level) | `derived-half-level-authority` |
| Half level for personal weapon damage | `level-split.js#getHalfHeroicLevel` | owner ruling (heroic level; Core pp. 36 vs 145 wording discrepancy recorded) | `derived-half-level-authority`, `damage-modifier-ssot` |
| Alternative Block house rule | `houserule-block-mechanic.js` | owner ruling DC-RULE-001: no half-level term; `getEffectiveHalfLevel` deleted | `houserule-block-no-half-level` |
| Defenses (character scale) | `DefenseCalculator.calculate` | Core pp. 145–146; condition penalty applied once | `derived-condition-penalty-single-application`, `flat-footed-dodge-bonus-authority` |
| Follower defenses | `DefenseCalculator.calculate` (+ `follower-defense-rules.js`) | owner ruling F-NPC-003; wrapper deleted | `follower-defense-single-authority` |
| Damage Threshold (character scale) | `DerivedCalculator` (`ThresholdEngine` consumes) | owner ruling F-CMB-003: RAW = Fortitude + size; enhanced house rule adds the level term once | `damage-threshold-single-authority` |
| Skill totals / Skill Focus (RAW +5) | `DerivedCalculator` skill pass | Core; Skill Focus counted once | `derived-skill-focus-single-calculation`, `derived-armor-check-penalty-single-application` |
| Initiative | skill total (final) | Initiative is a skill | `derived-initiative-final-authority` |
| Condition-track penalty table | `utils/condition-track-penalty.js` | Core condition track (0/-1/-2/-5/-10; bottom step is a state) | `condition-track-penalty-single-table` |
| HP mirror (current 0 preserved) | `DerivedCalculator` + `hp-accounting` | preserve history; 0 is a legal value | `derived-hp-zero-current-value` |
| BAB provenance | `BABCalculator.calculateDetailed` | provenance exposed (certified / estimated / startup-deferred) | `class-bab-canonical-progression`, `bab-provenance-not-certified-when-estimated` |
| Derived-result application | `derived-generation.js#applyDerivedSnapshot` (one routine for both write paths) | DC-A07 | `derived-application-single-path`, `v2-derived-async-stale-result-dropped`, `reconciliation-async-lifecycle-paths` |
| Derived overrides | `DerivedOverrideEngine.apply` | works on real object values | `derived-override-engine-shape-authority` |
| Force-power half-level damage (house rule, default off) | `combat-stat-rules.js` via `HouseRuleService` | DC-A01 namespace fix | `force-power-half-level-setting-namespace` |
| Grapple | `combat-stat-rules.js#computeGrappleBonus` | prior Math Integrity Freeze | `grapple-bonus-ssot-parity`, `grapple-size-modifier-book-values`, `combat-stats-tooltip-grapple-authority` |
| Attack bonus | `resolveAttackBonus` | prior Math Integrity Freeze | `attack-bonus-math-integrity` |
| Double/Triple Attack | `buildFullAttackSequence` | owner ruling F-CMB-007 (not a derived value; sequence authority) | `multiattack-single-sequence-authority` |

## 2. Open items (not certified)

| Item | State | Blocker |
|---|---|---|
| DC-A02 heuristic-processor droid untrained skills | DEFERRED_RULES_REVIEW | needs the published untrained-use rule and processor data shape (rules register) |
| DC-A03 Nonheroic Force Points / Second Wind eligibility | DEFERRED_RULES_REVIEW | needs the published exceptions (rules register) |
| DC-A05 Skill Focus scaled/delayed variants | DEFERRED_RULES_REVIEW | which level ("½ Level") and rounding; variants are inert today (module unreachable) |
| DC-A06 BAB estimation copies (`levelup-shared`, `summary-step`, `prereq-adapter`) | OPEN | retired when PRQ/PRG route through `BABCalculator`; prestige/Nonheroic progression-table completeness is a data task |
| Ability-modifier formula (~71 sites) | UNVERIFIED | per-site read; display-only duplicates to migrate |
| Speed, Force Point max, Second Wind arithmetic | UNVERIFIED / rules-sensitive | speed authority read pending; FP max touches rules (see DC-A03) |
| Enhanced vehicle DT house-rule formula | isolated compatibility path | documented/tested by owner ruling; vehicles otherwise use their own authority |
| ModifierEngine typed contributions for derived overrides | OPEN | later DC step |
| Initiative skill pass depends on `derived.damage.conditionPenalty` being populated before `computeAll` | ORDERING NOTE | behavior correct when the actor prep sets it first; guarded by the lifecycle tests, no failing case reproduced |
| HPCalculator.calculate() consumers | OPEN | audit/retirement |

## 3. House-rule state matrix (default RAW / enabled / disabled-again)
Tested in three states: Enhanced Massive Damage level term (`damage-threshold-single-authority`), Force-power half-level damage (`force-power-half-level-setting-namespace`). Not yet matrix-tested: critical-hit variants, double/persistent DT penalties, Skill Focus variants (deferred above), Second Wind variants.

## 4. FOUNDRY_ACCEPTANCE_PENDING scenarios (post-merge)
1. Sheet vs roll agreement for defenses, skills, initiative on a character, droid, NPC and follower after: armor equip/unequip, condition-track steps 0–5, level up, owner level advance (follower).
2. Damage Threshold shown on the sheet equals the threshold used when damage is applied (RAW and enhanced-rule world settings, Medium/Large/Huge, vehicle).
3. Enabling then disabling Enhanced Massive Damage / Force-power half-level rule on an existing actor leaves no stale value.
4. Double and Triple Attack launched from the sheet: two attacks at −5, three at −10, refused on a multi-shot-prohibited weapon, no duplicate dialogs.
5. Alternative Block roll uses BAB + ability + weapon + repeat penalty only.
6. Open sheets repaint once after derived recalculation (both application paths) with no render loop.
