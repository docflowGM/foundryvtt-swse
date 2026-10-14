# SWSE Rules Decisions — Pending Register

**Append-only.** Entries are never deleted or overwritten. When the project owner rules, the original question is preserved and the ruling, date and implementing commit are added under **Resolution**.
**Authority:** the project owner decides every entry. **Recommended ruling is "None" unless the owner explicitly asks for one.** An entry is a deferral, not a decision, and nothing in it authorizes any implementation.
**Status of every open entry:** `DEFERRED_RULES_REVIEW`.
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
| Decision authority | Project owner |
| Resolution | |
