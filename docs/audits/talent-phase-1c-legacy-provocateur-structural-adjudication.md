# PHASE 1C-LEGACY FINDINGS - Legacy Era Provocateur Structural Adjudication

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Parent findings:**  
- `docs/audits/talent-phase-1a-repository-graph-census.md`
- `docs/audits/talent-phase-1b-fandom-reference-diff.md`

**Primary source:** `Star Wars Saga Edition - Legacy Era Campaign Guide.pdf`  
**Primary-source pages inspected:** printed pp. 27-28

> **Scope:** This sub-phase closes the only Phase 1C item that had previously been blocked by an unavailable primary PDF: Provocateur -> Noble + Charlatan.

---

# 1. Sourcebook verdict

Legacy Era Campaign Guide p. 27 presents:

```text
NEW NOBLE TALENTS
PROVOCATEUR TALENT TREE
```

The tree introduction explicitly states that the talents in this tree may be taken by the **Charlatan prestige class**.

Therefore the canonical access relationship is:

```text
Noble -> Provocateur
Charlatan -> Provocateur
```

This confirms the Phase 1B Fandom/class-map relationship from primary source.

**Disposition:** `ACCESS_ERROR_CONFIRMED` for Charlatan.

---

# 2. Canonical Provocateur membership

Across printed pp. 27-28, the published Provocateur Talent Tree contains six talents:

1. Cast Suspicion
2. Distress to Discord
3. Friend or Foe
4. Seize the Moment
5. Stolen Advantage
6. True Betrayal

Current repository tree:

```text
Provocateur
id: da34105c875650ae
talents:
- Friend or Foe
- Cast Suspicion
- Distress to Discord
- True Betrayal
- Stolen Advantage
- Seize the Moment
```

The repository contains all six canonical published talent identities in the same tree.

Ordering differs, but membership is complete.

**Disposition:** `TREE_MEMBERSHIP_CORRECT`

---

# 3. Current class-access state

## Noble

Current Noble class document already claims Provocateur.

**Status:** correct.

## Charlatan

Current Charlatan class document claims:

- Disgrace
- Trickery

but omits Provocateur.

The existing `data/talent_tree_class_map.json` already lists:

```text
Provocateur -> Charlatan, Noble
```

Primary source confirms that map.

**Disposition:** `ACCESS_ERROR_CONFIRMED`

---

# 4. Same-name talent caution remains valid

The Provocateur tree contains a published `Seize the Moment` talent.

The repository also contains a separate `Seize the Moment` in the Outlaw tree.

Phase 1A already protected this pair from name-based deduplication.

Legacy primary source confirms the Provocateur identity is legitimate and belongs in this tree.

**Disposition:** `SAME_NAME_VARIANT_CONFIRMED`

Do not merge it with the Outlaw talent.

---

# 5. Source-confirmed future correction packet

The only structural correction required for this tree is:

```text
Charlatan -> Provocateur
```

No new Provocateur tree document is needed.

No Provocateur talent document is missing.

No current Provocateur talent needs to be moved out of the tree based on this structural pass.

---

# 6. What this sub-phase does NOT yet certify

Still pending for the six Provocateur talents:

- description fidelity
- exact prerequisites
- action/trigger/target/duration/usage extraction
- `abilityMeta` correctness
- runtime owner
- automation ceiling
- progression tests

This sub-phase certifies tree identity, membership, and class access only.

---

# 7. Phase 1C-LEGACY stop gate

- [x] Render and visually inspect the Legacy Era Provocateur pages.
- [x] Confirm Noble ownership/access.
- [x] Confirm Charlatan access.
- [x] Confirm canonical six-talent membership.
- [x] Compare canonical membership to repository membership.
- [x] Confirm no Provocateur talent content is structurally missing.
- [x] Preserve the distinct Provocateur `Seize the Moment` identity.
- [x] Make no production/data changes.
- [x] Publish findings on the existing Phase 1 branch.

# Verdict

The final Phase 1C blocker is resolved:

> **Provocateur is a Noble talent tree whose talents are explicitly available to Charlatans.**

The repository's Provocateur tree membership is complete, but the Charlatan class document is missing the canonical access edge.
