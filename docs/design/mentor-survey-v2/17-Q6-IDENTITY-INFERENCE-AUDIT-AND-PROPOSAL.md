# Q6 Identity Inference: audit, owner decisions and executable design

**Status (2026-11-16, after owner decisions):** method inference is implemented (`method-inference.js`); theme inference is not producible from canonical data; the legacy class-archetypes crosswalk is rejected. No new scorer exists or is proposed.

> **Correction to the first version of this audit.** `ArchetypeRegistry.get()` reads the **legacy** class-tied map (141 entries across 31 classes, loaded from `class-archetypes.json`, self-described Tier-2 stub backfill). `ArchetypeRegistry.getArchetype()` reads the **class-independent canonical SSOT** (297 records: 97 parents, 200 specializations; `data/archetypes.json`). `IdentityEngine #getArchetypeBias` calls the **legacy** `get()`, so a stored `actor.system.archetype` value cannot be treated as a canonical 297-registry identity. A search of `scripts/` found **no writer** of `actor.system.archetype`, and its readers disagree on its shape (a string id in the Identity Engine, an object with `name`/`id` in weapon-scoring, `asset-suggestions` and build-analysis). It is therefore not a certified declared identity and is not used.

## 1. Why the reflection says "unresolved" today

The shared Mentor's Reflection builds an **unresolved identity** reading (`readingClaims(false)` yields only `unresolved_reading_disagreement`) because no verified, provenance-backed join from an actor to one of the 297 canonical archetypes exists. It reports owned facts (talents, feats, trained skills) and declared goals, and never names an archetype it cannot prove.

## 2. Audit of what exists (read from the code)

| Component | What it computes | Inputs | 297-registry? | Provenance | Verdict for Q6 |
|---|---|---|---|---|---|
| `IdentityEngine #getArchetypeBias` / `#getSpecialistBias` | A bias layer looked up from `actor.system.archetype` and `actor.system.specialist` | a **stored id**, not an inference; no writer found in `scripts/`; readers disagree on its shape | **no**: `ArchetypeRegistry.get()` is the legacy 141-entry map | none | **Not usable** as a canonical identity |
| `IdentityEngine.computeObservedBehaviorBias` + `computeObservedBehaviorBiasProvenance` | Observed mechanical-bias keys from owned item rules, ability scores, trained skills; provenance now exact and fail-closed | finalized actor | no (125 bias keys) | **yes** (item ids, rule types, skill ids, snapshot) | The only evidence source with real provenance. Gives *methods and strengths*, not identities |
| `archetype-registry-integration.getPrimaryArchetypeForActor` | Scores class-resolved archetypes by **attribute distribution only** and returns a `matchScore` percentage | attribute scores | yes | none; its own comment normalizes with "D&D-like" ranges | **Reject**: ability-only, a D&D assumption, and a percentage |
| `ArchetypeAffinityEngine.calculateArchetypeAffinity` | Softmax affinity over `class-archetypes.json` (an older class-level dataset), persisted on the actor, with drift detection | `extractCharacterState(actor)` | **no** (separate dataset) | partial | A parallel archetype system; binding it to the 297 registry needs an explicit crosswalk decision |
| `ArchetypeShiftTracker`, `ArchetypeSuggestionIntegration`, `EvidenceCardFactory` | Shift tracking, suggestion weighting, evidence cards for suggestions | affinity snapshots | indirect | evidence cards exist for suggestions | Possible source for a *trend* claim (`past_to_present_trend`) once the affinity data model is bound to the registry |

**Finding:** there is no existing interface that returns a stable, provenance-backed 297-archetype candidate for an actor. The closest evidence source (`...Provenance`) speaks in mechanical-bias keys; the only archetype outputs are a stored declaration, an attribute-only score and a parallel dataset.

## 3. Canonical SSOT audit (what the 297 records can and cannot support)

- Each record carries `mechanics.{classes, abilities, skills, talentTrees, talents, feats, force, species, backgrounds, states, identitySignals}`, `metadata.tags` (the 190-tag ontology) and an `audit` block. **No record has a `mechanicalBias` field.** Only `narrative` is audited `certified`; `classes`, `abilities`, `skills`, `talentTrees`, `talents`, `feats`, `force`, `species`, `backgrounds` and `states` are audited `draft`.
- `identitySignals` holds only `organization`, `darkSide` and `narrativeOverlays` rules, not a key relationship.
- The 125 mechanical-bias keys are not ontology tags, and no certified relationship between them exists. Matching actor exact refs to the SSOT's `source|tree|name` strings would need a certified id join that does not exist (actor facts use item canonical ids or `name:` slugs).
- **Conclusion:** a theme claim tied to an archetype parent is not supportable from canonical data today. It is not produced. If several parents could match, or none, the inference is omitted (`pickUnambiguousTheme`). The unresolved identity reading stays.

## 4. Decisions applied (owner, 2026-11-16)

1. **Approved wording** (shared, in `reflection-q6.json` `assessment`, owner-approved text, slot- and provenance-validated):
   - method: "Your current training supports {method_phrase}. I wonder whether that reflects how you prefer to approach problems, or simply what you've prepared for."
   - theme: "Several parts of your training seem to point toward {theme_phrase}. I see a possible pattern there, but that doesn't necessarily define who you are." (imported, not displayed)
2. **Legacy crosswalk rejected:** no mapping of `class-archetypes.json` into the 297 SSOT, no aliases, no second identity authority.
3. **`past_to_present_trend` stays deferred:** it needs independently timestamped, provenance-backed historical snapshots from the event ledger; a legacy affinity value or a repeated interpretation is not history.

## 5. Executable method-inference design (implemented)

| Rule | Implementation |
|---|---|
| Ranking | the existing `computeObservedBehaviorBias` score (no new scorer); at most 2 claims, score descending then key |
| Authorization | the fail-closed `computeObservedBehaviorBiasProvenance` (always-active, specific, non-default, non-disabled; owned items and mapped trained skills) |
| Independence | at least 2 independent sources with STABLE identities (`item:<certified canonical id>`, `skill:<canonical skill key>`, never positional fact ids): owned talents/feats with a certified canonical id, or trained skills; repeated primitives on one item are one source; `Skill Focus (X)` and trained X are one source through one skill-key authority (`canonicalSkillKey`, nested names such as `Knowledge (Tactics)` included); class features, items known only by name, and any source without a matching fact in the frozen projection do not count |
| Grounding | each claim cites the exact fact ids (`groundedBy`) and a stable id `claim.method.<key>`; slots are frozen into the reading (and its id) |
| Wording | the approved question-form clause, never a statement of habit, frequency or motive; the phrase comes from the editorial ledger (`18-Q6-METHOD-KEY-LEDGER.md`, compact review in `19-Q6-METHOD-REVIEW-REPORT.md`): 77 of the 125 canonical keys are proposed as methods with a reviewed phrase, 48 are excluded (22 technique, 11 capability, 8 role, 4 affiliation, 3 unresolved; the owner accepted this as a conservative runtime boundary, not a verdict on the concepts) and can never produce a claim; the canonical identifier is never renamed (the canonical key `unarmeddMastery` is itself misspelled and is only spoken as "unarmed fighting techniques") |
| Gate | the clause and each phrase record go through the same approval gate; draft phrases keep the question out of players' hands |
| Corrections | NOT shows only displayed claims; the correction statement is filled with the same frozen slots; a rejection is feedback only (`mutatesMechanics/Goals/Eligibility` all false) |
| Later readings | a rejected claim is not shown again while its persisted stable source keys are unchanged (an unrelated new feat that renumbers positional fact ids does not reopen it); added, removed or changed sources may reopen it; preview corrections never suppress |
| Invalidation | the Q6 context revision now includes the provenance snapshot and the positive observed keys, so changed actor state invalidates the Q6 answer without replacing it |
| Fallback | no provenance, ability-only, thin or duplicate evidence: no method claim, and the unresolved identity reading is preserved |

## 6. Still needed

- ~~Owner review of the method-key ledger (`18-*`)~~: the 77 phrases were approved as wording on 2026-11-17 (phrase wording only) and the 48 exclusions accepted as a runtime boundary. The positive clause is approved; the method correction was replaced by a source-neutral draft line ("I recognize that training, but I don’t think it necessarily describes how I prefer to approach problems."), with each claim identified by an "About: <phrase>" detail line.
- A certified source for theme or archetype claims (a reviewed relationship between the 125 keys or the 190 tags and the 297 records, with the SSOT mechanics sections audited beyond `draft`).
- Role-bias provenance, if `role_inference` is wanted.
