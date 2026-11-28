# Post-Merge Foundry V13 Runtime Acceptance Plan (living document; consolidated at the end of Phase 3P)

Owner policy (2026-11-27): live Foundry V13 acceptance is **deferred until after the V2 refactor merges**. Everything below is `FOUNDRY_ACCEPTANCE_PENDING`; **nothing in the refactor is FOUNDRY_TESTED**. Offline evidence (regression/parity tests, ratchet, CI) is recorded in `implementation-progress.md` and the per-area certification documents; this plan lists only what offline tests cannot prove. Record outcomes as PASS/FAIL with world, Foundry build, user roles and screenshots; a FAIL becomes a tracker finding.

Setup: a world with the system at the merged commit; GM + two player clients (A owns Actor A, B owns Actor B) on separate browsers; fixtures: heroic Soldier 6, Large creature, droid, NPC follower (aggressive/defensive/utility, organic and droid), vehicle, Nonheroic 4, mixed Nonheroic/heroic; default house rules, then each listed optional rule enabled and disabled again.

## 1. Multiplayer and permissions
1. Player A purchases from the store while the GM adjusts A's credits (credit adjustment racing a purchase): exactly one wins or both serialize; no lost or duplicated credits; no lock left held. (TE: the in-flight lock is per-client memory; two clients are NOT excluded by the engine — observe and record.)
2. Credit transfer A→B while B spends: both legs settle or the whole transfer is refused/compensated.
3. Two GM clients trigger the same rollback/refund: second is refused (`source rollback already replayed`).
4. Player without ownership attempts ActorEngine-routed mutations (flag, item, credits): refused; GM permitted.
5. Open sheets repaint once after derived recalculation on all connected clients (no render loops, no stale values).

## 2. Mechanical calculations (sheet vs roll vs combat agreement)
1. Defenses, skills, initiative, BAB, grapple, Damage Threshold displayed on the sheet equal the values used by the corresponding roll/damage application, for character, droid, NPC statblock, follower, vehicle; after armor equip/unequip, condition-track steps 0–5, level-up, owner level advance (follower).
2. Damage Threshold: RAW vs Enhanced Massive Damage (full/half level), Medium/Large/Huge, Improved Damage Threshold, vehicle; threshold used at damage application equals the sheet value (excluding documented event-specific adjustments).
3. Force-power half-level damage house rule on/off/on-again on an existing actor: no stale value; elemental and poison exclusions.
4. Alternative Block house rule roll = BAB + ability + weapon + repeat-attempt penalty only.
5. Follower defenses: owner level 8, aggressive living follower Con 10 → Fortitude 20 before other modifiers; droid follower uses Strength; armor does not stack with owner level on Reflex.
6. Nonheroic and mixed Nonheroic/heroic fixtures: skills use half character level; weapon damage half heroic level; defenses heroic level.

## 3. Persistence and derived data
1. Reload the world: derived values, current HP (including 0), condition track, credits, Force Points persist; no drift on first open.
2. Import/duplicate an actor: derived data recomputes once and matches the source.
3. Change an ability score, armor, class level, active effect: sheet repaints once; derived values match a hand computation from the fixture.
4. `applyDerivedSnapshot` stale keys: after a data-shape change no stale derived key appears in the actor's `system.derived`.

## 4. Rollback and failure handling
1. Store purchase that creates a droid actor then fails mid-plan (simulate by permission/limit): buyer credits restored, no orphan world actor, receipt marked failed.
2. GM reversal of a sale/trade and wager refund.
3. Progression finalize failing mid-way: actor restored to the snapshot (items, flags, credits) with identity (ids) unchanged.
4. Browser close during a transaction: on reload no half-applied transaction; recovery evidence available.

## 5. Progression (chargen, level-up, multiclass, prestige)
1. Level 1 chargen, level-up same class, multiclass new class, prestige entry: summary rail projection equals the post-finalize sheet (BAB, defenses, Damage Threshold, grapple, max HP, Second Wind).
2. Prerequisite gating in feat/talent steps uses the canonical index: eligible/ineligible lists correct for the compiled corpus; held records (PRQ-SRC-001..005) behave as before and are not marked certified.
3. Abort/restart a progression session: no actor changes, no leaked credits/items; stale preview never overwrites a newer one.

## 6. Combat
1. Double/Triple Attack from the sheet: two attacks at −5 / three at −10, scoped feat eligibility, refused on multi-shot-prohibited weapons and with Charge; one dialog per attack, one action-economy spend.
2. Damage application, condition track shifts, Second Wind, Force Point spend and rollback on a failed roll.
3. Reactions and turn economy unchanged.

## 7. Equipment and customization
1. Weapon readiness/holster flows, armor equip with proficiency, energy shields, upgrade slots, droid/vehicle customization workbench transactions (debit once, assets created once).

## 8. Follower lifecycle
1. Create follower (each template, organic and droid), advance owner level, delete owner, re-link: defenses and skills follow the owner level; no duplicate feats on startup repair; species materialization once.
2. Follower sheet vs combat rolls agree after each step above.

## 9. Governance / non-functional
1. No console errors/warnings of the form "Direct game.settings … outside HouseRuleService" in a normal session; UI-port registration order (shell mutation guard, Force roll dialogs, suite launcher) — verify each feature works on a cold load.
2. Performance: sheet tab switching and single-field edits stay within a single render; no derived-recalc storms.
