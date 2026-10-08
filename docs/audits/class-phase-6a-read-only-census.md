# SWSE Class Canonicalization — Phase 6A Read-Only Census

**Date:** 2026-10-08  
**Base:** `main` at `e0717afffe7d20ec2a012f8d1900d6757cda81de`  
**Scope:** Structural census plus primary-source certification of the five Core heroic base classes. Prestige-class source verification remains open.  
**Machine artifact:** `data/audits/class-phase-6a-structural-census.json`

## Architecture and baseline

The existing class authority is `packs/classes.db` → `scripts/data/class-normalizer.js` → `scripts/data/classes-db.js` / `scripts/engine/registries/classes-registry.js`. Retain this architecture. Do not create a second operational class SSOT.

The repository contains **37 unique class records** (5 base, 32 prestige), **32/32 prestige prerequisite entries**, **178/178 resolvable talent-tree source-ID references**, five class bonus-feat list bindings, and **37 blank descriptions**. These are static findings, not Foundry runtime certification.

## Primary-source Core verification

Verified against the **Saga Edition Core Rulebook** class tables (printed pp. 38, 43, 45, 48, 51):

| Class | Finding | Status |
|---|---|---|
| Jedi | Repo adds Jump and Mechanics to class skills; printed list excludes both | **DATA_DEFECT confirmed** |
| Noble | Actual BAB table follows 3/4 progression, but `babProgression=slow` | **METADATA_DEFECT confirmed** |
| Scoundrel | `trainedSkills=5`; printed 4 + INT | **DATA_DEFECT confirmed** |
| Scout | `trainedSkills=4`; printed 5 + INT | **DATA_DEFECT confirmed** |
| Soldier | Printed core class skills and trained count match current pack | No discrepancy found in those fields |

The other base-class printed class-skill lists match the pack. All five have 20 sequential progression levels with the expected alternating talent/bonus-feat cadence. This is not yet certification of every feat eligibility list, talent expansion, or runtime grant.

## Additional structural issues

1. **BAB metadata vs actual progression:** 11 class records have `babProgression` labels inconsistent with their stored per-level BAB tables (details in machine census). For several prestige classes the table is full BAB despite metadata `medium`. These remain **SOURCE_REVIEW_REQUIRED** until each printed prestige table is checked. Do not blindly replace the tables or metadata.
2. **Improviser Contraband:** Rebellion Era Campaign Guide printed p. 41 has one Contraband grant at even levels 2/4/6/8/10. Current pack splits credit-formatted names into separate fragments (e.g. `Contraband (2` and `000 credits)`) and also introduces odd-level fragments. **DATA_DEFECT confirmed**, repair through canonical production source after inspecting the generation path.
3. **Infiltrator Unarmed Stun:** malformed labels `Unarmed Stun (+1d_)` etc. **DATA_QUALITY_DEFECT**, check printed source for exact dice.
4. **Assassin and Infiltrator:** `talent_trees` mixes names (`GenoHaradan`, `Bothan SpyNet`) with IDs, while parallel `talentTreeSourceIds` resolves both correctly. This is a legacy-projection inconsistency, not missing talent trees.
5. **Blank descriptions:** 37/37; add certified short player summaries later without substituting generated lore for published mechanical rules.
6. **Parallel class snapshots:** `scripts/engine/progression/data/progression-data.js` has hard-coded base-class fields that disagree with the printed rules and/or class pack. In particular it repeats the Jedi Jump/Mechanics error, retains Scoundrel=5 and Scout=4, and contains other stale skill/feat data. Identify actual consumer precedence before changing this compatibility map.
7. **BAB vocabulary divergence:** Some consumers interpret `slow` as 1/2 BAB; others interpret it as 3/4. Do not relabel `slow` globally without auditing nonheroic and all fallback paths. The per-level class table should be the numeric authority.

## Recommended follow-up

- **6B:** Source-certify the 32 prestige classes book-by-book (printed BAB, hit die, defenses, feature cadence, prerequisites, special rules); preserve 5-level apex class limits.
- **6C:** Reconcile class-to-feat and class-to-talent-tree identities against the canonical corpora and verify all five bonus-feat lists.
- **6D:** Prepare a controlled production patch for confirmed class defects, regenerate any dependent outputs, and test CharGen, multiclassing, prestige prerequisites and level-up.
- **6E:** Live Foundry certification. No runtime claim is made by this read-only census.

## Guardrails

Do not modify `packs/classes.db` directly as an independent authority before tracing its generator. Do not rewrite historical source audits to agree with production. Do not merge this branch into the weapon-runtime PR stack. Preserve canonical-ID-first joins and source/page evidence for every correction.
