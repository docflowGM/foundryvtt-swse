# Phase 3D — Production Certification

**PHASE 3D-4 (production application) COMPLETE — certification pending merged-`main` re-verification.**
Production commit: `6bf87828241ff81307ebaca370e70c1935f883a1` (`data: apply certified Phase 3D talent cleanup`), remote branch
`audit/talent-phase-3d-production-application` at that SHA when this document was written (owner-confirmed on GitHub; the PR base is
`main` @ `5aedbd65fe0f15949478ba639d927dd9daf679d7`).
Phase 3D is fully closed only after the merged-`main` gates at the end of this document pass against the actual merge SHA.

## 1. Scope and starting state

Phase 3C certified 1,180 canonical identities and deliberately protected **92 production records** it could not prove: 90 production-only deferred
records and 2 review-only extras (Notorious `a7d8c4da96eacad4`, Teräs Käsi Basics `222327492c484b4a`). Phase 3D owns exactly those 92 and does **not**
reopen the 1,180. Starting state: 1,272 talent records, 196 talent trees, 37 class records.

## 2. Disposition census and adjudication (3D-1, 3D-2)

Every one of the 92 was examined against the committed sourcebook TXT (PDF where the TXT was ambiguous), the canonical corpus and the repository's
references; existing production presence was never treated as proof of canon. Final dispositions (`REVIEW_REQUIRED` = 0):

| Disposition | Count | Meaning |
|---|---|---|
| `MERGE_DUPLICATE` | 19 | name/paraphrase variant of a canonical talent in the same tree; survivor id wins |
| `REMOVE_CONTAMINATION` | 16 | fragments, conflations (incl. the three-talent Notorious blob), stubs, non-talent rows, fan content |
| `KEEP_CANONICAL_ADDITIONAL_PUBLICATION` | 6 | real published talents the Phase 3B ownership model never captured: Move Massive Object, Telekinetic Stability, Dark Preservation, Trigger Work, Hard Target, Stolen Form |
| `CORRECT_IDENTITY` | 1 | Ranged Disarm (Core p.217): Warrior → Gunslinger |
| `MOVE_HOMEBREW_PACK` | 50 | self-labelled homebrew or unsourced; preserved, isolated, never presented as official |
| **Total** | **92** | |

Evidence highlights: the registry status `SOURCE_VERIFIED_SPECIAL_TREE` was *not* accepted as evidence (of its 10 records: 3 real, 3 malformed, 4 homebrew);
the "missing tree" flag on Embrace Dark Side / Force Meld was a false alarm (stale `system.treeId` slugs, ~80 records incl. canonical ones — noted, untouched);
Stolen Form is official (Threats of the Galaxy, printed p.81, Sith tree; PDF-verified by the project owner, not inspected by the audit tooling).
Artifacts: `data/audits/talent-phase-3d-production-extras-census.json`, `…-reference-impact.json`, `…-dispositions.json`; `docs/audits/talent-phase-3d-identity-adjudication.md`.

### Owner rulings
1. **Homebrew (50):** not left in `packs/talents.db`, not deleted; moved, `_id`s and all automation metadata preserved, into separate noncanonical compendia.
2. **Stolen Form:** `KEEP_CANONICAL_ADDITIONAL_PUBLICATION`, not quarantined.
3. **Refresh the 34 actor snapshots** when repointing (repointing the id alone would leave contaminated text on the actor).
4. **Five canonical structured-prerequisite repoints** and the **Inspire Fear I** archetype repoint (see §4).

## 3. What the production application did (3D-4)

**Canonical and homebrew packs.** Canonical talents 1,272 → **1,187**; trees 196 → **177**. Homebrew: `packs/talents-homebrew.db` (**50** talents, byte-identical to their
originals) and `packs/talent-trees-homebrew.db` (**19** exclusively-homebrew tree documents, same `_id`s). **1,237** preserved talent records in total
(`1,272 − 19 − 16 − 50 = 1,187`; `+ 50 = 1,237`). The 19 homebrew-only trees leave the canonical tree pack, both registries and (vacuously) class access;
the 15 homebrew talents whose conceptual parent is one of 10 canonical trees keep their tree context as provenance, are removed from those trees' `talentIds`/`talentNames`,
and create no duplicate tree documents. 38 canonical trees lose members; Gunslinger gains Ranged Disarm. Both packs are registered in `system.json` as noncanonical Item compendia.

**Embedded actor items (34/34).** Repointed and snapshot-refreshed from the surviving record: 32 contaminated Notorious items (20 → Infamy Notorious `09744041cdcc9e22`, 12 → Bounty Hunter
Notorious `c67cbd59abd1cc53`, chosen by each actor's class, never by name alone) and 2 Teräs Käsi Basics items → `67bddb17ae2770f3` (14 in `heroic.db`, 3 in `nonheroic.db`, 17 in `npc.db`).
Refreshed fields: name, benefit, description (shape-preserving), summary, prerequisites, source, page, tree identity, category, class, `flags.swse.id`, `flags.core.sourceId`.
Preserved: embedded `_id`, sort, ownership, effects, tags and every unrelated flag. No unrelated item changed; no contaminated Notorious text and no merged Teräs Käsi snapshot survives.

**Registry and derived data.** `data/generated|fixes/talent-trees.registry.json` regenerated (185 entries, canonical-only). Legacy registry aliases (`officer`, `ace-pilot`) that named merged variants
were rewritten by exact leaving name (merge → survivor name). `data/generated|fixes/talents.fixed.json` (partial derived mirrors, no consumer found) dropped 23 + 23 entries.

**Class records:** byte-identical to the Phase 3C state (`packs/classes.db` not written; no class referenced any homebrew tree by id, name, slug or uuid).

**Exact write boundary (13 files):** `packs/talents.db`, `packs/talent_trees.db`, `packs/heroic.db`, `packs/nonheroic.db`, `packs/npc.db`, `packs/talents-homebrew.db` (new),
`packs/talent-trees-homebrew.db` (new), `data/generated/talent-trees.registry.json`, `data/fixes/talent-trees.registry.json`, `data/generated/talents.fixed.json`,
`data/fixes/talents.fixed.json`, `data/class-archetypes.json`, `system.json` (124 insertions, 2,544 deletions).

## 4. Migration defects found and fixed during 3D-4 (before certification)

The certified dry run was incomplete; the widened residual-reference gate found what it could not see. These were closed **inside the migration contract** (manifest → dry-run report → re-apply), not hand-edited:

1. **Class archetypes** (`data/class-archetypes.json`, runtime data): Underworld Kingpin and Gang Leader listed the contaminated bare-name "Inspire Fear" record (`585227ba15d24a37`, actually Terrify text).
   Repointed, 2 occurrences, to **Inspire Fear I** (`cf4b1e5b126a2a7e`) — the legal, prerequisite-free base of the chain (Terrify requires Frighten and Inspire Fear II, which would make a one-talent archetype illegal).
2. **Legacy registry aliases** named merged variants by name (see §3).
3. **Legacy tool entries:** 9 entries keyed on removed ids retired from `tools/fix-compendium-issues.js` and `tools/verify-compendium-fixes.js`.
4. **Pinned tests** made Phase 3D state-aware (`talent-membership-and-pack-completion`, `talent-tree-membership-review-extras`, census/review-extras suites) and the Phase 3C tooling gained a `POST_3D_STATE`
   (`apply-talent-phase-3c.mjs` state detection; `check-talent-phase-3c-ci.mjs` dispatch; new `audit-talent-homebrew-pack.mjs`).
5. **Five dangling structured prerequisites** (owner-authorized, `PHASE_3C_CANONICAL_RECORD_TOUCHED`). Only the listed `prerequisitesStructured.conditions[i].id` leaf changed on each; text, tags, abilityMeta and every other field are byte-identical:

| Canonical record | Leaf | Was (removed duplicate's runtime id) | Now (tree-specific surviving identity) |
|---|---|---|---|
| Fearsome (`11e8f858af268e8c`) | conditions[0].id | `swse.talent.notorious` | `c67cbd59abd1cc53` Bounty Hunter ∣ Notorious |
| Ruthless Negotiator (`8298e12805291c78`) | conditions[0].id | `swse.talent.notorious` | `c67cbd59abd1cc53` Bounty Hunter ∣ Notorious |
| Shared Notoriety (`9491f34aad83dfb1`) | conditions[0].id | `swse.talent.notorious` | `09744041cdcc9e22` Infamy ∣ Notorious |
| Unsavory Reputation (`b0ecc747a76deb72`) | conditions[1].id | `swse.talent.notorious` | `09744041cdcc9e22` Infamy ∣ Notorious |
| Weakening Strike (`9c1e0b0566cb45c2`) | conditions[0].id | `swse.talent.dastardly_attack` | `9e4345faaaa94dd8` Misfortune ∣ Dastardly Strike (printed prerequisite text "Dastardly Strike" retained) |

The two printed Notorious talents are distinct canonical identities and were never collapsed. The residual-reference gate now also proves that no canonical structured prerequisite identity points at a retired Phase 3D identity (107 retired identities recorded in the dry-run report).

## 5. Canonical-record accounting

- Every talent outside the inherited 92 and the five allow-listed records is **byte-identical** to the Phase 3C state (0 unexpected changes). The 1,180 Phase 3C canonical records were not reopened.
- Records of the inherited 92 that stay in the canonical pack: the 6 KEEPs (unchanged) and Ranged Disarm (`system.treeId` only).
- `PHASE_3C_CANONICAL_RECORD_TOUCHED`: exactly the five records above, nothing else. Merge survivors (`c67cbd59…`, `09744041…`, `9e4345fa…` and the rest) are unchanged.

## 6. Commits

| Commit | Role |
|---|---|
| `2627f3089` … `0a518938e` | 3D-1/3D-2: census, reference impact, adjudication (final, `REVIEW_REQUIRED = 0`) |
| `f2ad6316b`, `316aa16e4`, `25118dfb8` | 3D-3: dry-run applicator, report, census-reproducibility fixes |
| `a6dd4a92e` | 3D-4 tooling: `--apply` / `--verify` / `--verify --exact`, snapshot refresh, homebrew packs, residual gate |
| `faf261a33` | 3D-4 tooling: dry-run gaps closed (archetypes, legacy aliases, tools/tests triage) |
| `a207924bb` | 3D-4 tooling: five allow-listed prerequisite repoints, dangling-identity gate, "already applied" wording |
| **`6bf878282`** | **3D-4 production application (13 files)** |
| *(this document)* | 3D-5 documentation-only certification |

## 7. Verification results (on the committed production state)

| Gate | Result |
|---|---|
| `apply-talent-phase-3d.mjs --verify --exact` | PASS — 43 checks, every certified blob exact; run twice, file hashes identical, nothing written |
| Second `--apply` | REFUSED cleanly: "already applied — the packs are the Phase 3D certified post-state"; nothing written |
| Partial / drifted pre-state | refused, nothing written (scratch-copy tests) |
| Residual-reference gate (repository-wide) | 0 runtime references to any merged/removed id; moved ids only in the homebrew packs; 0 stale tool/test references |
| Canonical membership audit | PASS — 1,187 talents / 177 trees, 0 duplicate names, 0 tolerated review-extra twins |
| Homebrew-pack integrity audit | PASS — 50 talents, 19 trees, isolated from the canonical pack, registries and class access |
| Registry freshness | PASS — both files equal a fresh generation |
| Post-state CI gate (`check-talent-phase-3c-ci.mjs`, `POST_3D_STATE`) | PASS — 4 checks |
| Focused prerequisite / hydration / registry tests | PASS |
| Full suite (`tools/run-rolling-tests.mjs`) | **272 passed / 0 failed** (excludes the same 5 documented pre-existing failures) — same result before and after the production commit |
| `system.json`, `validate-partials`, `validate-data` | valid / passed |

## 8. Known non-blocking follow-ups (not defects of this migration)

1. **Structured prerequisite runtime identity.** The five prerequisite references are now referentially clean against canonical compendium identities, but a production `_id` is not yet a universally effective actor-side stable identity:
   the resolver matches an actor item's id, `_id` or `flags.swse.id` (then uuid against `flags.core.sourceId`, then name). Bounty Hunter Notorious and Dastardly Strike carry no `flags.swse.id`. This is harmless today because structured
   prerequisites are evaluated only when a talent has no prerequisite text and all five have text (canonical prerequisite text is runtime authority). Runtime prerequisite identity should eventually converge on stable `flags.swse.id` or compendium UUID authority — a V2 identity-architecture decision, deliberately not folded into Phase 3D.
2. **Canonical corpus additions** (`CANONICAL_CORPUS_ADDITION`): the six KEEP records and the Ranged Disarm correction still need Phase 2 → canonical → manifest entries (incl. printed pages); Core pp.216–217 (Gunslinger) may hold further talents the ownership model missed.
3. **Stale `system.treeId` slugs** on ~80 talent records (incl. canonical ones); tree membership, not `treeId`, is authoritative. Untouched.
4. **Homebrew enablement:** the homebrew compendia are preserved but not wired into any builder; an explicit opt-in mechanism, if ever wanted, is separate work.
5. **Archetype target** `Inspire Fear I` was a reviewed judgement call (owner-confirmed).

## 9. Closure gate (still to run)

Phase 3D is fully closed only after the PR is merged and, on the actual merge SHA of `main`: `--verify --exact`, the residual-reference gate, membership audit, homebrew audit, registry freshness, post-state CI gate and the full suite all pass.
The result is recorded in the PR, not here, so this document stays a documentation-only checkpoint.
