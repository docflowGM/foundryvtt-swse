# SWSE Rules Decisions — Pending Register

**Append-only.** Entries are never deleted or overwritten. When the project owner rules, the original question is preserved and the ruling, date and implementing commit are added under **Resolution**.
**Authority:** the project owner decides every entry. **Recommended ruling is "None" unless the owner explicitly asks for one.** An entry is a deferral, not a decision, and nothing in it authorizes any implementation.
**Status of every open entry:** an open entry carries one or both of two review statuses (revision 2, 2026-10-14; entry IDs and original text are unchanged):

- `PENDING_SOURCE_VERIFICATION` — the published rules text for the question has not yet been fully examined and certified. This is a research gap, not a rules ambiguity. Incomplete registry coverage never implies that the published rules are ambiguous. The work is source examination (reading the cited pages and recording exact publication identity, printed page and evidence). It does not need an owner ruling.
- `DEFERRED_RULES_REVIEW` — the source *has* been examined and a genuine ambiguity, contradiction between authorities, or a policy decision remains. Only this status needs the project owner. It may be reached for an entry only after that entry's source examination is complete, and the examination result is recorded here.

An entry may carry both statuses (for example, part of the question is a research gap while another part is already a policy question). Moving an entry from `PENDING_SOURCE_VERIFICATION` to `DEFERRED_RULES_REVIEW`, to resolved, or to closed is done by appending to **Resolution**, never by rewriting history. The classification row added to each entry below is an addition; the original `Status` rows are retained as written (they predate the distinction and are superseded by the classification row).
**Evidence rule:** each entry records only what the merged v1.5 registry (`data/audits/modification-rolling-authority-v1.5.json`, SHA-256 `7be42741…3d00`), the merged Phase 0/1a/1b documents, or the owner's rulings establish. Page numbers are the registry's printed pages. Where a fact is the registry's claim and not independently re-verified here, the entry says so.

Seeded 2026-10-14 from the modification-system work (Phases 0–1b, G1 and the V2 replacement design package).

---

## D-001 — Installing and removing an upgrade

| Field | Content |
|---|---|
| Rules domain | Modification procedure (weapon, armor, equipment) |
| Feature | Installing and removing an upgrade (registry procedure `sv-install-remove-upgrade`) |
| Source | *Scum and Villainy* p. 39 |
| Evidence | Registry status `RULES_OUTLINE_REVIEWED`. The registry's description: Mechanics DC, time, scratch-built costs, install failure, removal and failure consequences "depend on source table". |
| Confirmed behavior | An install/remove procedure exists and has a DC, a time, a cost basis, and failure and removal consequences. |
| Unresolved question | The exact DC, time, scratch-built cost, failure consequence and removal consequence values and conditions are not certified in the registry. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Any V2 install/remove flow that rolls, charges time or cost, or applies failure outcomes; the rules content of the install service. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Scum and Villainy* p. 39 (and the cross-referenced table text) and record the DC, time, scratch-built cost basis, install-failure and removal consequences with page evidence. The registry only records that these values "depend on source table"; it records no ambiguity. Becomes `DEFERRED_RULES_REVIEW` only if the examined text is itself ambiguous or conflicts with another authority. |
| Decision authority | Project owner |
| Resolution | |

## D-002 — Stripping an item feature for a slot

| Field | Content |
|---|---|
| Rules domain | Modification procedure (weapon, armor) |
| Feature | Stripping an item (registry procedure `sv-stripping-item`) |
| Source | *Scum and Villainy* pp. 37–38 |
| Evidence | Registry status `RULES_OUTLINE_REVIEWED`: "Strip allowed significant feature to gain a slot with certified drawbacks; not free numeric bonus." The merged Phase 1a contract (section 6, D16) records that the general rules restrict repeating a method for gaining slots unless an exception permits it. |
| Confirmed behavior | Stripping a significant feature can gain a slot, with drawbacks, and is not a free bonus. |
| Unresolved question | Which features on which individual weapons or armor qualify; what the drawbacks are; whether more than one strip may count; no per-host feature evidence exists in the registry. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Any strip grant. Phase 1a already fails closed (a recorded strip is `unresolved`, never `+1`); the V2 structural service and any host-evidence input are blocked. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Scum and Villainy* pp. 37–38 for which features qualify, the stated drawbacks, and the repeat-method restriction already noted from the Phase 1a contract. No ambiguity is recorded in the registry. Phase 1a D16 (fail closed) stays in force until certification. |
| Decision authority | Project owner |
| Resolution | Interim: Phase 1a D16 (fail closed). Not a final ruling. |

## D-003 — Increasing an item's size

| Field | Content |
|---|---|
| Rules domain | Modification procedure (weapon, armor) |
| Feature | Increase size (registry procedure `sv-increase-size`) |
| Source | *Scum and Villainy* pp. 38–39 |
| Evidence | Registry status `RULES_OUTLINE_REVIEWED`: "Increase size for slot grant and published restrictions; the effect applies once unless explicit exception." |
| Confirmed behavior | A size increase grants a slot; it applies once unless an explicit exception exists; published restrictions exist. |
| Unresolved question | Exactly what a size increase changes on weapons versus armor (for example whether armor weight class changes), and the published restrictions' content. The repository's two writers disagree: one rewrites the armor class, the other only records the flag (Phase 0 audit). |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | The V2 structural service and the armor stock-class derivation. Phase 1a counts a canonical size increase once (verified `+1`) and leaves armor stock class unrecoverable without trusted input. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Scum and Villainy* pp. 38–39 for what a size increase changes on weapons and on armor and for the published restrictions. The disagreement between the repository's two writers is an engineering inconsistency (resolved by the replacement, not by a rules ruling) unless the printed text itself is ambiguous. |
| Decision authority | Project owner |
| Resolution | |

## D-004 — Retractable Stock slot cost

| Field | Content |
|---|---|
| Rules domain | Weapon upgrade |
| Feature | Retractable Stock (`sv-retractable-stock`) |
| Source | *Scum and Villainy* p. 42, Table 2-4 |
| Evidence | Registry slot cost is `conditional` with possible costs 0 or 1 and "Requires specific source-text examination"; mechanical certification `PENDING_RULES_TEXT`. |
| Confirmed behavior | The printed slot cost is conditional, zero or one. |
| Unresolved question | The condition that selects 0 versus 1. |
| Options | 0 or 1, as printed. No condition is certified. |
| Recommended ruling | None |
| Implementation impact | Slot accounting for this upgrade (never certified; remains unresolved). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Scum and Villainy* p. 42 and Table 2-4 for the condition selecting a slot cost of 0 or 1. The registry says only that specific source-text examination is required. |
| Decision authority | Project owner |
| Resolution | |

## D-005 — Universal upgrades: which hosts they attach to

| Field | Content |
|---|---|
| Rules domain | Universal upgrades (weapon, armor, equipment) |
| Feature | The 16 *Scum and Villainy* Table 2-3 universal upgrades: Cheater, Cloaked, Droidification (excluded scope), Dual Gear, Electrograpple Handle, Environmental Sealing, Extra Power Source, Memory Upgrade, Memory Upgrade, Advanced, Miniaturized, Recognition System, Remote Activation, Secret Compartment, Silverplate, Spring Loaded, Storage Capacity |
| Source | *Scum and Villainy* Table 2-3 (for example p. 41 for Cheater) |
| Evidence | For these 16 rows the registry marks domain applicability `CONDITIONAL_UNVERIFIED` for equipment (15 typed domains), weapon (11) and armor (9); mechanical certification `PENDING_RULES_TEXT`; audit blockers `RULES_TEXT_NOT_CERTIFIED`, `DOMAIN_APPLICABILITY_NOT_CERTIFIED`. |
| Confirmed behavior | Slot costs and prices are table-verified. |
| Unresolved question | Which of weapons, armor and equipment each universal upgrade may be installed on, and each upgrade's detail rules. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Accounting and installation of these 16 upgrades in any domain (per the Phase 1b contract they stay blocked). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine each Table 2-3 upgrade's printed text for permitted hosts and detail rules. No ambiguity is recorded; applicability is simply not yet certified. |
| Decision authority | Project owner |
| Resolution | |

## D-006 — Modifications with no printed price

| Field | Content |
|---|---|
| Rules domain | Modification acquisition and pricing |
| Feature | Componentization (Basic and Deluxe); Excellent Kit purchased quality |
| Source | *Galaxy of Intrigue* p. 68 (Componentization); *Rebellion Era Campaign Guide* p. 43 (Excellent Kit) |
| Evidence | Registry price type `not_stated` for `goi-componentization-basic`, `goi-componentization-deluxe` and `reb-excellent-kit-purchased-quality`. The registry notes the existing catalogue value `0` is not a certified free price. Owner ruling: an unstated price is unknown, never zero. |
| Confirmed behavior | The price is not printed; it is unknown. |
| Unresolved question | How the V2 system should handle acquiring or installing a modification whose price is not printed (for example whether the owner or GM sets a price, or the item is not purchasable). |
| Options | None supported by source evidence. |
| Recommended ruling | None |
| Implementation impact | The purchase and install flow for these modifications. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `DEFERRED_RULES_REVIEW` — The source has been examined by the registry: the price is not printed, so it is unknown (owner ruling: never zero). The remaining question — how the V2 system handles acquiring or installing a modification whose price is not printed — is a policy decision, not a research gap. A fresh check that the cited pages indeed print no price may be recorded under Resolution but is not a prerequisite. |
| Decision authority | Project owner |
| Resolution | Partial, prior: price is unknown, never `0` (owner ruling). The handling flow remains open. |

## D-007 — Computerized Interface Scope and Night Vision Device

| Field | Content |
|---|---|
| Rules domain | Weapon/equipment modification |
| Feature | Computerized Interface Scope; Night Vision Device |
| Source | Unverified. The compliance audit located a Computerized Interface Scope in the *Rebellion Era Campaign Guide* (OCR only: a 2,000 credit, 0.5 kg weapon-mounted scope); no source was located for Night Vision Device. |
| Evidence | Both exist in the repository catalog and effect map but have no definition in the v1.5 registry. |
| Confirmed behavior | None established by certified evidence. |
| Unresolved question | Whether each is a published modification, its slot cost, and its host. |
| Options | None. |
| Recommended ruling | None |
| Implementation impact | These two catalog entries. Owner ruling: neither is added nor deleted until the source is verified. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — A source has not been located for Night Vision Device and the *Rebellion Era Campaign Guide* entry for Computerized Interface Scope is OCR-only. Locate and verify the printed entries. Existing owner ruling (keep as is until verified) stands. |
| Decision authority | Project owner |
| Resolution | Interim: keep as is until verified (owner ruling). |

## D-008 — Tech Specialist device extra slot

| Field | Content |
|---|---|
| Rules domain | Tech Specialist |
| Feature | Trait `tech_device_upgrade_slot` ("Additional Upgrade Slot") in the Tech Specialist service |
| Source | *Starships of the Galaxy* p. 21 (Tech Specialist table) |
| Evidence | The registry states the service-only device extra slot is not certified by the printed table. |
| Confirmed behavior | None. |
| Unresolved question | Whether this trait exists in the published rules and whether it grants capacity. |
| Options | None. |
| Recommended ruling | None |
| Implementation impact | The trait's slot effect (Phase 1a treats it as `unverified`, never capacity). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine the *Starships of the Galaxy* p. 21 Tech Specialist table and surrounding text to establish whether the trait is published and what it grants. |
| Decision authority | Project owner |
| Resolution | |

## D-009 — Superior Tech traits

| Field | Content |
|---|---|
| Rules domain | Tech Specialist |
| Feature | The 14 in-scope "superior tier" traits in the Tech Specialist service (armor 6, device 4, weapon 4) |
| Source | Not certified in the registry |
| Evidence | The registry states Superior Tech is not certified and holds no definition for these traits (compliance audit D4). Owner ruling: uncertified Superior Tech traits are preserved and not expanded. |
| Confirmed behavior | None. |
| Unresolved question | Source certification of each trait. |
| Options | None. |
| Recommended ruling | None |
| Implementation impact | These traits in the V2 Tech Specialist consumer (preserved as is, not expanded, not newly automated). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Locate and certify the Superior Tech source text for each of the 14 traits. Existing owner ruling (preserve, do not expand) stands. |
| Decision authority | Project owner |
| Resolution | Interim: preserve, do not expand (owner ruling). |

## D-010 — Three Legacy Era templates: composition with other modifications

| Field | Content |
|---|---|
| Rules domain | Templates |
| Feature | `legacy-biotech-host-template`, `legacy-weapon-template-antiquated`, `legacy-weapon-template-refitted` |
| Source | *Legacy Era Campaign Guide* pp. 66, 100, 101 |
| Evidence | Registry stacking policy `SOURCE_CONSTRAINTS_FURTHER_COMPOSITION_TESTS_NEEDED` (the other 23 published templates carry the certified KOTOR governance, `KOTOR_TEMPLATE_ONE_NONEXEMPT_BY_DEFAULT`). |
| Confirmed behavior | Each template's printed price and effect text is recorded in the registry. |
| Unresolved question | How these three compose with other templates and upgrades. The registry flags that further source tests are needed and does not record the specific gap. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Applying these templates alongside any other template or upgrade. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Legacy Era Campaign Guide* pp. 66, 100, 101 and record the specific composition constraints. The registry flags that further source tests are needed but does not record a specific ambiguity. |
| Decision authority | Project owner |
| Resolution | |

## D-011 — Lightsaber accessory allowance and crystal pools

| Field | Content |
|---|---|
| Rules domain | Lightsabers |
| Feature | Lightsaber construction accessories and focusing crystals (registry procedure `jedi-saber-construction`; 10 accessory definitions with stacking policy `LIGHTSABER_ACCESSORY_ALLOWANCE_PENDING_RECONCILIATION`) |
| Source | *Jedi Academy Training Manual* pp. 54, 60 |
| Evidence | Procedure status `LEAD_PENDING_CERTIFICATION`: "Chassis+focusing crystal+special accessory allowance distinct from standard upgrade slots; do not assume stacking." The packaged `upgradeSlots = 1` on crystals and accessories is not proof of a general slot cost. |
| Confirmed behavior | These pools are distinct from standard upgrade slots. |
| Unresolved question | The accessory allowance count and its relation to Tech Specialist, and whether chassis capacity exists as a pool. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Any lightsaber pool accounting (Phase 1a never certifies a lightsaber) and the V2 lightsaber consumer. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Examine *Jedi Academy Training Manual* pp. 54 and 60 for the accessory allowance count, crystal pools and the Tech Specialist relation. May become `DEFERRED_RULES_REVIEW` if the printed text is ambiguous about stacking. |
| Decision authority | Project owner |
| Resolution | |

## D-012 — Powered armor stock slots

| Field | Content |
|---|---|
| Rules domain | Armor |
| Feature | Stock upgrade capacity of powered armor |
| Source | *Scum and Villainy* p. 37 |
| Evidence | The registry's outline text reads "medium and powered armor 2" and omits heavy armor; printed p. 37 gives light 1, medium 2, heavy 3 (reviewer-verified, the Phase 1a baseline). No shipped armor sets `isPoweredArmor`. |
| Confirmed behavior | Light 1, medium 2, heavy 3 (Phase 1a). |
| Unresolved question | Precedence between a powered armor's powered status and its weight class when they imply different stock capacity. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Capacity of powered armor (Phase 1a leaves it unresolved). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification (rev. 2) | `PENDING_SOURCE_VERIFICATION` — Re-examine *Scum and Villainy* p. 37 for what the printed text says about powered armor. The registry outline text omits heavy armor and differs from the printed baseline, which indicates an incomplete outline rather than an established ambiguity. Becomes `DEFERRED_RULES_REVIEW` only if the page gives no precedence rule between powered status and weight class. |
| Decision authority | Project owner |
| Resolution | |

## V-P2-01 — Spendable Emplacement Points of a canonical hull

| Field | Content |
|---|---|
| Rules domain | Vehicle modification (Shipyard) |
| Feature | Spendable Emplacement Points of a canonical hull |
| Source | Published vehicle records `modifications.emplacementPointsTotal` (3 of 429: kotor-amalgamated-hyperdyne-578-r-space-transport = 4, kotor-arakyd-industries-lethisk-class-armed-freighter = 3, kotor-corellia-stardrive-quartermaster-class-supply-carrier = 2); special-rule text on unused/unspent Emplacement Points for sotg-corellian-yt-1300-transport, sotg-sorosuub-cutlass-9-patrol-fighter, sotg-kuat-systems-engineering-firespray-31-patrol-craft. |
| Evidence | The other 426 records state no Emplacement Point figure. Three state a figure labelled a total. Three Starships of the Galaxy entries mention unused/unspent Emplacement Points in special-rule text. |
| Confirmed behavior | A few hulls publish an EP figure or mention unused EP. |
| Unresolved question | Whether a published `emplacementPointsTotal` is the points available to spend or the hull's total including stock equipment; how to treat the 426 hulls with no published figure. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | `DEFAULT_VEHICLE_INSTALLATION_RULES.resolveEpBudget` denies every install (`EP_BUDGET_UNKNOWN`). No canonical hull can be modified until ruled. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification | `PENDING_SOURCE_VERIFICATION` for the vehicle-modification rules text (EP formula by size) plus a policy question for hulls with no figure. |
| Decision authority | Project owner |
| Resolution | |

## V-P2-02 — Provenance of data/vehicle-modifications catalog

| Field | Content |
|---|---|
| Rules domain | Vehicle modification (Shipyard) |
| Feature | Provenance of data/vehicle-modifications catalog |
| Source | `data/vehicle-modifications/*.json` (187 rows: id, category, emplacementPoints, availability, sizeRestriction, cost, costType, effect text). |
| Evidence | No row carries a book or printed page. Pricing includes `base`, `flat`, `multiplier` and `modifier` cost types; effects are free text. |
| Confirmed behavior | Rows exist with EP, availability and size restrictions. |
| Unresolved question | Which rows match a published source and are certified; how `base`/`multiplier`/`modifier` cost types resolve to credits; whether size restrictions such as bare 'Colossal' include frigate/cruiser/station hulls. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Planner requires a `certification` block (MECHANIC_SPECIFIED, book, page) on a row, accepts only `flat` costs, and returns SIZE_AMBIGUOUS for the bare-Colossal/subtype cases. No row currently qualifies. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification | `PENDING_SOURCE_VERIFICATION` (row-by-row certification) and `DEFERRED_RULES_REVIEW` (size subtype and cost-type policy). |
| Decision authority | Project owner |
| Resolution | |

## V-P2-03 — Removal refund, install procedure and stat effects

| Field | Content |
|---|---|
| Rules domain | Vehicle modification (Shipyard) |
| Feature | Removal refund, install procedure and stat effects |
| Source | Legacy `vehicle-system-definitions.js` uses an uncertified 0.5 resale multiplier and fixed stat deltas; D-001 covers the install/removal procedure for items. |
| Evidence | No certified source for vehicle resale value, install time/DC, or how a modification's effect stacks with printed values. |
| Confirmed behavior | None. |
| Unresolved question | Refund on uninstall; install time/DC/failure; stacking and bonus type for effects on defenses, speed, damage reduction and shields. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Uninstall moves no credits and reports `refundPolicyDecided:false`; effects are not applied to effective stats (only EP/cost are tracked). |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification | `PENDING_SOURCE_VERIFICATION`, linked to D-001. |
| Decision authority | Project owner |
| Resolution | |

## V-P2-04 — Evidence required to certify a physical mount

| Field | Content |
|---|---|
| Rules domain | Vehicle weapon installation |
| Feature | Evidence required to certify a physical mount |
| Source | Printed firing groups carry `mountKeys: []` and 'Physical mounting, weapon bindings and firing arcs NOT CERTIFIED'. |
| Evidence | Stock weapon mount identity, arc, battery membership and operator are unpublished or unreviewed for these records. |
| Confirmed behavior | Printed attack groups are reference-only. |
| Unresolved question | What evidence suffices for a mount (the planner currently requires mountKey, arc, operatorRole and book/page evidence) and whether a purchased weapon may be executable at all. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | Weapon installs are denied without mount evidence; even with it the ledger entry is `executable:false`. Enabling execution is P4-D. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification | `DEFERRED_RULES_REVIEW` |
| Decision authority | Project owner |
| Resolution | |

## V-P4-01 — Vehicle size modifier on top of printed Initiative

| Field | Content |
|---|---|
| Rules domain | Vehicle Initiative |
| Feature | `SWSECombatDocument._getVehicleSizeModifier` (Colossal -10, Gargantuan -5, Huge -2, Large -1) added to a vehicle's Initiative formula |
| Source | Published vehicle records `abilities.initiativePrinted` (all 429); the code table has no cited book/page |
| Evidence | Every record prints an Initiative modifier (e.g. Incom T-65B X-wing, *Core Rulebook* p. 178: +7). The code adds a size modifier on top of the actor's Initiative skill total; its origin is not cited. |
| Confirmed behavior | The printed Initiative is the vehicle's Initiative modifier. Implemented in P4-B: source-backed vehicles use it as the base in `SWSEInitiative` and `swse-combat`. |
| Unresolved question | Whether a size modifier applies in addition to the printed Initiative, and if so which table is authoritative. |
| Options | None supported by certified evidence. |
| Recommended ruling | None |
| Implementation impact | The existing size modifier is left unchanged and still applies to source-backed vehicles on top of the printed value. A ruling may remove or replace it. |
| Status | `DEFERRED_RULES_REVIEW` |
| Review classification | `PENDING_SOURCE_VERIFICATION` — examine the vehicle Initiative text in the Core Rulebook. |
| Decision authority | Project owner |
| Resolution | |

---

## Revision log

- **Revision 2 (2026-10-14):** introduced `PENDING_SOURCE_VERIFICATION` versus `DEFERRED_RULES_REVIEW`; added a *Review classification* row to D-001–D-012. Of the twelve entries, eleven are research gaps awaiting source examination; only D-006 (policy for unpriced modifications) is a decision for the owner today. No decision ID, original field, owner ruling or interim position was changed. No recommended ruling is made for any entry. Source examination is the next step for D-001 first, because it blocks the install procedure.

- **Revision 3 (2026-10-29):** appended V-P2-01 to V-P2-04 (vehicle Shipyard EP budget, catalog provenance, refund/effects, mount certification). No existing entry changed.
- **Revision 4 (2026-10-29):** appended V-P4-01 (vehicle size modifier vs printed Initiative). No existing entry changed.
