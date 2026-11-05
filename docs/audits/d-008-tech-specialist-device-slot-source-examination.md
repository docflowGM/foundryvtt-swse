# D-008 / Q-007 — Tech Specialist Additional Upgrade Slot: printed-source examination

**Research status:** `BOOK_PAGE_VISUALLY_VERIFIED`. **Repository component status: unchanged.**
**Sources visually inspected:** *Scum and Villainy* (Wizards of the Coast), printed p. **48**, **Tech Specialist** sidebar; *Starships of the Galaxy*, printed p. **21**, **Tech Specialist** feat and trait table. The Project Owner supplied both sourcebook PDFs. Source examination took place 2026-10-15.

This note repairs the source-location gap in D-008. It **does not** amend the append-only rules register, certify a runtime component, lift a blocker, correct Phase 1a, execute any modification, or authorize G4–G9.

## Evidence record: the rule is printed in a sourcebook

| Question | Printed fact |
|---|---|
| Is there a printed source for the device extra-slot trait? | **Yes.** *Scum and Villainy* printed p. **48**, boxed **Tech Specialist** sidebar, explicitly permits an additional upgrade slot on a device through the Tech Specialist feat, once. |
| Why did the previous lookup miss it? | *Starships of the Galaxy* p. 21 lists the Tech Specialist trait choices but does **not** include an additional-slot row. The supplemental rule is in *Scum and Villainy* p. 48, **not** that earlier table. Both statements can be true. |
| What counts as a device for this context? | The *Scum and Villainy* sidebar expressly includes **weapons, armor and vehicles** as devices and calls **droids characters, not devices**. Droid/vehicle customization remains outside this equipment-modifications V2 scope; this is not permission to re-enable it. |
| Can it apply more than once? | **No.** The sidebar's additional-slot modification is a **once-only** benefit per device. This is separate from other printed one-benefit-at-a-time restrictions. |
| Can Tech Specialist improvements stack with ordinary gear upgrades? | The sidebar says that the Tech Specialist feat's bonuses and those from Superior Tech stack with equipment-upgrade bonuses, while normal rules continue to govern stacking **between upgrades and other gear**. This does **not** establish unlimited Tech Specialist stacking or a second Tech Specialist trait. |
| What is the feat's ordinary check / resource procedure? | *Starships of the Galaxy* p. 21 provides **prerequisite trained in Mechanics**, one-tenth of base item's cost or **1,000 credits**, whichever is higher, 1 day per 1,000 credits of modification cost, and **DC 20 Mechanics** at the end. **Taking 10 and taking 20 are forbidden** on that check. On failure the credits are lost and the benefit is not granted. The feat describes trained assistants reducing time. |
| Does the sidebar independently redefine the procedure for this additional-slot choice? | No separate alternative time/DC/cost is printed in the inspected sidebar. Whether the p. 21 general feat procedure can be used as written for this choice is an implementation certification question, not a license to substitute *Scum and Villainy* p. 39 Table 2-2. |

**Small direct phrase identification only:** S&V p. 48 identifies the modification as an “additional upgrade slot,” and specifies once-only use. All other book-language above is paraphrased from the visual page.

## Repository reconciliation (observations are not approvals)

- `scripts/engine/customization/tech-specialist-modification-service.js` carries service-only `tech_device_upgrade_slot`, named “Additional Upgrade Slot,” `unique: true`, and `update.kind='upgradeSlot'` with amount 1. This is **separate from** the 232 typed definitions in registry v1.5.
- `scripts/engine/customization/modification-slot-authority.js` recognizes `TECH_DEVICE_SLOT_TRAIT_ID` but Phase 1a does not grant capacity from an unverified trait. Keep that fail-closed behavior until a reviewed source/component/host certification and contract revision permits it.
- The research CSV in merged PR #1048 attaches an errata flag to unrelated `sog-tech-improved-accuracy::weapon`. Do **not** interpret that as an identity mapping, change the immutable 232 IDs, add an unsupported 233rd ID, or use the CSV in production.
- The *Scum and Villainy* p. 48 boxed rule is **direct published-book evidence**. Do not keep describing its existence as dependent *only* on the January 2009 errata mirror.
- D-008 presently has `PENDING_SOURCE_VERIFICATION` in the append-only rules register; **this document does not itself release that register block**. A separate scope-pinned entry/review is still required.

## Proposed future source/component certification acceptance tests

These are **engineering test proposals**, not activated predicates or implementation requirements:

1. A trusted actor with the Tech Specialist feat and trained Mechanics may be eligible to propose the **additional-slot** benefit; a client-supplied feat assertion cannot qualify.
2. Weapons, armor, and eligible equipment/devices have the source-defined host route; droids cannot be treated as generic devices for this feat. Vehicles remain on their specialized, out-of-scope route.
3. A **second** attempt to apply the additional-slot choice to the same item is rejected, even when the first benefit came through a legacy flag; evidence should be preserved and not silently duplicated.
4. A failure of the feat's **DC 20** check does not grant an additional capacity point; the independent feat cost and time rules must be certified before a live transaction is enabled.
5. The slot authority remains read-only and fails closed when the item lacks trusted device identity, Tech Specialist provenance, or a verified stored result.
6. Upgrade effects and Tech Specialist bonuses must not be collapsed together or double-counted. Reconcile the feat's one-benefit restriction and the S&V stacking clarification explicitly.
7. Regression-test ordinary device slot capacity independently of this +1 trait, and explicitly test the interaction with powered armor and named stock-capacity exceptions after a separately approved Phase 1a correction.

## Separate work needed before any blocker lift

1. Incorporate the **source location correction** into a D-008 source examination and produce the actual registry/status/scope evidence artifacts required by G1/G2. A reviewer must certify the evidence per the register/ledger mechanism.
2. Trace the complete Tech Specialist service's historical writers and the Phase 1a read contract. The extra slot must be a **trusted certified capacity contribution** rather than a raw client-controlled flag.
3. Check whether published feat limits permit the additional-slot selection alongside another Tech Specialist trait on the same item; do not infer permissive stacking from the sidebar's general statement about bonuses.
4. Agree on a bounded design and tests, then seek separate authorization for any code, contract, status, or blocker change.

**No other rules-register answer or owner authorization is implied.** Q-003 (official errata), Q-033 (transaction atomicity), D-012 (stock armor slots) and the rest of D-008 remain separately tracked.
