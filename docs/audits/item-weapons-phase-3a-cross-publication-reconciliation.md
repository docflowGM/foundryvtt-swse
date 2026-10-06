# SWSE Weapons — Phase 3A Cross-Publication Reconciliation

**Repo file:** `data/audits/item-weapons-phase-3a-cross-publication-reconciliation.json`, read back against the certified Phase 1/2 claims by `tools/verify-item-weapons-authority.mjs`.

**Status:** `DRAFT_PHASE_3A_CROSS_PUBLICATION_RECONCILIATION_AUTHORITY`  
**Execution model:** ChatGPT plans/certifies; Claude implements/verifies/commits/pushes  
**Scope:** the six cross-published weapon identities only  
**Production mutation:** **not authorized**

## Purpose

Phase 1 ended with **209 certified source claims** mapping to **203 unique production identities**. The difference is exactly six cross-publication claims. Before the full Phase 3 canonical weapon authority is built, those six pairs must be reconciled so the 203-identity merge cannot duplicate, erase, or silently overwrite source material.

## Merge policy

1. Preserve every certified source claim and its provenance.
2. Phase 1 identity rulings control identity continuity.
3. Identical source facts collapse into one canonical fact with multiple provenance sources.
4. Additive, nonconflicting mechanics are unioned.
5. Silence in a later source does **not** delete an earlier certified mechanic.
6. Explicit contradictions become machine-readable conflict objects.
7. Repository values never decide a source conflict.
8. No pack/runtime/schema/actor/feat/talent mutation is authorized in Phase 3A.

## Results

| Identity | Result |
|---|---|
| Guard Shoto | **Conflict carried forward** — availability restriction disagrees |
| Lightsaber Pike | **Resolved additive merge** |
| Flechette Launcher | **Resolved consistent reprint** |
| BlasTech 500 Riot Gun | **Conflict carried forward** — multiple material fields disagree |
| Stunning Gauntlet | **Resolved consistent merge with richer KOTOR variant data** |
| Long-Handle Lightsaber | **Resolved additive merge** |

**Resolved now:** 4 / 6  
**Explicitly conflict-gated:** 2 / 6

---

## 1. Guard Shoto

One production identity: `lightsaber-chassis-guard-shoto`.

The two publications agree on the core chassis: Small Lightsaber, 7,000 credits, 2d4, 1 kg, Energy AND Slashing, Rare, and lightsaber DR bypass.

Merge the nonconflicting mechanics:

- +2 equipment bonus to Use the Force checks for Block and Deflect.
- weapon-object lightsaber resistance already certified in Force Unleashed.
- energy-cell operating requirement certified in Jedi Academy.

### Conflict

- Force Unleashed: **Illegal, Rare**
- Jedi Academy: **Rare with no additional restriction / normalized common**

Do not guess. Carry `availability.restriction` as `UNRESOLVED_PRECEDENCE`.

---

## 2. Lightsaber Pike

One production identity: `lightsaber-chassis-pike`.

The core stat line is compatible across both sources:

- Large Lightsaber
- 4,000 credits
- 2d8
- 2 kg
- Energy AND Slashing
- Rare
- ignores DR
- Reach

Canonical merged mechanics:

- reach increases threatened reach by 1 square;
- Block and Deflect checks take the certified -2 penalty;
- Jedi Academy adds the **Long Haft Form** conditional double-weapon behavior;
- the haft-end attack is **1d6**, has source-unspecified damage type, and does **not** inherit lightsaber DR bypass.

**Disposition:** resolved additive merge.

---

## 3. Flechette Launcher

The Force Unleashed and Rebellion Era claims are mechanically compatible.

Canonical identity: `weapon-flechette-launcher`.

Keep:

- Rifle, Large
- 1,100 credits
- 3d8 Piercing
- 5 kg
- Military
- ROF S
- Inaccurate
- 1-square splash
- 4-shot flechette canister
- 50-credit replacement ammunition
- maximum one shot per round
- Rapid Shot / other multi-shot expenditure prohibited

**Disposition:** collapse to one canonical identity and retain both source claims as provenance.

---

## 4. BlasTech 500 Riot Gun

One production identity: `weapon-espo-500-riot-gun`.

Common facts:

- Rifle
- Medium
- 3d8 Energy
- Military
- S/A
- stun setting

### Material source conflict

| Field | Clone Wars | Rebellion Era |
|---|---:|---:|
| Cost | 1,000 | 1,200 |
| Weight | 4.5 kg | 2.2 kg |
| Inaccurate | yes | no |
| Single-shot attack penalty | -2 | -1 |
| Autofire equipment bonus | not certified | +2 |

Rebellion also explicitly certifies a 50-shot power pack.

This remains **`REVIEW_PRECEDENCE_BEFORE_CONTENT_MUTATION`**. Phase 3 may build the canonical identity with conflict objects, but it may not silently choose one printing.

---

## 5. Stunning Gauntlet

One production identity. No current repo record.

The two publications certify the same core mechanic:

- Simple Weapon
- Restricted
- Energy
- no independent normal damage
- converts the wearer's successful unarmed melee attack to stun damage
- adds **+1 stun damage**
- two sizes smaller than wearer
- cannot be disarmed or dropped

KOTOR contains richer certified size/cost/weight variants. Preserve those variants rather than flattening the merged identity to only the Clone Wars Human/Tiny example.

**Disposition:** resolved compatible merge.

---

## 6. Long-Handle Lightsaber

One production identity: `lightsaber-chassis-longhandle`.

Common chassis:

- Large Lightsaber
- 4,500 credits
- 2d8
- 2 kg
- Energy AND Slashing
- Rare
- ignores DR

Merged mechanics:

- two-handed choice: normal 2d8 with doubled Strength **or** 2d10 base damage without the doubled Strength bonus;
- preserve Jedi Academy's **Long Haft Form** conditional double-weapon profile;
- haft-end attack = **1d6**, source-unspecified damage type, no lightsaber DR bypass;
- preserve energy-cell requirement.

**Disposition:** resolved additive merge.

---

# Phase 3 roadmap from here

## Phase 3B — 203-Identity Canonical Authority Build

Build exactly one record per production identity by combining:

- Phase 1 canonical identity and provenance
- canonical player-readable text
- short player summary
- Phase 2 v2.9 structured stats/mechanics
- ammo / shot capacity / delivery-system authority
- all source claims
- repo mapping
- cross-publication reconciliation result

The output must reconcile:

`209 source claims -> 203 canonical identities`

without losing source traceability.

## Phase 3C — Production Disposition Ledger

Every canonical identity receives exactly one production disposition:

- `KEEP`
- `UPDATE`
- `CREATE`
- `RENAME`
- `MERGE`
- `REMOVE_UNSUPPORTED`
- `REVIEW_PRECEDENCE`

This still does **not** mutate production.

## Phase 3D — Global Verification / Freeze

Required closure:

- 209 source claims traceable
- 203 unique identities
- six cross-publication pairs reconciled to six identities
- no silent source loss
- all conflicts explicit
- deterministic rebuild
- canonical description + summary + mechanics + ammo + repo disposition for every identity

Only after Phase 3D should weapon tag archaeology begin.

---

## Repo readback notes (Claude)

- The six identities, repo ids and (book, page) provenance match the certified Phase 1/Phase 2 claims; every compatible/merged fact and every listed conflict is recomputed from those claims by the verifier. Planner rulings are recorded unchanged (4 resolved, 2 conflict-gated).
- **Findings for the planner (not adjudicated):** the certified claims diverge on the *condition* of the lightsaber-DR resistance. Force Unleashed states it unconditionally for the Guard Shoto and the Lightsaber Pike; Jedi Academy limits it to a phrik-laced handle (Guard Shoto) and a phrik-alloy haft (Pike). The package treats it as additive on the Guard Shoto and lists no conflict on the Pike. This is the same issue as the previously parked "phrik DR" question. The verifier requires both findings to stay recorded.
- Stunning Gauntlet: KOTOR size/cost/weight are stored as `variantsByWearerSize` in the certified KOTOR claim; the Clone Wars claim carries the Human/Tiny example.
- No pack, runtime, schema or production record was changed.

---

## Update with the Phase 3B planner rulings (Claude)

The Phase 3B package closed the two conflict gates and the phrik finding. All six cross-published identities are now resolved; the old values stay preserved under `conflictHistory` and in the source claims.

- **Guard Shoto:** availability resolves to Jedi Academy (common, Rare); the lightsaber-DR resistance is conditional on a phrik-laced handle; the +2 Block/Deflect bonus is independent.
- **Lightsaber Pike:** no conflict; the standard haft is phrik alloy in both publications, so the resistance is intrinsic.
- **BlasTech 500 Riot Gun:** Rebellion Era controls the contradicting fields (1,200 credits, 2.2 kg, not Inaccurate, -1 single-shot, +2 equipment autofire, 50-shot power pack); Clone Wars values are the superseded claim.
- Result: 6 resolved identities (4 compatible/additive, 2 by precedence), 0 unresolved cross-publication conflicts. The Bowcaster range stays a source ambiguity, not a cross-publication conflict.
