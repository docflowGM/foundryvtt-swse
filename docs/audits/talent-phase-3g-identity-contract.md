# Phase 3G-0 — Talent prerequisite identity contract (audit)

Baseline: merged `main` @ `a3a94c958c8bd2f5d5c4060deb7b95612b2292de` (Phase 3F). 3F merged-main closure gates, run on that SHA: `check-talent-phase-3c-ci.mjs` → `POST_3F_STATE` 12/12; `apply-talent-phase-3f.mjs --verify --exact` PASS; reconciler 1,189 → 1,187 → 1,187 with 0 blocking; registry, membership, homebrew PASS; 3F runtime identity/normalization tests PASS; full rolling suite 280 passed, 0 failed (5 documented exclusions).

Everything below was measured with the **real** `PrerequisiteChecker`, real pack records and the exact item shapes the runtime creates (`tools/audit-talent-prerequisite-identity-experiments.mjs` → `data/audits/talent-phase-3g-identity-experiments.json`; census: `docs/audits/talent-phase-3g-prerequisite-identity-census.md`).

## 1. The identity layers, and which survive each hop

| Layer | On the compendium talent | On the embedded actor item the **finalizer** creates | On the **pending** selection the talent step commits |
|---|---|---|---|
| compendium `_id` (16-hex) | yes (the pack key) | **no** — Foundry assigns a new item `_id` | **yes**, as `id` (`talent.id \|\| talent._id`) |
| full compendium UUID | derivable: `Compendium.foundryvtt-swse.talents.Item.<_id>` | **no** | **no** |
| `flags.core.sourceId` | no | **no** — nothing in `scripts/` stamps it; `FeatTalentPlanBuilder` clones `resolvedDoc.toObject()`, which carries no source link. It exists only on the Phase-3D-refreshed actor-pack snapshots, and in the **legacy** form `Compendium.<pack>.<id>` (no `.Item.`) | no |
| `_stats.compendiumSource` | null on pack records | **no** (same reason) | no |
| `flags.swse.id` (`swse.talent.<slug>`) | on **835 of 1,187** canonical talents; **6 values are shared** by same-name/different-tree pairs (Armor Mastery, Force Treatment, Multiattack Proficiency (rifles), Ruthless, Keep it Together, Seize the Moment) | **yes** (copied by the clone) | **no** — the selection copies `system`, not `flags` |
| `system.slug` | absent on talents | absent | absent |
| canonical name | yes | yes | yes |
| canonical tree | via `talent_trees.db` membership | not carried | `treeId` is the tree *name/label* |

## 2. What the checker does with each reference form (real runs)

* `{type:'talent', id}` is matched against the actor's items only: `i.id`, `i._id`, `i.flags.swse.id`. It is **never** matched against pending selections, and `flags.core.sourceId` is **not** consulted for `id`.
* `{uuid}` is matched against `i.id` / `i.flags.core.sourceId`; against pending entries only when they carry a `uuid` or an `id` **equal to the whole UUID string**.
* After identity fails: slug (`system.slug`, absent on talents), then name — **but only if the leaf carries a `name`**. A leaf with only `id` falls through to `_actorHasNamedItem`, which treats the id string as a "name" and fails.

Measured over the **315 structured talent-to-talent leaves** (all `{type, id}` only):

| Runtime shape | Met | Not met |
|---|---|---|
| embedded copy as the finalizer creates it | 309 (all via `flags.swse.id` identity) | **5** |
| embedded copy with `flags.core.sourceId` set | 309 | 5 (sourceId is ignored for `id` leaves) |
| pending selection as the talent step commits it | **0** | **314** |

Findings:

1. **The five Phase 3D repairs are referentially valid but never effective.** Fearsome, Ruthless Negotiator, Shared Notoriety, Unsavory Reputation and Weakening Strike point at the target's compendium `_id`; no embedded copy (finalizer-shaped *or* source-linked) nor pending selection ever satisfies them. (Their printed text prerequisite is what actually gates play today.)
2. **No structured talent prerequisite can be satisfied by a pending selection** (0/314), because identity lookups skip the pending list for `id` and the pending entry has neither `flags` nor `uuid`.
3. **`swse.talent.*` ids are not a universal identity:** 352 of 1,187 (29.7%) lack one; one structured leaf (`Find an Opening` → `swse.talent.seize_the_moment`) is **ambiguous** — it matches both the Outlaw and the Provocateur *Seize the Moment*, and either embedded copy satisfies it (so identity does not beat name for same-name pairs).
4. **UUID format hazard:** the v13 form `Compendium.<pack>.Item.<id>` does not match the legacy `flags.core.sourceId` form `Compendium.<pack>.<id>` (experiment E5b). A helper must normalize both.
5. A dead UUID with a `name` falls back to name (reported via `_logResolutionWarning`, `fallback:true`); without a name it simply fails.

## 3. Adopted contract (to be implemented in 3G-2/3, proven there)

* **Durable cross-document reference:** the canonical compendium **UUID** of the talent record (`Compendium.foundryvtt-swse.talents.Item.<_id>`) — the pack `_id` is the one identity that is total (1,187/1,187), unique, and already present on every pending selection. The v13-canonical form is stored; the legacy form is accepted on read.
* **One helper** (no string construction at call sites): `canonical record → UUID`, `embedded item → UUID` (via `flags.core.sourceId` / `_stats.compendiumSource`), `pending entry → UUID` (`uuid`, `sourceId`, or a bare compendium `_id` in `id`), plus optional compatibility lookup by `flags.swse.id`; slug/name only after identity fails, and the fallback is reported.
* **The finalizer must stamp the source link** on the embedded copy (today it does not), from the same helper — otherwise a UUID reference is satisfiable only on actor-pack snapshots.
* `flags.swse.id` stays a compatibility identity, **not** a second universal namespace: it is not total or unique.
* Name alone is never authoritative for a same-name target.

## 4. Scope boundaries held

Talent-to-talent structured identity only; no rewrite of text prerequisites, feat/skill/class/force-power identity, no removal of legacy parsing, no actor-snapshot refresh, no change to canonical prerequisite wording.
