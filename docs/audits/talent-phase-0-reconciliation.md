# Talent Phase 0 - Reconciliation of Existing Work

**Date:** 2026-09-26  
**Repository:** `docflowGM/foundryvtt-swse`  
**Baseline branch:** `main`  
**Baseline HEAD:** `4a2d095d96774c3cd49ab68b6c43e8e9a3db0cde`

## Purpose

This phase does **not** certify or change any talent against SWSE RAW.

Its job is to separate:

1. work that is genuinely complete and can be trusted as infrastructure;
2. work that made the repository internally consistent but was not checked against primary sourcebooks;
3. static evidence that is useful for triage but does not prove runtime behavior;
4. sourcebook-verification work that has not yet been performed.

This distinction is required before the new talent sourcebook audit begins.

---

# 1. Current pack baseline

The current shipped talent pack contains **1,024 talent records**.

Repository evidence:

- `docs/audits/v2-damage-modifier-authority-audit-correction-1.md` records `talents.db (1024 records)`.
- The current Action Authority audit finds **48 talent `ATTACK_OPTION` records** among 136 total attack-option records (88 feats + 48 talents).

These numbers describe current repository content only. They do **not** prove:

- that all 1,024 records are canonical SWSE talents;
- that every canonical talent is present;
- that source labels are correct;
- that tree membership is correct;
- that prerequisites/descriptions are correct;
- that the 48 attack-option rules accurately represent RAW.

---

# 2. Work completed during the last two days

## 2.1 Talent/progression UI focus repair - COMPLETE infrastructure

Commit:

`095618fa0309919a384e6480994372ff1f124fb3`

The TalentStep focus paths were repaired so list-card focus, tree focus, graph focus, keyboard focus, and blocked-duplicate focus all repaint the details region correctly.

This is a **presentation/lifecycle certification**, not a talent-content certification.

What it proves:

- TalentStep focus can reliably refresh the correct UI region.
- Duplicate click/render paths were removed.
- The details panel can resolve the currently focused talent/tree instead of remaining stale.

What it does **not** prove:

- that the displayed talent text is RAW-correct;
- that the talent belongs to the displayed tree;
- that its prerequisites or mechanics are correct.

**Phase 0 classification:** `CERTIFIED_INFRASTRUCTURE`

---

## 2.2 Derived/panel cache coherency - COMPLETE infrastructure

Commits:

- `dca3984978b9495709cd1fae1650ed6e46ae6c38`
- merged/followed by `4a2d095d96774c3cd49ab68b6c43e8e9a3db0cde`

The V2 panel cache and async-derived application lifecycle were repaired so persisted actor revision is no longer treated as proof that current runtime-derived state is unchanged.

The important architectural result is the shared runtime-only derived generation stamp.

**Phase 0 classification:** `CERTIFIED_INFRASTRUCTURE`

---

## 2.3 TalentStep Block/Deflect cache - COMPLETE infrastructure

Recorded in:

`docs/audits/v2-runtime-cache-coherency-audit.md`

Confirmed defect:

- `TalentStep._treeTalentCache` depended only on tree identity.
- Its result also depended on the live `blockDeflectTalents` house-rule mode.

Fix:

- the house-rule mode is now included in the cache identity.

Fail-before/pass-after coverage exists in:

`tests/talent-step-block-deflect-cache-coherency.test.mjs`

**Phase 0 classification:** `CERTIFIED_INFRASTRUCTURE`

This proves cache coherence for this specific presentation rule. It does not prove canonical Block/Deflect sourcebook membership.

---

## 2.4 AbilityEngine acquisition-cache coherency - COMPLETE infrastructure

Recorded in:

`docs/audits/v2-runtime-cache-coherency-audit.md`

Confirmed defect:

- acquisition legality could be cached against stale derived ability scores.

Fix:

- `AbilityEngine._actorCacheSignature()` now observes the shared derived generation.

Fail-before/pass-after coverage exists.

**Phase 0 classification:** `CERTIFIED_INFRASTRUCTURE`

This improves confidence that a **correctly authored prerequisite** can be evaluated without stale derived-state answers.

It does **not** prove the prerequisite authored on any particular talent is the correct SWSE prerequisite.

---

## 2.5 CandidatePoolBuilder eligibility-cache coherency - COMPLETE infrastructure

Recorded in:

`docs/audits/v2-runtime-cache-coherency-audit.md`

Confirmed defect:

- CandidatePoolBuilder could preserve an old filtered talent/feat candidate list even after AbilityEngine's answer became correct.

Fix:

- the pool cache now observes the same derived generation authority.

**Phase 0 classification:** `CERTIFIED_INFRASTRUCTURE`

Again, this certifies the cache contract, not the content being filtered.

---

## 2.6 SnapshotBuilder ability-score authority - COMPLETE infrastructure

Recorded in:

`docs/audits/v2-runtime-cache-coherency-audit.md`

Confirmed defect:

- the suggestion snapshot attempted to read `.total/.value/.score` from the wrong attribute shape and could collapse modern actor ability scores to zero.

Fix:

- SnapshotBuilder delegates to `SchemaAdapters.getAbilityScore()`.

**Phase 0 classification:** `CERTIFIED_INFRASTRUCTURE`

This improves mentor/suggestion correctness but does not certify individual talent recommendations or talent RAW.

---

## 2.7 Action Authority reconciliation for talent attack options - STRUCTURALLY COMPLETE, NOT RAW COMPLETE

Relevant work includes the Phase 3 Action Authority reconciliation and architecture.

Current verified dataset:

- 136 total `ATTACK_OPTION` records;
- 88 feat records;
- **48 talent records**.

The Action Authority work proves:

- strict discovery of the 48 talent records;
- normalization without silently dropping known gate fields;
- entitlement/discovery behavior;
- state-level reconciliation against the current legacy CombatOptionResolver behavior;
- presentation-shape compatibility.

However, the architecture explicitly states that the new Action Authority groundwork was **not production-wired into the attack dialog** during that phase.

More importantly for the new talent audit:

> Reconciliation against existing CombatOptionResolver behavior proves parity with the repository's current behavior, not parity with SWSE RAW.

If a talent's existing `ATTACK_OPTION` metadata is wrong, both old and new systems can agree on the same wrong rule.

**Phase 0 classification:** `CERTIFIED_INFRASTRUCTURE_WITH_UNCERTIFIED_CONTENT`

---

# 3. Older talent cleanup work: useful, but NOT primary-source certification

This is the most important Phase 0 finding.

The repository contains a large amount of previous talent cleanup work (T7 through later T-series phases, tree reconciliation, action-card conversion, modifier cleanup, tags, and runtime routing).

That work is valuable evidence of:

- previous defects;
- previous runtime ownership decisions;
- duplicate cleanup;
- removed bogus passive modifiers;
- manually surfaced mechanics;
- talent-tree registry consistency;
- known subsystem gaps.

It must **not** be treated as proof that the resulting talent data matches the books.

## 3.1 T7 explicitly treated repository descriptions as canonical

`docs/talent-jedi-tree-cleanup-phase-t7.json` states:

> "Descriptions in packs/talents.db are treated as canonical book text."

That is the opposite direction from the new audit.

The new audit standard is:

`sourcebook -> canonical talent -> repository comparison`

not:

`repository description -> assumed canon -> runtime cleanup`

T7 also records `foundryRuntimeTested: false` for that cleanup stage.

Therefore a T7 result can be useful historical evidence, but it cannot be inherited as sourcebook certification.

**Phase 0 classification:** `REPOSITORY_DERIVED_CLEANUP`

---

## 3.2 T11 and later cleanup phases are implementation evidence, not source authority

Example:

`docs/talent-scout-scoundrel-soldier-cleanup-phase-t11.json`

records:

- 37 trees reviewed;
- 222 talent documents reviewed;
- 207 talent documents changed;
- 209 modifier rows removed;
- 63 embedded ActiveEffect rows removed;
- contextual/runtime ownership decisions for many talents.

This is substantial work and should not be discarded.

However, the document is primarily a runtime/metadata cleanup record. It does not establish a sourcebook/page citation contract for every reviewed talent.

The same applies to later targeted passes such as vehicle/starship talent cleanup:

`docs/talent-vehicle-starship-prestige-cleanup-phase-t16.json`

which records 40 reviewed/changed talents, combat-action cards, contextual rules, and runtime-owner decisions.

These are excellent clues for the new source audit, but every conclusion must be re-tested against the actual sourcebook.

**Phase 0 classification:** `IMPLEMENTATION_HISTORY_UNCERTIFIED_RAW`

---

# 4. Talent-tree membership cleanup - internally useful, NOT RAW-certified

`docs/audits/talent-tree-membership-completion-2026-08-06.json` explicitly declares its authority as:

- primary: `data/fixes/talents.fixed.json`;
- secondary: `packs/talents.db`;
- tree existence: repository mapping/description files;

and states:

> "No SWSE sourcebook PDF is present in this environment; every resolution below is derived from repository authority only."

Therefore its resolutions are evidence that the repository was reconciled against itself.

Examples such as:

- retiring an obsolete Force Meld duplicate;
- distinguishing same-name Seize the Moment records;
- reconciling Acrobatic Recovery/Battle Meditation tree-side claims;
- restoring missing tree documents;

remain useful.

But none of these resolutions receives automatic `SOURCE_CERTIFIED` status in the new campaign.

Likewise, current `phase-tXX-reviewed` tags on `packs/talent_trees.db` mean **reviewed by previous repository cleanup**, not **verified against SWSE primary source**.

**Phase 0 classification:** `REPOSITORY_CONSISTENCY_ONLY`

---

# 5. Static implementation evidence - useful for triage, never a verdict

The repository contains multiple static/reporting tools and audits that classify whether data has:

- modifiers;
- rules;
- action cards;
- ActiveEffects;
- runtime-shaped metadata;
- owner-like signals.

These are useful for locating likely implementation paths.

They do not prove:

- trigger correctness;
- prerequisite correctness;
- target correctness;
- action timing;
- usage limits;
- duration;
- stacking;
- predicate correctness;
- actual runtime reachability;
- source fidelity.

This is especially important because the feat source audit has already proven that executable metadata can confidently encode the wrong mechanic.

**Phase 0 classification:** `STATIC_TRIAGE_ONLY`

---

# 6. Known infrastructure gaps that remain after the last two days

These are real remaining items, but they are **not blockers to beginning sourcebook verification**.

## 6.1 AbilityEngine house-rule invalidation gap - DEFERRED

The runtime-cache audit explicitly leaves a systematic review of all house-rule settings consumed by `PrerequisiteChecker` unfinished.

A hand-maintained subset clears the acquisition cache. The full dependency set has not been certified.

**Status:** `KNOWN_DEFERRED_INFRASTRUCTURE`

## 6.2 Combat-action-economy cache - UNCERTIFIED / currently unwired

The runtime-cache audit records the combat-action context cache as having no confirmed production consumers and leaves it uncertified.

**Status:** `KNOWN_DEFERRED_INFRASTRUCTURE`

## 6.3 Action Authority production cutover - NOT COMPLETE

The Action Authority reconciliation work is strong, but production wiring into `roll-config.js` was explicitly not completed in that stage.

**Status:** `KNOWN_DEFERRED_INFRASTRUCTURE`

## 6.4 Roll-transform migration - NOT COMPLETE

The V2 remaining-work audit records that many actual reroll/transform mechanics still use legacy/bespoke paths or are stubs.

This includes talent-relevant mechanics.

**Status:** `KNOWN_DEFERRED_INFRASTRUCTURE`

None of these should be "fixed around" by inventing per-talent mini-engines during the source audit.

---

# 7. Feat sourcebook work completed during this period

The past two days also produced extensive feat sourcebook verification on an audit branch.

That work is relevant because it established the methodology we should now apply to talents:

- source counts can match while identity sets are badly wrong;
- repository source labels cannot be trusted;
- descriptions and runtime metadata must be audited independently;
- name-based taxonomy is unsafe;
- one record can contain multi-source provenance;
- missing content and invalid content must be represented explicitly.

However, **feat certification does not imply talent certification**.

The talent campaign begins from a much weaker source-authority position.

---

# 8. Branch-state finding

A branch named:

`audit/talent-sourcebook-metadata-verification`

currently exists.

Verified comparison against `main`:

- 18 commits ahead;
- 0 behind;
- the only changed file in the branch comparison is:
  - `docs/audits/feat-sourcebook-metadata-verification.md`

Therefore the branch name is misleading: it currently contains the feat audit history, not a talent sourcebook audit.

**Decision for Phase 1:** do not build the new talent source audit on top of this branch without deliberate cleanup/rebranching.

**Phase 0 classification:** `STALE_OR_MISNAMED_AUDIT_BRANCH`

---

# 9. What has NOT been completed

The following work is still effectively unperformed at systematic scale.

## 9.1 Canonical talent identity census

Not completed.

We do not yet have a book-first list proving which of the current 1,024 records are:

- canonical talents;
- duplicates;
- variants;
- converted material;
- homebrew/noncanonical;
- or missing counterparts to canonical published talents.

## 9.2 Canonical sourcebook/page verification

Not completed for the full talent corpus.

Current `source` / `sourcebook` values are assertions to test.

## 9.3 Canonical talent-tree membership

Not completed from primary sources.

Repository membership has been heavily reconciled, but the previous membership audit explicitly lacked sourcebook PDFs.

## 9.4 Canonical class/prestige/tradition access to talent trees

Not completed systematically against primary sources.

## 9.5 Prerequisite fidelity

Not completed talent-by-talent against the books.

The progression engine has significant prerequisite infrastructure, but infrastructure correctness is separate from content correctness.

## 9.6 Description fidelity

Not completed systematically.

Old cleanup phases often assumed current talent descriptions represented canonical book text.

The new campaign must reverse that assumption.

## 9.7 Clause-level mechanical verification

Not completed systematically.

For each talent we still need source-authoritative verification of:

- trigger;
- action;
- target;
- roll/check;
- modifier/effect;
- duration;
- frequency;
- resource cost;
- stacking;
- exclusions;
- special interactions.

## 9.8 Mechanical-owner certification

Not completed across all 1,024.

Previous cleanup phases contain many useful owner recommendations, but there is no canonical census assigning every talent to its correct subsystem.

## 9.9 Automation-ceiling certification

Not completed.

We do not yet know, source-authoritatively, which talents should end as:

- FULL automation;
- ASSISTED;
- MANUAL_BY_RULE.

## 9.10 End-to-end source -> runtime certification

Largely untouched.

A talent is not end-to-end certified merely because it has a modifier, action card, rule record, or previous `reviewed` tag.

---

# 10. Phase 0 authority map

| Area | Current confidence | Phase 1 treatment |
|---|---|---|
| V2 derived/cache lifecycle | High | Reuse |
| TalentStep focus/details lifecycle | High | Reuse |
| TalentStep Block/Deflect cache coherence | High | Reuse |
| AbilityEngine derived-state cache coherence | High | Reuse |
| CandidatePoolBuilder derived-state coherence | High | Reuse |
| SnapshotBuilder canonical ability-score read | High | Reuse |
| 48 talent ATTACK_OPTION discovery/normalization | High structurally | Reuse structure; re-audit RAW |
| Existing talent descriptions | Unknown RAW confidence | Verify |
| Existing sourcebook/page values | Unknown RAW confidence | Verify |
| Existing tree membership | Internally reconciled, RAW uncertified | Verify |
| Existing class/tree access | Repository-derived | Verify |
| Existing prerequisites | Runtime-capable, content uncertified | Verify |
| Existing abilityMeta | Mixed/uncertified | Verify |
| Existing action cards | Useful presentation evidence | Verify RAW + automation ceiling |
| T7-T31 reviewed markers | Historical/repository review | Never treat as source certification |
| 1,024-record pack parity with published talents | Unknown | Build book-first census |

---

# 11. Phase 0 conclusion

The talent system is **not starting from zero**.

Its runtime/progression infrastructure is substantially more mature than the raw source confidence of the talent corpus.

The correct mental model is:

```text
runtime/progression plumbing: relatively mature
repository cleanup/history: extensive
primary-source talent certification: largely absent
```

Therefore the next phase must **not** redo old UI/runtime cleanup and must **not** trust old `reviewed` flags as SWSE authority.

The next phase should establish a clean talent-audit workspace from current `main`, inventory the live 1,024-record pack, and then begin the first sourcebook-authoritative canonical talent set with the Saga Edition Core Rulebook.

---

# Phase 0 stop gate

Phase 0 is complete when all of the following are accepted:

- [x] current `main` baseline identified;
- [x] recent talent-adjacent runtime/UI work classified;
- [x] old talent cleanup distinguished from RAW certification;
- [x] talent-tree membership audit authority limitation explicitly recorded;
- [x] Action Authority talent coverage correctly scoped;
- [x] known deferred infrastructure recorded without expanding scope;
- [x] current misnamed talent-audit branch identified;
- [x] untouched primary-source work enumerated;
- [x] no talent mechanics/content changed during reconciliation.

**No talent data or runtime behavior is modified by Phase 0.**
