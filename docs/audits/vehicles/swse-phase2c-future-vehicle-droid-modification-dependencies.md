# SWSE Vehicle Phase 2C — Future Vehicle and Droid Modification Dependency Contract

**Status:** Architecture/dependency handoff only. NOT authorization to implement vehicle or droid modifications, alter the current vehicle phase, add compendium variants, or relax the approved Phase 2C attack gates.
**Recorded after:** Phase 2C CP6, commit `ec6c059f11929053db8c47dcee38f0f3a12104da`.
**Source of design guidance:** User-supplied D-005 equipment modification cross-project handoff; vehicle-specific rules still require their own primary-source audit and approval.

## The non-negotiable separation

1. **Published stock source configuration:** The immutable book-specific source claim, printed statblock, adjacent rules, known weapon groups and their source/errata provenance. The corrected scope is 318 publication *claims*, not necessarily 318 distinct models. A publication variant is a new source identity only when independently statblocked.
2. **Published modification definitions:** Catalog, facts, prerequisite/restriction predicates, cost, time, replacement behavior and mechanical effects, all independently sourced for the correct host domain. Vehicle and droid requirements must not be copied from D-005 merely because a predicate has the same name.
3. **Modified actor instance:** An individual ship/droid anchored to a stable stock source reference and carrying an ordered, auditable installation/replacement/removal history. Installed custom components may be noncanonical; their provenance is the applicable modification and its transaction, NOT a fabricated published loadout.
4. **Effective configuration and transient combat state:** A single future authority resolves the stock snapshot with legitimate changes into current installed weapons, crew topology, shields, engines, and visible presentation. HP loss, spent ammunition, shield charge, conditions, and temporary GM exceptions remain instance/runtime state, never changes to the published baseline.

**Conceptual relation:** stock baseline + validated instance modifications + situational/runtime effects -> effective state. This is NOT a simple additive formula: replacements, removals, exclusive slots, dependencies, and alternate configurations must be applied with explicit semantics.

## Pure versus modified

- **Pure** means a stock-source-backed instance with no effective player/GM loadout changes. Damage, resources, pilot assignment or current position do not turn it into a modified published configuration.
- **Modified** means that the instance's loadout, subsystems, or approved customization overlays depart from its published stock baseline. Modifications may affect appearance as well as mechanics. Both kinds retain a read-only link to the same published source claim.
- A future sheet may expose Pure/Modified labels, stock-versus-current comparison, revert and a modification history; do **not** duplicate the canonical compendium for every custom build or allow 'pure' to be an editable source-authority flag.
- Character/droid and vehicle hosts can share the *architecture*, not unverified installation predicates, capacities or formulae.

## D-005 pattern to preserve when that later phase begins

| Layer | Authority boundary |
| --- | --- |
| Registry | Recognized published modifications and valid host domains; existence does not mean eligibility. |
| Published facts | Exact printed text, source identity and page/errata trace. |
| Structured requirements | Machine-readable source-backed eligibility, exclusion and dependency tests. |
| Offline oracle | Frozen independent expectations used to certify those rules; never a second runtime evaluator. |
| Runtime evaluator | One authoritative installation/use-legality decision using the actual ship/droid, selected target slot and existing installed state. |

Structural schema validity, published-rules correctness, installation legality, operational fire/use legality and strict mechanical certification remain **separate statuses**. A valid JSON mod, a GM-approved transaction and a legal firing arc are not interchangeable claims.

## Attack/source boundary already in force (CP6)

- Strict source review and stock-weapon binding apply to **untouched published weapon groups**, even on an otherwise modified ship.
- A demonstrably installed shipyard custom weapon may pass the **stock-only** provenance requirement per weapon, but this does not certify its installation cost, space, arc, crew station, attack profile or upgrade legality.
- CP6 currently checks `sourceModificationId` against both persisted modification and shipyard installation records plus weapon identity. This is an interim provenance classifier, **not** the future D-005-style legal installation evaluator; it must be revisited and superseded as appropriate during the separately authorized modification refactor.
- Canonical stock group -> actual Foundry item/weapon row bindings require a trusted, independently generated authority. Actor/weapon names, editable tags or rollOptions fields never certify published source truth.
- The attack formula continues to be **1d20 + operator BAB (or documented abstract crew equivalent) + vehicle INT modifier + range and individually applicable modifiers**. Only the actual operator supplies BAB. Source-backed special exceptions (for example Target Sense) need their own predicates and tests; do not introduce a second vehicle damage/attack engine.
- Preserve distinct identities for physical gun, mount, arc, battery, weapon attack group and crew station. Neither published combat rows nor installing a modification imply the other topology fields.
- Published contradictions retain all alternatives; unknown facts fail closed under approved D01-D04 policy. A recorded GM instance adjudication never changes the pure definition.

## Schema affordances to retain WITHOUT implementing modifications now

- Stable stock source-claim identity, publication/variant identity and versioned source provenance; no mutation of the historical 316 census or 318 overlay.
- Distinct stock attack-group IDs and item/row installation IDs, plus optional future replacement/removal target references; one weapon or slot can change without marking the entire hull 'custom-exempt'.
- Future ordered operation types (`add`, `replace`, `remove`, `enhance`, `configure`) and transaction provenance, with explicit dependencies and installation states; these are modeling examples, **not approved mechanics or schemas**.
- Explicit evidence states for unpublished arcs, mounts, fire-control, capacities and equipment absence; no manufactured forward arcs, attack totals, weapon counts or assumed remaining emplacement space.
- Source-stock snapshot is immutable; installed state and derived/effective statistics are separately recalculable, so multiple customized actor instances do not leak changes into each other.
- Ship/droid cosmetic and mechanical deltas can be represented separately; visual appearance never implies equipment legality or a new canonical source.

## Later-phase acceptance checks (not yet executed or authorized)

1. A pristine instantiated ship matches its chosen published source baseline; two instances can be independently customized.
2. Replacing a stock laser cannon does not modify the published cannon or other ships; it records the removed stock group's identity and the replacement's legal installation lineage.
3. Adding a legal custom weapon changes only that instance's installed/effective weapon list and only its corresponding attack group; other stock groups remain under strict source certification.
4. A GM/player-edited `sourceModificationId`, actor-level modified flag, or renamed item cannot by itself prove installation legality, published weapon provenance, firing arc or mount count.
5. A prospective illegal modification is denied with source-backed failed predicates without changing the actor; an accepted installation is attributable to an authorized transaction and can be audited/undone.
6. Weapon replacement, removal, battery changes, gunner assignment and active configuration do not create duplicate bonus/damage calculations or a second combat resolver.
7. Ship shields, HP, ammo and other changing battle resources do not overwrite source-stock rated values; view/revert operations distinguish loadout changes from current damage.
8. Droid-specific eligibility and slot rules are tested independently of vehicle requirements; the two hosts share only validated abstractions.

## Work sequence / dependency gate

**Now (vehicle Phase 2C):** continue audited stock-to-Foundry binding, known source conflicts, crew/arc eligibility and combat authority tests. Existing immediate fail-closed deployment policy remains unchanged. CP6 reports **0 trusted stock weapon-group runtime bindings**; do not claim this note changes that number or restores any stock weapon attacks.

**Later, only when separately approved:** audit vehicle/droid modification sources; build registry/facts/requirements and independent offline oracle; certify an installation evaluator; define immutable source-to-instance and delta lineage; implement effective-state resolver/UX and migration safeguards; then integrate with existing combat and shipyard authorities.

**Explicitly out of scope for this handoff:** production schemas or migrations, modification installs/weapon replacement logic, runtime eligibility changes, compendium hydration, starship attack math edits, or droid modification refactoring.
