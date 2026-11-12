# Reconciliation V2 — Addendum: Manual Progression Completion Acknowledgments

**Status: APPROVED DESIGN DIRECTION. IMPLEMENTATION NOT AUTHORIZED.** This document specifies a future capability. Nothing here has been implemented; no UI control,
history field, flag or mutation described below exists in the repository. It is separate from, and does not change, the Foundry V13 acceptance package
(`reconciliation-v2-foundry-v13-acceptance.md`) or PR #1145.

Compared against: PR #1146 head `dfe3235` (code identical to `0cb4bf6` plus documentation), on top of PR #1145 `44cc3c7`.

## 1. Approved architectural principle

**Manual progression is a first-class, supported workflow.** A player who completed a progression entitlement by hand (sheet editing, drag-and-drop) must be able to say so,
durably, without repeating the action through the wizard. Reconciliation must therefore recognise two kinds of completion evidence, keep them distinguishable, and stay truthful about
what has been mechanically verified:

1. *System-recorded* progression - the canonical progression authority applied the benefit and recorded the transaction.
2. *Player-attested* progression - the player states the benefit was applied manually.

Invariants (each is a requirement, not a preference):

- I1. An acknowledgment **never applies the benefit**. It records a statement; it makes no change to ability scores, items, skills or resources.
- I2. An acknowledgment is **never presented as mechanically verified**.
- I3. The system **never fabricates** historical evidence, and never reconstructs original scores from an assumed distribution (for example point-buy).
- I4. Acknowledgment, Ignore and Resolve are **three separate mechanisms** (section 6).
- I5. The reconciler stays **read-only**; an acknowledgment is a separate, explicit, authorized mutation.
- I6. **One canonical history per domain.** For ability increases that is `system.progression.abilityIncreaseHistory`. No parallel ledger, shim, crosswalk or migration.

## 2. Current ability-increase behavior (verified in source)

### 2.1 Entitlement
`ProgressionReconciler._buildAbilityIncreaseSlots` creates one slot per character level 4, 8, 12, 16, 20 up to the actor's level (`id` `ability-increase-level-<L>`).
`_abilityIncreaseCountForActor` expects **2** increases per level, or **1** for a droid or an actor with a Nonheroic class. That 1-vs-2 branch is
pending rules questions RECON-002 / RECON-003; the report builder marks such slots `rulesDeferred` so they can never produce a missing verdict.

### 2.2 Evidence and verdict
`_readAbilityIncreaseHistory` reads `system.progression.abilityIncreaseHistory` **plus** `system.progression.lastAbilityIncrease` (a second, legacy-style source merged in if its level is not
already tracked). Records are matched by level (`level ?? characterLevel ?? acquiredAtLevel ?? sourceLevel`); several records for one level are merged with `Math.max` per ability (so
duplicates do not double count). The slot is:

| History for that level | Slot status | Finding? |
|---|---|---|
| none | `unverifiable` (`unverifiableReason`: "No ability-increase history record exists for this level.") | no - informational |
| record covering the entitlement | `filled` | no |
| record covering fewer increases than expected | `open` (the shortfall) | yes, `MISSING_ABILITY_INCREASE` |

So the addendum's premise holds: missing history is already `unverifiable`, not accusation. The existing resolve action for an `open` slot routes to the attribute step in reconcile mode.

### 2.3 Writers
`AbilityScorePlanBuilder.buildLevelUpSet` is the **live** writer: the finalizer strips the keys its own inline block produces (`phase4RemoveInlineAbilitySetKeys`, which also deletes `lastAbilityIncrease` and `abilityIncreaseHistory`) and replaces them with the builder's output, so the inline block at ProgressionFinalizer ~line 1451 is a dead duplicate of the same logic (the same pattern as the HP economy builder). A second caller, `_compileSingleStepAttributeSet`, also uses the builder, with `source: 'single-step-progression'`. The shapes are identical. Both
- add `+delta` to `system.attributes.<k>.base` (delta clamped by the allocation mode: 2 per ability only under `allow_stacked_two`, otherwise 1; via `ProgressionRules.getAbilityIncreaseAllocationMode`),
- write a record `{ level, characterLevel, increases, timestamp, source }` (`source` is `'progression-finalizer'` or the caller-supplied label) to **both** `abilityIncreaseHistory` and `lastAbilityIncrease`,
- **drop any existing record for the same level** before appending (replace-by-level), keeping the array sorted by level.

## 3. Proposed manual-attestation record contract

Extend, do not replace, the existing record. Proposed (to be validated against the consumers listed in section 3.2 before any implementation):

```
{
  level, characterLevel,                 // existing - the entitlement's character level
  increases: { con: 1, wis: 1 },         // existing - ability -> amount
  timestamp,                             // existing - kept as the time of the statement
  source: 'manual-attestation',          // existing field, new value
  evidence: 'player-confirmed',          // NEW (see section 5); absent on existing records
  appliedBySystem: false,                // NEW
  attestedBy: '<user id>', attestedByName: '<name>',   // NEW
  entitlementId: 'ability-increase-level-8',           // NEW - stable identity (same id the slot already has)
  houseRules: { abilityIncreaseMethod, allocationMode } // NEW - the effective rule context at attestation time
}
```

### 3.1 Rules for the contract
- R1. `entitlementId` + `level` identify the entitlement; at most one active attestation per entitlement (idempotent acknowledgment). A second acknowledgment of the same entitlement
  updates nothing unless it is an explicit correction (section 8).
- R2. `increases` must be valid under the **same** authority the writers use: at most 1 per ability unless the allocation mode is `allow_stacked_two`; total equal to the entitlement count.
  An attestation that does not match the entitlement is not accepted (partial acknowledgments are not full completion - section 9, Q3).
- R3. `appliedBySystem: false` is mandatory and is the discriminator that tells every later reader the scores were **not** changed by this record.
- R4. Existing wizard records stay exactly as they are. A record without `evidence` is interpreted by its `source` (`progression-finalizer` or a builder label => system-applied); a record with a missing or unrecognised source is **not**
  assumed system-applied (see concern C3).
- R5. The attestation is written to `abilityIncreaseHistory` only. It must **not** write `lastAbilityIncrease` (that field means "the last increase the system applied").

### 3.2 Consumers that must be audited before implementation
`ProgressionReconciler._readAbilityIncreaseHistory` / `_buildAbilityIncreaseSlots` / `abilityIncreaseRecordLevel` / `normalizeAbilityIncreases` / `abilityIncreaseCount`;
`AbilityScorePlanBuilder.buildLevelUpSet` (live) and the dead inline `ProgressionFinalizer` duplicate; `phase4RemoveInlineAbilitySetKeys`; `_compileSingleStepAttributeSet`; anything that renders the history. No other
reader of `abilityIncreaseHistory` was found by search at the audited commit.

## 4. Character Review interaction

For an ability-increase slot whose status is `unverifiable`:

- Row: **"Level 8 - Ability Increases"** - status "Not verified" - text: "The character is entitled to two ability-score increases at level 8. No recorded history establishes whether these were applied." (This is a note/entitlement
  row, not a `!` finding - unverifiable never raises the header indicator; the row lives where informational items live and offers the actions below.)
- Actions: **Already Applied** and **Apply Increases**.
- **Already Applied** opens a focused confirmation: the player picks the abilities (two different abilities, or one twice only under `allow_stacked_two`), sees the sentence "Confirming records your choice. It will **not**
  change your current ability scores.", and confirms. No wizard step opens.
- **Apply Increases** is the existing routing (focused attribute step in reconcile mode) and **is available only while no attestation exists for that entitlement** (concern C2).
- After confirmation the slot reads as satisfied by *player attestation*; the record stays visible in the review for later correction or withdrawal.
- Wording must never say "verified". Suggested: "Recorded as applied manually (confirmed by <player>, <date>)."

## 5. Evidence classification

| Category | Meaning | How it appears in data (proposed) |
|---|---|---|
| `SYSTEM_APPLIED` | canonical authority applied and recorded | `source` of `progression-finalizer`/builder label, no `evidence` field (existing records); future records may add `evidence: 'system-applied'` |
| `PLAYER_ATTESTED` | player states it was applied manually | `source: 'manual-attestation'`, `evidence: 'player-confirmed'`, `appliedBySystem: false` |
| `GM_AUTHORIZED` | an authorized GM confirms or grants | `evidence: 'gm-authorized'`, `attestedBy` = GM; written only by a GM client |
| `UNVERIFIABLE` | no sufficient evidence | no record (today's `unverifiable` slot) |
| `CONFIRMED_DISCREPANCY` | independent canonical evidence proves a problem | a finding; never produced by the absence of a record alone |

These are categories of *completion evidence*; they do not compute rules and they do not interact with feat/talent acquisition evidence (`progression-evidence.js`), which classifies **items**, not ability increases.
`PLAYER_ATTESTED` satisfies the entitlement; it is never relabeled "certified" or "verified". **GM_AUTHORIZED is advisory, not tamper-proof**: Foundry cannot prevent an actor owner from editing flags directly, so (like the Force Point
override record) these are provenance statements for review, not security controls.

## 6. Mark Complete versus Ignore versus Resolve

| | Meaning | Writes | Mechanical effect |
|---|---|---|---|
| **Already Applied** | entitlement fulfilled manually | one attestation record in `abilityIncreaseHistory` | none |
| **Ignore** | suppress one existing finding | `flags.swse.reconciliationIgnored` | none; creates no evidence; does **not** satisfy an entitlement |
| **Apply Increases / Resolve** | system applies the benefit through the canonical authority | scores + a system record | applies the benefit; idempotent |

The three must stay separate controls, separate handlers and separate stored data. In particular, Ignore must never be accepted as an acknowledgment, and an acknowledgment must never be recorded in the ignore store.

## 7. Reconciliation rules

Evaluation order (extends the existing slot evaluation): entitlement (canonical progression + house rules) -> system-applied history -> valid attestations -> GM-authorized evidence -> verdict
(satisfied / partially satisfied / unverifiable / contradicted) -> a finding only when evidence proves a problem.

An attestation must **not**: excuse a proven contradiction; create an unowned feat/talent/skill/power; authorize an illegal selection; be counted twice (duplicates merge, as the reader already does with `Math.max`); be treated as full completion when partial;
or survive silently when its entitlement changes materially (it is **re-evaluated**: for example if the allocation mode, the expected count, or the level changes, the attestation is reported as needing review, never rewritten).
Changes to unrelated fields do not erase it (the record lives in the history array; no other writer removes entries except replace-by-level, see C1).
A mistaken attestation can be **corrected or withdrawn** by an authorized action (owner or GM) which removes or replaces *only* the attestation record (identified by `source: 'manual-attestation'`), never a system record.

## 8. Permissions, mutation authority, idempotence, invalidation

- All writes go through `ActorEngine.updateActor` (owner or GM permission; unauthorized users are refused by the existing mutation pathway).
- Stable identity: `entitlementId` (`ability-increase-level-<L>`); acknowledgment is idempotent (a repeat is a no-op).
- **Concurrency:** `abilityIncreaseHistory` is a plain array that is read, modified and written back as a whole; two clients acting at once can lose an entry. The write must be revalidated immediately before the update (re-read the history, confirm the entitlement is still unverifiable and not yet attested, check the actor revision), mirroring the safe Force Point Resolve; otherwise answer "your character changed".
- Cache: the reconciliation memo keys on the actor modification stamp, so the attestation write invalidates it; no extra invalidation is required.
- The reconciler never writes. Opening the review never creates an attestation.
- No automatic ability-score mutation; no retroactive history; no new compatibility layer.

## 9. Concerns discovered while comparing the proposal to existing evidence

**C1 - Replace-by-level in both writers.** Both history writers drop any record at the same level before appending. A later wizard application at a level that has an attestation would silently erase the attestation (acceptable as supersession), but the
reverse hazard matters more: the attestation writer must **refuse** (or require explicit confirmation) when a system-applied record already exists for that level, and must never use the replace-by-level rule against system records.

**C2 - Double-application hazard.** "Apply Increases" adds `+1` to `system.attributes.<k>.base` *now*. If the player already increased the scores by hand and then uses Apply Increases (or a later reconcile/level step does), the scores rise **twice**. After an
attestation exists the Apply route for that entitlement must be unavailable (or gated behind an explicit warning), and Apply must remain unavailable while the attestation is unwithdrawn.

**C3 - Any record counts as complete.** The reader treats any record with a level and `increases` as filling the slot regardless of `source`. A hand-edited, imported or foreign record is therefore trusted exactly like a system record. The proposal needs a rule for
how records without a recognised `source`/`evidence` are classified (R4) before attestation can be distinguished from them.

**C4 - Possible latent defect in the existing reconcile route (unverified).** The live builder takes the record's level from `manifest.characterLevel`. In the full progression session that manifest is `flags.swse.levelUpEntitlementManifest`, which the finalizer builds only when the session is *not* a reconciliation session (`levelUpManifest` is `null` for reconciliation). If a reconcile-mode attribute step goes through that path, the increase is applied to the scores but recorded with `level: null`, which `_buildAbilityIncreaseSlots` ignores (`if (!level) continue`): the slot stays unresolved and a second Apply increases the score again. In the single-step path (`_compileSingleStepAttributeSet`) the level comes from `attr.abilityIncreaseLevel || attr.characterLevel || attr.level` and **falls back to the actor's current level**: resolving a level-8 entitlement on a level-9 actor without an explicit `abilityIncreaseLevel` would record the increase at level 9, leaving level 8 unresolved and creating a spurious level-9 record. **Which path the reconcile-mode Apply uses, and what level it records, must be verified (Foundry or a focused trace) before the existing Apply route is relied on or reused.** No current test covers it.

**C5 - Duplicate writers.** The dead inline finalizer block and the live `AbilityScorePlanBuilder` implement the same record logic. Any new field must be added to the live builder only, and the dead duplicate should not be extended or mistaken for the writer (the same trap that put the HP ledger in the wrong place once).

**C6 - Two sources read.** The reader merges `lastAbilityIncrease` into the history. An attestation must not populate `lastAbilityIncrease` (R5), and the merge must not let a stale `lastAbilityIncrease` mask an attestation or vice versa.

**C7 - Deferred rules.** For droids and Nonheroic actors the expected count (1 vs 2) is RECON-002 / RECON-003. An attestation for a `rulesDeferred` slot cannot be validated against a count. Until those rules are decided, the acknowledgment control for such slots must either be hidden or accept the entitlement as recorded without count validation and label it so. This is Q1.

**C8 - Attestation proves nothing about current scores.** The player may attest to increases the current scores do not reflect (or the reverse). Reconciliation must not compare current scores with attested increases (no reconstruction of original scores, I3); the attestation is a statement, not a checkable fact.

## 10. Extension to other progression domains

The capability is to be designed as a reusable *progression-evidence* statement, certified first for ability increases. For each later domain the owners must define **what is being acknowledged**:

- Item-based choices (general / class feat, talent, Force power / technique / secret, Force Training selections): an acknowledgment must **link to an existing owned item** (by id); it must never create or imply an item that is not owned.
- Skill training: only after RECON-007; the trained-skill entitlement formula is undecided.
- Force Training: only after RECON-006 (attribution and retroactivity).
- Feat/talent slots depend on RECON-001 / RECON-002 / RECON-005 (cadence) and must not be acknowledged on a cadence that is not settled.
- There is no generic "mark anything complete" marker; each acknowledgment type is scoped to one entitlement type and validated by that domain's authority.

## 11. Future investigation: associating a manual stat edit with an entitlement (optional)

When a player edits a permanent ability base value, the sheet *may* offer "count this toward your outstanding level-N ability increase". Requirements: strictly optional and dismissible; never assumed (the edit may be a creation correction, a GM decision or another source);
the stored record must separate what the system observed (the old and new base values at the edit) from what the player attested (that it was the level-N increase), and must not be created without the player's explicit confirmation. Not designed further here.

## 12. Required tests and acceptance criteria (for the future implementation)

Node-level tests (real reconciler and builders where practical):
1. No history -> slot `unverifiable`; attestation of exactly the entitlement -> slot satisfied; the actor's `system.attributes.*` are byte-identical before and after.
2. Attestation does not set `lastAbilityIncrease`, and `appliedBySystem` is `false`.
3. Idempotent: acknowledging twice writes once; duplicate records for a level do not count twice.
4. Partial attestation does not satisfy the entitlement (behavior per Q3).
5. Invalid selections are refused: more than one increase per ability without `allow_stacked_two`; wrong total; unknown ability key.
6. A system-applied record at the level: the attestation is refused; a wizard application after an attestation is blocked or warned (C1, C2).
7. Withdrawal removes only the attestation record; never a system record; the slot returns to `unverifiable`.
8. A material change of the entitlement (allocation mode or level count) causes re-evaluation, not silent rewrite.
9. Records with missing or unrecognised `source` are not classified as system-applied (C3).
10. Ignore never satisfies an entitlement and never creates a record; acknowledgment never writes `reconciliationIgnored`.
11. Concurrency: two simultaneous acknowledgments produce one record; a stale write is rejected (revalidation).
12. Permissions: owner and GM may attest; others are refused; a GM-authorized record is written only from a GM context.
13. `rulesDeferred` (droid / Nonheroic) behavior as decided in Q1.
14. The reconciler remains read-only (no write during evaluation or when opening the review).
15. Silent Success: a character with attestations for every entitlement produces no `!` and no note.
16. Regression for C4: a reconcile-mode Apply either records the level correctly or is shown to be impossible.

Foundry V13 acceptance (when implemented): the player flow for a manually edited level-8 character (Already Applied; scores unchanged; reload persists); the GM flow; the stale two-tab case; Apply blocked after attestation; withdrawal; the double-application guard; a droid/Nonheroic actor per Q1.

Acceptance criteria: all of the above pass; no score changes from any acknowledgment; evidence categories remain distinguishable in the stored data and in the UI wording; no new migration, shim, crosswalk or second ledger; ActorEngine is the only writer.

## 13. Open questions (not decided here; no guess recorded)

- **Q1.** Droid and Nonheroic ability increases (RECON-002 / RECON-003): what entitlement count may an attestation be validated against? Until decided, hide or accept without count validation (owner decision).
- **Q2.** How should records lacking `source`/`evidence` (older imports, hand-edited data) be classified: system-applied, attested, or unknown (C3)?
- **Q3.** Is a partial attestation (for example one of two increases) allowed? If allowed, the remaining increase is *unverifiable*, not *open*; the current reader would turn a partial record into an `open` finding, which would be wrong for an attestation.
- **Q4.** Who may withdraw or correct an attestation (the attesting player, any owner, GM only)?
- **Q5.** Should a GM-authorized record be able to supersede a player's attestation, and how is the original statement preserved for review?
- **Q6.** Reconcile-mode Apply (C4): is it already recording the level correctly? Needs verification before reuse.
- **Q7.** Where should the Already Applied controls live - the Character Review overlay (which is reachable only through a `!` today) or the entitlement row elsewhere? Unverifiable rows currently never raise the header indicator, so a pure-unverifiable character has no entry point into the review. This is a UX decision with a Silent Success tension.
- **Q8.** Whether the optional "associate this edit with an entitlement" flow (section 11) is wanted at all.
