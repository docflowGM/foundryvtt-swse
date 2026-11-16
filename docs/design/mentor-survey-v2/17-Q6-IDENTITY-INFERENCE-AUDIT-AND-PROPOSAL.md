# Q6 Identity Inference: audit of existing interfaces and implementation proposal

**Status:** audit and proposal only. Nothing here changes runtime behavior. No new scorer is proposed.

## 1. Why the reflection says "unresolved" today

The shared Mentor's Reflection builds an **unresolved identity** reading (`readingClaims(false)` yields only `unresolved_reading_disagreement`) because no verified, provenance-backed join from an actor to one of the 297 canonical archetypes exists. It reports owned facts (talents, feats, trained skills) and declared goals, and never names an archetype it cannot prove.

## 2. Audit of what exists (read from the code)

| Component | What it computes | Inputs | 297-registry? | Provenance | Verdict for Q6 |
|---|---|---|---|---|---|
| `IdentityEngine #getArchetypeBias` / `#getSpecialistBias` | A bias layer looked up from `actor.system.archetype` and `actor.system.specialist` | a **stored id**, not an inference | yes (`ArchetypeRegistry.get`) | none: it trusts whatever is stored | A stored id is a declaration, not an inference. Usable only as "the identity recorded on this character", if its writer is known |
| `IdentityEngine.computeObservedBehaviorBias` + `computeObservedBehaviorBiasProvenance` | Observed mechanical-bias keys from owned item rules, ability scores, trained skills; provenance now exact and fail-closed | finalized actor | no (125 bias keys) | **yes** (item ids, rule types, skill ids, snapshot) | The only evidence source with real provenance. Gives *methods and strengths*, not identities |
| `archetype-registry-integration.getPrimaryArchetypeForActor` | Scores class-resolved archetypes by **attribute distribution only** and returns a `matchScore` percentage | attribute scores | yes | none; its own comment normalizes with "D&D-like" ranges | **Reject**: ability-only, a D&D assumption, and a percentage |
| `ArchetypeAffinityEngine.calculateArchetypeAffinity` | Softmax affinity over `class-archetypes.json` (an older class-level dataset), persisted on the actor, with drift detection | `extractCharacterState(actor)` | **no** (separate dataset) | partial | A parallel archetype system; binding it to the 297 registry needs an explicit crosswalk decision |
| `ArchetypeShiftTracker`, `ArchetypeSuggestionIntegration`, `EvidenceCardFactory` | Shift tracking, suggestion weighting, evidence cards for suggestions | affinity snapshots | indirect | evidence cards exist for suggestions | Possible source for a *trend* claim (`past_to_present_trend`) once the affinity data model is bound to the registry |

**Finding:** there is no existing interface that returns a stable, provenance-backed 297-archetype candidate for an actor. The closest evidence source (`...Provenance`) speaks in mechanical-bias keys; the only archetype outputs are a stored declaration, an attribute-only score and a parallel dataset.

## 3. Proposal (no new scorer)

1. **Claims that can be made now, with provenance** (each grounded by fact ids already in the evidence projection):
   - `method_preference`: "your build shows a habit of X", phrased from the shared Q2 stem vocabulary, only for keys that pass the provenance gate (an always-active specific rule on an owned item, or a mapped trained skill). Requires at least two independent provenance entries (two items, or an item and a skill) before it is displayed. This is correctable through NOT.
   - `mechanical_theme_identity`: a grouping of two or more provenance-backed keys that the registry already places in one parent archetype's `mechanicalBias`. This is a lookup of existing registry data over keys that already passed the gate; it ranks nothing and computes no weights. Display a parent only if one parent covers all displayed keys; otherwise stay unresolved.
2. **Declared identity:** if `actor.system.archetype` resolves exactly in the registry (kind and id), the reading may say "you have identified yourself as X" and offer AM re-declaration. It is a recorded declaration, quoted as such, not an inference, and not rejectable through NOT. Open item: confirm which flow writes this field and when (not verified in this audit).
3. **Claims to keep out until a certified source exists:** `archetype_parent` and `archetype_specialization` as *inferences*, `role_inference` (role-bias provenance is not exposed yet), `motivation_inference`, `overconfidence`, `past_to_present_trend` (needs the affinity/shift data bound to the registry), `goal_relationship` beyond "unknown".
4. **Confidence handling:** categorical only (`none`, `thin`, `full`, already in the reading). No percentages or bands are shown to players. A claim with fewer than two provenance entries is omitted, never hedged into the text.
5. **Correction scope:** only displayed, inferred claims become NOT/AM targets (`method_preference`, `mechanical_theme_identity`). Owned facts, declared goals and the declared identity are never rejectable. AM offers registry identities, including the player's own declared goal target first.
6. **Persistence:** unchanged. Corrections stay identity-interpretation events in the one ledger and never alter owned mechanics, goals or eligibility.

## 4. Decisions and work needed before building

- Owner: approve claim wording for `method_preference` and `mechanical_theme_identity` in the shared Q6 libraries (a drafting pass, kept in the shared pack, not per survey).
- Owner/engineering: whether the older `class-archetypes.json` affinity data may be bound to the 297 registry by a reviewed crosswalk (the only route to trend claims without a new scorer).
- Engineering: expose role-bias provenance alongside the mechanical-bias provenance; verify the writer of `actor.system.archetype`.
- Tests to add when built: identical evidence gives identical claims in both surveys; fewer than two provenance entries omits the claim; a NOT rejection removes the claim from later readings without touching owned facts; no claim names a registry identity that does not resolve exactly.
