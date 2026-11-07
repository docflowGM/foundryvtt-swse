# SWSE Force class features — Phase 6J–6P implementation handoff

**Date:** 2026-11-07  
**Repository:** `docflowGM/foundryvtt-swse`  
**Base main:** `b360a2fc0f626b83152453d4c0a5d5f70abe2216`  
**Status:** all **seven** previously open Force-class catalog entries have targeted source-backed implementation work. These changes are **stacked DRAFT PRs**, **not merged or live Foundry v13 certified**.

## Integration order (do not merge out of order)

| Phase | Draft PR | Feature(s) | Principal change |
| --- | --- | --- | --- |
| 6J | #1120 | Sith Apprentice **Fallen Jedi** | Restrict using explicit Light Side Force Powers before rolling/spending, retain known powers |
| 6K | #1122 | Jedi Master / Sith Lord **Fearless**, Force Disciple **Indomitable** | Shared typed Fear/Mind-Affecting effect suppression; Sith DSP feature suspension respected |
| 6L | #1123 | Force Disciple **Prophet** | Immediate keep-two-DP vs sacrifice-extra-for-vision choice before level-up finalization |
| 6M | #1124 | Jedi Master **Serenity** | Full-round enter, swift exit, trance Reflex Dex denial, first following-round attack/UtF evaluated natural 20 |
| 6N | #1125 | Sith Lord **Temptation** | GM-confirmed target/LOS, Persuasion vs Will, committed FP/DP spend receipt, target-owned consequence, next-turn expiry |
| 6O | #1126 | **Fearless + Indomitable** coverage | Type-tagged ActiveEffect and ConditionEngine ingress filter, no invented broad immunity |
| 6P | #1127 | Force Disciple **Prophet** GM follow-up | GM records actual prophetic vision, no automatic Destiny change or duplicate award |

Each PR's base is the preceding phase's branch. **Review and integrate in order**, testing exact integration heads after each merge/rebase. Changes to earlier branch heads after newer branches were cut have been propagated explicitly to overlapping files where appropriate; compare exact trees and resolve drift before merging.

## Shared immutable authorities

- Published rules and page numbers: *Saga Edition Core Rulebook*, Force Disciple p.215, Jedi Master pp.219–220, Sith Apprentice / Sith Lord pp.223–224.
- Class identity in `packs/classes.db` (actual checked IDs): Jedi Master `07a64453f95e04f2`; Sith Lord `2f7cfdc115c640a5`; Sith Apprentice `1ba03b2d00245906`; Force Disciple `ef6fe8fdbbd884b4`.
- Ownership access: `apex-class-feature-access.js`, `force-disciple-features.js`.
- Resources and state writes: `ActorEngine`; Force DSP calculations: `DSPEngine`; condition steps: `ConditionTrackRules`.
- Turn costs: `ActionEconomyConsumption`; d20: `RollCore` and `RollEngine` (not independent or fake +20).
- No class/talent/feat/sourcebook compendium identity modified by this stream.

## Test and review gates

1. Verify full rolling GitHub Actions at the **exact head** of each PR, then repeat at the final combined integration head. Older green ancestors are not proof of later commits.
2. Execute live Foundry 13 CharGen → multiclass → progression for all four relevant classes. Test real owned class Items and reject namesakes.
3. **Fallen Jedi:** powers with explicit `light-side` metadata cannot activate/roll/spend; unrelated Force Powers unaffected; retained powers remain present.
4. **Fearless/Indomitable:** explicit fear/mind-affecting conditions and ActiveEffects blocked, unrelated powers/conditions allowed, Sith DSP below Wisdom suspends Fearless, duplicate immune sources do not interfere.
5. **Prophet:** at Force Disciple levels 1–5 with valid Destiny, keep-two vs one-plus-GM-vision, exactly-once ledger, cancel/rollback, later GM narrative with separate Destiny choice.
6. **Serenity:** full-round and swift receipts, Dex-only loss of Reflex bonus during trance, actually evaluated d20 natural 20 on first qualifying following-round attack/UtF, no +20 to total, no consumption for other skills/damage, encounter cleanup and retry safety.
7. **Temptation:** GM confirms LOS/target, actual standard action + Persuasion check vs Will, no immediate DSP/condition, target chooses +1/+2 DSP or worse condition step on *actual* confirmed FP/DP spend; no penalty on refunded paid roll; expiry at source's next turn, pending GM review if UI unavailable.
8. Test multi-client GM/player ownership, synthetic/unlinked actors, actor reload, multiple active casters, initiative reordering, rapid consecutive spends, rollback and concurrent hook execution. Confirm no actor mutation bypasses ActorEngine.

## Known evidence boundaries

- **Not all Force/talent/skill effects carry typed metadata**. Phase 6O filters only explicitly annotated effects. Source audits of untyped mutation consumers remain an outstanding all-path immunity certification task.
- **Temptation resource receipts** are emitted locally through typed hooks. Player-owned spending normally processes on that same client; broader distributed GM connectivity, unloaded Actors and alternative direct resource writers require separate live proof. Do not infer spends from pool differences.
- **Serenity** RollCore bridge covers canonical attack/Use the Force paths; formulas with additional independent dice terms are excluded from automatic forced-maximize to avoid maximizing bonus dice. These cases require targeted implementation or GM adjudication until validated.
- **Prophet** records GM visions but does not automatically reassign Destiny; that choice is intentionally GM-adjudicated.
- Exact-head CI and unit tests do **not** constitute Foundry live certification.

## Merge policy

Do not merge all seven blindly as a single undifferentiated batch. Require independent source/architectural review, exact-head CI, and live Foundry acceptance evidence per tranche. Resolve any failed receipt, mutation, actor ownership or roll boundary before closing the corresponding acceptance gap. This handoff documents implemented code and outstanding proof; it does **not** falsely label every mechanic as fully certified.
